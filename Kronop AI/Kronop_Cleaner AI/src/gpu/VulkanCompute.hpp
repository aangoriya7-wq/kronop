/**
 * VulkanCompute.hpp
 * Complete Vulkan Compute Shader Implementation
 * High-performance GPU acceleration for Kronop Cleaner
 */

#ifndef VULKAN_COMPUTE_HPP
#define VULKAN_COMPUTE_HPP

#include <vulkan/vulkan.h>
#include <vector>
#include <memory>
#include <string>

namespace kronop {

/**
 * Vulkan Compute Configuration
 */
struct VulkanConfig {
    uint32_t computeQueueFamilyIndex;
    VkPhysicalDevice physicalDevice;
    VkDevice device;
    VkCommandPool commandPool;
    VkQueue computeQueue;
    
    // Memory properties
    VkPhysicalDeviceMemoryProperties memoryProperties;
    uint32_t computeQueueFamily;
    
    // Shader specialization
    bool enableValidationLayers;
    std::vector<const char*> validationLayers;
    std::vector<const char*> deviceExtensions;
    
    VulkanConfig() 
        : computeQueueFamilyIndex(UINT32_MAX), physicalDevice(VK_NULL_HANDLE),
          device(VK_NULL_HANDLE), commandPool(VK_NULL_HANDLE), computeQueue(VK_NULL_HANDLE),
          enableValidationLayers(false) {
        
        validationLayers = {"VK_LAYER_KHRONOS_validation"};
        deviceExtensions = {VK_KHR_SWAPCHAIN_EXTENSION_NAME};
    }
};

/**
 * Vulkan Buffer for GPU Memory Management
 */
class VulkanBuffer {
public:
    VulkanBuffer();
    ~VulkanBuffer();
    
    bool create(VkDevice device, VkPhysicalDevice physicalDevice,
               VkDeviceSize size, VkBufferUsageFlags usage,
               VkMemoryPropertyFlags properties);
    
    void destroy(VkDevice device);
    
    void* map(VkDevice device, VkDeviceSize size = VK_WHOLE_SIZE,
              VkDeviceSize offset = 0);
    void unmap(VkDevice device);
    
    void updateData(VkDevice device, VkCommandPool commandPool, VkQueue queue,
                   const void* data, VkDeviceSize size);
    
    VkBuffer getBuffer() const { return buffer_; }
    VkDeviceMemory getMemory() const { return memory_; }
    VkDeviceSize getSize() const { return size_; }
    void* getMappedData() const { return mappedData_; }

private:
    VkBuffer buffer_;
    VkDeviceMemory memory_;
    VkDeviceSize size_;
    void* mappedData_;
    
    bool findMemoryType(VkPhysicalDevice physicalDevice, uint32_t typeFilter,
                       VkMemoryPropertyFlags properties, uint32_t& memoryType);
};

/**
 * Vulkan Compute Pipeline
 */
class VulkanComputePipeline {
public:
    explicit VulkanComputePipeline(const VulkanConfig& config);
    ~VulkanComputePipeline();
    
    bool initialize();
    void shutdown();
    
    // Pipeline creation
    bool createComputePipeline(const std::string& shaderPath, 
                             const std::string& entryPoint = "main");
    
    bool createComputePipelineFromSPIRV(const std::vector<uint32_t>& spirvCode,
                                       const std::string& entryPoint = "main");
    
    // Descriptor management
    bool createDescriptorSetLayout(const std::vector<VkDescriptorSetLayoutBinding>& bindings);
    bool createDescriptorPool(const std::vector<VkDescriptorPoolSize>& poolSizes,
                            uint32_t maxSets);
    bool allocateDescriptorSets(VkDescriptorSetLayout layout, 
                              std::vector<VkDescriptorSet>& descriptorSets);
    
    // Command buffer management
    VkCommandBuffer beginSingleTimeCommands();
    void endSingleTimeCommands(VkCommandBuffer commandBuffer);
    
    // Compute operations
    void dispatch(uint32_t groupCountX, uint32_t groupCountY, uint32_t groupCountZ);
    void bindDescriptorSets(const std::vector<VkDescriptorSet>& descriptorSets);
    void bindPipeline();
    
    // Synchronization
    void createFence();
    void waitForFence();
    void resetFence();
    
    // Uniform updates
    void updateUniformBuffer(uint32_t binding, VkBuffer buffer, VkDeviceSize size,
                           VkDeviceSize offset = 0);
    void updateStorageBuffer(uint32_t binding, VkBuffer buffer, VkDeviceSize size,
                            VkDeviceSize offset = 0);
    void updateImage(uint32_t binding, VkImageView imageView, VkImageLayout layout);

private:
    VulkanConfig config_;
    
    // Pipeline objects
    VkPipeline pipeline_;
    VkPipelineLayout pipelineLayout_;
    VkDescriptorSetLayout descriptorSetLayout_;
    VkDescriptorPool descriptorPool_;
    VkShaderModule shaderModule_;
    
    // Command management
    VkCommandBuffer commandBuffer_;
    VkFence fence_;
    
    // Descriptor sets
    std::vector<VkDescriptorSet> descriptorSets_;
    
    // Internal methods
    bool createShaderModule(const std::vector<uint32_t>& spirvCode);
    VkShaderModule loadShader(const std::string& filePath);
    std::vector<uint32_t> readSPIRVFile(const std::string& filePath);
};

/**
 * Vulkan FFT Implementation
 */
class VulkanFFT {
public:
    explicit VulkanFFT(const VulkanConfig& config);
    ~VulkanFFT();
    
    bool initialize(int width, int height);
    void shutdown();
    
    // FFT operations
    bool forwardFFT(const VulkanBuffer& input, VulkanBuffer& output);
    bool inverseFFT(const VulkanBuffer& input, VulkanBuffer& output);
    
    // Multi-stage FFT processing
    bool processFFTStages(const VulkanBuffer& input, VulkanBuffer& output,
                         bool inverse = false);
    
    // Buffer management
    bool createFFTBuffers(VkDeviceSize bufferSize);
    bool createTempBuffers();

private:
    VulkanConfig config_;
    int width_;
    int height_;
    int numStages_;
    
    // Compute pipelines for different FFT stages
    std::unique_ptr<VulkanComputePipeline> fftPipeline_;
    std::unique_ptr<VulkanComputePipeline> butterflyPipeline_;
    
    // FFT buffers
    std::unique_ptr<VulkanBuffer> inputBuffer_;
    std::unique_ptr<VulkanBuffer> outputBuffer_;
    std::unique_ptr<VulkanBuffer> tempBuffer_;
    std::unique_ptr<VulkanBuffer> twiddleBuffer_;
    
    // Descriptor sets
    std::vector<VkDescriptorSet> fftDescriptorSets_;
    
    // Internal methods
    bool createFFTPipelines();
    bool generateTwiddleFactors();
    bool setupDescriptorSets();
    void executeFFTStage(uint32_t stage, bool inverse = false);
};

/**
 * Vulkan Wiener Filter Implementation
 */
class VulkanWienerFilter {
public:
    explicit VulkanWienerFilter(const VulkanConfig& config);
    ~VulkanWienerFilter();
    
    bool initialize(int width, int height);
    void shutdown();
    
    // Wiener filter operations
    bool applyFilter(const VulkanBuffer& input, const VulkanBuffer& psf,
                    VulkanBuffer& output, float noiseVariance, float snr);
    
    // Configuration
    void setFilterParameters(float noiseVariance, float snr);
    void updatePSF(const VulkanBuffer& psf);

private:
    VulkanConfig config_;
    int width_;
    int height_;
    
    // Compute pipeline
    std::unique_ptr<VulkanComputePipeline> wienerPipeline_;
    
    // Buffers
    std::unique_ptr<VulkanBuffer> inputBuffer_;
    std::unique_ptr<VulkanBuffer> psfBuffer_;
    std::unique_ptr<VulkanBuffer> outputBuffer_;
    std::unique_ptr<VulkanBuffer> uniformBuffer_;
    
    // Uniform data
    struct FilterUniforms {
        float noiseVariance;
        float snr;
        uint32_t width;
        uint32_t height;
        uint32_t padding[2];
    } uniforms_;
    
    // Descriptor sets
    VkDescriptorSet descriptorSet_;
    
    // Internal methods
    bool createWienerPipeline();
    bool createBuffers();
    bool setupDescriptorSet();
    void updateUniforms();
};

/**
 * Vulkan Context Manager
 * Manages Vulkan instance, device, and queues
 */
class VulkanContext {
public:
    VulkanContext();
    ~VulkanContext();
    
    bool initialize();
    void shutdown();
    
    // Device management
    bool pickPhysicalDevice();
    bool createLogicalDevice();
    bool findComputeQueueFamily();
    
    // Command management
    bool createCommandPool();
    
    // Getters
    VkInstance getInstance() const { return instance_; }
    VkPhysicalDevice getPhysicalDevice() const { return physicalDevice_; }
    VkDevice getDevice() const { return device_; }
    VkQueue getComputeQueue() const { return computeQueue_; }
    VkCommandPool getCommandPool() const { return commandPool_; }
    uint32_t getComputeQueueFamily() const { return computeQueueFamily_; }
    
    // Configuration
    VulkanConfig getConfig() const;

private:
    VkInstance instance_;
    VkPhysicalDevice physicalDevice_;
    VkDevice device_;
    VkQueue computeQueue_;
    VkCommandPool commandPool_;
    
    uint32_t computeQueueFamily_;
    
    // Debug callback
    VkDebugUtilsMessengerEXT debugMessenger_;
    
    // Internal methods
    bool createInstance();
    bool setupDebugMessenger();
    bool isDeviceSuitable(VkPhysicalDevice device);
    std::vector<const char*> getRequiredExtensions();
    
    // Static debug callback
    static VKAPI_ATTR VkBool32 VKAPI_CALL debugCallback(
        VkDebugUtilsMessageSeverityFlagBitsEXT messageSeverity,
        VkDebugUtilsMessageTypeFlagsEXT messageType,
        const VkDebugUtilsMessengerCallbackDataEXT* pCallbackData,
        void* pUserData);
};

/**
 * Vulkan Shader Compiler
 * Compiles GLSL to SPIR-V for Vulkan compute shaders
 */
class VulkanShaderCompiler {
public:
    static std::vector<uint32_t> compileGLSL(const std::string& glslSource,
                                           const std::string& entryPoint = "main");
    
    static std::vector<uint32_t> compileFromFile(const std::string& filePath,
                                               const std::string& entryPoint = "main");
    
    static bool validateSPIRV(const std::vector<uint32_t>& spirvCode);
    
    // Built-in shader compilation
    static std::vector<uint32_t> compileWienerFilter();
    static std::vector<uint32_t> compileFFT();
    static std::vector<uint32_t> compileSharpen();

private:
    static std::string preprocessGLSL(const std::string& source);
    static std::vector<uint32_t> compileToSPIRV(const std::string& source,
                                               const std::string& entryPoint);
    
    // Compiler backends
    static std::vector<uint32_t> compileWithShaderc(const std::string& source,
                                                    const std::string& entryPoint);
    static std::vector<uint32_t> compileWithGlslang(const std::string& source,
                                                   const std::string& entryPoint);
};

} // namespace kronop

#endif // VULKAN_COMPUTE_HPP
