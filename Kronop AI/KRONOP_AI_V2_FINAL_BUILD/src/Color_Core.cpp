#include "LUT_Table.hpp"
#include <vulkan/vulkan.h>
#include <iostream>
#include <vector>
#include <cmath>
#include <memory>
#include <fstream>
#include <cstring>
#include <stdexcept>

class ColorArtist {
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
    VkBuffer lutBuffer;
    VkDeviceMemory inputMemory;
    VkDeviceMemory outputMemory;
    VkDeviceMemory lutMemory;
    
    // Command Objects
    VkCommandBuffer commandBuffer;
    VkFence fence;
    
    // Shader Module
    VkShaderModule colorShaderModule;
    
    // Configuration
    const int WORKGROUP_SIZE = 16;
    const int LUT_SIZE = 64; // 64x64x64 3D LUT
    const float COLOR_BOOST_MIN = 1.4f; // 40% boost
    const float COLOR_BOOST_MAX = 1.6f; // 60% boost
    
    // Memory Properties
    VkPhysicalDeviceMemoryProperties memoryProperties;
    
    struct PushConstants {
        int width;
        int height;
        float boostFactor;
        int lutSize;
        float vibrance;
        float contrast;
        float saturation;
    };
    
    LUTTable lutGenerator;
    
public:
    ColorArtist() : 
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
        lutBuffer(VK_NULL_HANDLE),
        inputMemory(VK_NULL_HANDLE),
        outputMemory(VK_NULL_HANDLE),
        lutMemory(VK_NULL_HANDLE),
        commandBuffer(VK_NULL_HANDLE),
        fence(VK_NULL_HANDLE),
        colorShaderModule(VK_NULL_HANDLE) {}
    
    ~ColorArtist() {
        cleanup();
    }
    
    bool initializeVulkan() {
        try {
            if (!createInstance()) return false;
            if (!selectPhysicalDevice()) return false;
            if (!createDevice()) return false;
            if (!createColorShaderModule()) return false;
            if (!createDescriptorSetLayout()) return false;
            if (!createColorPipeline()) return false;
            if (!createCommandPool()) return false;
            if (!createDescriptorPool()) return false;
            if (!createDescriptorSets()) return false;
            if (!createCommandBuffer()) return false;
            if (!createFence()) return false;
            if (!initializeLUT()) return false;
            
            std::cout << "Kronop Color Artist Vulkan Pipeline Initialized!" << std::endl;
            return true;
        } catch (const std::exception& e) {
            std::cerr << "Vulkan initialization error: " << e.what() << std::endl;
            return false;
        }
    }
    
    bool createInstance() {
        VkApplicationInfo appInfo{};
        appInfo.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
        appInfo.pApplicationName = "Kronop Color Artist";
        appInfo.applicationVersion = VK_MAKE_VERSION(1, 0, 0);
        appInfo.pEngineName = "Kronop Engine";
        appInfo.engineVersion = VK_MAKE_VERSION(1, 0, 0);
        appInfo.apiVersion = VK_API_VERSION_1_2;
        
        VkInstanceCreateInfo createInfo{};
        createInfo.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
        createInfo.pApplicationInfo = &appInfo;
        
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
            
            if (properties.deviceType == VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU) {
                physicalDevice = device;
                vkGetPhysicalDeviceMemoryProperties(device, &memoryProperties);
                
                std::cout << "Selected GPU for Color Processing: " << properties.deviceName << std::endl;
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
        
        VkDeviceQueueCreateInfo queueCreateInfo{};
        queueCreateInfo.sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO;
        queueCreateInfo.queueFamilyIndex = computeQueueFamily;
        queueCreateInfo.queueCount = 1;
        float queuePriority = 1.0f;
        queueCreateInfo.pQueuePriorities = &queuePriority;
        
        VkPhysicalDeviceFeatures deviceFeatures{};
        deviceFeatures.shaderStorageImageExtendedFormats = VK_TRUE;
        
        VkDeviceCreateInfo deviceCreateInfo{};
        deviceCreateInfo.sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO;
        deviceCreateInfo.pQueueCreateInfos = &queueCreateInfo;
        deviceCreateInfo.queueCreateInfoCount = 1;
        deviceCreateInfo.pEnabledFeatures = &deviceFeatures;
        
        VkResult result = vkCreateDevice(physicalDevice, &deviceCreateInfo, nullptr, &device);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create Vulkan device: " << result << std::endl;
            return false;
        }
        
        vkGetDeviceQueue(device, computeQueueFamily, 0, &computeQueue);
        
        return true;
    }
    
    bool createColorShaderModule() {
        std::ifstream file("color_grade.comp.spv", std::ios::binary | std::ios::ate);
        if (!file.is_open()) {
            std::cerr << "Failed to open color shader file: color_grade.comp.spv" << std::endl;
            std::cerr << "Please compile the shader with: glslc color_grade.comp -o color_grade.comp.spv" << std::endl;
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
        
        VkResult result = vkCreateShaderModule(device, &createInfo, nullptr, &colorShaderModule);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create color shader module: " << result << std::endl;
            return false;
        }
        
        return true;
    }
    
    bool createDescriptorSetLayout() {
        std::vector<VkDescriptorSetLayoutBinding> bindings(3);
        
        // Input image buffer binding
        bindings[0].binding = 0;
        bindings[0].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        bindings[0].descriptorCount = 1;
        bindings[0].stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;
        
        // Output image buffer binding
        bindings[1].binding = 1;
        bindings[1].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        bindings[1].descriptorCount = 1;
        bindings[1].stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;
        
        // LUT buffer binding
        bindings[2].binding = 2;
        bindings[2].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        bindings[2].descriptorCount = 1;
        bindings[2].stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;
        
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
    
    bool createColorPipeline() {
        VkPipelineShaderStageCreateInfo shaderStageInfo{};
        shaderStageInfo.sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
        shaderStageInfo.stage = VK_SHADER_STAGE_COMPUTE_BIT;
        shaderStageInfo.module = colorShaderModule;
        shaderStageInfo.pName = "main";
        
        VkPushConstantRange pushConstantRange{};
        pushConstantRange.stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;
        pushConstantRange.offset = 0;
        pushConstantRange.size = sizeof(PushConstants);
        
        VkPipelineLayoutCreateInfo pipelineLayoutInfo{};
        pipelineLayoutInfo.sType = VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO;
        pipelineLayoutInfo.setLayoutCount = 1;
        pipelineLayoutInfo.pSetLayouts = &descriptorSetLayout;
        pipelineLayoutInfo.pushConstantRangeCount = 1;
        pipelineLayoutInfo.pPushConstantRanges = &pushConstantRange;
        
        VkResult result = vkCreatePipelineLayout(device, &pipelineLayoutInfo, nullptr, &pipelineLayout);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create pipeline layout: " << result << std::endl;
            return false;
        }
        
        VkComputePipelineCreateInfo pipelineInfo{};
        pipelineInfo.sType = VK_STRUCTURE_TYPE_COMPUTE_PIPELINE_CREATE_INFO;
        pipelineInfo.layout = pipelineLayout;
        pipelineInfo.stage = shaderStageInfo;
        
        result = vkCreateComputePipelines(device, VK_NULL_HANDLE, 1, &pipelineInfo, nullptr, &computePipeline);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create compute pipeline: " << result << std::endl;
            return false;
        }
        
        return true;
    }
    
    bool createCommandPool() {
        VkCommandPoolCreateInfo poolInfo{};
        poolInfo.sType = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO;
        poolInfo.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT;
        poolInfo.queueFamilyIndex = 0;
        
        VkResult result = vkCreateCommandPool(device, &poolInfo, nullptr, &commandPool);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create command pool: " << result << std::endl;
            return false;
        }
        
        return true;
    }
    
    bool createDescriptorPool() {
        std::vector<VkDescriptorPoolSize> poolSizes(3);
        
        poolSizes[0].type = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        poolSizes[0].descriptorCount = 1;
        
        poolSizes[1].type = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        poolSizes[1].descriptorCount = 1;
        
        poolSizes[2].type = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        poolSizes[2].descriptorCount = 1;
        
        VkDescriptorPoolCreateInfo poolInfo{};
        poolInfo.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO;
        poolInfo.maxSets = 1;
        poolInfo.poolSizeCount = static_cast<uint32_t>(poolSizes.size());
        poolInfo.pPoolSizes = poolSizes.data();
        
        VkResult result = vkCreateDescriptorPool(device, &poolInfo, nullptr, &descriptorPool);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create descriptor pool: " << result << std::endl;
            return false;
        }
        
        return true;
    }
    
    bool createDescriptorSets() {
        VkDescriptorSetAllocateInfo allocInfo{};
        allocInfo.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO;
        allocInfo.descriptorPool = descriptorPool;
        allocInfo.descriptorSetCount = 1;
        allocInfo.pSetLayouts = &descriptorSetLayout;
        
        VkResult result = vkAllocateDescriptorSets(device, &allocInfo, &descriptorSet);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to allocate descriptor sets: " << result << std::endl;
            return false;
        }
        
        return true;
    }
    
    bool createCommandBuffer() {
        VkCommandBufferAllocateInfo allocInfo{};
        allocInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO;
        allocInfo.commandPool = commandPool;
        allocInfo.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
        allocInfo.commandBufferCount = 1;
        
        VkResult result = vkAllocateCommandBuffers(device, &allocInfo, &commandBuffer);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to allocate command buffer: " << result << std::endl;
            return false;
        }
        
        return true;
    }
    
    bool createFence() {
        VkFenceCreateInfo fenceInfo{};
        fenceInfo.sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO;
        fenceInfo.flags = VK_FENCE_CREATE_SIGNALED_BIT;
        
        VkResult result = vkCreateFence(device, &fenceInfo, nullptr, &fence);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create fence: " << result << std::endl;
            return false;
        }
        
        return true;
    }
    
    uint32_t findMemoryType(uint32_t typeFilter, VkMemoryPropertyFlags properties) {
        for (uint32_t i = 0; i < memoryProperties.memoryTypeCount; ++i) {
            if ((typeFilter & (1 << i)) && 
                (memoryProperties.memoryTypes[i].propertyFlags & properties) == properties) {
                return i;
            }
        }
        
        throw std::runtime_error("Failed to find suitable memory type!");
    }
    
    bool createBuffer(VkDeviceSize size, VkBufferUsageFlags usage, VkMemoryPropertyFlags properties,
                      VkBuffer& buffer, VkDeviceMemory& bufferMemory) {
        VkBufferCreateInfo bufferInfo{};
        bufferInfo.sType = VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO;
        bufferInfo.size = size;
        bufferInfo.usage = usage;
        bufferInfo.sharingMode = VK_SHARING_MODE_EXCLUSIVE;
        
        VkResult result = vkCreateBuffer(device, &bufferInfo, nullptr, &buffer);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to create buffer: " << result << std::endl;
            return false;
        }
        
        VkMemoryRequirements memRequirements;
        vkGetBufferMemoryRequirements(device, buffer, &memRequirements);
        
        VkMemoryAllocateInfo allocInfo{};
        allocInfo.sType = VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO;
        allocInfo.allocationSize = memRequirements.size;
        allocInfo.memoryTypeIndex = findMemoryType(memRequirements.memoryTypeBits, properties);
        
        result = vkAllocateMemory(device, &allocInfo, nullptr, &bufferMemory);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to allocate buffer memory: " << result << std::endl;
            return false;
        }
        
        vkBindBufferMemory(device, buffer, bufferMemory, 0);
        
        return true;
    }
    
    bool createBuffers(int width, int height) {
        VkDeviceSize inputSize = sizeof(float) * width * height * 4;
        VkDeviceSize outputSize = sizeof(float) * width * height * 4;
        VkDeviceSize lutSize = sizeof(float) * LUT_SIZE * LUT_SIZE * LUT_SIZE * 4;
        
        // Create input buffer (host visible for zero-copy)
        if (!createBuffer(inputSize, 
                         VK_BUFFER_USAGE_STORAGE_BUFFER_BIT | VK_BUFFER_USAGE_TRANSFER_DST_BIT,
                         VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT,
                         inputBuffer, inputMemory)) {
            return false;
        }
        
        // Create output buffer (host visible for zero-copy)
        if (!createBuffer(outputSize,
                         VK_BUFFER_USAGE_STORAGE_BUFFER_BIT | VK_BUFFER_USAGE_TRANSFER_SRC_BIT,
                         VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT,
                         outputBuffer, outputMemory)) {
            return false;
        }
        
        // Create LUT buffer (device local for performance)
        if (!createBuffer(lutSize,
                         VK_BUFFER_USAGE_STORAGE_BUFFER_BIT | VK_BUFFER_USAGE_TRANSFER_DST_BIT,
                         VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT,
                         lutBuffer, lutMemory)) {
            return false;
        }
        
        return true;
    }
    
    bool updateDescriptorSets() {
        VkDescriptorBufferInfo inputBufferInfo{};
        inputBufferInfo.buffer = inputBuffer;
        inputBufferInfo.offset = 0;
        inputBufferInfo.range = VK_WHOLE_SIZE;
        
        VkDescriptorBufferInfo outputBufferInfo{};
        outputBufferInfo.buffer = outputBuffer;
        outputBufferInfo.offset = 0;
        outputBufferInfo.range = VK_WHOLE_SIZE;
        
        VkDescriptorBufferInfo lutBufferInfo{};
        lutBufferInfo.buffer = lutBuffer;
        lutBufferInfo.offset = 0;
        lutBufferInfo.range = VK_WHOLE_SIZE;
        
        std::vector<VkWriteDescriptorSet> descriptorWrites(3);
        
        descriptorWrites[0].sType = VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET;
        descriptorWrites[0].dstSet = descriptorSet;
        descriptorWrites[0].dstBinding = 0;
        descriptorWrites[0].dstArrayElement = 0;
        descriptorWrites[0].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        descriptorWrites[0].descriptorCount = 1;
        descriptorWrites[0].pBufferInfo = &inputBufferInfo;
        
        descriptorWrites[1].sType = VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET;
        descriptorWrites[1].dstSet = descriptorSet;
        descriptorWrites[1].dstBinding = 1;
        descriptorWrites[1].dstArrayElement = 0;
        descriptorWrites[1].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        descriptorWrites[1].descriptorCount = 1;
        descriptorWrites[1].pBufferInfo = &outputBufferInfo;
        
        descriptorWrites[2].sType = VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET;
        descriptorWrites[2].dstSet = descriptorSet;
        descriptorWrites[2].dstBinding = 2;
        descriptorWrites[2].dstArrayElement = 0;
        descriptorWrites[2].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        descriptorWrites[2].descriptorCount = 1;
        descriptorWrites[2].pBufferInfo = &lutBufferInfo;
        
        vkUpdateDescriptorSets(device, static_cast<uint32_t>(descriptorWrites.size()), 
                               descriptorWrites.data(), 0, nullptr);
        
        return true;
    }
    
    bool initializeLUT() {
        // Generate iPhone-style vibrant LUT
        auto lutData = lutGenerator.generateVibrantLUT(LUT_SIZE);
        
        // Create staging buffer for LUT upload
        VkBuffer stagingBuffer;
        VkDeviceMemory stagingMemory;
        VkDeviceSize lutSize = sizeof(float) * LUT_SIZE * LUT_SIZE * LUT_SIZE * 4;
        
        if (!createBuffer(lutSize,
                         VK_BUFFER_USAGE_TRANSFER_SRC_BIT,
                         VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT,
                         stagingBuffer, stagingMemory)) {
            return false;
        }
        
        // Map and copy LUT data
        void* data;
        VkResult result = vkMapMemory(device, stagingMemory, 0, VK_WHOLE_SIZE, 0, &data);
        if (result != VK_SUCCESS) {
            std::cerr << "Failed to map staging memory: " << result << std::endl;
            return false;
        }
        
        memcpy(data, lutData.data(), lutSize);
        vkUnmapMemory(device, stagingMemory);
        
        // Copy from staging to device local LUT buffer
        VkCommandBuffer copyCmd;
        VkCommandBufferAllocateInfo allocInfo{};
        allocInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO;
        allocInfo.commandPool = commandPool;
        allocInfo.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
        allocInfo.commandBufferCount = 1;
        
        vkAllocateCommandBuffers(device, &allocInfo, &copyCmd);
        
        VkCommandBufferBeginInfo beginInfo{};
        beginInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO;
        beginInfo.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT;
        vkBeginCommandBuffer(copyCmd, &beginInfo);
        
        VkBufferCopy copyRegion{};
        copyRegion.size = lutSize;
        vkCmdCopyBuffer(copyCmd, stagingBuffer, lutBuffer, 1, &copyRegion);
        
        VkMemoryBarrier memoryBarrier{};
        memoryBarrier.sType = VK_STRUCTURE_TYPE_MEMORY_BARRIER;
        memoryBarrier.srcAccessMask = VK_ACCESS_TRANSFER_WRITE_BIT;
        memoryBarrier.dstAccessMask = VK_ACCESS_SHADER_READ_BIT;
        
        vkCmdPipelineBarrier(copyCmd, VK_PIPELINE_STAGE_TRANSFER_BIT,
                            VK_PIPELINE_STAGE_COMPUTE_SHADER_BIT, 0, 1, &memoryBarrier, 0, nullptr, 0, nullptr);
        
        vkEndCommandBuffer(copyCmd);
        
        VkSubmitInfo submitInfo{};
        submitInfo.sType = VK_STRUCTURE_TYPE_SUBMIT_INFO;
        submitInfo.commandBufferCount = 1;
        submitInfo.pCommandBuffers = &copyCmd;
        
        vkQueueSubmit(computeQueue, 1, &submitInfo, VK_NULL_HANDLE);
        vkQueueWaitIdle(computeQueue);
        
        // Cleanup
        vkDestroyBuffer(device, stagingBuffer, nullptr);
        vkFreeMemory(device, stagingMemory, nullptr);
        vkFreeCommandBuffers(device, commandPool, 1, &copyCmd);
        
        return true;
    }
    
    bool applyColorGradingGPU(const std::vector<float>& inputImage, int width, int height,
                             std::vector<float>& outputImage, float boostFactor = 1.5f) {
        try {
            // Create buffers if needed
            if (inputBuffer == VK_NULL_HANDLE) {
                if (!createBuffers(width, height)) {
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
            
            memcpy(inputData, inputImage.data(), sizeof(float) * inputImage.size());
            vkUnmapMemory(device, inputMemory);
            
            // Record command buffer
            VkCommandBufferBeginInfo beginInfo{};
            beginInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO;
            beginInfo.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT;
            
            result = vkBeginCommandBuffer(commandBuffer, &beginInfo);
            if (result != VK_SUCCESS) {
                std::cerr << "Failed to begin command buffer: " << result << std::endl;
                return false;
            }
            
            vkCmdBindPipeline(commandBuffer, VK_PIPELINE_BIND_POINT_COMPUTE, computePipeline);
            vkCmdBindDescriptorSets(commandBuffer, VK_PIPELINE_BIND_POINT_COMPUTE, 
                                    pipelineLayout, 0, 1, &descriptorSet, 0, nullptr);
            
            PushConstants pushConstants{};
            pushConstants.width = width;
            pushConstants.height = height;
            pushConstants.boostFactor = boostFactor;
            pushConstants.lutSize = LUT_SIZE;
            pushConstants.vibrance = 1.2f;
            pushConstants.contrast = 1.1f;
            pushConstants.saturation = 1.3f;
            
            vkCmdPushConstants(commandBuffer, pipelineLayout, VK_SHADER_STAGE_COMPUTE_BIT,
                              0, sizeof(PushConstants), &pushConstants);
            
            // Calculate workgroup dimensions
            uint32_t groupCountX = (width + WORKGROUP_SIZE - 1) / WORKGROUP_SIZE;
            uint32_t groupCountY = (height + WORKGROUP_SIZE - 1) / WORKGROUP_SIZE;
            
            vkCmdDispatch(commandBuffer, groupCountX, groupCountY, 1);
            
            VkMemoryBarrier memoryBarrier{};
            memoryBarrier.sType = VK_STRUCTURE_TYPE_MEMORY_BARRIER;
            memoryBarrier.srcAccessMask = VK_ACCESS_SHADER_WRITE_BIT;
            memoryBarrier.dstAccessMask = VK_ACCESS_HOST_READ_BIT;
            
            vkCmdPipelineBarrier(commandBuffer, VK_PIPELINE_STAGE_COMPUTE_SHADER_BIT,
                                VK_PIPELINE_STAGE_HOST_BIT, 0, 1, &memoryBarrier, 0, nullptr, 0, nullptr);
            
            result = vkEndCommandBuffer(commandBuffer);
            if (result != VK_SUCCESS) {
                std::cerr << "Failed to end command buffer: " << result << std::endl;
                return false;
            }
            
            // Submit command buffer
            VkSubmitInfo submitInfo{};
            submitInfo.sType = VK_STRUCTURE_TYPE_SUBMIT_INFO;
            submitInfo.commandBufferCount = 1;
            submitInfo.pCommandBuffers = &commandBuffer;
            
            vkWaitForFences(device, 1, &fence, VK_TRUE, UINT64_MAX);
            vkResetFences(device, 1, &fence);
            
            result = vkQueueSubmit(computeQueue, 1, &submitInfo, fence);
            if (result != VK_SUCCESS) {
                std::cerr << "Failed to submit command buffer: " << result << std::endl;
                return false;
            }
            
            vkWaitForFences(device, 1, &fence, VK_TRUE, UINT64_MAX);
            
            // Map output buffer and read results (zero-copy)
            outputImage.resize(width * height * 4);
            
            void* outputData;
            result = vkMapMemory(device, outputMemory, 0, VK_WHOLE_SIZE, 0, &outputData);
            if (result != VK_SUCCESS) {
                std::cerr << "Failed to map output memory: " << result << std::endl;
                return false;
            }
            
            memcpy(outputImage.data(), outputData, sizeof(float) * outputImage.size());
            vkUnmapMemory(device, outputMemory);
            
            return true;
            
        } catch (const std::exception& e) {
            std::cerr << "GPU color grading error: " << e.what() << std::endl;
            return false;
        }
    }
    
    void cleanup() {
        if (device != VK_NULL_HANDLE) {
            vkDeviceWaitIdle(device);
            
            if (fence != VK_NULL_HANDLE) {
                vkDestroyFence(device, fence, nullptr);
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
            if (colorShaderModule != VK_NULL_HANDLE) {
                vkDestroyShaderModule(device, colorShaderModule, nullptr);
            }
            if (inputBuffer != VK_NULL_HANDLE) {
                vkDestroyBuffer(device, inputBuffer, nullptr);
            }
            if (outputBuffer != VK_NULL_HANDLE) {
                vkDestroyBuffer(device, outputBuffer, nullptr);
            }
            if (lutBuffer != VK_NULL_HANDLE) {
                vkDestroyBuffer(device, lutBuffer, nullptr);
            }
            if (inputMemory != VK_NULL_HANDLE) {
                vkFreeMemory(device, inputMemory, nullptr);
            }
            if (outputMemory != VK_NULL_HANDLE) {
                vkFreeMemory(device, outputMemory, nullptr);
            }
            if (lutMemory != VK_NULL_HANDLE) {
                vkFreeMemory(device, lutMemory, nullptr);
            }
            
            vkDestroyDevice(device, nullptr);
        }
        if (instance != VK_NULL_HANDLE) {
            vkDestroyInstance(instance, nullptr);
        }
    }
};

extern "C" {
    ColorArtist* createColorArtist() {
        return new ColorArtist();
    }
    
    bool initializeColorArtist(ColorArtist* artist) {
        return artist->initializeVulkan();
    }
    
    bool applyColorGrading(ColorArtist* artist, const float* input, int width, int height, 
                          float* output, float boostFactor = 1.5f) {
        std::vector<float> inputVec(input, input + width * height * 4);
        std::vector<float> outputVec;
        
        bool result = artist->applyColorGradingGPU(inputVec, width, height, outputVec, boostFactor);
        
        if (result) {
            std::copy(outputVec.begin(), outputVec.end(), output);
        }
        
        return result;
    }
    
    void destroyColorArtist(ColorArtist* artist) {
        delete artist;
    }
    
    const char* getColorGPUInfo(ColorArtist* artist) {
        static std::string gpuInfo;
        if (artist->physicalDevice != VK_NULL_HANDLE) {
            VkPhysicalDeviceProperties properties;
            vkGetPhysicalDeviceProperties(artist->physicalDevice, &properties);
            gpuInfo = "Color GPU: " + std::string(properties.deviceName) + 
                     "\nCompute Units: " + std::to_string(properties.limits.maxComputeWorkGroupCount[0]);
        } else {
            gpuInfo = "Color GPU not initialized";
        }
        return gpuInfo.c_str();
    }
    
    bool compileColorShader() {
        int result = system("glslc color_grade.comp -o color_grade.comp.spv");
        return result == 0;
    }
}
