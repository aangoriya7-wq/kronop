#pragma once
#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"

#include <vector>
#include <string>
#include <iostream>
#include <stdexcept>
#include <algorithm>
#include <cctype>

class ImageIO {
private:
    struct ImageData {
        int width;
        int height;
        int channels;
        std::vector<float> floatData;  // RGBA float data [0.0-1.0]
        std::vector<unsigned char> byteData;  // RGBA byte data [0-255]
    };
    
public:
    // Load image from file (supports JPG, PNG, BMP, TGA, etc.)
    ImageData loadImage(const std::string& filename) {
        ImageData img;
        
        // Load using stb_image
        int w, h, c;
        unsigned char* data = stbi_load(filename.c_str(), &w, &h, &c, 4); // Force RGBA
        
        if (!data) {
            throw std::runtime_error("Failed to load image: " + filename + " - " + stbi_failure_reason());
        }
        
        img.width = w;
        img.height = h;
        img.channels = 4; // Always RGBA
        
        // Convert to float format [0.0-1.0]
        img.floatData.resize(w * h * 4);
        img.byteData.resize(w * h * 4);
        
        for (int i = 0; i < w * h * 4; ++i) {
            img.byteData[i] = data[i];
            img.floatData[i] = static_cast<float>(data[i]) / 255.0f;
        }
        
        stbi_image_free(data);
        
        std::cout << "✓ Loaded image: " << filename << " (" << w << "x" << h << ", " << c << " channels)" << std::endl;
        return img;
    }
    
    // Save image to file
    bool saveImage(const std::string& filename, const std::vector<float>& floatData, int width, int height) {
        if (floatData.size() != width * height * 4) {
            std::cerr << "Error: Invalid data size for image dimensions!" << std::endl;
            return false;
        }
        
        // Convert float to byte
        std::vector<unsigned char> byteData(width * height * 4);
        for (size_t i = 0; i < floatData.size(); ++i) {
            float value = floatData[i];
            value = std::max(0.0f, std::min(1.0f, value)); // Clamp to [0,1]
            byteData[i] = static_cast<unsigned char>(value * 255.0f);
        }
        
        // Determine format from extension
        std::string ext = filename.substr(filename.find_last_of('.') + 1);
        std::transform(ext.begin(), ext.end(), ext.begin(), ::tolower);
        
        int success = 0;
        if (ext == "png") {
            success = stbi_write_png(filename.c_str(), width, height, 4, byteData.data(), width * 4);
        } else if (ext == "jpg" || ext == "jpeg") {
            success = stbi_write_jpg(filename.c_str(), width, height, 4, byteData.data(), 90); // 90% quality
        } else if (ext == "bmp") {
            success = stbi_write_bmp(filename.c_str(), width, height, 4, byteData.data());
        } else if (ext == "tga") {
            success = stbi_write_tga(filename.c_str(), width, height, 4, byteData.data());
        } else {
            std::cerr << "Error: Unsupported image format: " << ext << std::endl;
            return false;
        }
        
        if (success) {
            std::cout << "✓ Saved image: " << filename << " (" << width << "x" << height << ")" << std::endl;
            return true;
        } else {
            std::cerr << "Error: Failed to save image: " << filename << std::endl;
            return false;
        }
    }
    
    // Convert raw float data to image format
    std::vector<float> rawToImage(const std::vector<float>& rawData, int width, int height) {
        std::vector<float> imageData(width * height * 4);
        
        for (int y = 0; y < height; ++y) {
            for (int x = 0; x < width; ++x) {
                int srcIndex = (y * width + x) * 3; // RGB input
                int dstIndex = (y * width + x) * 4; // RGBA output
                
                // Copy RGB channels
                if (srcIndex + 2 < rawData.size()) {
                    imageData[dstIndex + 0] = rawData[srcIndex + 0]; // R
                    imageData[dstIndex + 1] = rawData[srcIndex + 1]; // G
                    imageData[dstIndex + 2] = rawData[srcIndex + 2]; // B
                }
                imageData[dstIndex + 3] = 1.0f; // Alpha = 1.0
            }
        }
        
        return imageData;
    }
    
    // Convert image data to raw float format
    std::vector<float> imageToRaw(const std::vector<float>& imageData, int width, int height) {
        std::vector<float> rawData(width * height * 3);
        
        for (int y = 0; y < height; ++y) {
            for (int x = 0; x < width; ++x) {
                int srcIndex = (y * width + x) * 4; // RGBA input
                int dstIndex = (y * width + x) * 3; // RGB output
                
                // Copy RGB channels
                if (srcIndex + 3 < imageData.size()) {
                    rawData[dstIndex + 0] = imageData[srcIndex + 0]; // R
                    rawData[dstIndex + 1] = imageData[srcIndex + 1]; // G
                    rawData[dstIndex + 2] = imageData[srcIndex + 2]; // B
                }
            }
        }
        
        return rawData;
    }
    
    // Get image info without loading
    bool getImageInfo(const std::string& filename, int& width, int& height, int& channels) {
        int w, h, c;
        int result = stbi_info(filename.c_str(), &w, &h, &c);
        
        if (result) {
            width = w;
            height = h;
            channels = c;
            return true;
        }
        
        return false;
    }
    
    // Validate image file
    bool isValidImage(const std::string& filename) {
        int w, h, c;
        unsigned char* data = stbi_load(filename.c_str(), &w, &h, &c, 4);
        
        if (data) {
            stbi_image_free(data);
            return true;
        }
        
        return false;
    }
    
    // Create test image (checkerboard pattern)
    std::vector<float> createTestImage(int width, int height, int checkerSize = 8) {
        std::vector<float> imageData(width * height * 4);
        
        for (int y = 0; y < height; ++y) {
            for (int x = 0; x < width; ++x) {
                int index = (y * width + x) * 4;
                bool checker = ((x / checkerSize) + (y / checkerSize)) % 2 == 0;
                
                float color = checker ? 0.8f : 0.2f;
                imageData[index + 0] = color;     // R
                imageData[index + 1] = color * 0.8f; // G
                imageData[index + 2] = color * 0.6f; // B
                imageData[index + 3] = 1.0f;     // A
            }
        }
        
        return imageData;
    }
    
    // Create gradient test image
    std::vector<float> createGradientImage(int width, int height) {
        std::vector<float> imageData(width * height * 4);
        
        for (int y = 0; y < height; ++y) {
            for (int x = 0; x < width; ++x) {
                int index = (y * width + x) * 4;
                
                imageData[index + 0] = static_cast<float>(x) / width;      // R gradient
                imageData[index + 1] = static_cast<float>(y) / height;     // G gradient
                imageData[index + 2] = 0.5f;                               // B constant
                imageData[index + 3] = 1.0f;                               // A
            }
        }
        
        return imageData;
    }
    
    // Print image statistics
    void printImageStats(const std::vector<float>& imageData, int width, int height) {
        if (imageData.empty()) {
            std::cout << "Image data is empty!" << std::endl;
            return;
        }
        
        float minR = 1.0f, maxR = 0.0f, minG = 1.0f, maxG = 0.0f, minB = 1.0f, maxB = 0.0f;
        float avgR = 0.0f, avgG = 0.0f, avgB = 0.0f;
        
        int pixelCount = width * height;
        
        for (int i = 0; i < pixelCount; ++i) {
            int index = i * 4;
            float r = imageData[index + 0];
            float g = imageData[index + 1];
            float b = imageData[index + 2];
            
            minR = std::min(minR, r);
            maxR = std::max(maxR, r);
            minG = std::min(minG, g);
            maxG = std::max(maxG, g);
            minB = std::min(minB, b);
            maxB = std::max(maxB, b);
            
            avgR += r;
            avgG += g;
            avgB += b;
        }
        
        avgR /= pixelCount;
        avgG /= pixelCount;
        avgB /= pixelCount;
        
        std::cout << "Image Statistics (" << width << "x" << height << "):" << std::endl;
        std::cout << "  Red:   Min=" << minR << ", Max=" << maxR << ", Avg=" << avgR << std::endl;
        std::cout << "  Green: Min=" << minG << ", Max=" << maxG << ", Avg=" << avgG << std::endl;
        std::cout << "  Blue:  Min=" << minB << ", Max=" << maxB << ", Avg=" << avgB << std::endl;
    }
};
