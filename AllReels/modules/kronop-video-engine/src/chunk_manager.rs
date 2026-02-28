//! Chunk manager for handling video chunks
//! 
//! Manages incoming video chunks and their processing state

use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use parking_lot::Mutex;
use log::{info, warn, debug};
use anyhow::{Result, anyhow};
use uuid::Uuid;

/// Video chunk structure
#[derive(Debug, Clone)]
pub struct VideoChunk {
    pub id: String,
    pub data: Vec<u8>,
    pub timestamp: u64,
    pub sequence_number: u32,
    pub is_processed: bool,
    pub retry_count: u32,
}

impl VideoChunk {
    /// Create new video chunk
    pub fn new(data: Vec<u8>, sequence_number: u32) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            data,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            sequence_number,
            is_processed: false,
            retry_count: 0,
        }
    }
}

/// Chunk manager for handling video chunks
pub struct ChunkManager {
    /// Pending chunks to be processed
    pending_chunks: VecDeque<VideoChunk>,
    /// All chunks by ID
    chunks_by_id: HashMap<String, VideoChunk>,
    /// Chunks by sequence number
    chunks_by_sequence: HashMap<u32, String>,
    /// Next sequence number expected
    next_sequence: u32,
    /// Maximum chunks in memory
    max_chunks: usize,
    /// Statistics
    stats: ChunkManagerStats,
}

#[derive(Debug, Clone, Default)]
pub struct ChunkManagerStats {
    pub total_chunks: usize,
    pub processed_chunks: usize,
    pub failed_chunks: usize,
    pub current_pending: usize,
    pub average_chunk_size: f64,
}

impl ChunkManager {
    /// Create new chunk manager
    pub fn new() -> Self {
        Self::with_capacity(100)
    }
    
    /// Create new chunk manager with capacity
    pub fn with_capacity(max_chunks: usize) -> Self {
        info!("Creating chunk manager with capacity: {}", max_chunks);
        
        Self {
            pending_chunks: VecDeque::with_capacity(max_chunks),
            chunks_by_id: HashMap::with_capacity(max_chunks),
            chunks_by_sequence: HashMap::with_capacity(max_chunks),
            next_sequence: 0,
            max_chunks,
            stats: ChunkManagerStats::default(),
        }
    }
    
    /// Add a new chunk
    pub fn add_chunk(&mut self, chunk_id: &str, data: &[u8]) -> Result<()> {
        debug!("Adding chunk: {} (size: {} bytes)", chunk_id, data.len());
        
        // Check if we're at capacity
        if self.chunks_by_id.len() >= self.max_chunks {
            self.cleanup_old_chunks()?;
        }
        
        let chunk = VideoChunk::new(data.to_vec(), self.next_sequence);
        self.next_sequence += 1;
        
        // Store chunk
        self.chunks_by_id.insert(chunk.id.clone(), chunk.clone());
        self.chunks_by_sequence.insert(chunk.sequence_number, chunk.id.clone());
        self.pending_chunks.push_back(chunk);
        
        // Update statistics
        self.stats.total_chunks += 1;
        self.stats.current_pending = self.pending_chunks.len();
        self.update_average_chunk_size(data.len());
        
        info!("Added chunk: {} (sequence: {})", chunk_id, chunk.sequence_number);
        Ok(())
    }
    
    /// Get next chunk to process
    pub fn get_next_chunk(&mut self) -> Option<(String, Vec<u8>)> {
        while let Some(chunk) = self.pending_chunks.front() {
            if !chunk.is_processed {
                let chunk_data = chunk.data.clone();
                let chunk_id = chunk.id.clone();
                debug!("Getting next chunk: {}", chunk_id);
                return Some((chunk_id, chunk_data));
            } else {
                // Remove processed chunk
                let chunk = self.pending_chunks.pop_front().unwrap();
                self.chunks_by_id.remove(&chunk.id);
                self.chunks_by_sequence.remove(&chunk.sequence_number);
                self.stats.current_pending = self.pending_chunks.len();
            }
        }
        
        None
    }
    
    /// Mark chunk as processed
    pub fn mark_processed(&mut self, chunk_id: &str) {
        if let Some(chunk) = self.chunks_by_id.get_mut(chunk_id) {
            chunk.is_processed = true;
            self.stats.processed_chunks += 1;
            debug!("Marked chunk as processed: {}", chunk_id);
        }
    }
    
    /// Mark chunk as failed
    pub fn mark_failed(&mut self, chunk_id: &str, retry: bool) -> Result<()> {
        if let Some(chunk) = self.chunks_by_id.get_mut(chunk_id) {
            chunk.retry_count += 1;
            
            if retry && chunk.retry_count < 3 {
                // Re-queue for retry
                warn!("Retrying chunk: {} (attempt {})", chunk_id, chunk.retry_count);
                // In a real implementation, you might want to move it to the front
            } else {
                // Mark as permanently failed
                chunk.is_processed = true;
                self.stats.failed_chunks += 1;
                warn!("Chunk failed permanently: {}", chunk_id);
            }
        }
        
        Ok(())
    }
    
    /// Get chunk by ID
    pub fn get_chunk(&self, chunk_id: &str) -> Option<&VideoChunk> {
        self.chunks_by_id.get(chunk_id)
    }
    
    /// Get chunk by sequence number
    pub fn get_chunk_by_sequence(&self, sequence: u32) -> Option<&VideoChunk> {
        if let Some(chunk_id) = self.chunks_by_sequence.get(&sequence) {
            self.chunks_by_id.get(chunk_id)
        } else {
            None
        }
    }
    
    /// Get processed chunks count
    pub fn get_processed_count(&self) -> usize {
        self.stats.processed_chunks
    }
    
    /// Get pending chunks count
    pub fn get_pending_count(&self) -> usize {
        self.pending_chunks.len()
    }
    
    /// Get statistics
    pub fn get_stats(&self) -> ChunkManagerStats {
        self.stats.clone()
    }
    
    /// Clear all chunks
    pub fn clear(&mut self) {
        info!("Clearing all chunks");
        self.pending_chunks.clear();
        self.chunks_by_id.clear();
        self.chunks_by_sequence.clear();
        self.stats = ChunkManagerStats::default();
    }
    
    /// Cleanup old chunks to free memory
    fn cleanup_old_chunks(&mut self) -> Result<()> {
        debug!("Cleaning up old chunks");
        
        // Remove oldest processed chunks
        let mut to_remove = Vec::new();
        
        for (chunk_id, chunk) in &self.chunks_by_id {
            if chunk.is_processed && to_remove.len() < self.max_chunks / 4 {
                to_remove.push(chunk_id.clone());
            }
        }
        
        for chunk_id in to_remove {
            if let Some(chunk) = self.chunks_by_id.remove(&chunk_id) {
                self.chunks_by_sequence.remove(&chunk.sequence_number);
                // Remove from pending if it's there
                self.pending_chunks.retain(|c| c.id != chunk.id);
            }
        }
        
        self.stats.current_pending = self.pending_chunks.len();
        Ok(())
    }
    
    /// Update average chunk size
    fn update_average_chunk_size(&mut self, chunk_size: usize) {
        let total_size = self.stats.average_chunk_size * (self.stats.total_chunks - 1) as f64;
        self.stats.average_chunk_size = (total_size + chunk_size as f64) / self.stats.total_chunks as f64;
    }
    
    /// Get memory usage in bytes
    pub fn get_memory_usage(&self) -> usize {
        self.chunks_by_id.values()
            .map(|chunk| chunk.data.len())
            .sum()
    }
    
    /// Check if sequence is complete (all chunks up to sequence are processed)
    pub fn is_sequence_complete(&self, sequence: u32) -> bool {
        for seq in 0..sequence {
            if let Some(chunk_id) = self.chunks_by_sequence.get(&seq) {
                if let Some(chunk) = self.chunks_by_id.get(chunk_id) {
                    if !chunk.is_processed {
                        return false;
                    }
                }
            } else {
                return false;
            }
        }
        true
    }
    
    /// Get missing chunks in sequence
    pub fn get_missing_chunks(&self, up_to_sequence: u32) -> Vec<u32> {
        let mut missing = Vec::new();
        
        for seq in 0..up_to_sequence {
            if !self.chunks_by_sequence.contains_key(&seq) {
                missing.push(seq);
            }
        }
        
        missing
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_chunk_manager_creation() {
        let manager = ChunkManager::new();
        assert_eq!(manager.get_processed_count(), 0);
        assert_eq!(manager.get_pending_count(), 0);
    }
    
    #[test]
    fn test_add_chunk() {
        let mut manager = ChunkManager::new();
        let data = vec![1, 2, 3, 4, 5];
        
        assert!(manager.add_chunk("test1", &data).is_ok());
        assert_eq!(manager.get_pending_count(), 1);
    }
    
    #[test]
    fn test_get_next_chunk() {
        let mut manager = ChunkManager::new();
        let data = vec![1, 2, 3, 4, 5];
        
        manager.add_chunk("test1", &data).unwrap();
        
        let (chunk_id, chunk_data) = manager.get_next_chunk().unwrap();
        assert_eq!(chunk_data, data);
        
        // After getting chunk, it should still be pending
        assert_eq!(manager.get_pending_count(), 1);
    }
    
    #[test]
    fn test_mark_processed() {
        let mut manager = ChunkManager::new();
        let data = vec![1, 2, 3, 4, 5];
        
        manager.add_chunk("test1", &data).unwrap();
        let (chunk_id, _) = manager.get_next_chunk().unwrap();
        
        manager.mark_processed(&chunk_id);
        assert_eq!(manager.get_processed_count(), 1);
    }
}
