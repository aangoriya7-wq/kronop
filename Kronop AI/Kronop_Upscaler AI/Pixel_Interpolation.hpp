#pragma once
#include <vector>
#include <cmath>
#include <algorithm>
#include "Weights_Manager.hpp"

class PixelInterpolator {
private:
    const int SCALE_FACTOR = 2;
    const int PATCH_SIZE = 64;
    const float LEARNING_RATE = 0.001f;
    
    struct NeuralLayer {
        std::vector<float> weights;
        std::vector<float> biases;
        int inputSize;
        int outputSize;
    };
    
    std::vector<NeuralLayer> network;
    WeightsManager weightsManager;
    
public:
    PixelInterpolator() {
        loadRealWeights();
    }
    
    void loadRealWeights() {
        network.clear();
        
        // Load real pre-trained weights from WeightsManager
        auto allWeights = weightsManager.getAllWeights();
        auto allBiases = weightsManager.getAllBiases();
        
        // Layer 1: 16 -> 32 (weights: 0-511, biases: 0-31)
        NeuralLayer layer1;
        layer1.inputSize = 16;
        layer1.outputSize = 32;
        layer1.weights.assign(allWeights.begin(), allWeights.begin() + 512);
        layer1.biases.assign(allBiases.begin(), allBiases.begin() + 32);
        network.push_back(layer1);
        
        // Layer 2: 32 -> 16 (weights: 512-1023, biases: 32-47)
        NeuralLayer layer2;
        layer2.inputSize = 32;
        layer2.outputSize = 16;
        layer2.weights.assign(allWeights.begin() + 512, allWeights.begin() + 1024);
        layer2.biases.assign(allBiases.begin() + 32, allBiases.begin() + 48);
        network.push_back(layer2);
        
        // Output Layer: 16 -> 4 (weights: 1024-1087, biases: 48-51)
        NeuralLayer outputLayer;
        outputLayer.inputSize = 16;
        outputLayer.outputSize = 4;
        outputLayer.weights.assign(allWeights.begin() + 1024, allWeights.begin() + 1088);
        outputLayer.biases.assign(allBiases.begin() + 48, allBiases.begin() + 52);
        network.push_back(outputLayer);
        
        std::cout << "✓ Real pre-trained weights loaded into PixelInterpolator" << std::endl;
        std::cout << "  - Layer 1: 16->32 (512 weights, 32 biases)" << std::endl;
        std::cout << "  - Layer 2: 32->16 (512 weights, 16 biases)" << std::endl;
        std::cout << "  - Output: 16->4 (64 weights, 4 biases)" << std::endl;
    }
    
    std::vector<float> forwardPass(const std::vector<float>& input) {
        std::vector<float> current = input;
        
        for (size_t l = 0; l < network.size(); ++l) {
            const auto& layer = network[l];
            std::vector<float> next(layer.outputSize, 0.0f);
            
            for (int i = 0; i < layer.outputSize; ++i) {
                float sum = layer.biases[i];
                for (int j = 0; j < layer.inputSize; ++j) {
                    sum += current[j] * layer.weights[j * layer.outputSize + i];
                }
                next[i] = relu(sum);
            }
            
            current = next;
        }
        
        return current;
    }
    
    float relu(float x) {
        return std::max(0.0f, x);
    }
    
    std::vector<float> extractPatch(const std::vector<float>& image, int width, int height, 
                                   int centerX, int centerY) {
        std::vector<float> patch(16, 0.0f);
        
        int indices[4] = {-1, 0, 1, 2};
        int idx = 0;
        
        for (int dy : indices) {
            for (int dx : indices) {
                int x = centerX + dx;
                int y = centerY + dy;
                
                x = std::max(0, std::min(width - 1, x));
                y = std::max(0, std::min(height - 1, y));
                
                patch[idx] = image[(y * width + x) * 4];
                idx++;
            }
        }
        
        return patch;
    }
    
    void setPixel(std::vector<float>& image, int width, int height, 
                 int x, int y, const std::vector<float>& pixel) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
            for (int c = 0; c < 4; ++c) {
                image[(y * width + x) * 4 + c] = pixel[c];
            }
        }
    }
    
    std::vector<float> enhanceWithAI(const std::vector<float>& input, int width, int height) {
        std::vector<float> output = input;
        
        for (int y = 1; y < height - 1; y += 2) {
            for (int x = 1; x < width - 1; x += 2) {
                auto patch = extractPatch(input, width, height, x, y);
                auto enhanced = forwardPass(patch);
                
                for (int dy = 0; dy < 2; ++dy) {
                    for (int dx = 0; dx < 2; ++dx) {
                        int targetX = x + dx;
                        int targetY = y + dy;
                        
                        if (targetX < width && targetY < height) {
                            for (int c = 0; c < 4; ++c) {
                                float original = output[(targetY * width + targetX) * 4 + c];
                                float ai = enhanced[c];
                                output[(targetY * width + targetX) * 4 + c] = 
                                    0.7f * original + 0.3f * ai;
                            }
                        }
                    }
                }
            }
        }
        
        applyAntiAliasing(output, width, height);
        
        return output;
    }
    
    void applyAntiAliasing(std::vector<float>& image, int width, int height) {
        std::vector<float> temp = image;
        
        for (int y = 1; y < height - 1; ++y) {
            for (int x = 1; x < width - 1; ++x) {
                for (int c = 0; c < 4; ++c) {
                    float sum = 0.0f;
                    float weights[9] = {
                        1.0f, 2.0f, 1.0f,
                        2.0f, 4.0f, 2.0f,
                        1.0f, 2.0f, 1.0f
                    };
                    float totalWeight = 16.0f;
                    
                    for (int dy = -1; dy <= 1; ++dy) {
                        for (int dx = -1; dx <= 1; ++dx) {
                            int idx = (dy + 1) * 3 + (dx + 1);
                            int nx = x + dx;
                            int ny = y + dy;
                            
                            sum += temp[(ny * width + nx) * 4 + c] * weights[idx];
                        }
                    }
                    
                    image[(y * width + x) * 4 + c] = sum / totalWeight;
                }
            }
        }
    }
    
    std::vector<float> fillMissingPixels(const std::vector<float>& input, int width, int height) {
        std::vector<float> output = input;
        
        for (int y = 0; y < height; ++y) {
            for (int x = 0; x < width; ++x) {
                bool isMissing = true;
                
                for (int c = 0; c < 3; ++c) {
                    if (input[(y * width + x) * 4 + c] > 0.0f) {
                        isMissing = false;
                        break;
                    }
                }
                
                if (isMissing) {
                    auto interpolated = intelligentInterpolation(input, width, height, x, y);
                    setPixel(output, width, height, x, y, interpolated);
                }
            }
        }
        
        return output;
    }
    
    std::vector<float> intelligentInterpolation(const std::vector<float>& image, int width, int height,
                                               int targetX, int targetY) {
        std::vector<float> accumulated(4, 0.0f);
        float totalWeight = 0.0f;
        
        const int searchRadius = 5;
        
        for (int y = std::max(0, targetY - searchRadius); 
             y <= std::min(height - 1, targetY + searchRadius); ++y) {
            for (int x = std::max(0, targetX - searchRadius); 
                 x <= std::min(width - 1, targetX + searchRadius); ++x) {
                
                bool isValid = false;
                for (int c = 0; c < 3; ++c) {
                    if (image[(y * width + x) * 4 + c] > 0.0f) {
                        isValid = true;
                        break;
                    }
                }
                
                if (isValid) {
                    float distance = std::sqrt((x - targetX) * (x - targetX) + 
                                             (y - targetY) * (y - targetY));
                    float weight = 1.0f / (1.0f + distance);
                    
                    for (int c = 0; c < 4; ++c) {
                        accumulated[c] += image[(y * width + x) * 4 + c] * weight;
                    }
                    totalWeight += weight;
                }
            }
        }
        
        if (totalWeight > 0.0f) {
            for (int c = 0; c < 4; ++c) {
                accumulated[c] /= totalWeight;
            }
        }
        
        return accumulated;
    }
};
