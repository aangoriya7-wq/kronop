#pragma once
#include <vulkan/vulkan.h>
#include <iostream>
#include <vector>
#include <string>
#include <stdexcept>

class VulkanErrorHandler {
private:
    VkDebugUtilsMessengerEXT debugMessenger;
    bool enableValidation;
    
    // Validation layer names
    const std::vector<const char*> validationLayers = {
        "VK_LAYER_KHRONOS_validation",
        "VK_LAYER_LUNARG_standard_validation"
    };
    
public:
    VulkanErrorHandler(bool enable = true) : enableValidation(enable), debugMessenger(VK_NULL_HANDLE) {}
    
    ~VulkanErrorHandler() {
        cleanup();
    }
    
    // Check if validation layers are available
    bool checkValidationLayerSupport() {
        uint32_t layerCount;
        vkEnumerateInstanceLayerProperties(&layerCount, nullptr);
        
        std::vector<VkLayerProperties> availableLayers(layerCount);
        vkEnumerateInstanceLayerProperties(&layerCount, availableLayers.data());
        
        std::cout << "Available Vulkan Layers:" << std::endl;
        for (const auto& layer : availableLayers) {
            std::cout << "  - " << layer.layerName << std::endl;
        }
        
        for (const char* layerName : validationLayers) {
            bool layerFound = false;
            
            for (const auto& layerProperties : availableLayers) {
                if (strcmp(layerName, layerProperties.layerName) == 0) {
                    layerFound = true;
                    break;
                }
            }
            
            if (!layerFound) {
                std::cerr << "Validation layer not found: " << layerName << std::endl;
                return false;
            }
        }
        
        std::cout << "✓ All validation layers are available" << std::endl;
        return true;
    }
    
    // Get required validation layers
    std::vector<const char*> getRequiredValidationLayers() {
        if (!enableValidation) {
            return {};
        }
        
        if (!checkValidationLayerSupport()) {
            throw std::runtime_error("Validation layers requested, but not available!");
        }
        
        return validationLayers;
    }
    
    // Debug callback function
    static VKAPI_ATTR VkBool32 VKAPI_CALL debugCallback(
        VkDebugUtilsMessageSeverityFlagBitsEXT messageSeverity,
        VkDebugUtilsMessageTypeFlagsEXT messageType,
        const VkDebugUtilsMessengerCallbackDataEXT* pCallbackData,
        void* pUserData) {
        
        std::string severity;
        if (messageSeverity & VK_DEBUG_UTILS_MESSAGE_SEVERITY_VERBOSE_BIT_EXT) {
            severity = "VERBOSE";
        } else if (messageSeverity & VK_DEBUG_UTILS_MESSAGE_SEVERITY_INFO_BIT_EXT) {
            severity = "INFO";
        } else if (messageSeverity & VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT) {
            severity = "WARNING";
        } else if (messageSeverity & VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT) {
            severity = "ERROR";
        }
        
        std::string type;
        if (messageType & VK_DEBUG_UTILS_MESSAGE_TYPE_GENERAL_BIT_EXT) {
            type = "GENERAL";
        } else if (messageType & VK_DEBUG_UTILS_MESSAGE_TYPE_VALIDATION_BIT_EXT) {
            type = "VALIDATION";
        } else if (messageType & VK_DEBUG_UTILS_MESSAGE_TYPE_PERFORMANCE_BIT_EXT) {
            type = "PERFORMANCE";
        }
        
        std::cerr << "[VULKAN][" << severity << "][" << type << "]: " 
                  << pCallbackData->pMessage << std::endl;
        
        // Print object information if available
        if (pCallbackData->objectCount > 0) {
            std::cerr << "  Objects involved:" << std::endl;
            for (uint32_t i = 0; i < pCallbackData->objectCount; ++i) {
                std::cerr << "    - Object " << i << ": Type=" << pCallbackData->pObjects[i].objectType 
                          << ", Handle=" << pCallbackData->pObjects[i].objectHandle << std::endl;
            }
        }
        
        // Return error for validation errors
        if (messageSeverity >= VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT) {
            return VK_TRUE;
        }
        
        return VK_FALSE;
    }
    
    // Setup debug messenger
    void setupDebugMessenger(VkInstance instance) {
        if (!enableValidation) return;
        
        VkDebugUtilsMessengerCreateInfoEXT createInfo{};
        createInfo.sType = VK_STRUCTURE_TYPE_DEBUG_UTILS_MESSENGER_CREATE_INFO_EXT;
        createInfo.messageSeverity = 
            VK_DEBUG_UTILS_MESSAGE_SEVERITY_VERBOSE_BIT_EXT |
            VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT |
            VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT;
        createInfo.messageType = 
            VK_DEBUG_UTILS_MESSAGE_TYPE_GENERAL_BIT_EXT |
            VK_DEBUG_UTILS_MESSAGE_TYPE_VALIDATION_BIT_EXT |
            VK_DEBUG_UTILS_MESSAGE_TYPE_PERFORMANCE_BIT_EXT;
        createInfo.pfnUserCallback = debugCallback;
        createInfo.pUserData = nullptr;
        
        // Load the function
        auto func = (PFN_vkCreateDebugUtilsMessengerEXT) vkGetInstanceProcAddr(
            instance, "vkCreateDebugUtilsMessengerEXT");
        
        if (func == nullptr) {
            throw std::runtime_error("Debug utils messenger not available!");
        }
        
        VkResult result = func(instance, &createInfo, nullptr, &debugMessenger);
        if (result != VK_SUCCESS) {
            throw std::runtime_error("Failed to set up debug messenger!");
        }
        
        std::cout << "✓ Vulkan debug messenger setup complete" << std::endl;
    }
    
    // Cleanup debug messenger
    void cleanup(VkInstance instance = VK_NULL_HANDLE) {
        if (!enableValidation || debugMessenger == VK_NULL_HANDLE) return;
        
        auto func = (PFN_vkDestroyDebugUtilsMessengerEXT) vkGetInstanceProcAddr(
            instance, "vkDestroyDebugUtilsMessengerEXT");
        
        if (func != nullptr) {
            func(instance, debugMessenger, nullptr);
            debugMessenger = VK_NULL_HANDLE;
        }
    }
    
    // Check VkResult and throw appropriate error
    void checkVkResult(VkResult result, const std::string& operation) {
        if (result == VK_SUCCESS) return;
        
        std::string errorString;
        switch (result) {
            case VK_NOT_READY:
                errorString = "VK_NOT_READY";
                break;
            case VK_TIMEOUT:
                errorString = "VK_TIMEOUT";
                break;
            case VK_EVENT_SET:
                errorString = "VK_EVENT_SET";
                break;
            case VK_EVENT_RESET:
                errorString = "VK_EVENT_RESET";
                break;
            case VK_INCOMPLETE:
                errorString = "VK_INCOMPLETE";
                break;
            case VK_ERROR_OUT_OF_HOST_MEMORY:
                errorString = "VK_ERROR_OUT_OF_HOST_MEMORY";
                break;
            case VK_ERROR_OUT_OF_DEVICE_MEMORY:
                errorString = "VK_ERROR_OUT_OF_DEVICE_MEMORY";
                break;
            case VK_ERROR_INITIALIZATION_FAILED:
                errorString = "VK_ERROR_INITIALIZATION_FAILED";
                break;
            case VK_ERROR_DEVICE_LOST:
                errorString = "VK_ERROR_DEVICE_LOST";
                break;
            case VK_ERROR_MEMORY_MAP_FAILED:
                errorString = "VK_ERROR_MEMORY_MAP_FAILED";
                break;
            case VK_ERROR_LAYER_NOT_PRESENT:
                errorString = "VK_ERROR_LAYER_NOT_PRESENT";
                break;
            case VK_ERROR_EXTENSION_NOT_PRESENT:
                errorString = "VK_ERROR_EXTENSION_NOT_PRESENT";
                break;
            case VK_ERROR_FEATURE_NOT_PRESENT:
                errorString = "VK_ERROR_FEATURE_NOT_PRESENT";
                break;
            case VK_ERROR_INCOMPATIBLE_DRIVER:
                errorString = "VK_ERROR_INCOMPATIBLE_DRIVER";
                break;
            case VK_ERROR_TOO_MANY_OBJECTS:
                errorString = "VK_ERROR_TOO_MANY_OBJECTS";
                break;
            case VK_ERROR_FORMAT_NOT_SUPPORTED:
                errorString = "VK_ERROR_FORMAT_NOT_SUPPORTED";
                break;
            case VK_ERROR_FRAGMENTED_POOL:
                errorString = "VK_ERROR_FRAGMENTED_POOL";
                break;
            default:
                errorString = "UNKNOWN_VULKAN_ERROR";
                break;
        }
        
        throw std::runtime_error("Vulkan Error in " + operation + ": " + errorString + " (" + std::to_string(result) + ")");
    }
    
    // Get required extensions for validation
    std::vector<const char*> getRequiredExtensions() {
        std::vector<const char*> extensions;
        
        // Add debug utils extension if validation is enabled
        if (enableValidation) {
            extensions.push_back(VK_EXT_DEBUG_UTILS_EXTENSION_NAME);
        }
        
        return extensions;
    }
    
    // Enable validation in instance create info
    void populateDebugMessengerCreateInfo(VkDebugUtilsMessengerCreateInfoEXT& createInfo) {
        createInfo = {};
        createInfo.sType = VK_STRUCTURE_TYPE_DEBUG_UTILS_MESSENGER_CREATE_INFO_EXT;
        createInfo.messageSeverity = 
            VK_DEBUG_UTILS_MESSAGE_SEVERITY_VERBOSE_BIT_EXT |
            VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT |
            VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT;
        createInfo.messageType = 
            VK_DEBUG_UTILS_MESSAGE_TYPE_GENERAL_BIT_EXT |
            VK_DEBUG_UTILS_MESSAGE_TYPE_VALIDATION_BIT_EXT |
            VK_DEBUG_UTILS_MESSAGE_TYPE_PERFORMANCE_BIT_EXT;
        createInfo.pfnUserCallback = debugCallback;
    }
    
    // Print device capabilities
    void printDeviceCapabilities(VkPhysicalDevice device) {
        VkPhysicalDeviceProperties properties;
        VkPhysicalDeviceFeatures features;
        
        vkGetPhysicalDeviceProperties(device, &properties);
        vkGetPhysicalDeviceFeatures(device, &features);
        
        std::cout << "Device Information:" << std::endl;
        std::cout << "  Device Name: " << properties.deviceName << std::endl;
        std::cout << "  Device Type: ";
        
        switch (properties.deviceType) {
            case VK_PHYSICAL_DEVICE_TYPE_INTEGRATED_GPU:
                std::cout << "Integrated GPU";
                break;
            case VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU:
                std::cout << "Discrete GPU";
                break;
            case VK_PHYSICAL_DEVICE_TYPE_VIRTUAL_GPU:
                std::cout << "Virtual GPU";
                break;
            case VK_PHYSICAL_DEVICE_TYPE_CPU:
                std::cout << "CPU";
                break;
            default:
                std::cout << "Other";
                break;
        }
        std::cout << std::endl;
        
        std::cout << "  API Version: " << VK_VERSION_MAJOR(properties.apiVersion) 
                  << "." << VK_VERSION_MINOR(properties.apiVersion) 
                  << "." << VK_VERSION_PATCH(properties.apiVersion) << std::endl;
        
        std::cout << "  Max Compute Units: " << properties.limits.maxComputeWorkGroupCount[0] 
                  << "x" << properties.limits.maxComputeWorkGroupCount[1] 
                  << "x" << properties.limits.maxComputeWorkGroupCount[2] << std::endl;
        
        std::cout << "  Max Work Group Size: " << properties.limits.maxComputeWorkGroupSize[0] 
                  << "x" << properties.limits.maxComputeWorkGroupSize[1] 
                  << "x" << properties.limits.maxComputeWorkGroupSize[2] << std::endl;
        
        std::cout << "  Max Memory Allocation: " << properties.limits.maxMemoryAllocationCount << std::endl;
        std::cout << "  Max Compute Shared Memory: " << properties.limits.maxComputeSharedMemorySize << " bytes" << std::endl;
    }
    
    // Check if device supports compute operations
    bool isComputeSupported(VkPhysicalDevice device) {
        uint32_t queueFamilyCount = 0;
        vkGetPhysicalDeviceQueueFamilyProperties(device, &queueFamilyCount, nullptr);
        
        std::vector<VkQueueFamilyProperties> queueFamilies(queueFamilyCount);
        vkGetPhysicalDeviceQueueFamilyProperties(device, &queueFamilyCount, queueFamilies.data());
        
        for (uint32_t i = 0; i < queueFamilyCount; ++i) {
            if (queueFamilies[i].queueFlags & VK_QUEUE_COMPUTE_BIT) {
                std::cout << "✓ Compute queue family found at index " << i << std::endl;
                return true;
            }
        }
        
        return false;
    }
};
