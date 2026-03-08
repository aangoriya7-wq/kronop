/**
 * SmartSharpening.hpp
 * Advanced HD Quality Enhancement with Adaptive Algorithms
 * Real-time smart sharpening for professional video quality
 */

#ifndef SMART_SHARPENING_HPP
#define SMART_SHARPENING_HPP

#include <vector>
#include <memory>
#include <cmath>

namespace kronop {

/**
 * Sharpening Configuration
 */
struct SharpeningConfig {
    double strength;        // Sharpening strength (0-2)
    double radius;          // Sharpening radius
    double threshold;       // Noise threshold
    bool adaptive;         // Adaptive sharpening
    double detailBoost;     // Fine detail enhancement
    double haloReduction;  // Halo reduction factor
    bool edgePreserving;   // Edge-aware sharpening
    double noiseSuppression; // Noise suppression level
    
    SharpeningConfig()
        : strength(1.0), radius(1.5), threshold(0.05), 
          adaptive(true), detailBoost(0.3), haloReduction(0.8),
          edgePreserving(true), noiseSuppression(0.2) {}
};

/**
 * Local Contrast Enhancement
 */
struct ContrastConfig {
    double localGain;       // Local contrast gain
    double globalGain;      // Global contrast gain
    double radius;          // Local region radius
    double clipLimit;       // Contrast clipping limit
    bool preserveLuminance; // Preserve original luminance
    
    ContrastConfig()
        : localGain(1.2), globalGain(1.0), radius(50.0),
          clipLimit(2.0), preserveLuminance(true) {}
};

/**
 * Detail Analysis Results
 */
struct DetailAnalysis {
    double edgeStrength;    // Edge strength magnitude
    double textureLevel;    // Texture complexity
    double noiseLevel;      // Noise estimation
    double localContrast;   // Local contrast
    bool isEdge;          // Edge detection result
    bool isTexture;        // Texture region detection
    bool isFlat;          // Flat region detection
};

/**
 * Advanced Sharpening Engine
 */
class SmartSharpeningEngine {
public:
    explicit SmartSharpeningEngine(int width, int height);
    ~SmartSharpeningEngine();
    
    // Main sharpening interface
    bool processImage(const std::vector<double>& input,
                    std::vector<double>& output,
                    const SharpeningConfig& config);
    
    // Multi-channel processing
    bool processImageRGB(const std::vector<double>& input,
                       std::vector<double>& output,
                       const SharpeningConfig& config);
    
    // Individual processing stages
    void analyzeDetails(const std::vector<double>& image,
                      std::vector<DetailAnalysis>& analysis);
    
    void adaptiveSharpening(const std::vector<double>& input,
                          const std::vector<DetailAnalysis>& analysis,
                          std::vector<double>& output,
                          const SharpeningConfig& config);
    
    void unsharpMask(const std::vector<double>& input,
                   std::vector<double>& output,
                   double radius, double strength, double threshold);
    
    void multiScaleSharpening(const std::vector<double>& input,
                            std::vector<double>& output,
                            const SharpeningConfig& config);
    
    // Configuration management
    void setConfig(const SharpeningConfig& config);
    SharpeningConfig getConfig() const;
    
    // Performance optimization
    void enableGPUAcceleration(bool enable);
    bool isGPUEnabled() const;
    
    // Performance metrics
    double getLastProcessingTime() const;
    size_t getMemoryUsage() const;

private:
    int width_;
    int height_;
    SharpeningConfig config_;
    bool gpuEnabled_;
    
    // Temporary buffers
    std::vector<double> tempBuffer_;
    std::vector<double> blurBuffer_;
    std::vector<double> edgeBuffer_;
    std::vector<DetailAnalysis> analysisBuffer_;
    
    // Performance tracking
    double lastProcessingTime_;
    size_t memoryUsage_;
    
    // Internal processing methods
    void gaussianBlur(const std::vector<double>& input,
                     std::vector<double>& output,
                     double radius);
    
    void bilateralFilter(const std::vector<double>& input,
                      std::vector<double>& output,
                       double spatialSigma, double intensitySigma);
    
    void edgeDetection(const std::vector<double>& input,
                     std::vector<double>& output);
    
    void textureAnalysis(const std::vector<double>& input,
                      std::vector<double>& output);
    
    void noiseEstimation(const std::vector<double>& input,
                       double& noiseLevel);
    
    // Adaptive algorithms
    void adaptiveUnsharpMask(const std::vector<double>& input,
                           const std::vector<DetailAnalysis>& analysis,
                           std::vector<double>& output,
                           const SharpeningConfig& config);
    
    void edgePreservingSharpening(const std::vector<double>& input,
                                const std::vector<double>& edges,
                                std::vector<double>& output,
                                double strength);
    
    void haloReduction(const std::vector<double>& input,
                     const std::vector<double>& original,
                     std::vector<double>& output,
                     double factor);
    
    // Utility methods
    double computeLocalContrast(const std::vector<double>& image,
                              int x, int y, int radius);
    
    double computeEdgeStrength(const std::vector<double>& image,
                           int x, int y);
    
    double computeTextureLevel(const std::vector<double>& image,
                            int x, int y, int radius);
    
    void allocateBuffers();
    void releaseBuffers();
};

/**
 * Local Contrast Enhancement
 */
class ContrastEnhancer {
public:
    explicit ContrastEnhancer(int width, int height);
    ~ContrastEnhancer();
    
    // Main enhancement interface
    bool enhanceContrast(const std::vector<double>& input,
                       std::vector<double>& output,
                       const ContrastConfig& config);
    
    // CLAHE (Contrast Limited Adaptive Histogram Equalization)
    void applyCLAHE(const std::vector<double>& input,
                   std::vector<double>& output,
                   const ContrastConfig& config);
    
    // Local adaptive contrast
    void localAdaptiveContrast(const std::vector<double>& input,
                             std::vector<double>& output,
                             const ContrastConfig& config);
    
    // Global contrast adjustment
    void globalContrastAdjustment(const std::vector<double>& input,
                               std::vector<double>& output,
                               double gain, double offset);

private:
    int width_;
    int height_;
    
    // Temporary buffers
    std::vector<double> histogram_;
    std::vector<double> localMean_;
    std::vector<double> localStdDev_;
    
    // Internal methods
    void computeLocalStatistics(const std::vector<double>& image,
                             const ContrastConfig& config);
    
    void adaptiveHistogramEqualization(const std::vector<double>& input,
                                   std::vector<double>& output,
                                   int tileSize, double clipLimit);
    
    void computeHistogram(const std::vector<double>& image,
                       std::vector<double>& histogram,
                       int bins = 256);
    
    void clipHistogram(std::vector<double>& histogram, double clipLimit);
};

/**
 * Professional Quality Enhancement Pipeline
 */
class QualityEnhancer {
public:
    explicit QualityEnhancer(int width, int height);
    ~QualityEnhancer();
    
    // Complete enhancement pipeline
    bool enhanceImage(const std::vector<double>& input,
                   std::vector<double>& output,
                   const SharpeningConfig& sharpenConfig,
                   const ContrastConfig& contrastConfig);
    
    // Individual enhancement stages
    void denoiseImage(const std::vector<double>& input,
                    std::vector<double>& output,
                    double strength);
    
    void enhanceDetails(const std::vector<double>& input,
                     std::vector<double>& output,
                     double strength);
    
    void adjustColors(const std::vector<double>& input,
                    std::vector<double>& output,
                    double saturation, double vibrance);
    
    void reduceArtifacts(const std::vector<double>& input,
                      std::vector<double>& output,
                      double strength);
    
    // Configuration
    void setQualityPreset(int preset); // 0=Soft, 1=Normal, 2=Strong, 3=Professional
    
    // Performance optimization
    void enableRealTimeMode(bool enable);
    bool isRealTimeMode() const;

private:
    int width_;
    int height_;
    bool realTimeMode_;
    
    std::unique_ptr<SmartSharpeningEngine> sharpener_;
    std::unique_ptr<ContrastEnhancer> contrastEnhancer_;
    
    // Temporary buffers
    std::vector<double> tempBuffer1_;
    std::vector<double> tempBuffer2_;
    std::vector<double> tempBuffer3_;
    
    // Internal processing
    void professionalSharpening(const std::vector<double>& input,
                             std::vector<double>& output);
    
    void cinematicEnhancement(const std::vector<double>& input,
                           std::vector<double>& output);
    
    void broadcastReady(const std::vector<double>& input,
                     std::vector<double>& output);
};

/**
 * Real-time Performance Optimizer
 */
class PerformanceOptimizer {
public:
    static void optimizeForRealTime();
    static void optimizeForQuality();
    static void setOptimalWorkgroupSize(int width, int height, int& x, int& y);
    static double estimateProcessingTime(int width, int height, int quality);
    
    // Memory optimization
    static size_t calculateOptimalMemoryUsage(int width, int height);
    static void optimizeMemoryLayout(std::vector<double>& buffer, int width, int height);
    
    // Cache optimization
    static void prefetchData(const void* data, size_t size);
    static void alignMemory(void*& ptr, size_t size, size_t alignment);
};

} // namespace kronop

#endif // SMART_SHARPENING_HPP
