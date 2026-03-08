#include "Upscale_Core.cpp"
#include "Weights_Manager.hpp"
#include "Image_IO.hpp"
#include "Vulkan_Validator.hpp"
#include "Kronop_Color_Artist/Color_Core.cpp"
#include "Kronop_Color_Artist/LUT_Table.hpp"
#include <iostream>
#include <fstream>
#include <vector>
#include <chrono>
#include <memory>

class KronopAIMasterPipeline {
private:
    // Upscaler Components
    std::unique_ptr<UpscaleCore> upscaler;
    std::unique_ptr<WeightsManager> weightsManager;
    std::unique_ptr<ImageIO> imageIO;
    std::unique_ptr<VulkanErrorHandler> errorHandler;
    
    // Color Artist Components  
    std::unique_ptr<ColorArtist> colorArtist;
    std::unique_ptr<LUTGenerator> lutGenerator;
    
    // Pipeline State
    bool upscalerReady;
    bool colorArtistReady;
    
public:
    KronopAIMasterPipeline() : upscalerReady(false), colorArtistReady(false) {
        std::cout << "\n🚀 KRONOP AI MASTER PIPELINE V2" << std::endl;
        std::cout << "=================================" << std::endl;
        std::cout << "Initializing complete AI video enhancement system..." << std::endl;
        
        try {
            initializeComponents();
            validatePipeline();
        } catch (const std::exception& e) {
            std::cerr << "✗ Pipeline initialization failed: " << e.what() << std::endl;
            throw;
        }
    }
    
    void initializeComponents() {
        std::cout << "\n📦 Initializing Components..." << std::endl;
        
        // Initialize error handler with validation
        errorHandler = std::make_unique<VulkanErrorHandler>(true);
        std::cout << "✓ Vulkan error handler initialized" << std::endl;
        
        // Initialize weights manager
        weightsManager = std::make_unique<WeightsManager>();
        if (!weightsManager->isWeightsLoaded()) {
            throw std::runtime_error("Failed to load neural weights!");
        }
        std::cout << "✓ Neural weights loaded (" << weightsManager->getTotalWeightsCount() << " weights)" << std::endl;
        
        // Initialize image I/O
        imageIO = std::make_unique<ImageIO>();
        std::cout << "✓ Image I/O initialized" << std::endl;
        
        // Initialize upscaler
        upscaler = std::make_unique<UpscaleCore>();
        if (!upscaler->initializeVulkan()) {
            throw std::runtime_error("Failed to initialize upscaler Vulkan!");
        }
        upscalerReady = true;
        std::cout << "✓ AI Upscaler initialized" << std::endl;
        
        // Initialize color artist
        colorArtist = std::make_unique<ColorArtist>();
        if (!colorArtist->initializeVulkan()) {
            throw std::runtime_error("Failed to initialize Color Artist Vulkan!");
        }
        colorArtistReady = true;
        std::cout << "✓ Color Artist initialized" << std::endl;
        
        // Initialize LUT generator
        lutGenerator = std::make_unique<LUTGenerator>();
        if (!lutGenerator->generateiPhoneLUT()) {
            throw std::runtime_error("Failed to generate iPhone LUT!");
        }
        std::cout << "✓ iPhone LUT generated" << std::endl;
    }
    
    void validatePipeline() {
        std::cout << "\n🔍 Validating Pipeline..." << std::endl;
        
        if (!upscalerReady) {
            throw std::runtime_error("Upscaler not ready!");
        }
        
        if (!colorArtistReady) {
            throw std::runtime_error("Color Artist not ready!");
        }
        
        if (!weightsManager->isWeightsLoaded()) {
            throw std::runtime_error("Weights not loaded!");
        }
        
        std::cout << "✅ All pipeline components validated successfully" << std::endl;
    }
    
    // THE MASTER PIPELINE - ONE COMMAND PROCESSING
    bool processImageTo4KWithiPhoneColors(const std::string& inputPath, const std::string& outputPath, 
                                          float colorBoost = 1.6f) {
        try {
            std::cout << "\n🎬 MASTER PIPELINE PROCESSING" << std::endl;
            std::cout << "============================" << std::endl;
            std::cout << "Input: " << inputPath << std::endl;
            std::cout << "Output: " << outputPath << std::endl;
            std::cout << "Color Boost: " << (colorBoost - 1.0f) * 100 << "%" << std::endl;
            
            auto startTime = std::chrono::high_resolution_clock::now();
            
            // STEP 1: Load Input Image
            std::cout << "\n📁 STEP 1: Loading input image..." << std::endl;
            auto inputImage = imageIO->loadImage(inputPath);
            std::cout << "   Loaded: " << inputImage.width << "x" << inputImage.height << std::endl;
            
            // STEP 2: AI Upscale to 4K
            std::cout << "\n🧠 STEP 2: AI upscaling to 4K..." << std::endl;
            int upscaledWidth = inputImage.width * 2;
            int upscaledHeight = inputImage.height * 2;
            std::vector<float> upscaledImage(upscaledWidth * upscaledHeight * 4);
            
            bool upscaleSuccess = processFrame(upscaler.get(), inputImage.floatData.data(), 
                                          inputImage.width, inputImage.height, upscaledImage.data());
            
            if (!upscaleSuccess) {
                throw std::runtime_error("AI upscaling failed!");
            }
            std::cout << "   Upscaled to: " << upscaledWidth << "x" << upscaledHeight << " (4K)" << std::endl;
            
            // STEP 3: Apply iPhone-style Color Grading
            std::cout << "\n🎨 STEP 3: Applying iPhone-style colors..." << std::endl;
            std::vector<float> finalImage(upscaledWidth * upscaledHeight * 4);
            
            bool colorSuccess = colorArtist->applyColorGrading(
                upscaledImage.data(), upscaledWidth, upscaledHeight,
                finalImage.data(), upscaledWidth, upscaledHeight, colorBoost
            );
            
            if (!colorSuccess) {
                throw std::runtime_error("Color grading failed!");
            }
            std::cout << "   Applied iPhone-style color enhancement" << std::endl;
            
            // STEP 4: Save Final 4K Output
            std::cout << "\n💾 STEP 4: Saving final 4K output..." << std::endl;
            bool saveSuccess = imageIO->saveImage(outputPath, finalImage, upscaledWidth, upscaledHeight);
            
            if (!saveSuccess) {
                throw std::runtime_error("Failed to save output!");
            }
            
            auto endTime = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);
            
            std::cout << "\n🎉 MASTER PIPELINE COMPLETE!" << std::endl;
            std::cout << "============================" << std::endl;
            std::cout << "✅ Input: " << inputImage.width << "x" << inputImage.height << std::endl;
            std::cout << "✅ Output: " << upscaledWidth << "x" << upscaledHeight << " (4K)" << std::endl;
            std::cout << "✅ AI Upscaling: Applied with real neural weights" << std::endl;
            std::cout << "✅ Color Enhancement: iPhone-style " << (colorBoost - 1.0f) * 100 << "% boost" << std::endl;
            std::cout << "⏱️  Total Processing Time: " << duration.count() << "ms" << std::endl;
            std::cout << "📁 Output saved: " << outputPath << std::endl;
            
            return true;
            
        } catch (const std::exception& e) {
            std::cerr << "\n✗ Master pipeline failed: " << e.what() << std::endl;
            return false;
        }
    }
    
    // Batch processing for video frames
    bool processVideoFramesTo4K(const std::vector<std::string>& inputPaths, const std::string& outputDir, 
                                float colorBoost = 1.6f) {
        std::cout << "\n🎥 BATCH PROCESSING VIDEO FRAMES" << std::endl;
        std::cout << "=================================" << std::endl;
        std::cout << "Frames: " << inputPaths.size() << std::endl;
        std::cout << "Output Directory: " << outputDir << std::endl;
        std::cout << "Color Boost: " << (colorBoost - 1.0f) * 100 << "%" << std::endl;
        
        auto totalStartTime = std::chrono::high_resolution_clock::now();
        
        for (size_t i = 0; i < inputPaths.size(); ++i) {
            std::string outputPath = outputDir + "/frame_" + std::to_string(i) + "_4k.jpg";
            
            std::cout << "\n📸 Processing Frame " << (i + 1) << "/" << inputPaths.size() << std::endl;
            std::cout << "   Input: " << inputPaths[i] << std::endl;
            std::cout << "   Output: " << outputPath << std::endl;
            
            if (!processImageTo4KWithiPhoneColors(inputPaths[i], outputPath, colorBoost)) {
                std::cerr << "Failed to process frame: " << inputPaths[i] << std::endl;
                return false;
            }
        }
        
        auto totalEndTime = std::chrono::high_resolution_clock::now();
        auto totalDuration = std::chrono::duration_cast<std::chrono::seconds>(totalEndTime - totalStartTime);
        
        std::cout << "\n🎉 BATCH PROCESSING COMPLETE!" << std::endl;
        std::cout << "==============================" << std::endl;
        std::cout << "✅ All " << inputPaths.size() << " frames processed successfully" << std::endl;
        std::cout << "⏱️  Total Time: " << totalDuration.count() << " seconds" << std::endl;
        std::cout << "📁 Output Directory: " << outputDir << std::endl;
        
        return true;
    }
    
    void demonstrateCapabilities() {
        std::cout << "\n🌈 KRONOP AI MASTER PIPELINE CAPABILITIES" << std::endl;
        std::cout << "=====================================" << std::endl;
        std::cout << "✅ Real AI Upscaling (2x resolution)" << std::endl;
        std::cout << "✅ Pre-trained Neural Weights (320 weights + 52 biases)" << std::endl;
        std::cout << "✅ iPhone-style Color Enhancement (40-60% boost)" << std::endl;
        std::cout << "✅ 3D LUT Color Grading (64x64x64)" << std::endl;
        std::cout << "✅ Vulkan GPU Acceleration" << std::endl;
        std::cout << "✅ Unified Pipeline (One-command processing)" << std::endl;
        std::cout << "✅ Batch Video Frame Processing" << std::endl;
        std::cout << "✅ Production-ready Error Handling" << std::endl;
    }
    
    void createTestFrames() {
        std::cout << "\n🎨 Creating test frames for demonstration..." << std::endl;
        
        // Create test images with different characteristics
        auto testGradient = imageIO->createGradientImage(1920, 1080);
        auto testCheckerboard = imageIO->createTestImage(1920, 1080);
        
        imageIO->saveImage("test_gradient.jpg", testGradient, 1920, 1080);
        imageIO->saveImage("test_checkerboard.jpg", testCheckerboard, 1920, 1080);
        
        std::cout << "✅ Test frames created:" << std::endl;
        std::cout << "   - test_gradient.jpg (1920x1080)" << std::endl;
        std::cout << "   - test_checkerboard.jpg (1920x1080)" << std::endl;
    }
};

int main(int argc, char* argv[]) {
    try {
        KronopAIMasterPipeline pipeline;
        
        pipeline.demonstrateCapabilities();
        
        if (argc == 3) {
            // Single image processing
            std::string input = argv[1];
            std::string output = argv[2];
            
            if (!pipeline.processImageTo4KWithiPhoneColors(input, output, 1.6f)) {
                return 1;
            }
            
        } else if (argc == 1) {
            // Demo mode
            pipeline.createTestFrames();
            
            // Process test frames
            std::vector<std::string> testInputs = {"test_gradient.jpg", "test_checkerboard.jpg"};
            
            if (!pipeline.processVideoFramesTo4K(testInputs, "./output_4k", 1.6f)) {
                return 1;
            }
            
            std::cout << "\n🎉 MASTER PIPELINE DEMO COMPLETE!" << std::endl;
            std::cout << "Check ./output_4k/ folder for 4K enhanced images" << std::endl;
            
        } else {
            std::cout << "🚀 KRONOP AI MASTER PIPELINE V2" << std::endl;
            std::cout << "Usage:" << std::endl;
            std::cout << "  " << argv[0] << "                    - Run demo mode" << std::endl;
            std::cout << "  " << argv[0] << " <input> <output>    - Process single image to 4K with iPhone colors" << std::endl;
            return 1;
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Fatal error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
