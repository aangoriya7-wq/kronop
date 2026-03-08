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
            
            // Load input image
            auto imageData = imageIO->loadImage(inputPath);
            std::cout << "Loaded image: " << imageData.width << "x" << imageData.height << std::endl;
            
            // Initialize upscaler with weights
            if (!initializeUpscalerWithWeights()) {
                throw std::runtime_error("Failed to initialize upscaler with weights!");
            }
            
            // Process image
            int outputWidth = imageData.width * 2;
            int outputHeight = imageData.height * 2;
            std::vector<float> outputData(outputWidth * outputHeight * 4);
            
            auto startTime = std::chrono::high_resolution_clock::now();
            
            bool success = processFrame(upscaler.get(), imageData.floatData.data(), 
                                      imageData.width, imageData.height, outputData.data());
            
            auto endTime = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);
            
            if (!success) {
                throw std::runtime_error("Image processing failed!");
            }
            
            // Save output image
            if (!imageIO->saveImage(outputPath, outputData, outputWidth, outputHeight)) {
                throw std::runtime_error("Failed to save output image!");
            }
            
            std::cout << "✓ Image processed successfully in " << duration.count() << "ms" << std::endl;
            std::cout << "Output saved: " << outputPath << std::endl;
            
            // Print statistics
            imageIO->printImageStats(outputData, outputWidth, outputHeight);
            
            return true;
            
        } catch (const std::exception& e) {
            std::cerr << "✗ Image processing failed: " << e.what() << std::endl;
            return false;
        }
    }
    
    // Initialize upscaler with pre-trained weights
    bool initializeUpscalerWithWeights() {
        try {
            // Get weights and biases
            auto weights = weightsManager->getAllWeights();
            auto biases = weightsManager->getAllBiases();
            
            // Initialize Vulkan upscaler
            if (!initializeUpscaler(upscaler.get())) {
                throw std::runtime_error("Failed to initialize upscaler!");
            }
            
            std::cout << "✓ Upscaler initialized with pre-trained weights" << std::endl;
            std::cout << "  - Weights: " << weights.size() << " parameters" << std::endl;
            std::cout << "  - Biases: " << biases.size() << " parameters" << std::endl;
            
            return true;
            
        } catch (const std::exception& e) {
            std::cerr << "✗ Weight initialization failed: " << e.what() << std::endl;
            return false;
        }
    }
    
    // Run comprehensive performance test
    void runPerformanceTest() {
        std::cout << "\n=== Performance Test ===" << std::endl;
        
        std::vector<std::pair<int, int>> resolutions = {
            {640, 480},    // SD
            {1280, 720},   // HD  
            {1920, 1080}   // Full HD
        };
        
        for (const auto& res : resolutions) {
            int width = res.first;
            int height = res.second;
            
            std::cout << "\nTesting " << width << "x" << height << "..." << std::endl;
            
            // Create test image
            auto testInput = imageIO->createGradientImage(width, height);
            
            int outputWidth = width * 2;
            int outputHeight = height * 2;
            std::vector<float> testOutput(outputWidth * outputHeight * 4);
            
            // Measure performance
            auto start = std::chrono::high_resolution_clock::now();
            
            bool success = processFrame(upscaler.get(), testInput.data(), 
                                      width, height, testOutput.data());
            
            auto end = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
            
            if (success) {
                std::cout << "✓ Processing time: " << duration.count() << "ms" << std::endl;
                std::cout << "  Throughput: " << (width * height) / (duration.count() / 1000.0) << " pixels/sec" << std::endl;
            } else {
                std::cout << "✗ Processing failed!" << std::endl;
            }
        }
    }
    
    // Validate system requirements
    bool validateSystem() {
        std::cout << "\n=== System Validation ===" << std::endl;
        
        try {
            // Check weights
            if (!weightsManager->isWeightsLoaded()) {
                std::cerr << "✗ Neural weights not loaded!" << std::endl;
                return false;
            }
            std::cout << "✓ Neural weights loaded" << std::endl;
            
            // Check image I/O
            auto testImage = imageIO->createTestImage(64, 64);
            if (testImage.empty()) {
                std::cerr << "✗ Image I/O system failed!" << std::endl;
                return false;
            }
            std::cout << "✓ Image I/O system working" << std::endl;
            
            // Check Vulkan
            if (!errorHandler->checkValidationLayerSupport()) {
                std::cerr << "✗ Vulkan validation layers not available!" << std::endl;
                return false;
            }
            std::cout << "✓ Vulkan validation layers available" << std::endl;
            
            std::cout << "✓ System validation passed" << std::endl;
            return true;
            
        } catch (const std::exception& e) {
            std::cerr << "✗ System validation failed: " << e.what() << std::endl;
            return false;
        }
    }
    
    // Save weights to file for persistence
    bool saveWeights(const std::string& filename) {
        return weightsManager->saveWeightsToFile(filename);
    }
    
    // Load weights from file
    bool loadWeights(const std::string& filename) {
        return weightsManager->loadWeightsFromFile(filename);
    }
};

int main(int argc, char* argv[]) {
    try {
        ProductionUpscaler upscaler;
        
        // Validate system first
        if (!upscaler.validateSystem()) {
            std::cerr << "System validation failed. Exiting." << std::endl;
            return 1;
        }
        
        if (argc == 3) {
            // Process specific image file
            std::string inputPath = argv[1];
            std::string outputPath = argv[2];
            
            if (!upscaler.processImageFile(inputPath, outputPath)) {
                return 1;
            }
            
        } else if (argc == 1) {
            // Run default tests
            std::cout << "\nRunning production tests..." << std::endl;
            
            // Create test image and process it
            auto testImage = std::make_unique<ImageIO>();
            auto imageData = testImage->createGradientImage(256, 256);
            testImage->saveImage("production_test_input.jpg", imageData, 256, 256);
            
            upscaler.processImageFile("production_test_input.jpg", "production_test_output.jpg");
            upscaler.runPerformanceTest();
            
            // Save weights for future use
            upscaler.saveWeights("kronop_upscaler_weights.bin");
            
            std::cout << "\n✓ All production tests completed successfully!" << std::endl;
            
        } else {
            std::cout << "Usage:" << std::endl;
            std::cout << "  " << argv[0] << "                    - Run production tests" << std::endl;
            std::cout << "  " << argv[0] << " <input> <output>    - Process specific image" << std::endl;
            return 1;
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Fatal error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
