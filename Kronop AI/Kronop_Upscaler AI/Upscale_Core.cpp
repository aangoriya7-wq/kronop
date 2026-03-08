#include "Upscale_Core_Extended.cpp"
#include <vulkan/vulkan.h>
#include <iostream>
#include <vector>
#include <cmath>
#include <memory>
#include <fstream>
#include <cstring>
#include <stdexcept>

class UpscaleCore {
private:
    // Vulkan Core Objects
    VkInstance instance;
    VkPhysicalDevice physicalDevice;
    VkDevice device;
    VkQueue computeQueue;
    VkCommandPool commandPool;
    VkDescriptorSetLayout descriptorSetLayout;
    VkPipelineLayout pipelineLayout;
    VkPipeline computePipeline;
    VkDescriptorPool descriptorPool;
    VkDescriptorSet descriptorSet;
    
    // Memory Objects
    VkBuffer inputBuffer;
    VkBuffer outputBuffer;
    VkBuffer weightBuffer;
    VkBuffer biasBuffer;
    VkDeviceMemory inputMemory;
    VkDeviceMemory outputMemory;
    VkDeviceMemory weightMemory;
    VkDeviceMemory biasMemory;
    
    // Command Objects
    VkCommandBuffer commandBuffer;
    VkFence fence;
    VkSemaphore semaphore;
    
    // Shader Module
    VkShaderModule computeShaderModule;
    
    // Configuration
    const int SCALE_FACTOR = 2;
    const int KERNEL_SIZE = 4;
    const int WORKGROUP_SIZE = 16;
    const uint32_t NEURAL_WEIGHTS_SIZE = 832; // 16*32 + 32*16 + 16*4
    const uint32_t NEURAL_BIASES_SIZE = 52;   // 32 + 16 + 4
    
    // Memory Properties
    VkPhysicalDeviceMemoryProperties memoryProperties;
    
    struct PushConstants {
        int inputWidth;
        int inputHeight;
        int outputWidth;
        int outputHeight;
        int scale_factor;
        int neural_offset;
    };
    
public:
    UpscaleCore() : 
        instance(VK_NULL_HANDLE), 
        physicalDevice(VK_NULL_HANDLE),
        device(VK_NULL_HANDLE), 
        computeQueue(VK_NULL_HANDLE),
        commandPool(VK_NULL_HANDLE),
        descriptorSetLayout(VK_NULL_HANDLE),
        pipelineLayout(VK_NULL_HANDLE),
        computePipeline(VK_NULL_HANDLE),
        descriptorPool(VK_NULL_HANDLE),
        inputBuffer(VK_NULL_HANDLE),
        outputBuffer(VK_NULL_HANDLE),
        weightBuffer(VK_NULL_HANDLE),
        biasBuffer(VK_NULL_HANDLE),
        inputMemory(VK_NULL_HANDLE),
        outputMemory(VK_NULL_HANDLE),
        weightMemory(VK_NULL_HANDLE),
        biasMemory(VK_NULL_HANDLE),
        commandBuffer(VK_NULL_HANDLE),
        fence(VK_NULL_HANDLE),
        semaphore(VK_NULL_HANDLE),
        computeShaderModule(VK_NULL_HANDLE) {}
    
    ~UpscaleCore() {
        cleanup();
    }
    
    bool initializeVulkan() {
        try {
            if (!createInstance()) return false;
            if (!selectPhysicalDevice()) return false;
            if (!createDevice()) return false;
            if (!createShaderModule()) return false;
            if (!createDescriptorSetLayout()) return false;
            if (!createComputePipeline()) return false;
            if (!createCommandPool()) return false;
            if (!createDescriptorPool()) return false;
            if (!createDescriptorSets()) return false;
            if (!createCommandBuffer()) return false;
            if (!createFenceAndSemaphore()) return false;
            if (!initializeNeuralNetwork()) return false;
            
            std::cout << "Vulkan Compute Pipeline Initialized Successfully!" << std::endl;
            return true;
        } catch (const std::exception& e) {
            std::cerr << "Vulkan initialization error: " << e.what() << std::endl;
            return false;
        }
    }
    
    bool createInstance() {
        VkApplicationInfo appInfo{};
        appInfo.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
        appInfo.pApplicationName = "Kronop AI Upscaler";
        appInfo.applicationVersion = VK_MAKE_VERSION(1, 0, 0);
        appInfo.pEngineName = "Kronop Engine";
        appInfo.engineVersion = VK_MAKE_VERSION(1, 0, 0);
        appInfo.apiVersion = VK_API_VERSION_1_2;
        
        const std::vector<const char*> validationLayers = {
            "VK_LAYER_KHRONOS_validation"
        };
        
        const std::vector<const char*> extensions = {
            VK_EXT_DEBUG_UTILS_EXTENSION_NAME
        };
        
        VkInstanceCreateInfo createInfo{};
        createInfo.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
        createInfo.pApplicationInfo = &appInfo;
        createInfo.enabledExtensionCount = static_cast<uint32_t>(extensions.size());
        createInfo.ppEnabledExtensionNames = extensions.data();
        createInfo.enabledLayerCount = static_cast<uint32_t>(validationLayers.size());
        createInfo.ppEnabledLayerNames = validationLayers.data();
        
        VkResult result = vkCreateInstance(&createInfo, nullptr, &instance);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create Vulkan instance: " << result << std::endl;
            return false;
        }
        
        return true;
    }
    
    bool selectPhysicalDevice() {
        uint32_t deviceCount = 0;
        vkEnumeratePhysicalDevices(instance, &deviceCount, nullptr);
        
        if (deviceCount == 0) {
            std::cerr << "No Vulkan-compatible GPU found" << std::endl;
            return false;
        }
        
        std::vector<VkPhysicalDevice> devices(deviceCount);
        vkEnumeratePhysicalDevices(instance, &deviceCount, devices.data());
        
        for (const auto& device : devices) {
            VkPhysicalDeviceProperties properties;
            VkPhysicalDeviceFeatures features;
            vkGetPhysicalDeviceProperties(device, &properties);
            vkGetPhysicalDeviceFeatures(device, &features);
            
            if (properties.deviceType == VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU && 
                features.shaderStorageImageExtendedFormats) {
                physicalDevice = device;
                vkGetPhysicalDeviceMemoryProperties(device, &memoryProperties);
                
                std::cout << "Selected GPU: " << properties.deviceName << std::endl;
                std::cout << "Compute Units: " << properties.limits.maxComputeWorkGroupCount[0] << std::endl;
                return true;
            }
        }
        
        physicalDevice = devices[0];
        vkGetPhysicalDeviceMemoryProperties(physicalDevice, &memoryProperties);
        return true;
    }
    bool createDevice() {
        uint32_t queueFamilyCount = 0;
        vkGetPhysicalDeviceQueueFamilyProperties(physicalDevice, &queueFamilyCount, nullptr);
        
        std::vector<VkQueueFamilyProperties> queueFamilies(queueFamilyCount);
        vkGetPhysicalDeviceQueueFamilyProperties(physicalDevice, &queueFamilyCount, queueFamilies.data());
        
        uint32_t computeQueueFamily = UINT32_MAX;
        for (uint32_t i = 0; i < queueFamilyCount; ++i) {
            if (queueFamilies[i].queueFlags & VK_QUEUE_COMPUTE_BIT) {
                computeQueueFamily = i;
                break;
            }
        }
        
        if (computeQueueFamily == UINT32_MAX) {
            std::cerr << "No compute queue found" << std::endl;
            return false;
        }
        
        VkDeviceQueueCreateInfo queueCreateInfo{};
        queueCreateInfo.sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO;
        queueCreateInfo.queueFamilyIndex = computeQueueFamily;
        queueCreateInfo.queueCount = 1;
        float queuePriority = 1.0f;
        queueCreateInfo.pQueuePriorities = &queuePriority;
        
        const std::vector<const char*> deviceExtensions = {
            VK_KHR_STORAGE_BUFFER_STORAGE_CLASS_EXTENSION_NAME
        };
        
        VkPhysicalDeviceFeatures deviceFeatures{};
        deviceFeatures.shaderStorageImageExtendedFormats = VK_TRUE;
        
        VkDeviceCreateInfo deviceCreateInfo{};
        deviceCreateInfo.sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO;
        deviceCreateInfo.pQueueCreateInfos = &queueCreateInfo;
        deviceCreateInfo.queueCreateInfoCount = 1;
        deviceCreateInfo.enabledExtensionCount = static_cast<uint32_t>(deviceExtensions.size());
        deviceCreateInfo.ppEnabledExtensionNames = deviceExtensions.data();
        deviceCreateInfo.pEnabledFeatures = &deviceFeatures;
        
        VkResult result = vkCreateDevice(physicalDevice, &deviceCreateInfo, nullptr, &device);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create Vulkan device: " << result << std::endl;
            return false;
        }
        
        vkGetDeviceQueue(device, computeQueueFamily, 0, &computeQueue);
        
        return true;
    }
    
    bool createShaderModule() {
        std::ifstream file("upscale.comp.spv", std::ios::binary | std::ios::ate);
        if (!file.is_open()) {
            std::cerr << "Failed to open shader file: upscale.comp.spv" << std::endl;
            std::cerr << "Please compile the shader with: glslc upscale.comp -o upscale.comp.spv" << std::endl;
            return false;
        }
        
        size_t fileSize = file.tellg();
        file.seekg(0);
        
        std::vector<char> shaderCode(fileSize);
        file.read(shaderCode.data(), fileSize);
        file.close();
        
        VkShaderModuleCreateInfo createInfo{};
        createInfo.sType = VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO;
        createInfo.codeSize = shaderCode.size();
        createInfo.pCode = reinterpret_cast<const uint32_t*>(shaderCode.data());
        
        VkResult result = vkCreateShaderModule(device, &createInfo, nullptr, &computeShaderModule);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create shader module: " << result << std::endl;
            return false;
        }
        
        return true;
    }
    
    bool createDescriptorSetLayout() {
        std::vector<VkDescriptorSetLayoutBinding> bindings(4);
        
        // Input buffer binding
        bindings[0].binding = 0;
        bindings[0].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        bindings[0].descriptorCount = 1;
        bindings[0].stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;
        
        // Output buffer binding
        bindings[1].binding = 1;
        bindings[1].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        bindings[1].descriptorCount = 1;
        bindings[1].stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;
        
        // Neural weights buffer binding
        bindings[2].binding = 2;
        bindings[2].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        bindings[2].descriptorCount = 1;
        bindings[2].stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;
        
        // Neural biases buffer binding
        bindings[3].binding = 3;
        bindings[3].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        bindings[3].descriptorCount = 1;
        bindings[3].stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;
        
        VkDescriptorSetLayoutCreateInfo layoutInfo{};
        layoutInfo.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO;
        layoutInfo.bindingCount = static_cast<uint32_t>(bindings.size());
        layoutInfo.pBindings = bindings.data();
        
        VkResult result = vkCreateDescriptorSetLayout(device, &layoutInfo, nullptr, &descriptorSetLayout);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create descriptor set layout: " << result << std::endl;
            return false;
        }
        
        return true;
    }
    
    std::vector<float> bicubicInterpolation(const std::vector<float>& input, int width, int height) {
        int newWidth = width * SCALE_FACTOR;
        int newHeight = height * SCALE_FACTOR;
        std::vector<float> output(newWidth * newHeight * 4);
        
        for (int y = 0; y < newHeight; ++y) {
            for (int x = 0; x < newWidth; ++x) {
                float srcX = (float)x / SCALE_FACTOR;
                float srcY = (float)y / SCALE_FACTOR;
                
                int x0 = (int)std::floor(srcX);
                int y0 = (int)std::floor(srcY);
                
                float dx = srcX - x0;
                float dy = srcY - y0;
                
                for (int c = 0; c < 4; ++c) {
                    float sum = 0.0f;
                    
                    for (int j = -1; j <= 2; ++j) {
                        for (int i = -1; i <= 2; ++i) {
                            int xi = std::max(0, std::min(width - 1, x0 + i));
                            int yi = std::max(0, std::min(height - 1, y0 + j));
                            
                            float weight = bicubicWeight(i - dx) * bicubicWeight(j - dy);
                            sum += input[(yi * width + xi) * 4 + c] * weight;
                        }
                    }
                    
                    output[(y * newWidth + x) * 4 + c] = sum;
                }
            }
        }
        
        return output;
    }
    
    float bicubicWeight(float x) {
        const float a = -0.5f;
        float absX = std::abs(x);
        
        if (absX <= 1.0f) {
            return (a + 2.0f) * absX * absX * absX - (a + 3.0f) * absX * absX + 1.0f;
        } else if (absX < 2.0f) {
            return a * absX * absX * absX - 5.0f * a * absX * absX + 8.0f * a * absX - 4.0f * a;
        }
        
        return 0.0f;
    }
    
    bool upscaleFrameGPU(const std::vector<float>& inputFrame, int width, int height, 
                         std::vector<float>& outputFrame) {
        try {
            int outputWidth = width * SCALE_FACTOR;
            int outputHeight = height * SCALE_FACTOR;
            
            // Create buffers if needed
            if (inputBuffer == VK_NULL_HANDLE) {
                if (!createBuffers(width, height, outputWidth, outputHeight)) {
                    return false;
                }
                if (!updateDescriptorSets()) {
                    return false;
                }
            }
            
            // Map input buffer and copy data (zero-copy)
            void* inputData;
            VkResult result = vkMapMemory(device, inputMemory, 0, VK_WHOLE_SIZE, 0, &inputData);
            if (result != VK_SUCCESS) {
                std::cerr << "Failed to map input memory: " << result << std::endl;
                return false;
            }
            
            memcpy(inputData, inputFrame.data(), sizeof(float) * inputFrame.size());
            vkUnmapMemory(device, inputMemory);
            
            // Record and submit command buffer
            if (!recordCommandBuffer(outputWidth, outputHeight)) {
                return false;
            }
            
            if (!submitCommandBuffer()) {
                return false;
            }
            
            // Map output buffer and read results (zero-copy)
            outputFrame.resize(outputWidth * outputHeight * 4);
            
            void* outputData;
            result = vkMapMemory(device, outputMemory, 0, VK_WHOLE_SIZE, 0, &outputData);
            if (result != VK_SUCCESS) {
                std::cerr << "Failed to map output memory: " << result << std::endl;
                return false;
            }
            
            memcpy(outputFrame.data(), outputData, sizeof(float) * outputFrame.size());
            vkUnmapMemory(device, outputMemory);
            
            return true;
            
        } catch (const std::exception& e) {
            std::cerr << "GPU upscaling error: " << e.what() << std::endl;
            return false;
        }
    }
    
    void cleanup() {
        if (device != VK_NULL_HANDLE) {
            vkDeviceWaitIdle(device);
            
            if (fence != VK_NULL_HANDLE) {
                vkDestroyFence(device, fence, nullptr);
            }
            if (semaphore != VK_NULL_HANDLE) {
                vkDestroySemaphore(device, semaphore, nullptr);
            }
            if (commandBuffer != VK_NULL_HANDLE) {
                vkFreeCommandBuffers(device, commandPool, 1, &commandBuffer);
            }
            if (commandPool != VK_NULL_HANDLE) {
                vkDestroyCommandPool(device, commandPool, nullptr);
            }
            if (computePipeline != VK_NULL_HANDLE) {
                vkDestroyPipeline(device, computePipeline, nullptr);
            }
            if (pipelineLayout != VK_NULL_HANDLE) {
                vkDestroyPipelineLayout(device, pipelineLayout, nullptr);
            }
            if (descriptorSetLayout != VK_NULL_HANDLE) {
                vkDestroyDescriptorSetLayout(device, descriptorSetLayout, nullptr);
            }
            if (descriptorPool != VK_NULL_HANDLE) {
                vkDestroyDescriptorPool(device, descriptorPool, nullptr);
            }
            if (computeShaderModule != VK_NULL_HANDLE) {
                vkDestroyShaderModule(device, computeShaderModule, nullptr);
            }
            if (inputBuffer != VK_NULL_HANDLE) {
                vkDestroyBuffer(device, inputBuffer, nullptr);
            }
            if (outputBuffer != VK_NULL_HANDLE) {
                vkDestroyBuffer(device, outputBuffer, nullptr);
            }
            if (weightBuffer != VK_NULL_HANDLE) {
                vkDestroyBuffer(device, weightBuffer, nullptr);
            }
            if (biasBuffer != VK_NULL_HANDLE) {
                vkDestroyBuffer(device, biasBuffer, nullptr);
            }
            if (inputMemory != VK_NULL_HANDLE) {
                vkFreeMemory(device, inputMemory, nullptr);
            }
            if (outputMemory != VK_NULL_HANDLE) {
                vkFreeMemory(device, outputMemory, nullptr);
            }
            if (weightMemory != VK_NULL_HANDLE) {
                vkFreeMemory(device, weightMemory, nullptr);
            }
            if (biasMemory != VK_NULL_HANDLE) {
                vkFreeMemory(device, biasMemory, nullptr);
            }
            
            vkDestroyDevice(device, nullptr);
        }
        if (instance != VK_NULL_HANDLE) {
            vkDestroyInstance(instance, nullptr);
        }
    }
};

extern "C" {
    UpscaleCore* createUpscaler() {
        return new UpscaleCore();
    }
    
    bool initializeUpscaler(UpscaleCore* upscaler) {
        return upscaler->initializeVulkan();
    }
    
    bool processFrame(UpscaleCore* upscaler, const float* input, int width, int height, 
                     float* output) {
        std::vector<float> inputVec(input, input + width * height * 4);
        std::vector<float> outputVec;
        
        bool result = upscaler->upscaleFrameGPU(inputVec, width, height, outputVec);
        
        if (result) {
            std::copy(outputVec.begin(), outputVec.end(), output);
        }
        
        return result;
    }
    
    bool processFrameCPU(UpscaleCore* upscaler, const float* input, int width, int height, 
                        float* output) {
        std::vector<float> inputVec(input, input + width * height * 4);
        auto bicubicResult = upscaler->bicubicInterpolation(inputVec, width, height);
        
        PixelInterpolator interpolator;
        auto enhancedResult = interpolator.enhanceWithAI(bicubicResult, width * 2, height * 2);
        
        std::copy(enhancedResult.begin(), enhancedResult.end(), output);
        return true;
    }
    
    void destroyUpscaler(UpscaleCore* upscaler) {
        delete upscaler;
    }
    
    const char* getGPUInfo(UpscaleCore* upscaler) {
        static std::string gpuInfo;
        if (upscaler->physicalDevice != VK_NULL_HANDLE) {
            VkPhysicalDeviceProperties properties;
            vkGetPhysicalDeviceProperties(upscaler->physicalDevice, &properties);
            gpuInfo = "GPU: " + std::string(properties.deviceName) + 
                     "\nCompute Units: " + std::to_string(properties.limits.maxComputeWorkGroupCount[0]) +
                     "\nMax Workgroup Size: " + std::to_string(properties.limits.maxComputeWorkGroupSize[0]);
        } else {
            gpuInfo = "GPU not initialized";
        }
        return gpuInfo.c_str();
    }
    
    bool compileShader() {
        int result = system("glslc upscale.comp -o upscale.comp.spv");
        return result == 0;
    }
}
