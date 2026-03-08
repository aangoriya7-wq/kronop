/**
 * AudioVideoSync.cpp
 * Implementation of Advanced Audio-Video Synchronization System
 */

#include "AudioVideoSync.hpp"
#include <algorithm>
#include <cmath>
#include <iostream>
#include <cstring>

namespace kronop {

// AudioVideoSynchronizer Implementation
AudioVideoSynchronizer::AudioVideoSynchronizer(const SyncConfig& config)
    : config_(config), videoFPS_(30), audioSampleRate_(44100), audioChannels_(2),
      frameDuration_(33.33), audioFrameDuration_(21.33), videoTimeBase_(0),
      audioTimeBase_(0), currentDrift_(0.0), syncEnabled_(true),
      adaptiveSyncEnabled_(true), syncMode_(1), syncThreadActive_(false) {
    
    resetStatistics();
    startTime_ = std::chrono::steady_clock::now();
}

AudioVideoSynchronizer::~AudioVideoSynchronizer() {
    shutdown();
}

bool AudioVideoSynchronizer::initialize(int videoFPS, int audioSampleRate, int audioChannels) {
    videoFPS_ = videoFPS;
    audioSampleRate_ = audioSampleRate;
    audioChannels_ = audioChannels;
    
    // Calculate frame durations
    frameDuration_ = 1000.0 / videoFPS_; // in milliseconds
    audioFrameDuration_ = 1000.0 / (audioSampleRate / 1024.0); // Assuming 1024 samples per frame
    
    // Initialize time bases
    initializeTimeBases();
    
    // Start adaptive sync thread
    if (adaptiveSyncEnabled_) {
        syncThreadActive_ = true;
        syncThread_ = std::make_unique<std::thread>([this]() {
            syncThreadFunction();
        });
    }
    
    std::cout << "Audio-Video Synchronizer initialized:" << std::endl;
    std::cout << "  Video FPS: " << videoFPS_ << std::endl;
    std::cout << "  Audio Sample Rate: " << audioSampleRate_ << " Hz" << std::endl;
    std::cout << "  Frame Duration: " << frameDuration_ << " ms" << std::endl;
    
    return true;
}

void AudioVideoSynchronizer::shutdown() {
    syncThreadActive_ = false;
    
    if (syncThread_ && syncThread_->joinable()) {
        syncThread_->join();
    }
    
    // Clear buffers
    {
        std::lock_guard<std::mutex> lock(videoMutex_);
        while (!videoBuffer_.empty()) {
            videoBuffer_.pop();
        }
    }
    
    {
        std::lock_guard<std::mutex> lock(audioMutex_);
        while (!audioBuffer_.empty()) {
            audioBuffer_.pop();
        }
    }
}

void AudioVideoSynchronizer::addVideoFrame(const VideoFrameSync& frame) {
    if (!syncEnabled_) return;
    
    std::lock_guard<std::mutex> lock(videoMutex_);
    
    VideoFrameSync syncedFrame = frame;
    
    // Set processed timestamp
    syncedFrame.processedTimestamp = getCurrentTime();
    syncedFrame.processingDelay = syncedFrame.processedTimestamp - syncedFrame.timestamp;
    
    // Update statistics
    {
        std::lock_guard<std::mutex> statsLock(statsMutex_);
        stats_.avgVideoDelay = (stats_.avgVideoDelay * (stats_.droppedVideoFrames + stats_.avgVideoDelay) + 
                               syncedFrame.processingDelay) / (stats_.droppedVideoFrames + 1);
    }
    
    videoBuffer_.push(syncedFrame);
    
    // Limit buffer size
    while (videoBuffer_.size() > static_cast<size_t>(config_.bufferDuration * videoFPS_)) {
        videoBuffer_.pop();
        stats_.droppedVideoFrames++;
    }
}

void AudioVideoSynchronizer::addAudioFrame(const AudioFrame& frame) {
    if (!syncEnabled_) return;
    
    std::lock_guard<std::mutex> lock(audioMutex_);
    audioBuffer_.push(frame);
    
    // Limit buffer size
    size_t maxAudioFrames = static_cast<size_t>(config_.bufferDuration * audioSampleRate_ / 1024);
    while (audioBuffer_.size() > maxAudioFrames) {
        audioBuffer_.pop();
    }
}

bool AudioVideoSynchronizer::getSynchronizedFrames(VideoFrameSync& videoFrame, AudioFrame& audioFrame) {
    if (!syncEnabled_) return false;
    
    // Get next video frame
    if (!getNextVideoFrame(videoFrame)) {
        return false;
    }
    
    // Calculate expected audio time
    double expectedAudioTime = calculateExpectedAudioTime(videoFrame.timestamp);
    
    // Find closest audio frame
    {
        std::lock_guard<std::mutex> lock(audioMutex_);
        
        if (audioBuffer_.empty()) {
            return false;
        }
        
        // Find audio frame closest to expected time
        AudioFrame closestFrame = audioBuffer_.front();
        double minDiff = std::abs(closestFrame.timestamp - expectedAudioTime);
        
        std::queue<AudioFrame> tempQueue;
        while (!audioBuffer_.empty()) {
            AudioFrame current = audioBuffer_.front();
            audioBuffer_.pop();
            
            double diff = std::abs(current.timestamp - expectedAudioTime);
            if (diff < minDiff) {
                closestFrame = current;
                minDiff = diff;
            }
            
            tempQueue.push(current);
        }
        
        audioBuffer_ = std::move(tempQueue);
        
        // Apply time stretching if needed
        if (config_.enableTimeStretching && minDiff > config_.syncThreshold) {
            double stretchRatio = expectedAudioTime / closestFrame.timestamp;
            timeStretchAudio(closestFrame, stretchRatio);
            stats_.stretchedAudioFrames++;
        }
        
        audioFrame = closestFrame;
    }
    
    // Update drift
    currentDrift_ = videoFrame.processedTimestamp - audioFrame.timestamp;
    
    return true;
}

bool AudioVideoSynchronizer::getNextVideoFrame(VideoFrameSync& frame) {
    std::lock_guard<std::mutex> lock(videoMutex_);
    
    if (videoBuffer_.empty()) {
        return false;
    }
    
    frame = videoBuffer_.front();
    videoBuffer_.pop();
    
    return true;
}

bool AudioVideoSynchronizer::getNextAudioFrame(AudioFrame& frame) {
    std::lock_guard<std::mutex> lock(audioMutex_);
    
    if (audioBuffer_.empty()) {
        return false;
    }
    
    frame = audioBuffer_.front();
    audioBuffer_.pop();
    
    return true;
}

void AudioVideoSynchronizer::initializeTimeBases() {
    int64_t currentTime = getCurrentTime();
    videoTimeBase_ = currentTime;
    audioTimeBase_ = currentTime;
}

void AudioVideoSynchronizer::calculateDrift() {
    if (videoBuffer_.empty() || audioBuffer_.empty()) {
        return;
    }
    
    std::lock_guard<std::mutex> videoLock(videoMutex_);
    std::lock_guard<std::mutex> audioLock(audioMutex_);
    
    int64_t videoTime = videoBuffer_.front().processedTimestamp;
    int64_t audioTime = audioBuffer_.front().timestamp;
    
    currentDrift_ = static_cast<double>(videoTime - audioTime);
    
    // Update statistics
    {
        std::lock_guard<std::mutex> statsLock(statsMutex_);
        stats_.currentDrift = currentDrift_;
        
        // Calculate sync quality
        double quality = 100.0 - (std::abs(currentDrift_) / config_.maxAllowedDrift) * 100.0;
        stats_.syncQuality = std::max(0.0, std::min(100.0, quality));
    }
}

void AudioVideoSynchronizer::adjustForDrift() {
    if (std::abs(currentDrift_) < config_.syncThreshold) {
        return; // No adjustment needed
    }
    
    if (currentDrift_ > 0) {
        // Video is ahead, drop video frames or stretch audio
        if (config_.enableFrameDropping && shouldDropVideoFrame()) {
            std::lock_guard<std::mutex> lock(videoMutex_);
            if (!videoBuffer_.empty()) {
                videoBuffer_.pop();
                stats_.droppedVideoFrames++;
            }
        }
    } else {
        // Audio is ahead, stretch audio
        if (config_.enableTimeStretching && shouldStretchAudioFrame()) {
            // Audio stretching will be handled in getSynchronizedFrames
        }
    }
}

bool AudioVideoSynchronizer::shouldDropVideoFrame() {
    return currentDrift_ > config_.maxAllowedDrift;
}

bool AudioVideoSynchronizer::shouldStretchAudioFrame() {
    return std::abs(currentDrift_) > config_.syncThreshold;
}

void AudioVideoSynchronizer::timeStretchAudio(AudioFrame& frame, double ratio) {
    if (ratio < 0.5 || ratio > 2.0) {
        return; // Avoid extreme stretching
    }
    
    AudioTimeStretcher stretcher(frame.sampleRate, frame.channels);
    stretcher.setStretchQuality(1); // Good quality
    
    std::vector<float> stretchedSamples;
    if (stretcher.stretchAudio(frame.samples, stretchedSamples, ratio)) {
        frame.samples = std::move(stretchedSamples);
        frame.sampleCount = frame.samples.size() / frame.channels;
        
        // Adjust timestamp
        frame.timestamp = static_cast<int64_t>(frame.timestamp * ratio);
    }
}

void AudioVideoSynchronizer::syncThreadFunction() {
    while (syncThreadActive_) {
        calculateDrift();
        adjustForDrift();
        
        // Sleep for a short interval
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
}

int64_t AudioVideoSynchronizer::getCurrentTime() const {
    auto now = std::chrono::steady_clock::now();
    auto duration = now.time_since_epoch();
    return std::chrono::duration_cast<std::chrono::microseconds>(duration).count();
}

double AudioVideoSynchronizer::calculateExpectedAudioTime(int64_t videoTimestamp) const {
    return static_cast<double>(videoTimestamp - videoTimeBase_) + audioTimeBase_;
}

AudioVideoSynchronizer::SyncStats AudioVideoSynchronizer::getStatistics() const {
    std::lock_guard<std::mutex> lock(statsMutex_);
    return stats_;
}

void AudioVideoSynchronizer::resetStatistics() {
    std::lock_guard<std::mutex> lock(statsMutex_);
    stats_ = SyncStats();
}

// AudioTimeStretcher Implementation
AudioTimeStretcher::AudioTimeStretcher(int sampleRate, int channels)
    : sampleRate_(sampleRate), channels_(channels), stretchQuality_(1),
      pitchCorrectionEnabled_(true), hopSize_(256), frameSize_(512) {
    
    overlapBuffer_.resize(frameSize_ * channels, 0.0f);
    synthesisBuffer_.resize(frameSize_ * channels, 0.0f);
}

AudioTimeStretcher::~AudioTimeStretcher() {
}

bool AudioTimeStretcher::stretchAudio(const std::vector<float>& input,
                                     std::vector<float>& output,
                                     double ratio) {
    if (ratio < 0.5 || ratio > 2.0) {
        return false;
    }
    
    output.clear();
    output.reserve(static_cast<size_t>(input.size() * ratio));
    
    // Simplified WSOLA implementation
    size_t inputPos = 0;
    size_t outputPos = 0;
    
    while (inputPos + frameSize_ < input.size()) {
        // Extract frame
        std::vector<float> frame(input.begin() + inputPos,
                                input.begin() + inputPos + frameSize_);
        
        // Apply window
        std::vector<float> window;
        generateHannWindow(window, frameSize_);
        applyWindow(frame, window);
        
        // Add to output
        if (outputPos == 0) {
            output.insert(output.end(), frame.begin(), frame.end());
        } else {
            // Overlap-add
            for (size_t i = 0; i < frameSize_ && outputPos + i < output.size(); ++i) {
                output[outputPos + i] = (output[outputPos + i] + frame[i]) * 0.5f;
            }
        }
        
        // Advance positions
        inputPos += static_cast<size_t>(hopSize_ * ratio);
        outputPos += hopSize_;
    }
    
    return true;
}

void AudioTimeStretcher::generateHannWindow(std::vector<float>& window, size_t size) {
    window.resize(size);
    for (size_t i = 0; i < size; ++i) {
        window[i] = 0.5f * (1.0f - std::cos(2.0f * M_PI * i / (size - 1)));
    }
}

void AudioTimeStretcher::applyWindow(std::vector<float>& data, const std::vector<float>& window) {
    for (size_t i = 0; i < data.size() && i < window.size(); ++i) {
        data[i] *= window[i];
    }
}

// SyncQualityMonitor Implementation
SyncQualityMonitor::SyncQualityMonitor()
    : currentQuality_(100.0), averageQuality_(100.0), peakDrift_(0.0),
      totalDrift_(0.0), syncErrors_(0), totalSamples_(0) {
    
    startTime_ = std::chrono::steady_clock::now();
}

SyncQualityMonitor::~SyncQualityMonitor() {
}

void SyncQualityMonitor::addSyncPoint(double videoTime, double audioTime) {
    std::lock_guard<std::mutex> lock(pointsMutex_);
    
    syncPoints_.emplace_back(videoTime, audioTime);
    
    // Keep only recent points
    if (syncPoints_.size() > 1000) {
        syncPoints_.erase(syncPoints_.begin());
    }
    
    // Calculate drift
    double drift = videoTime - audioTime;
    totalDrift_ += std::abs(drift);
    peakDrift_ = std::max(peakDrift_, std::abs(drift));
    
    if (std::abs(drift) > 40.0) { // 40ms threshold
        syncErrors_++;
    }
    
    totalSamples_++;
    updateQualityMetrics();
}

double SyncQualityMonitor::getCurrentQuality() const {
    std::lock_guard<std::mutex> lock(pointsMutex_);
    return currentQuality_;
}

void SyncQualityMonitor::updateQualityMetrics() {
    if (syncPoints_.empty()) {
        return;
    }
    
    // Calculate average drift
    double avgDrift = totalDrift_ / totalSamples_;
    
    // Calculate quality score
    currentQuality_ = calculateQualityScore(avgDrift);
    
    // Update running average
    averageQuality_ = (averageQuality_ * (totalSamples_ - 1) + currentQuality_) / totalSamples_;
}

double SyncQualityMonitor::calculateQualityScore(double drift) const {
    // Quality decreases with drift
    double quality = 100.0 - (drift / 40.0) * 100.0; // 40ms = 0% quality
    return std::max(0.0, std::min(100.0, quality));
}

} // namespace kronop
