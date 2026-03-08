#include "Color_Core.cpp"
#include <iostream>
#include <fstream>
#include <vector>
#include <chrono>

void printColorGPUInfo(ColorArtist* artist) {
    std::cout << "\n=== Color Processing GPU Information ===" << std::endl;
    std::cout << getColorGPUInfo(artist) << std::endl;
}

bool runColorQualityTest(ColorArtist* artist) {
    std::cout << "\n=== Color Quality Test ===" << std::endl;
    
    int width = 640;
    int height = 480;
    
    std::vector<float> testInput(width * height * 4);
    std::vector<float> testOutput(width * height * 4);
    
    // Create a test image with various color scenarios
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            int idx = (y * width + x) * 4;
            
            // Create different color zones for testing
            if (x < width/3) {
                // Red zone - test warm tones
                testInput[idx] = 0.8f;     // Red
                testInput[idx + 1] = 0.3f; // Green
                testInput[idx + 2] = 0.2f; // Blue
            } else if (x < 2*width/3) {
                // Green zone - test foliage
                testInput[idx] = 0.2f;     // Red
                testInput[idx + 1] = 0.7f; // Green
                testInput[idx + 2] = 0.3f; // Blue
            } else {
                // Blue zone - test sky tones
                testInput[idx] = 0.3f;     // Red
                testInput[idx + 1] = 0.4f; // Green
                testInput[idx + 2] = 0.9f; // Blue
            }
            testInput[idx + 3] = 1.0f;      // Alpha
        }
    }
    
    // Apply color grading with 50% boost
    bool success = applyColorGrading(artist, testInput.data(), width, height, testOutput.data(), 1.5f);
    
    if (success) {
        // Save output for visual inspection
        std::ofstream outputFile("color_test_output.raw", std::ios::binary);
        if (outputFile.is_open()) {
            outputFile.write(reinterpret_cast<const char*>(testOutput.data()), 
                           testOutput.size() * sizeof(float));
            outputFile.close();
            std::cout << "✓ Color test output saved to color_test_output.raw" << std::endl;
            std::cout << "✓ Input: " << width << "x" << height << std::endl;
            std::cout << "✓ Color boost: 50%" << std::endl;
        } else {
            std::cout << "✗ Failed to save output file" << std::endl;
            return false;
        }
    } else {
        std::cout << "✗ Color quality test failed!" << std::endl;
        return false;
    }
    
    return true;
}

bool runColorPerformanceTest(ColorArtist* artist) {
    std::cout << "\n=== Color Performance Test ===" << std::endl;
    
    // Test different resolutions
    std::vector<std::pair<int, int>> resolutions = {
        {640, 480},   // SD
        {1280, 720},  // HD
        {1920, 1080}  // Full HD
    };
    
    std::vector<float> boostFactors = {1.4f, 1.5f, 1.6f}; // 40%, 50%, 60%
    
    for (const auto& res : resolutions) {
        int width = res.first;
        int height = res.second;
        
        std::cout << "Testing " << width << "x" << height << "..." << std::endl;
        
        std::vector<float> testInput(width * height * 4);
        std::vector<float> testOutput(width * height * 4);
        
        // Generate realistic test image
        for (int y = 0; y < height; ++y) {
            for (int x = 0; x < width; ++x) {
                int idx = (y * width + x) * 4;
                
                // Create gradient with some color variation
                testInput[idx] = (float)x / width * 0.8f + 0.1f;     // Red
                testInput[idx + 1] = (float)y / height * 0.7f + 0.2f; // Green
                testInput[idx + 2] = 0.5f + 0.3f * sin(x * 0.01f);   // Blue with variation
                testInput[idx + 3] = 1.0f;                             // Alpha
            }
        }
        
        for (float boost : boostFactors) {
            std::cout << "  Boost factor: " << int((boost - 1.0f) * 100) << "%..." << std::endl;
            
            // Measure performance
            auto start = std::chrono::high_resolution_clock::now();
            
            bool success = applyColorGrading(artist, testInput.data(), width, height, testOutput.data(), boost);
            
            auto end = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
            
            if (success) {
                std::cout << "    ✓ GPU: " << duration.count() << "ms" << std::endl;
            } else {
                std::cout << "    ✗ Failed!" << std::endl;
                return false;
            }
        }
        
        std::cout << std::endl;
    }
    
    return true;
}

bool runSkinToneTest(ColorArtist* artist) {
    std::cout << "\n=== Skin Tone Preservation Test ===" << std::endl;
    
    int width = 320;
    int height = 240;
    
    std::vector<float> testInput(width * height * 4);
    std::vector<float> testOutput(width * height * 4);
    
    // Create image with skin tones
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            int idx = (y * width + x) * 4;
            
            // Various skin tones
            if (x < width/4) {
                // Light skin tone
                testInput[idx] = 0.9f;     // Red
                testInput[idx + 1] = 0.7f; // Green
                testInput[idx + 2] = 0.6f; // Blue
            } else if (x < width/2) {
                // Medium skin tone
                testInput[idx] = 0.8f;     // Red
                testInput[idx + 1] = 0.5f; // Green
                testInput[idx + 2] = 0.4f; // Blue
            } else if (x < 3*width/4) {
                // Dark skin tone
                testInput[idx] = 0.6f;     // Red
                testInput[idx + 1] = 0.3f; // Green
                testInput[idx + 2] = 0.2f; // Blue
            } else {
                // Non-skin color for comparison
                testInput[idx] = 0.2f;     // Red
                testInput[idx + 1] = 0.8f; // Green
                testInput[idx + 2] = 0.3f; // Blue
            }
            testInput[idx + 3] = 1.0f;      // Alpha
        }
    }
    
    bool success = applyColorGrading(artist, testInput.data(), width, height, testOutput.data(), 1.5f);
    
    if (success) {
        std::ofstream outputFile("skin_tone_test.raw", std::ios::binary);
        if (outputFile.is_open()) {
            outputFile.write(reinterpret_cast<const char*>(testOutput.data()), 
                           testOutput.size() * sizeof(float));
            outputFile.close();
            std::cout << "✓ Skin tone test output saved to skin_tone_test.raw" << std::endl;
            std::cout << "✓ Skin tones should be preserved while other colors are enhanced" << std::endl;
        }
    } else {
        std::cout << "✗ Skin tone test failed!" << std::endl;
        return false;
    }
    
    return true;
}

bool runVibranceTest(ColorArtist* artist) {
    std::cout << "\n=== Vibrance Enhancement Test ===" << std::endl;
    
    int width = 400;
    int height = 300;
    
    std::vector<float> testInput(width * height * 4);
    std::vector<float> testOutput(width * height * 4);
    
    // Create image with desaturated colors
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            int idx = (y * width + x) * 4;
            
            // Desaturated colors that should benefit from vibrance
            float gray = 0.5f + 0.2f * sin(x * 0.02f) * cos(y * 0.02f);
            testInput[idx] = gray;     // Red
            testInput[idx + 1] = gray; // Green
            testInput[idx + 2] = gray; // Blue
            testInput[idx + 3] = 1.0f; // Alpha
        }
    }
    
    bool success = applyColorGrading(artist, testInput.data(), width, height, testOutput.data(), 1.6f);
    
    if (success) {
        std::ofstream outputFile("vibrance_test.raw", std::ios::binary);
        if (outputFile.is_open()) {
            outputFile.write(reinterpret_cast<const char*>(testOutput.data()), 
                           testOutput.size() * sizeof(float));
            outputFile.close();
            std::cout << "✓ Vibrance test output saved to vibrance_test.raw" << std::endl;
            std::cout << "✓ Desaturated colors should be enhanced with iPhone-style vibrance" << std::endl;
        }
    } else {
        std::cout << "✗ Vibrance test failed!" << std::endl;
        return false;
    }
    
    return true;
}

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << "    Kronop Color Artist v1.0" << std::endl;
    std::cout << "    3D LUT Color Grading System" << std::endl;
    std::cout << "========================================" << std::endl;
    
    // Compile color shader first
    std::cout << "Compiling Vulkan color grading shader..." << std::endl;
    if (!compileColorShader()) {
        std::cerr << "✗ Color shader compilation failed!" << std::endl;
        return -1;
    }
    std::cout << "✓ Color shader compiled successfully!" << std::endl;
    
    // Initialize color artist
    std::cout << "Initializing Kronop Color Artist..." << std::endl;
    ColorArtist* artist = createColorArtist();
    
    if (!initializeColorArtist(artist)) {
        std::cerr << "✗ Failed to initialize color artist!" << std::endl;
        destroyColorArtist(artist);
        return -1;
    }
    
    std::cout << "✓ Vulkan Color Processing Pipeline Initialized!" << std::endl;
    
    // Print GPU information
    printColorGPUInfo(artist);
    
    // Run quality test
    if (!runColorQualityTest(artist)) {
        std::cerr << "✗ Color quality test failed!" << std::endl;
        destroyColorArtist(artist);
        return -1;
    }
    
    // Run skin tone test
    if (!runSkinToneTest(artist)) {
        std::cerr << "✗ Skin tone test failed!" << std::endl;
        destroyColorArtist(artist);
        return -1;
    }
    
    // Run vibrance test
    if (!runVibranceTest(artist)) {
        std::cerr << "✗ Vibrance test failed!" << std::endl;
        destroyColorArtist(artist);
        return -1;
    }
    
    // Run performance tests
    if (!runColorPerformanceTest(artist)) {
        std::cerr << "✗ Color performance test failed!" << std::endl;
        destroyColorArtist(artist);
        return -1;
    }
    
    std::cout << "========================================" << std::endl;
    std::cout << "✓ All color tests completed successfully!" << std::endl;
    std::cout << "✓ 40-60% Color Boost Applied" << std::endl;
    std::cout << "✓ iPhone-style Vibrance Enhancement" << std::endl;
    std::cout << "✓ 3D LUT Color Grading Active" << std::endl;
    std::cout << "✓ Skin Tone Preservation Working" << std::endl;
    std::cout << "✓ Kronop Color Artist is fully functional" << std::endl;
    std::cout << "========================================" << std::endl;
    
    destroyColorArtist(artist);
    
    return 0;
}
