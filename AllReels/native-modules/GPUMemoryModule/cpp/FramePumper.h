#pragma once

#include <cstdint>
#include <memory>
#include <atomic>
#include <mutex>
#include <thread>
#include <functional>
#include <queue>
#include <jsi/jsi.h>

#if defined(__ANDROID__)
#include <media/NdkMediaCodec.h>
#include <media/NdkMediaExtractor.h>
#include <android/native_window.h>
#include <EGL/egl.h>
#include <GLES2/gl2.h>
#include <GLES2/gl2ext.h>
#elif defined(__APPLE__)
#include <VideoToolbox/VideoToolbox.h>
#include <CoreVideo/CoreVideo.h>
#include <CoreMedia/CoreMedia.h>
#include <OpenGLES/ES2/gl.h>
#include <OpenGLES/ES2/glext.h>
#endif

namespace FramePumper {

// Frame metadata structure
struct VideoFrame {
    uint8_t* data;              // Raw frame data (zero-copy)
    size_t size;                // Frame size in bytes
    int width;                  // Frame width
    int height;                 // Frame height
    int64_t timestamp;          // Presentation timestamp
    int64_t duration;           // Frame duration
    int format;                 // Pixel format (NV21, YUV420, etc.)
    uint32_t textureId;         // GPU texture ID (zero-copy)
    bool isKeyFrame;            // Is this a keyframe
    uint32_t frameNumber;       // Sequential frame number
    float fps;                  // Current FPS
};

// Texture management for zero-copy GPU rendering
class ZeroCopyTexture {
private:
    uint32_t textureId;
    int width, height;
    uint8_t* mappedMemory;
    bool isMapped;
    std::mutex textureMutex;

public:
    ZeroCopyTexture(int width, int height);
    ~ZeroCopyTexture();
    
    // Zero-copy operations
    bool mapMemory(uint8_t* sourceData, size_t size);
    void unmapMemory();
    void updateTexture();
    void bind();
    void unbind();
    
    // Getters
    uint32_t getTextureId() const { return textureId; }
    bool isMappedMemory() const { return isMapped; }
    int getWidth() const { return width; }
    int getHeight() const { return height; }
};

// Native video decoder interface
class NativeVideoDecoder {
public:
    virtual ~NativeVideoDecoder() = default;
    
    virtual bool initialize(const std::string& videoPath, int width, int height) = 0;
    virtual bool startDecoding() = 0;
    virtual bool stopDecoding() = 0;
    virtual bool getNextFrame(VideoFrame& frame) = 0;
    virtual bool seekToTime(int64_t timeUs) = 0;
    virtual void release() = 0;
    
    // Decoder info
    virtual int getWidth() const = 0;
    virtual int getHeight() const = 0;
    virtual float getFrameRate() const = 0;
    virtual int64_t getDuration() const = 0;
    virtual bool isInitialized() const = 0;
};

#if defined(__ANDROID__)
// Android MediaCodec implementation
class AndroidMediaCodecDecoder : public NativeVideoDecoder {
private:
    AMediaCodec* codec;
    AMediaExtractor* extractor;
    ANativeWindow* nativeWindow;
    std::atomic<bool> isDecoding{false};
    int videoWidth, videoHeight;
    float frameRate;
    int64_t duration;
    
public:
    AndroidMediaCodecDecoder();
    ~AndroidMediaCodecDecoder() override;
    
    bool initialize(const std::string& videoPath, int width, int height) override;
    bool startDecoding() override;
    bool stopDecoding() override;
    bool getNextFrame(VideoFrame& frame) override;
    bool seekToTime(int64_t timeUs) override;
    void release() override;
    
    int getWidth() const override { return videoWidth; }
    int getHeight() const override { return videoHeight; }
    float getFrameRate() const override { return frameRate; }
    int64_t getDuration() const override { return duration; }
    bool isInitialized() const override;
    
private:
    bool configureCodec(const std::string& mimeType);
    bool setupSurface();
};
#endif

#if defined(__APPLE__)
// iOS VideoToolbox implementation
class iOSVideoToolboxDecoder : public NativeVideoDecoder {
private:
    VTDecompressionSessionRef decompressionSession;
    CMFormatDescriptionRef formatDescription;
    std::atomic<bool> isDecoding{false};
    int videoWidth, videoHeight;
    float frameRate;
    int64_t duration;
    CVPixelBufferPoolRef pixelBufferPool;
    
public:
    iOSVideoToolboxDecoder();
    ~iOSVideoToolboxDecoder() override;
    
    bool initialize(const std::string& videoPath, int width, int height) override;
    bool startDecoding() override;
    bool stopDecoding() override;
    bool getNextFrame(VideoFrame& frame) override;
    bool seekToTime(int64_t timeUs) override;
    void release() override;
    
    int getWidth() const override { return videoWidth; }
    int getHeight() const override { return videoHeight; }
    float getFrameRate() const override { return frameRate; }
    int64_t getDuration() const override { return duration; }
    bool isInitialized() const override;
    
private:
    bool createDecompressionSession();
    void setupPixelBufferPool();
    static void decompressionOutputCallback(
        void* decompressionOutputRefCon,
        void* sourceFrameRefCon,
        OSStatus status,
        VTDecodeInfoFlags infoFlags,
        CVImageBufferRef imageBuffer,
        CMTime presentationTimeStamp,
        CMTime presentationDuration
    );
};
#endif

// High-performance frame pumper with 60 FPS rendering
class FramePumper {
private:
    // Core components
    std::unique_ptr<NativeVideoDecoder> decoder;
    std::unique_ptr<ZeroCopyTexture> texture;
    
    // Frame management
    std::queue<VideoFrame> frameQueue;
    std::mutex frameQueueMutex;
    std::atomic<bool> isPumping{false};
    std::atomic<uint32_t> frameCounter{0};
    
    // Rendering loop
    std::thread renderingThread;
    std::atomic<bool> shouldStop{false};
    std::chrono::high_resolution_clock::time_point lastFrameTime;
    
    // Performance tracking
    std::atomic<float> currentFPS{0.0f};
    std::atomic<uint64_t> totalFramesRendered{0};
    std::atomic<uint64_t> droppedFrames{0};
    std::chrono::high_resolution_clock::time_point startTime;
    
    // Configuration
    int targetFPS;
    int maxFrameQueueSize;
    bool enableZeroCopy;
    bool enableHardwareAcceleration;
    
    // JSI callback
    std::function<void(const VideoFrame&)> frameCallback;

public:
    FramePumper(int fps = 60, int maxQueueSize = 3);
    ~FramePumper();
    
    // Core operations
    bool initialize(const std::string& videoPath, int width, int height);
    bool startPumping();
    bool stopPumping();
    bool pausePumping();
    bool resumePumping();
    
    // Frame operations
    bool getNextFrame(VideoFrame& frame);
    bool seekToTime(int64_t timeUs);
    void setFrameCallback(std::function<void(const VideoFrame&)> callback);
    
    // Texture operations (zero-copy)
    bool updateTexture(const VideoFrame& frame);
    uint32_t getCurrentTexture() const;
    void bindTexture();
    void unbindTexture();
    
    // Performance monitoring
    float getCurrentFPS() const { return currentFPS.load(); }
    uint64_t getTotalFramesRendered() const { return totalFramesRendered.load(); }
    uint64_t getDroppedFrames() const { return droppedFrames.load(); }
    float getAverageFPS() const;
    
    // Configuration
    void setTargetFPS(int fps);
    void setMaxFrameQueueSize(int size);
    void enableZeroCopyMode(bool enable);
    void enableHardwareAcceleration(bool enable);
    
    // Status
    bool isInitialized() const;
    bool isPumping() const { return isPumping.load(); }
    bool isPaused() const;
    int getVideoWidth() const;
    int getVideoHeight() const;
    float getVideoFrameRate() const;
    int64_t getVideoDuration() const;

private:
    // Rendering loop
    void renderingLoop();
    void processFrameQueue();
    void updatePerformanceMetrics();
    
    // Platform-specific initialization
    bool initializePlatformSpecific();
    void cleanupPlatformSpecific();
    
    // Frame queue management
    void enqueueFrame(const VideoFrame& frame);
    bool dequeueFrame(VideoFrame& frame);
    void clearFrameQueue();
};

// JSI interface for direct JavaScript access
class FramePumperJSI {
private:
    std::shared_ptr<FramePumper> framePumper;
    std::shared_ptr<facebook::jsi::Runtime> runtime;
    std::atomic<bool> isInitialized{false};

public:
    explicit FramePumperJSI(std::shared_ptr<facebook::jsi::Runtime> rt);
    ~FramePumperJSI();
    
    // Initialization
    bool initialize(const std::string& videoPath, int width, int height, int targetFPS = 60);
    
    // Playback control
    bool startPlayback();
    bool stopPlayback();
    bool pausePlayback();
    bool resumePlayback();
    bool seekTo(int64_t timeMs);
    
    // Frame access
    std::string getCurrentFrameData();
    std::string getFrameMetadata();
    uint32_t getCurrentTexture();
    
    // Performance monitoring
    float getCurrentFPS();
    uint64_t getTotalFrames();
    uint64_t getDroppedFrames();
    float getAverageFPS();
    
    // Video information
    int getVideoWidth();
    int getVideoHeight();
    float getVideoFrameRate();
    int64_t getVideoDuration();
    
    // Configuration
    void setTargetFPS(int fps);
    void setMaxFrameQueueSize(int size);
    void enableZeroCopy(bool enable);
    void enableHardwareAcceleration(bool enable);
    
    // Status
    bool isInitialized();
    bool isPlaying();
    bool isPaused();
    
    // Frame callback for JSI
    void setFrameCallback();

private:
    void onFrameReady(const VideoFrame& frame);
    std::string frameToBase64(const VideoFrame& frame);
    std::string metadataToJSON(const VideoFrame& frame);
};

// Factory function for JSI module creation
std::shared_ptr<facebook::jsi::Object> createFramePumperModule(
    std::shared_ptr<facebook::jsi::Runtime> runtime);

} // namespace FramePumper
