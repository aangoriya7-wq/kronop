/**
 * ChunkManager.cpp
 * Implementation of Advanced Chunk & Tile Processing System
 * Memory-efficient processing for large 4K video files
 */

#include "ChunkManager.hpp"
#include <algorithm>
#include <fstream>
#include <chrono>
#include <iostream>
#include <cstring>

namespace kronop {

// ChunkManager Implementation
ChunkManager::ChunkManager(const TileConfig& config)
    : config_(config), videoWidth_(0), videoHeight_(0), videoChannels_(3),
      totalFrames_(0), framesPerChunk_(30), streamingEnabled_(false),
      streamingComplete_(false), currentChunkIndex_(0), processingActive_(false),
      currentMemoryUsage_(0), peakMemoryUsage_(0), maxMemoryUsage_(config.maxMemoryUsage * 1024 * 1024),
      memoryPressure_(false), is4KMode_(false), tileSize4K_(256), active4KTiles_(0) {
    
    // Initialize statistics
    resetStatistics();
    
    // Validate memory constraints for 4K
    validateMemoryConstraints();
}

ChunkManager::~ChunkManager() {
    stopAsyncProcessing();
}

bool ChunkManager::initializeVideoFile(const std::string& filePath, 
                                      int width, int height, int channels) {
    videoFilePath_ = filePath;
    videoWidth_ = width;
    videoHeight_ = height;
    videoChannels_ = channels;
    
    // Check for 4K resolution and optimize
    if (is4KResolution(width, height)) {
        is4KMode_ = true;
        optimizeFor4K();
        std::cout << "4K resolution detected: " << width << "x" << height << 
                     " - Optimizing tile layout" << std::endl;
    }
    
    // Load video file metadata
    if (!loadVideoFileMetadata(filePath)) {
        // For demo, assume 1000 frames
        totalFrames_ = 1000;
        framesPerChunk_ = std::min(30, totalFrames_);
    }
    
    // Initialize chunks with optimized settings
    initializeChunks();
    
    return true;
}

void ChunkManager::initializeChunks() {
    chunks_.clear();
    
    int numChunks = (totalFrames_ + framesPerChunk_ - 1) / framesPerChunk_;
    
    for (int i = 0; i < numChunks; ++i) {
        VideoChunk chunk;
        chunk.chunkId = i;
        chunk.startFrame = i * framesPerChunk_;
        chunk.endFrame = std::min((i + 1) * framesPerChunk_, totalFrames_);
        chunk.width = videoWidth_;
        chunk.height = videoHeight_;
        chunk.channels = videoChannels_;
        
        // Estimate data size (assuming raw RGB data)
        size_t frameSize = width * height * channels;
        size_t chunkSize = frameSize * (chunk.endFrame - chunk.startFrame);
        chunk.dataSize = chunkSize;
        
        chunks_.push_back(chunk);
    }
    
    // Update statistics
    {
        std::lock_guard<std::mutex> lock(statsMutex_);
        stats_.totalChunks = numChunks;
        stats_.totalTiles = numChunks * calculateTilesPerFrame();
    }
}

int ChunkManager::calculateTilesPerFrame() const {
    int tilesX = (videoWidth_ + config_.tileWidth - config_.overlapSize - 1) / 
                 (config_.tileWidth - config_.overlapSize);
    int tilesY = (videoHeight_ + config_.tileHeight - config_.overlapSize - 1) / 
                 (config_.tileHeight - config_.overlapSize);
    return tilesX * tilesY;
}

bool ChunkManager::loadChunk(int chunkId, VideoChunk& chunk) {
    if (chunkId < 0 || chunkId >= static_cast<int>(chunks_.size())) {
        return false;
    }
    
    chunk = chunks_[chunkId];
    
    // Enhanced memory constraint checking for 4K
    size_t requiredMemory = chunk.dataSize;
    if (is4KMode_) {
        // Add 25% buffer for 4K processing overhead
        requiredMemory = static_cast<size_t>(requiredMemory * 1.25);
    }
    
    if (currentMemoryUsage_ + requiredMemory > maxMemoryUsage_) {
        optimizeMemoryUsage();
        
        // If still over limit, trigger emergency cleanup
        if (currentMemoryUsage_ + requiredMemory > maxMemoryUsage_) {
            emergencyMemoryCleanup();
        }
        
        // Final check
        if (currentMemoryUsage_ + requiredMemory > maxMemoryUsage_) {
            std::cerr << "Insufficient memory to load chunk " << chunkId << 
                         " (required: " << requiredMemory / 1024 / 1024 << "MB, " <<
                         "available: " << (maxMemoryUsage_ - currentMemoryUsage_) / 1024 / 1024 << "MB)" << std::endl;
            return false;
        }
    }
    
    // Simulate loading chunk data
    chunk.data.resize(chunk.dataSize);
    
    // For demo, fill with test pattern
    for (size_t i = 0; i < chunk.dataSize; ++i) {
        chunk.data[i] = static_cast<uint8_t>((i * 7) % 256);
    }
    
    chunk.isLoaded = true;
    updateMemoryUsage(requiredMemory);
    
    return true;
}

bool ChunkManager::processChunk(int chunkId) {
    if (chunkId < 0 || chunkId >= static_cast<int>(chunks_.size())) {
        return false;
    }
    
    VideoChunk& chunk = chunks_[chunkId];
    if (!chunk.isLoaded) {
        if (!loadChunk(chunkId, chunk)) {
            return false;
        }
    }
    
    auto startTime = std::chrono::high_resolution_clock::now();
    
    // Process each frame in the chunk
    int frameCount = chunk.endFrame - chunk.startFrame;
    size_t frameSize = chunk.width * chunk.height * chunk.channels;
    
    for (int frameOffset = 0; frameOffset < frameCount; ++frameOffset) {
        int frameNumber = chunk.startFrame + frameOffset;
        
        // Extract frame data
        std::vector<uint8_t> frameData(chunk.data.begin() + frameOffset * frameSize,
                                      chunk.data.begin() + (frameOffset + 1) * frameSize);
        
        // Create tiles from frame
        std::vector<Tile> tiles = createTilesFromFrame(frameData, frameNumber, chunkId);
        
        // Process each tile
        for (Tile& tile : tiles) {
            if (!processTile(tile)) {
                std::cerr << "Failed to process tile " << tile.tileId << std::endl;
                continue;
            }
            
            // Update statistics
            {
                std::lock_guard<std::mutex> lock(statsMutex_);
                stats_.processedTiles++;
                stats_.avgProcessingTime = (stats_.avgProcessingTime * (stats_.processedTiles - 1) + 
                                           tile.processingTime) / stats_.processedTiles;
            }
        }
        
        // Assemble tiles back to frame
        std::vector<uint8_t> processedFrame;
        if (assembleTilesToFrame(tiles, processedFrame)) {
            // Store processed frame back to chunk
            std::copy(processedFrame.begin(), processedFrame.end(),
                     chunk.data.begin() + frameOffset * frameSize);
        }
    }
    
    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);
    
    chunk.isProcessed = true;
    
    // Update statistics
    {
        std::lock_guard<std::mutex> lock(statsMutex_);
        stats_.processedChunks++;
        
        double processingTime = duration.count();
        stats_.processingFPS = frameCount / (processingTime / 1000.0);
    }
    
    return true;
}

std::vector<Tile> ChunkManager::createTilesFromFrame(const std::vector<uint8_t>& frameData,
                                                    int frameNumber, int chunkId) {
    std::vector<Tile> tiles;
    
    int effectiveTileWidth = config_.tileWidth - config_.overlapSize;
    int effectiveTileHeight = config_.tileHeight - config_.overlapSize;
    
    int tilesX = (videoWidth_ + effectiveTileWidth - 1) / effectiveTileWidth;
    int tilesY = (videoHeight_ + effectiveTileHeight - 1) / effectiveTileHeight;
    
    // Convert frame to double precision
    std::vector<double> frameDouble(videoWidth_ * videoHeight_ * videoChannels_);
    for (size_t i = 0; i < frameData.size(); ++i) {
        frameDouble[i] = static_cast<double>(frameData[i]) / 255.0;
    }
    
    int tileId = 0;
    for (int ty = 0; ty < tilesY; ++ty) {
        for (int tx = 0; tx < tilesX; ++tx) {
            Tile tile(tileId++);
            tile.chunkId = chunkId;
            tile.frameNumber = frameNumber;
            tile.tileX = tx;
            tile.tileY = ty;
            
            // Calculate tile position and size
            tile.offsetX = tx * effectiveTileWidth;
            tile.offsetY = ty * effectiveTileHeight;
            
            tile.width = std::min(config_.tileWidth, videoWidth_ - tile.offsetX);
            tile.height = std::min(config_.tileHeight, videoHeight_ - tile.offsetY);
            
            // Extract tile data
            tile.data = extractTile(frameDouble, videoWidth_, videoHeight_,
                                   tile.offsetX, tile.offsetY, tile.width, tile.height);
            
            tiles.push_back(tile);
        }
    }
    
    return tiles;
}

Tile ChunkManager::extractTile(const std::vector<double>& frameData,
                             int frameWidth, int frameHeight,
                             int tileX, int tileY, int tileWidth, int tileHeight) {
    Tile tile;
    tile.width = tileWidth;
    tile.height = tileHeight;
    tile.offsetX = tileX;
    tile.offsetY = tileY;
    
    tile.data.resize(tileWidth * tileHeight * videoChannels_);
    
    for (int c = 0; c < videoChannels_; ++c) {
        for (int y = 0; y < tileHeight; ++y) {
            for (int x = 0; x < tileWidth; ++x) {
                int srcX = tileX + x;
                int srcY = tileY + y;
                
                if (srcX < frameWidth && srcY < frameHeight) {
                    int srcIdx = (srcY * frameWidth + srcX) * videoChannels_ + c;
                    int dstIdx = (y * tileWidth + x) * videoChannels_ + c;
                    tile.data[dstIdx] = frameData[srcIdx];
                } else {
                    // Fill with zeros for out-of-bounds
                    int dstIdx = (y * tileWidth + x) * videoChannels_ + c;
                    tile.data[dstIdx] = 0.0;
                }
            }
        }
    }
    
    return tile;
}

bool ChunkManager::processTile(Tile& tile) {
    if (tile.data.empty()) {
        return false;
    }
    
    auto startTime = std::chrono::high_resolution_clock::now();
    
    // Apply processing to tile data
    // For demo, apply simple enhancement
    tile.output = tile.data;
    
    for (size_t i = 0; i < tile.output.size(); i += videoChannels_) {
        // Simple contrast enhancement
        for (int c = 0; c < videoChannels_; ++c) {
            double value = tile.output[i + c];
            value = std::clamp(value * 1.2 - 0.1, 0.0, 1.0);
            tile.output[i + c] = value;
        }
    }
    
    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);
    tile.processingTime = duration.count() / 1000.0; // Convert to milliseconds
    
    tile.isProcessed = true;
    return true;
}

bool ChunkManager::assembleTilesToFrame(const std::vector<Tile>& tiles,
                                       std::vector<uint8_t>& outputFrame) {
    if (tiles.empty()) {
        return false;
    }
    
    outputFrame.resize(videoWidth_ * videoHeight_ * videoChannels_);
    std::fill(outputFrame.begin(), outputFrame.end(), 0);
    
    // Accumulation buffer for blending overlapping regions
    std::vector<double> weightBuffer(videoWidth_ * videoHeight_, 0.0);
    std::vector<double> frameBuffer(videoWidth_ * videoHeight_ * videoChannels_, 0.0);
    
    // Assemble tiles with overlap blending
    for (const Tile& tile : tiles) {
        if (!tile.isProcessed || tile.output.empty()) {
            continue;
        }
        
        blendTileOverlap(frameBuffer, tile, videoWidth_, videoHeight_);
    }
    
    // Convert back to uint8_t
    for (size_t i = 0; i < outputFrame.size(); ++i) {
        outputFrame[i] = static_cast<uint8_t>(std::clamp(frameBuffer[i] * 255.0, 0.0, 255.0));
    }
    
    return true;
}

void ChunkManager::blendTileOverlap(std::vector<double>& frameData,
                                   const Tile& tile, int frameWidth, int frameHeight) {
    int effectiveTileWidth = config_.tileWidth - config_.overlapSize;
    int effectiveTileHeight = config_.tileHeight - config_.overlapSize;
    
    for (int c = 0; c < videoChannels_; ++c) {
        for (int y = 0; y < tile.height; ++y) {
            for (int x = 0; x < tile.width; ++x) {
                int frameX = tile.offsetX + x;
                int frameY = tile.offsetY + y;
                
                if (frameX >= 0 && frameX < frameWidth && frameY >= 0 && frameY < frameHeight) {
                    int frameIdx = (frameY * frameWidth + frameX) * videoChannels_ + c;
                    int tileIdx = (y * tile.width + x) * videoChannels_ + c;
                    
                    // Calculate blending weight for overlap regions
                    double weight = 1.0;
                    
                    // Edge blending for overlap regions
                    if (config_.overlapSize > 0) {
                        int edgeX = x - effectiveTileWidth;
                        int edgeY = y - effectiveTileHeight;
                        
                        if (edgeX >= 0 && edgeX < config_.overlapSize) {
                            weight *= static_cast<double>(edgeX + 1) / (config_.overlapSize + 1);
                        } else if (x < config_.overlapSize) {
                            weight *= static_cast<double>(x + 1) / (config_.overlapSize + 1);
                        }
                        
                        if (edgeY >= 0 && edgeY < config_.overlapSize) {
                            weight *= static_cast<double>(edgeY + 1) / (config_.overlapSize + 1);
                        } else if (y < config_.overlapSize) {
                            weight *= static_cast<double>(y + 1) / (config_.overlapSize + 1);
                        }
                    }
                    
                    frameData[frameIdx] += tile.output[tileIdx] * weight;
                }
            }
        }
    }
}

void ChunkManager::updateMemoryUsage(size_t delta) {
    currentMemoryUsage_ += delta;
    if (currentMemoryUsage_ > peakMemoryUsage_) {
        peakMemoryUsage_ = currentMemoryUsage_;
    }
    
    // Update statistics
    {
        std::lock_guard<std::mutex> lock(statsMutex_);
        stats_.currentMemoryUsage = currentMemoryUsage_;
        stats_.peakMemoryUsage = peakMemoryUsage_;
    }
}

void ChunkManager::optimizeMemoryUsage() {
    // Clean up processed chunks that are no longer needed
    cleanupProcessedChunks();
    
    // If still over limit, remove oldest chunks
    if (currentMemoryUsage_ > maxMemoryUsage_) {
        size_t targetReduction = currentMemoryUsage_ - maxMemoryUsage_ + (maxMemoryUsage_ / 4);
        
        for (auto& chunk : chunks_) {
            if (chunk.isLoaded && chunk.isProcessed && targetReduction > 0) {
                size_t chunkSize = chunk.data.size();
                chunk.data.clear();
                chunk.data.shrink_to_fit();
                chunk.isLoaded = false;
                
                updateMemoryUsage(-static_cast<int>(chunkSize));
                targetReduction -= chunkSize;
            }
        }
    }
}

void ChunkManager::cleanupProcessedChunks() {
    for (auto& chunk : chunks_) {
        if (chunk.isProcessed && chunk.isLoaded) {
            // Check if this chunk is still needed for overlap with adjacent chunks
            bool stillNeeded = false;
            
            for (const auto& otherChunk : chunks_) {
                if (!otherChunk.isProcessed && 
                    std::abs(otherChunk.chunkId - chunk.chunkId) <= 1) {
                    stillNeeded = true;
                    break;
                }
            }
            
            if (!stillNeeded) {
                size_t chunkSize = chunk.data.size();
                chunk.data.clear();
                chunk.data.shrink_to_fit();
                chunk.isLoaded = false;
                
                updateMemoryUsage(-static_cast<int>(chunkSize));
            }
        }
    }
}

void ChunkManager::enableStreamingMode(bool enable) {
    streamingEnabled_ = enable;
    streamingComplete_ = false;
    currentChunkIndex_ = 0;
    
    if (enable) {
        startAsyncProcessing();
    } else {
        stopAsyncProcessing();
    }
}

void ChunkManager::startAsyncProcessing() {
    if (processingActive_) {
        return;
    }
    
    processingActive_ = true;
    processingThread_ = std::make_unique<std::thread>([this]() {
        while (processingActive_) {
            std::unique_lock<std::mutex> lock(processingMutex_);
            
            // Wait for work or stop signal
            processingCondition_.wait(lock, [this]() {
                return !processingActive_ || !processingQueue_.empty();
            });
            
            if (!processingActive_) {
                break;
            }
            
            if (!processingQueue_.empty()) {
                int chunkId = processingQueue_.front();
                processingQueue_.pop();
                lock.unlock();
                
                processChunkAsync(chunkId);
            }
        }
    });
}

void ChunkManager::processChunkAsync(int chunkId) {
    processChunk(chunkId);
    
    {
        std::lock_guard<std::mutex> lock(processingMutex_);
        completedQueue_.push(chunkId);
    }
    
    // Notify completion
    processingCondition_.notify_one();
}

void ChunkManager::stopAsyncProcessing() {
    processingActive_ = false;
    processingCondition_.notify_all();
    
    if (processingThread_ && processingThread_->joinable()) {
        processingThread_->join();
    }
    
    processingThread_.reset();
}

ChunkStats ChunkManager::getStatistics() const {
    std::lock_guard<std::mutex> lock(statsMutex_);
    return stats_;
}

void ChunkManager::resetStatistics() {
    std::lock_guard<std::mutex> lock(statsMutex_);
    stats_ = ChunkStats();
    stats_.totalChunks = static_cast<int>(chunks_.size());
    stats_.totalTiles = stats_.totalChunks * calculateTilesPerFrame();
}

// StreamingProcessor Implementation
StreamingProcessor::StreamingProcessor(const TileConfig& config)
    : streamingActive_(false), bufferSize_(10), numProcessingThreads_(4),
      currentFPS_(0.0), streamHealthy_(true) {
    
    chunkManager_ = std::make_unique<ChunkManager>(config);
}

StreamingProcessor::~StreamingProcessor() {
    stopStream();
}

bool StreamingProcessor::initializeStream(const std::string& inputPath, 
                                        const std::string& outputPath) {
    // Initialize chunk manager for streaming
    if (!chunkManager_->initializeVideoFile(inputPath, 1920, 1080, 3)) {
        return false;
    }
    
    chunkManager_->enableStreamingMode(true);
    
    // Start worker threads
    streamingActive_ = true;
    workerThreads_.resize(numProcessingThreads_);
    
    for (int i = 0; i < numProcessingThreads_; ++i) {
        workerThreads_[i] = std::make_unique<std::thread>([this, i]() {
            workerThreadFunction(i);
        });
    }
    
    return true;
}

void StreamingProcessor::workerThreadFunction(int threadId) {
    while (streamingActive_) {
        std::unique_lock<std::mutex> lock(bufferMutex_);
        
        // Wait for input data
        bufferCondition_.wait(lock, [this]() {
            return !inputBuffer_.empty() || !streamingActive_;
        });
        
        if (!streamingActive_) {
            break;
        }
        
        if (!inputBuffer_.empty()) {
            auto frameData = inputBuffer_.front();
            inputBuffer_.pop();
            lock.unlock();
            
            // Process frame
            // For demo, just pass through
            std::vector<uint8_t> processedFrame = frameData;
            
            // Add to output buffer
            {
                std::lock_guard<std::mutex> outputLock(bufferMutex_);
                outputBuffer_.push(processedFrame);
            }
            
            bufferCondition_.notify_one();
        }
    }
}

bool StreamingProcessor::processFrame(const std::vector<uint8_t>& frameData, int frameNumber) {
    std::lock_guard<std::mutex> lock(bufferMutex_);
    
    if (inputBuffer_.size() >= bufferSize_) {
        return false; // Buffer full
    }
    
    inputBuffer_.push(frameData);
    bufferCondition_.notify_one();
    
    return true;
}

bool StreamingProcessor::getProcessedFrame(std::vector<uint8_t>& frameData, int frameNumber) {
    std::lock_guard<std::mutex> lock(bufferMutex_);
    
    if (outputBuffer_.empty()) {
        return false;
    }
    
    frameData = outputBuffer_.front();
    outputBuffer_.pop();
    
    return true;
}

void StreamingProcessor::stopStream() {
    streamingActive_ = false;
    bufferCondition_.notify_all();
    
    for (auto& thread : workerThreads_) {
        if (thread && thread->joinable()) {
            thread->join();
        }
    }
    
    workerThreads_.clear();
}

// TileMemoryPool Implementation
TileMemoryPool::TileMemoryPool(size_t poolSizeMB)
    : totalPoolSize_(poolSizeMB * 1024 * 1024), availableMemory_(totalPoolSize_),
      peakUsage_(0), allocationCount_(0) {
    
    // Create initial memory blocks
    const size_t blockSize = 1024 * 1024; // 1MB blocks
    int numBlocks = totalPoolSize_ / blockSize;
    
    memoryBlocks_.reserve(numBlocks);
    for (int i = 0; i < numBlocks; ++i) {
        void* ptr = std::malloc(blockSize);
        if (ptr) {
            memoryBlocks_.emplace_back(ptr, blockSize);
        }
    }
}

TileMemoryPool::~TileMemoryPool() {
    for (auto& block : memoryBlocks_) {
        if (block.ptr) {
            std::free(block.ptr);
        }
    }
}

void* TileMemoryPool::allocateTile(size_t size) {
    std::lock_guard<std::mutex> lock(poolMutex_);
    
    if (size > availableMemory_) {
        return nullptr;
    }
    
    return allocateFromPool(size);
}

void TileMemoryPool::deallocateTile(void* ptr) {
    std::lock_guard<std::mutex> lock(poolMutex_);
    
    // Find the block and mark as free
    for (auto& block : memoryBlocks_) {
        if (block.ptr == ptr) {
            block.inUse = false;
            availableMemory_ += block.size;
            return;
        }
    }
}

void* TileMemoryPool::allocateFromPool(size_t size) {
    MemoryBlock block;
    if (findFreeBlock(size, block)) {
        block.inUse = true;
        availableMemory_ -= block.size;
        allocationCount_++;
        
        size_t currentUsage = totalPoolSize_ - availableMemory_;
        if (currentUsage > peakUsage_) {
            peakUsage_ = currentUsage;
        }
        
        return block.ptr;
    }
    
    return nullptr;
}

bool TileMemoryPool::findFreeBlock(size_t size, MemoryBlock& block) {
    for (auto& memBlock : memoryBlocks_) {
        if (!memBlock.inUse && memBlock.size >= size) {
            block = memBlock;
            return true;
        }
    }
    
    return false;
}

} // namespace kronop

// 4K Support and Memory Optimization Implementation

bool ChunkManager::is4KResolution(int width, int height) const {
    return (width >= 3840 && height >= 2160) || // 4K UHD
           (width >= 4096 && height >= 2160);   // Cinema 4K
}

void ChunkManager::optimizeFor4K() {
    if (!is4KMode_) return;
    
    // Adjust tile size for 4K processing
    adjustTileSizeFor4K();
    
    // Reduce concurrent chunks for memory efficiency
    framesPerChunk_ = std::min(framesPerChunk_, 15); // Smaller chunks for 4K
    
    // Optimize buffer sizes
    config_.maxTilesInMemory = std::min(config_.maxTilesInMemory, 4);
    
    std::cout << "4K optimization applied:" << std::endl;
    std::cout << "  - Tile size: " << tileSize4K_ << "x" << tileSize4K_ << std::endl;
    std::cout << "  - Frames per chunk: " << framesPerChunk_ << std::endl;
    std::cout << "  - Max tiles in memory: " << config_.maxTilesInMemory << std::endl;
}

void ChunkManager::adjustTileSizeFor4K() {
    if (!is4KMode_) return;
    
    // For 4K, use smaller tiles to reduce memory pressure
    tileSize4K_ = 256; // 256x256 tiles for 4K
    
    // Update config
    config_.tileWidth = tileSize4K_;
    config_.tileHeight = tileSize4K_;
    
    // Adjust overlap for better edge handling
    config_.overlapSize = std::min(config_.overlapSize, 8);
}

void ChunkManager::validateMemoryConstraints() {
    size_t requiredMemory = videoWidth_ * videoHeight_ * videoChannels_ * sizeof(uint8_t);
    
    if (is4KMode_) {
        // 4K requires more memory for processing buffers
        requiredMemory *= 3; // Account for intermediate buffers
        
        if (maxMemoryUsage_ < requiredMemory) {
            std::cout << "Warning: Memory limit (" << maxMemoryUsage_ / 1024 / 1024 
                     << "MB) may be insufficient for 4K processing" << std::endl;
            std::cout << "Recommended minimum: " << requiredMemory / 1024 / 1024 
                     << "MB" << std::endl;
        }
    }
}

void ChunkManager::monitorMemoryPressure() {
    double memoryUsageRatio = static_cast<double>(currentMemoryUsage_) / maxMemoryUsage_;
    
    if (memoryUsageRatio > 0.9) {
        memoryPressure_ = true;
        std::cout << "High memory pressure detected: " 
                 << (memoryUsageRatio * 100) << "%" << std::endl;
        
        // Trigger aggressive cleanup
        emergencyMemoryCleanup();
    } else if (memoryUsageRatio > 0.8) {
        // Moderate pressure - optimize memory usage
        optimizeMemoryUsage();
    } else {
        memoryPressure_ = false;
    }
}

void ChunkManager::emergencyMemoryCleanup() {
    std::cout << "Emergency memory cleanup triggered" << std::endl;
    
    // Force cleanup of all processed chunks
    for (auto& chunk : chunks_) {
        if (chunk.isLoaded && chunk.isProcessed) {
            size_t chunkSize = chunk.data.size();
            chunk.data.clear();
            chunk.data.shrink_to_fit();
            chunk.isLoaded = false;
            
            updateMemoryUsage(-static_cast<int>(chunkSize));
            
            if (currentMemoryUsage_ < maxMemoryUsage_ * 0.7) {
                break; // Stop when we have enough memory
            }
        }
    }
    
    // Clear active tiles
    {
        std::lock_guard<std::mutex> lock(tilesMutex_);
        activeTiles_.clear();
        active4KTiles_ = 0;
    }
    
    std::cout << "Emergency cleanup completed. Memory usage: " 
             << currentMemoryUsage_ / 1024 / 1024 << "MB" << std::endl;
}

void ChunkManager::updateMemoryUsage(size_t delta) {
    currentMemoryUsage_ += delta;
    if (currentMemoryUsage_ > peakMemoryUsage_) {
        peakMemoryUsage_ = currentMemoryUsage_;
    }
    
    // Update statistics
    {
        std::lock_guard<std::mutex> lock(statsMutex_);
        stats_.currentMemoryUsage = currentMemoryUsage_;
        stats_.peakMemoryUsage = peakMemoryUsage_;
    }
    
    // Monitor memory pressure
    monitorMemoryPressure();
}

} // namespace kronop
