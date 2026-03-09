#ifndef AI_SHARPNESS_ENGINE_H
#define AI_SHARPNESS_ENGINE_H

#include <vector>
#include <memory>
#include <string>

#ifdef ANDROID
#include <android/log.h>
#include <nnapi/NeuralNetworks.h>
#elif IOS
#include <CoreML/CoreML.h>
#import <Metal/Metal.h>
#import <MetalPerformanceShaders/MetalPerformanceShaders.h>
#endif

/**
 * AI Sharpness Engine for Real-time Video Enhancement
 * 
 * This class provides AI-powered video enhancement capabilities including:
 * - Real-time upscaling using AI super-resolution
 * - Edge enhancement and sharpening
 * - Noise reduction for crystal clear output
 * - Dynamic bitrate enhancement
 * - NPU integration with GPU fallback
 * 
 * Performance Requirements:
 * - All processing must complete within 16ms (60 FPS)
 * - Automatic bypass when processing exceeds time budget
 * - Support for Android NNAPI and iOS CoreML
 */
class AISharpnessEngine {
public:
    /**
     * Constructor
     */
    AISharpnessEngine();
    
    /**
     * Destructor
     */
    ~AISharpnessEngine();
    
    /**
     * Initialize the AI Sharpness Engine
     * @return true if initialization successful, false otherwise
     */
    bool initialize();
    
    /**
     * Process a video frame with AI enhancement
     * @param inputData Input frame data (RGBA format)
     * @param outputData Output frame data (enhanced)
     * @param width Frame width
     * @param height Frame height
     * @param quality Input quality factor (0.0 - 1.0)
     * @return true if processing successful, false otherwise
     */
    bool processFrame(uint8_t* inputData, uint8_t* outputData, 
                     int width, int height, float quality);
    
    /**
     * Get average processing time in milliseconds
     * @return Average processing time
     */
    float getAverageProcessingTime();
    
    /**
     * Check if AI processing should be bypassed due to performance constraints
     * @return true if should bypass, false otherwise
     */
    bool shouldBypass();
    
    /**
     * Get current performance metrics
     * @return Processing time in milliseconds
     */
    float getCurrentProcessingTime() const { return processingTimeMs; }
    
    /**
     * Get total number of frames processed
     * @return Frame count
     */
    int getFrameCount() const { return frameCount; }
    
    /**
     * Check if engine is initialized
     * @return true if initialized, false otherwise
     */
    bool isInitialized() const { return isInitialized; }
    
    /**
     * Check if NPU is available and being used
     * @return true if NPU is available, false otherwise
     */
    bool isNPUAvailable() const { return useNPU; }
    
    /**
     * Cleanup resources
     */
    void cleanup();

private:
    // Initialization methods
    bool initializeNPU();
    bool initializeGPUFallback();
    bool loadAIModels();
    void initializeBuffers();
    
    // Processing methods
    bool processWithNPU(int width, int height, float quality);
    bool processWithCoreML(int width, int height, float quality);
    bool processWithGPU(int width, int height, float quality);
    bool applyGPUShaders(int width, int height, float quality);
    
    // Platform-specific implementations
#ifdef ANDROID
    bool processWithNNAPI(int width, int height, float quality);
    ANeuralNetworksModel* nnapiModel = nullptr;
    ANeuralNetworksCompilation* nnapiCompilation = nullptr;
#elif IOS
    bool processWithCoreMLImpl(int width, int height, float quality);
    MLModel* coreMLModel = nullptr;
#endif
    
    // Member variables
    bool isInitialized;
    bool useNPU;
    float processingTimeMs;
    float bypassThreshold;
    
    // Performance tracking
    int frameCount;
    float totalProcessingTime;
    
    // Processing buffers
    std::vector<uint8_t> inputBuffer;
    std::vector<uint8_t> outputBuffer;
    std::vector<uint8_t> tempBuffer;
    
    // Constants
    static constexpr float DEFAULT_BYPASS_THRESHOLD = 16.0f; // 16ms for 60 FPS
    static constexpr int DEFAULT_FRAME_WIDTH = 1920;
    static constexpr int DEFAULT_FRAME_HEIGHT = 1080;
    static constexpr int BUFFER_SIZE_MULTIPLIER = 3; // Triple buffering
};

/**
 * AI Enhancement Configuration Structure
 */
struct AIEnhancementConfig {
    float edgeEnhancementStrength = 1.5f;      // Edge enhancement strength
    float noiseReductionLevel = 0.8f;         // Noise reduction level
    bool superResolutionEnabled = true;        // Enable AI super-resolution
    bool dynamicBitrateBoost = true;          // Enable dynamic bitrate enhancement
    float maxProcessingTimeMs = 16.0f;       // Maximum processing time budget
    bool fallbackToGPU = true;                 // Enable GPU fallback
    bool crystalClearMode = true;              // Enable crystal clear processing
    float upscalingFactor = 1.0f;             // Real-time upscaling factor
    bool realTimeUpscaling = true;             // Enable real-time upscaling
    bool bypassOnDelay = true;                // Bypass on processing delay
};

/**
 * Performance Metrics Structure
 */
struct AIPerformanceMetrics {
    float averageProcessingTime = 0.0f;        // Average processing time
    float currentProcessingTime = 0.0f;        // Current frame processing time
    int totalFramesProcessed = 0;             // Total frames processed
    int droppedFrames = 0;                     // Number of dropped frames
    float npuUtilization = 0.0f;              // NPU utilization percentage
    float gpuUtilization = 0.0f;              // GPU utilization percentage
    bool thermalThrottling = false;            // Thermal throttling status
    float memoryUsageMB = 0.0f;               // Memory usage in MB
};

#endif // AI_SHARPNESS_ENGINE_H
