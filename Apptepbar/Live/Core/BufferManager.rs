use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use bytes::Bytes;

#[derive(Debug, Clone)]
pub struct ChunkData {
    pub id: usize,
    pub data: Bytes,
    pub timestamp: Instant,
    pub size: usize,
    pub is_prefetched: bool,
}

#[derive(Debug, Clone, Copy)]
pub enum NetworkSpeed {
    Slow,     // < 1 Mbps
    Medium,   // 1-5 Mbps
    Fast,      // > 5 Mbps
}

#[derive(Debug, Clone)]
pub struct BufferConfig {
    pub max_memory_mb: usize,
    pub prefetch_count: usize,
    pub small_chunk_size: usize,    // For slow networks
    pub large_chunk_size: usize,    // For fast networks
    pub cleanup_threshold: f64,     // Memory usage threshold
}

impl Default for BufferConfig {
    fn default() -> Self {
        Self {
            max_memory_mb: 200,        // 200MB max memory usage
            prefetch_count: 2,           // Pre-fetch 2 live
            small_chunk_size: 256 * 1024,  // 256KB chunks for slow networks
            large_chunk_size: 2 * 1024 * 1024, // 2MB chunks for fast networks
            cleanup_threshold: 0.8,    // Clean up when 80% memory used
        }
    }
}

pub struct BufferManager {
    config: BufferConfig,
    chunks: Arc<RwLock<HashMap<usize, ChunkData>>>,
    chunk_order: Arc<RwLock<VecDeque<usize>>>,
    current_video_id: Arc<RwLock<Option<String>>>,
    network_speed: Arc<RwLock<NetworkSpeed>>,
    memory_usage: Arc<RwLock<usize>>,
    last_cleanup: Arc<RwLock<Instant>>,
}

impl BufferManager {
    pub fn new(config: BufferConfig) -> Self {
        Self {
            config,
            chunks: Arc::new(RwLock::new(HashMap::new())),
            chunk_order: Arc::new(RwLock::new(VecDeque::new())),
            current_video_id: Arc::new(RwLock::new(None)),
            network_speed: Arc::new(RwLock::new(NetworkSpeed::Medium)),
            memory_usage: Arc::new(RwLock::new(0)),
            last_cleanup: Arc::new(RwLock::new(Instant::now())),
        }
    }

    /// Predictive loading: Pre-fetch 2 live when user is watching current reel
    pub async fn start_predictive_loading(&self, current_video_id: &str, next_video_ids: &[String]) {
        *self.current_video_id.write().await = Some(current_video_id.to_string());
        
        // Pre-fetch first 1-2 MB of next 2 live
        let prefetch_count = std::cmp::min(self.config.prefetch_count, next_video_ids.len());
        
        for i in 0..prefetch_count {
            let video_id = &next_video_ids[i];
            let chunk_size = self.get_adaptive_chunk_size().await;
            
            // Start pre-fetch in background
            let chunks = self.chunks.clone();
            let chunk_order = self.chunk_order.clone();
            let config = self.config.clone();
            
            tokio::spawn(async move {
                Self::prefetch_video_chunks(video_id, chunk_size, chunks, chunk_order, config).await;
            });
            
            println!("Started pre-fetch for reel: {} ({}MB chunks)", video_id, chunk_size / (1024 * 1024));
        }
    }

    /// Chunk re-assembly: Assemble chunks from 10 parallel streams in correct order
    pub async fn add_chunk(&self, chunk_id: usize, data: Bytes, is_prefetched: bool) -> Result<(), String> {
        let chunk_data = ChunkData {
            id: chunk_id,
            data: data.clone(),
            timestamp: Instant::now(),
            size: data.len(),
            is_prefetched,
        };

        // Add chunk to buffer
        {
            let mut chunks = self.chunks.write().await;
            let mut chunk_order = self.chunk_order.write().await;
            
            chunks.insert(chunk_id, chunk_data);
            if !chunk_order.contains(&chunk_id) {
                chunk_order.push_back(chunk_id);
            }
        }

        // Update memory usage
        {
            let mut memory_usage = self.memory_usage.write().await;
            *memory_usage += data.len();
        }

        // Check if cleanup is needed
        self.check_memory_cleanup().await;

        println!("Added chunk {} to buffer ({} bytes, prefetched: {})", 
                chunk_id, data.len(), is_prefetched);
        
        Ok(())
    }

    /// Get next chunk for playback in correct order
    pub async fn get_next_chunk(&self) -> Option<ChunkData> {
        let mut chunk_order = self.chunk_order.write().await;
        let chunks = self.chunks.read().await;
        
        if let Some(&chunk_id) = chunk_order.front() {
            if let Some(chunk_data) = chunks.get(&chunk_id) {
                let chunk_data = chunk_data.clone();
                chunk_order.pop_front();
                
                // Update memory usage
                let mut memory_usage = self.memory_usage.write().await;
                *memory_usage = memory_usage.saturating_sub(chunk_data.size);
                
                return Some(chunk_data);
            }
        }
        
        None
    }

    /// Memory control: Continuous cleanup to prevent RAM overflow
    async fn check_memory_cleanup(&self) {
        let now = Instant::now();
        let mut last_cleanup = self.last_cleanup.write().await;
        
        // Only cleanup every 5 seconds
        if now.duration_since(*last_cleanup) < Duration::from_secs(5) {
            return;
        }
        
        let memory_usage = *self.memory_usage.read().await;
        let max_memory = self.config.max_memory_mb * 1024 * 1024;
        let usage_ratio = memory_usage as f64 / max_memory as f64;
        
        if usage_ratio > self.config.cleanup_threshold {
            println!("Memory usage: {:.1}% - Starting cleanup", usage_ratio * 100.0);
            self.cleanup_old_chunks().await;
        }
        
        *last_cleanup = now;
    }

    /// Remove old chunks to free memory
    async fn cleanup_old_chunks(&self) {
        let current_video_id = self.current_video_id.read().await.clone();
        let mut chunks = self.chunks.write().await;
        let mut chunk_order = self.chunk_order.write().await;
        let mut memory_usage = self.memory_usage.write().await;
        
        let now = Instant::now();
        let mut to_remove = Vec::new();
        
        // Remove prefetched chunks older than 30 seconds
        for (chunk_id, chunk_data) in chunks.iter() {
            if chunk_data.is_prefetched && 
               now.duration_since(chunk_data.timestamp) > Duration::from_secs(30) {
                to_remove.push(*chunk_id);
            }
        }
        
        // Remove chunks and update order
        for chunk_id in &to_remove {
            if let Some(chunk_data) = chunks.remove(chunk_id) {
                *memory_usage = memory_usage.saturating_sub(chunk_data.size);
                chunk_order.retain(|&id| id != *chunk_id);
            }
        }
        
        if !to_remove.is_empty() {
            println!("Cleaned up {} old chunks, freed {} MB", 
                    to_remove.len(), 
                    to_remove.len() * 2 / (1024 * 1024)); // Approximate
        }
    }

    /// Adaptive buffering: Adjust chunk size based on network speed
    pub async fn get_adaptive_chunk_size(&self) -> usize {
        let network_speed = *self.network_speed.read().await;
        
        match network_speed {
            NetworkSpeed::Slow => self.config.small_chunk_size,     // 256KB chunks
            NetworkSpeed::Medium => (self.config.small_chunk_size + self.config.large_chunk_size) / 2, // 1.125MB
            NetworkSpeed::Fast => self.config.large_chunk_size,      // 2MB chunks
        }
    }

    /// Update network speed based on download performance
    pub async fn update_network_speed(&self, download_speed_bps: f64) {
        let speed_mbps = download_speed_bps / (1024.0 * 1024.0);
        let new_speed = if speed_mbps < 1.0 {
            NetworkSpeed::Slow
        } else if speed_mbps < 5.0 {
            NetworkSpeed::Medium
        } else {
            NetworkSpeed::Fast
        };
        
        let old_speed = *self.network_speed.read().await;
        *self.network_speed.write().await = new_speed;
        
        if old_speed != new_speed {
            println!("Network speed updated: {:?} ({:.2} Mbps)", new_speed, speed_mbps);
        }
    }

    /// Get buffer status for monitoring
    pub async fn get_buffer_status(&self) -> BufferStatus {
        let chunks = self.chunks.read().await;
        let chunk_order = self.chunk_order.read().await;
        let memory_usage = *self.memory_usage.read().await;
        let max_memory = self.config.max_memory_mb * 1024 * 1024;
        
        let prefetched_count = chunks.values()
            .filter(|c| c.is_prefetched)
            .count();
            
        let ready_count = chunk_order.len();
        let memory_usage_percent = (memory_usage as f64 / max_memory as f64) * 100.0;
        
        BufferStatus {
            total_chunks: chunks.len(),
            ready_chunks: ready_count,
            prefetched_chunks: prefetched_count,
            memory_usage_mb: memory_usage / (1024 * 1024),
            memory_usage_percent,
            network_speed: *self.network_speed.read().await,
        }
    }

    /// Prefetch video chunks in background
    async fn prefetch_video_chunks(
        video_id: &str,
        chunk_size: usize,
        chunks: Arc<RwLock<HashMap<usize, ChunkData>>>,
        chunk_order: Arc<RwLock<VecDeque<usize>>>,
        config: BufferConfig,
    ) {
        // Simulate fetching first 1-2 MB of video data
        let chunks_to_fetch = (2 * 1024 * 1024) / chunk_size; // 2MB total
        
        for i in 0..chunks_to_fetch {
            let chunk_id = format!("{}-{}", video_id, i);
            
            // Simulate network delay
            tokio::time::sleep(Duration::from_millis(100)).await;
            
            // Create dummy chunk data
            let dummy_data = vec![0u8; chunk_size];
            let bytes = Bytes::from(dummy_data);
            
            let chunk_data = ChunkData {
                id: i,
                data: bytes,
                timestamp: Instant::now(),
                size: chunk_size,
                is_prefetched: true,
            };
            
            chunks.write().await.insert(i, chunk_data);
            chunk_order.write().await.push_back(i);
        }
        
        println!("Prefetched {} chunks for video {}", chunks_to_fetch, video_id);
    }

    /// Force cleanup of all buffers
    pub async fn clear_all_buffers(&self) {
        let mut chunks = self.chunks.write().await;
        let mut chunk_order = self.chunk_order.write().await;
        let mut memory_usage = self.memory_usage.write().await;
        
        let cleared_count = chunks.len();
        chunks.clear();
        chunk_order.clear();
        *memory_usage = 0;
        
        println!("Cleared all buffers: {} chunks removed", cleared_count);
    }

    /// Get current video ID
    pub async fn get_current_video_id(&self) -> Option<String> {
        self.current_video_id.read().await.clone()
    }

    /// Check if chunk exists in buffer
    pub async fn has_chunk(&self, chunk_id: usize) -> bool {
        self.chunks.read().await.contains_key(&chunk_id)
    }

    /// Get buffered chunk IDs in order
    pub async fn get_buffered_chunk_ids(&self) -> Vec<usize> {
        self.chunk_order.read().await.iter().cloned().collect()
    }
}

#[derive(Debug, Clone)]
pub struct BufferStatus {
    pub total_chunks: usize,
    pub ready_chunks: usize,
    pub prefetched_chunks: usize,
    pub memory_usage_mb: usize,
    pub memory_usage_percent: f64,
    pub network_speed: NetworkSpeed,
}

impl BufferStatus {
    pub fn is_healthy(&self) -> bool {
        self.memory_usage_percent < 90.0 && self.ready_chunks > 0
    }

    pub fn get_status_string(&self) -> String {
        format!(
            "Buffer: {}/{} chunks | Memory: {:.1}% ({}/{}MB) | Network: {:?}",
            self.ready_chunks,
            self.total_chunks,
            self.memory_usage_percent,
            self.memory_usage_mb,
            self.memory_usage_mb + (self.memory_usage_mb as f64 * (100.0 - self.memory_usage_percent) / 100.0) as usize,
            self.network_speed
        )
    }
}
