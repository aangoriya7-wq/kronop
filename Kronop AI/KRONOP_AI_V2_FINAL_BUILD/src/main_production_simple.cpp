#include "Upscale_Core.cpp"
#include "Weights_Manager.hpp"
#include "Image_IO.hpp"
#include "Vulkan_Validator.hpp"
#include <iostream>
#include <fstream>
#include <vector>
#include <chrono>
#include <memory>

class ProductionUpscaler {
private:
    std::unique_ptr<UpscaleCore> upscaler;
    std::unique_ptr<WeightsManager> weightsManager;
    std::unique_ptr<ImageIO> imageIO;
    std::unique_ptr<VulkanErrorHandler> errorHandler;
    
public:
    ProductionUpscaler() {
        std::cout << "=== Kronop AI Production Upscaler ===" << std::endl;
        std::cout << "Initializing production-ready upscaler..." << std::endl;
        
        try {
            // Initialize error handler with validation
            errorHandler = std::make_unique<VulkanErrorHandler>(true);
            
            // Initialize weights manager
            weightsManager = std::make_unique<WeightsManager>();
            if (!weightsManager->isWeightsLoaded()) {
                throw std::runtime_error("Failed to load neural weights!");
            }
            
            // Initialize image I/O
            imageIO = std::make_unique<ImageIO>();
            
            // Initialize upscaler
            upscaler = std::make_unique<UpscaleCore>();
            
            std::cout << "✓ Production upscaler initialized successfully" << std::endl;
            
        } catch (const std::exception& e) {
            std::cerr << "✗ Initialization failed: " << e.what() << std::endl;
            throw;
        }
    }
    
    // Process real image file
    bool processImageFile(const std::string& inputPath, const std::string& outputPath) {
        try {
            std::cout << "\n=== Processing Image ===" << std::endl;
            std::cout << "Input: " << inputPath << std::endl;
            std::cout << "Output: " << outputPath << std::endl;
            
            auto startTime = std::chrono::high_resolution_clock::now();
            
            // Load input image
            auto inputImage = imageIO->loadImage(inputPath);
            std::cout << "Loaded: " << inputImage.width << "x" << inputImage.height << std::endl;
            
            // Process with upscaler
            int outputWidth = inputImage.width * 2;
            int outputHeight = inputImage.height * 2;
            std::vector<float> outputImage(outputWidth * outputHeight * 4);
            
            bool success = processFrame(upscaler.get(), inputImage.floatData.data(), 
                                      inputImage.width, inputImage.height, outputImage.data());
            
            if (!success) {
                throw std::runtime_error("Upscaling failed!");
            }
            
            // Save output
            if (!imageIO->saveImage(outputPath, outputImage, outputWidth, outputHeight)) {
                throw std::runtime_error("Failed to save output!");
            }
            
            auto endTime = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);
            
            std::cout << "✅ Processing complete!" << std::endl;
            std::cout << "Output: " << outputWidth << "x" << outputHeight << " (4K)" << std::endl;
            std::cout << "Time: " << duration.count() << "ms" << std::endl;
            std::cout << "File: " << outputPath << std::endl;
            
            return true;
            
        } catch (const std::exception& e) {
            std::cerr << "✗ Processing failed: " << e.what() << std::endl;
            return false;
        }
    }
    
    // Run performance tests
    void runPerformanceTests() {
        std::cout << "\n=== Performance Tests ===" << std::endl;
        
        std::vector<std::pair<int, int>> testResolutions = {
            {640, 480},    // VGA
            {1280, 720},   // HD
            {1920, 1080},  // Full HD
            {2560, 1440},  // 2K
            {3840, 2160}   // 4K
        };
        
        for (const auto& res : testResolutions) {
            std::cout << "\nTesting " << res.first << "x" << res.second << "..." << std::endl;
            
            auto testImage = imageIO->createTestImage(res.first, res.second);
            std::vector<float> outputImage(res.first * 2 * res.second * 2 * 4);
            
            auto startTime = std::chrono::high_resolution_clock::now();
            
            bool success = processFrame(upscaler.get(), testImage.data(), 
                                      res.first, res.second, outputImage.data());
            
            auto endTime = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);
            
            std::cout << "Result: " << (success ? "✅ SUCCESS" : "✗ FAILED") << std::endl;
            std::cout << "Time: " << duration.count() << "ms" << std::endl;
        }
    }
    
    // Validate system
    void validateSystem() {
        std::cout << "\n=== System Validation ===" << std::endl;
        
        // Test weights loading
        if (weightsManager->isWeightsLoaded()) {
            std::cout << "✅ Neural weights loaded (" << weightsManager->getTotalWeightsCount() << " weights)" << std::endl;
        } else {
            std::cout << "❌ Neural weights failed to load" << std::endl;
        }
        
        // Test image I/O
        auto testImage = imageIO->createTestImage(100, 100);
        if (!testImage.empty()) {
            std::cout << "✅ Image I/O working" << std::endl;
        } else {
            std::cout << "❌ Image I/O failed" << std::endl;
        }
        
        // Test Vulkan
        if (errorHandler->checkValidationLayerSupport()) {
            std::cout << "✅ Vulkan validation available" << std::endl;
        } else {
            std::cout << "⚠️  Vulkan validation not available" << std::endl;
        }
        
        // Test shader compilation
        if (std::ifstream("upscale.comp.spv").good()) {
            std::cout << "✅ Compute shader compiled" << std::endl;
        } else {
            std::cout << "❌ Compute shader missing" << std::endl;
        }
    }
};

int main(int argc, char* argv[]) {
    try {
        ProductionUpscaler upscaler;
        
        if (argc == 3) {
            // Process specific image
            std::string input = argv[1];
            std::string output = argv[2];
            
            if (!upscaler.processImageFile(input, output)) {
                return 1;
            }
            
        } else if (argc == 1) {
            // Run validation and tests
            upscaler.validateSystem();
            upscaler.runPerformanceTests();
            
        } else {
            std::cout << "Kronop AI Production Upscaler" << std::endl;
            std::cout << "Usage:" << std::endl;
            std::cout << "  " << argv[0] << "                    - Run validation and performance tests" << std::endl;
            std::cout << "  " << argv[0] << " <input> <output>    - Process image to 4K" << std::endl;
            return 1;
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Fatal error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
