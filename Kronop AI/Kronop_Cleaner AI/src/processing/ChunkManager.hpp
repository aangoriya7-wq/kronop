/**
 * ChunkManager.hpp
 * Advanced Chunk & Tile Processing for Large 4K Video Files
 * Memory-efficient processing with streaming support
 */

#ifndef CHUNK_MANAGER_HPP
#define CHUNK_MANAGER_HPP

#include <vector>
#include <memory>
#include <queue>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <atomic>

namespace kronop {

/**
 * Tile Configuration for Memory-Efficient Processing
 */
struct TileConfig {
    int tileWidth;        // Tile width in pixels
    int tileHeight;       // Tile height in pixels
    int overlapSize;      // Overlap between tiles (for edge handling)
    int maxTilesInMemory; // Maximum tiles to keep in memory
    bool enableStreaming; // Enable streaming mode
    bool enable4KSupport; // Enable 4K resolution support
    size_t maxMemoryUsage; // Maximum memory usage in MB
    
    TileConfig()
        : tileWidth(512), tileHeight(512), overlapSize(16),
          maxTilesInMemory(8), enableStreaming(true), 
          enable4KSupport(true), maxMemoryUsage(2048) {} // 2GB for 4K
};

/**
 * Video Chunk Information
 */
struct VideoChunk {
    int chunkId;                    // Unique chunk identifier
    int startFrame;                 // Starting frame number
    int endFrame;                   // Ending frame number
    int width;                      // Frame width
    int height;                     // Frame height
    int channels;                   // Number of channels
    size_t dataSize;                // Chunk data size in bytes
    std::vector<uint8_t> data;     // Chunk data (compressed or raw)
    bool isLoaded;                  // Loading status
    bool isProcessed;              // Processing status
    
    VideoChunk(int id = 0, int start = 0, int end = 0)
        : chunkId(id), startFrame(start), endFrame(end),
          width(0), height(0), channels(3), dataSize(0),
          isLoaded(false), isProcessed(false) {}
};

/**
 * Tile Information for Processing
 */
struct Tile {
    int tileId;                     // Unique tile identifier
    int chunkId;                    // Parent chunk ID
    int frameNumber;                // Frame number within chunk
    int tileX;                      // Tile X position
    int tileY;                      // Tile Y position
    int offsetX;                    // Offset in original frame
    int offsetY;                    // Offset in original frame
    int width;                      // Tile width
    int height;                     // Tile height
    std::vector<double> data;       // Tile data (double precision)
    std::vector<double> output;    // Processed output data
    bool isProcessed;               // Processing status
    double processingTime;          // Processing time in ms
    
    Tile(int id = 0)
        : tileId(id), chunkId(0), frameNumber(0), tileX(0), tileY(0),
          offsetX(0), offsetY(0), width(0), height(0),
          isProcessed(false), processingTime(0.0) {}
};

/**
 * Chunk Processing Statistics
 */
struct ChunkStats {
    int totalChunks;                // Total chunks to process
    int processedChunks;            // Processed chunks count
    int totalTiles;                 // Total tiles to process
    int processedTiles;             // Processed tiles count
    double avgProcessingTime;       // Average processing time per tile
    size_t peakMemoryUsage;         // Peak memory usage in bytes
    size_t currentMemoryUsage;      // Current memory usage
    double processingFPS;           // Current processing FPS
    
    ChunkStats() : totalChunks(0), processedChunks(0), totalTiles(0),
                   processedTiles(0), avgProcessingTime(0.0), peakMemoryUsage(0),
                   currentMemoryUsage(0), processingFPS(0.0) {}
};

/**
 * Advanced Chunk Manager
 * Handles large video files with memory-efficient tile processing
 */
class ChunkManager {
public:
    explicit ChunkManager(const TileConfig& config = TileConfig());
    ~ChunkManager();
    
    // Chunk management
    bool initializeVideoFile(const std::string& filePath, int width, int height, int channels);
    bool loadChunk(int chunkId, VideoChunk& chunk);
    bool processChunk(int chunkId);
    bool saveChunk(int chunkId, const std::string& outputPath);
    
    // Tile processing
    std::vector<Tile> createTilesFromFrame(const std::vector<uint8_t>& frameData,
                                          int frameNumber, int chunkId);
    bool processTile(Tile& tile);
    bool assembleTilesToFrame(const std::vector<Tile>& tiles,
                             std::vector<uint8_t>& outputFrame);
    
    // Streaming support
    void enableStreamingMode(bool enable);
    bool processNextChunk();
    bool isStreamingComplete() const;
    
    // Memory management
    void setMaxMemoryUsage(size_t maxMemoryMB);
    size_t getCurrentMemoryUsage() const;
    void optimizeMemoryUsage();
    
    // 4K support methods
    bool is4KResolution(int width, int height) const;
    void optimizeFor4K();
    void validateMemoryConstraints();
    
    // Configuration
    void setTileConfig(const TileConfig& config);
    TileConfig getTileConfig() const;
    
    // Statistics
    ChunkStats getStatistics() const;
    void resetStatistics();
    
    // Thread-safe operations
    void startAsyncProcessing();
    void stopAsyncProcessing();
    bool isProcessingComplete() const;

private:
    TileConfig config_;
    std::string videoFilePath_;
    int videoWidth_;
    int videoHeight_;
    int videoChannels_;
    int totalFrames_;
    int framesPerChunk_;
    
    // Chunk management
    std::vector<VideoChunk> chunks_;
    std::queue<int> processingQueue_;
    std::queue<int> completedQueue_;
    
    // Tile processing
    std::vector<Tile> activeTiles_;
    std::mutex tilesMutex_;
    
    // Streaming
    std::atomic<bool> streamingEnabled_;
    std::atomic<bool> streamingComplete_;
    std::atomic<int> currentChunkIndex_;
    
    // Async processing
    std::unique_ptr<std::thread> processingThread_;
    std::atomic<bool> processingActive_;
    std::mutex processingMutex_;
    std::condition_variable processingCondition_;
    
    // Memory management
    std::atomic<size_t> currentMemoryUsage_;
    std::atomic<size_t> peakMemoryUsage_;
    size_t maxMemoryUsage_;
    std::atomic<bool> memoryPressure_; // Memory pressure detection
    
    // 4K optimization
    bool is4KMode_;
    size_t tileSize4K_; // Optimized tile size for 4K
    std::atomic<int> active4KTiles_; // Track active 4K tiles
    
    // Statistics
    mutable std::mutex statsMutex_;
    ChunkStats stats_;
    
    // Internal methods
    void initializeChunks();
    void processChunkAsync(int chunkId);
    void updateMemoryUsage(size_t delta);
    void cleanupProcessedChunks();
    
    // Tile operations
    Tile extractTile(const std::vector<double>& frameData,
                    int frameWidth, int frameHeight,
                    int tileX, int tileY, int tileWidth, int tileHeight);
    
    void blendTileOverlap(std::vector<double>& frameData,
                         const Tile& tile, int frameWidth, int frameHeight);
    
    // File I/O operations
    bool loadVideoFileMetadata(const std::string& filePath);
    bool saveVideoFileMetadata(const std::string& outputPath);
    
    // Performance optimization
    void preloadNextChunk();
    void optimizeTileLayout();
    
    // 4K optimization methods
    void adjustTileSizeFor4K();
    void monitorMemoryPressure();
    void emergencyMemoryCleanup();
};

/**
 * Streaming Video Processor
 * Real-time chunk processing with buffering
 */
class StreamingProcessor {
public:
    explicit StreamingProcessor(const TileConfig& config = TileConfig());
    ~StreamingProcessor();
    
    // Streaming interface
    bool initializeStream(const std::string& inputPath, const std::string& outputPath);
    bool processStream();
    void stopStream();
    
    // Buffer management
    void setBufferSize(size_t bufferFrames);
    void setProcessingThreads(int numThreads);
    
    // Real-time processing
    bool processFrame(const std::vector<uint8_t>& frameData, int frameNumber);
    bool getProcessedFrame(std::vector<uint8_t>& frameData, int frameNumber);
    
    // Stream statistics
    double getCurrentFPS() const;
    size_t getBufferUtilization() const;
    bool isStreamHealthy() const;

private:
    std::unique_ptr<ChunkManager> chunkManager_;
    
    // Streaming buffers
    std::queue<std::vector<uint8_t>> inputBuffer_;
    std::queue<std::vector<uint8_t>> outputBuffer_;
    std::mutex bufferMutex_;
    std::condition_variable bufferCondition_;
    
    // Processing threads
    std::vector<std::unique_ptr<std::thread>> workerThreads_;
    std::atomic<bool> streamingActive_;
    
    // Stream configuration
    size_t bufferSize_;
    int numProcessingThreads_;
    
    // Performance tracking
    std::atomic<double> currentFPS_;
    std::atomic<bool> streamHealthy_;
    
    // Internal methods
    void workerThreadFunction(int threadId);
    void updateStreamStatistics();
};

/**
 * Memory Pool for Efficient Tile Allocation
 */
class TileMemoryPool {
public:
    explicit TileMemoryPool(size_t poolSizeMB = 512);
    ~TileMemoryPool();
    
    // Memory allocation
    void* allocateTile(size_t size);
    void deallocateTile(void* ptr);
    
    // Pool management
    void resizePool(size_t newSizeMB);
    size_t getAvailableMemory() const;
    size_t getTotalMemory() const;
    
    // Statistics
    size_t getAllocationCount() const;
    size_t getPeakUsage() const;

private:
    struct MemoryBlock {
        void* ptr;
        size_t size;
        bool inUse;
        
        MemoryBlock(void* p = nullptr, size_t s = 0)
            : ptr(p), size(s), inUse(false) {}
    };
    
    std::vector<MemoryBlock> memoryBlocks_;
    std::mutex poolMutex_;
    size_t totalPoolSize_;
    size_t availableMemory_;
    size_t peakUsage_;
    size_t allocationCount_;
    
    // Internal methods
    void* allocateFromPool(size_t size);
    void returnToPool(void* ptr, size_t size);
    bool findFreeBlock(size_t size, MemoryBlock& block);
};

} // namespace kronop

#endif // CHUNK_MANAGER_HPP
