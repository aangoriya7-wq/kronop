/**
 * AudioVideoSync.hpp
 * Advanced Audio-Video Synchronization System
 * Maintains perfect timing between processed video and original audio
 */

#ifndef AUDIO_VIDEO_SYNC_HPP
#define AUDIO_VIDEO_SYNC_HPP

#include <vector>
#include <memory>
#include <chrono>
#include <mutex>
#include <queue>
#include <atomic>
#include <thread>
#include <condition_variable>

namespace kronop {

/**
 * Audio Frame Information
 */
struct AudioFrame {
    int64_t timestamp;          // Timestamp in microseconds
    std::vector<float> samples; // Audio samples (interleaved)
    int channels;              // Number of audio channels
    int sampleRate;            // Sample rate in Hz
    size_t sampleCount;        // Number of samples
    
    AudioFrame(int64_t ts = 0, int ch = 2, int sr = 44100)
        : timestamp(ts), channels(ch), sampleRate(sr), sampleCount(0) {}
};

/**
 * Video Frame Information with Timing
 */
struct VideoFrameSync {
    int64_t timestamp;          // Original timestamp
    int64_t processedTimestamp; // After processing timestamp
    std::vector<uint8_t> data; // Video frame data
    int width;                  // Frame width
    int height;                 // Frame height
    int channels;               // Number of color channels
    double processingDelay;     // Processing delay in ms
    
    VideoFrameSync(int64_t ts = 0, int w = 0, int h = 0, int ch = 3)
        : timestamp(ts), processedTimestamp(0), width(w), height(h), 
          channels(ch), processingDelay(0.0) {}
};

/**
 * Synchronization Configuration
 */
struct SyncConfig {
    double maxAllowedDrift;     // Maximum allowed drift in ms
    double bufferDuration;      // Buffer duration in seconds
    bool enableTimeStretching;  // Enable audio time stretching
    bool enableFrameDropping;   // Enable frame dropping for sync
    double syncThreshold;       // Sync threshold in ms
    
    SyncConfig()
        : maxAllowedDrift(40.0), bufferDuration(0.5), 
          enableTimeStretching(true), enableFrameDropping(true),
          syncThreshold(20.0) {}
};

/**
 * Audio-Video Synchronizer
 */
class AudioVideoSynchronizer {
public:
    explicit AudioVideoSynchronizer(const SyncConfig& config = SyncConfig());
    ~AudioVideoSynchronizer();
    
    // Initialization
    bool initialize(int videoFPS, int audioSampleRate, int audioChannels);
    void shutdown();
    
    // Frame input
    void addVideoFrame(const VideoFrameSync& frame);
    void addAudioFrame(const AudioFrame& frame);
    
    // Synchronized output
    bool getSynchronizedFrames(VideoFrameSync& videoFrame, AudioFrame& audioFrame);
    bool getNextVideoFrame(VideoFrameSync& frame);
    bool getNextAudioFrame(AudioFrame& frame);
    
    // Synchronization control
    void setTargetDelay(double delayMs);
    double getCurrentDrift() const;
    void resetSync();
    
    // Statistics
    struct SyncStats {
        double avgVideoDelay;     // Average video processing delay
        double avgAudioDelay;     // Average audio delay
        double currentDrift;      // Current audio-video drift
        int droppedVideoFrames;   // Number of dropped video frames
        int stretchedAudioFrames; // Number of stretched audio frames
        double syncQuality;       // Sync quality score (0-100)
    };
    
    SyncStats getStatistics() const;
    void resetStatistics();
    
    // Real-time adjustments
    void enableAdaptiveSync(bool enable);
    void setSyncMode(int mode); // 0=strict, 1=balanced, 2=relaxed

private:
    SyncConfig config_;
    
    // Timing information
    int videoFPS_;
    int audioSampleRate_;
    int audioChannels_;
    double frameDuration_;       // Video frame duration in ms
    double audioFrameDuration_;   // Audio frame duration in ms
    
    // Buffers
    std::queue<VideoFrameSync> videoBuffer_;
    std::queue<AudioFrame> audioBuffer_;
    mutable std::mutex videoMutex_;
    mutable std::mutex audioMutex_;
    
    // Synchronization state
    std::atomic<int64_t> videoTimeBase_;
    std::atomic<int64_t> audioTimeBase_;
    std::atomic<double> currentDrift_;
    std::atomic<bool> syncEnabled_;
    
    // Adaptive sync
    std::atomic<bool> adaptiveSyncEnabled_;
    std::atomic<int> syncMode_;
    std::unique_ptr<std::thread> syncThread_;
    std::atomic<bool> syncThreadActive_;
    
    // Statistics
    mutable std::mutex statsMutex_;
    SyncStats stats_;
    
    // Internal methods
    void initializeTimeBases();
    void calculateDrift();
    void adjustForDrift();
    bool shouldDropVideoFrame();
    bool shouldStretchAudioFrame();
    
    // Audio processing
    void timeStretchAudio(AudioFrame& frame, double ratio);
    void applyAudioFade(AudioFrame& frame, double fadeIn, double fadeOut);
    
    // Sync thread
    void syncThreadFunction();
    void performAdaptiveSync();
    
    // Utility methods
    int64_t getCurrentTime() const;
    double calculateExpectedAudioTime(int64_t videoTimestamp) const;
    double calculateExpectedVideoTime(int64_t audioTimestamp) const;
};

/**
 * Audio Time Stretcher
 * High-quality audio time stretching for synchronization
 */
class AudioTimeStretcher {
public:
    explicit AudioTimeStretcher(int sampleRate, int channels);
    ~AudioTimeStretcher();
    
    // Time stretching
    bool stretchAudio(const std::vector<float>& input, 
                     std::vector<float>& output, 
                     double ratio);
    
    // Configuration
    void setStretchQuality(int quality); // 0=fast, 1=good, 2=best
    void setPitchCorrection(bool enable);
    
    // Processing
    void reset();
    size_t getLatency() const;

private:
    int sampleRate_;
    int channels_;
    int stretchQuality_;
    bool pitchCorrectionEnabled_;
    
    // WSOLA algorithm implementation
    std::vector<float> overlapBuffer_;
    std::vector<float> synthesisBuffer_;
    size_t hopSize_;
    size_t frameSize_;
    
    // Internal processing
    void findBestOverlap(const std::vector<float>& input, 
                        size_t& bestOffset);
    void overlapAdd(const std::vector<float>& frame1,
                    const std::vector<float>& frame2,
                    std::vector<float>& output);
    
    // Window functions
    void generateHannWindow(std::vector<float>& window, size_t size);
    void applyWindow(std::vector<float>& data, const std::vector<float>& window);
};

/**
 * Frame Rate Converter
 * Converts video frame rates while maintaining sync
 */
class FrameRateConverter {
public:
    explicit FrameRateConverter(int inputFPS, int outputFPS);
    ~FrameRateConverter();
    
    // Frame conversion
    bool convertFrame(const VideoFrameSync& input, 
                      std::vector<VideoFrameSync>& output);
    
    // Configuration
    void setInterpolationMethod(int method); // 0=nearest, 1=linear, 2=motion
    void setMotionCompensation(bool enable);

private:
    int inputFPS_;
    int outputFPS_;
    double conversionRatio_;
    int interpolationMethod_;
    bool motionCompensationEnabled_;
    
    // Frame interpolation
    VideoFrameSync interpolateFrames(const VideoFrameSync& frame1,
                                   const VideoFrameSync& frame2,
                                   double position);
    
    // Motion estimation
    void estimateMotion(const VideoFrameSync& frame1,
                       const VideoFrameSync& frame2,
                       std::vector<std::pair<double, double>>& motionVectors);
};

/**
 * Sync Quality Monitor
 * Monitors and reports synchronization quality
 */
class SyncQualityMonitor {
public:
    explicit SyncQualityMonitor();
    ~SyncQualityMonitor();
    
    // Quality measurement
    void addSyncPoint(double videoTime, double audioTime);
    double getCurrentQuality() const;
    double getAverageQuality() const;
    
    // Quality reporting
    struct QualityReport {
        double currentQuality;    // Current quality score
        double averageQuality;    // Average quality score
        double peakDrift;         // Peak drift observed
        double avgDrift;          // Average drift
        int syncErrors;           // Number of sync errors
        double uptime;            // System uptime percentage
    };
    
    QualityReport generateReport() const;
    void reset();

private:
    std::vector<std::pair<double, double>> syncPoints_;
    mutable std::mutex pointsMutex_;
    
    // Quality metrics
    double currentQuality_;
    double averageQuality_;
    double peakDrift_;
    double totalDrift_;
    int syncErrors_;
    int totalSamples_;
    
    // Time tracking
    std::chrono::steady_clock::time_point startTime_;
    
    // Internal methods
    double calculateQualityScore(double drift) const;
    void updateQualityMetrics();
};

} // namespace kronop

#endif // AUDIO_VIDEO_SYNC_HPP
