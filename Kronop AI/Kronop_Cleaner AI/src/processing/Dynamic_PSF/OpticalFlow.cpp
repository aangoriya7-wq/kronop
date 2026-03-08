/**
 * OpticalFlow.cpp
 * Implementation of Advanced Optical Flow for Dynamic PSF Estimation
 */

#include "OpticalFlow.hpp"
#include <algorithm>
#include <cstring>
#include <random>
#include <limits>

namespace kronop {

// ImagePyramid Implementation
ImagePyramid::ImagePyramid(int width, int height, int levels)
    : widths_(levels), heights_(levels) {
    levels_.resize(levels);
    
    widths_[0] = width;
    heights_[0] = height;
    
    for (int i = 1; i < levels; ++i) {
        widths_[i] = width >> i;
        heights_[i] = height >> i;
        levels_[i].resize(widths_[i] * heights_[i]);
    }
    
    levels_[0].resize(width * height);
}

ImagePyramid::~ImagePyramid() = default;

void ImagePyramid::build(const std::vector<double>& image) {
    // Copy base level
    std::copy(image.begin(), image.end(), levels_[0].begin());
    
    // Build pyramid levels
    for (int level = 1; level < static_cast<int>(levels_.size()); ++level) {
        int srcWidth = widths_[level - 1];
        int srcHeight = heights_[level - 1];
        int dstWidth = widths_[level];
        int dstHeight = heights_[level];
        
        // Gaussian blur then downsample
        std::vector<double> blurred(srcWidth * srcHeight);
        gaussianBlur(levels_[level - 1], blurred, srcWidth, srcHeight, 1.0);
        downsample(blurred, levels_[level], srcWidth, srcHeight);
    }
}

const std::vector<double>& ImagePyramid::getLevel(int level) const {
    return levels_[level];
}

int ImagePyramid::getWidth(int level) const {
    return widths_[level];
}

int ImagePyramid::getHeight(int level) const {
    return heights_[level];
}

void ImagePyramid::gaussianBlur(const std::vector<double>& input, 
                               std::vector<double>& output, 
                               int width, int height, double sigma) {
    const int kernelSize = static_cast<int>(sigma * 3) * 2 + 1;
    const int radius = kernelSize / 2;
    
    std::vector<double> kernel(kernelSize);
    double sum = 0.0;
    
    // Generate Gaussian kernel
    for (int i = 0; i < kernelSize; ++i) {
        double x = i - radius;
        kernel[i] = std::exp(-(x * x) / (2 * sigma * sigma));
        sum += kernel[i];
    }
    
    // Normalize kernel
    for (double& k : kernel) {
        k /= sum;
    }
    
    // Horizontal blur
    std::vector<double> temp(width * height);
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            double value = 0.0;
            for (int k = -radius; k <= radius; ++k) {
                int sampleX = std::clamp(x + k, 0, width - 1);
                value += input[y * width + sampleX] * kernel[k + radius];
            }
            temp[y * width + x] = value;
        }
    }
    
    // Vertical blur
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            double value = 0.0;
            for (int k = -radius; k <= radius; ++k) {
                int sampleY = std::clamp(y + k, 0, height - 1);
                value += temp[sampleY * width + x] * kernel[k + radius];
            }
            output[y * width + x] = value;
        }
    }
}

void ImagePyramid::downsample(const std::vector<double>& input, 
                            std::vector<double>& output,
                            int srcWidth, int srcHeight) {
    int dstWidth = srcWidth / 2;
    int dstHeight = srcHeight / 2;
    
    for (int y = 0; y < dstHeight; ++y) {
        for (int x = 0; x < dstWidth; ++x) {
            int srcX = x * 2;
            int srcY = y * 2;
            output[y * dstWidth + x] = input[srcY * srcWidth + srcX];
        }
    }
}

// OpticalFlowEngine Implementation
OpticalFlowEngine::OpticalFlowEngine(const OpticalFlowConfig& config)
    : config_(config), initialized_(false), lastProcessingTime_(0.0), memoryUsage_(0) {
}

OpticalFlowEngine::~OpticalFlowEngine() = default;

std::vector<MotionVector> OpticalFlowEngine::computeFlow(
    const std::vector<double>& prevImage,
    const std::vector<double>& currImage,
    int width, int height) {
    
    auto startTime = std::chrono::high_resolution_clock::now();
    
    // Initialize pyramids if needed
    if (!initialized_) {
        prevPyramid_ = std::make_unique<ImagePyramid>(width, height, config_.pyramidLevels);
        currPyramid_ = std::make_unique<ImagePyramid>(width, height, config_.pyramidLevels);
        previousFlow_.resize(width * height);
        initialized_ = true;
    }
    
    // Build image pyramids
    prevPyramid_->build(prevImage);
    currPyramid_->build(currImage);
    
    // Start from coarsest level
    int coarsestLevel = config_.pyramidLevels - 1;
    int coarsestWidth = prevPyramid_->getWidth(coarsestLevel);
    int coarsestHeight = prevPyramid_->getHeight(coarsestLevel);
    
    std::vector<MotionVector> flow(coarsestWidth * coarsestHeight);
    
    // Initialize with zero flow at coarsest level
    for (int i = 0; i < coarsestWidth * coarsestHeight; ++i) {
        flow[i] = MotionVector(0, 0, 0);
    }
    
    // Coarse-to-fine refinement
    for (int level = coarsestLevel; level >= 0; --level) {
        refineFlow(flow, 
                  prevPyramid_->getLevel(level),
                  currPyramid_->getLevel(level),
                  prevPyramid_->getWidth(level),
                  prevPyramid_->getHeight(level),
                  level);
        
        // Upsample flow for next level if not at finest level
        if (level > 0) {
            int currentWidth = prevPyramid_->getWidth(level);
            int currentHeight = prevPyramid_->getHeight(level);
            int nextWidth = prevPyramid_->getWidth(level - 1);
            int nextHeight = prevPyramid_->getHeight(level - 1);
            
            std::vector<MotionVector> upsampledFlow(nextWidth * nextHeight);
            
            for (int y = 0; y < nextHeight; ++y) {
                for (int x = 0; x < nextWidth; ++x) {
                    int srcX = x / 2;
                    int srcY = y / 2;
                    
                    if (srcX < currentWidth && srcY < currentHeight) {
                        upsampledFlow[y * nextWidth + x] = flow[srcY * currentWidth + srcX];
                        // Scale motion vectors for next level
                        upsampledFlow[y * nextWidth + x].dx *= 2.0;
                        upsampledFlow[y * nextWidth + x].dy *= 2.0;
                    } else {
                        upsampledFlow[y * nextWidth + x] = MotionVector(0, 0, 0);
                    }
                }
            }
            
            flow = std::move(upsampledFlow);
        }
    }
    
    // Temporal filtering
    if (config_.useTemporalFilter && !previousFlow_.empty()) {
        temporalFilter(flow);
    }
    
    previousFlow_ = flow;
    
    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);
    lastProcessingTime_ = duration.count();
    
    return flow;
}

void OpticalFlowEngine::refineFlow(
    std::vector<MotionVector>& flow,
    const std::vector<double>& prevImage,
    const std::vector<double>& currImage,
    int width, int height, int level) {
    
    const int windowRadius = static_cast<int>(config_.windowSize) / 2;
    
    for (int y = windowRadius; y < height - windowRadius; ++y) {
        for (int x = windowRadius; x < width - windowRadius; ++x) {
            int idx = y * width + x;
            
            // Skip if confidence is too low
            if (flow[idx].confidence < config_.minConfidence) {
                continue;
            }
            
            // Lucas-Kanade step
            MotionVector refined = lucasKanadeStep(prevImage, currImage, x, y, width, height);
            
            // Combine with previous estimate
            double alpha = 0.5; // Blending factor
            flow[idx].dx = alpha * flow[idx].dx + (1.0 - alpha) * refined.dx;
            flow[idx].dy = alpha * flow[idx].dy + (1.0 - alpha) * refined.dy;
            
            // Update magnitude and confidence
            flow[idx].magnitude = std::sqrt(flow[idx].dx * flow[idx].dx + flow[idx].dy * flow[idx].dy);
            flow[idx].angle = std::atan2(flow[idx].dy, flow[idx].dx) * 180.0 / M_PI;
            if (flow[idx].angle < 0) flow[idx].angle += 360.0;
            
            // Limit maximum flow
            if (flow[idx].magnitude > config_.maxFlow) {
                double scale = config_.maxFlow / flow[idx].magnitude;
                flow[idx].dx *= scale;
                flow[idx].dy *= scale;
                flow[idx].magnitude = config_.maxFlow;
            }
            
            // Update confidence based on gradient magnitude
            double gradMagnitude = std::sqrt(
                computeGradient(prevImage, x, y, width, height, true) * 
                computeGradient(prevImage, x, y, width, height, true) +
                computeGradient(prevImage, x, y, width, height, false) * 
                computeGradient(prevImage, x, y, width, height, false)
            );
            
            flow[idx].confidence = std::min(1.0, gradMagnitude / 50.0);
        }
    }
}

MotionVector OpticalFlowEngine::lucasKanadeStep(
    const std::vector<double>& prevImage,
    const std::vector<double>& currImage,
    int x, int y, int width, int height) {
    
    const int windowRadius = static_cast<int>(config_.windowSize) / 2;
    
    // Compute image gradients
    double Ix = computeGradient(prevImage, x, y, width, height, true);
    double Iy = computeGradient(prevImage, x, y, width, height, false);
    double It = 0.0;
    
    // Compute temporal derivative
    It += currImage[y * width + x] - prevImage[y * width + x];
    
    // Lucas-Kanade equations
    double A00 = Ix * Ix;
    double A01 = Ix * Iy;
    double A11 = Iy * Iy;
    double b0 = -Ix * It;
    double b1 = -Iy * It;
    
    // Solve 2x2 system
    double det = A00 * A11 - A01 * A01;
    
    if (std::abs(det) < 1e-6) {
        return MotionVector(0, 0, 0);
    }
    
    double dx = (A11 * b0 - A01 * b1) / det;
    double dy = (-A01 * b0 + A00 * b1) / det;
    
    return MotionVector(dx, dy, 1.0);
}

void OpticalFlowEngine::temporalFilter(std::vector<MotionVector>& flow) {
    if (previousFlow_.size() != flow.size()) {
        return;
    }
    
    double alpha = config_.temporalAlpha;
    
    for (size_t i = 0; i < flow.size(); ++i) {
        flow[i].dx = alpha * flow[i].dx + (1.0 - alpha) * previousFlow_[i].dx;
        flow[i].dy = alpha * flow[i].dy + (1.0 - alpha) * previousFlow_[i].dy;
        flow[i].magnitude = std::sqrt(flow[i].dx * flow[i].dx + flow[i].dy * flow[i].dy);
        flow[i].angle = std::atan2(flow[i].dy, flow[i].dx) * 180.0 / M_PI;
        if (flow[i].angle < 0) flow[i].angle += 360.0;
    }
}

double OpticalFlowEngine::computeGradient(
    const std::vector<double>& image,
    int x, int y, int width, int height,
    bool computeX) {
    
    if (computeX) {
        // X gradient (Sobel)
        if (x == 0 || x == width - 1) return 0.0;
        return (-image[y * width + (x-1)] + image[y * width + (x+1)]) * 0.5;
    } else {
        // Y gradient (Sobel)
        if (y == 0 || y == height - 1) return 0.0;
        return (-image[(y-1) * width + x] + image[(y+1) * width + x]) * 0.5;
    }
}

// DynamicPSFEstimator Implementation
DynamicPSFEstimator::DynamicPSFEstimator(int width, int height)
    : width_(width), height_(height) {
}

DynamicPSFEstimator::~DynamicPSFEstimator() = default;

MotionVector DynamicPSFEstimator::estimateGlobalMotion(
    const std::vector<MotionVector>& flowField,
    int width, int height) {
    
    // Use RANSAC for robust global motion estimation
    return ransacMotionEstimation(flowField, 2.0, 100);
}

MotionVector DynamicPSFEstimator::ransacMotionEstimation(
    const std::vector<MotionVector>& flowField,
    double threshold, int iterations) {
    
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(0, flowField.size() - 1);
    
    MotionVector bestMotion(0, 0, 0);
    int bestInliers = 0;
    
    for (int iter = 0; iter < iterations; ++iter) {
        // Random sample
        int idx1 = dis(gen);
        int idx2 = dis(gen);
        
        const MotionVector& sample1 = flowField[idx1];
        const MotionVector& sample2 = flowField[idx2];
        
        // Skip low confidence samples
        if (sample1.confidence < 0.5 || sample2.confidence < 0.5) {
            continue;
        }
        
        // Estimate motion from sample (average for simplicity)
        MotionVector candidate(
            (sample1.dx + sample2.dx) * 0.5,
            (sample1.dy + sample2.dy) * 0.5,
            1.0
        );
        
        // Count inliers
        int inliers = 0;
        for (const auto& flow : flowField) {
            double error = std::sqrt(
                (flow.dx - candidate.dx) * (flow.dx - candidate.dx) +
                (flow.dy - candidate.dy) * (flow.dy - candidate.dy)
            );
            
            if (error < threshold) {
                inliers++;
            }
        }
        
        if (inliers > bestInliers) {
            bestInliers = inliers;
            bestMotion = candidate;
        }
    }
    
    bestMotion.confidence = static_cast<double>(bestInliers) / flowField.size();
    return bestMotion;
}

std::vector<double> DynamicPSFEstimator::generateAdaptivePSF(
    const MotionVector& motion,
    int psfSize) {
    
    std::vector<double> psf(psfSize * psfSize, 0.0);
    
    if (motion.magnitude < 0.1) {
        // No significant motion - identity PSF
        psf[(psfSize / 2) * psfSize + (psfSize / 2)] = 1.0;
        return psf;
    }
    
    // Generate motion kernel based on estimated motion
    generateMotionKernel(psf, motion, psfSize);
    
    // Apply Gaussian smoothing for realistic PSF
    applyGaussianSmoothing(psf, psfSize, 1.0);
    
    // Normalize PSF
    double sum = 0.0;
    for (double val : psf) {
        sum += val;
    }
    
    if (sum > 0) {
        for (double& val : psf) {
            val /= sum;
        }
    }
    
    return psf;
}

void DynamicPSFEstimator::generateMotionKernel(
    std::vector<double>& kernel,
    const MotionVector& motion,
    int size) {
    
    int center = size / 2;
    double angle = motion.angle * M_PI / 180.0;
    double length = std::min(motion.magnitude, static_cast<double>(size / 2));
    
    // Generate motion line
    int steps = static_cast<int>(length * 2);
    for (int i = -steps; i <= steps; ++i) {
        double t = static_cast<double>(i) / steps;
        double x = center + t * length * std::cos(angle);
        double y = center + t * length * std::sin(angle);
        
        int ix = static_cast<int>(std::round(x));
        int iy = static_cast<int>(std::round(y));
        
        if (ix >= 0 && ix < size && iy >= 0 && iy < size) {
            kernel[iy * size + ix] += 1.0;
        }
    }
}

void DynamicPSFEstimator::applyGaussianSmoothing(
    std::vector<double>& kernel,
    int size, double sigma) {
    
    std::vector<double> smoothed(size * size, 0.0);
    int radius = static_cast<int>(sigma * 3);
    
    for (int y = 0; y < size; ++y) {
        for (int x = 0; x < size; ++x) {
            double sum = 0.0;
            double weightSum = 0.0;
            
            for (int dy = -radius; dy <= radius; ++dy) {
                for (int dx = -radius; dx <= radius; ++dx) {
                    int nx = x + dx;
                    int ny = y + dy;
                    
                    if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                        double dist = std::sqrt(dx * dx + dy * dy);
                        double weight = std::exp(-(dist * dist) / (2 * sigma * sigma));
                        
                        sum += kernel[ny * size + nx] * weight;
                        weightSum += weight;
                    }
                }
            }
            
            smoothed[y * size + x] = sum / weightSum;
        }
    }
    
    kernel = std::move(smoothed);
}

} // namespace kronop
