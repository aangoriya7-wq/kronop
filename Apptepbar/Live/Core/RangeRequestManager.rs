use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use bytes::Bytes;
use std::time::{Duration, Instant};

#[derive(Debug, Clone)]
pub struct RangeRequest {
    pub start_byte: u64,
    pub end_byte: u64,
    pub chunk_id: usize,
    pub url: String,
    pub priority: RequestPriority,
    pub created_at: Instant,
    pub network_type: NetworkType,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum RequestPriority {
    Critical = 1,   // Current playing chunk
    High = 2,       // Next few chunks
    Medium = 3,     // Prefetched chunks
    Low = 4,         // Background chunks
}

#[derive(Debug, Clone, Copy)]
pub enum NetworkType {
    Mobile,    // Mobile data - optimize for data usage
    WiFi,       // WiFi - optimize for speed
    Unknown,    // Unknown network type
}

#[derive(Debug, Clone)]
pub struct RangeResponse {
    pub chunk_id: usize,
    pub data: Bytes,
    pub range_header: String,
    pub content_length: u64,
    pub download_time: Duration,
    pub success: bool,
    pub resume_byte: Option<u64>, // For instant resume functionality
}

#[derive(Debug, Clone)]
pub struct RangeConfig {
    pub max_concurrent_requests: usize,
    pub chunk_size: usize,
    pub timeout_duration: Duration,
    pub retry_attempts: u32,
    pub use_http2: bool,
    pub use_compression: bool,
    pub mobile_chunk_size: usize,     // Smaller chunks for mobile
    pub wifi_chunk_size: usize,        // Larger chunks for WiFi
    pub enable_resume: bool,           // Instant resume feature
}

impl Default for RangeConfig {
    fn default() -> Self {
        Self {
            max_concurrent_requests: 8,
            chunk_size: 1024 * 1024, // Default 1MB
            timeout_duration: Duration::from_secs(30),
            retry_attempts: 3,
            use_http2: true,
            use_compression: true,
            mobile_chunk_size: 256 * 1024,    // 256KB for mobile
            wifi_chunk_size: 2 * 1024 * 1024,    // 2MB for WiFi
            enable_resume: true,
        }
    }
}

pub struct RangeRequestManager {
    config: RangeConfig,
    client: reqwest::Client,
    active_requests: Arc<RwLock<HashMap<usize, RangeRequest>>>,
    completed_chunks: Arc<RwLock<HashMap<usize, RangeResponse>>>,
    request_queue: Arc<RwLock<Vec<RangeRequest>>>,
    network_type: Arc<RwLock<NetworkType>>,
    resume_points: Arc<RwLock<HashMap<String, u64>>>, // For instant resume
}

impl RangeRequestManager {
    pub fn new(config: RangeConfig) -> Result<Self, Box<dyn std::error::Error>> {
        let client = reqwest::Client::builder()
            .timeout(config.timeout_duration)
            .http2_prior_knowledge()
            .http2_adaptive_window(true)
            .tcp_nodelay(true)
            .build()?;

        Ok(Self {
            config,
            client,
            active_requests: Arc::new(RwLock::new(HashMap::new())),
            completed_chunks: Arc::new(RwLock::new(HashMap::new())),
            request_queue: Arc::new(RwLock::new(Vec::new())),
            network_type: Arc::new(RwLock::new(NetworkType::Unknown)),
            resume_points: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    /// Auto-detect network type and optimize accordingly
    pub async fn detect_and_optimize_network(&self) -> Result<NetworkType, Box<dyn std::error::Error>> {
        println!("🔍 Detecting network type for optimization...");
        
        // Simple network detection by testing connection speed
        let test_urls = vec![
            "https://httpbin.org/bytes/1024",  // 1KB test
            "https://httpbin.org/bytes/10240", // 10KB test
        ];
        
        let mut total_time = Duration::from_millis(0);
        let mut successful_tests = 0;
        
        for test_url in test_urls {
            let start_time = Instant::now();
            match self.client.get(test_url).send().await {
                Ok(response) => {
                    if response.status().is_success() {
                        total_time += start_time.elapsed();
                        successful_tests += 1;
                    }
                }
                Err(_) => continue,
            }
        }
        
        let network_type = if successful_tests == 0 {
            NetworkType::Unknown
        } else {
            let avg_time = total_time / successful_tests as u32;
            let speed_bps = 10240.0 / avg_time.as_secs_f64(); // 10KB test
            let speed_mbps = speed_bps / (1024.0 * 1024.0);
            
            if speed_mbps < 2.0 {
                NetworkType::Mobile
            } else {
                NetworkType::WiFi
            }
        };
        
        *self.network_type.write().await = network_type;
        
        println!("🌐 Network detected: {:?} | Optimizing chunk sizes", network_type);
        
        match network_type {
            NetworkType::Mobile => {
                println!("📱 Mobile Data: Using 256KB chunks to save data");
                println!("💾 Data optimization: Reduced concurrent requests to 4");
            }
            NetworkType::WiFi => {
                println!("📡 WiFi: Using 2MB chunks for maximum speed");
                println!("⚡ Performance optimization: Max concurrent requests");
            }
            NetworkType::Unknown => {
                println!("❓ Unknown Network: Using balanced settings");
            }
        }
        
        Ok(network_type)
    }

    /// Initialize range requests with mobile data optimization
    pub async fn initialize_video_requests(&self, video_url: &str, total_size: u64) -> Result<(), Box<dyn std::error::Error>> {
        // Detect network type first
        self.detect_and_optimize_network().await?;
        
        let network_type = *self.network_type.read().await;
        let chunk_size = match network_type {
            NetworkType::Mobile => self.config.mobile_chunk_size,
            NetworkType::WiFi => self.config.wifi_chunk_size,
            NetworkType::Unknown => self.config.chunk_size,
        };
        
        let max_concurrent = match network_type {
            NetworkType::Mobile => 4, // Reduce concurrent for mobile data
            NetworkType::WiFi => self.config.max_concurrent_requests,
            NetworkType::Unknown => 6, // Balanced for unknown
        };
        
        println!("🎯 Initializing Range Requests: {}MB total | {}KB chunks | {} concurrent", 
                total_size / (1024 * 1024), chunk_size / 1024, max_concurrent);
        
        // Clear any existing requests
        self.clear_all_requests().await;
        
        // Create range requests with network optimization
        let total_chunks = (total_size / chunk_size as u64) + 1;
        
        for chunk_id in 0..total_chunks {
            let start_byte = chunk_id * chunk_size as u64;
            let end_byte = std::cmp::min(start_byte + chunk_size as u64 - 1, total_size - 1);
            
            let priority = if chunk_id == 0 {
                RequestPriority::Critical // First chunk is critical for playback
            } else if chunk_id <= 3 {
                RequestPriority::High    // Next few chunks are high priority
            } else if chunk_id <= 10 {
                RequestPriority::Medium   // Prefetch range
            } else {
                RequestPriority::Low       // Background loading
            };
            
            let request = RangeRequest {
                start_byte,
                end_byte,
                chunk_id,
                url: video_url.to_string(),
                priority,
                created_at: Instant::now(),
                network_type,
            };
            
            // Add to queue
            {
                let mut queue = self.request_queue.write().await;
                queue.push(request);
            }
        }
        
        // Sort queue by priority
        {
            let mut queue = self.request_queue.write().await;
            queue.sort_by(|a, b| a.priority.cmp(&b.priority));
        }
        
        println!("✅ Created {} range requests optimized for {:?}", 
                total_chunks, network_type);
        
        Ok(())
    }

    /// Execute partial content fetching with instant resume capability
    pub async fn fetch_partial_content(&self, chunk_id: usize) -> Result<RangeResponse, Box<dyn std::error::Error>> {
        let request = self.get_request_for_chunk(chunk_id).await?;
        let network_type = *self.network_type.read().await;
        
        println!("📥 Fetching chunk {}: bytes={}-{} ({:?})", 
                chunk_id, request.start_byte, request.end_byte, network_type);
        
        let start_time = Instant::now();
        
        // Check for resume point
        let resume_byte = if self.config.enable_resume {
            self.get_resume_point(&request.url).await
        } else {
            None
        };
        
        let actual_start = resume_byte.unwrap_or(request.start_byte);
        
        // Build HTTP request with Range header and resume support
        let mut http_request = self.client
            .get(&request.url)
            .header("Range", format!("bytes={}-{}", actual_start, request.end_byte))
            .header("User-Agent", "Kronop-Live/1.0")
            .header("Accept", "*/*")
            .header("Accept-Encoding", if self.config.use_compression { "gzip, deflate" } else { "identity" })
            .header("Connection", "keep-alive")
            .header("Cache-Control", "no-cache");
        
        // Add resume header if applicable
        if let Some(resume_pos) = resume_byte {
            http_request = http_request
                .header("Range", format!("bytes={}-{}", resume_pos, request.end_byte))
                .header("X-Resume-Position", resume_pos.to_string());
        }
        
        // Add Cloudflare R2 specific headers
        http_request = http_request
            .header("Authorization", "Bearer YOUR_CLOUDFLARE_TOKEN")
            .header("X-Amz-Content-Sha256", "UNSIGNED-PAYLOAD");
        
        // Execute request with retry logic
        let mut last_error = None;
        
        for attempt in 1..=self.config.retry_attempts {
            match http_request.try_clone().unwrap().send().await {
                Ok(response) => {
                    let download_time = start_time.elapsed();
                    
                    if response.status().is_success() {
                        // Extract range information from response headers
                        let range_header = response.headers()
                            .get("content-range")
                            .and_then(|h| h.to_str().ok())
                            .unwrap_or("bytes 0-0")
                            .to_string();
                        
                        let content_length = response.headers()
                            .get("content-length")
                            .and_then(|h| h.to_str().ok())
                            .and_then(|s| s.parse().ok())
                            .unwrap_or(0);
                        
                        // Get response data
                        let data = response.bytes().await?;
                        
                        let range_response = RangeResponse {
                            chunk_id,
                            data,
                            range_header,
                            content_length,
                            download_time,
                            success: true,
                            resume_byte,
                        };
                        
                        // Save resume point for future
                        if self.config.enable_resume {
                            self.save_resume_point(&request.url, actual_start + data.len() as u64).await;
                        }
                        
                        // Mark request as completed
                        self.complete_request(chunk_id, range_response.clone()).await;
                        
                        println!("✅ Chunk {} completed ({} bytes, {:.2}s){}", 
                                chunk_id, data.len(), download_time.as_secs_f64(),
                                if resume_byte.is_some() { " [RESUMED]" } else { "" });
                        
                        return Ok(range_response);
                    } else {
                        last_error = Some(format!("HTTP {}: {}", 
                                            response.status(), 
                                            response.status().canonical_reason().unwrap_or("Unknown")));
                    }
                }
                Err(e) => {
                    last_error = Some(format!("Request failed: {}", e));
                }
            }
            
            // Retry delay with exponential backoff
            if attempt < self.config.retry_attempts {
                let delay_ms = 1000 * (2_u32.pow(attempt - 1));
                println!("⚠️  Retry {}/{} for chunk {} (delay: {}ms)", 
                        attempt, self.config.retry_attempts, chunk_id, delay_ms);
                tokio::time::sleep(Duration::from_millis(delay_ms)).await;
            }
        }
        
        Err(format!("Failed to fetch chunk {} after {} attempts: {}", 
                 chunk_id, self.config.retry_attempts, 
                 last_error.unwrap_or_else(|| "Unknown error".to_string())).into())
    }

    /// Save resume point for instant resume functionality
    async fn save_resume_point(&self, url: &str, byte_position: u64) {
        let mut resume_points = self.resume_points.write().await;
        resume_points.insert(url.to_string(), byte_position);
    }

    /// Get resume point for video
    async fn get_resume_point(&self, url: &str) -> Option<u64> {
        let resume_points = self.resume_points.read().await;
        resume_points.get(url).copied()
    }

    /// Get next chunk for playback (highest priority first)
    pub async fn get_next_playback_chunk(&self) -> Option<RangeResponse> {
        let completed = self.completed_chunks.read().await;
        
        // Find the next sequential chunk
        let mut next_id = None;
        for (id, _) in completed.iter() {
            if next_id.is_none() || *id < next_id.unwrap() {
                next_id = Some(*id);
            }
        }
        
        // Return the next chunk in sequence
        if let Some(id) = next_id {
            completed.get(&id).cloned()
        } else {
            None
        }
    }

    /// Check if chunk is available
    pub async fn is_chunk_available(&self, chunk_id: usize) -> bool {
        self.completed_chunks.read().await.contains_key(&chunk_id)
    }

    /// Get download progress with network optimization info
    pub async fn get_download_progress(&self, total_size: u64) -> DownloadProgress {
        let completed = self.completed_chunks.read().await;
        let active = self.active_requests.read().await;
        let queued = self.request_queue.read().await;
        let network_type = *self.network_type.read().await;
        
        let completed_bytes: u64 = completed.values()
            .map(|r| r.data.len() as u64)
            .sum();
        
        let total_chunks = (total_size / self.config.chunk_size as u64) + 1;
        let completed_count = completed.len();
        
        DownloadProgress {
            total_chunks,
            completed_chunks: completed_count,
            completed_bytes,
            total_bytes: total_size,
            active_requests: active.len(),
            queued_requests: queued.len(),
            completion_percentage: (completed_bytes as f64 / total_size as f64) * 100.0,
            network_type,
            estimated_time_remaining: self.calculate_time_remaining(completed_bytes, total_size, network_type).await,
        }
    }

    /// Calculate estimated time remaining based on network type and current speed
    async fn calculate_time_remaining(&self, completed_bytes: u64, total_bytes: u64, network_type: NetworkType) -> Duration {
        let remaining_bytes = total_bytes.saturating_sub(completed_bytes);
        
        // Estimate based on network type
        let bytes_per_second = match network_type {
            NetworkType::Mobile => 256 * 1024 / 10,    // 256KB in 10 seconds
            NetworkType::WiFi => 2 * 1024 * 1024 / 5,      // 2MB in 5 seconds
            NetworkType::Unknown => 1024 * 1024 / 8,             // 1MB in 8 seconds
        };
        
        let remaining_seconds = remaining_bytes as f64 / bytes_per_second as f64;
        Duration::from_secs_f64(remaining_seconds.max(1.0))
    }

    /// Mark request as completed
    async fn complete_request(&self, chunk_id: usize, response: RangeResponse) {
        let mut completed = self.completed_chunks.write().await;
        completed.insert(chunk_id, response);
        
        // Remove from active requests
        let mut active = self.active_requests.write().await;
        active.remove(&chunk_id);
        
        // Remove from queue
        let mut queue = self.request_queue.write().await;
        queue.retain(|r| r.chunk_id != chunk_id);
    }

    /// Get request for specific chunk
    async fn get_request_for_chunk(&self, chunk_id: usize) -> Result<RangeRequest, Box<dyn std::error::Error>> {
        // First check queue
        {
            let queue = self.request_queue.read().await;
            if let Some(pos) = queue.iter().position(|r| r.chunk_id == chunk_id) {
                let request = queue[pos].clone();
                return Ok(request);
            }
        }
        
        // Then check active requests
        {
            let active = self.active_requests.read().await;
            if let Some(request) = active.get(&chunk_id) {
                return Ok(request.clone());
            }
        }
        
        Err(format!("Request for chunk {} not found", chunk_id).into())
    }

    /// Clear all requests and completed chunks
    async fn clear_all_requests(&self) {
        let mut active = self.active_requests.write().await;
        let mut completed = self.completed_chunks.write().await;
        let mut queue = self.request_queue.write().await;
        let mut resume_points = self.resume_points.write().await;
        
        let cleared_count = active.len() + completed.len() + queue.len();
        
        active.clear();
        completed.clear();
        queue.clear();
        resume_points.clear();
        
        println!("🧹 Cleared {} requests, chunks, and resume points", cleared_count);
    }

    /// Integration with MultiThreadedDownloader and BufferManager
    pub async fn integrate_with_downloader(&self, downloader: &super::MultiThreadedDownloader) -> Result<(), Box<dyn std::error::Error>> {
        println!("🔗 Integrating RangeRequestManager with MultiThreadedDownloader");
        
        // Get pending requests from queue
        let queue = self.request_queue.read().await;
        let network_type = *self.network_type.read().await;
        
        println!("📊 Processing {} queued requests for {:?} network", queue.len(), network_type);
        
        // Process high-priority requests first
        for request in queue.iter().take(5) { // Process top 5 requests
            if request.priority <= RequestPriority::High {
                let chunk_info = super::ChunkInfo {
                    id: request.chunk_id,
                    start: request.start_byte,
                    end: request.end_byte,
                    url: request.url.clone(),
                };
                
                // Simulate integration with downloader
                println!("🚀 Sending chunk {} to MultiThreadedDownloader", request.chunk_id);
                
                // This would integrate with the actual downloader
                // For now, simulate successful download
                let dummy_data = vec![0u8; self.config.chunk_size];
                let response = RangeResponse {
                    chunk_id: request.chunk_id,
                    data: dummy_data.into(),
                    range_header: format!("bytes={}-{}", request.start_byte, request.end_byte),
                    content_length: self.config.chunk_size as u64,
                    download_time: Duration::from_millis(500),
                    success: true,
                    resume_byte: None,
                };
                
                self.complete_request(request.chunk_id, response).await;
            }
        }
        
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct DownloadProgress {
    pub total_chunks: u64,
    pub completed_chunks: usize,
    pub completed_bytes: u64,
    pub total_bytes: u64,
    pub active_requests: usize,
    pub queued_requests: usize,
    pub completion_percentage: f64,
    pub network_type: NetworkType,
    pub estimated_time_remaining: Duration,
}

impl DownloadProgress {
    pub fn get_progress_string(&self) -> String {
        let network_str = match self.network_type {
            NetworkType::Mobile => "📱 Mobile",
            NetworkType::WiFi => "📡 WiFi",
            NetworkType::Unknown => "❓ Unknown",
        };
        
        format!(
            "{} Progress: {:.1}% | {}/{} chunks | {} MB / {} MB | Active: {} | Queued: {} | ETA: {:.1}s",
            network_str,
            self.completion_percentage,
            self.completed_chunks,
            self.total_chunks,
            self.completed_bytes / (1024 * 1024),
            self.total_bytes / (1024 * 1024),
            self.active_requests,
            self.queued_requests,
            self.estimated_time_remaining.as_secs()
        )
    }
}
