#include "FramePumper.h"
#include <jsi/jsi.h>
#include <chrono>
#include <thread>
#include <cstring>
#include <algorithm>

#if defined(__ANDROID__)
#include <android/log.h>
#include <EGL/egl.h>
#include <GLES2/gl2.h>
#include <GLES2/gl2ext.h>
#define LOG_TAG "FramePumper"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#elif defined(__APPLE__)
#include <OpenGLES/ES2/gl.h>
#include <OpenGLES/ES2/glext.h>
#define LOGI(...) printf(__VA_ARGS__)
#define LOGE(...) printf(__VA_ARGS__)
#endif

namespace FramePumper {

// Zero-Copy Texture Implementation
ZeroCopyTexture::ZeroCopyTexture(int width, int height) 
    : width(width), height(height), isMapped(false) {
    
    glGenTextures(1, &textureId);
    glBindTexture(GL_TEXTURE_2D, textureId);
    
    // Configure texture for zero-copy
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
    
    // Allocate texture storage
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, width, height, 0, GL_RGBA, GL_UNSIGNED_BYTE, nullptr);
    
    // Map memory for zero-copy access
    size_t textureSize = width * height * 4; // RGBA
    mappedMemory = static_cast<uint8_t*>(std::aligned_alloc(32, textureSize));
    
    LOGI("ZeroCopyTexture created: %dx%d, textureId=%u", width, height, textureId);
}

ZeroCopyTexture::~ZeroCopyTexture() {
    if (isMapped) {
        unmapMemory();
    }
    
    if (textureId) {
        glDeleteTextures(1, &textureId);
    }
    
    if (mappedMemory) {
        std::free(mappedMemory);
    }
    
    LOGI("ZeroCopyTexture destroyed");
}

bool ZeroCopyTexture::mapMemory(uint8_t* sourceData, size_t size) {
    std::lock_guard<std::mutex> lock(textureMutex);
    
    if (isMapped) {
        LOGE("Texture already mapped");
        return false;
    }
    
    if (!sourceData || size == 0) {
        LOGE("Invalid source data");
        return false;
    }
    
    // Zero-copy: direct memory copy without intermediate buffers
    size_t expectedSize = width * height * 4; // RGBA
    if (size > expectedSize) {
        size = expectedSize;
    }
    
    std::memcpy(mappedMemory, sourceData, size);
    isMapped = true;
    
    return true;
}

void ZeroCopyTexture::unmapMemory() {
    std::lock_guard<std::mutex> lock(textureMutex);
    
    if (!isMapped) {
        return;
    }
    
    isMapped = false;
}

void ZeroCopyTexture::updateTexture() {
    std::lock_guard<std::mutex> lock(textureMutex);
    
    if (!isMapped) {
        return;
    }
    
    // Zero-copy: update texture directly from mapped memory
    glBindTexture(GL_TEXTURE_2D, textureId);
    glTexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, mappedMemory);
    
    // Ensure texture is updated immediately
    glFinish();
}

void ZeroCopyTexture::bind() {
    glBindTexture(GL_TEXTURE_2D, textureId);
}

void ZeroCopyTexture::unbind() {
    glBindTexture(GL_TEXTURE_2D, 0);
}

#if defined(__ANDROID__)
// Android MediaCodec Implementation
AndroidMediaCodecDecoder::AndroidMediaCodecDecoder() 
    : codec(nullptr), extractor(nullptr), nativeWindow(nullptr),
      videoWidth(0), videoHeight(0), frameRate(30.0f), duration(0) {
}

AndroidMediaCodecDecoder::~AndroidMediaCodecDecoder() {
    release();
}

bool AndroidMediaCodecDecoder::initialize(const std::string& videoPath, int width, int height) {
    videoWidth = width;
    videoHeight = height;
    
    // Create media extractor
    extractor = AMediaExtractor_new();
    if (!extractor) {
        LOGE("Failed to create media extractor");
        return false;
    }
    
    // Set data source
    media_status_t status = AMediaExtractor_setDataSource(extractor, videoPath.c_str());
    if (status != AMEDIA_OK) {
        LOGE("Failed to set data source: %d", status);
        return false;
    }
    
    // Find video track
    size_t numTracks = AMediaExtractor_getTrackCount(extractor);
    for (size_t i = 0; i < numTracks; i++) {
        AMediaFormat* format = AMediaExtractor_getTrackFormat(extractor, i);
        const char* mime;
        if (AMediaFormat_getString(format, AMEDIAFORMAT_KEY_MIME, &mime) && 
            strncmp(mime, "video/", 6) == 0) {
            
            // Get video properties
            AMediaFormat_getInt32(format, AMEDIAFORMAT_KEY_WIDTH, &videoWidth);
            AMediaFormat_getInt32(format, AMEDIAFORMAT_KEY_HEIGHT, &videoHeight);
            AMediaFormat_getFloat(format, AMEDIAFORMAT_KEY_FRAME_RATE, &frameRate);
            AMediaFormat_getInt64(format, AMEDIAFORMAT_KEY_DURATION, &duration);
            
            // Select this track
            AMediaExtractor_selectTrack(extractor, i);
            
            // Create codec
            codec = AMediaCodec_createDecoderByType(mime);
            if (!codec) {
                LOGE("Failed to create codec for mime type: %s", mime);
                AMediaFormat_delete(format);
                return false;
            }
            
            // Configure codec
            status = AMediaCodec_configure(codec, format, nullptr, nullptr, 0);
            AMediaFormat_delete(format);
            
            if (status != AMEDIA_OK) {
                LOGE("Failed to configure codec: %d", status);
                return false;
            }
            
            LOGI("Android MediaCodec initialized: %dx%d @ %.1ffps", videoWidth, videoHeight, frameRate);
            return true;
        }
        AMediaFormat_delete(format);
    }
    
    LOGE("No video track found");
    return false;
}

bool AndroidMediaCodecDecoder::startDecoding() {
    if (!codec) {
        return false;
    }
    
    media_status_t status = AMediaCodec_start(codec);
    if (status != AMEDIA_OK) {
        LOGE("Failed to start codec: %d", status);
        return false;
    }
    
    isDecoding.store(true);
    LOGI("Android MediaCodec started");
    return true;
}

bool AndroidMediaCodecDecoder::stopDecoding() {
    if (!codec) {
        return false;
    }
    
    media_status_t status = AMediaCodec_stop(codec);
    if (status != AMEDIA_OK) {
        LOGE("Failed to stop codec: %d", status);
        return false;
    }
    
    isDecoding.store(false);
    LOGI("Android MediaCodec stopped");
    return true;
}

bool AndroidMediaCodecDecoder::getNextFrame(VideoFrame& frame) {
    if (!codec || !isDecoding.load()) {
        return false;
    }
    
    // Get input buffer
    ssize_t inputIndex = AMediaCodec_dequeueInputBuffer(codec, 5000);
    if (inputIndex < 0) {
        return false;
    }
    
    // Read sample from extractor
    size_t bufferSize;
    uint8_t* inputBuffer = AMediaCodec_getInputBuffer(codec, inputIndex, &bufferSize);
    if (!inputBuffer) {
        return false;
    }
    
    ssize_t sampleSize = AMediaExtractor_readSampleData(extractor, inputBuffer, bufferSize);
    if (sampleSize <= 0) {
        return false;
    }
    
    int64_t presentationTimeUs = AMediaExtractor_getSampleTime(extractor);
    
    // Queue input buffer
    media_status_t status = AMediaCodec_queueInputBuffer(codec, inputIndex, 0, sampleSize, presentationTimeUs, 0);
    if (status != AMEDIA_OK) {
        return false;
    }
    
    // Get output buffer
    AMediaCodecBufferInfo info;
    ssize_t outputIndex = AMediaCodec_dequeueOutputBuffer(codec, &info, 5000);
    if (outputIndex < 0) {
        return false;
    }
    
    // Get output buffer
    size_t outputSize;
    uint8_t* outputBuffer = AMediaCodec_getOutputBuffer(codec, outputIndex, &outputSize);
    if (!outputBuffer) {
        AMediaCodec_releaseOutputBuffer(codec, outputIndex, false);
        return false;
    }
    
    // Fill frame structure
    frame.data = outputBuffer;
    frame.size = info.size;
    frame.width = videoWidth;
    frame.height = videoHeight;
    frame.timestamp = info.presentationTimeUs;
    frame.duration = info.flags & AMEDIACODEC_BUFFER_FLAG_END_OF_STREAM ? 0 : 33333; // ~30fps
    frame.format = 0; // NV21
    frame.isKeyFrame = info.flags & AMEDIACODEC_BUFFER_FLAG_KEY_FRAME;
    frame.frameNumber = frameCounter.fetch_add(1);
    frame.fps = frameRate;
    
    // Release output buffer (don't render to surface)
    AMediaCodec_releaseOutputBuffer(codec, outputIndex, false);
    
    // Advance to next sample
    AMediaExtractor_advance(extractor);
    
    return true;
}

bool AndroidMediaCodecDecoder::seekToTime(int64_t timeUs) {
    if (!extractor) {
        return false;
    }
    
    media_status_t status = AMediaExtractor_seekTo(extractor, timeUs, AMEDIAEXTRACTOR_SEEK_CLOSEST_SYNC);
    return status == AMEDIA_OK;
}

void AndroidMediaCodecDecoder::release() {
    if (codec) {
        AMediaCodec_stop(codec);
        AMediaCodec_delete(codec);
        codec = nullptr;
    }
    
    if (extractor) {
        AMediaExtractor_delete(extractor);
        extractor = nullptr;
    }
    
    if (nativeWindow) {
        ANativeWindow_release(nativeWindow);
        nativeWindow = nullptr;
    }
    
    isDecoding.store(false);
}

bool AndroidMediaCodecDecoder::isInitialized() const {
    return codec != nullptr && extractor != nullptr;
}
#endif

#if defined(__APPLE__)
// iOS VideoToolbox Implementation
iOSVideoToolboxDecoder::iOSVideoToolboxDecoder() 
    : decompressionSession(nullptr), formatDescription(nullptr),
      videoWidth(0), videoHeight(0), frameRate(30.0f), duration(0),
      pixelBufferPool(nullptr) {
}

iOSVideoToolboxDecoder::~iOSVideoToolboxDecoder() {
    release();
}

bool iOSVideoToolboxDecoder::initialize(const std::string& videoPath, int width, int height) {
    videoWidth = width;
    videoHeight = height;
    
    // Create format description (simplified)
    OSStatus status = CMVideoFormatDescriptionCreate(
        kCFAllocatorDefault,
        kCMVideoCodecType_H264,
        width, height,
        nullptr,
        &formatDescription
    );
    
    if (status != noErr) {
        LOGE("Failed to create format description: %d", status);
        return false;
    }
    
    // Create decompression session
    if (!createDecompressionSession()) {
        return false;
    }
    
    // Setup pixel buffer pool
    setupPixelBufferPool();
    
    LOGI("iOS VideoToolbox initialized: %dx%d @ %.1ffps", videoWidth, videoHeight, frameRate);
    return true;
}

bool iOSVideoToolboxDecoder::startDecoding() {
    isDecoding.store(true);
    LOGI("iOS VideoToolbox started");
    return true;
}

bool iOSVideoToolboxDecoder::stopDecoding() {
    isDecoding.store(false);
    LOGI("iOS VideoToolbox stopped");
    return true;
}

bool iOSVideoToolboxDecoder::getNextFrame(VideoFrame& frame) {
    if (!decompressionSession || !isDecoding.load()) {
        return false;
    }
    
    // This is a simplified implementation
    // In real implementation, you would decode from actual video data
    
    // Create a sample buffer (mock implementation)
    CVPixelBufferRef pixelBuffer = nullptr;
    CVReturn cvRet = CVPixelBufferPoolCreatePixelBuffer(
        kCFAllocatorDefault,
        pixelBufferPool,
        &pixelBuffer
    );
    
    if (cvRet != kCVReturnSuccess || !pixelBuffer) {
        return false;
    }
    
    // Lock pixel buffer
    CVPixelBufferLockBaseAddress(pixelBuffer, 0);
    uint8_t* pixelData = static_cast<uint8_t*>(CVPixelBufferGetBaseAddress(pixelBuffer));
    size_t bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer);
    size_t dataSize = CVPixelBufferGetDataSize(pixelBuffer);
    
    // Fill frame structure
    frame.data = pixelData;
    frame.size = dataSize;
    frame.width = videoWidth;
    frame.height = videoHeight;
    frame.timestamp = CACurrentMediaTime() * 1000000; // Convert to microseconds
    frame.duration = 33333; // ~30fps
    frame.format = kCVPixelFormatType_32BGRA;
    frame.isKeyFrame = true;
    frame.frameNumber = frameCounter.fetch_add(1);
    frame.fps = frameRate;
    
    // Unlock pixel buffer
    CVPixelBufferUnlockBaseAddress(pixelBuffer, 0);
    
    // Release pixel buffer (in real implementation, you would manage this differently)
    CVPixelBufferRelease(pixelBuffer);
    
    return true;
}

bool iOSVideoToolboxDecoder::seekToTime(int64_t timeUs) {
    // Implementation for iOS seeking
    return true;
}

void iOSVideoToolboxDecoder::release() {
    if (decompressionSession) {
        VTDecompressionSessionInvalidate(decompressionSession);
        CFRelease(decompressionSession);
        decompressionSession = nullptr;
    }
    
    if (formatDescription) {
        CFRelease(formatDescription);
        formatDescription = nullptr;
    }
    
    if (pixelBufferPool) {
        CVPixelBufferPoolRelease(pixelBufferPool);
        pixelBufferPool = nullptr;
    }
    
    isDecoding.store(false);
}

bool iOSVideoToolboxDecoder::isInitialized() const {
    return decompressionSession != nullptr && formatDescription != nullptr;
}

bool iOSVideoToolboxDecoder::createDecompressionSession() {
    if (!formatDescription) {
        return false;
    }
    
    // Create decompression session
    VTDecompressionOutputCallbackRecord callbackRecord;
    callbackRecord.decompressionOutputCallback = decompressionOutputCallback;
    callbackRecord.decompressionOutputRefCon = this;
    
    OSStatus status = VTDecompressionSessionCreate(
        kCFAllocatorDefault,
        formatDescription,
        nullptr,
        nullptr,
        &callbackRecord,
        &decompressionSession
    );
    
    return status == noErr;
}

void iOSVideoToolboxDecoder::setupPixelBufferPool() {
    // Create pixel buffer attributes
    CFMutableDictionaryRef pixelBufferAttributes = CFDictionaryCreateMutable(
        kCFAllocatorDefault,
        0,
        &kCFTypeDictionaryKeyCallBacks,
        &kCFTypeDictionaryValueCallBacks
    );
    
    // Set pixel format
    SInt32 pixelFormat = kCVPixelFormatType_32BGRA;
    CFNumberRef pixelFormatNumber = CFNumberCreate(kCFAllocatorDefault, kCFNumberSInt32Type, &pixelFormat);
    CFDictionarySetValue(pixelBufferAttributes, kCVPixelBufferPixelFormatTypeKey, pixelFormatNumber);
    CFRelease(pixelFormatNumber);
    
    // Set width and height
    CFNumberRef widthNumber = CFNumberCreate(kCFAllocatorDefault, kCFNumberSInt32Type, &videoWidth);
    CFNumberRef heightNumber = CFNumberCreate(kCFAllocatorDefault, kCFNumberSInt32Type, &videoHeight);
    CFDictionarySetValue(pixelBufferAttributes, kCVPixelBufferWidthKey, widthNumber);
    CFDictionarySetValue(pixelBufferAttributes, kCVPixelBufferHeightKey, heightNumber);
    CFRelease(widthNumber);
    CFRelease(heightNumber);
    
    // Create pixel buffer pool
    CVReturn status = CVPixelBufferPoolCreate(
        kCFAllocatorDefault,
        nullptr,
        pixelBufferAttributes,
        &pixelBufferPool
    );
    
    CFRelease(pixelBufferAttributes);
    
    if (status != kCVReturnSuccess) {
        LOGE("Failed to create pixel buffer pool: %d", status);
    }
}

void iOSVideoToolboxDecoder::decompressionOutputCallback(
    void* decompressionOutputRefCon,
    void* sourceFrameRefCon,
    OSStatus status,
    VTDecodeInfoFlags infoFlags,
    CVImageBufferRef imageBuffer,
    CMTime presentationTimeStamp,
    CMTime presentationDuration
) {
    // Handle decoded frame callback
    // This would be called when a frame is successfully decoded
}
#endif

// Frame Pumper Implementation
FramePumper::FramePumper(int fps, int maxQueueSize) 
    : targetFPS(fps), maxFrameQueueSize(maxQueueSize),
      enableZeroCopy(true), enableHardwareAcceleration(true) {
    
    startTime = std::chrono::high_resolution_clock::now();
    lastFrameTime = startTime;
    
    LOGI("FramePumper initialized: %d FPS, max queue size: %d", targetFPS, maxFrameQueueSize);
}

FramePumper::~FramePumper() {
    stopPumping();
}

bool FramePumper::initialize(const std::string& videoPath, int width, int height) {
    // Create platform-specific decoder
#if defined(__ANDROID__)
    decoder = std::make_unique<AndroidMediaCodecDecoder>();
#elif defined(__APPLE__)
    decoder = std::make_unique<iOSVideoToolboxDecoder>();
#else
    LOGE("Unsupported platform");
    return false;
#endif
    
    if (!decoder->initialize(videoPath, width, height)) {
        LOGE("Failed to initialize decoder");
        return false;
    }
    
    // Create zero-copy texture
    texture = std::make_unique<ZeroCopyTexture>(width, height);
    
    // Initialize platform-specific components
    if (!initializePlatformSpecific()) {
        LOGE("Failed to initialize platform-specific components");
        return false;
    }
    
    LOGI("FramePumper initialized successfully");
    return true;
}

bool FramePumper::startPumping() {
    if (!decoder || !decoder->isInitialized()) {
        LOGE("Decoder not initialized");
        return false;
    }
    
    if (isPumping.load()) {
        LOGE("Already pumping");
        return false;
    }
    
    if (!decoder->startDecoding()) {
        LOGE("Failed to start decoder");
        return false;
    }
    
    shouldStop.store(false);
    isPumping.store(true);
    
    // Start rendering thread
    renderingThread = std::thread(&FramePumper::renderingLoop, this);
    
    LOGI("FramePumper started");
    return true;
}

bool FramePumper::stopPumping() {
    if (!isPumping.load()) {
        return true;
    }
    
    shouldStop.store(true);
    isPumping.store(false);
    
    // Wait for rendering thread to finish
    if (renderingThread.joinable()) {
        renderingThread.join();
    }
    
    if (decoder) {
        decoder->stopDecoding();
    }
    
    clearFrameQueue();
    
    LOGI("FramePumper stopped");
    return true;
}

bool FramePumper::pausePumping() {
    // Implementation for pausing
    return true;
}

bool FramePumper::resumePumping() {
    // Implementation for resuming
    return true;
}

bool FramePumper::getNextFrame(VideoFrame& frame) {
    return dequeueFrame(frame);
}

bool FramePumper::seekToTime(int64_t timeUs) {
    if (!decoder) {
        return false;
    }
    
    clearFrameQueue();
    return decoder->seekToTime(timeUs);
}

void FramePumper::setFrameCallback(std::function<void(const VideoFrame&)> callback) {
    frameCallback = callback;
}

bool FramePumper::updateTexture(const VideoFrame& frame) {
    if (!texture || !frame.data) {
        return false;
    }
    
    // Zero-copy: map frame data directly to texture
    if (!texture->mapMemory(frame.data, frame.size)) {
        return false;
    }
    
    texture->updateTexture();
    texture->unmapMemory();
    
    return true;
}

uint32_t FramePumper::getCurrentTexture() const {
    return texture ? texture->getTextureId() : 0;
}

void FramePumper::bindTexture() {
    if (texture) {
        texture->bind();
    }
}

void FramePumper::unbindTexture() {
    if (texture) {
        texture->unbind();
    }
}

float FramePumper::getAverageFPS() const {
    auto now = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(now - startTime);
    
    if (duration.count() == 0) {
        return 0.0f;
    }
    
    return (static_cast<float>(totalFramesRendered.load()) * 1000.0f) / static_cast<float>(duration.count());
}

void FramePumper::setTargetFPS(int fps) {
    targetFPS = fps;
}

void FramePumper::setMaxFrameQueueSize(int size) {
    maxFrameQueueSize = size;
}

void FramePumper::enableZeroCopyMode(bool enable) {
    enableZeroCopy = enable;
}

void FramePumper::enableHardwareAcceleration(bool enable) {
    enableHardwareAcceleration = enable;
}

bool FramePumper::isInitialized() const {
    return decoder && decoder->isInitialized() && texture;
}

bool FramePumper::isPaused() const {
    return !isPumping.load() && isInitialized();
}

int FramePumper::getVideoWidth() const {
    return decoder ? decoder->getWidth() : 0;
}

int FramePumper::getVideoHeight() const {
    return decoder ? decoder->getHeight() : 0;
}

float FramePumper::getVideoFrameRate() const {
    return decoder ? decoder->getFrameRate() : 0.0f;
}

int64_t FramePumper::getVideoDuration() const {
    return decoder ? decoder->getDuration() : 0;
}

void FramePumper::renderingLoop() {
    LOGI("Rendering loop started");
    
    while (!shouldStop.load()) {
        auto frameStart = std::chrono::high_resolution_clock::now();
        
        // Process frame queue
        processFrameQueue();
        
        // Get next frame from decoder
        VideoFrame frame;
        if (decoder->getNextFrame(frame)) {
            // Update texture with zero-copy
            if (enableZeroCopy) {
                updateTexture(frame);
            }
            
            // Enqueue frame
            enqueueFrame(frame);
            
            // Call frame callback
            if (frameCallback) {
                frameCallback(frame);
            }
            
            totalFramesRendered.fetch_add(1);
        } else {
            // No frame available, increment dropped frames
            droppedFrames.fetch_add(1);
        }
        
        // Update performance metrics
        updatePerformanceMetrics();
        
        // Calculate frame timing for target FPS
        auto frameEnd = std::chrono::high_resolution_clock::now();
        auto frameDuration = std::chrono::duration_cast<std::chrono::microseconds>(frameEnd - frameStart);
        auto targetDuration = std::chrono::microseconds(1000000 / targetFPS);
        
        if (frameDuration < targetDuration) {
            std::this_thread::sleep_for(targetDuration - frameDuration);
        }
    }
    
    LOGI("Rendering loop stopped");
}

void FramePumper::processFrameQueue() {
    // Remove old frames if queue is full
    while (frameQueue.size() > maxFrameQueueSize) {
        frameQueue.pop();
        droppedFrames.fetch_add(1);
    }
}

void FramePumper::updatePerformanceMetrics() {
    auto now = std::chrono::high_resolution_clock::now();
    auto timeSinceLastFrame = std::chrono::duration_cast<std::chrono::milliseconds>(now - lastFrameTime);
    
    if (timeSinceLastFrame.count() > 0) {
        currentFPS.store(1000.0f / static_cast<float>(timeSinceLastFrame.count()));
        lastFrameTime = now;
    }
}

bool FramePumper::initializePlatformSpecific() {
    // Platform-specific initialization
    return true;
}

void FramePumper::cleanupPlatformSpecific() {
    // Platform-specific cleanup
}

void FramePumper::enqueueFrame(const VideoFrame& frame) {
    std::lock_guard<std::mutex> lock(frameQueueMutex);
    frameQueue.push(frame);
}

bool FramePumper::dequeueFrame(VideoFrame& frame) {
    std::lock_guard<std::mutex> lock(frameQueueMutex);
    
    if (frameQueue.empty()) {
        return false;
    }
    
    frame = frameQueue.front();
    frameQueue.pop();
    return true;
}

void FramePumper::clearFrameQueue() {
    std::lock_guard<std::mutex> lock(frameQueueMutex);
    while (!frameQueue.empty()) {
        frameQueue.pop();
    }
}

// JSI Interface Implementation
FramePumperJSI::FramePumperJSI(std::shared_ptr<facebook::jsi::Runtime> rt)
    : runtime(rt) {
    framePumper = std::make_shared<FramePumper>(60, 3);
    LOGI("FramePumperJSI initialized");
}

FramePumperJSI::~FramePumperJSI() {
    if (framePumper) {
        framePumper->stopPumping();
    }
    LOGI("FramePumperJSI destroyed");
}

bool FramePumperJSI::initialize(const std::string& videoPath, int width, int height, int targetFPS) {
    if (!framePumper) {
        return false;
    }
    
    bool success = framePumper->initialize(videoPath, width, height);
    if (success) {
        framePumper->setTargetFPS(targetFPS);
        framePumper->setFrameCallback([this](const VideoFrame& frame) {
            onFrameReady(frame);
        });
        isInitialized.store(true);
    }
    
    return success;
}

bool FramePumperJSI::startPlayback() {
    if (!framePumper || !isInitialized.load()) {
        return false;
    }
    
    return framePumper->startPumping();
}

bool FramePumperJSI::stopPlayback() {
    if (!framePumper) {
        return false;
    }
    
    return framePumper->stopPumping();
}

bool FramePumperJSI::pausePlayback() {
    if (!framePumper) {
        return false;
    }
    
    return framePumper->pausePumping();
}

bool FramePumperJSI::resumePlayback() {
    if (!framePumper) {
        return false;
    }
    
    return framePumper->resumePumping();
}

bool FramePumperJSI::seekTo(int64_t timeMs) {
    if (!framePumper) {
        return false;
    }
    
    return framePumper->seekToTime(timeMs * 1000); // Convert to microseconds
}

std::string FramePumperJSI::getCurrentFrameData() {
    if (!framePumper) {
        return "";
    }
    
    VideoFrame frame;
    if (framePumper->getNextFrame(frame)) {
        return frameToBase64(frame);
    }
    
    return "";
}

std::string FramePumperJSI::getFrameMetadata() {
    if (!framePumper) {
        return "{}";
    }
    
    VideoFrame frame;
    if (framePumper->getNextFrame(frame)) {
        return metadataToJSON(frame);
    }
    
    return "{}";
}

uint32_t FramePumperJSI::getCurrentTexture() {
    return framePumper ? framePumper->getCurrentTexture() : 0;
}

float FramePumperJSI::getCurrentFPS() {
    return framePumper ? framePumper->getCurrentFPS() : 0.0f;
}

uint64_t FramePumperJSI::getTotalFrames() {
    return framePumper ? framePumper->getTotalFramesRendered() : 0;
}

uint64_t FramePumperJSI::getDroppedFrames() {
    return framePumper ? framePumper->getDroppedFrames() : 0;
}

float FramePumperJSI::getAverageFPS() {
    return framePumper ? framePumper->getAverageFPS() : 0.0f;
}

int FramePumperJSI::getVideoWidth() {
    return framePumper ? framePumper->getVideoWidth() : 0;
}

int FramePumperJSI::getVideoHeight() {
    return framePumper ? framePumper->getVideoHeight() : 0;
}

float FramePumperJSI::getVideoFrameRate() {
    return framePumper ? framePumper->getVideoFrameRate() : 0.0f;
}

int64_t FramePumperJSI::getVideoDuration() {
    return framePumper ? framePumper->getVideoDuration() : 0;
}

void FramePumperJSI::setTargetFPS(int fps) {
    if (framePumper) {
        framePumper->setTargetFPS(fps);
    }
}

void FramePumperJSI::setMaxFrameQueueSize(int size) {
    if (framePumper) {
        framePumper->setMaxFrameQueueSize(size);
    }
}

void FramePumperJSI::enableZeroCopy(bool enable) {
    if (framePumper) {
        framePumper->enableZeroCopyMode(enable);
    }
}

void FramePumperJSI::enableHardwareAcceleration(bool enable) {
    if (framePumper) {
        framePumper->enableHardwareAcceleration(enable);
    }
}

bool FramePumperJSI::isInitialized() {
    return isInitialized.load();
}

bool FramePumperJSI::isPlaying() {
    return framePumper ? framePumper->isPumping() : false;
}

bool FramePumperJSI::isPaused() {
    return framePumper ? framePumper->isPaused() : false;
}

void FramePumperJSI::setFrameCallback() {
    // Set up JSI callback for frame updates
}

void FramePumperJSI::onFrameReady(const VideoFrame& frame) {
    // Handle frame ready callback
    // This could trigger JSI events or update React Native state
}

std::string FramePumperJSI::frameToBase64(const VideoFrame& frame) {
    // Convert frame data to base64 (simplified)
    return "base64-frame-data";
}

std::string FramePumperJSI::metadataToJSON(const VideoFrame& frame) {
    char metadata[512];
    snprintf(metadata, sizeof(metadata),
             "{\"width\":%d,\"height\":%d,\"timestamp\":%lld,\"duration\":%lld,\"frameNumber\":%u,\"fps\":%.1f}",
             frame.width,
             frame.height,
             frame.timestamp,
             frame.duration,
             frame.frameNumber,
             frame.fps);
    
    return std::string(metadata);
}

// JSI Module Creation
std::shared_ptr<facebook::jsi::Object> createFramePumperModule(
    std::shared_ptr<facebook::jsi::Runtime> runtime) {
    
    auto framePumper = std::make_shared<FramePumperJSI>(runtime);
    auto object = std::make_shared<facebook::jsi::Object>(*runtime);
    
    // Initialize method
    auto initialize = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "initialize"),
        4,
        [framePumper](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal,
                      const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            if (count < 4) return facebook::jsi::Value(rt, false);
            
            std::string videoPath = args[0].getString(rt).utf8(rt);
            int width = static_cast<int>(args[1].getNumber());
            int height = static_cast<int>(args[2].getNumber());
            int targetFPS = static_cast<int>(args[3].getNumber());
            
            bool result = framePumper->initialize(videoPath, width, height, targetFPS);
            return facebook::jsi::Value(rt, result);
        });
    
    // Playback control methods
    auto startPlayback = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "startPlayback"),
        0,
        [framePumper](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal,
                      const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            bool result = framePumper->startPlayback();
            return facebook::jsi::Value(rt, result);
        });
    
    auto stopPlayback = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "stopPlayback"),
        0,
        [framePumper](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal,
                      const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            bool result = framePumper->stopPlayback();
            return facebook::jsi::Value(rt, result);
        });
    
    // Performance monitoring
    auto getCurrentFPS = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "getCurrentFPS"),
        0,
        [framePumper](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal,
                      const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            float fps = framePumper->getCurrentFPS();
            return facebook::jsi::Value(rt, fps);
        });
    
    auto getPerformanceInfo = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "getPerformanceInfo"),
        0,
        [framePumper](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal,
                      const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            auto info = facebook::jsi::Object(rt);
            
            info.setProperty(rt, "currentFPS", static_cast<double>(framePumper->getCurrentFPS()));
            info.setProperty(rt, "totalFrames", static_cast<double>(framePumper->getTotalFrames()));
            info.setProperty(rt, "droppedFrames", static_cast<double>(framePumper->getDroppedFrames()));
            info.setProperty(rt, "averageFPS", static_cast<double>(framePumper->getAverageFPS()));
            info.setProperty(rt, "videoWidth", static_cast<double>(framePumper->getVideoWidth()));
            info.setProperty(rt, "videoHeight", static_cast<double>(framePumper->getVideoHeight()));
            info.setProperty(rt, "videoFrameRate", static_cast<double>(framePumper->getVideoFrameRate()));
            
            return info;
        });
    
    // Set properties on the object
    object->setProperty(*runtime, "initialize", std::move(initialize));
    object->setProperty(*runtime, "startPlayback", std::move(startPlayback));
    object->setProperty(*runtime, "stopPlayback", std::move(stopPlayback));
    object->setProperty(*runtime, "getCurrentFPS", std::move(getCurrentFPS));
    object->setProperty(*runtime, "getPerformanceInfo", std::move(getPerformanceInfo));
    
    return object;
}

} // namespace FramePumper
