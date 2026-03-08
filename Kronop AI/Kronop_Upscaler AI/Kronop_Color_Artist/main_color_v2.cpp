#include "Color_Core.cpp"
#include "LUT_Table.hpp"
#include "Image_IO.hpp"
#include <iostream>
#include <chrono>
#include <memory>

class KronopColorArtistV2 {
private:
    std::unique_ptr<ColorArtist> colorArtist;
    std::unique_ptr<LUTGenerator> lutGenerator;
    std::unique_ptr<ImageIO> imageIO;
    
public:
    KronopColorArtistV2() {
        std::cout << "🎨 KRONOP COLOR ARTIST V2 - iPhone Style Enhancement" << std::endl;
        colorArtist = std::make_unique<ColorArtist>();
        lutGenerator = std::make_unique<LUTGenerator>();
        imageIO = std::make_unique<ImageIO>();
    }
    
    bool initialize() {
        try {
            if (!colorArtist->initializeVulkan()) {
                throw std::runtime_error("Failed to initialize Color Artist Vulkan");
            }
            
            if (!lutGenerator->generateiPhoneLUT()) {
                throw std::runtime_error("Failed to generate iPhone LUT");
            }
            
            std::cout << "✓ Color Artist V2 initialized successfully" << std::endl;
            return true;
        } catch (const std::exception& e) {
            std::cerr << "✗ Color Artist initialization failed: " << e.what() << std::endl;
            return false;
        }
    }
    
    bool processVideoTo4K(const std::string& inputPath, const std::string& outputPath, float boostFactor = 1.5f) {
        try {
            std::cout << "\n🎬 PROCESSING VIDEO TO 4K WITH IPHONE COLORS" << std::endl;
            std::cout << "Input: " << inputPath << std::endl;
            std::cout << "Output: " << outputPath << std::endl;
            std::cout << "Color Boost: " << (boostFactor - 1.0f) * 100 << "%" << std::endl;
            
            // Load input image (simulating video frame)
            auto inputImage = imageIO->loadImage(inputPath);
            std::cout << "Loaded: " << inputImage.width << "x" << inputImage.height << std::endl;
            
            // Apply 4K upscaling (2x in each dimension)
            int outputWidth = inputImage.width * 2;
            int outputHeight = inputImage.height * 2;
            
            // Apply iPhone-style color grading
            std::vector<float> outputImage(outputWidth * outputHeight * 4);
            
            auto startTime = std::chrono::high_resolution_clock::now();
            
            bool success = colorArtist->applyColorGrading(
                inputImage.floatData.data(), inputImage.width, inputImage.height,
                outputImage.data(), outputWidth, outputHeight, boostFactor
            );
            
            auto endTime = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);
            
            if (!success) {
                throw std::runtime_error("Color grading failed");
            }
            
            // Save 4K output
            if (!imageIO->saveImage(outputPath, outputImage, outputWidth, outputHeight)) {
                throw std::runtime_error("Failed to save 4K output");
            }
            
            std::cout << "✅ 4K PROCESSING COMPLETE!" << std::endl;
            std::cout << "⏱️  Processing Time: " << duration.count() << "ms" << std::endl;
            std::cout << "📏 Output Resolution: " << outputWidth << "x" << outputHeight << " (4K)" << std::endl;
            std::cout << "🎨 Color Enhancement: iPhone-style vibrant colors" << std::endl;
            
            return true;
            
        } catch (const std::exception& e) {
            std::cerr << "✗ 4K processing failed: " << e.what() << std::endl;
            return false;
        }
    }
    
    bool batchProcessFrames(const std::vector<std::string>& inputPaths, const std::string& outputDir) {
        std::cout << "\n🎥 BATCH PROCESSING VIDEO FRAMES" << std::endl;
        
        for (size_t i = 0; i < inputPaths.size(); ++i) {
            std::string outputPath = outputDir + "/frame_" + std::to_string(i) + "_4k.jpg";
            
            std::cout << "\n📸 Processing Frame " << (i + 1) << "/" << inputPaths.size() << std::endl;
            
            if (!processVideoTo4K(inputPaths[i], outputPath, 1.6f)) {
                std::cerr << "Failed to process frame: " << inputPaths[i] << std::endl;
                return false;
            }
        }
        
        std::cout << "\n✅ ALL FRAMES PROCESSED SUCCESSFULLY!" << std::endl;
        return true;
    }
    
    void demonstrateCapabilities() {
        std::cout << "\n🌈 KRONOP COLOR ARTIST V2 CAPABILITIES" << std::endl;
        std::cout << "======================================" << std::endl;
        std::cout << "✅ 4K Upscaling (2x resolution)" << std::endl;
        std::cout << "✅ iPhone-style Color Enhancement" << std::endl;
        std::cout << "✅ 40-60% Color Boost" << std::endl;
        std::cout << "✅ 3D LUT Color Grading (64x64x64)" << std::endl;
        std::cout << "✅ Skin Tone Preservation" << std::endl;
        std::cout << "✅ Real-time GPU Processing" << std::endl;
        std::cout << "✅ Vulkan Compute Shaders" << std::endl;
        std::cout << "✅ Professional Color Science" << std::endl;
    }
    
    void createTestFrames() {
        std::cout << "\n🎨 Creating test frames for demonstration..." << std::endl;
        
        // Create test images with different color characteristics
        auto testGradient = imageIO->createGradientImage(1920, 1080);
        auto testCheckerboard = imageIO->createTestImage(1920, 1080);
        
        imageIO->saveImage("test_gradient.jpg", testGradient, 1920, 1080);
        imageIO->saveImage("test_checkerboard.jpg", testCheckerboard, 1920, 1080);
        
        std::cout << "✅ Test frames created: test_gradient.jpg, test_checkerboard.jpg" << std::endl;
    }
};

int main(int argc, char* argv[]) {
    try {
        KronopColorArtistV2 artist;
        
        if (!artist.initialize()) {
            return 1;
        }
        
        artist.demonstrateCapabilities();
        
        if (argc == 3) {
            // Process single image to 4K
            std::string input = argv[1];
            std::string output = argv[2];
            
            if (!artist.processVideoTo4K(input, output, 1.6f)) {
                return 1;
            }
            
        } else if (argc == 1) {
            // Demo mode
            artist.createTestFrames();
            
            // Process test frames
            std::vector<std::string> testInputs = {"test_gradient.jpg", "test_checkerboard.jpg"};
            
            if (!artist.batchProcessFrames(testInputs, "./output_4k")) {
                return 1;
            }
            
            std::cout << "\n🎉 COLOR ARTIST V2 DEMO COMPLETE!" << std::endl;
            std::cout << "Check ./output_4k/ folder for 4K enhanced images" << std::endl;
            
        } else {
            std::cout << "Usage:" << std::endl;
            std::cout << "  " << argv[0] << "                    - Run demo mode" << std::endl;
            std::cout << "  " << argv[0] << " <input> <output>    - Process single image to 4K" << std::endl;
            return 1;
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Fatal error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
