/**
 * Deblur_Core.cpp
 * Motion Blur Removal using Wiener Deconvolution
 * Optimized for real-time mobile GPU processing
 */

#include "FFT_Logic.hpp"
#include <cmath>
#include <algorithm>
#include <cstring>

// OpenGL headers for compute shaders
#ifdef __ANDROID__
#include <GLES3/gl31.h>
#include <EGL/egl.h>
#else
#include <GL/glew.h>
#include <GL/gl.h>
#endif

// Include advanced modules
#include "Dynamic_PSF/OpticalFlow.hpp"
#include "Advanced_Shaders/ComputeShaders.hpp"
#include "Smart_Sharpening/SmartSharpening.hpp"
#include "ChunkManager.hpp"
#include "VideoStreamer.hpp"
#include "VulkanCompute.hpp"

// Security Shield Hook - Forward declaration
// This links with Security_Shield.cpp for theft protection
class SecurityShield {
public:
    static SecurityShield& getInstance() {
        static SecurityShield instance;
        return instance;
    }
    
    bool verifyLicense() {
        // Hook for Security_Shield.cpp implementation
        // Returns true if license is valid
        return true; // Placeholder
    }
    
    bool verifyIntegrity() {
        // Hook for Security_Shield.cpp implementation
        // Verifies code hasn't been tampered with
        return true; // Placeholder
    }
    
    void encryptBuffer(void* data, size_t size) {
        if (!data || size == 0) return;
        
        // Simple XOR encryption for demonstration
        // In production, use AES-256 or stronger encryption
        uint8_t* bytes = static_cast<uint8_t*>(data);
        const uint8_t key = 0xAB; // Simple key
        
        for (size_t i = 0; i < size; ++i) {
            bytes[i] ^= key;
        }
    }
    
    void decryptBuffer(void* data, size_t size) {
        // XOR decryption is the same as encryption
        encryptBuffer(data, size);
    }

private:
    SecurityShield() {}
    ~SecurityShield() {}
};

namespace kronop {

/**
 * Point Spread Function (PSF) for Motion Blur
 */
struct MotionPSF {
    double angle;      // Motion direction in degrees
    double length;     // Motion blur length in pixels
    double sigma;      // Gaussian smoothing for noise
    int width;         // PSF width
    int height;        // PSF height
    
    MotionPSF(double a = 0.0, double l = 0.0, double s = 1.0, 
              int w = 0, int h = 0)
        : angle(a), length(l), sigma(s), width(w), height(h) {}
};

/**
 * Wiener Filter Configuration
 */
struct WienerConfig {
    double noiseVariance;     // Estimated noise variance
    double snr;              // Signal-to-Noise Ratio
    double gamma;            // Wiener filter parameter (0 < gamma <= 1)
    bool autoEstimateNoise;  // Auto-estimate noise variance
    int frameHistory;        // Number of frames for temporal averaging
    
    WienerConfig()
        : noiseVariance(0.01),
          snr(100.0),
          gamma(0.01),
          autoEstimateNoise(true),
          frameHistory(3) {}
};

/**
 * Frame Data Structure
 */
struct FrameData {
    int width;
    int height;
    int channels;
    std::vector<uint8_t> data;
    std::vector<double> motionVector; // Motion estimation data
    
    FrameData(int w = 0, int h = 0, int c = 3) 
        : width(w), height(h), channels(c) {
        data.resize(w * h * c);
    }
};

/**
 * DeblurEngine - Main class for motion deblurring
 * Modular design with GPU acceleration support
 */
class DeblurEngine {
public:
    DeblurEngine();
    ~DeblurEngine();
    
    // Disable copy
    DeblurEngine(const DeblurEngine&) = delete;
    DeblurEngine& operator=(const DeblurEngine&) = delete;
    
    // Initialization
    bool initialize(int width, int height, int channels, bool useGPU = true);
    void shutdown();
    
    // Core deblurring function - Wiener Deconvolution
    bool deblurFrame(const FrameData& input, FrameData& output);
    
    // Batch processing for multiple frames
    bool deblurBatch(const std::vector<FrameData>& inputs, 
                     std::vector<FrameData>& outputs);
    
    // Configure Wiener filter
    void setWienerConfig(const WienerConfig& config);
    WienerConfig getWienerConfig() const;
    
    // Motion PSF configuration
    void setMotionPSF(const MotionPSF& psf);
    void estimateMotionPSF(const FrameData& frame, MotionPSF& psf);
    
    // GPU context management
    void enableGPU(bool enable);
    bool isGPUEnabled() const;
    void setGPUContext(const GPUContext& context);
    
    // Performance metrics
    double getLastProcessingTime() const;
    size_t getMemoryUsage() const;
    
    // Advanced configuration methods
    void setSharpeningConfig(const SharpeningConfig& config);
    SharpeningConfig getSharpeningConfig() const;
    
    void setOpticalFlowConfig(const OpticalFlowConfig& config);
    OpticalFlowConfig getOpticalFlowConfig() const;
    
    // Advanced processing methods
    bool processFrameWithAdvancedFeatures(const FrameData& input, FrameData& output);
    bool enableDynamicPSF(bool enable);
    bool enableSmartSharpening(bool enable);
    
    // Chunk & Tile Processing
    bool processLargeVideoFile(const std::string& inputPath, const std::string& outputPath);
    bool enableChunkProcessing(bool enable);
    bool enableStreamingMode(bool enable);
    bool enableVulkanAcceleration(bool enable);
    
    // Streaming interface
    bool startVideoStream(int width, int height, int channels);
    bool streamFrame(const FrameData& frame);
    bool getProcessedStreamFrame(FrameData& frame);
    void stopVideoStream();
    
    // Configuration
    void setTileConfig(const TileConfig& config);
    void setStreamConfig(const StreamConfig& config);
    TileConfig getTileConfig() const;
    StreamConfig getStreamConfig() const;
    
    // Performance monitoring
    ChunkStats getChunkStatistics() const;
    StreamStats getStreamStatistics() const;
    
    // Security verification
    bool verifySecurity();

private:
    // FFT engine
    std::unique_ptr<FFT2D> fftEngine_;
    FFTConfig fftConfig_;
    
    // Configuration
    WienerConfig wienerConfig_;
    MotionPSF motionPSF_;
    SharpeningConfig sharpeningConfig_;
    OpticalFlowConfig opticalFlowConfig_;
    
    // Advanced processing engines
    std::unique_ptr<OpticalFlowEngine> opticalFlowEngine_;
    std::unique_ptr<ComputeShaderManager> shaderManager_;
    std::unique_ptr<SmartSharpeningEngine> sharpeningEngine_;
    std::unique_ptr<GPUProcessingPipeline> gpuPipeline_;
    
    // Chunk & Tile Processing
    std::unique_ptr<ChunkManager> chunkManager_;
    std::unique_ptr<VideoStreamer> videoStreamer_;
    std::unique_ptr<VulkanContext> vulkanContext_;
    std::unique_ptr<VulkanFFT> vulkanFFT_;
    std::unique_ptr<VulkanWienerFilter> vulkanWiener_;
    
    // Frame dimensions
    int width_;
    int height_;
    int channels_;
    bool initialized_;
    bool useGPU_;
    
    // Buffers for processing
    std::vector<std::vector<Complex>> freqBuffers_;
    std::vector<std::vector<Complex>> psfBuffers_;
    std::vector<std::vector<Complex>> resultBuffers_;
    std::vector<double> tempBuffer_;
    
    // Temporal frame history for noise estimation
    std::vector<FrameData> frameHistory_;
    
    // Performance tracking
    double lastProcessingTime_;
    size_t memoryUsage_;
    
    // Security shield instance
    SecurityShield* securityShield_;
    bool securityVerified_;
    
    // OpenGL Compute Shader resources for GPU acceleration
    GLuint computeProgram_;
    GLuint inputTexture_;
    GLuint outputTexture_;
    GLuint psfTexture_;
    GLuint ssboComplex_; // For complex number operations
    
    // Internal methods
    bool allocateBuffers();
    void releaseBuffers();
    
    // OpenGL Compute Shader management
    bool initializeComputeShaders();
    void cleanupComputeShaders();
    GLuint compileComputeShader(const char* source);
    
    // Wiener deconvolution per channel
    void wienerDeconvolve(const std::vector<double>& input,
                          const std::vector<Complex>& psfFreq,
                          std::vector<double>& output,
                          double noiseVar);
    
    // Estimate noise variance from frame
    double estimateNoiseVariance(const std::vector<double>& frame);
    
    // Generate PSF in frequency domain
    std::vector<Complex> generatePSFFrequency();
    
    // Apply PSF to create blur kernel
    void applyMotionBlurKernel(std::vector<double>& kernel, 
                               double angle, double length);
    
    // GPU-accelerated processing (OpenGL/Vulkan)
    void processFrameGPU(const FrameData& input, FrameData& output);
    void wienerFilterGPU(const std::vector<Complex>& input,
                         const std::vector<Complex>& psf,
                         std::vector<Complex>& output);
    
    // Normalize and clamp output
    void normalizeOutput(std::vector<double>& data);
    
    // Motion PSF estimation helper
    std::pair<double, double> estimateMotionGradient(
        const std::vector<double>& frame, int width, int height);
    
    // Security check
    bool performSecurityCheck();
};

// Implementation

DeblurEngine::DeblurEngine()
    : width_(0), height_(0), channels_(3), initialized_(false),
      useGPU_(true), lastProcessingTime_(0.0), memoryUsage_(0),
      securityShield_(nullptr), securityVerified_(false),
      computeProgram_(0), inputTexture_(0), outputTexture_(0), 
      psfTexture_(0), ssboComplex_(0), processingActive_(false) {
    
    securityShield_ = &SecurityShield::getInstance();
    
    // Initialize advanced engines (will be properly initialized in initialize())
    opticalFlowEngine_ = nullptr;
    shaderManager_ = nullptr;
    sharpeningEngine_ = nullptr;
    gpuPipeline_ = nullptr;
}

DeblurEngine::~DeblurEngine() {
    shutdown();
}

bool DeblurEngine::initialize(int width, int height, int channels, bool useGPU) {
    // Security verification
    if (!performSecurityCheck()) {
        return false;
    }
    
    width_ = width;
    height_ = height;
    channels_ = channels;
    useGPU_ = useGPU;
    
    // Initialize FFT configuration
    fftConfig_ = FFTConfig(width, height, channels);
    fftConfig_.gpu.useGPU = useGPU;
    
    // Create FFT engine
    fftEngine_ = std::make_unique<FFT2D>(fftConfig_);
    
    // Allocate processing buffers
    if (!allocateBuffers()) {
        return false;
    }
    
    // Initialize OpenGL compute shaders for GPU acceleration
    if (useGPU) {
        if (!initializeComputeShaders()) {
            // Fallback to CPU if GPU initialization fails
            useGPU_ = false;
        }
    }
    
    // Initialize advanced processing engines
    opticalFlowEngine_ = std::make_unique<OpticalFlowEngine>(opticalFlowConfig_);
    shaderManager_ = std::make_unique<ComputeShaderManager>();
    sharpeningEngine_ = std::make_unique<SmartSharpeningEngine>(width, height);
    gpuPipeline_ = std::make_unique<GPUProcessingPipeline>(width, height);
    
    // Initialize chunk & tile processing
    TileConfig tileConfig;
    chunkManager_ = std::make_unique<ChunkManager>(tileConfig);
    
    // Initialize streaming
    StreamConfig streamConfig;
    videoStreamer_ = std::make_unique<VideoStreamer>(streamConfig);
    
    // Initialize Vulkan (if available)
    if (useGPU) {
        try {
            vulkanContext_ = std::make_unique<VulkanContext>();
            if (vulkanContext_->initialize()) {
                VulkanConfig vkConfig = vulkanContext_->getConfig();
                vulkanFFT_ = std::make_unique<VulkanFFT>(vkConfig);
                vulkanWiener_ = std::make_unique<VulkanWienerFilter>(vkConfig);
                
                vulkanFFT_->initialize(width, height);
                vulkanWiener_->initialize(width, height);
            }
        } catch (const std::exception& e) {
            // Vulkan initialization failed, fall back to OpenGL
            vulkanContext_.reset();
            vulkanFFT_.reset();
            vulkanWiener_.reset();
        }
    }
    
    // Initialize GPU pipeline if GPU is enabled
    if (useGPU_ && gpuPipeline_) {
        gpuPipeline_->initialize();
    }
    
    initialized_ = true;
    
    // Calculate initial memory usage
    size_t bufferSize = width * height * sizeof(Complex);
    memoryUsage_ = bufferSize * (channels * 3 + 1); // freq, psf, result buffers
    
    return true;
}

void DeblurEngine::shutdown() {
    cleanupComputeShaders();
    releaseBuffers();
    fftEngine_.reset();
    initialized_ = false;
    memoryUsage_ = 0;
}

bool DeblurEngine::allocateBuffers() {
    size_t freqSize = width_ * height_;
    
    // Allocate buffers for each channel
    freqBuffers_.resize(channels_);
    psfBuffers_.resize(channels_);
    resultBuffers_.resize(channels_);
    tempBuffer_.resize(width_ * height_);
    
    for (int c = 0; c < channels_; ++c) {
        freqBuffers_[c].resize(freqSize);
        psfBuffers_[c].resize(freqSize);
        resultBuffers_[c].resize(freqSize);
    }
    
    return true;
}

void DeblurEngine::releaseBuffers() {
    freqBuffers_.clear();
    psfBuffers_.clear();
    resultBuffers_.clear();
    tempBuffer_.clear();
    frameHistory_.clear();
}

bool DeblurEngine::deblurFrame(const FrameData& input, FrameData& output) {
    if (!initialized_) {
        return false;
    }
    
    // Security check
    if (!performSecurityCheck()) {
        return false;
    }
    
    // Verify dimensions
    if (input.width != width_ || input.height != height_ || 
        input.channels != channels_) {
        return false;
    }
    
    // Initialize output
    output = FrameData(width_, height_, channels_);
    
    // Use GPU if enabled
    if (useGPU_ && fftEngine_->isGPUEnabled()) {
        processFrameGPU(input, output);
        return true;
    }
    
    // CPU-based Wiener deconvolution
    // Generate PSF for motion blur
    std::vector<Complex> psfFreq = generatePSFFrequency();
    
    // Process each channel
    for (int c = 0; c < channels_; ++c) {
        // Extract channel data
        std::vector<double> channelData(width_ * height_);
        for (int y = 0; y < height_; ++y) {
            for (int x = 0; x < width_; ++x) {
                int idx = y * width_ + x;
                int pixelIdx = (y * width_ + x) * channels_ + c;
                channelData[idx] = input.data[pixelIdx] / 255.0; // Normalize
            }
        }
        
        // Estimate noise variance if auto-estimation is enabled
        double noiseVar = wienerConfig_.noiseVariance;
        if (wienerConfig_.autoEstimateNoise) {
            noiseVar = estimateNoiseVariance(channelData);
        }
        
        // Perform Wiener deconvolution
        std::vector<double> deblurred(width_ * height_);
        wienerDeconvolve(channelData, psfFreq, deblurred, noiseVar);
        
        // Copy to output
        for (int y = 0; y < height_; ++y) {
            for (int x = 0; x < width_; ++x) {
                int idx = y * width_ + x;
                int pixelIdx = (y * width_ + x) * channels_ + c;
                output.data[pixelIdx] = static_cast<uint8_t>(
                    std::clamp(deblurred[idx] * 255.0, 0.0, 255.0)
                );
            }
        }
    }
    
    // Add to frame history for temporal processing
    if (wienerConfig_.frameHistory > 1) {
        frameHistory_.push_back(input);
        if (frameHistory_.size() > static_cast<size_t>(wienerConfig_.frameHistory)) {
            frameHistory_.erase(frameHistory_.begin());
        }
    }
    
    return true;
}

void DeblurEngine::wienerDeconvolve(const std::vector<double>& input,
                                    const std::vector<Complex>& psfFreq,
                                    std::vector<double>& output,
                                    double noiseVar) {
    size_t size = input.size();
    
    // Convert input to frequency domain
    std::vector<Complex> inputFreq(size);
    fftEngine_->forward(input, inputFreq);
    
    // Wiener filter: H(f) = G(f) * conj(P(f)) / (|P(f)|^2 + K)
    // where K = noiseVar / signalVar (noise-to-signal ratio)
    
    std::vector<Complex> resultFreq(size);
    double K = noiseVar / wienerConfig_.snr;
    
    for (size_t i = 0; i < size; ++i) {
        Complex psf = psfFreq[i];
        Complex g = inputFreq[i];
        
        // |P(f)|^2
        double psfMagSquared = std::norm(psf);
        
        // Wiener filter formula
        Complex numerator = g * std::conj(psf);
        double denominator = psfMagSquared + K;
        
        resultFreq[i] = numerator / denominator;
    }
    
    // Convert back to spatial domain
    fftEngine_->inverse(resultFreq, output);
    
    // Normalize output
    normalizeOutput(output);
}

std::vector<Complex> DeblurEngine::generatePSFFrequency() {
    int psfWidth = motionPSF_.width > 0 ? motionPSF_.width : width_;
    int psfHeight = motionPSF_.height > 0 ? motionPSF_.height : height_;
    
    // Create motion blur kernel in spatial domain
    std::vector<double> kernel(psfWidth * psfHeight, 0.0);
    applyMotionBlurKernel(kernel, motionPSF_.angle, motionPSF_.length);
    
    // Normalize kernel
    double sum = 0.0;
    for (double val : kernel) {
        sum += val;
    }
    if (sum > 0) {
        for (double& val : kernel) {
            val /= sum;
        }
    }
    
    // Pad kernel to frame size
    std::vector<double> paddedKernel(width_ * height_, 0.0);
    int cx = (width_ - psfWidth) / 2;
    int cy = (height_ - psfHeight) / 2;
    
    for (int y = 0; y < psfHeight; ++y) {
        for (int x = 0; x < psfWidth; ++x) {
            int srcIdx = y * psfWidth + x;
            int dstIdx = (cy + y) * width_ + (cx + x);
            if (dstIdx >= 0 && dstIdx < width_ * height_) {
                paddedKernel[dstIdx] = kernel[srcIdx];
            }
        }
    }
    
    // Convert to frequency domain
    std::vector<Complex> psfFreq;
    fftEngine_->forward(paddedKernel, psfFreq);
    
    return psfFreq;
}

void DeblurEngine::applyMotionBlurKernel(std::vector<double>& kernel, 
                                         double angle, double length) {
    int width = motionPSF_.width > 0 ? motionPSF_.width : width_;
    int height = motionPSF_.height > 0 ? motionPSF_.height : height_;
    int cx = width / 2;
    int cy = height / 2;
    
    // Convert angle to radians
    double theta = angle * M_PI / 180.0;
    
    // Create motion blur along the angle direction
    int halfLen = static_cast<int>(length / 2);
    for (int i = -halfLen; i <= halfLen; ++i) {
        double x = cx + i * std::cos(theta);
        double y = cy + i * std::sin(theta);
        
        int ix = static_cast<int>(std::round(x));
        int iy = static_cast<int>(std::round(y));
        
        if (ix >= 0 && ix < width && iy >= 0 && iy < height) {
            kernel[iy * width + ix] = 1.0;
        }
    }
    
    // Apply Gaussian smoothing if sigma > 0
    if (motionPSF_.sigma > 0) {
        std::vector<double> smoothed(width * height, 0.0);
        int radius = static_cast<int>(motionPSF_.sigma * 3);
        
        for (int y = 0; y < height; ++y) {
            for (int x = 0; x < width; ++x) {
                double sum = 0.0;
                double weightSum = 0.0;
                
                for (int ky = -radius; ky <= radius; ++ky) {
                    for (int kx = -radius; kx <= radius; ++kx) {
                        int nx = x + kx;
                        int ny = y + ky;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            double dist = std::sqrt(kx * kx + ky * ky);
                            double weight = std::exp(-(dist * dist) / 
                                                     (2.0 * motionPSF_.sigma * motionPSF_.sigma));
                            sum += kernel[ny * width + nx] * weight;
                            weightSum += weight;
                        }
                    }
                }
                
                smoothed[y * width + x] = sum / weightSum;
            }
        }
        
        kernel = smoothed;
    }
}

double DeblurEngine::estimateNoiseVariance(const std::vector<double>& frame) {
    // Simple noise estimation using Laplacian operator
    size_t width = width_;
    size_t height = height_;
    
    double sum = 0.0;
    int count = 0;
    
    for (size_t y = 1; y < height - 1; ++y) {
        for (size_t x = 1; x < width - 1; ++x) {
            size_t idx = y * width + x;
            
            // Laplacian: 4*center - top - bottom - left - right
            double laplacian = 4.0 * frame[idx] 
                             - frame[(y - 1) * width + x]
                             - frame[(y + 1) * width + x]
                             - frame[y * width + (x - 1)]
                             - frame[y * width + (x + 1)];
            
            sum += laplacian * laplacian;
            count++;
        }
    }
    
    // Noise variance estimation
    double noiseVar = sum / (count * 36.0); // 36 = (sqrt(4) + sqrt(4) + ...)^2 normalization
    return std::max(noiseVar, 1e-6); // Prevent zero variance
}

void DeblurEngine::normalizeOutput(std::vector<double>& data) {
    // Find min and max
    double minVal = *std::min_element(data.begin(), data.end());
    double maxVal = *std::max_element(data.begin(), data.end());
    
    // Normalize to [0, 1]
    if (maxVal > minVal) {
        double range = maxVal - minVal;
        for (double& val : data) {
            val = (val - minVal) / range;
        }
    }
}

void DeblurEngine::processFrameGPU(const FrameData& input, FrameData& output) {
    if (!computeProgram_ || !useGPU_) {
        // Fallback to CPU processing
        // Generate PSF for motion blur
        std::vector<Complex> psfFreq = generatePSFFrequency();
        
        // Process each channel on CPU
        for (int c = 0; c < channels_; ++c) {
            std::vector<double> channelData(width_ * height_);
            for (int y = 0; y < height_; ++y) {
                for (int x = 0; x < width_; ++x) {
                    int idx = y * width_ + x;
                    int pixelIdx = (y * width_ + x) * channels_ + c;
                    channelData[idx] = input.data[pixelIdx] / 255.0;
                }
            }
            
            // Estimate noise variance
            double noiseVar = wienerConfig_.noiseVariance;
            if (wienerConfig_.autoEstimateNoise) {
                noiseVar = estimateNoiseVariance(channelData);
            }
            
            // Perform Wiener deconvolution
            std::vector<double> deblurred(width_ * height_);
            wienerDeconvolve(channelData, psfFreq, deblurred, noiseVar);
            
            // Copy to output
            for (int y = 0; y < height_; ++y) {
                for (int x = 0; x < width_; ++x) {
                    int idx = y * width_ + x;
                    int pixelIdx = (y * width_ + x) * channels_ + c;
                    output.data[pixelIdx] = static_cast<uint8_t>(
                        std::clamp(deblurred[idx] * 255.0, 0.0, 255.0)
                    );
                }
            }
        }
        return;
    }
    
    // GPU-accelerated processing
    // Generate PSF for motion blur
    std::vector<Complex> psfFreq = generatePSFFrequency();
    
    // Process each channel using GPU
    for (int c = 0; c < channels_; ++c) {
        // Extract channel data
        std::vector<double> channelData(width_ * height_);
        for (int y = 0; y < height_; ++y) {
            for (int x = 0; x < width_; ++x) {
                int idx = y * width_ + x;
                int pixelIdx = (y * width_ + x) * channels_ + c;
                channelData[idx] = input.data[pixelIdx] / 255.0;
            }
        }
        
        // Estimate noise variance
        double noiseVar = wienerConfig_.noiseVariance;
        if (wienerConfig_.autoEstimateNoise) {
            noiseVar = estimateNoiseVariance(channelData);
        }
        
        // Forward FFT using GPU if available
        std::vector<Complex> freqData(width_ * height_);
        if (fftEngine_->isGPUEnabled()) {
            fftEngine_->forwardGPU(channelData, freqData);
        } else {
            fftEngine_->forward(channelData, freqData);
        }
        
        // Apply Wiener filter using GPU compute shader
        std::vector<Complex> filteredFreq(width_ * height_);
        wienerFilterGPU(freqData, psfFreq, filteredFreq);
        
        // Inverse FFT using GPU if available
        std::vector<double> deblurred(width_ * height_);
        if (fftEngine_->isGPUEnabled()) {
            fftEngine_->inverseGPU(filteredFreq, deblurred);
        } else {
            fftEngine_->inverse(filteredFreq, deblurred);
        }
        
        // Normalize output
        normalizeOutput(deblurred);
        
        // Copy to output frame
        for (int y = 0; y < height_; ++y) {
            for (int x = 0; x < width_; ++x) {
                int idx = y * width_ + x;
                int pixelIdx = (y * width_ + x) * channels_ + c;
                output.data[pixelIdx] = static_cast<uint8_t>(
                    std::clamp(deblurred[idx] * 255.0, 0.0, 255.0)
                );
            }
        }
    }
}

void DeblurEngine::wienerFilterGPU(const std::vector<Complex>& input,
                                   const std::vector<Complex>& psf,
                                   std::vector<Complex>& output) {
    if (!computeProgram_ || !useGPU_) {
        // Fallback to CPU if GPU not available
        // CPU implementation would go here
        return;
    }
    
    // Use compute program
    glUseProgram(computeProgram_);
    
    // Upload input data to GPU texture
    glBindTexture(GL_TEXTURE_2D, inputTexture_);
    glTexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, width_, height_, 
                    GL_RED, GL_FLOAT, input.data());
    
    // Upload PSF data to GPU texture
    std::vector<float> psfData(width_ * height_ * 2);
    for (size_t i = 0; i < psf.size(); ++i) {
        psfData[i * 2] = static_cast<float>(psf[i].real());
        psfData[i * 2 + 1] = static_cast<float>(psf[i].imag());
    }
    
    glBindTexture(GL_TEXTURE_2D, psfTexture_);
    glTexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, width_, height_,
                    GL_RG, GL_FLOAT, psfData.data());
    
    // Bind images for compute shader
    glBindImageTexture(0, inputTexture_, 0, GL_FALSE, 0, GL_READ_ONLY, GL_R32F);
    glBindImageTexture(1, psfTexture_, 0, GL_FALSE, 0, GL_READ_ONLY, GL_RG32F);
    glBindImageTexture(2, outputTexture_, 0, GL_FALSE, 0, GL_WRITE_ONLY, GL_R32F);
    
    // Set uniforms
    GLuint noiseVarLoc = glGetUniformLocation(computeProgram_, "noiseVariance");
    GLuint snrLoc = glGetUniformLocation(computeProgram_, "snr");
    GLuint imageSizeLoc = glGetUniformLocation(computeProgram_, "imageSize");
    
    glUniform1f(noiseVarLoc, static_cast<float>(wienerConfig_.noiseVariance));
    glUniform1f(snrLoc, static_cast<float>(wienerConfig_.snr));
    glUniform2ui(imageSizeLoc, width_, height_);
    
    // Dispatch compute shader
    GLuint workGroupsX = (width_ + 15) / 16; // 16 = local_size_x
    GLuint workGroupsY = (height_ + 15) / 16; // 16 = local_size_y
    
    glDispatchCompute(workGroupsX, workGroupsY, 1);
    
    // Wait for compute shader to finish
    glMemoryBarrier(GL_SHADER_IMAGE_ACCESS_BARRIER_BIT);
    
    // Read back results
    output.resize(input.size());
    std::vector<float> outputData(width_ * height_);
    
    glBindTexture(GL_TEXTURE_2D, outputTexture_);
    glGetTexImage(GL_TEXTURE_2D, 0, GL_RED, GL_FLOAT, outputData.data());
    
    // Convert float output back to complex
    for (size_t i = 0; i < output.size(); ++i) {
        output[i] = Complex(static_cast<double>(outputData[i]), 0.0);
    }
    
    // Unbind everything
    glBindTexture(GL_TEXTURE_2D, 0);
    glUseProgram(0);
}

bool DeblurEngine::performSecurityCheck() {
    if (securityVerified_) {
        return true;
    }
    
    if (securityShield_) {
        securityVerified_ = securityShield_->verifyLicense() && 
                           securityShield_->verifyIntegrity();
    }
    
    return securityVerified_;
}

void DeblurEngine::setWienerConfig(const WienerConfig& config) {
    wienerConfig_ = config;
}

WienerConfig DeblurEngine::getWienerConfig() const {
    return wienerConfig_;
}

void DeblurEngine::setMotionPSF(const MotionPSF& psf) {
    motionPSF_ = psf;
}

void DeblurEngine::estimateMotionPSF(const FrameData& frame, MotionPSF& psf) {
    // Advanced motion estimation for extreme camera shake
    // Uses gradient-based analysis and temporal coherence
    
    // Convert frame to grayscale for motion analysis
    std::vector<double> grayFrame(width_ * height_);
    for (int y = 0; y < height_; ++y) {
        for (int x = 0; x < width_; ++x) {
            int idx = y * width_ + x;
            int pixelIdx = (y * width_ + x) * channels_;
            
            // Convert to grayscale using standard weights
            double gray = 0.299 * frame.data[pixelIdx] +
                         0.587 * frame.data[pixelIdx + 1] +
                         0.114 * frame.data[pixelIdx + 2];
            grayFrame[idx] = gray / 255.0;
        }
    }
    
    // Multi-scale motion analysis for robust estimation
    std::vector<double> scales = {1.0, 0.5, 0.25}; // Different scales
    std::vector<std::pair<double, double>> motionVectors;
    
    for (double scale : scales) {
        int scaledWidth = static_cast<int>(width_ * scale);
        int scaledHeight = static_cast<int>(height_ * scale);
        
        // Downsample frame for current scale
        std::vector<double> scaledFrame(scaledWidth * scaledHeight);
        for (int y = 0; y < scaledHeight; ++y) {
            for (int x = 0; x < scaledWidth; ++x) {
                int srcX = static_cast<int>(x / scale);
                int srcY = static_cast<int>(y / scale);
                int srcIdx = srcY * width_ + srcX;
                int dstIdx = y * scaledWidth + x;
                scaledFrame[dstIdx] = grayFrame[srcIdx];
            }
        }
        
        // Estimate motion using gradient-based method
        auto motion = estimateMotionGradient(scaledFrame, scaledWidth, scaledHeight);
        motionVectors.push_back(motion);
    }
    
    // Combine motion estimates from different scales
    double totalAngle = 0.0;
    double totalLength = 0.0;
    double totalWeight = 0.0;
    
    for (size_t i = 0; i < motionVectors.size(); ++i) {
        double weight = scales[i]; // Higher weight for larger scales
        totalAngle += motionVectors[i].first * weight;
        totalLength += motionVectors[i].second * weight;
        totalWeight += weight;
    }
    
    if (totalWeight > 0) {
        psf.angle = totalAngle / totalWeight;
        psf.length = totalLength / totalWeight;
    } else {
        // Default values if estimation fails
        psf.angle = motionPSF_.angle;
        psf.length = motionPSF_.length;
    }
    
    // Apply temporal smoothing to reduce flicker
    if (!frameHistory_.empty()) {
        // Use previous PSF estimate for temporal coherence
        double alpha = 0.7; // Smoothing factor
        psf.angle = alpha * psf.angle + (1.0 - alpha) * motionPSF_.angle;
        psf.length = alpha * psf.length + (1.0 - alpha) * motionPSF_.length;
    }
    
    // Clamp values to reasonable ranges
    psf.angle = std::fmod(psf.angle, 360.0);
    if (psf.angle < 0) psf.angle += 360.0;
    
    // Adaptive length based on image resolution
    double maxLength = std::sqrt(width_ * width_ + height_ * height_) * 0.1;
    psf.length = std::clamp(psf.length, 0.0, maxLength);
    
    // Set PSF dimensions
    psf.width = width_;
    psf.height = height_;
    psf.sigma = motionPSF_.sigma; // Use configured sigma
}

std::pair<double, double> DeblurEngine::estimateMotionGradient(
    const std::vector<double>& frame, int width, int height) {
    
    // Compute gradients using Sobel operators
    std::vector<double> gradX(width * height, 0.0);
    std::vector<double> gradY(width * height, 0.0);
    
    for (int y = 1; y < height - 1; ++y) {
        for (int x = 1; x < width - 1; ++x) {
            int idx = y * width + x;
            
            // Sobel X gradient
            gradX[idx] = -frame[(y-1) * width + (x-1)] + frame[(y-1) * width + (x+1)] +
                         -2.0 * frame[y * width + (x-1)] + 2.0 * frame[y * width + (x+1)] +
                         -frame[(y+1) * width + (x-1)] + frame[(y+1) * width + (x+1)];
            
            // Sobel Y gradient
            gradY[idx] = -frame[(y-1) * width + (x-1)] - 2.0 * frame[(y-1) * width + x] - frame[(y-1) * width + (x+1)] +
                         frame[(y+1) * width + (x-1)] + 2.0 * frame[(y+1) * width + x] + frame[(y+1) * width + (x+1)];
        }
    }
    
    // Analyze gradient orientations for motion direction
    std::vector<double> orientations(360, 0.0); // Histogram of orientations
    
    for (int y = 1; y < height - 1; ++y) {
        for (int x = 1; x < width - 1; ++x) {
            int idx = y * width + x;
            
            double gx = gradX[idx];
            double gy = gradY[idx];
            double magnitude = std::sqrt(gx * gx + gy * gy);
            
            if (magnitude > 0.01) { // Threshold to ignore noise
                double angle = std::atan2(gy, gx) * 180.0 / M_PI;
                if (angle < 0) angle += 360.0;
                
                int angleBin = static_cast<int>(angle);
                orientations[angleBin] += magnitude;
            }
        }
    }
    
    // Find dominant orientation
    double maxOrientation = 0.0;
    int dominantAngle = 0;
    for (int i = 0; i < 360; ++i) {
        if (orientations[i] > maxOrientation) {
            maxOrientation = orientations[i];
            dominantAngle = i;
        }
    }
    
    // Estimate motion length based on gradient magnitude
    double avgGradientMagnitude = 0.0;
    int count = 0;
    
    for (int y = 1; y < height - 1; ++y) {
        for (int x = 1; x < width - 1; ++x) {
            int idx = y * width + x;
            double gx = gradX[idx];
            double gy = gradY[idx];
            double magnitude = std::sqrt(gx * gx + gy * gy);
            
            if (magnitude > 0.01) {
                avgGradientMagnitude += magnitude;
                count++;
            }
        }
    }
    
    if (count > 0) {
        avgGradientMagnitude /= count;
    }
    
    // Map gradient magnitude to blur length
    // This is a heuristic - in production would use calibration
    double motionLength = std::min(avgGradientMagnitude * 50.0, 
                                  std::sqrt(width * width + height * height) * 0.1);
    
    return std::make_pair(static_cast<double>(dominantAngle), motionLength);
}

void DeblurEngine::enableGPU(bool enable) {
    useGPU_ = enable;
    if (fftEngine_) {
        // Reinitialize with new GPU setting
        fftConfig_.gpu.useGPU = enable;
        // Note: In production, this would reinitialize FFT plans
    }
}

bool DeblurEngine::isGPUEnabled() const {
    return useGPU_;
}

void DeblurEngine::setGPUContext(const GPUContext& context) {
    if (fftEngine_) {
        fftConfig_.gpu = context;
    }
}

double DeblurEngine::getLastProcessingTime() const {
    return lastProcessingTime_;
}

size_t DeblurEngine::getMemoryUsage() const {
    return memoryUsage_;
}

bool DeblurEngine::verifySecurity() {
    return performSecurityCheck();
}

bool DeblurEngine::deblurBatch(const std::vector<FrameData>& inputs,
                               std::vector<FrameData>& outputs) {
    outputs.clear();
    outputs.reserve(inputs.size());
    
    for (const auto& input : inputs) {
        FrameData output;
        if (!deblurFrame(input, output)) {
            return false;
        }
        outputs.push_back(std::move(output));
    }
    
    return true;
}

// OpenGL Compute Shader Implementation
bool DeblurEngine::initializeComputeShaders() {
    // Initialize GLEW on desktop platforms
#ifndef __ANDROID__
    if (glewInit() != GLEW_OK) {
        return false;
    }
#endif
    
    // Check compute shader support
    if (!GLEW_ARB_compute_shader) {
        return false;
    }
    
    // Create compute shader program
    computeProgram_ = glCreateProgram();
    
    // Wiener Filter Compute Shader Source
    const char* wienerShaderSource = R"GLSL(
        #version 430 core
        layout(local_size_x = 16, local_size_y = 16) in;
        
        layout(binding = 0, r32f) readonly uniform image2D inputImage;
        layout(binding = 1, rg32f) readonly uniform image2D psfImage;
        layout(binding = 2, r32f) writeonly uniform image2D outputImage;
        
        uniform float noiseVariance;
        uniform float snr;
        uniform uvec2 imageSize;
        
        struct Complex {
            float real, imag;
        };
        
        Complex complexMultiply(Complex a, Complex b) {
            return Complex(a.real * b.real - a.imag * b.imag,
                          a.real * b.imag + a.imag * b.real);
        }
        
        Complex complexConjugate(Complex c) {
            return Complex(c.real, -c.imag);
        }
        
        float complexMagnitudeSquared(Complex c) {
            return c.real * c.real + c.imag * c.imag;
        }
        
        void main() {
            uvec2 coord = gl_GlobalInvocationID.xy;
            if (coord.x >= imageSize.x || coord.y >= imageSize.y) {
                return;
            }
            
            // Read input frequency data
            float inputReal = imageLoad(inputImage, ivec2(coord)).r;
            Complex input = Complex(inputReal, 0.0);
            
            // Read PSF frequency data
            vec2 psfData = imageLoad(psfImage, ivec2(coord)).rg;
            Complex psf = Complex(psfData.r, psfData.g);
            
            // Wiener filter: H(f) = G(f) * conj(P(f)) / (|P(f)|^2 + K)
            Complex psfConj = complexConjugate(psf);
            Complex numerator = complexMultiply(input, psfConj);
            
            float K = noiseVariance / snr;
            float denominator = complexMagnitudeSquared(psf) + K;
            
            Complex result = Complex(numerator.real / denominator, 
                                   numerator.imag / denominator);
            
            // Store result (real part only for inverse FFT)
            imageStore(outputImage, ivec2(coord), vec4(result.real, 0.0, 0.0, 1.0));
        }
    )GLSL";
    
    // Compile compute shader
    GLuint shader = compileComputeShader(wienerShaderSource);
    if (!shader) {
        return false;
    }
    
    glAttachShader(computeProgram_, shader);
    glLinkProgram(computeProgram_);
    
    // Check linking status
    GLint linked;
    glGetProgramiv(computeProgram_, GL_LINK_STATUS, &linked);
    if (!linked) {
        glDeleteProgram(computeProgram_);
        glDeleteShader(shader);
        return false;
    }
    
    glDeleteShader(shader);
    
    // Create GPU textures for data transfer
    glGenTextures(1, &inputTexture_);
    glGenTextures(1, &outputTexture_);
    glGenTextures(1, &psfTexture_);
    glGenBuffers(1, &ssboComplex_);
    
    // Configure textures for compute shader access
    glBindTexture(GL_TEXTURE_2D, inputTexture_);
    glTexStorage2D(GL_TEXTURE_2D, 1, GL_R32F, width_, height_);
    glBindTexture(GL_TEXTURE_2D, outputTexture_);
    glTexStorage2D(GL_TEXTURE_2D, 1, GL_R32F, width_, height_);
    glBindTexture(GL_TEXTURE_2D, psfTexture_);
    glTexStorage2D(GL_TEXTURE_2D, 1, GL_RG32F, width_, height_);
    
    glBindTexture(GL_TEXTURE_2D, 0);
    
    return true;
}

void DeblurEngine::cleanupComputeShaders() {
    if (computeProgram_) {
        glDeleteProgram(computeProgram_);
        computeProgram_ = 0;
    }
    
    if (inputTexture_) {
        glDeleteTextures(1, &inputTexture_);
        inputTexture_ = 0;
    }
    
    if (outputTexture_) {
        glDeleteTextures(1, &outputTexture_);
        outputTexture_ = 0;
    }
    
    if (psfTexture_) {
        glDeleteTextures(1, &psfTexture_);
        psfTexture_ = 0;
    }
    
    if (ssboComplex_) {
        glDeleteBuffers(1, &ssboComplex_);
        ssboComplex_ = 0;
    }
}

GLuint DeblurEngine::compileComputeShader(const char* source) {
    GLuint shader = glCreateShader(GL_COMPUTE_SHADER);
    glShaderSource(shader, 1, &source, nullptr);
    glCompileShader(shader);
    
    // Check compilation status
    GLint compiled;
    glGetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
    if (!compiled) {
        GLint logLength;
        glGetShaderiv(shader, GL_INFO_LOG_LENGTH, &logLength);
        
        if (logLength > 0) {
            std::vector<char> log(logLength);
            glGetShaderInfoLog(shader, logLength, nullptr, log.data());
            // In production, log this error
        }
        
        glDeleteShader(shader);
        return 0;
    }
    
    return shader;
}

bool DeblurEngine::processLargeVideoFile(const std::string& inputPath, 
                                       const std::string& outputPath) {
    if (!chunkManager_) {
        return false;
    }
    
    // Initialize chunk manager with video file
    if (!chunkManager_->initializeVideoFile(inputPath, width_, height_, channels_)) {
        return false;
    }
    
    // Enable streaming mode for large files
    chunkManager_->enableStreamingMode(true);
    
    // Process all chunks
    while (!chunkManager_->isStreamingComplete()) {
        if (!chunkManager_->processNextChunk()) {
            break;
        }
        
        // Update progress
        ChunkStats stats = chunkManager_->getStatistics();
        double progress = static_cast<double>(stats.processedChunks) / 
                        static_cast<double>(stats.totalChunks) * 100.0;
        
        // Could emit progress signal here
        std::cout << "Processing progress: " << progress << "%" << std::endl;
    }
    
    return true;
}

bool DeblurEngine::enableChunkProcessing(bool enable) {
    if (!chunkManager_) {
        return false;
    }
    
    if (enable) {
        chunkManager_->enableStreamingMode(true);
    }
    
    return true;
}

bool DeblurEngine::enableStreamingMode(bool enable) {
    if (!videoStreamer_) {
        return false;
    }
    
    if (enable) {
        return videoStreamer_->initialize(width_, height_, channels_);
    } else {
        videoStreamer_->shutdown();
        return true;
    }
}

bool DeblurEngine::enableVulkanAcceleration(bool enable) {
    if (!enable) {
        vulkanContext_.reset();
        vulkanFFT_.reset();
        vulkanWiener_.reset();
        return true;
    }
    
    if (vulkanContext_) {
        return true; // Already enabled
    }
    
    try {
        vulkanContext_ = std::make_unique<VulkanContext>();
        if (vulkanContext_->initialize()) {
            VulkanConfig vkConfig = vulkanContext_->getConfig();
            vulkanFFT_ = std::make_unique<VulkanFFT>(vkConfig);
            vulkanWiener_ = std::make_unique<VulkanWienerFilter>(vkConfig);
            
            return vulkanFFT_->initialize(width_, height_) &&
                   vulkanWiener_->initialize(width_, height_);
        }
    } catch (const std::exception& e) {
        // Vulkan not available
        vulkanContext_.reset();
        vulkanFFT_.reset();
        vulkanWiener_.reset();
    }
    
    return false;
}

bool DeblurEngine::startVideoStream(int width, int height, int channels) {
    if (!videoStreamer_) {
        return false;
    }
    
    return videoStreamer_->initialize(width, height, channels) &&
           videoStreamer_->startStreaming();
}

bool DeblurEngine::streamFrame(const FrameData& frame) {
    if (!videoStreamer_) {
        return false;
    }
    
    // Convert FrameData to VideoFrame
    VideoFrame videoFrame;
    videoFrame.frameNumber = 0; // Will be assigned by streamer
    videoFrame.width = frame.width;
    videoFrame.height = frame.height;
    videoFrame.channels = frame.channels;
    videoFrame.data = frame.data;
    
    return videoStreamer_->addFrame(videoFrame);
}

bool DeblurEngine::getProcessedStreamFrame(FrameData& frame) {
    if (!videoStreamer_) {
        return false;
    }
    
    VideoFrame videoFrame;
    if (!videoStreamer_->getProcessedFrame(videoFrame)) {
        return false;
    }
    
    // Convert VideoFrame back to FrameData
    frame.width = videoFrame.width;
    frame.height = videoFrame.height;
    frame.channels = videoFrame.channels;
    frame.data = videoFrame.data;
    
    return true;
}

void DeblurEngine::stopVideoStream() {
    if (videoStreamer_) {
        videoStreamer_->stopStreaming();
    }
}

void DeblurEngine::setTileConfig(const TileConfig& config) {
    if (chunkManager_) {
        chunkManager_->setTileConfig(config);
    }
}

void DeblurEngine::setStreamConfig(const StreamConfig& config) {
    if (videoStreamer_) {
        // Would need to recreate streamer with new config
        // For now, just store the config
    }
}

TileConfig DeblurEngine::getTileConfig() const {
    if (chunkManager_) {
        return chunkManager_->getTileConfig();
    }
    return TileConfig();
}

StreamConfig DeblurEngine::getStreamConfig() const {
    // Return default config for now
    return StreamConfig();
}

ChunkStats DeblurEngine::getChunkStatistics() const {
    if (chunkManager_) {
        return chunkManager_->getStatistics();
    }
    return ChunkStats();
}

StreamStats DeblurEngine::getStreamStatistics() const {
    if (videoStreamer_) {
        return videoStreamer_->getStatistics();
    }
    return StreamStats();
}

} // namespace kronop

// C Interface for external linking
extern "C" {
    
    typedef void* KronopDeblurHandle;
    
    KronopDeblurHandle kronop_deblur_create(int width, int height, int channels) {
        auto* engine = new kronop::DeblurEngine();
        if (!engine->initialize(width, height, channels, true)) {
            delete engine;
            return nullptr;
        }
        return engine;
    }
    
    void kronop_deblur_destroy(KronopDeblurHandle handle) {
        auto* engine = static_cast<kronop::DeblurEngine*>(handle);
        delete engine;
    }
    
    int kronop_deblur_process(KronopDeblurHandle handle,
                              const uint8_t* input,
                              uint8_t* output,
                              int width, int height, int channels) {
        auto* engine = static_cast<kronop::DeblurEngine*>(handle);
        
        kronop::FrameData inputFrame(width, height, channels);
        inputFrame.data.assign(input, input + width * height * channels);
        
        kronop::FrameData outputFrame;
        if (!engine->deblurFrame(inputFrame, outputFrame)) {
            return -1;
        }
        
        std::memcpy(output, outputFrame.data.data(), outputFrame.data.size());
        return 0;
    }
    
    void kronop_deblur_set_psf(KronopDeblurHandle handle, 
                               double angle, double length, double sigma) {
        auto* engine = static_cast<kronop::DeblurEngine*>(handle);
        kronop::MotionPSF psf(angle, length, sigma);
        engine->setMotionPSF(psf);
    }
    
    void kronop_deblur_set_wiener_params(KronopDeblurHandle handle,
                                         double noiseVar, double snr) {
        auto* engine = static_cast<kronop::DeblurEngine*>(handle);
        kronop::WienerConfig config;
        config.noiseVariance = noiseVar;
        config.snr = snr;
        engine->setWienerConfig(config);
    }
    
    // Advanced C API Extensions
    int kronop_deblur_process_advanced(KronopDeblurHandle handle,
                                      const uint8_t* input,
                                      uint8_t* output,
                                      int width, int height, int channels,
                                      int quality_level,
                                      bool use_gpu) {
        auto* engine = static_cast<kronop::DeblurEngine*>(handle);
        
        if (!engine) {
            return -1; // Invalid handle
        }
        
        try {
            // Validate input parameters
            if (!input || !output || width <= 0 || height <= 0 || channels <= 0 || channels > 4) {
                return -2; // Invalid parameters
            }
            
            // Check for memory constraints
            size_t requiredMemory = width * height * channels * sizeof(uint8_t) * 3; // Input + Output + Temp
            if (engine->getMemoryUsage() + requiredMemory > engine->getMaxMemoryUsage()) {
                return -3; // Memory constraint
            }
            
            // Configure quality settings
            kronop::WienerConfig config = engine->getWienerConfig();
            switch (quality_level) {
                case 0: // Fast
                    config.autoEstimateNoise = false;
                    config.frameHistory = 1;
                    break;
                case 1: // Balanced
                    config.autoEstimateNoise = true;
                    config.frameHistory = 3;
                    break;
                case 2: // High Quality
                    config.autoEstimateNoise = true;
                    config.frameHistory = 5;
                    break;
                default:
                    return -4; // Invalid quality level
            }
            engine->setWienerConfig(config);
            
            // Enable/disable GPU based on request and availability
            engine->enableGPU(use_gpu && engine->isGPUAvailable());
            
            // Process frame with comprehensive error handling
            auto startTime = std::chrono::high_resolution_clock::now();
            
            kronop::FrameData inputFrame(width, height, channels);
            inputFrame.data.assign(input, input + width * height * channels);
            
            kronop::FrameData outputFrame;
            if (!engine->deblurFrame(inputFrame, outputFrame)) {
                return -5; // Processing failed
            }
            
            std::memcpy(output, outputFrame.data.data(), outputFrame.data.size());
            
            auto endTime = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);
            
            // Update performance metrics
            engine->updateProcessingStats(duration.count());
            
            return 0; // Success
            
        } catch (const std::exception& e) {
            // Log error for debugging
            engine->logError("kronop_deblur_process_advanced: " + std::string(e.what()));
            return -6; // Exception occurred
        } catch (...) {
            engine->logError("kronop_deblur_process_advanced: Unknown error");
            return -7; // Unknown exception
        }
    }
    
    int kronop_deblur_process_batch(KronopDeblurHandle handle,
                                   const uint8_t* input_frames,
                                   uint8_t* output_frames,
                                   int width, int height, int channels,
                                   int frame_count) {
        auto* engine = static_cast<kronop::DeblurEngine*>(handle);
        
        if (!engine || !input_frames || !output_frames || frame_count <= 0) {
            return -1;
        }
        
        try {
            std::vector<kronop::FrameData> inputFrames;
            std::vector<kronop::FrameData> outputFrames;
            
            // Prepare batch data
            size_t frameSize = width * height * channels;
            for (int i = 0; i < frame_count; ++i) {
                kronop::FrameData inputFrame(width, height, channels);
                inputFrame.data.assign(input_frames + i * frameSize, 
                                     input_frames + (i + 1) * frameSize);
                inputFrames.push_back(std::move(inputFrame));
                
                outputFrames.emplace_back(width, height, channels);
            }
            
            // Process batch
            if (!engine->deblurBatch(inputFrames, outputFrames)) {
                return -2;
            }
            
            // Copy results back
            for (int i = 0; i < frame_count; ++i) {
                std::memcpy(output_frames + i * frameSize, 
                           outputFrames[i].data.data(), frameSize);
            }
            
            return 0;
            
        } catch (const std::exception& e) {
            engine->logError("kronop_deblur_process_batch: " + std::string(e.what()));
            return -3;
        }
    }
    
    // Performance and monitoring functions
    double kronop_deblur_get_last_processing_time(KronopDeblurHandle handle) {
        auto* engine = static_cast<kronop::DeblurEngine*>(handle);
        return engine ? engine->getLastProcessingTime() : -1.0;
    }
    
    size_t kronop_deblur_get_memory_usage(KronopDeblurHandle handle) {
        auto* engine = static_cast<kronop::DeblurEngine*>(handle);
        return engine ? engine->getMemoryUsage() : 0;
    }
    
    int kronop_deblur_get_performance_stats(KronopDeblurHandle handle, 
                                           double* avg_time, 
                                           double* fps,
                                           size_t* memory_usage) {
        auto* engine = static_cast<kronop::DeblurEngine*>(handle);
        if (!engine || !avg_time || !fps || !memory_usage) {
            return -1;
        }
        
        auto stats = engine->getPerformanceStats();
        *avg_time = stats.averageProcessingTime;
        *fps = stats.currentFPS;
        *memory_usage = stats.memoryUsage;
        
        return 0;
    }
    
    // Advanced configuration functions
    int kronop_deblur_configure_advanced(KronopDeblurHandle handle,
                                        const KronopAdvancedConfig* config) {
        auto* engine = static_cast<kronop::DeblurEngine*>(handle);
        if (!engine || !config) {
            return -1;
        }
        
        try {
            // Configure advanced settings
            kronop::WienerConfig wienerConfig;
            wienerConfig.noiseVariance = config->noise_variance;
            wienerConfig.snr = config->snr;
            wienerConfig.gamma = config->gamma;
            wienerConfig.autoEstimateNoise = config->auto_estimate_noise;
            wienerConfig.frameHistory = config->frame_history;
            engine->setWienerConfig(wienerConfig);
            
            kronop::MotionPSF psf;
            psf.angle = config->psf_angle;
            psf.length = config->psf_length;
            psf.sigma = config->psf_sigma;
            psf.width = config->psf_width;
            psf.height = config->psf_height;
            engine->setMotionPSF(psf);
            
            // Configure sharpening
            kronop::SharpeningConfig sharpenConfig;
            sharpenConfig.strength = config->sharpening_strength;
            sharpenConfig.radius = config->sharpening_radius;
            sharpenConfig.threshold = config->sharpening_threshold;
            sharpenConfig.adaptive = config->adaptive_sharpening;
            sharpenConfig.haloReduction = config->halo_reduction;
            engine->setSharpeningConfig(sharpenConfig);
            
            // Configure optical flow
            kronop::OpticalFlowConfig flowConfig;
            flowConfig.pyramidLevels = config->optical_flow_levels;
            flowConfig.windowSize = config->optical_flow_window;
            flowConfig.maxFlow = config->optical_flow_max;
            flowConfig.useTemporalFilter = config->temporal_filtering;
            flowConfig.temporalAlpha = config->temporal_alpha;
            engine->setOpticalFlowConfig(flowConfig);
            
            return 0;
            
        } catch (const std::exception& e) {
            engine->logError("kronop_deblur_configure_advanced: " + std::string(e.what()));
            return -2;
        }
    }
    
    // Streaming API for real-time processing
    KronopStreamHandle kronop_stream_create(int width, int height, int channels) {
        try {
            auto* stream = new kronop::VideoStreamer(width, height, channels);
            if (!stream->initialize()) {
                delete stream;
                return nullptr;
            }
            return stream;
        } catch (...) {
            return nullptr;
        }
    }
    
    void kronop_stream_destroy(KronopStreamHandle handle) {
        auto* stream = static_cast<kronop::VideoStreamer*>(handle);
        delete stream;
    }
    
    int kronop_stream_process_frame(KronopStreamHandle handle,
                                   const uint8_t* input_frame,
                                   uint8_t* output_frame) {
        auto* stream = static_cast<kronop::VideoStreamer*>(handle);
        if (!stream || !input_frame || !output_frame) {
            return -1;
        }
        
        return stream->processFrame(input_frame, output_frame) ? 0 : -2;
    }
    
    int kronop_stream_get_stats(KronopStreamHandle handle,
                               double* current_fps,
                               double* avg_processing_time,
                               int* frames_processed) {
        auto* stream = static_cast<kronop::VideoStreamer*>(handle);
        if (!stream || !current_fps || !avg_processing_time || !frames_processed) {
            return -1;
        }
        
        auto stats = stream->getStatistics();
        *current_fps = stats.currentFPS;
        *avg_processing_time = stats.averageProcessingTime;
        *frames_processed = stats.framesProcessed;
        
        return 0;
    }
    
    // Utility functions
    const char* kronop_get_version() {
        return KRONOP_VERSION;
    }
    
    const char* kronop_get_build_info() {
        static std::string buildInfo = 
            "Kronop Cleaner AI " KRONOP_VERSION "\n"
            "Build: " __DATE__ " " __TIME__ "\n"
            "Compiler: " + std::string(__VERSION__) + "\n"
            "Platform: " +
#ifdef __ANDROID__
            "Android ARM64"
#elif defined(__linux__)
            "Linux x86_64"
#elif defined(_WIN32)
            "Windows x64"
#elif defined(__APPLE__)
            "macOS ARM64"
#else
            "Unknown"
#endif
        ;
        return buildInfo.c_str();
    }
    
    int kronop_get_system_info(KronopSystemInfo* info) {
        if (!info) return -1;
        
        try {
            // Get CPU info
            info->cpu_cores = std::thread::hardware_concurrency();
            
            // Get memory info
            info->total_memory = 0; // Would need platform-specific implementation
            info->available_memory = 0;
            
            // Get GPU info
            info->gpu_available = false;
            info->gpu_memory = 0;
            info->gpu_name[0] = '\0';
            
#ifdef __ANDROID__
            // Android-specific GPU detection
            // Would need EGL/GL calls to get GPU info
#endif
            
            return 0;
            
        } catch (...) {
            return -2;
        }
    }
    
    // Error handling and logging
    const char* kronop_get_last_error(KronopDeblurHandle handle) {
        auto* engine = static_cast<kronop::DeblurEngine*>(handle);
        return engine ? engine->getLastError().c_str() : "Invalid handle";
    }
    
    void kronop_set_log_level(int level) {
        kronop::Logger::setLogLevel(static_cast<kronop::LogLevel>(level));
    }
    
    void kronop_set_log_callback(void (*callback)(int level, const char* message)) {
        kronop::Logger::setCallback(callback);
    }
    
    // Memory management utilities
    void* kronop_malloc(size_t size) {
        return kronop::MemoryManager::allocate(size);
    }
    
    void kronop_free(void* ptr) {
        kronop::MemoryManager::deallocate(ptr);
    }
    
    size_t kronop_get_memory_pool_size() {
        return kronop::MemoryManager::getPoolSize();
    }
    
    size_t kronop_get_memory_pool_used() {
        return kronop::MemoryManager::getUsedSize();
    }
    
    // Performance profiling
    void kronop_profiler_start(const char* name) {
        kronop::Profiler::getInstance().startSession(name);
    }
    
    void kronop_profiler_stop() {
        kronop::Profiler::getInstance().endSession();
    }
    
    const char* kronop_profiler_get_report() {
        return kronop::Profiler::getInstance().getReport().c_str();
    }
    
    void kronop_profiler_reset() {
        kronop::Profiler::getInstance().reset();
    }
    
    // Advanced features
    int kronop_enable_feature(KronopDeblurHandle handle, int feature, bool enable) {
        auto* engine = static_cast<kronop::DeblurEngine*>(handle);
        if (!engine) return -1;
        
        try {
            switch (feature) {
                case KRONOP_FEATURE_DYNAMIC_PSF:
                    engine->enableDynamicPSF(enable);
                    break;
                case KRONOP_FEATURE_SMART_SHARPENING:
                    engine->enableSmartSharpening(enable);
                    break;
                case KRONOP_FEATURE_CHUNK_PROCESSING:
                    engine->enableChunkProcessing(enable);
                    break;
                case KRONOP_FEATURE_STREAMING_MODE:
                    engine->enableStreamingMode(enable);
                    break;
                case KRONOP_FEATURE_VULKAN_ACCELERATION:
                    engine->enableVulkanAcceleration(enable);
                    break;
                default:
                    return -2; // Unknown feature
            }
            return 0;
        } catch (...) {
            return -3;
        }
    }
    
    int kronop_process_large_video(KronopDeblurHandle handle,
                                  const char* input_path,
                                  const char* output_path) {
        auto* engine = static_cast<kronop::DeblurEngine*>(handle);
        if (!engine || !input_path || !output_path) {
            return -1;
        }
        
        try {
            return engine->processLargeVideoFile(input_path, output_path) ? 0 : -2;
        } catch (...) {
            return -3;
        }
    }
    
    // Quality assessment
    double kronop_assess_quality(const uint8_t* input,
                                const uint8_t* output,
                                int width, int height, int channels) {
        if (!input || !output || width <= 0 || height <= 0 || channels <= 0) {
            return -1.0;
        }
        
        try {
            kronop::QualityAssessor assessor;
            return assessor.computeQualityScore(input, output, width, height, channels);
        } catch (...) {
            return -1.0;
        }
    }
    
    // Benchmark utilities
    int kronop_run_benchmark(KronopDeblurHandle handle,
                           int width, int height, int channels,
                           int iterations,
                           double* avg_time,
                           double* min_time,
                           double* max_time) {
        auto* engine = static_cast<kronop::DeblurEngine*>(handle);
        if (!engine || !avg_time || !min_time || !max_time || iterations <= 0) {
            return -1;
        }
        
        try {
            std::vector<double> times;
            times.reserve(iterations);
            
            // Create test data
            std::vector<uint8_t> testData(width * height * channels);
            std::vector<uint8_t> outputData(width * height * channels);
            
            // Fill with test pattern
            for (size_t i = 0; i < testData.size(); ++i) {
                testData[i] = static_cast<uint8_t>((i * 7) % 256);
            }
            
            for (int i = 0; i < iterations; ++i) {
                auto start = std::chrono::high_resolution_clock::now();
                
                kronop::FrameData inputFrame(width, height, channels);
                inputFrame.data = testData;
                
                kronop::FrameData outputFrame;
                if (!engine->deblurFrame(inputFrame, outputFrame)) {
                    return -2;
                }
                
                auto end = std::chrono::high_resolution_clock::now();
                auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
                times.push_back(duration.count() / 1000.0); // Convert to milliseconds
            }
            
            // Calculate statistics
            *avg_time = 0.0;
            *min_time = times[0];
            *max_time = times[0];
            
            for (double time : times) {
                *avg_time += time;
                *min_time = std::min(*min_time, time);
                *max_time = std::max(*max_time, time);
            }
            
            *avg_time /= iterations;
            
            return 0;
            
        } catch (...) {
            return -3;
        }
    }
}
