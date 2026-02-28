#include "NetworkFetcher.h"
#include <jsi/jsi.h>
#include <chrono>
#include <algorithm>
#include <sstream>
#include <iomanip>

namespace NetworkFetcher {

// ThreadPool Implementation
ThreadPool::ThreadPool(size_t threads) {
    for (size_t i = 0; i < threads; ++i) {
        workers.emplace_back([this] {
            for (;;) {
                std::function<void()> task;
                
                {
                    std::unique_lock<std::mutex> lock(queueMutex);
                    condition.wait(lock, [this] { return stop || !tasks.empty(); });
                    
                    if (stop && tasks.empty()) {
                        return;
                    }
                    
                    task = std::move(tasks.front());
                    tasks.pop();
                    activeThreads.fetch_add(1);
                }
                
                task();
                activeThreads.fetch_sub(1);
            }
        });
    }
    
    LOGI("ThreadPool initialized with %zu threads", threads);
}

ThreadPool::~ThreadPool() {
    shutdown();
}

template<class F, class... Args>
auto ThreadPool::enqueue(F&& f, Args&&... args) -> std::future<typename std::result_of<F(Args...)>::type> {
    using return_type = typename std::result_of<F(Args...)>::type;
    
    auto task = std::make_shared<std::packaged_task<return_type()>>(
        std::bind(std::forward<F>(f), std::forward<Args>(args)...)
    );
    
    std::future<return_type> res = task->get_future();
    
    {
        std::unique_lock<std::mutex> lock(queueMutex);
        
        if (stop) {
            throw std::runtime_error("enqueue on stopped ThreadPool");
        }
        
        tasks.emplace([task]() { (*task)(); });
    }
    
    condition.notify_one();
    return res;
}

void ThreadPool::shutdown() {
    {
        std::unique_lock<std::mutex> lock(queueMutex);
        stop = true;
    }
    
    condition.notify_all();
    
    for (std::thread &worker : workers) {
        if (worker.joinable()) {
            worker.join();
        }
    }
    
    workers.clear();
}

size_t ThreadPool::getQueueSize() const {
    std::unique_lock<std::mutex> lock(queueMutex);
    return tasks.size();
}

// HTTPClient Implementation
HTTPClient::HTTPClient() : curl(nullptr), isInitialized(false) {
    userAgent = "NetworkFetcher/1.0 (React Native)";
}

HTTPClient::~HTTPClient() {
    cleanup();
}

bool HTTPClient::initialize() {
    curl_global_init(CURL_GLOBAL_DEFAULT);
    curl = curl_easy_init();
    
    if (!curl) {
        LOGE("Failed to initialize curl");
        return false;
    }
    
    // Set default options
    curl_easy_setopt(curl, CURLOPT_USERAGENT, userAgent.c_str());
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 1L);
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 2L);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_PROGRESSFUNCTION, ProgressCallback);
    curl_easy_setopt(curl, CURLOPT_NOPROGRESS, 0L);
    
    isInitialized = true;
    LOGI("HTTPClient initialized");
    return true;
}

void HTTPClient::cleanup() {
    if (curl) {
        curl_easy_cleanup(curl);
        curl = nullptr;
    }
    
    curl_global_cleanup();
    isInitialized = false;
}

bool HTTPClient::downloadChunk(const std::string& url, size_t offset, size_t size, 
                             std::vector<uint8_t>& data, std::string& errorMessage) {
    if (!isInitialized) {
        errorMessage = "HTTPClient not initialized";
        return false;
    }
    
    std::lock_guard<std::mutex> lock(curlMutex);
    
    // Clear data vector
    data.clear();
    data.reserve(size);
    
    // Set URL
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    
    // Set range header for chunked download
    std::string range = std::to_string(offset) + "-" + std::to_string(offset + size - 1);
    curl_easy_setopt(curl, CURLOPT_RANGE, range.c_str());
    
    // Set write data
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &data);
    
    // Perform the request
    CURLcode res = curl_easy_perform(curl);
    
    if (res != CURLE_OK) {
        errorMessage = curl_easy_strerror(res);
        LOGE("Download failed: %s", errorMessage.c_str());
        return false;
    }
    
    long responseCode;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &responseCode);
    
    if (responseCode != 200 && responseCode != 206) {
        errorMessage = "HTTP response code: " + std::to_string(responseCode);
        LOGE("HTTP error: %s", errorMessage.c_str());
        return false;
    }
    
    return true;
}

bool HTTPClient::getFileSize(const std::string& url, size_t& size) {
    if (!isInitialized) {
        return false;
    }
    
    std::lock_guard<std::mutex> lock(curlMutex);
    
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_NOBODY, 1L);
    curl_easy_setopt(curl, CURLOPT_HEADER, 0L);
    curl_easy_setopt(curl, CURLOPT_RANGE, nullptr);
    
    CURLcode res = curl_easy_perform(curl);
    
    if (res != CURLE_OK) {
        LOGE("Failed to get file size: %s", curl_easy_strerror(res));
        return false;
    }
    
    curl_off_t fileSize;
    res = curl_easy_getinfo(curl, CURLINFO_CONTENT_LENGTH_DOWNLOAD_T, &fileSize);
    
    if (res != CURLE_OK || fileSize < 0) {
        LOGE("Failed to get content length");
        return false;
    }
    
    size = static_cast<size_t>(fileSize);
    return true;
}

bool HTTPClient::supportsRangeRequests(const std::string& url) {
    if (!isInitialized) {
        return false;
    }
    
    std::lock_guard<std::mutex> lock(curlMutex);
    
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_NOBODY, 1L);
    curl_easy_setopt(curl, CURLOPT_RANGE, "0-1");
    
    CURLcode res = curl_easy_perform(curl);
    
    if (res != CURLE_OK) {
        return false;
    }
    
    long responseCode;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &responseCode);
    
    return responseCode == 206; // Partial content
}

void HTTPClient::setUserAgent(const std::string& agent) {
    userAgent = agent;
    if (curl) {
        curl_easy_setopt(curl, CURLOPT_USERAGENT, agent.c_str());
    }
}

void HTTPClient::addHeader(const std::string& header) {
    defaultHeaders.push_back(header);
}

void HTTPClient::setTimeout(int seconds) {
    if (curl) {
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, seconds);
        curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT, seconds);
    }
}

void HTTPClient::setSSLVerification(bool verify) {
    if (curl) {
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, verify ? 1L : 0L);
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, verify ? 2L : 0L);
    }
}

size_t HTTPClient::WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t totalSize = size * nmemb;
    std::vector<uint8_t>* data = static_cast<std::vector<uint8_t>*>(userp);
    
    data->insert(data->end(), 
                static_cast<uint8_t*>(contents), 
                static_cast<uint8_t*>(contents) + totalSize);
    
    return totalSize;
}

int HTTPClient::ProgressCallback(void* clientp, curl_off_t dltotal, curl_off_t dlnow,
                              curl_off_t ultotal, curl_off_t ulnow) {
    // Progress callback implementation
    return 0; // Continue download
}

// NetworkFetcher Implementation
NetworkFetcher::NetworkFetcher(size_t threadCount) {
    threadPool = std::make_unique<ThreadPool>(threadCount);
    httpClient = std::make_unique<HTTPClient>();
    
    stats.startTime.store(std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::high_resolution_clock::now().time_since_epoch()).count());
    
    LOGI("NetworkFetcher initialized with %zu threads", threadCount);
}

NetworkFetcher::~NetworkFetcher() {
    shutdown();
}

bool NetworkFetcher::initialize() {
    if (!httpClient->initialize()) {
        LOGE("Failed to initialize HTTP client");
        return false;
    }
    
    isInitialized.store(true);
    LOGI("NetworkFetcher initialized successfully");
    return true;
}

bool NetworkFetcher::shutdown() {
    shouldStop.store(true);
    stopDownload();
    
    if (threadPool) {
        threadPool->shutdown();
    }
    
    if (httpClient) {
        httpClient->cleanup();
    }
    
    isInitialized.store(false);
    LOGI("NetworkFetcher shutdown");
    return true;
}

bool NetworkFetcher::startDownload(const DownloadTask& task) {
    if (!isInitialized.load()) {
        LOGE("NetworkFetcher not initialized");
        return false;
    }
    
    if (isDownloading.load()) {
        LOGE("Download already in progress");
        return false;
    }
    
    currentTask = task;
    shouldStop.store(false);
    isDownloading.store(true);
    
    // Reset statistics
    stats.totalDownloaded.store(0);
    stats.totalSize.store(task.totalSize);
    stats.completedChunks.store(0);
    stats.failedChunks.store(0);
    stats.activeThreads.store(0);
    stats.startTime.store(std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::high_resolution_clock::now().time_since_epoch()).count());
    stats.isDownloading.store(true);
    
    // Initialize chunks
    initializeChunks(task);
    
    // Start worker thread
    std::thread worker(&NetworkFetcher::processDownloadQueue, this);
    worker.detach();
    
    LOGI("Download started: %s", task.url.c_str());
    return true;
}

bool NetworkFetcher::stopDownload() {
    shouldStop.store(true);
    isDownloading.store(false);
    stats.isDownloading.store(false);
    
    // Clear download queue
    {
        std::lock_guard<std::mutex> lock(chunksMutex);
        while (!downloadQueue.empty()) {
            downloadQueue.pop();
        }
    }
    
    LOGI("Download stopped");
    return true;
}

bool NetworkFetcher::pauseDownload() {
    // Implementation for pausing downloads
    return true;
}

bool NetworkFetcher::resumeDownload() {
    // Implementation for resuming downloads
    return true;
}

void NetworkFetcher::initializeChunks(const DownloadTask& task) {
    std::lock_guard<std::mutex> lock(chunksMutex);
    
    allChunks.clear();
    
    size_t totalSize = task.totalSize;
    size_t chunkSize = task.chunkSize;
    size_t numChunks = (totalSize + chunkSize - 1) / chunkSize;
    
    for (size_t i = 0; i < numChunks; ++i) {
        DownloadChunk chunk;
        chunk.url = task.url;
        chunk.chunkIndex = i;
        chunk.offset = i * chunkSize;
        chunk.size = std::min(chunkSize, totalSize - chunk.offset);
        chunk.isDownloaded = false;
        chunk.isFailed = false;
        
        allChunks.push_back(chunk);
        downloadQueue.push(chunk);
    }
    
    LOGI("Initialized %zu chunks for download", numChunks);
}

void NetworkFetcher::processDownloadQueue() {
    while (!shouldStop.load() && isDownloading.load()) {
        std::unique_lock<std::mutex> lock(chunksMutex);
        
        // Wait for chunks or stop signal
        chunksCondition.wait(lock, [this] {
            return !downloadQueue.empty() || shouldStop.load() || !isDownloading.load();
        });
        
        if (shouldStop.load() || !isDownloading.load()) {
            break;
        }
        
        // Process chunks concurrently
        std::vector<std::future<bool>> futures;
        
        while (!downloadQueue.empty() && 
               stats.activeThreads.load() < currentTask.maxConcurrentChunks) {
            
            DownloadChunk chunk = downloadQueue.front();
            downloadQueue.pop();
            
            auto future = threadPool->enqueue([this, chunk]() mutable {
                return downloadSingleChunk(chunk);
            });
            
            futures.push_back(std::move(future));
        }
        
        lock.unlock();
        
        // Wait for downloads to complete
        for (auto& future : futures) {
            try {
                future.wait();
            } catch (const std::exception& e) {
                LOGE("Download exception: %s", e.what());
            }
        }
        
        updateStatistics();
        
        // Check if download is complete
        if (isCompleted()) {
            onDownloadCompleted(true);
            break;
        }
    }
}

bool NetworkFetcher::downloadSingleChunk(DownloadChunk& chunk) {
    auto startTime = std::chrono::high_resolution_clock::now();
    
    stats.activeThreads.fetch_add(1);
    
    bool success = httpClient->downloadChunk(
        chunk.url, chunk.offset, chunk.size, chunk.data, chunk.errorMessage);
    
    auto endTime = std::chrono::high_resolution_clock::now();
    chunk.downloadTime = std::chrono::duration_cast<std::chrono::milliseconds>(
        endTime - startTime).count();
    
    if (success) {
        chunk.isDownloaded = true;
        stats.totalDownloaded.fetch_add(chunk.data.size());
        stats.completedChunks.fetch_add(1);
        
        // Feed chunk to circular buffer
        feedChunkToBuffer(chunk);
        
        onChunkDownloaded(chunk);
    } else {
        chunk.isFailed = true;
        chunk.retryCount++;
        stats.failedChunks.fetch_add(1);
        
        // Retry logic
        if (chunk.retryCount < currentTask.maxRetries) {
            std::lock_guard<std::mutex> lock(chunksMutex);
            downloadQueue.push(chunk);
        }
    }
    
    stats.activeThreads.fetch_sub(1);
    
    return success;
}

void NetworkFetcher::setCircularBuffer(void* buffer) {
    std::lock_guard<std::mutex> lock(bufferMutex);
    circularBuffer = buffer;
}

bool NetworkFetcher::feedChunkToBuffer(const DownloadChunk& chunk) {
    std::lock_guard<std::mutex> lock(bufferMutex);
    
    if (!circularBuffer) {
        return false;
    }
    
    // This would integrate with the ReelsCircularBuffer
    // For now, just log the chunk feeding
    LOGI("Feeding chunk %zu (%zu bytes) to circular buffer", 
         chunk.chunkIndex, chunk.data.size());
    
    return true;
}

DownloadStats NetworkFetcher::getStats() const {
    return stats;
}

float NetworkFetcher::getDownloadProgress() const {
    if (stats.totalSize.load() == 0) {
        return 0.0f;
    }
    
    return (static_cast<float>(stats.totalDownloaded.load()) / 
            static_cast<float>(stats.totalSize.load())) * 100.0f;
}

float NetworkFetcher::getCurrentSpeed() const {
    return stats.currentSpeed.load();
}

float NetworkFetcher::getAverageSpeed() const {
    return stats.averageSpeed.load();
}

int64_t NetworkFetcher::getEstimatedTimeRemaining() const {
    float currentSpeed = getCurrentSpeed();
    if (currentSpeed <= 0) {
        return -1;
    }
    
    size_t remaining = stats.totalSize.load() - stats.totalDownloaded.load();
    return static_cast<int64_t>(remaining / currentSpeed);
}

void NetworkFetcher::setChunkDownloadedCallback(std::function<void(const DownloadChunk&)> callback) {
    chunkDownloadedCallback = callback;
}

void NetworkFetcher::setProgressCallback(std::function<void(const DownloadStats&)> callback) {
    progressCallback = callback;
}

void NetworkFetcher::setCompletionCallback(std::function<void(bool)> callback) {
    completionCallback = callback;
}

bool NetworkFetcher::isCompleted() const {
    return stats.completedChunks.load() + stats.failedChunks.load() == 
           static_cast<int>(allChunks.size());
}

bool NetworkFetcher::hasErrors() const {
    return stats.failedChunks.load() > 0;
}

void NetworkFetcher::updateStatistics() {
    auto now = std::chrono::high_resolution_clock::now();
    auto currentTime = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()).count();
    
    stats.elapsedTime.store(currentTime - stats.startTime.load());
    
    // Calculate current speed (bytes per second)
    if (stats.elapsedTime.load() > 0) {
        stats.currentSpeed.store(static_cast<float>(stats.totalDownloaded.load()) * 1000.0f / 
                               static_cast<float>(stats.elapsedTime.load()));
    }
    
    // Calculate average speed
    if (stats.completedChunks.load() > 0) {
        stats.averageSpeed.store(stats.currentSpeed.load());
    }
    
    onProgressUpdated();
}

void NetworkFetcher::onChunkDownloaded(const DownloadChunk& chunk) {
    if (chunkDownloadedCallback) {
        chunkDownloadedCallback(chunk);
    }
}

void NetworkFetcher::onDownloadCompleted(bool success) {
    isDownloading.store(false);
    stats.isDownloading.store(false);
    
    if (completionCallback) {
        completionCallback(success);
    }
    
    LOGI("Download completed: %s", success ? "success" : "failed");
}

void NetworkFetcher::onProgressUpdated() {
    if (progressCallback) {
        progressCallback(stats);
    }
}

// JSI Interface Implementation
NetworkFetcherJSI::NetworkFetcherJSI(std::shared_ptr<facebook::jsi::Runtime> rt)
    : runtime(rt) {
    networkFetcher = std::make_shared<NetworkFetcher>(8);
    LOGI("NetworkFetcherJSI initialized");
}

NetworkFetcherJSI::~NetworkFetcherJSI() {
    if (networkFetcher) {
        networkFetcher->shutdown();
    }
    LOGI("NetworkFetcherJSI destroyed");
}

bool NetworkFetcherJSI::initialize() {
    if (!networkFetcher) {
        return false;
    }
    
    bool success = networkFetcher->initialize();
    if (success) {
        isInitialized.store(true);
        
        // Set up callbacks
        networkFetcher->setChunkDownloadedCallback([this](const DownloadChunk& chunk) {
            onChunkDownloaded(chunk);
        });
        
        networkFetcher->setProgressCallback([this](const DownloadStats& stats) {
            onProgressUpdated(stats);
        });
        
        networkFetcher->setCompletionCallback([this](bool success) {
            onDownloadCompleted(success);
        });
    }
    
    return success;
}

bool NetworkFetcherJSI::shutdown() {
    if (!networkFetcher) {
        return false;
    }
    
    isInitialized.store(false);
    return networkFetcher->shutdown();
}

bool NetworkFetcherJSI::startDownload(const std::string& url, const std::string& filename,
                                    int chunkSize, int maxConcurrent) {
    if (!networkFetcher || !isInitialized.load()) {
        return false;
    }
    
    DownloadTask task;
    task.url = url;
    task.filename = filename;
    task.chunkSize = chunkSize;
    task.maxConcurrentChunks = maxConcurrent;
    
    // Get file size
    HTTPClient client;
    client.initialize();
    size_t fileSize;
    if (client.getFileSize(url, fileSize)) {
        task.totalSize = fileSize;
    }
    
    return networkFetcher->startDownload(task);
}

bool NetworkFetcherJSI::stopDownload() {
    return networkFetcher ? networkFetcher->stopDownload() : false;
}

bool NetworkFetcherJSI::pauseDownload() {
    return networkFetcher ? networkFetcher->pauseDownload() : false;
}

bool NetworkFetcherJSI::resumeDownload() {
    return networkFetcher ? networkFetcher->resumeDownload() : false;
}

bool NetworkFetcherJSI::addChunk(const std::string& url, int chunkIndex, int offset, int size) {
    if (!networkFetcher) {
        return false;
    }
    
    return networkFetcher->addChunkToDownload(url, chunkIndex, offset, size);
}

std::string NetworkFetcherJSI::getChunkStatus(int chunkIndex) {
    // Implementation for getting chunk status
    return "{}";
}

std::string NetworkFetcherJSI::getDownloadStats() {
    if (!networkFetcher) {
        return "{}";
    }
    
    DownloadStats stats = networkFetcher->getStats();
    return statsToJSON(stats);
}

float NetworkFetcherJSI::getProgress() {
    return networkFetcher ? networkFetcher->getDownloadProgress() : 0.0f;
}

float NetworkFetcherJSI::getCurrentSpeed() {
    return networkFetcher ? networkFetcher->getCurrentSpeed() : 0.0f;
}

float NetworkFetcherJSI::getAverageSpeed() {
    return networkFetcher ? networkFetcher->getAverageSpeed() : 0.0f;
}

int64_t NetworkFetcherJSI::getEstimatedTimeRemaining() {
    return networkFetcher ? networkFetcher->getEstimatedTimeRemaining() : -1;
}

void NetworkFetcherJSI::setMaxConcurrentDownloads(int count) {
    if (networkFetcher) {
        networkFetcher->setMaxConcurrentDownloads(count);
    }
}

void NetworkFetcherJSI::setChunkSize(int size) {
    if (networkFetcher) {
        networkFetcher->setChunkSize(size);
    }
}

void NetworkFetcherJSI::setTimeout(int seconds) {
    if (networkFetcher) {
        networkFetcher->setTimeout(seconds);
    }
}

void NetworkFetcherJSI::setUserAgent(const std::string& agent) {
    if (networkFetcher) {
        networkFetcher->setUserAgent(agent);
    }
}

void NetworkFetcherJSI::addHeader(const std::string& header) {
    if (networkFetcher) {
        networkFetcher->addHeader(header);
    }
}

void NetworkFetcherJSI::setCircularBuffer(void* buffer) {
    if (networkFetcher) {
        networkFetcher->setCircularBuffer(buffer);
    }
}

bool NetworkFetcherJSI::isInitialized() {
    return isInitialized.load();
}

bool NetworkFetcherJSI::isDownloading() {
    return networkFetcher ? networkFetcher->isDownloading() : false;
}

bool NetworkFetcherJSI::isCompleted() {
    return networkFetcher ? networkFetcher->isCompleted() : false;
}

bool NetworkFetcherJSI::hasErrors() {
    return networkFetcher ? networkFetcher->hasErrors() : false;
}

void NetworkFetcherJSI::onChunkDownloaded(const DownloadChunk& chunk) {
    // Handle chunk downloaded callback
}

void NetworkFetcherJSI::onProgressUpdated(const DownloadStats& stats) {
    // Handle progress updated callback
}

void NetworkFetcherJSI::onDownloadCompleted(bool success) {
    // Handle download completed callback
}

std::string NetworkFetcherJSI::statsToJSON(const DownloadStats& stats) {
    std::ostringstream json;
    json << "{"
          << "\"totalDownloaded\":" << stats.totalDownloaded.load() << ","
          << "\"totalSize\":" << stats.totalSize.load() << ","
          << "\"completedChunks\":" << stats.completedChunks.load() << ","
          << "\"failedChunks\":" << stats.failedChunks.load() << ","
          << "\"activeThreads\":" << stats.activeThreads.load() << ","
          << "\"elapsedTime\":" << stats.elapsedTime.load() << ","
          << "\"currentSpeed\":" << stats.currentSpeed.load() << ","
          << "\"averageSpeed\":" << stats.averageSpeed.load() << ","
          << "\"isDownloading\":" << (stats.isDownloading.load() ? "true" : "false")
          << "}";
    return json.str();
}

std::string NetworkFetcherJSI::chunkToJSON(const DownloadChunk& chunk) {
    std::ostringstream json;
    json << "{"
          << "\"chunkIndex\":" << chunk.chunkIndex << ","
          << "\"offset\":" << chunk.offset << ","
          << "\"size\":" << chunk.size << ","
          << "\"isDownloaded\":" << (chunk.isDownloaded ? "true" : "false") << ","
          << "\"isFailed\":" << (chunk.isFailed ? "true" : "false") << ","
          << "\"downloadTime\":" << chunk.downloadTime << ","
          << "\"retryCount\":" << chunk.retryCount
          << "}";
    return json.str();
}

// JSI Module Creation
std::shared_ptr<facebook::jsi::Object> createNetworkFetcherModule(
    std::shared_ptr<facebook::jsi::Runtime> runtime) {
    
    auto networkFetcher = std::make_shared<NetworkFetcherJSI>(runtime);
    auto object = std::make_shared<facebook::jsi::Object>(*runtime);
    
    // Initialize method
    auto initialize = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "initialize"),
        0,
        [networkFetcher](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal,
                      const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            bool result = networkFetcher->initialize();
            return facebook::jsi::Value(rt, result);
        });
    
    // Start download method
    auto startDownload = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "startDownload"),
        4,
        [networkFetcher](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal,
                      const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            if (count < 4) return facebook::jsi::Value(rt, false);
            
            std::string url = args[0].getString(rt).utf8(rt);
            std::string filename = args[1].getString(rt).utf8(rt);
            int chunkSize = static_cast<int>(args[2].getNumber());
            int maxConcurrent = static_cast<int>(args[3].getNumber());
            
            bool result = networkFetcher->startDownload(url, filename, chunkSize, maxConcurrent);
            return facebook::jsi::Value(rt, result);
        });
    
    // Get download stats method
    auto getDownloadStats = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "getDownloadStats"),
        0,
        [networkFetcher](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal,
                      const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            std::string stats = networkFetcher->getDownloadStats();
            return facebook::jsi::String::createFromUtf8(rt, stats);
        });
    
    // Get progress method
    auto getProgress = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "getProgress"),
        0,
        [networkFetcher](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal,
                      const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            float progress = networkFetcher->getProgress();
            return facebook::jsi::Value(rt, progress);
        });
    
    // Stop download method
    auto stopDownload = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "stopDownload"),
        0,
        [networkFetcher](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal,
                      const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            bool result = networkFetcher->stopDownload();
            return facebook::jsi::Value(rt, result);
        });
    
    // Set properties on the object
    object->setProperty(*runtime, "initialize", std::move(initialize));
    object->setProperty(*runtime, "startDownload", std::move(startDownload));
    object->setProperty(*runtime, "getDownloadStats", std::move(getDownloadStats));
    object->setProperty(*runtime, "getProgress", std::move(getProgress));
    object->setProperty(*runtime, "stopDownload", std::move(stopDownload));
    
    return object;
}

} // namespace NetworkFetcher
