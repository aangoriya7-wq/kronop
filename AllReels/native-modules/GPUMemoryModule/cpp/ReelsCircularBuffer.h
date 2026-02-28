#pragma once

#include <cstdint>
#include <memory>
#include <atomic>
#include <mutex>
#include <jsi/jsi.h>

namespace ReelsBuffer {

// Video chunk metadata for zero-copy access
struct VideoChunk {
    uint8_t* data;           // Raw pointer to video data (zero-copy)
    size_t size;             // Size of the chunk in bytes
    int64_t timestamp;       // Timestamp in milliseconds
    int width;               // Video width
    int height;              // Video height
    int duration;            // Duration in milliseconds
    bool isKeyFrame;         // Is this a keyframe
    uint32_t chunkId;        // Unique chunk identifier
    int reelIndex;           // Index in the reel
};

// Circular buffer configuration
struct BufferConfig {
    size_t maxChunks;        // Maximum number of chunks
    size_t maxMemoryBytes;   // Maximum memory usage in bytes
    size_t chunkSize;        // Default chunk size
    bool enablePreloading;   // Enable preloading of next chunks
    int preloadCount;        // Number of chunks to preload
};

// Memory pool for efficient allocation
class MemoryPool {
private:
    uint8_t* memoryBlock;
    size_t blockSize;
    size_t totalBlocks;
    std::atomic<size_t> allocatedBlocks{0};
    std::mutex poolMutex;
    std::unique_ptr<bool[]> usedBlocks;

public:
    MemoryPool(size_t totalMemory, size_t chunkSize);
    ~MemoryPool();
    
    uint8_t* allocate(size_t size);
    void deallocate(uint8_t* ptr);
    size_t getAvailableBlocks() const;
    size_t getTotalMemory() const { return blockSize * totalBlocks; }
    size_t getUsedMemory() const { return allocatedBlocks.load() * blockSize; }
};

// High-performance circular buffer for video chunks
class ReelsCircularBuffer {
private:
    // Core buffer storage
    std::unique_ptr<VideoChunk[]> chunks;
    size_t capacity;
    std::atomic<size_t> head{0};
    std::atomic<size_t> tail{0};
    std::atomic<size_t> size{0};
    
    // Memory management
    std::unique_ptr<MemoryPool> memoryPool;
    BufferConfig config;
    
    // Thread safety
    mutable std::mutex bufferMutex;
    std::atomic<bool> isBufferFull{false};
    
    // Performance tracking
    std::atomic<uint64_t> totalBytesWritten{0};
    std::atomic<uint64_t> totalChunksWritten{0};
    std::atomic<uint64_t> totalBytesRead{0};
    std::atomic<uint64_t> totalChunksRead{0};

public:
    explicit ReelsCircularBuffer(const BufferConfig& config);
    ~ReelsCircularBuffer();
    
    // Core operations
    bool addChunk(const uint8_t* data, size_t size, int64_t timestamp, 
                  int width, int height, int duration, bool isKeyFrame, int reelIndex);
    
    VideoChunk* getChunk(size_t index);
    VideoChunk* getNextChunk(int currentReelIndex);
    VideoChunk* getChunkById(uint32_t chunkId);
    
    // Buffer management
    void clear();
    void resize(size_t newCapacity);
    bool isFull() const { return isBufferFull.load(); }
    bool isEmpty() const { return size.load() == 0; }
    size_t getSize() const { return size.load(); }
    size_t getCapacity() const { return capacity; }
    
    // Memory information
    size_t getUsedMemory() const { return memoryPool->getUsedMemory(); }
    size_t getTotalMemory() const { return memoryPool->getTotalMemory(); }
    size_t getAvailableMemory() const { return memoryPool->getTotalMemory() - memoryPool->getUsedMemory(); }
    
    // Performance metrics
    uint64_t getTotalBytesWritten() const { return totalBytesWritten.load(); }
    uint64_t getTotalChunksWritten() const { return totalChunksWritten.load(); }
    uint64_t getTotalBytesRead() const { return totalBytesRead.load(); }
    uint64_t getTotalChunksRead() const { return totalChunksRead.load(); }
    
    // Advanced operations
    void preloadNextChunks(int currentReelIndex, int count);
    void optimizeMemory();
    void setPreloading(bool enabled) { config.enablePreloading = enabled; }
    
    // Zero-copy direct access methods
    uint8_t* getRawDataPointer(size_t chunkIndex);
    size_t getChunkSize(size_t chunkIndex);
    bool isValidChunk(size_t chunkIndex) const;
    
    // Iterator-like access for sequential reading
    class Iterator {
    private:
        ReelsCircularBuffer* buffer;
        size_t currentIndex;
        
    public:
        Iterator(ReelsCircularBuffer* buf, size_t startIndex);
        VideoChunk* operator*() const;
        Iterator& operator++();
        bool operator!=(const Iterator& other) const;
        
        VideoChunk* get() const { return buffer->getChunk(currentIndex); }
        size_t getIndex() const { return currentIndex; }
    };
    
    Iterator begin();
    Iterator end();
};

// JSI interface for direct JavaScript access
class ReelsBufferJSI {
private:
    std::shared_ptr<ReelsCircularBuffer> buffer;
    std::shared_ptr<facebook::jsi::Runtime> runtime;
    
public:
    explicit ReelsBufferJSI(std::shared_ptr<facebook::jsi::Runtime> rt);
    ~ReelsBufferJSI();
    
    // Initialize buffer with configuration
    bool initialize(size_t maxChunks, size_t maxMemoryMB, size_t chunkSizeKB);
    
    // Video chunk operations
    bool addVideoChunk(const std::string& base64Data, int64_t timestamp, 
                      int width, int height, int duration, bool isKeyFrame, int reelIndex);
    
    // Direct access methods (zero-copy)
    std::string getChunkData(size_t chunkIndex);
    std::string getChunkMetadata(size_t chunkIndex);
    
    // Buffer information
    size_t getBufferCapacity() const;
    size_t getBufferSize() const;
    size_t getUsedMemoryMB() const;
    size_t getTotalMemoryMB() const;
    
    // Performance metrics
    uint64_t getTotalChunksWritten() const;
    uint64_t getTotalChunksRead() const;
    
    // Navigation methods
    int getNextReelIndex(int currentIndex);
    int getPreviousReelIndex(int currentIndex);
    std::string getReelChunkInfo(int reelIndex);
    
    // Buffer management
    void clearBuffer();
    void optimizeMemory();
    void preloadReels(int startIndex, int count);
};

// Factory function for JSI module creation
std::shared_ptr<facebook::jsi::Object> createReelsBufferModule(
    std::shared_ptr<facebook::jsi::Runtime> runtime);

} // namespace ReelsBuffer
