#include "Weights_Manager.hpp"
#include "Image_IO.hpp"
#include "Vulkan_Validator.hpp"
#include <iostream>

int main() {
    std::cout << "=== Kronop AI Production Test ===" << std::endl;
    
    try {
        // Test Weights Manager
        std::cout << "\n1. Testing Weights Manager..." << std::endl;
        WeightsManager weightsManager;
        
        if (weightsManager.isWeightsLoaded()) {
            std::cout << "✓ Weights loaded successfully" << std::endl;
            std::cout << "  - Total weights: " << weightsManager.getTotalWeightsCount() << std::endl;
            std::cout << "  - Total biases: " << weightsManager.getTotalBiasesCount() << std::endl;
            
            // Test saving weights
            if (weightsManager.saveWeightsToFile("test_weights.bin")) {
                std::cout << "✓ Weights saved to file" << std::endl;
            }
        } else {
            std::cout << "✗ Failed to load weights" << std::endl;
            return 1;
        }
        
        // Test Image I/O
        std::cout << "\n2. Testing Image I/O..." << std::endl;
        ImageIO imageIO;
        
        // Create test image
        auto testImage = imageIO.createGradientImage(256, 256);
        if (!testImage.empty()) {
            std::cout << "✓ Test image created (256x256)" << std::endl;
            
            // Save test image
            if (imageIO.saveImage("test_output.jpg", testImage, 256, 256)) {
                std::cout << "✓ Test image saved as JPG" << std::endl;
            }
            
            // Print statistics
            imageIO.printImageStats(testImage, 256, 256);
        } else {
            std::cout << "✗ Failed to create test image" << std::endl;
            return 1;
        }
        
        // Test Vulkan Validator
        std::cout << "\n3. Testing Vulkan Validator..." << std::endl;
        VulkanErrorHandler vulkanHandler(true);
        
        if (vulkanHandler.checkValidationLayerSupport()) {
            std::cout << "✓ Vulkan validation layers available" << std::endl;
            
            auto extensions = vulkanHandler.getRequiredExtensions();
            std::cout << "  - Required extensions: " << extensions.size() << std::endl;
            for (const auto& ext : extensions) {
                std::cout << "    * " << ext << std::endl;
            }
        } else {
            std::cout << "✗ Vulkan validation layers not available" << std::endl;
            return 1;
        }
        
        std::cout << "\n=== All Tests Passed! ===" << std::endl;
        std::cout << "Production components are ready for integration." << std::endl;
        
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "✗ Test failed with exception: " << e.what() << std::endl;
        return 1;
    }
}
