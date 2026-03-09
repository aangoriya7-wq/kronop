#ifndef ATOMIC_SYNC_H
#define ATOMIC_SYNC_H

#include <vector>
#include <memory>
#include <thread>
#include <atomic>
#include <mutex>

#ifdef ANDROID
#include <aaudio/AAudio.h>
#elif IOS
#include <AudioUnit/AudioUnit.h>
#endif

/**
 * Atomic Synchronization System for Perfect Audio-Video Sync
 * 
 * This class provides atomic-level synchronization between audio and video streams
 * with master clock logic, jitter buffering, and hardware latency compensation.
 * 
 * Key Features:
 * - Master Clock Logic: Single source of truth for timing
 * - Jitter Buffer: Handles network variations and prevents audio glitches
 * - Audio Resampling: Real-time sample rate conversion for studio quality
 * - Hardware Latency Detection: Automatic compensation for device latency
 * - 1ms Precision: Sub-millisecond synchronization accuracy
 */

// Audio Frame Structure
struct AudioFrame {
    std::vector<float> data;      // Stereo audio data
    int frameCount;               // Number of audio frames
    int64_t timestamp;           // Timestamp in microseconds
};

// Synchronization Metrics
struct SyncMetrics {
    int64_t masterClockTime;      // Master clock time (us)
    int64_t audioClockTime;       // Audio clock time (us)
    int64_t videoClockTime;       // Video clock time (us)
    double driftCompensation;     // Current drift compensation (us)
    int jitterBufferLevel;         // Current jitter buffer level
    float targetLatencyMs;        // Target latency (ms)
    float hardwareLatencyMs;       // Hardware latency (ms)
    int audioSampleRate;          // Current audio sample rate
    float videoFrameRate;         // Current video frame rate
};

// Synchronization Modes
enum SyncMode {
    SYNC_MODE_MASTER_CLOCK,       // Master clock controls both streams
    SYNC_MODE_AUDIO_MASTER,       // Audio is master, video follows
    SYNC_MODE_VIDEO_MASTER        // Video is master, audio follows
};

class AudioResampler {
public:
    AudioResampler();
    
    void setSampleRates(int inputRate, int outputRate);
    bool needsResampling() const;
    std::vector<float> resample(const float* input, int inputFrameCount);
    
private:
    int inputSampleRate;
    int outputSampleRate;
    bool needsResampleFlag;
    double ratio;
    double phase;
};

class AtomicSync {
public:
    /**
     * Constructor
     */
    AtomicSync();
    
    /**
     * Destructor
     */
    ~AtomicSync();
    
    /**
     * Initialize the atomic synchronization system
     * @return true if initialization successful, false otherwise
     */
    bool initialize();
    
    /**
     * Process incoming audio frame
     * @param audioData Audio data (stereo float samples)
     * @param frameCount Number of audio frames
     * @param timestamp Frame timestamp in microseconds
     * @return true if processing successful, false otherwise
     */
    bool processAudioFrame(const float* audioData, int frameCount, int64_t timestamp);
    
    /**
     * Get audio frame for playback
     * @param outputBuffer Output buffer for audio data
     * @param frameCount Number of frames requested
     * @param currentTimestamp Current timestamp
     * @return true if frame available, false otherwise
     */
    bool getAudioFrameForPlayback(float* outputBuffer, int frameCount, int64_t currentTimestamp);
    
    /**
     * Synchronize video frame with master clock
     * @param frameTimestamp Original video frame timestamp
     * @param adjustedTimestamp Adjusted timestamp for sync
     * @return true if synchronization successful, false otherwise
     */
    bool synchronizeVideoFrame(int64_t frameTimestamp, int64_t& adjustedTimestamp);
    
    /**
     * Adjust audio for video processing delay
     * @param videoDelayUs Video processing delay in microseconds
     */
    void adjustAudioForVideoDelay(int64_t videoDelayUs);
    
    /**
     * Set audio sample rate
     * @param sampleRate New sample rate
     */
    void setAudioSampleRate(int sampleRate);
    
    /**
     * Set video frame rate
     * @param frameRate New frame rate
     */
    void setVideoFrameRate(float frameRate);
    
    /**
     * Get current synchronization metrics
     * @return SyncMetrics structure
     */
    SyncMetrics getSyncMetrics();
    
    /**
     * Check if system is initialized
     * @return true if initialized, false otherwise
     */
    bool isReady() const { return isInitialized; }
    
    /**
     * Get current master clock time
     * @return Master clock time in microseconds
     */
    int64_t getMasterClockTime() const { return masterClockTime; }
    
    /**
     * Get current drift compensation
     * @return Drift compensation in microseconds
     */
    double getDriftCompensation() const { return driftCompensation; }
    
    /**
     * Cleanup resources
     */
    void cleanup();

private:
    // Initialization methods
    bool initializeAudioSubsystem();
    bool initializeLatencyDetection();
    
    // Master clock management
    void startMasterClockThread();
    void masterClockLoop();
    void updateDriftCompensation();
    
    // Jitter buffer management
    void initializeJitterBuffer();
    bool addToJitterBuffer(const float* audioData, int frameCount, int64_t timestamp);
    
    // Hardware latency detection
    float detectHardwareLatency();
    bool isBluetoothDeviceConnected();
    
    // Timing management
    void updateTimingParameters();
    
    // Member variables
    std::atomic<bool> isInitialized;
    std::atomic<bool> masterClockRunning;
    
    // Clock management
    std::atomic<int64_t> masterClockTime;
    std::atomic<int64_t> audioClockTime;
    std::atomic<int64_t> videoClockTime;
    std::atomic<double> driftCompensation;
    
    // Synchronization mode
    SyncMode syncMode;
    
    // Timing parameters
    float targetLatencyMs;
    float hardwareLatencyMs;
    int audioSampleRate;
    float videoFrameRate;
    
    // Audio subsystem
#ifdef ANDROID
    AAudioStream* audioStream;
#elif IOS
    AudioUnit audioUnit;
#endif
    
    // Audio buffers
    std::vector<std::vector<float>> audioBuffers;
    
    // Jitter buffer
    std::vector<AudioFrame> jitterBuffer;
    std::atomic<int> jitterBufferWriteIndex;
    std::atomic<int> jitterBufferReadIndex;
    std::atomic<int> jitterBufferLevel;
    
    // Frame counters
    std::atomic<int> audioBufferIndex;
    std::atomic<int> videoFrameIndex;
    
    // Master clock thread
    std::thread masterClockThread;
    
    // Audio resampler
    std::unique_ptr<AudioResampler> resampler;
    
    // Constants
    static constexpr int JITTER_BUFFER_SIZE = 100;           // 100 frames jitter buffer
    static constexpr int AUDIO_BUFFER_SIZE = 1024;           // 1024 samples per buffer
    static constexpr int AUDIO_BUFFER_COUNT = 4;             // Quad buffering
    static constexpr float TARGET_BUFFER_LATENCY_MS = 20.0f;  // 20ms target buffer latency
    static constexpr float DEFAULT_HARDWARE_LATENCY_MS = 10.0f; // Default hardware latency
    static constexpr float MIN_HARDWARE_LATENCY_MS = 5.0f;    // Minimum hardware latency
    static constexpr float MAX_HARDWARE_LATENCY_MS = 50.0f;   // Maximum hardware latency
    static constexpr float ESTIMATED_HARDWARE_LATENCY_MS = 5.0f; // Estimated processing latency
    static constexpr float BLUETOOTH_LATENCY_COMPENSATION_MS = 40.0f; // Bluetooth compensation
    static constexpr int64_t MAX_DRIFT_THRESHOLD_US = 1000;   // 1ms max drift threshold
    static constexpr int64_t MAX_VIDEO_DRIFT_US = 2000;       // 2ms max video drift
    static constexpr int64_t JITTER_TOLERANCE_US = 500;       // 0.5ms jitter tolerance
    static constexpr double DRIFT_COMPENSATION_FACTOR = 0.1;  // 10% drift compensation per update
};

#endif // ATOMIC_SYNC_H
