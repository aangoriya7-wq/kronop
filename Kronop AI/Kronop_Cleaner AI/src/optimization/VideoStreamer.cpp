/**
 * VideoStreamer.cpp
 * Implementation of Real-time Video Streaming Support
 * High-performance chunk processing with adaptive buffering
 */

#include "VideoStreamer.hpp"
#include "ChunkManager.hpp"
#include <algorithm>
#include <chrono>
#include <iostream>
#include <cstring>

namespace kronop {

// VideoStreamer Implementation
VideoStreamer::VideoStreamer(const StreamConfig& config)
    : config_(config), videoWidth_(0), videoHeight_(0), videoChannels_(3),
      streamingActive_(false), streamingPaused_(false), streamHealthy_(true),
      currentQuality_(1.0), targetFPS_(config.targetFPS),
      nextFrameNumber_(0), nextChunkId_(0) {
    
    lastStatsUpdate_ = std::chrono::high_resolution_clock::now();
    lastQualityAdjustment_ = std::chrono::high_resolution_clock::now();
}

VideoStreamer::~VideoStreamer() {
    shutdown();
}

bool VideoStreamer::initialize(int width, int height, int channels) {
    videoWidth_ = width;
    videoHeight_ = height;
    videoChannels_ = channels;
    
    // Reset statistics
    resetStatistics();
    
    // Set initial quality
    currentQuality_ = 1.0;
    targetFPS_ = config_.targetFPS;
    
    return true;
}

void VideoStreamer::shutdown() {
    stopStreaming();
    
    // Clear all buffers
    {
        std::lock_guard<std::mutex> lock(inputMutex_);
        while (!inputBuffer_.empty()) {
            inputBuffer_.pop();
        }
    }
    
    {
        std::lock_guard<std::mutex> lock(outputMutex_);
        while (!outputBuffer_.empty()) {
            outputBuffer_.pop();
        }
    }
    
    {
        std::lock_guard<std::mutex> lock(chunkMutex_);
        while (!chunkQueue_.empty()) {
            chunkQueue_.pop();
        }
        while (!completedChunks_.empty()) {
            completedChunks_.pop();
        }
    }
}

bool VideoStreamer::startStreaming() {
    if (streamingActive_) {
        return true;
    }
    
    streamingActive_ = true;
    streamingPaused_ = false;
    streamHealthy_ = true;
    
    // Start processing threads
    processingThreads_.resize(config_.processingThreads);
    for (int i = 0; i < config_.processingThreads; ++i) {
        processingThreads_[i] = std::make_unique<std::thread>([this, i]() {
            processingThreadFunction(i);
        });
    }
    
    // Start chunking thread
    chunkingThread_ = std::make_unique<std::thread>([this]() {
        chunkingThreadFunction();
    });
    
    // Start monitoring thread
    monitoringThread_ = std::make_unique<std::thread>([this]() {
        monitoringThreadFunction();
    });
    
    return true;
}

void VideoStreamer::stopStreaming() {
    streamingActive_ = false;
    
    // Notify all waiting threads
    inputCondition_.notify_all();
    outputCondition_.notify_all();
    chunkCondition_.notify_all();
    
    // Join all threads
    for (auto& thread : processingThreads_) {
        if (thread && thread->joinable()) {
            thread->join();
        }
    }
    processingThreads_.clear();
    
    if (chunkingThread_ && chunkingThread_->joinable()) {
        chunkingThread_->join();
    }
    chunkingThread_.reset();
    
    if (monitoringThread_ && monitoringThread_->joinable()) {
        monitoringThread_->join();
    }
    monitoringThread_.reset();
}

bool VideoStreamer::addFrame(const VideoFrame& frame) {
    std::lock_guard<std::mutex> lock(inputMutex_);
    
    if (!streamingActive_ || streamingPaused_) {
        return false;
    }
    
    // Check buffer capacity
    if (static_cast<int>(inputBuffer_.size()) >= config_.bufferSizeFrames) {
        // Drop oldest frame if buffer is full
        inputBuffer_.pop();
        
        // Update statistics
        {
            std::lock_guard<std::mutex> statsLock(statsMutex_);
            stats_.droppedFrames++;
        }
    }
    
    // Create a copy of the frame
    VideoFrame frameCopy = frame;
    frameCopy.frameNumber = nextFrameNumber_++;
    
    inputBuffer_.push(frameCopy);
    inputCondition_.notify_one();
    
    return true;
}

bool VideoStreamer::getProcessedFrame(VideoFrame& frame) {
    std::lock_guard<std::mutex> lock(outputMutex_);
    
    if (outputBuffer_.empty()) {
        return false;
    }
    
    frame = outputBuffer_.front();
    outputBuffer_.pop();
    
    outputCondition_.notify_one();
    
    return true;
}

void VideoStreamer::processingThreadFunction(int threadId) {
    while (streamingActive_) {
        VideoFrame frame;
        
        // Wait for frame to process
        {
            std::unique_lock<std::mutex> lock(inputMutex_);
            inputCondition_.wait(lock, [this]() {
                return !inputBuffer_.empty() || !streamingActive_;
            });
            
            if (!streamingActive_) {
                break;
            }
            
            if (inputBuffer_.empty()) {
                continue;
            }
            
            frame = inputBuffer_.front();
            inputBuffer_.pop();
        }
        
        // Process the frame
        bool success = processFrame(frame);
        
        if (success) {
            // Add to output buffer
            {
                std::lock_guard<std::mutex> lock(outputMutex_);
                
                // Check output buffer capacity
                if (static_cast<int>(outputBuffer_.size()) < config_.bufferSizeFrames) {
                    outputBuffer_.push(frame);
                    outputCondition_.notify_one();
                }
            }
            
            // Update statistics
            updateFrameStatistics(frame);
        }
        
        // Adaptive quality adjustment
        if (config_.enableAdaptiveQuality) {
            adjustQuality();
        }
    }
}

void VideoStreamer::chunkingThreadFunction() {
    std::vector<VideoFrame> chunkFrames;
    
    while (streamingActive_) {
        VideoFrame frame;
        
        // Wait for frame to add to chunk
        {
            std::unique_lock<std::mutex> lock(inputMutex_);
            inputCondition_.wait(lock, [this]() {
                return !inputBuffer_.empty() || !streamingActive_;
            });
            
            if (!streamingActive_) {
                break;
            }
            
            if (inputBuffer_.empty()) {
                continue;
            }
            
            frame = inputBuffer_.front();
            inputBuffer_.pop();
        }
        
        chunkFrames.push_back(frame);
        
        // Check if chunk is ready
        if (static_cast<int>(chunkFrames.size()) >= config_.maxChunkSize) {
            // Create chunk
            StreamChunk chunk(nextChunkId_++,
                           chunkFrames.front().frameNumber,
                           chunkFrames.back().frameNumber);
            
            chunk.frames = chunkFrames;
            
            // Add to chunk queue
            {
                std::lock_guard<std::mutex> lock(chunkMutex_);
                
                if (static_cast<int>(chunkQueue_.size()) < config_.maxConcurrentChunks) {
                    chunkQueue_.push(chunk);
                    chunkCondition_.notify_one();
                }
            }
            
            chunkFrames.clear();
        }
    }
}

void VideoStreamer::monitoringThreadFunction() {
    while (streamingActive_) {
        // Update statistics
        updateStatistics();
        
        // Check stream health
        if (!isStreamHealthy()) {
            streamHealthy_ = false;
        }
        
        // Sleep for monitoring interval
        std::this_thread::sleep_for(std::chrono::milliseconds(1000));
    }
}

bool VideoStreamer::processFrame(VideoFrame& frame) {
    auto startTime = std::chrono::high_resolution_clock::now();
    
    // Thread-safe frame processing
    std::lock_guard<std::mutex> processingLock(processingMutex_);
    
    // Apply frame processor callback if set
    if (frameProcessor_) {
        if (!frameProcessor_(frame)) {
            return false;
        }
    } else {
        // Default processing: apply simple enhancement
        for (size_t i = 0; i < frame.data.size(); i += frame.channels) {
            for (int c = 0; c < frame.channels; ++c) {
                double value = static_cast<double>(frame.data[i + c]) / 255.0;
                
                // Apply quality-based enhancement
                value = std::clamp(value * (1.0 + currentQuality_ * 0.2), 0.0, 1.0);
                
                frame.data[i + c] = static_cast<uint8_t>(value * 255.0);
            }
        }
    }
    
    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);
    frame.processingTime = duration.count() / 1000.0; // Convert to milliseconds
    frame.isProcessed = true;
    
    return true;
}

void VideoStreamer::updateFrameStatistics(const VideoFrame& frame) {
    std::lock_guard<std::mutex> lock(statsMutex_);
    
    stats_.totalFramesProcessed++;
    
    // Update average processing time
    stats_.averageProcessingTime = 
        (stats_.averageProcessingTime * (stats_.totalFramesProcessed - 1) + 
         frame.processingTime) / stats_.totalFramesProcessed;
    
    // Calculate current FPS
    auto now = std::chrono::high_resolution_clock::now();
    auto timeDiff = std::chrono::duration_cast<std::chrono::milliseconds>(now - lastStatsUpdate_);
    
    if (timeDiff.count() > 0) {
        stats_.currentFPS = 1000.0 / timeDiff.count();
        lastStatsUpdate_ = now;
    }
}

void VideoStreamer::adjustQuality() {
    std::lock_guard<std::mutex> lock(statsMutex_);
    
    auto now = std::chrono::high_resolution_clock::now();
    auto timeSinceLastAdjustment = std::chrono::duration_cast<std::chrono::milliseconds>(
        now - lastQualityAdjustment_);
    
    // Adjust quality every 5 seconds
    if (timeSinceLastAdjustment.count() < 5000) {
        return;
    }
    
    double currentFPS = stats_.currentFPS;
    double targetFPS = targetFPS_;
    double currentQuality = currentQuality_;
    
    // Calculate quality adjustment
    double fpsRatio = currentFPS / targetFPS;
    
    if (fpsRatio < 0.8) {
        // FPS too low, reduce quality
        currentQuality = std::max(currentQuality * 0.9, 0.3);
    } else if (fpsRatio > 1.2) {
        // FPS good, can increase quality
        currentQuality = std::min(currentQuality * 1.1, 1.0);
    }
    
    currentQuality_ = currentQuality;
    lastQualityAdjustment_ = now;
    
    // Update quality score in statistics
    stats_.qualityScore = currentQuality * 100.0;
}

void VideoStreamer::updateStatistics() {
    std::lock_guard<std::mutex> lock(statsMutex_);
    
    // Update buffer utilization
    updateBufferUtilization();
    
    // Update memory usage
    stats_.memoryUsage = getCurrentMemoryUsage();
    stats_.peakMemoryUsage = std::max(stats_.peakMemoryUsage, stats_.memoryUsage);
    
    // Calculate latency
    calculateLatency();
}

void VideoStreamer::updateBufferUtilization() {
    int inputSize, outputSize;
    
    {
        std::lock_guard<std::mutex> lock(inputMutex_);
        inputSize = static_cast<int>(inputBuffer_.size());
    }
    
    {
        std::lock_guard<std::mutex> lock(outputMutex_);
        outputSize = static_cast<int>(outputBuffer_.size());
    }
    
    int totalBuffered = inputSize + outputSize;
    stats_.bufferUtilization = 
        static_cast<double>(totalBuffered) / (config_.bufferSizeFrames * 2) * 100.0;
}

void VideoStreamer::calculateLatency() {
    // Simple latency calculation based on buffer sizes
    std::lock_guard<std::mutex> lock(statsMutex_);
    
    double processingLatency = stats_.averageProcessingTime;
    double bufferLatency = (stats_.bufferUtilization / 100.0) * 
                         (1000.0 / stats_.currentFPS);
    
    // This would be more accurate with actual timestamps
    // For now, use estimated latency
}

size_t VideoStreamer::getCurrentMemoryUsage() const {
    size_t totalMemory = 0;
    
    // Calculate memory from buffers
    {
        std::lock_guard<std::mutex> lock(inputMutex_);
        totalMemory += inputBuffer_.size() * videoWidth_ * videoHeight_ * videoChannels_;
    }
    
    {
        std::lock_guard<std::mutex> lock(outputMutex_);
        totalMemory += outputBuffer_.size() * videoWidth_ * videoHeight_ * videoChannels_;
    }
    
    {
        std::lock_guard<std::mutex> lock(chunkMutex_);
        totalMemory += chunkQueue_.size() * config_.maxChunkSize * 
                      videoWidth_ * videoHeight_ * videoChannels_;
    }
    
    return totalMemory;
}

StreamStats VideoStreamer::getStatistics() const {
    std::lock_guard<std::mutex> lock(statsMutex_);
    return stats_;
}

void VideoStreamer::resetStatistics() {
    std::lock_guard<std::mutex> lock(statsMutex_);
    stats_ = StreamStats();
    lastStatsUpdate_ = std::chrono::high_resolution_clock::now();
}

bool VideoStreamer::isStreamHealthy() const {
    std::lock_guard<std::mutex> lock(statsMutex_);
    
    // Check various health indicators
    bool fpsHealthy = stats_.currentFPS >= targetFPS_ * 0.5;
    bool bufferHealthy = stats_.bufferUtilization <= 90.0;
    bool memoryHealthy = stats_.memoryUsage < 1024 * 1024 * 1024; // 1GB limit
    
    return fpsHealthy && bufferHealthy && memoryHealthy && streamingActive_;
}

// AdaptiveQualityManager Implementation
AdaptiveQualityManager::AdaptiveQualityManager(double targetFPS)
    : targetFPS_(targetFPS), minFPS_(15.0), maxFPS_(60.0),
      minQuality_(0.3), maxQuality_(1.0), aggressiveness_(0.5),
      enablePredictive_(true), currentQuality_(1.0), lastFPS_(targetFPS),
      lastProcessingTime_(0.0) {
    
    qualityWeights_.resize(10, 1.0); // Default weights
}

double AdaptiveQualityManager::calculateOptimalQuality(double currentFPS, 
                                                     double currentQuality) {
    updatePerformanceHistory(currentFPS, currentQuality);
    
    if (enablePredictive_) {
        double predictedFPS = predictPerformance(currentQuality);
        double qualityAdjustment = (predictedFPS - targetFPS_) / targetFPS_;
        
        // Apply aggressiveness
        qualityAdjustment *= aggressiveness_;
        
        double newQuality = currentQuality - qualityAdjustment * 0.1;
        newQuality = std::clamp(newQuality, minQuality_, maxQuality_);
        
        smoothQualityAdjustment(newQuality);
        currentQuality_ = newQuality;
    } else {
        // Simple reactive adjustment
        double fpsRatio = currentFPS / targetFPS_;
        
        if (fpsRatio < 0.8) {
            currentQuality_ = std::max(currentQuality_ * 0.95, minQuality_);
        } else if (fpsRatio > 1.1) {
            currentQuality_ = std::min(currentQuality_ * 1.02, maxQuality_);
        }
    }
    
    return currentQuality_;
}

void AdaptiveQualityManager::updatePerformanceHistory(double fps, double quality) {
    performanceHistory_.emplace_back(fps, quality);
    
    // Keep history size limited
    if (performanceHistory_.size() > MAX_HISTORY_SIZE) {
        performanceHistory_.erase(performanceHistory_.begin());
    }
}

double AdaptiveQualityManager::predictPerformance(double quality) {
    if (performanceHistory_.size() < 5) {
        return targetFPS_; // Not enough data
    }
    
    // Simple linear regression based on recent history
    double sumX = 0.0, sumY = 0.0, sumXY = 0.0, sumX2 = 0.0;
    int n = std::min(static_cast<int>(performanceHistory_.size()), 20);
    
    for (int i = performanceHistory_.size() - n; i < performanceHistory_.size(); ++i) {
        double q = performanceHistory_[i].second;
        double f = performanceHistory_[i].first;
        
        sumX += q;
        sumY += f;
        sumXY += q * f;
        sumX2 += q * q;
    }
    
    // Linear regression: FPS = a * Quality + b
    double denominator = n * sumX2 - sumX * sumX;
    if (std::abs(denominator) < 1e-6) {
        return targetFPS_;
    }
    
    double a = (n * sumXY - sumX * sumY) / denominator;
    double b = (sumY - a * sumX) / n;
    
    double predictedFPS = a * quality + b;
    return std::clamp(predictedFPS, minFPS_, maxFPS_);
}

void AdaptiveQualityManager::smoothQualityAdjustment(double& newQuality) {
    // Apply exponential smoothing
    double alpha = 0.3; // Smoothing factor
    newQuality = alpha * newQuality + (1.0 - alpha) * currentQuality_;
}

// StreamBufferManager Implementation
StreamBufferManager::StreamBufferManager(size_t maxMemoryMB)
    : maxMemory_(maxMemoryMB * 1024 * 1024), usedMemory_(0),
      cleanupThreshold_(0.8) {
}

bool StreamBufferManager::allocateFrameBuffer(VideoFrame& frame) {
    size_t requiredSize = calculateFrameSize(frame);
    
    if (usedMemory_ + requiredSize > maxMemory_) {
        optimizeBuffers();
        
        if (usedMemory_ + requiredSize > maxMemory_) {
            return false;
        }
    }
    
    // Allocate from pool or create new
    std::vector<uint8_t> buffer;
    if (!allocateFromPool(requiredSize, buffer)) {
        buffer.resize(requiredSize);
    }
    
    frame.data = std::move(buffer);
    usedMemory_ += requiredSize;
    
    activeFrames_.push_back(&frame);
    
    return true;
}

size_t StreamBufferManager::calculateFrameSize(const VideoFrame& frame) {
    return frame.width * frame.height * frame.channels;
}

void StreamBufferManager::optimizeBuffers() {
    if (usedMemory_ < maxMemory_ * cleanupThreshold_) {
        return;
    }
    
    cleanupExpiredBuffers();
    
    // If still over threshold, deallocate oldest buffers
    if (usedMemory_ > maxMemory_ * cleanupThreshold_) {
        // Sort frames by timestamp (oldest first)
        std::sort(activeFrames_.begin(), activeFrames_.end(),
                 [](const VideoFrame* a, const VideoFrame* b) {
                     return a->timestamp < b->timestamp;
                 });
        
        // Deallocate oldest frames until under threshold
        size_t targetMemory = maxMemory_ * cleanupThreshold_ * 0.8;
        
        for (auto it = activeFrames_.begin(); it != activeFrames_.end();) {
            if (usedMemory_ <= targetMemory) {
                break;
            }
            
            VideoFrame* frame = *it;
            size_t frameSize = calculateFrameSize(*frame);
            
            deallocateFrameBuffer(*frame);
            it = activeFrames_.erase(it);
        }
    }
}

bool StreamBufferManager::allocateFromPool(size_t size, std::vector<uint8_t>& buffer) {
    // Look for suitable buffer in pool
    for (auto it = framePool_.begin(); it != framePool_.end(); ++it) {
        if (it->size() >= size) {
            buffer = std::move(*it);
            framePool_.erase(it);
            return true;
        }
    }
    
    return false;
}

void StreamBufferManager::returnToPool(std::vector<uint8_t>& buffer) {
    if (buffer.empty()) {
        return;
    }
    
    framePool_.push_back(std::move(buffer));
}

} // namespace kronop
