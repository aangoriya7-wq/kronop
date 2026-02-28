#include "ReelsCircularBuffer.h"
#include <jsi/jsi.h>
#include <cstring>
#include <algorithm>
#include <chrono>
#include <iostream>

#if defined(__ANDROID__)
#include <android/log.h>
#include <sys/mman.h>
#define LOG_TAG "ReelsCircularBuffer"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#elif defined(__APPLE__)
#include <sys/mman.h>
#define LOGI(...) printf(__VA_ARGS__)
#define LOGE(...) printf(__VA_ARGS__)
#endif

namespace ReelsBuffer {

// Memory Pool Implementation
MemoryPool::MemoryPool(size_t totalMemory, size_t chunkSize) 
    : blockSize(chunkSize), totalBlocks(totalMemory / chunkSize) {
    
    // Allocate aligned memory block
    memoryBlock = static_cast<uint8_t*>(std::aligned_alloc(32, totalMemory));
    if (!memoryBlock) {
        throw std::bad_alloc();
    }
    
    // Mark memory as non-swappable for better performance
#if defined(__ANDROID__) || defined(__APPLE__)
    mlock(memoryBlock, totalMemory);
#endif
    
    usedBlocks = std::make_unique<bool[]>(totalBlocks);
    std::fill(usedBlocks.get(), usedBlocks.get() + totalBlocks, false);
    
    LOGI("MemoryPool initialized: %zu blocks of %zu bytes each", totalBlocks, blockSize);
}

MemoryPool::~MemoryPool() {
    if (memoryBlock) {
#if defined(__ANDROID__) || defined(__APPLE__)
        munlock(memoryBlock, blockSize * totalBlocks);
#endif
        std::free(memoryBlock);
    }
}

uint8_t* MemoryPool::allocate(size_t size) {
    std::lock_guard<std::mutex> lock(poolMutex);
    
    if (size > blockSize) {
        LOGE("Requested size %zu exceeds block size %zu", size, blockSize);
        return nullptr;
    }
    
    // Find first available block
    for (size_t i = 0; i < totalBlocks; ++i) {
        if (!usedBlocks[i]) {
            usedBlocks[i] = true;
            allocatedBlocks.fetch_add(1);
            return memoryBlock + (i * blockSize);
        }
    }
    
    LOGE("No available blocks in memory pool");
    return nullptr;
}

void MemoryPool::deallocate(uint8_t* ptr) {
    if (!ptr || ptr < memoryBlock || ptr >= memoryBlock + (totalBlocks * blockSize)) {
        return;
    }
    
    std::lock_guard<std::mutex> lock(poolMutex);
    
    size_t blockIndex = (ptr - memoryBlock) / blockSize;
    if (blockIndex < totalBlocks && usedBlocks[blockIndex]) {
        usedBlocks[blockIndex] = false;
        allocatedBlocks.fetch_sub(1);
    }
}

size_t MemoryPool::getAvailableBlocks() const {
    return totalBlocks - allocatedBlocks.load();
}

// Circular Buffer Implementation
ReelsCircularBuffer::ReelsCircularBuffer(const BufferConfig& config) 
    : config(config), capacity(config.maxChunks) {
    
    chunks = std::make_unique<VideoChunk[]>(capacity);
    memoryPool = std::make_unique<MemoryPool>(config.maxMemoryBytes, config.chunkSize);
    
    // Initialize all chunks
    for (size_t i = 0; i < capacity; ++i) {
        chunks[i] = VideoChunk{nullptr, 0, 0, 0, 0, 0, false, 0, 0};
    }
    
    LOGI("ReelsCircularBuffer initialized: capacity=%zu, memory=%zu MB", 
         capacity, config.maxMemoryBytes / (1024 * 1024));
}

ReelsCircularBuffer::~ReelsCircularBuffer() {
    clear();
}

bool ReelsCircularBuffer::addChunk(const uint8_t* data, size_t size, int64_t timestamp,
                                   int width, int height, int duration, bool isKeyFrame, int reelIndex) {
    std::lock_guard<std::mutex> lock(bufferMutex);
    
    if (isBufferFull.load()) {
        // Remove oldest chunk to make space
        size_t oldTail = tail.load();
        if (chunks[oldTail].data) {
            memoryPool->deallocate(chunks[oldTail].data);
            chunks[oldTail].data = nullptr;
        }
        tail = (oldTail + 1) % capacity;
        size.fetch_sub(1);
    }
    
    // Allocate memory for new chunk
    uint8_t* chunkData = memoryPool->allocate(size);
    if (!chunkData) {
        LOGE("Failed to allocate memory for chunk");
        return false;
    }
    
    // Zero-copy: direct memory copy without intermediate buffers
    std::memcpy(chunkData, data, size);
    
    size_t currentHead = head.load();
    chunks[currentHead] = VideoChunk{
        chunkData,
        size,
        timestamp,
        width,
        height,
        duration,
        isKeyFrame,
        static_cast<uint32_t>(currentHead),
        reelIndex
    };
    
    head = (currentHead + 1) % capacity;
    size.fetch_add(1);
    
    totalBytesWritten.fetch_add(size);
    totalChunksWritten.fetch_add(1);
    
    // Check if buffer is now full
    if (size.load() == capacity) {
        isBufferFull.store(true);
    }
    
    return true;
}

VideoChunk* ReelsCircularBuffer::getChunk(size_t index) {
    if (index >= capacity) {
        return nullptr;
    }
    
    std::lock_guard<std::mutex> lock(bufferMutex);
    VideoChunk* chunk = &chunks[index];
    
    // Validate chunk
    if (chunk->data && chunk->size > 0) {
        totalBytesRead.fetch_add(chunk->size);
        totalChunksRead.fetch_add(1);
        return chunk;
    }
    
    return nullptr;
}

VideoChunk* ReelsCircularBuffer::getNextChunk(int currentReelIndex) {
    std::lock_guard<std::mutex> lock(bufferMutex);
    
    size_t currentTail = tail.load();
    for (size_t i = 0; i < size.load(); ++i) {
        size_t index = (currentTail + i) % capacity;
        if (chunks[index].reelIndex > currentReelIndex) {
            return &chunks[index];
        }
    }
    
    return nullptr;
}

VideoChunk* ReelsCircularBuffer::getChunkById(uint32_t chunkId) {
    if (chunkId >= capacity) {
        return nullptr;
    }
    
    std::lock_guard<std::mutex> lock(bufferMutex);
    VideoChunk* chunk = &chunks[chunkId];
    
    if (chunk->data && chunk->chunkId == chunkId) {
        totalBytesRead.fetch_add(chunk->size);
        totalChunksRead.fetch_add(1);
        return chunk;
    }
    
    return nullptr;
}

void ReelsCircularBuffer::clear() {
    std::lock_guard<std::mutex> lock(bufferMutex);
    
    for (size_t i = 0; i < capacity; ++i) {
        if (chunks[i].data) {
            memoryPool->deallocate(chunks[i].data);
            chunks[i].data = nullptr;
        }
    }
    
    head.store(0);
    tail.store(0);
    size.store(0);
    isBufferFull.store(false);
}

void ReelsCircularBuffer::resize(size_t newCapacity) {
    std::lock_guard<std::mutex> lock(bufferMutex);
    
    if (newCapacity < size.load()) {
        // Need to remove some chunks
        size_t chunksToRemove = size.load() - newCapacity;
        for (size_t i = 0; i < chunksToRemove; ++i) {
            size_t oldTail = tail.load();
            if (chunks[oldTail].data) {
                memoryPool->deallocate(chunks[oldTail].data);
                chunks[oldTail].data = nullptr;
            }
            tail = (oldTail + 1) % capacity;
            size.fetch_sub(1);
        }
    }
    
    // Create new chunk array
    auto newChunks = std::make_unique<VideoChunk[]>(newCapacity);
    
    // Copy existing chunks
    for (size_t i = 0; i < std::min(size.load(), newCapacity); ++i) {
        newChunks[i] = chunks[(tail.load() + i) % capacity];
    }
    
    chunks = std::move(newChunks);
    capacity = newCapacity;
    head.store(size.load());
    tail.store(0);
}

void ReelsCircularBuffer::preloadNextChunks(int currentReelIndex, int count) {
    if (!config.enablePreloading) {
        return;
    }
    
    // This would integrate with video loading system
    // For now, just log the preload request
    LOGI("Preloading %d chunks starting from reel index %d", count, currentReelIndex);
}

void ReelsCircularBuffer::optimizeMemory() {
    std::lock_guard<std::mutex> lock(bufferMutex);
    
    // Remove non-keyframe chunks if memory is low
    size_t availableMemory = memoryPool->getAvailableBlocks();
    if (availableMemory < totalBlocks / 4) { // Less than 25% available
        size_t removed = 0;
        size_t currentTail = tail.load();
        
        for (size_t i = 0; i < size.load() && removed < capacity / 4; ++i) {
            size_t index = (currentTail + i) % capacity;
            if (!chunks[index].isKeyFrame) {
                memoryPool->deallocate(chunks[index].data);
                chunks[index].data = nullptr;
                removed++;
            }
        }
        
        if (removed > 0) {
            LOGI("Optimized memory: removed %zu non-keyframe chunks", removed);
        }
    }
}

uint8_t* ReelsCircularBuffer::getRawDataPointer(size_t chunkIndex) {
    if (chunkIndex >= capacity) {
        return nullptr;
    }
    
    std::lock_guard<std::mutex> lock(bufferMutex);
    return chunks[chunkIndex].data;
}

size_t ReelsCircularBuffer::getChunkSize(size_t chunkIndex) {
    if (chunkIndex >= capacity) {
        return 0;
    }
    
    std::lock_guard<std::mutex> lock(bufferMutex);
    return chunks[chunkIndex].size;
}

bool ReelsCircularBuffer::isValidChunk(size_t chunkIndex) const {
    if (chunkIndex >= capacity) {
        return false;
    }
    
    std::lock_guard<std::mutex> lock(bufferMutex);
    return chunks[chunkIndex].data != nullptr && chunks[chunkIndex].size > 0;
}

// Iterator Implementation
ReelsCircularBuffer::Iterator::Iterator(ReelsCircularBuffer* buf, size_t startIndex)
    : buffer(buf), currentIndex(startIndex) {}

VideoChunk* ReelsCircularBuffer::Iterator::operator*() const {
    return buffer->getChunk(currentIndex);
}

ReelsCircularBuffer::Iterator& ReelsCircularBuffer::Iterator::operator++() {
    currentIndex = (currentIndex + 1) % buffer->capacity;
    return *this;
}

bool ReelsCircularBuffer::Iterator::operator!=(const Iterator& other) const {
    return currentIndex != other.currentIndex;
}

ReelsCircularBuffer::Iterator ReelsCircularBuffer::begin() {
    return Iterator(this, tail.load());
}

ReelsCircularBuffer::Iterator ReelsCircularBuffer::end() {
    return Iterator(this, (tail.load() + size.load()) % capacity);
}

// JSI Interface Implementation
ReelsBufferJSI::ReelsBufferJSI(std::shared_ptr<facebook::jsi::Runtime> rt)
    : runtime(rt) {
    LOGI("ReelsBufferJSI initialized");
}

ReelsBufferJSI::~ReelsBufferJSI() {
    LOGI("ReelsBufferJSI destroyed");
}

bool ReelsBufferJSI::initialize(size_t maxChunks, size_t maxMemoryMB, size_t chunkSizeKB) {
    try {
        BufferConfig config{
            maxChunks,
            maxMemoryMB * 1024 * 1024,
            chunkSizeKB * 1024,
            true,
            3
        };
        
        buffer = std::make_shared<ReelsCircularBuffer>(config);
        return true;
    } catch (const std::exception& e) {
        LOGE("Failed to initialize buffer: %s", e.what());
        return false;
    }
}

bool ReelsBufferJSI::addVideoChunk(const std::string& base64Data, int64_t timestamp,
                                   int width, int height, int duration, bool isKeyFrame, int reelIndex) {
    if (!buffer) {
        return false;
    }
    
    // Decode base64 to binary data (simplified - in real implementation use proper base64 decoder)
    std::vector<uint8_t> binaryData(base64Data.begin(), base64Data.end());
    
    return buffer->addChunk(
        binaryData.data(),
        binaryData.size(),
        timestamp,
        width,
        height,
        duration,
        isKeyFrame,
        reelIndex
    );
}

std::string ReelsBufferJSI::getChunkData(size_t chunkIndex) {
    if (!buffer) {
        return "";
    }
    
    VideoChunk* chunk = buffer->getChunk(chunkIndex);
    if (!chunk || !chunk->data) {
        return "";
    }
    
    // Return as base64 string (simplified)
    return std::string(chunk->data, chunk->data + chunk->size);
}

std::string ReelsBufferJSI::getChunkMetadata(size_t chunkIndex) {
    if (!buffer) {
        return "{}";
    }
    
    VideoChunk* chunk = buffer->getChunk(chunkIndex);
    if (!chunk) {
        return "{}";
    }
    
    // Create JSON metadata (simplified)
    char metadata[256];
    snprintf(metadata, sizeof(metadata),
             "{\"size\":%zu,\"timestamp\":%lld,\"width\":%d,\"height\":%d,\"duration\":%d,\"isKeyFrame\":%s,\"reelIndex\":%d}",
             chunk->size,
             chunk->timestamp,
             chunk->width,
             chunk->height,
             chunk->duration,
             chunk->isKeyFrame ? "true" : "false",
             chunk->reelIndex);
    
    return std::string(metadata);
}

size_t ReelsBufferJSI::getBufferCapacity() const {
    return buffer ? buffer->getCapacity() : 0;
}

size_t ReelsBufferJSI::getBufferSize() const {
    return buffer ? buffer->getSize() : 0;
}

size_t ReelsBufferJSI::getUsedMemoryMB() const {
    return buffer ? buffer->getUsedMemory() / (1024 * 1024) : 0;
}

size_t ReelsBufferJSI::getTotalMemoryMB() const {
    return buffer ? buffer->getTotalMemory() / (1024 * 1024) : 0;
}

uint64_t ReelsBufferJSI::getTotalChunksWritten() const {
    return buffer ? buffer->getTotalChunksWritten() : 0;
}

uint64_t ReelsBufferJSI::getTotalChunksRead() const {
    return buffer ? buffer->getTotalChunksRead() : 0;
}

int ReelsBufferJSI::getNextReelIndex(int currentIndex) {
    if (!buffer) {
        return -1;
    }
    
    VideoChunk* nextChunk = buffer->getNextChunk(currentIndex);
    return nextChunk ? nextChunk->reelIndex : -1;
}

int ReelsBufferJSI::getPreviousReelIndex(int currentIndex) {
    // Implementation for previous reel index
    return currentIndex > 0 ? currentIndex - 1 : 0;
}

std::string ReelsBufferJSI::getReelChunkInfo(int reelIndex) {
    if (!buffer) {
        return "{}";
    }
    
    // Find chunk for this reel index
    for (auto it = buffer->begin(); it != buffer->end(); ++it) {
        VideoChunk* chunk = *it;
        if (chunk && chunk->reelIndex == reelIndex) {
            return getChunkMetadata(chunk->chunkId);
        }
    }
    
    return "{}";
}

void ReelsBufferJSI::clearBuffer() {
    if (buffer) {
        buffer->clear();
    }
}

void ReelsBufferJSI::optimizeMemory() {
    if (buffer) {
        buffer->optimizeMemory();
    }
}

void ReelsBufferJSI::preloadReels(int startIndex, int count) {
    if (buffer) {
        buffer->preloadNextChunks(startIndex, count);
    }
}

// JSI Module Creation
std::shared_ptr<facebook::jsi::Object> createReelsBufferModule(
    std::shared_ptr<facebook::jsi::Runtime> runtime) {
    
    auto reelsBuffer = std::make_shared<ReelsBufferJSI>(runtime);
    auto object = std::make_shared<facebook::jsi::Object>(*runtime);
    
    // Initialize method
    auto initialize = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "initialize"),
        3,
        [reelsBuffer](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal,
                      const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            if (count < 3) return facebook::jsi::Value(rt, false);
            
            size_t maxChunks = static_cast<size_t>(args[0].getNumber());
            size_t maxMemoryMB = static_cast<size_t>(args[1].getNumber());
            size_t chunkSizeKB = static_cast<size_t>(args[2].getNumber());
            
            bool result = reelsBuffer->initialize(maxChunks, maxMemoryMB, chunkSizeKB);
            return facebook::jsi::Value(rt, result);
        });
    
    // Add video chunk method
    auto addVideoChunk = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "addVideoChunk"),
        7,
        [reelsBuffer](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal,
                      const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            if (count < 7) return facebook::jsi::Value(rt, false);
            
            std::string data = args[0].getString(rt).utf8(rt);
            int64_t timestamp = static_cast<int64_t>(args[1].getNumber());
            int width = static_cast<int>(args[2].getNumber());
            int height = static_cast<int>(args[3].getNumber());
            int duration = static_cast<int>(args[4].getNumber());
            bool isKeyFrame = args[5].getBool();
            int reelIndex = static_cast<int>(args[6].getNumber());
            
            bool result = reelsBuffer->addVideoChunk(data, timestamp, width, height, duration, isKeyFrame, reelIndex);
            return facebook::jsi::Value(rt, result);
        });
    
    // Get chunk data method
    auto getChunkData = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "getChunkData"),
        1,
        [reelsBuffer](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal,
                      const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            if (count < 1) return facebook::jsi::String::createFromUtf8(rt, "");
            
            size_t chunkIndex = static_cast<size_t>(args[0].getNumber());
            std::string data = reelsBuffer->getChunkData(chunkIndex);
            return facebook::jsi::String::createFromUtf8(rt, data);
        });
    
    // Get buffer info method
    auto getBufferInfo = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "getBufferInfo"),
        0,
        [reelsBuffer](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal,
                      const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            auto info = facebook::jsi::Object(rt);
            
            info.setProperty(rt, "capacity", static_cast<double>(reelsBuffer->getBufferCapacity()));
            info.setProperty(rt, "size", static_cast<double>(reelsBuffer->getBufferSize()));
            info.setProperty(rt, "usedMemoryMB", static_cast<double>(reelsBuffer->getUsedMemoryMB()));
            info.setProperty(rt, "totalMemoryMB", static_cast<double>(reelsBuffer->getTotalMemoryMB()));
            info.setProperty(rt, "totalChunksWritten", static_cast<double>(reelsBuffer->getTotalChunksWritten()));
            info.setProperty(rt, "totalChunksRead", static_cast<double>(reelsBuffer->getTotalChunksRead()));
            
            return info;
        });
    
    // Set properties on the object
    object->setProperty(*runtime, "initialize", std::move(initialize));
    object->setProperty(*runtime, "addVideoChunk", std::move(addVideoChunk));
    object->setProperty(*runtime, "getChunkData", std::move(getChunkData));
    object->setProperty(*runtime, "getBufferInfo", std::move(getBufferInfo));
    
    return object;
}

} // namespace ReelsBuffer
