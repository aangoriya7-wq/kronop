/**
 * SmartSharpening.cpp
 * Implementation of Advanced HD Quality Enhancement
 * Professional-grade sharpening with adaptive algorithms
 */

#include "SmartSharpening.hpp"
#include <algorithm>
#include <cstring>
#include <random>
#include <numeric>

namespace kronop {

// SmartSharpeningEngine Implementation
SmartSharpeningEngine::SmartSharpeningEngine(int width, int height)
    : width_(width), height_(height), gpuEnabled_(false),
      lastProcessingTime_(0.0), memoryUsage_(0) {
    allocateBuffers();
}

SmartSharpeningEngine::~SmartSharpeningEngine() {
    releaseBuffers();
}

bool SmartSharpeningEngine::processImage(const std::vector<double>& input,
                                      std::vector<double>& output,
                                      const SharpeningConfig& config) {
    auto startTime = std::chrono::high_resolution_clock::now();
    
    if (input.size() != width_ * height_) {
        return false;
    }
    
    config_ = config;
    output.resize(input.size());
    
    // Analyze image details
    analyzeDetails(input, analysisBuffer_);
    
    // Apply adaptive sharpening
    adaptiveSharpening(input, analysisBuffer_, output, config);
    
    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);
    lastProcessingTime_ = duration.count();
    
    return true;
}

void SmartSharpeningEngine::analyzeDetails(const std::vector<double>& image,
                                        std::vector<DetailAnalysis>& analysis) {
    analysis.resize(width_ * height_);
    
    // Compute gradients for edge detection
    std::vector<double> gradX(width_ * height_);
    std::vector<double> gradY(width_ * height_);
    
    for (int y = 1; y < height_ - 1; ++y) {
        for (int x = 1; x < width_ - 1; ++x) {
            int idx = y * width_ + x;
            
            // Sobel gradients
            gradX[idx] = (-image[(y-1) * width_ + (x-1)] + image[(y-1) * width_ + (x+1)] +
                           -2.0 * image[y * width_ + (x-1)] + 2.0 * image[y * width_ + (x+1)] +
                           -image[(y+1) * width_ + (x-1)] + image[(y+1) * width_ + (x+1)]) * 0.25;
            
            gradY[idx] = (-image[(y-1) * width_ + (x-1)] - 2.0 * image[(y-1) * width_ + x] - image[(y-1) * width_ + (x+1)] +
                            image[(y+1) * width_ + (x-1)] + 2.0 * image[(y+1) * width_ + x] + image[(y+1) * width_ + (x+1)]) * 0.25;
        }
    }
    
    // Analyze local regions
    const int analysisRadius = 5;
    
    for (int y = 0; y < height_; ++y) {
        for (int x = 0; x < width_; ++x) {
            int idx = y * width_ + x;
            DetailAnalysis& detail = analysis[idx];
            
            // Edge strength
            detail.edgeStrength = std::sqrt(gradX[idx] * gradX[idx] + gradY[idx] * gradY[idx]);
            
            // Local contrast
            detail.localContrast = computeLocalContrast(image, x, y, analysisRadius);
            
            // Texture level
            detail.textureLevel = computeTextureLevel(image, x, y, analysisRadius);
            
            // Noise estimation
            noiseEstimation(image, detail.noiseLevel);
            
            // Classification
            detail.isEdge = detail.edgeStrength > 0.1;
            detail.isTexture = detail.textureLevel > 0.05;
            detail.isFlat = detail.edgeStrength < 0.02 && detail.textureLevel < 0.01;
        }
    }
}

void SmartSharpeningEngine::adaptiveSharpening(const std::vector<double>& input,
                                             const std::vector<DetailAnalysis>& analysis,
                                             std::vector<double>& output,
                                             const SharpeningConfig& config) {
    // Create blurred version for unsharp masking
    gaussianBlur(input, blurBuffer_, config.radius);
    
    for (int y = 0; y < height_; ++y) {
        for (int x = 0; x < width_; ++x) {
            int idx = y * width_ + x;
            const DetailAnalysis& detail = analysis[idx];
            
            double center = input[idx];
            double blurred = blurBuffer_[idx];
            double detailSignal = center - blurred;
            
            // Adaptive strength based on image content
            double adaptiveStrength = config.strength;
            
            if (config.adaptive) {
                if (detail.isEdge) {
                    // Strong sharpening for edges
                    adaptiveStrength *= 1.5;
                } else if (detail.isTexture) {
                    // Moderate sharpening for textures
                    adaptiveStrength *= 1.2;
                } else if (detail.isFlat) {
                    // Minimal sharpening for flat areas
                    adaptiveStrength *= 0.3;
                }
                
                // Adjust based on local contrast
                adaptiveStrength *= (1.0 + detail.localContrast * config.detailBoost);
                
                // Reduce in noisy areas
                if (detail.noiseLevel > 0.1) {
                    adaptiveStrength *= (1.0 - detail.noiseLevel * 0.5);
                }
            }
            
            // Apply threshold to avoid noise amplification
            if (std::abs(detailSignal) > config.threshold) {
                output[idx] = center + detailSignal * adaptiveStrength;
            } else {
                output[idx] = center;
            }
            
            // Clamp to valid range
            output[idx] = std::clamp(output[idx], 0.0, 1.0);
        }
    }
    
    // Apply halo reduction if enabled
    if (config.haloReduction > 0.0) {
        haloReduction(output, input, tempBuffer_, config.haloReduction);
        output = tempBuffer_;
    }
}

void SmartSharpeningEngine::gaussianBlur(const std::vector<double>& input,
                                       std::vector<double>& output,
                                       double radius) {
    const int kernelSize = static_cast<int>(radius * 3) * 2 + 1;
    const int kernelRadius = kernelSize / 2;
    
    std::vector<double> kernel(kernelSize);
    double sum = 0.0;
    
    // Generate Gaussian kernel
    for (int i = 0; i < kernelSize; ++i) {
        double x = i - kernelRadius;
        kernel[i] = std::exp(-(x * x) / (2 * radius * radius));
        sum += kernel[i];
    }
    
    // Normalize kernel
    for (double& k : kernel) {
        k /= sum;
    }
    
    // Horizontal blur
    std::vector<double> temp(width_ * height_);
    for (int y = 0; y < height_; ++y) {
        for (int x = 0; x < width_; ++x) {
            double value = 0.0;
            for (int k = -kernelRadius; k <= kernelRadius; ++k) {
                int sampleX = std::clamp(x + k, 0, width_ - 1);
                value += input[y * width_ + sampleX] * kernel[k + kernelRadius];
            }
            temp[y * width_ + x] = value;
        }
    }
    
    // Vertical blur
    for (int y = 0; y < height_; ++y) {
        for (int x = 0; x < width_; ++x) {
            double value = 0.0;
            for (int k = -kernelRadius; k <= kernelRadius; ++k) {
                int sampleY = std::clamp(y + k, 0, height_ - 1);
                value += temp[sampleY * width_ + x] * kernel[k + kernelRadius];
            }
            output[y * width_ + x] = value;
        }
    }
}

void SmartSharpeningEngine::multiScaleSharpening(const std::vector<double>& input,
                                               std::vector<double>& output,
                                               const SharpeningConfig& config) {
    std::vector<double> multiScaleResult(width_ * height_, 0.0);
    std::vector<double> weights(width_ * height_, 0.0);
    
    // Process at multiple scales
    std::vector<double> scales = {0.5, 1.0, 2.0, 4.0};
    std::vector<double> scaleWeights = {0.2, 0.4, 0.3, 0.1};
    
    for (size_t s = 0; s < scales.size(); ++s) {
        double scale = scales[s];
        double weight = scaleWeights[s];
        
        // Create scaled version
        int scaledWidth = static_cast<int>(width_ / scale);
        int scaledHeight = static_cast<int>(height_ / scale);
        
        std::vector<double> scaledInput(scaledWidth * scaledHeight);
        std::vector<double> scaledOutput(scaledWidth * scaledHeight);
        
        // Downsample
        for (int y = 0; y < scaledHeight; ++y) {
            for (int x = 0; x < scaledWidth; ++x) {
                int srcX = static_cast<int>(x * scale);
                int srcY = static_cast<int>(y * scale);
                scaledInput[y * scaledWidth + x] = input[srcY * width_ + srcX];
            }
        }
        
        // Apply sharpening at this scale
        SharpeningConfig scaleConfig = config;
        scaleConfig.radius *= scale;
        
        // Create temporary sharpener for this scale
        SmartSharpeningEngine scaleSharpener(scaledWidth, scaledHeight);
        scaleSharpener.processImage(scaledInput, scaledOutput, scaleConfig);
        
        // Upsample and accumulate
        for (int y = 0; y < scaledHeight; ++y) {
            for (int x = 0; x < scaledWidth; ++x) {
                int srcX = static_cast<int>(x * scale);
                int srcY = static_cast<int>(y * scale);
                
                if (srcX < width_ && srcY < height_) {
                    int idx = srcY * width_ + srcX;
                    multiScaleResult[idx] += scaledOutput[y * scaledWidth + x] * weight;
                    weights[idx] += weight;
                }
            }
        }
    }
    
    // Normalize and output
    for (int i = 0; i < width_ * height_; ++i) {
        if (weights[i] > 0) {
            output[i] = multiScaleResult[i] / weights[i];
        } else {
            output[i] = input[i];
        }
        output[i] = std::clamp(output[i], 0.0, 1.0);
    }
}

void SmartSharpeningEngine::haloReduction(const std::vector<double>& input,
                                       const std::vector<double>& original,
                                       std::vector<double>& output,
                                       double factor) {
    const int haloRadius = 3;
    
    for (int y = haloRadius; y < height_ - haloRadius; ++y) {
        for (int x = haloRadius; x < width_ - haloRadius; ++x) {
            int idx = y * width_ + x;
            
            // Check for halo artifacts
            double localMax = 0.0;
            double localMin = 1.0;
            
            for (int dy = -haloRadius; dy <= haloRadius; ++dy) {
                for (int dx = -haloRadius; dx <= haloRadius; ++dx) {
                    int neighborIdx = (y + dy) * width_ + (x + dx);
                    localMax = std::max(localMax, original[neighborIdx]);
                    localMin = std::min(localMin, original[neighborIdx]);
                }
            }
            
            double localRange = localMax - localMin;
            double centerValue = original[idx];
            double enhancedValue = input[idx];
            
            // Detect halo: enhancement that exceeds local range significantly
            if (enhancedValue > localMax + localRange * 0.2) {
                // Reduce halo
                output[idx] = centerValue + (enhancedValue - centerValue) * factor;
            } else if (enhancedValue < localMin - localRange * 0.2) {
                // Reduce dark halo
                output[idx] = centerValue + (enhancedValue - centerValue) * factor;
            } else {
                // No halo detected
                output[idx] = enhancedValue;
            }
        }
    }
    
    // Handle borders
    for (int y = 0; y < height_; ++y) {
        for (int x = 0; x < width_; ++x) {
            int idx = y * width_ + x;
            if (y < haloRadius || y >= height_ - haloRadius ||
                x < haloRadius || x >= width_ - haloRadius) {
                output[idx] = input[idx]; // No reduction on borders
            }
        }
    }
}

double SmartSharpeningEngine::computeLocalContrast(const std::vector<double>& image,
                                                 int x, int y, int radius) {
    double sum = 0.0;
    double sumSquared = 0.0;
    int count = 0;
    
    for (int dy = -radius; dy <= radius; ++dy) {
        for (int dx = -radius; dx <= radius; ++dx) {
            int nx = x + dx;
            int ny = y + dy;
            
            if (nx >= 0 && nx < width_ && ny >= 0 && ny < height_) {
                double value = image[ny * width_ + nx];
                sum += value;
                sumSquared += value * value;
                count++;
            }
        }
    }
    
    if (count == 0) return 0.0;
    
    double mean = sum / count;
    double variance = (sumSquared / count) - (mean * mean);
    return std::sqrt(std::max(variance, 0.0));
}

double SmartSharpeningEngine::computeTextureLevel(const std::vector<double>& image,
                                             int x, int y, int radius) {
    if (x <= radius || x >= width_ - radius || y <= radius || y >= height_ - radius) {
        return 0.0;
    }
    
    // Compute Laplacian for texture measurement
    double center = image[y * width_ + x];
    double laplacian = 
        -image[(y-1) * width_ + (x-1)] - image[(y-1) * width_ + x] - image[(y-1) * width_ + (x+1)]
        -image[y * width_ + (x-1)] + 8 * center - image[y * width_ + (x+1)]
        -image[(y+1) * width_ + (x-1)] - image[(y+1) * width_ + x] - image[(y+1) * width_ + (x+1)];
    
    return std::abs(laplacian) / 8.0;
}

void SmartSharpeningEngine::noiseEstimation(const std::vector<double>& image,
                                         double& noiseLevel) {
    // Simple noise estimation using flat regions
    double totalVariance = 0.0;
    int sampleCount = 0;
    
    const int sampleSpacing = 20;
    const int windowSize = 5;
    
    for (int y = windowSize; y < height_ - windowSize; y += sampleSpacing) {
        for (int x = windowSize; x < width_ - windowSize; x += sampleSpacing) {
            // Check if this is a flat region
            bool isFlat = true;
            double centerValue = image[y * width_ + x];
            
            for (int dy = -windowSize; dy <= windowSize && isFlat; ++dy) {
                for (int dx = -windowSize; dx <= windowSize; ++dx) {
                    double diff = std::abs(image[(y + dy) * width_ + (x + dx)] - centerValue);
                    if (diff > 0.05) { // Threshold for flatness
                        isFlat = false;
                        break;
                    }
                }
            }
            
            if (isFlat) {
                // Compute local variance
                double localVariance = 0.0;
                int count = 0;
                
                for (int dy = -windowSize; dy <= windowSize; ++dy) {
                    for (int dx = -windowSize; dx <= windowSize; ++dx) {
                        double value = image[(y + dy) * width_ + (x + dx)];
                        localVariance += (value - centerValue) * (value - centerValue);
                        count++;
                    }
                }
                
                if (count > 0) {
                    totalVariance += localVariance / count;
                    sampleCount++;
                }
            }
        }
    }
    
    if (sampleCount > 0) {
        noiseLevel = std::sqrt(totalVariance / sampleCount);
    } else {
        noiseLevel = 0.0;
    }
}

void SmartSharpeningEngine::allocateBuffers() {
    size_t imageSize = width_ * height_;
    tempBuffer_.resize(imageSize);
    blurBuffer_.resize(imageSize);
    edgeBuffer_.resize(imageSize);
    analysisBuffer_.resize(imageSize);
    
    memoryUsage_ = imageSize * sizeof(double) * 4; // 4 buffers
}

void SmartSharpeningEngine::releaseBuffers() {
    tempBuffer_.clear();
    blurBuffer_.clear();
    edgeBuffer_.clear();
    analysisBuffer_.clear();
    memoryUsage_ = 0;
}

// QualityEnhancer Implementation
QualityEnhancer::QualityEnhancer(int width, int height)
    : width_(width), height_(height), realTimeMode_(false) {
    sharpener_ = std::make_unique<SmartSharpeningEngine>(width, height);
    contrastEnhancer_ = std::make_unique<ContrastEnhancer>(width, height);
    
    tempBuffer1_.resize(width * height);
    tempBuffer2_.resize(width * height);
    tempBuffer3_.resize(width * height);
}

QualityEnhancer::~QualityEnhancer() = default;

bool QualityEnhancer::enhanceImage(const std::vector<double>& input,
                                 std::vector<double>& output,
                                 const SharpeningConfig& sharpenConfig,
                                 const ContrastConfig& contrastConfig) {
    if (input.size() != width_ * height_) {
        return false;
    }
    
    output.resize(input.size());
    
    // Step 1: Denoising
    denoiseImage(input, tempBuffer1_, 0.3);
    
    // Step 2: Sharpening
    sharpener_->processImage(tempBuffer1_, tempBuffer2_, sharpenConfig);
    
    // Step 3: Contrast enhancement
    contrastEnhancer_->enhanceContrast(tempBuffer2_, tempBuffer3_, contrastConfig);
    
    // Step 4: Final quality adjustments
    if (realTimeMode_) {
        // Fast path for real-time
        output = tempBuffer3_;
    } else {
        // Professional quality path
        cinematicEnhancement(tempBuffer3_, output);
    }
    
    return true;
}

void QualityEnhancer::cinematicEnhancement(const std::vector<double>& input,
                                       std::vector<double>& output) {
    // Professional-grade enhancement with multiple stages
    
    // Subtle color grading
    for (int i = 0; i < width_ * height_; ++i) {
        double value = input[i];
        
        // Apply subtle S-curve for better contrast
        double enhanced = value;
        if (value < 0.5) {
            enhanced = value * value * 2.0;
        } else {
            enhanced = 1.0 - (1.0 - value) * (1.0 - value) * 2.0;
        }
        
        // Blend with original
        output[i] = value * 0.7 + enhanced * 0.3;
    }
}

void QualityEnhancer::denoiseImage(const std::vector<double>& input,
                                std::vector<double>& output,
                                double strength) {
    // Simple bilateral filter for denoising
    const int radius = 2;
    const double spatialSigma = 1.0;
    const double intensitySigma = 0.1 * strength;
    
    for (int y = 0; y < height_; ++y) {
        for (int x = 0; x < width_; ++x) {
            int idx = y * width_ + x;
            double centerValue = input[idx];
            
            double sum = 0.0;
            double totalWeight = 0.0;
            
            for (int dy = -radius; dy <= radius; ++dy) {
                for (int dx = -radius; dx <= radius; ++dx) {
                    int nx = x + dx;
                    int ny = y + dy;
                    
                    if (nx >= 0 && nx < width_ && ny >= 0 && ny < height_) {
                        double neighborValue = input[ny * width_ + nx];
                        
                        // Spatial weight
                        double spatialDist = std::sqrt(dx * dx + dy * dy);
                        double spatialWeight = std::exp(-(spatialDist * spatialDist) / (2 * spatialSigma * spatialSigma));
                        
                        // Intensity weight
                        double intensityDist = std::abs(neighborValue - centerValue);
                        double intensityWeight = std::exp(-(intensityDist * intensityDist) / (2 * intensitySigma * intensitySigma));
                        
                        double weight = spatialWeight * intensityWeight;
                        sum += neighborValue * weight;
                        totalWeight += weight;
                    }
                }
            }
            
            output[idx] = totalWeight > 0 ? sum / totalWeight : centerValue;
        }
    }
}

} // namespace kronop
