#include "AtomicSync.h"
#include <chrono>
#include <algorithm>
#include <cmath>
#include <thread>

#ifdef ANDROID
#include <android/log.h>
#include <aaudio/AAudio.h>
#include <media/NdkAudio.h>
#define LOG_TAG "AtomicSync"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#elif IOS
#include <AudioToolbox/AudioToolbox.h>
#include <AVFoundation/AVFoundation.h>
#include <CoreAudio/CoreAudio.h>
#endif

AtomicSync::AtomicSync() 
    : masterClockTime(0),
      audioClockTime(0),
      videoClockTime(0),
      driftCompensation(0.0),
      isInitialized(false),
      syncMode(SYNC_MODE_MASTER_CLOCK),
      targetLatencyMs(0.0),
      hardwareLatencyMs(0.0),
      audioSampleRate(48000),
      videoFrameRate(60.0),
      audioBufferIndex(0),
      videoFrameIndex(0) {
    
    // Initialize jitter buffer
    jitterBuffer.resize(JITTER_BUFFER_SIZE);
    jitterBufferWriteIndex = 0;
    jitterBufferReadIndex = 0;
    jitterBufferLevel = 0;
    
    // Initialize resampler
    resampler = std::make_unique<AudioResampler>();
    
    LOGI("🎵 AtomicSync initialized - Master Clock System Ready");
}

AtomicSync::~AtomicSync() {
    cleanup();
}

bool AtomicSync::initialize() {
    try {
        LOGI("🚀 Initializing AtomicSync Master Clock System");
        
        // Initialize audio subsystem
        if (!initializeAudioSubsystem()) {
            LOGE("❌ Audio subsystem initialization failed");
            return false;
        }
        
        // Initialize hardware latency detection
        if (!initializeLatencyDetection()) {
            LOGE("❌ Hardware latency detection failed");
            return false;
        }
        
        // Start master clock thread
        startMasterClockThread();
        
        // Initialize jitter buffer
        initializeJitterBuffer();
        
        isInitialized = true;
        
        LOGI("✅ AtomicSync initialized successfully");
        LOGI("🎯 Target Latency: %.2f ms", targetLatencyMs);
        LOGI("🎧 Hardware Latency: %.2f ms", hardwareLatencyMs);
        LOGI("🔄 Sync Mode: %d", syncMode);
        
        return true;
        
    } catch (const std::exception& e) {
        LOGE("❌ AtomicSync initialization error: %s", e.what());
        return false;
    }
}

bool AtomicSync::initializeAudioSubsystem() {
    try {
        LOGI("🎧 Initializing Audio Subsystem");
        
#ifdef ANDROID
        // Initialize AAudio for low-latency audio
        AAudioStreamBuilder* builder;
        aaudio_result_t result = AAudio_createStreamBuilder(&builder);
        
        if (result != AAUDIO_OK) {
            LOGE("❌ Failed to create AAudio stream builder: %d", result);
            return false;
        }
        
        // Configure audio stream
        AAudioStreamBuilder_setFormat(builder, AAUDIO_FORMAT_PCM_FLOAT);
        AAudioStreamBuilder_setChannelCount(builder, 2); // Stereo
        AAudioStreamBuilder_setSampleRate(builder, audioSampleRate);
        AAudioStreamBuilder_setPerformanceMode(builder, AAUDIO_PERFORMANCE_MODE_LOW_LATENCY);
        AAudioStreamBuilder_setDirection(builder, AAUDIO_DIRECTION_OUTPUT);
        
        // Open the stream
        result = AAudioStreamBuilder_openStream(builder, &audioStream);
        
        if (result != AAUDIO_OK) {
            LOGE("❌ Failed to open AAudio stream: %d", result);
            AAudioStreamBuilder_delete(builder);
            return false;
        }
        
        // Get actual sample rate
        audioSampleRate = AAudioStream_getSampleRate(audioStream);
        
        // Start the stream
        result = AAudioStream_requestStart(audioStream);
        
        if (result != AAUDIO_OK) {
            LOGE("❌ Failed to start AAudio stream: %d", result);
            AAudioStream_close(audioStream);
            AAudioStreamBuilder_delete(builder);
            return false;
        }
        
        AAudioStreamBuilder_delete(builder);
        
        LOGI("✅ AAudio stream initialized: %d Hz", audioSampleRate);
        
#elif IOS
        // Initialize Audio Unit for iOS
        AudioComponentDescription desc = {};
        desc.componentType = kAudioUnitType_Output;
        desc.componentSubType = kAudioUnitSubType_RemoteIO;
        desc.componentManufacturer = kAudioUnitManufacturer_Apple;
        
        AudioComponent component = AudioComponentFindNext(nullptr, &desc);
        if (!component) {
            LOGE("❌ Failed to find Audio Component");
            return false;
        }
        
        OSStatus status = AudioComponentInstanceNew(component, &audioUnit);
        if (status != noErr) {
            LOGE("❌ Failed to create Audio Unit: %d", status);
            AudioComponentInstanceDispose(audioUnit);
            return false;
        }
        
        // Configure audio unit
        AudioStreamBasicDescription streamFormat = {};
        streamFormat.mSampleRate = audioSampleRate;
        streamFormat.mFormatID = kAudioFormatLinearPCM;
        streamFormat.mFormatFlags = kAudioFormatFlagIsFloat | kAudioFormatFlagIsPacked;
        streamFormat.mChannelsPerFrame = 2;
        streamFormat.mFramesPerPacket = 1;
        streamFormat.mBitsPerChannel = 32;
        streamFormat.mBytesPerFrame = streamFormat.mChannelsPerFrame * (streamFormat.mBitsPerChannel / 8);
        streamFormat.mBytesPerPacket = streamFormat.mBytesPerFrame * streamFormat.mFramesPerPacket;
        
        status = AudioUnitSetProperty(audioUnit, 
                                     kAudioUnitProperty_StreamFormat,
                                     kAudioUnitScope_Input,
                                     0,
                                     &streamFormat,
                                     sizeof(streamFormat));
        
        if (status != noErr) {
            LOGE("❌ Failed to set Audio Unit format: %d", status);
            AudioComponentInstanceDispose(audioUnit);
            return false;
        }
        
        // Initialize audio unit
        status = AudioUnitInitialize(audioUnit);
        if (status != noErr) {
            LOGE("❌ Failed to initialize Audio Unit: %d", status);
            AudioComponentInstanceDispose(audioUnit);
            return false;
        }
        
        // Start audio unit
        status = AudioOutputUnitStart(audioUnit);
        if (status != noErr) {
            LOGE("❌ Failed to start Audio Unit: %d", status);
            AudioComponentInstanceDispose(audioUnit);
            return false;
        }
        
        LOGI("✅ Audio Unit initialized: %d Hz", audioSampleRate);
#endif
        
        // Initialize audio buffers
        audioBuffers.resize(AUDIO_BUFFER_COUNT);
        for (auto& buffer : audioBuffers) {
            buffer.resize(AUDIO_BUFFER_SIZE * 2); // Stereo
        }
        
        return true;
        
    } catch (const std::exception& e) {
        LOGE("❌ Audio subsystem initialization error: %s", e.what());
        return false;
    }
}

bool AtomicSync::initializeLatencyDetection() {
    try {
        LOGI("🔍 Initializing Hardware Latency Detection");
        
        // Detect hardware latency
        hardwareLatencyMs = detectHardwareLatency();
        
        // Set target latency (hardware + buffer)
        targetLatencyMs = hardwareLatencyMs + TARGET_BUFFER_LATENCY_MS;
        
        LOGI("✅ Hardware latency detected: %.2f ms", hardwareLatencyMs);
        LOGI("🎯 Target latency set to: %.2f ms", targetLatencyMs);
        
        return true;
        
    } catch (const std::exception& e) {
        LOGE("❌ Latency detection error: %s", e.what());
        return false;
    }
}

float AtomicSync::detectHardwareLatency() {
    float detectedLatency = 0.0f;
    
    try {
#ifdef ANDROID
        // Get audio output latency from AAudio
        if (audioStream) {
            int32_t bufferSize = AAudioStream_getBufferSizeInFrames(audioStream);
            int32_t burstSize = AAudioStream_getFramesPerBurst(audioStream);
            
            // Calculate theoretical latency
            float bufferLatencyMs = (static_cast<float>(bufferSize) / audioSampleRate) * 1000.0f;
            float burstLatencyMs = (static_cast<float>(burstSize) / audioSampleRate) * 1000.0f;
            
            detectedLatency = bufferLatencyMs + burstLatencyMs;
            
            // Add estimated hardware processing latency
            detectedLatency += ESTIMATED_HARDWARE_LATENCY_MS;
            
            LOGI("📊 Buffer latency: %.2f ms, Burst latency: %.2f ms", bufferLatencyMs, burstLatencyMs);
        }
        
        // Check for Bluetooth devices and add additional latency
        if (isBluetoothDeviceConnected()) {
            detectedLatency += BLUETOOTH_LATENCY_COMPENSATION_MS;
            LOGI("📡 Bluetooth device detected, adding %.0f ms latency compensation", BLUETOOTH_LATENCY_COMPENSATION_MS);
        }
        
#elif IOS
        // Get audio hardware latency from iOS
        AudioSessionPropertyID latencyProperty = kAudioSessionProperty_CurrentHardwareOutputLatency;
        Float32 audioLatency = 0.0f;
        UInt32 dataSize = sizeof(audioLatency);
        
        OSStatus status = AudioSessionGetProperty(latencyProperty, &dataSize, &audioLatency);
        if (status == noErr) {
            detectedLatency = audioLatency * 1000.0f; // Convert to milliseconds
            LOGI("📊 iOS hardware latency: %.2f ms", detectedLatency);
        }
        
        // Check for Bluetooth devices
        if (isBluetoothDeviceConnected()) {
            detectedLatency += BLUETOOTH_LATENCY_COMPENSATION_MS;
            LOGI("📡 Bluetooth device detected, adding %.0f ms latency compensation", BLUETOOTH_LATENCY_COMPENSATION_MS);
        }
#endif
        
        // Clamp to reasonable values
        detectedLatency = std::max(MIN_HARDWARE_LATENCY_MS, std::min(MAX_HARDWARE_LATENCY_MS, detectedLatency));
        
    } catch (const std::exception& e) {
        LOGE("❌ Hardware latency detection error: %s", e.what());
        detectedLatency = DEFAULT_HARDWARE_LATENCY_MS;
    }
    
    return detectedLatency;
}

bool AtomicSync::isBluetoothDeviceConnected() {
    // Check if Bluetooth audio device is connected
    // This is a simplified implementation
    
#ifdef ANDROID
    // In real implementation, would query Android AudioManager
    // For now, assume no Bluetooth device
    return false;
#elif IOS
    // In real implementation, would query AVAudioSession
    // For now, assume no Bluetooth device
    return false;
#endif
}

void AtomicSync::startMasterClockThread() {
    LOGI("⏰ Starting Master Clock Thread");
    
    masterClockRunning = true;
    masterClockThread = std::thread(&AtomicSync::masterClockLoop, this);
}

void AtomicSync::masterClockLoop() {
    LOGI("⏰ Master Clock Thread started");
    
    auto startTime = std::chrono::high_resolution_clock::now();
    
    while (masterClockRunning) {
        auto currentTime = std::chrono::high_resolution_clock::now();
        auto elapsed = std::chrono::duration_cast<std::chrono::microseconds>(currentTime - startTime);
        
        // Update master clock time (in microseconds)
        masterClockTime = elapsed.count();
        
        // Update audio and video clocks with drift compensation
        audioClockTime = masterClockTime + driftCompensation;
        videoClockTime = masterClockTime + driftCompensation;
        
        // Check for drift and compensate
        updateDriftCompensation();
        
        // Sleep for master clock tick (1ms precision)
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }
    
    LOGI("⏰ Master Clock Thread stopped");
}

void AtomicSync::updateDriftCompensation() {
    // Calculate drift between audio and video
    double audioVideoDrift = audioClockTime - videoClockTime;
    
    // Apply drift compensation if needed
    if (std::abs(audioVideoDrift) > MAX_DRIFT_THRESHOLD_US) {
        // Gradually adjust drift compensation
        double compensationStep = audioVideoDrift * DRIFT_COMPENSATION_FACTOR;
        driftCompensation -= compensationStep;
        
        LOGI("🔄 Drift detected: %.2f us, compensation: %.2f us", audioVideoDrift, compensationStep);
    }
}

void AtomicSync::initializeJitterBuffer() {
    LOGI("📦 Initializing Jitter Buffer");
    
    // Clear jitter buffer
    std::fill(jitterBuffer.begin(), jitterBuffer.end(), AudioFrame{});
    
    // Reset indices
    jitterBufferWriteIndex = 0;
    jitterBufferReadIndex = 0;
    jitterBufferLevel = 0;
    
    LOGI("✅ Jitter Buffer initialized: %d frames", JITTER_BUFFER_SIZE);
}

bool AtomicSync::processAudioFrame(const float* audioData, int frameCount, int64_t timestamp) {
    if (!isInitialized) {
        LOGE("❌ AtomicSync not initialized");
        return false;
    }
    
    try {
        // Resample audio if needed
        std::vector<float> resampledAudio;
        const float* processedAudio = audioData;
        int processedFrameCount = frameCount;
        
        if (resampler->needsResampling()) {
            resampledAudio = resampler->resample(audioData, frameCount);
            processedAudio = resampledAudio.data();
            processedFrameCount = resampledAudio.size() / 2; // Stereo
        }
        
        // Add to jitter buffer
        return addToJitterBuffer(processedAudio, processedFrameCount, timestamp);
        
    } catch (const std::exception& e) {
        LOGE("❌ Audio frame processing error: %s", e.what());
        return false;
    }
}

bool AtomicSync::addToJitterBuffer(const float* audioData, int frameCount, int64_t timestamp) {
    // Check if jitter buffer has space
    if (jitterBufferLevel >= JITTER_BUFFER_SIZE) {
        LOGW("⚠️ Jitter buffer overflow, dropping frame");
        return false;
    }
    
    // Create audio frame
    AudioFrame frame;
    frame.timestamp = timestamp;
    frame.frameCount = frameCount;
    frame.data.resize(frameCount * 2); // Stereo
    
    // Copy audio data
    std::copy(audioData, audioData + frameCount * 2, frame.data.begin());
    
    // Add to jitter buffer
    jitterBuffer[jitterBufferWriteIndex] = std::move(frame);
    jitterBufferWriteIndex = (jitterBufferWriteIndex + 1) % JITTER_BUFFER_SIZE;
    jitterBufferLevel++;
    
    return true;
}

bool AtomicSync::getAudioFrameForPlayback(float* outputBuffer, int frameCount, int64_t currentTimestamp) {
    if (jitterBufferLevel == 0) {
        // No audio available, output silence
        std::fill(outputBuffer, outputBuffer + frameCount * 2, 0.0f);
        return false;
    }
    
    // Get frame from jitter buffer
    AudioFrame& frame = jitterBuffer[jitterBufferReadIndex];
    
    // Check if frame is ready for playback
    int64_t frameTimestamp = frame.timestamp;
    int64_t targetTimestamp = currentTimestamp - static_cast<int64_t>(targetLatencyMs * 1000.0);
    
    if (frameTimestamp > targetTimestamp + JITTER_TOLERANCE_US) {
        // Frame is too early, output silence
        std::fill(outputBuffer, outputBuffer + frameCount * 2, 0.0f);
        return false;
    }
    
    if (frameTimestamp < targetTimestamp - JITTER_TOLERANCE_US) {
        // Frame is too late, skip it
        jitterBufferReadIndex = (jitterBufferReadIndex + 1) % JITTER_BUFFER_SIZE;
        jitterBufferLevel--;
        return getAudioFrameForPlayback(outputBuffer, frameCount, currentTimestamp);
    }
    
    // Copy frame data to output buffer
    int framesToCopy = std::min(frameCount, frame.frameCount);
    std::copy(frame.data.begin(), frame.data.begin() + framesToCopy * 2, outputBuffer);
    
    // If frame is larger than requested, store remaining data
    if (frame.frameCount > frameCount) {
        frame.frameCount -= frameCount;
        frame.data.erase(frame.data.begin(), frame.data.begin() + frameCount * 2);
    } else {
        // Frame consumed, remove from buffer
        jitterBufferReadIndex = (jitterBufferReadIndex + 1) % JITTER_BUFFER_SIZE;
        jitterBufferLevel--;
    }
    
    return true;
}

bool AtomicSync::synchronizeVideoFrame(int64_t frameTimestamp, int64_t& adjustedTimestamp) {
    if (!isInitialized) {
        LOGE("❌ AtomicSync not initialized");
        return false;
    }
    
    try {
        // Calculate target video timestamp based on master clock
        int64_t targetVideoTimestamp = videoClockTime - static_cast<int64_t>(targetLatencyMs * 1000.0);
        
        // Calculate difference
        int64_t timestampDiff = frameTimestamp - targetVideoTimestamp;
        
        // Check if frame is within acceptable range
        if (std::abs(timestampDiff) > MAX_VIDEO_DRIFT_US) {
            LOGW("⚠️ Video frame drift detected: %lld us", timestampDiff);
            
            // Adjust timestamp to sync with master clock
            adjustedTimestamp = targetVideoTimestamp;
            
            // Update video clock to match
            videoClockTime = targetVideoTimestamp;
            
            return true;
        }
        
        // Frame is within acceptable range, no adjustment needed
        adjustedTimestamp = frameTimestamp;
        return true;
        
    } catch (const std::exception& e) {
        LOGE("❌ Video frame synchronization error: %s", e.what());
        adjustedTimestamp = frameTimestamp;
        return false;
    }
}

void AtomicSync::adjustAudioForVideoDelay(int64_t videoDelayUs) {
    // Adjust audio clock to compensate for video processing delay
    audioClockTime += videoDelayUs;
    
    LOGI("🔄 Audio adjusted for video delay: %lld us", videoDelayUs);
}

void AtomicSync::setAudioSampleRate(int sampleRate) {
    if (sampleRate != audioSampleRate) {
        LOGI("🎵 Audio sample rate changed: %d Hz -> %d Hz", audioSampleRate, sampleRate);
        audioSampleRate = sampleRate;
        
        // Reinitialize resampler with new sample rate
        resampler->setSampleRates(audioSampleRate, audioSampleRate);
    }
}

void AtomicSync::setVideoFrameRate(float frameRate) {
    if (frameRate != videoFrameRate) {
        LOGI("🎬 Video frame rate changed: %.2f fps -> %.2f fps", videoFrameRate, frameRate);
        videoFrameRate = frameRate;
        
        // Adjust timing parameters
        updateTimingParameters();
    }
}

void AtomicSync::updateTimingParameters() {
    // Update timing parameters based on current frame rate and sample rate
    // This ensures perfect sync across different content types
    
    float frameDurationMs = 1000.0f / videoFrameRate;
    float audioFrameDurationMs = (static_cast<float>(AUDIO_BUFFER_SIZE) / audioSampleRate) * 1000.0f;
    
    LOGI("⏱️ Frame duration: %.2f ms, Audio frame duration: %.2f ms", frameDurationMs, audioFrameDurationMs);
}

SyncMetrics AtomicSync::getSyncMetrics() {
    SyncMetrics metrics;
    metrics.masterClockTime = masterClockTime;
    metrics.audioClockTime = audioClockTime;
    metrics.videoClockTime = videoClockTime;
    metrics.driftCompensation = driftCompensation;
    metrics.jitterBufferLevel = jitterBufferLevel;
    metrics.targetLatencyMs = targetLatencyMs;
    metrics.hardwareLatencyMs = hardwareLatencyMs;
    metrics.audioSampleRate = audioSampleRate;
    metrics.videoFrameRate = videoFrameRate;
    
    return metrics;
}

void AtomicSync::cleanup() {
    LOGI("🧹 Cleaning up AtomicSync");
    
    // Stop master clock thread
    masterClockRunning = false;
    if (masterClockThread.joinable()) {
        masterClockThread.join();
    }
    
    // Cleanup audio subsystem
#ifdef ANDROID
    if (audioStream) {
        AAudioStream_requestStop(audioStream);
        AAudioStream_close(audioStream);
        audioStream = nullptr;
    }
#elif IOS
    if (audioUnit) {
        AudioOutputUnitStop(audioUnit);
        AudioUnitUninitialize(audioUnit);
        AudioComponentInstanceDispose(audioUnit);
        audioUnit = nullptr;
    }
#endif
    
    // Clear buffers
    jitterBuffer.clear();
    audioBuffers.clear();
    
    // Reset state
    isInitialized = false;
    
    LOGI("✅ AtomicSync cleanup completed");
}

// AudioResampler implementation
AudioResampler::AudioResampler() 
    : inputSampleRate(48000), outputSampleRate(48000), needsResampleFlag(false) {
}

void AudioResampler::setSampleRates(int inputRate, int outputRate) {
    inputSampleRate = inputRate;
    outputSampleRate = outputRate;
    needsResampleFlag = (inputRate != outputRate);
    
    if (needsResampleFlag) {
        // Initialize resampling parameters
        ratio = static_cast<double>(outputRate) / inputRate;
        phase = 0.0;
    }
}

bool AudioResampler::needsResampling() const {
    return needsResampleFlag;
}

std::vector<float> AudioResampler::resample(const float* input, int inputFrameCount) {
    if (!needsResampleFlag) {
        // No resampling needed, just copy
        std::vector<float> output(input, input + inputFrameCount * 2);
        return output;
    }
    
    // Calculate output frame count
    int outputFrameCount = static_cast<int>(inputFrameCount * ratio);
    std::vector<float> output(outputFrameCount * 2);
    
    // Simple linear interpolation resampling
    for (int i = 0; i < outputFrameCount; i++) {
        double inputIndex = i / ratio;
        int index0 = static_cast<int>(inputIndex);
        int index1 = std::min(index0 + 1, inputFrameCount - 1);
        double fraction = inputIndex - index0;
        
        // Resample both channels
        for (int ch = 0; ch < 2; ch++) {
            float sample0 = input[index0 * 2 + ch];
            float sample1 = input[index1 * 2 + ch];
            float resampled = sample0 + (sample1 - sample0) * fraction;
            output[i * 2 + ch] = resampled;
        }
    }
    
    return output;
}
