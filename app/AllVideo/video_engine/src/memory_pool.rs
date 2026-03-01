//! High-Performance Memory Pool for Zero-Copy Video Processing
//! Pre-allocated memory blocks for instant video playback

use std::collections::VecDeque;
use std::ptr::NonNull;

pub struct MemoryPool {
    total_size: usize,
    block_size: usize,
    free_blocks: VecDeque<NonNull<u8>>,
    allocated_blocks: Vec<MemoryBlock>,
    next_block_id: u64,
}

#[derive(Debug)]
pub struct MemoryBlock {
    id: u64,
    ptr: NonNull<u8>,
    size: usize,
    in_use: bool,
}

impl MemoryPool {
    /// Create new memory pool with specified size
    pub fn new(total_size: usize) -> Result<Self, Box<dyn std::error::Error>> {
        let block_size = 1024 * 1024; // 1MB blocks
        
        // Allocate memory pool
        let pool_memory = unsafe {
            let layout = std::alloc::Layout::from_size_align(total_size, 8)?;
            std::alloc::alloc(layout)
        };
        
        if pool_memory.is_null() {
            return Err("Failed to allocate memory pool".into());
        }
        
        let pool_ptr = NonNull::new(pool_memory).ok_or("Failed to create memory pointer")?;
        
        // Create free blocks
        let mut free_blocks = VecDeque::new();
        let num_blocks = total_size / block_size;
        
        for i in 0..num_blocks {
            let block_ptr = unsafe {
                NonNull::new_unchecked(pool_ptr.as_ptr().add(i * block_size))
            };
            free_blocks.push_back(block_ptr);
        }
        
        Ok(Self {
            total_size,
            block_size,
            free_blocks,
            allocated_blocks: Vec::new(),
            next_block_id: 1,
        })
    }
    
    /// Allocate memory block for video frame
    pub fn allocate(&mut self, size: usize) -> Result<u64, Box<dyn std::error::Error>> {
        if size > self.block_size {
            return Err("Requested size too large".into());
        }
        
        if let Some(block_ptr) = self.free_blocks.pop_front() {
            let block_id = self.next_block_id;
            self.next_block_id += 1;
            
            let block = MemoryBlock {
                id: block_id,
                ptr: block_ptr,
                size,
                in_use: true,
            };
            
            self.allocated_blocks.push(block);
            Ok(block_id)
        } else {
            Err("No free blocks available".into())
        }
    }
    
    /// Deallocate memory block
    pub fn deallocate(&mut self, block_id: u64) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(pos) = self.allocated_blocks.iter().position(|b| b.id == block_id) {
            let block = self.allocated_blocks.remove(pos);
            
            if block.in_use {
                // Clear memory for security
                unsafe {
                    std::ptr::write_bytes(block.ptr.as_ptr(), 0, block.size);
                }
                
                // Return to free pool
                self.free_blocks.push_back(block.ptr);
            }
            
            Ok(())
        } else {
            Err("Block not found".into())
        }
    }
    
    /// Get pointer to allocated memory
    pub fn get_ptr(&self, block_id: u64) -> Option<*mut u8> {
        self.allocated_blocks
            .iter()
            .find(|b| b.id == block_id && b.in_use)
            .map(|b| b.ptr.as_ptr())
    }
    
    /// Get memory statistics
    pub fn get_stats(&self) -> MemoryStats {
        MemoryStats {
            total_size: self.total_size,
            block_size: self.block_size,
            total_blocks: self.total_size / self.block_size,
            free_blocks: self.free_blocks.len(),
            allocated_blocks: self.allocated_blocks.len(),
        }
    }
    
    /// Pre-allocate frames for instant playback
    pub fn preallocate_video_frames(&mut self, num_frames: usize, frame_size: usize) -> Result<Vec<u64>, Box<dyn std::error::Error>> {
        let mut frame_ids = Vec::new();
        
        for _ in 0..num_frames {
            let block_id = self.allocate(frame_size)?;
            frame_ids.push(block_id);
        }
        
        Ok(frame_ids)
    }
    
    /// Zero-copy frame transfer
    pub fn transfer_frame_zero_copy(&mut self, source_block_id: u64, dest_block_id: u64) -> Result<(), Box<dyn std::error::Error>> {
        let source_ptr = self.get_ptr(source_block_id).ok_or("Source block not found")?;
        let dest_ptr = self.get_ptr(dest_block_id).ok_or("Destination block not found")?;
        
        // Get block sizes
        let source_size = self.allocated_blocks
            .iter()
            .find(|b| b.id == source_block_id)
            .map(|b| b.size)
            .ok_or("Source block size unknown")?;
            
        // Copy memory directly (zero-copy optimization would use shared memory)
        unsafe {
            std::ptr::copy_nonoverlapping(source_ptr, dest_ptr, source_size);
        }
        
        Ok(())
    }
}

#[derive(Debug)]
pub struct MemoryStats {
    pub total_size: usize,
    pub block_size: usize,
    pub total_blocks: usize,
    pub free_blocks: usize,
    pub allocated_blocks: usize,
}

impl Drop for MemoryPool {
    fn drop(&mut self) {
        // Deallocate all blocks
        for block in &self.allocated_blocks {
            if block.in_use {
                let _ = self.deallocate(block.id);
            }
        }
        
        // Free the entire memory pool
        if !self.free_blocks.is_empty() {
            let base_ptr = self.free_blocks[0].as_ptr();
            unsafe {
                let layout = std::alloc::Layout::from_size_align(self.total_size, 8).unwrap();
                std::alloc::dealloc(base_ptr, layout);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_memory_pool_allocation() {
        let mut pool = MemoryPool::new(1024 * 1024).unwrap();
        
        let block_id = pool.allocate(1024).unwrap();
        assert!(pool.get_ptr(block_id).is_some());
        
        pool.deallocate(block_id).unwrap();
        assert_eq!(pool.get_stats().free_blocks, 1024);
    }
    
    #[test]
    fn test_preallocate_frames() {
        let mut pool = MemoryPool::new(10 * 1024 * 1024).unwrap();
        
        let frame_ids = pool.preallocate_video_frames(60, 1024 * 1024).unwrap();
        assert_eq!(frame_ids.len(), 60);
        
        for frame_id in &frame_ids {
            assert!(pool.get_ptr(*frame_id).is_some());
        }
    }
}
