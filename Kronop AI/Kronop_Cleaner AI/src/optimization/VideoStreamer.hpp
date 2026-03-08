/**
 * VideoStreamer.hpp
 * Real-time Video Streaming Support for Kronop Cleaner
 * High-performance chunk processing with buffering
 */

#ifndef VIDEO_STREAMER_HPP
#define VIDEO_STREAMER_HPP

#include <memory>
#include <thread>
#include <queue>
#include <mutex>
#include <condition_variable>
#include <atomic>
#include <functional>
#include <chrono>

namespace kronop {

/**
 * Stream Configuration
 */
struct StreamConfig {
    int bufferSizeFrames;          // Buffer size in frames
    int maxChunkSize;             // Maximum chunk size in frames
    int processingThreads;        // Number of processing threads
    double targetFPS;             // Target processing FPS
    bool enableRealTimeMode;       // Real-time processing mode
    bool enableAdaptiveQuality;    // Adaptive quality adjustment
    int maxConcurrentChunks;       // Maximum concurrent chunks
    
    StreamConfig()
        : bufferSizeFrames(30), maxChunkSize(10), processingThreads(4),
          targetFPS(30.0), enableRealTimeMode(true), enableAdaptiveQuality(true),
          maxConcurrentChunks(3) {}
};

/**
 * Video Frame Information
 */
struct VideoFrame {
    int frameNumber;              // Frame sequence number
    int width;                    // Frame width
    int height;                   // Frame height
    int channels;                 // Number of channels
    std::vector<uint8_t> data;   // Frame data
    std::chrono::high_resolution_clock::time_point timestamp; // Capture timestamp
    double processingTime;        // Processing time in ms
    bool isProcessed;             // Processing status
    
    VideoFrame(int num = 0, int w = 0, int h = 0, int c = 3)
        : frameNumber(num), width(w), height(h), channels(c),
          processingTime(0.0), isProcessed(false) {
        timestamp = std::chrono::high_resolution_clock::now();
        data.resize(w * h * c);
    }
};

/**
 * Stream Chunk Information
 */
struct StreamChunk {
    int chunkId;                  // Unique chunk identifier
    int startFrame;                // Starting frame number
    int endFrame;                  // Ending frame number
    std::vector<VideoFrame> frames; // Frames in this chunk
    std::chrono::high_resolution_clock::time_point startTime; // Processing start
    std::chrono::high_resolution_clock::time_point endTime;   // Processing end
    double totalProcessingTime;    // Total processing time
    bool isCompleted;              // Completion status
    int priority;                  // Processing priority (higher = more important)
    
    StreamChunk(int id = 0, int start = 0, int end = 0)
        : chunkId(id), startFrame(start), endFrame(end),
          totalProcessingTime(0.0), isCompleted(false), priority(0) {
        startTime = std::chrono::high_resolution_clock::now();
    }
};

/**
 * Stream Statistics
 */
struct StreamStats {
    int totalFramesProcessed;      // Total frames processed
    int totalChunksProcessed;      // Total chunks processed
    double currentFPS;             // Current processing FPS
    double averageProcessingTime;   // Average processing time per frame
    double bufferUtilization;      // Buffer utilization percentage
    size_t memoryUsage;           // Current memory usage
    size_t peakMemoryUsage;        // Peak memory usage
    int droppedFrames;             // Number of dropped frames
    double qualityScore;           // Current quality score (0-100)
    
    StreamStats()
        : totalFramesProcessed(0), totalChunksProcessed(0), currentFPS(0.0),
          averageProcessingTime(0.0), bufferUtilization(0.0), memoryUsage(0),
          peakMemoryUsage(0), droppedFrames(0), qualityScore(100.0) {}
};

/**
 * Frame Processing Callback
 */
using FrameProcessorCallback = std::function<bool(VideoFrame& frame)>;

/**
 * Chunk Processing Callback
 */
using ChunkProcessorCallback = std::function<bool(StreamChunk& chunk)>;

/**
 * Real-time Video Streamer
 * High-performance streaming with adaptive buffering
 */
class VideoStreamer {
public:
    explicit VideoStreamer(const StreamConfig& config = StreamConfig());
    ~VideoStreamer();
    
    // Stream lifecycle
    bool initialize(int width, int height, int channels);
    void shutdown();
    
    // Frame input/output
    bool addFrame(const VideoFrame& frame);
    bool getProcessedFrame(VideoFrame& frame);
    bool getNextChunk(StreamChunk& chunk);
    
    // Processing configuration
    void setFrameProcessor(FrameProcessorCallback callback);
    void setChunkProcessor(ChunkProcessorCallback callback);
    
    // Stream control
    bool startStreaming();
    void stopStreaming();
    void pauseStreaming();
    void resumeStreaming();
    
    // Adaptive quality
    void setTargetFPS(double fps);
    void setQualityLevel(double quality); // 0.0 to 1.0
    void enableAdaptiveQuality(bool enable);
    
    // Buffer management
    void setBufferSize(int size);
    void setMaxChunkSize(int size);
    int getBufferUtilization() const;
    
    // Statistics
    StreamStats getStatistics() const;
    void resetStatistics();
    
    // Stream health
    bool isStreamHealthy() const;
    bool isBufferFull() const;
    bool isBufferEmpty() const;
    double getLatency() const;

private:
    StreamConfig config_;
    int videoWidth_;
    int videoHeight_;
    int videoChannels_;
    
    // Buffers
    std::queue<VideoFrame> inputBuffer_;
    std::queue<VideoFrame> outputBuffer_;
    std::queue<StreamChunk> chunkQueue_;
    std::queue<StreamChunk> completedChunks_;
    
    // Thread management
    std::vector<std::unique_ptr<std::thread>> processingThreads_;
    std::unique_ptr<std::thread> chunkingThread_;
    std::unique_ptr<std::thread> monitoringThread_;
    
    // Synchronization
    std::mutex inputMutex_;
    std::mutex outputMutex_;
    std::mutex chunkMutex_;
    std::mutex statsMutex_;
    std::mutex processingMutex_; // Added for thread safety
    std::condition_variable inputCondition_;
    std::condition_variable outputCondition_;
    std::condition_variable chunkCondition_;
    
    // Stream state
    std::atomic<bool> streamingActive_;
    std::atomic<bool> streamingPaused_;
    std::atomic<bool> streamHealthy_;
    
    // Processing callbacks
    FrameProcessorCallback frameProcessor_;
    ChunkProcessorCallback chunkProcessor_;
    
    // Statistics
    mutable std::mutex statsMutex_;
    StreamStats stats_;
    std::chrono::high_resolution_clock::time_point lastStatsUpdate_;
    
    // Adaptive quality
    std::atomic<double> currentQuality_;
    std::atomic<double> targetFPS_;
    std::chrono::high_resolution_clock::time_point lastQualityAdjustment_;
    
    // Frame tracking
    std::atomic<int> nextFrameNumber_;
    std::atomic<int> nextChunkId_;
    
    // Internal methods
    void processingThreadFunction(int threadId);
    void chunkingThreadFunction();
    void monitoringThreadFunction();
    
    // Chunk management
    void createChunk();
    void processChunk(StreamChunk& chunk);
    void completeChunk(StreamChunk& chunk);
    
    // Frame processing
    bool processFrame(VideoFrame& frame);
    void updateFrameStatistics(const VideoFrame& frame);
    
    // Adaptive quality
    void adjustQuality();
    void updateProcessingParameters();
    
    // Statistics
    void updateStatistics();
    void calculateLatency();
    void updateBufferUtilization();
    
    // Memory management
    void cleanupOldFrames();
    void optimizeMemoryUsage();
    size_t getCurrentMemoryUsage() const;
};

/**
 * Adaptive Quality Manager
 * Dynamically adjusts processing quality based on performance
 */
class AdaptiveQualityManager {
public:
    explicit AdaptiveQualityManager(double targetFPS = 30.0);
    
    // Quality control
    void setTargetFPS(double fps);
    void setPerformanceRange(double minFPS, double maxFPS);
    void setQualityRange(double minQuality, double maxQuality);
    
    // Quality adjustment
    double calculateOptimalQuality(double currentFPS, double currentQuality);
    void updatePerformance(double fps, double processingTime);
    
    // Configuration
    void setAggressiveness(double aggressiveness); // 0.0 to 1.0
    void enablePredictiveAdjustment(bool enable);
    
    // Statistics
    double getCurrentQuality() const;
    double getPredictedFPS() const;
    bool isQualityStable() const;

private:
    double targetFPS_;
    double minFPS_;
    double maxFPS_;
    double minQuality_;
    double maxQuality_;
    double aggressiveness_;
    bool enablePredictive_;
    
    // Performance history
    std::vector<std::pair<double, double>> performanceHistory_;
    static constexpr size_t MAX_HISTORY_SIZE = 100;
    
    // Current state
    double currentQuality_;
    double lastFPS_;
    double lastProcessingTime_;
    
    // Predictive model
    std::vector<double> qualityWeights_;
    
    // Internal methods
    double calculatePerformanceScore(double fps, double quality);
    void updatePerformanceHistory(double fps, double quality);
    double predictPerformance(double quality);
    void smoothQualityAdjustment(double& newQuality);
};

/**
 * Stream Buffer Manager
 * Efficient buffer management for streaming
 */
class StreamBufferManager {
public:
    explicit StreamBufferManager(size_t maxMemoryMB = 512);
    
    // Buffer allocation
    bool allocateFrameBuffer(VideoFrame& frame);
    bool allocateChunkBuffer(StreamChunk& chunk, int frameCount);
    
    // Memory management
    void deallocateFrameBuffer(VideoFrame& frame);
    void deallocateChunkBuffer(StreamChunk& chunk);
    
    // Buffer optimization
    void optimizeBuffers();
    void cleanupOldBuffers();
    
    // Statistics
    size_t getUsedMemory() const;
    size_t getAvailableMemory() const;
    double getUtilization() const;
    
    // Configuration
    void setMaxMemory(size_t maxMemoryMB);
    void setCleanupThreshold(double threshold);

private:
    size_t maxMemory_;
    size_t usedMemory_;
    double cleanupThreshold_;
    
    // Buffer tracking
    std::vector<VideoFrame*> activeFrames_;
    std::vector<StreamChunk*> activeChunks_;
    
    // Memory pools
    std::vector<std::vector<uint8_t>> framePool_;
    std::vector<std::vector<uint8_t>> chunkPool_;
    
    // Internal methods
    bool allocateFromPool(size_t size, std::vector<uint8_t>& buffer);
    void returnToPool(std::vector<uint8_t>& buffer);
    void cleanupExpiredBuffers();
    size_t calculateFrameSize(const VideoFrame& frame);
    size_t calculateChunkSize(const StreamChunk& chunk);
};

/**
 * Real-time Stream Monitor
 * Monitors stream health and performance
 */
class StreamMonitor {
public:
    explicit StreamMonitor(const VideoStreamer* streamer);
    
    // Monitoring
    void startMonitoring();
    void stopMonitoring();
    
    // Health checks
    bool isStreamHealthy() const;
    double getStreamQuality() const;
    std::vector<std::string> getHealthIssues() const;
    
    // Performance metrics
    double getCurrentLatency() const;
    double getBufferHealth() const;
    double getProcessingEfficiency() const;
    
    // Alerts
    void setAlertThresholds(double maxLatency, double minFPS, double maxBufferUtilization);
    bool hasAlerts() const;
    std::vector<std::string> getActiveAlerts() const;

private:
    const VideoStreamer* streamer_;
    std::unique_ptr<std::thread> monitorThread_;
    std::atomic<bool> monitoringActive_;
    
    // Alert thresholds
    double maxLatency_;
    double minFPS_;
    double maxBufferUtilization_;
    
    // Health tracking
    std::atomic<bool> streamHealthy_;
    std::vector<std::string> healthIssues_;
    std::vector<std::string> activeAlerts_;
    
    // Performance history
    std::vector<double> latencyHistory_;
    std::vector<double> fpsHistory_;
    std::vector<double> bufferHistory_;
    static constexpr size_t HISTORY_SIZE = 60; // 1 minute at 1Hz
    
    // Internal methods
    void monitorThreadFunction();
    void performHealthCheck();
    void updatePerformanceHistory();
    void checkAlerts();
    void generateHealthReport();
};

} // namespace kronop

#endif // VIDEO_STREAMER_HPP
