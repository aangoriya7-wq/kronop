#pragma once

#include <cstdint>
#include <memory>
#include <atomic>
#include <mutex>
#include <thread>
#include <vector>
#include <queue>
#include <string>
#include <functional>
#include <future>
#include <condition_variable>
#include <jsi/jsi.h>

#if defined(__ANDROID__)
#include <android/log.h>
#include <curl/curl.h>
#include <openssl/ssl.h>
#include <openssl/err.h>
#define LOG_TAG "NetworkFetcher"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#elif defined(__APPLE__)
#include <curl/curl.h>
#include <openssl/ssl.h>
#include <openssl/err.h>
#define LOGI(...) printf(__VA_ARGS__)
#define LOGE(...) printf(__VA_ARGS__)
#endif

namespace NetworkFetcher {

// Download chunk information
struct DownloadChunk {
    std::string url;
    size_t chunkIndex;
    size_t offset;
    size_t size;
    std::vector<uint8_t> data;
    bool isDownloaded;
    bool isFailed;
    std::string errorMessage;
    int64_t downloadTime;
    int retryCount;
    
    DownloadChunk() : chunkIndex(0), offset(0), size(0), isDownloaded(false), 
                     isFailed(false), downloadTime(0), retryCount(0) {}
};

// Download task configuration
struct DownloadTask {
    std::string url;
    std::string filename;
    size_t totalSize;
    size_t chunkSize;
    int maxConcurrentChunks;
    int maxRetries;
    int timeoutSeconds;
    bool useRangeRequests;
    bool verifySSL;
    std::vector<std::string> headers;
    
    DownloadTask() : totalSize(0), chunkSize(1024*1024), maxConcurrentChunks(4),
                    maxRetries(3), timeoutSeconds(30), useRangeRequests(true),
                    verifySSL(true) {}
};

// Download statistics
struct DownloadStats {
    std::atomic<size_t> totalDownloaded{0};
    std::atomic<size_t> totalSize{0};
    std::atomic<int> completedChunks{0};
    std::atomic<int> failedChunks{0};
    std::atomic<int> activeThreads{0};
    std::atomic<int64_t> startTime{0};
    std::atomic<int64_t> elapsedTime{0};
    std::atomic<float> currentSpeed{0.0f}; // bytes per second
    std::atomic<float> averageSpeed{0.0f};
    std::atomic<bool> isDownloading{false};
};

// Thread pool for concurrent downloads
class ThreadPool {
private:
    std::vector<std::thread> workers;
    std::queue<std::function<void()>> tasks;
    std::mutex queueMutex;
    std::condition_variable condition;
    std::atomic<bool> stop{false};
    std::atomic<int> activeThreads{0};

public:
    explicit ThreadPool(size_t threads);
    ~ThreadPool();
    
    template<class F, class... Args>
    auto enqueue(F&& f, Args&&... args) -> std::future<typename std::result_of<F(Args...)>::type>;
    
    void shutdown();
    int getActiveThreadCount() const { return activeThreads.load(); }
    size_t getQueueSize() const;
};

// HTTP/HTTPS client with chunked downloading
class HTTPClient {
private:
    CURL* curl;
    std::string userAgent;
    std::vector<std::string> defaultHeaders;
    std::mutex curlMutex;
    bool isInitialized;
    
public:
    HTTPClient();
    ~HTTPClient();
    
    bool initialize();
    void cleanup();
    
    // Download operations
    bool downloadChunk(const std::string& url, size_t offset, size_t size, 
                     std::vector<uint8_t>& data, std::string& errorMessage);
    bool getFileSize(const std::string& url, size_t& size);
    bool supportsRangeRequests(const std::string& url);
    
    // Configuration
    void setUserAgent(const std::string& agent);
    void addHeader(const std::string& header);
    void setTimeout(int seconds);
    void setSSLVerification(bool verify);
    
    // Static callback for curl
    static size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp);
    static int ProgressCallback(void* clientp, curl_off_t dltotal, curl_off_t dlnow,
                             curl_off_t ultotal, curl_off_t ulnow);
};

// High-speed network fetcher with multi-threaded downloading
class NetworkFetcher {
private:
    // Core components
    std::unique_ptr<ThreadPool> threadPool;
    std::unique_ptr<HTTPClient> httpClient;
    
    // Download management
    std::queue<DownloadChunk> downloadQueue;
    std::vector<DownloadChunk> allChunks;
    std::mutex chunksMutex;
    std::condition_variable chunksCondition;
    
    // Statistics and state
    DownloadStats stats;
    DownloadTask currentTask;
    std::atomic<bool> isInitialized{false};
    std::atomic<bool> isDownloading{false};
    std::atomic<bool> shouldStop{false};
    
    // Callbacks
    std::function<void(const DownloadChunk&)> chunkDownloadedCallback;
    std::function<void(const DownloadStats&)> progressCallback;
    std::function<void(bool)> completionCallback;
    
    // Circular buffer integration
    std::shared_ptr<void> circularBuffer; // Pointer to ReelsCircularBuffer
    std::mutex bufferMutex;

public:
    NetworkFetcher(size_t threadCount = 8);
    ~NetworkFetcher();
    
    // Core operations
    bool initialize();
    bool shutdown();
    
    // Download operations
    bool startDownload(const DownloadTask& task);
    bool stopDownload();
    bool pauseDownload();
    bool resumeDownload();
    
    // Chunk management
    bool addChunkToDownload(const std::string& url, size_t chunkIndex, size_t offset, size_t size);
    bool downloadSingleChunk(DownloadChunk& chunk);
    void processDownloadQueue();
    
    // Circular buffer integration
    void setCircularBuffer(void* buffer);
    bool feedChunkToBuffer(const DownloadChunk& chunk);
    
    // Statistics
    DownloadStats getStats() const;
    float getDownloadProgress() const;
    float getCurrentSpeed() const; // bytes per second
    float getAverageSpeed() const;
    int64_t getEstimatedTimeRemaining() const;
    
    // Configuration
    void setMaxConcurrentDownloads(int count);
    void setChunkSize(size_t size);
    void setTimeout(int seconds);
    void setUserAgent(const std::string& agent);
    void addHeader(const std::string& header);
    
    // Callbacks
    void setChunkDownloadedCallback(std::function<void(const DownloadChunk&)> callback);
    void setProgressCallback(std::function<void(const DownloadStats&)> callback);
    void setCompletionCallback(std::function<void(bool)> callback);
    
    // Status
    bool isInitialized() const { return isInitialized.load(); }
    bool isDownloading() const { return isDownloading.load(); }
    bool isCompleted() const;
    bool hasErrors() const;

private:
    // Internal methods
    void initializeChunks(const DownloadTask& task);
    void updateStatistics();
    void workerThread();
    bool retryFailedChunks();
    void cleanup();
    
    // Chunk processing
    void onChunkDownloaded(const DownloadChunk& chunk);
    void onDownloadCompleted(bool success);
    void onProgressUpdated();
};

// JSI interface for direct JavaScript access
class NetworkFetcherJSI {
private:
    std::shared_ptr<NetworkFetcher> networkFetcher;
    std::shared_ptr<facebook::jsi::Runtime> runtime;
    std::atomic<bool> isInitialized{false};

public:
    explicit NetworkFetcherJSI(std::shared_ptr<facebook::jsi::Runtime> rt);
    ~NetworkFetcherJSI();
    
    // Initialization
    bool initialize();
    bool shutdown();
    
    // Download operations
    bool startDownload(const std::string& url, const std::string& filename, 
                     int chunkSize = 1024*1024, int maxConcurrent = 4);
    bool stopDownload();
    bool pauseDownload();
    bool resumeDownload();
    
    // Chunk operations
    bool addChunk(const std::string& url, int chunkIndex, int offset, int size);
    std::string getChunkStatus(int chunkIndex);
    
    // Statistics
    std::string getDownloadStats();
    float getProgress();
    float getCurrentSpeed();
    float getAverageSpeed();
    int64_t getEstimatedTimeRemaining();
    
    // Configuration
    void setMaxConcurrentDownloads(int count);
    void setChunkSize(int size);
    void setTimeout(int seconds);
    void setUserAgent(const std::string& agent);
    void addHeader(const std::string& header);
    
    // Circular buffer integration
    void setCircularBuffer(void* buffer);
    
    // Status
    bool isInitialized();
    bool isDownloading();
    bool isCompleted();
    bool hasErrors();
    
    // Callbacks for JSI
    void setChunkDownloadedCallback();
    void setProgressCallback();
    void setCompletionCallback();

private:
    void onChunkDownloaded(const DownloadChunk& chunk);
    void onProgressUpdated(const DownloadStats& stats);
    void onDownloadCompleted(bool success);
    std::string statsToJSON(const DownloadStats& stats);
    std::string chunkToJSON(const DownloadChunk& chunk);
};

// Factory function for JSI module creation
std::shared_ptr<facebook::jsi::Object> createNetworkFetcherModule(
    std::shared_ptr<facebook::jsi::Runtime> runtime);

} // namespace NetworkFetcher
