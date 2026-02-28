//! Persistent Local Cache Manager
//! 
//! Provides persistent file-based caching for video chunks in app's internal directory

use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use parking_lot::Mutex;
use log::{info, warn, debug, error};
use anyhow::{Result, anyhow};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use sha2::{Sha256, Digest};

/// Persistent cache manager for video chunks
pub struct PersistentCacheManager {
    /// Cache directory (app's internal data folder)
    cache_dir: PathBuf,
    /// Cache metadata
    metadata: Arc<Mutex<PersistentCacheMetadata>>,
    /// Maximum cache size in bytes
    max_cache_size: usize,
    /// Current cache size
    current_cache_size: Arc<Mutex<usize>>,
    /// Cache statistics
    stats: Arc<Mutex<PersistentCacheStats>>,
}

/// Persistent cache metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistentCacheMetadata {
    /// Video chunks metadata
    pub chunks: HashMap<String, PersistentChunkMetadata>,
    /// Cache configuration
    pub config: PersistentCacheConfig,
    /// Last cleanup timestamp
    pub last_cleanup: u64,
    /// Cache version
    pub version: u32,
}

/// Individual persistent chunk metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistentChunkMetadata {
    /// Chunk ID (hash)
    pub chunk_id: String,
    /// Video URL
    pub video_url: String,
    /// File path in cache
    pub file_path: String,
    /// File size in bytes
    pub file_size: u64,
    /// Creation timestamp
    pub created_at: u64,
    /// Last access timestamp
    pub last_accessed: u64,
    /// Access count
    pub access_count: u32,
    /// Is key frame
    pub is_key_frame: bool,
    /// Chunk sequence number
    pub sequence_number: u32,
    /// Compression ratio
    pub compression_ratio: f32,
    /// File hash for integrity
    pub file_hash: String,
    /// Expiration timestamp
    pub expires_at: u64,
}

/// Persistent cache configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistentCacheConfig {
    /// Maximum cache size in MB
    pub max_size_mb: u64,
    /// Maximum number of chunks
    pub max_chunks: usize,
    /// Cache cleanup threshold (0.0 to 1.0)
    pub cleanup_threshold: f32,
    /// Chunk expiration time in seconds
    pub chunk_expiration: u64,
    /// Enable compression
    pub enable_compression: bool,
    /// Enable smart eviction
    pub enable_smart_eviction: bool,
    /// Enable integrity checking
    pub enable_integrity_check: bool,
    /// Enable backup
    pub enable_backup: bool,
}

/// Persistent cache statistics
#[derive(Debug, Clone, Default)]
pub struct PersistentCacheStats {
    /// Total cache hits
    pub cache_hits: u64,
    /// Total cache misses
    pub cache_misses: u64,
    /// Total chunks stored
    pub total_chunks_stored: u64,
    /// Total chunks evicted
    pub total_chunks_evicted: u64,
    /// Total bytes stored
    pub total_bytes_stored: u64,
    /// Total bytes evicted
    pub total_bytes_evicted: u64,
    /// Cache hit ratio
    pub cache_hit_ratio: f32,
    /// Current cache utilization
    pub cache_utilization: f32,
    /// Compression ratio
    pub avg_compression_ratio: f32,
    /// Integrity check failures
    pub integrity_failures: u64,
    /// Backup operations
    pub backup_operations: u64,
    /// Restore operations
    pub restore_operations: u64,
}

impl Default for PersistentCacheConfig {
    fn default() -> Self {
        Self {
            max_size_mb: 500, // 500MB default
            max_chunks: 1000,
            cleanup_threshold: 0.8, // 80% utilization trigger cleanup
            chunk_expiration: 86400, // 24 hours
            enable_compression: true,
            enable_smart_eviction: true,
            enable_integrity_check: true,
            enable_backup: true,
        }
    }
}

impl PersistentCacheManager {
    /// Create new persistent cache manager
    pub fn new() -> Result<Self> {
        Self::with_config(PersistentCacheConfig::default())
    }
    
    /// Create cache manager with custom configuration
    pub fn with_config(config: PersistentCacheConfig) -> Result<Self> {
        info!("Creating persistent cache manager with config: {:?}", config);
        
        // Get app's internal data directory
        let cache_dir = Self::get_app_cache_directory()?;
        
        // Create reels_cache subdirectory
        let reels_cache_dir = cache_dir.join("reels_cache");
        fs::create_dir_all(&reels_cache_dir)?;
        
        // Initialize metadata
        let metadata = PersistentCacheMetadata {
            chunks: HashMap::new(),
            config,
            last_cleanup: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            version: 1,
        };
        
        let max_cache_size = (metadata.config.max_size_mb * 1024 * 1024) as usize;
        
        let cache_manager = Self {
            cache_dir: reels_cache_dir,
            metadata: Arc::new(Mutex::new(metadata)),
            max_cache_size,
            current_cache_size: Arc::new(Mutex::new(0)),
            stats: Arc::new(Mutex::new(PersistentCacheStats::default())),
        };
        
        // Load existing metadata
        cache_manager.load_metadata()?;
        
        info!("Persistent cache manager initialized: {} MB max size", cache_manager.max_cache_size / (1024 * 1024));
        Ok(cache_manager)
    }
    
    /// Get app's internal data directory
    fn get_app_cache_directory() -> Result<PathBuf> {
        // For React Native, this would be the app's internal data directory
        // For now, use a temporary directory for testing
        let mut cache_dir = std::env::temp_dir();
        
        // Try to get app-specific directory
        if let Ok(app_data_dir) = std::env::var("HOME") {
            cache_dir = PathBuf::from(app_data_dir);
            cache_dir.push(".kronop_reels_cache");
        } else {
            cache_dir.push("kronop_reels_cache");
        }
        
        Ok(cache_dir)
    }
    
    /// Generate unique file path for chunk using hash
    fn generate_chunk_file_path(&self, chunk_id: &str) -> Result<PathBuf> {
        let hash = Self::calculate_chunk_hash(chunk_id);
        let file_name = format!("{}.chunk", hash);
        Ok(self.cache_dir.join(file_name))
    }
    
    /// Calculate SHA256 hash for chunk ID
    fn calculate_chunk_hash(chunk_id: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(chunk_id.as_bytes());
        let result = hasher.finalize();
        format!("{:x}", result)
    }
    
    /// Store video chunk in persistent cache
    pub fn store_chunk(&self, chunk_id: &str, video_url: &str, data: &[u8], is_key_frame: bool, sequence_number: u32) -> Result<bool> {
        debug!("Storing persistent chunk: {} (size: {} bytes)", chunk_id, data.len());
        
        // Check if chunk already exists
        if self.is_chunk_cached(chunk_id)? {
            debug!("Chunk already cached: {}", chunk_id);
            self.update_access_time(chunk_id)?;
            return Ok(true);
        }
        
        // Check cache size limit
        {
            let current_size = *self.current_cache_size.lock();
            if current_size + data.len() > self.max_cache_size {
                debug!("Cache full, triggering cleanup");
                self.cleanup_cache()?;
            }
        }
        
        // Generate file path
        let file_path = self.generate_chunk_file_path(chunk_id)?;
        
        // Compress data if enabled
        let (compressed_data, compression_ratio) = if self.metadata.lock().config.enable_compression {
            let compressed = self.compress_data(data)?;
            let ratio = data.len() as f32 / compressed.len() as f32;
            (compressed, ratio)
        } else {
            (data.to_vec(), 1.0)
        };
        
        // Calculate file hash for integrity
        let file_hash = Self::calculate_data_hash(&compressed_data);
        
        // Write to file
        fs::write(&file_path, &compressed_data)?;
        
        // Calculate expiration
        let expires_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64 + (self.metadata.lock().config.chunk_expiration * 1000);
        
        // Update metadata
        {
            let mut metadata = self.metadata.lock();
            let chunk_metadata = PersistentChunkMetadata {
                chunk_id: chunk_id.to_string(),
                video_url: video_url.to_string(),
                file_path: file_path.to_string_lossy().to_string(),
                file_size: compressed_data.len() as u64,
                created_at: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64,
                last_accessed: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64,
                access_count: 1,
                is_key_frame,
                sequence_number,
                compression_ratio,
                file_hash,
                expires_at,
            };
            
            metadata.chunks.insert(chunk_id.to_string(), chunk_metadata);
        }
        
        // Update cache size
        *self.current_cache_size.lock() += compressed_data.len();
        
        // Update statistics
        {
            let mut stats = self.stats.lock();
            stats.total_chunks_stored += 1;
            stats.total_bytes_stored += compressed_data.len() as u64;
            
            // Update compression ratio
            let total_chunks = stats.total_chunks_stored;
            if total_chunks > 0 {
                stats.avg_compression_ratio = (stats.avg_compression_ratio * (total_chunks - 1) as f32 + compression_ratio) / total_chunks as f32;
            }
        }
        
        // Save metadata
        self.save_metadata()?;
        
        info!("Persistent chunk stored: {} (compressed: {:.2}x)", chunk_id, compression_ratio);
        Ok(true)
    }
    
    /// Retrieve video chunk from persistent cache
    pub fn get_chunk(&self, chunk_id: &str) -> Result<Option<Vec<u8>>> {
        debug!("Retrieving persistent chunk: {}", chunk_id);
        
        let metadata = self.metadata.lock();
        
        if let Some(chunk_metadata) = metadata.chunks.get(chunk_id) {
            // Check expiration
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;
            
            if now > chunk_metadata.expires_at {
                debug!("Chunk expired: {}", chunk_id);
                self.remove_chunk(chunk_id)?;
                return Ok(None);
            }
            
            // Check if file exists
            if !Path::new(&chunk_metadata.file_path).exists() {
                warn!("Chunk file not found: {}", chunk_metadata.file_path);
                self.remove_chunk(chunk_id)?;
                return Ok(None);
            }
            
            // Read file
            let compressed_data = fs::read(&chunk_metadata.file_path)?;
            
            // Verify integrity if enabled
            if metadata.config.enable_integrity_check {
                let current_hash = Self::calculate_data_hash(&compressed_data);
                if current_hash != chunk_metadata.file_hash {
                    error!("Integrity check failed for chunk: {}", chunk_id);
                    {
                        let mut stats = self.stats.lock();
                        stats.integrity_failures += 1;
                    }
                    self.remove_chunk(chunk_id)?;
                    return Ok(None);
                }
            }
            
            // Decompress if needed
            let data = if metadata.config.enable_compression {
                self.decompress_data(&compressed_data)?
            } else {
                compressed_data
            };
            
            // Update access statistics
            drop(metadata);
            self.update_access_time(chunk_id)?;
            
            // Update cache hit statistics
            {
                let mut stats = self.stats.lock();
                stats.cache_hits += 1;
                stats.cache_hit_ratio = stats.cache_hits as f32 / (stats.cache_hits + stats.cache_misses) as f32;
            }
            
            debug!("Persistent chunk retrieved: {} (size: {} bytes)", chunk_id, data.len());
            Ok(Some(data))
        } else {
            // Update cache miss statistics
            {
                let mut stats = self.stats.lock();
                stats.cache_misses += 1;
                stats.cache_hit_ratio = stats.cache_hits as f32 / (stats.cache_hits + stats.cache_misses) as f32;
            }
            
            debug!("Persistent chunk not found: {}", chunk_id);
            Ok(None)
        }
    }
    
    /// Check if chunk is cached
    pub fn is_chunk_cached(&self, chunk_id: &str) -> Result<bool> {
        let metadata = self.metadata.lock();
        Ok(metadata.chunks.contains_key(chunk_id))
    }
    
    /// Get all cached chunks for a video URL
    pub fn get_video_chunks(&self, video_url: &str) -> Result<Vec<String>> {
        let metadata = self.metadata.lock();
        let mut chunks = Vec::new();
        
        for (chunk_id, chunk_metadata) in &metadata.chunks {
            if chunk_metadata.video_url == video_url {
                chunks.push(chunk_id.clone());
            }
        }
        
        // Sort by sequence number
        chunks.sort_by(|a, b| {
            let seq_a = metadata.chunks.get(a).unwrap().sequence_number;
            let seq_b = metadata.chunks.get(b).unwrap().sequence_number;
            seq_a.cmp(&seq_b)
        });
        
        Ok(chunks)
    }
    
    /// Update access time for chunk
    fn update_access_time(&self, chunk_id: &str) -> Result<()> {
        let mut metadata = self.metadata.lock();
        if let Some(chunk_metadata) = metadata.chunks.get_mut(chunk_id) {
            chunk_metadata.last_accessed = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;
            chunk_metadata.access_count += 1;
        }
        Ok(())
    }
    
    /// Remove chunk from cache
    fn remove_chunk(&self, chunk_id: &str) -> Result<()> {
        let mut metadata = self.metadata.lock();
        
        if let Some(chunk_metadata) = metadata.chunks.remove(chunk_id) {
            // Delete file
            if Path::new(&chunk_metadata.file_path).exists() {
                fs::remove_file(&chunk_metadata.file_path)?;
            }
            
            // Update cache size
            *self.current_cache_size.lock() = self.current_cache_size.lock().saturating_sub(chunk_metadata.file_size as usize);
            
            // Update statistics
            {
                let mut stats = self.stats.lock();
                stats.total_chunks_evicted += 1;
                stats.total_bytes_evicted += chunk_metadata.file_size;
            }
            
            info!("Persistent chunk removed: {}", chunk_id);
        }
        
        Ok(())
    }
    
    /// Cleanup cache based on configuration
    fn cleanup_cache(&self) -> Result<()> {
        info!("Starting persistent cache cleanup");
        
        let metadata = self.metadata.lock();
        let config = &metadata.config;
        
        if !config.enable_smart_eviction {
            return self.simple_cleanup();
        }
        
        // Smart eviction based on multiple factors
        let mut chunks_to_remove = Vec::new();
        let mut chunks: Vec<_> = metadata.chunks.iter().collect();
        
        // Sort by eviction score (lower score = higher priority to keep)
        chunks.sort_by(|a, b| {
            let score_a = self.calculate_eviction_score(a.1);
            let score_b = self.calculate_eviction_score(b.1);
            score_a.partial_cmp(&score_b).unwrap_or(std::cmp::Ordering::Equal)
        });
        
        // Remove chunks until we're under the threshold
        let target_size = (self.max_cache_size as f64 * config.cleanup_threshold as f64) as usize;
        let mut current_size = *self.current_cache_size.lock();
        
        for (chunk_id, chunk_metadata) in chunks {
            if current_size <= target_size {
                break;
            }
            
            chunks_to_remove.push(chunk_id.clone());
            current_size = current_size.saturating_sub(chunk_metadata.file_size as usize);
        }
        
        // Remove chunks
        for chunk_id in chunks_to_remove {
            drop(metadata);
            self.remove_chunk(&chunk_id)?;
        }
        
        // Update last cleanup time
        {
            let mut metadata = self.metadata.lock();
            metadata.last_cleanup = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;
        }
        
        self.save_metadata()?;
        
        info!("Persistent cache cleanup completed");
        Ok(())
    }
    
    /// Simple cleanup (remove oldest chunks)
    fn simple_cleanup(&self) -> Result<()> {
        let mut chunks_to_remove = Vec::new();
        
        {
            let metadata = self.metadata.lock();
            let mut chunks: Vec<_> = metadata.chunks.iter().collect();
            
            // Sort by creation time (oldest first)
            chunks.sort_by(|a, b| a.1.created_at.cmp(&b.1.created_at));
            
            let target_size = (self.max_cache_size as f64 * metadata.config.cleanup_threshold as f64) as usize;
            let mut current_size = *self.current_cache_size.lock();
            
            for (chunk_id, chunk_metadata) in chunks {
                if current_size <= target_size {
                    break;
                }
                
                chunks_to_remove.push(chunk_id.clone());
                current_size = current_size.saturating_sub(chunk_metadata.file_size as usize);
            }
        }
        
        // Remove chunks
        for chunk_id in chunks_to_remove {
            self.remove_chunk(&chunk_id)?;
        }
        
        Ok(())
    }
    
    /// Calculate eviction score for a chunk
    fn calculate_eviction_score(&self, chunk: &PersistentChunkMetadata) -> f32 {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        let age = now - chunk.created_at;
        let time_since_access = now - chunk.last_accessed;
        
        // Lower score = higher priority to keep
        let mut score = 0.0;
        
        // Recent access (lower score)
        score += (time_since_access as f32 / 1000.0) * 0.3;
        
        // Age (lower score for newer chunks)
        score += (age as f32 / 1000.0) * 0.2;
        
        // Access frequency (lower score for frequently accessed)
        score += (1.0 / (chunk.access_count as f32 + 1.0)) * 0.3;
        
        // Key frames are more important (lower score)
        if chunk.is_key_frame {
            score -= 10.0;
        }
        
        // Compression ratio (lower score for better compression)
        score += (1.0 / chunk.compression_ratio) * 0.2;
        
        score
    }
    
    /// Calculate data hash for integrity checking
    fn calculate_data_hash(data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        let result = hasher.finalize();
        format!("{:x}", result)
    }
    
    /// Compress data using simple compression
    fn compress_data(&self, data: &[u8]) -> Result<Vec<u8>> {
        // Simple run-length encoding for demonstration
        let mut compressed = Vec::new();
        let mut i = 0;
        
        while i < data.len() {
            let current_byte = data[i];
            let mut count = 1;
            
            while i + count < data.len() && data[i + count] == current_byte && count < 255 {
                count += 1;
            }
            
            if count > 3 {
                compressed.push(count as u8);
                compressed.push(current_byte);
            } else {
                for _ in 0..count {
                    compressed.push(current_byte);
                }
            }
            
            i += count;
        }
        
        Ok(compressed)
    }
    
    /// Decompress data
    fn decompress_data(&self, compressed: &[u8]) -> Result<Vec<u8>> {
        let mut decompressed = Vec::new();
        let mut i = 0;
        
        while i < compressed.len() {
            let first_byte = compressed[i];
            
            if i + 1 < compressed.len() && first_byte <= 3 {
                // Run-length encoded
                let count = first_byte as usize;
                let byte = compressed[i + 1];
                
                for _ in 0..count {
                    decompressed.push(byte);
                }
                
                i += 2;
            } else {
                // Raw byte
                decompressed.push(first_byte);
                i += 1;
            }
        }
        
        Ok(decompressed)
    }
    
    /// Save metadata to file
    fn save_metadata(&self) -> Result<()> {
        let metadata = self.metadata.lock();
        let metadata_json = serde_json::to_string(&*metadata)?;
        let metadata_path = self.cache_dir.join("metadata.json");
        fs::write(metadata_path, metadata_json)?;
        Ok(())
    }
    
    /// Load metadata from file
    fn load_metadata(&self) -> Result<()> {
        let metadata_path = self.cache_dir.join("metadata.json");
        
        if metadata_path.exists() {
            let metadata_json = fs::read_to_string(metadata_path)?;
            let metadata: PersistentCacheMetadata = serde_json::from_str(&metadata_json)?;
            
            // Calculate current cache size
            let mut current_size = 0;
            for chunk_metadata in metadata.chunks.values() {
                if Path::new(&chunk_metadata.file_path).exists() {
                    current_size += chunk_metadata.file_size as usize;
                }
            }
            
            *self.metadata.lock() = metadata;
            *self.current_cache_size.lock() = current_size;
            
            info!("Loaded persistent metadata: {} chunks, {} bytes", 
                  metadata.chunks.len(), current_size);
        } else {
            info!("No existing persistent metadata found, starting fresh");
        }
        
        Ok(())
    }
    
    /// Get cache statistics
    pub fn get_stats(&self) -> PersistentCacheStats {
        let stats = self.stats.lock();
        let current_size = *self.current_cache_size.lock();
        
        PersistentCacheStats {
            cache_utilization: current_size as f32 / self.max_cache_size as f32,
            ..stats.clone()
        }
    }
    
    /// Clear entire cache
    pub fn clear_cache(&self) -> Result<()> {
        info!("Clearing entire persistent cache");
        
        let metadata = self.metadata.lock();
        let chunk_ids: Vec<String> = metadata.chunks.keys().cloned().collect();
        
        drop(metadata);
        
        for chunk_id in chunk_ids {
            self.remove_chunk(&chunk_id)?;
        }
        
        *self.current_cache_size.lock() = 0;
        
        info!("Persistent cache cleared");
        Ok(())
    }
    
    /// Get cache directory
    pub fn get_cache_directory(&self) -> &PathBuf {
        &self.cache_dir
    }
    
    /// Set cache directory
    pub fn set_cache_directory(&mut self, new_dir: PathBuf) -> Result<()> {
        info!("Setting cache directory to: {:?}", new_dir);
        
        // Create new directory if it doesn't exist
        fs::create_dir_all(&new_dir)?;
        
        // Clear current cache
        self.clear_cache()?;
        
        // Update directory
        self.cache_dir = new_dir;
        
        // Reset metadata
        {
            let mut metadata = self.metadata.lock();
            metadata.chunks.clear();
            metadata.last_cleanup = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;
        }
        
        // Save new metadata
        self.save_metadata()?;
        
        info!("Cache directory updated");
        Ok(())
    }
    
    /// Backup cache
    pub fn backup_cache(&self) -> Result<bool> {
        if !self.metadata.lock().config.enable_backup {
            return Ok(false);
        }
        
        info!("Starting cache backup");
        
        let backup_dir = self.cache_dir.join("backup");
        fs::create_dir_all(&backup_dir)?;
        
        // Copy metadata
        let metadata_path = self.cache_dir.join("metadata.json");
        let backup_metadata_path = backup_dir.join("metadata.json");
        fs::copy(metadata_path, backup_metadata_path)?;
        
        // Copy chunk files
        let metadata = self.metadata.lock();
        for chunk_metadata in metadata.chunks.values() {
            if Path::new(&chunk_metadata.file_path).exists() {
                let file_name = Path::new(&chunk_metadata.file_path)
                    .file_name()
                    .unwrap()
                    .to_str()
                    .unwrap();
                let backup_file_path = backup_dir.join(file_name);
                fs::copy(&chunk_metadata.file_path, backup_file_path)?;
            }
        }
        
        // Update statistics
        {
            let mut stats = self.stats.lock();
            stats.backup_operations += 1;
        }
        
        info!("Cache backup completed");
        Ok(true)
    }
    
    /// Restore cache from backup
    pub fn restore_cache(&self) -> Result<bool> {
        let backup_dir = self.cache_dir.join("backup");
        
        if !backup_dir.exists() {
            warn!("No backup found");
            return Ok(false);
        }
        
        info!("Starting cache restore");
        
        // Clear current cache
        self.clear_cache()?;
        
        // Restore metadata
        let backup_metadata_path = backup_dir.join("metadata.json");
        if backup_metadata_path.exists() {
            let metadata_json = fs::read_to_string(backup_metadata_path)?;
            let metadata: PersistentCacheMetadata = serde_json::from_str(&metadata_json)?;
            *self.metadata.lock() = metadata;
        }
        
        // Restore chunk files
        let metadata = self.metadata.lock();
        for chunk_metadata in metadata.chunks.values() {
            let file_name = Path::new(&chunk_metadata.file_path)
                .file_name()
                .unwrap()
                .to_str()
                .unwrap();
            let backup_file_path = backup_dir.join(file_name);
            
            if backup_file_path.exists() {
                fs::copy(backup_file_path, &chunk_metadata.file_path)?;
            }
        }
        
        // Update statistics
        {
            let mut stats = self.stats.lock();
            stats.restore_operations += 1;
        }
        
        info!("Cache restore completed");
        Ok(true)
    }
}

impl Drop for PersistentCacheManager {
    fn drop(&mut self) {
        // Save metadata on drop
        let _ = self.save_metadata();
        info!("Persistent cache manager dropped");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;
    use std::time::Duration;
    
    #[test]
    fn test_persistent_cache_manager_creation() {
        let cache = PersistentCacheManager::new();
        assert!(cache.is_ok());
    }
    
    #[test]
    fn test_persistent_chunk_storage_and_retrieval() {
        let cache = PersistentCacheManager::new().unwrap();
        let chunk_id = "test_chunk_1";
        let video_url = "https://example.com/video.mp4";
        let data = vec![1, 2, 3, 4, 5];
        
        // Store chunk
        assert!(cache.store_chunk(chunk_id, video_url, &data, true, 0).unwrap());
        
        // Retrieve chunk
        let retrieved = cache.get_chunk(chunk_id).unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap(), data);
        
        // Check if cached
        assert!(cache.is_chunk_cached(chunk_id).unwrap());
    }
    
    #[test]
    fn test_persistent_cache_miss() {
        let cache = PersistentCacheManager::new().unwrap();
        let retrieved = cache.get_chunk("non_existent").unwrap();
        assert!(retrieved.is_none());
    }
    
    #[test]
    fn test_persistent_video_chunks_retrieval() {
        let cache = PersistentCacheManager::new().unwrap();
        let video_url = "https://example.com/video.mp4";
        
        // Store multiple chunks
        for i in 0..5 {
            let chunk_id = format!("chunk_{}", i);
            let data = vec![i as u8; 100];
            cache.store_chunk(&chunk_id, video_url, &data, i == 0, i).unwrap();
        }
        
        // Get all chunks for video
        let chunks = cache.get_video_chunks(video_url).unwrap();
        assert_eq!(chunks.len(), 5);
        
        // Verify order (by sequence number)
        for (i, chunk_id) in chunks.iter().enumerate() {
            assert_eq!(chunk_id, &format!("chunk_{}", i));
        }
    }
    
    #[test]
    fn test_persistent_cache_cleanup() {
        let mut config = PersistentCacheConfig::default();
        config.max_size_mb = 1; // 1MB limit
        config.cleanup_threshold = 0.5; // Cleanup at 50%
        
        let cache = PersistentCacheManager::with_config(config).unwrap();
        
        // Store chunks until cleanup is triggered
        for i in 0..10 {
            let chunk_id = format!("chunk_{}", i);
            let data = vec![0; 100000]; // 100KB per chunk
            cache.store_chunk(&chunk_id, "https://example.com/video.mp4", &data, true, i).unwrap();
        }
        
        let stats = cache.get_stats();
        assert!(stats.total_chunks_evicted > 0);
    }
    
    #[test]
    fn test_persistent_cache_directory() {
        let cache = PersistentCacheManager::new().unwrap();
        let cache_dir = cache.get_cache_directory();
        assert!(cache_dir.exists());
        assert_eq!(cache_dir.file_name().unwrap(), "reels_cache");
    }
}
