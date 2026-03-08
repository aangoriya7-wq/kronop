#include "Upscale_Core.cpp"
#include <iostream>
#include <fstream>
#include <vector>
#include <chrono>

void printGPUInfo(UpscaleCore* upscaler) {
    std::cout << "\n=== GPU Information ===" << std::endl;
    std::cout << getGPUInfo(upscaler) << std::endl;
}

bool runPerformanceTest(UpscaleCore* upscaler) {
    std::cout << "\n=== Performance Test ===" << std::endl;
    
    // Test different resolutions
    std::vector<std::pair<int, int>> resolutions = {
        {640, 480},   // SD
        {1280, 720},  // HD
        {1920, 1080}  // Full HD
    };
    
    for (const auto& res : resolutions) {
        int width = res.first;
        int height = res.second;
        
        std::cout << "Testing " << width << "x" << height << "..." << std::endl;
        
        std::vector<float> testInput(width * height * 4);
        std::vector<float> testOutput(width * height * 4 * 4); // 2x scale = 4x pixels
        
        // Generate test pattern
        for (int y = 0; y < height; ++y) {
            for (int x = 0; x < width; ++x) {
                int idx = (y * width + x) * 4;
                testInput[idx] = (float)x / width;     // Red gradient
                testInput[idx + 1] = (float)y / height; // Green gradient
                testInput[idx + 2] = 0.5f;              // Blue constant
                testInput[idx + 3] = 1.0f;              // Alpha full
            }
        }
        
        // Measure GPU performance
        auto start = std::chrono::high_resolution_clock::now();
        
        bool success = processFrame(upscaler, testInput.data(), width, height, testOutput.data());
        
        auto end = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
        
        if (success) {
            std::cout << "✓ GPU: " << duration.count() << "ms" << std::endl;
            
            // Measure CPU performance for comparison
            start = std::chrono::high_resolution_clock::now();
            
            success = processFrameCPU(upscaler, testInput.data(), width, height, testOutput.data());
            
            end = std::chrono::high_resolution_clock::now();
            duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
            
            if (success) {
                std::cout << "✓ CPU: " << duration.count() << "ms" << std::endl;
            }
        } else {
            std::cout << "✗ Failed!" << std::endl;
            return false;
        }
        
        std::cout << std::endl;
    }
    
    return true;
}

bool runQualityTest(UpscaleCore* upscaler) {
    std::cout << "\n=== Quality Test ===" << std::endl;
    
    int width = 320;
    int height = 240;
    
    std::vector<float> testInput(width * height * 4);
    std::vector<float> testOutput(width * height * 4 * 4);
    
    // Create a test pattern with sharp edges
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            int idx = (y * width + x) * 4;
            
            // Checkerboard pattern
            if ((x / 20 + y / 20) % 2 == 0) {
                testInput[idx] = 1.0f;     // White
                testInput[idx + 1] = 1.0f;
                testInput[idx + 2] = 1.0f;
            } else {
                testInput[idx] = 0.0f;     // Black
                testInput[idx + 1] = 0.0f;
                testInput[idx + 2] = 0.0f;
            }
            testInput[idx + 3] = 1.0f;      // Alpha full
        }
    }
    
    bool success = processFrame(upscaler, testInput.data(), width, height, testOutput.data());
    
    if (success) {
        // Save output for visual inspection
        std::ofstream outputFile("quality_test_output.raw", std::ios::binary);
        if (outputFile.is_open()) {
            outputFile.write(reinterpret_cast<const char*>(testOutput.data()), 
                           testOutput.size() * sizeof(float));
            outputFile.close();
            std::cout << "✓ Quality test output saved to quality_test_output.raw" << std::endl;
            std::cout << "✓ Input: " << width << "x" << height << std::endl;
            std::cout << "✓ Output: " << width * 2 << "x" << height * 2 << std::endl;
        } else {
            std::cout << "✗ Failed to save output file" << std::endl;
            return false;
        }
    } else {
        std::cout << "✗ Quality test failed!" << std::endl;
        return false;
    }
    
    return true;
}

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << "    Kronop AI Video Upscaler v2.0" << std::endl;
    std::cout << "========================================" << std::endl;
    
    // Compile shader first
    std::cout << "Compiling Vulkan compute shader..." << std::endl;
    if (!compileShader()) {
        std::cerr << "✗ Shader compilation failed!" << std::endl;
        return -1;
    }
    std::cout << "✓ Shader compiled successfully!" << std::endl;
    
    // Initialize upscaler
    std::cout << "Initializing Kronop AI Upscaler..." << std::endl;
    UpscaleCore* upscaler = createUpscaler();
    
    if (!initializeUpscaler(upscaler)) {
        std::cerr << "✗ Failed to initialize upscaler!" << std::endl;
        destroyUpscaler(upscaler);
        return -1;
    }
    
    std::cout << "✓ Vulkan GPU Acceleration Initialized!" << std::endl;
    
    // Print GPU information
    printGPUInfo(upscaler);
    
    // Run quality test
    if (!runQualityTest(upscaler)) {
        std::cerr << "✗ Quality test failed!" << std::endl;
        destroyUpscaler(upscaler);
        return -1;
    }
    
    // Run performance tests
    if (!runPerformanceTest(upscaler)) {
        std::cerr << "✗ Performance test failed!" << std::endl;
        destroyUpscaler(upscaler);
        return -1;
    }
    
    std::cout << "========================================" << std::endl;
    std::cout << "✓ All tests completed successfully!" << std::endl;
    std::cout << "✓ Kronop AI Upscaler is fully functional" << std::endl;
    std::cout << "========================================" << std::endl;
    
    destroyUpscaler(upscaler);
    
    return 0;
}
