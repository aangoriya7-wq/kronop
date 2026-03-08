/**
 * OpticalFlow.hpp
 * Dynamic PSF Estimation using Advanced Optical Flow
 * Real-time camera motion tracking for extreme shake scenarios
 */

#ifndef OPTICAL_FLOW_HPP
#define OPTICAL_FLOW_HPP

#include <vector>
#include <memory>
#include <cmath>

namespace kronop {

/**
 * Advanced Motion Vector for Dynamic PSF Estimation
 */
struct MotionVector {
    double dx, dy;        // Motion components
    double confidence;    // Confidence level (0-1)
    double magnitude;     // Motion magnitude
    double angle;         // Motion angle in degrees
    
    MotionVector(double x = 0, double y = 0, double conf = 0) 
        : dx(x), dy(y), confidence(conf) {
        magnitude = std::sqrt(dx * dx + dy * dy);
        angle = std::atan2(dy, dx) * 180.0 / M_PI;
        if (angle < 0) angle += 360.0;
    }
};

/**
 * Optical Flow Configuration
 */
struct OpticalFlowConfig {
    int pyramidLevels;      // Multi-scale pyramid levels
    double windowSize;      // Search window size
    double maxFlow;         // Maximum allowed flow
    double minConfidence;   // Minimum confidence threshold
    bool useGaussian;       // Use Gaussian weighting
    bool useTemporalFilter;  // Temporal filtering
    double temporalAlpha;     // Temporal smoothing factor
    
    OpticalFlowConfig() 
        : pyramidLevels(4), windowSize(21.0), maxFlow(50.0), 
          minConfidence(0.1), useGaussian(true), useTemporalFilter(true),
          temporalAlpha(0.8) {}
};

/**
 * Image Pyramid for Multi-scale Processing
 */
class ImagePyramid {
public:
    ImagePyramid(int width, int height, int levels);
    ~ImagePyramid();
    
    void build(const std::vector<double>& image);
    const std::vector<double>& getLevel(int level) const;
    int getWidth(int level) const;
    int getHeight(int level) const;
    
private:
    std::vector<std::vector<double>> levels_;
    std::vector<int> widths_;
    std::vector<int> heights_;
    
    void gaussianBlur(const std::vector<double>& input, 
                    std::vector<double>& output, 
                    int width, int height, double sigma);
    void downsample(const std::vector<double>& input, 
                  std::vector<double>& output,
                  int srcWidth, int srcHeight);
};

/**
 * Advanced Optical Flow Engine
 */
class OpticalFlowEngine {
public:
    explicit OpticalFlowEngine(const OpticalFlowConfig& config);
    ~OpticalFlowEngine();
    
    // Main optical flow computation
    std::vector<MotionVector> computeFlow(
        const std::vector<double>& prevImage,
        const std::vector<double>& currImage,
        int width, int height);
    
    // Sparse flow for key points
    std::vector<MotionVector> computeSparseFlow(
        const std::vector<double>& prevImage,
        const std::vector<double>& currImage,
        const std::vector<std::pair<int, int>>& keypoints,
        int width, int height);
    
    // Dense flow for full image
    std::vector<MotionVector> computeDenseFlow(
        const std::vector<double>& prevImage,
        const std::vector<double>& currImage,
        int width, int height);
    
    // Configuration management
    void setConfig(const OpticalFlowConfig& config);
    OpticalFlowConfig getConfig() const;
    
    // Performance metrics
    double getLastProcessingTime() const;
    size_t getMemoryUsage() const;

private:
    OpticalFlowConfig config_;
    
    // Image pyramids for multi-scale processing
    std::unique_ptr<ImagePyramid> prevPyramid_;
    std::unique_ptr<ImagePyramid> currPyramid_;
    
    // Temporal filtering
    std::vector<MotionVector> previousFlow_;
    bool initialized_;
    
    // Performance tracking
    double lastProcessingTime_;
    size_t memoryUsage_;
    
    // Internal methods
    MotionVector lucasKanadeStep(
        const std::vector<double>& prevImage,
        const std::vector<double>& currImage,
        int x, int y, int width, int height);
    
    void refineFlow(
        std::vector<MotionVector>& flow,
        const std::vector<double>& prevImage,
        const std::vector<double>& currImage,
        int width, int height, int level);
    
    void temporalFilter(std::vector<MotionVector>& flow);
    
    // Utility methods
    double computeGradient(
        const std::vector<double>& image,
        int x, int y, int width, int height,
        bool computeX);
    
    std::vector<std::pair<int, int>> detectGoodFeatures(
        const std::vector<double>& image,
        int width, int height, int maxFeatures);
    
    double computeSSD(
        const std::vector<double>& patch1,
        const std::vector<double>& patch2,
        int patchSize);
};

/**
 * Dynamic PSF Estimator
 * Converts optical flow to Point Spread Function
 */
class DynamicPSFEstimator {
public:
    explicit DynamicPSFEstimator(int width, int height);
    ~DynamicPSFEstimator();
    
    // Main PSF estimation from flow field
    MotionVector estimateGlobalMotion(
        const std::vector<MotionVector>& flowField,
        int width, int height);
    
    // Adaptive PSF based on local motion
    std::vector<MotionVector> estimateLocalMotion(
        const std::vector<MotionVector>& flowField,
        int width, int height, int gridSize);
    
    // Motion segmentation for complex scenes
    std::vector<int> segmentMotion(
        const std::vector<MotionVector>& flowField,
        int width, int height);
    
    // PSF generation from motion vectors
    std::vector<double> generateAdaptivePSF(
        const MotionVector& motion,
        int psfSize);
    
    // Confidence-weighted PSF
    std::vector<double> generateWeightedPSF(
        const std::vector<MotionVector>& motionVectors,
        const std::vector<double>& weights,
        int psfSize);

private:
    int width_;
    int height_;
    
    // RANSAC for robust motion estimation
    MotionVector ransacMotionEstimation(
        const std::vector<MotionVector>& flowField,
        double threshold, int iterations);
    
    // Clustering for motion segmentation
    void kMeansClustering(
        const std::vector<MotionVector>& flowField,
        std::vector<int>& labels, int k);
    
    // PSF generation utilities
    void generateMotionKernel(
        std::vector<double>& kernel,
        const MotionVector& motion,
        int size);
    
    void applyGaussianSmoothing(
        std::vector<double>& kernel,
        int size, double sigma);
};

} // namespace kronop

#endif // OPTICAL_FLOW_HPP
