//! High-Performance Memory Pool
//! Pre-allocated memory blocks for zero-copy video processing

use std::collections::VecDeque;
use std::ptr::NonNull;
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};

pub struct MemoryPool {
    total_size: usize,
    block_size: usize,
    free_blocks: VecDeque<MemoryBlock>,
    allocated_blocks: Vec<MemoryBlock>,
    next_block_id: u64,
    allocation_count: AtomicU64,
    deallocation_count: AtomicU64,
}

#[derive(Debug, Clone)]
pub struct MemoryBlock {
    pub id: u64,
    pub ptr: NonNull<u8>,
    pub size: usize,
    pub is_free: bool,
    pub allocated_at: Option<std::time::Instant>,
    pub tag: String,
}

#[derive(Debug, Clone)]
pub struct MemoryStats {
    pub total_size: usize,
    pub block_size: usize,
    pub total_blocks: usize,
    pub free_blocks: usize,
    pub allocated_blocks: usize,
    pub allocation_count: u64,
    pub deallocation_count: u64,
    pub fragmentation_ratio: f64,
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
            free_blocks.push_back(MemoryBlock {
                id: i as u64,
                ptr: block_ptr,
                size: block_size,
                is_free: true,
                allocated_at: None,
                tag: String::new(),
            });
        }
        
        println!("💾 MemoryPool created: {}MB ({} blocks of {}KB)", 
                 total_size / (1024 * 1024), num_blocks, block_size / 1024);
        
        Ok(Self {
            total_size,
            block_size,
            free_blocks,
            allocated_blocks: Vec::new(),
            next_block_id: num_blocks as u64,
            allocation_count: AtomicU64::new(0),
            deallocation_count: AtomicU64::new(0),
        })
    }
    
    /// Allocate memory block
    pub fn allocate(&mut self, size: usize, tag: &str) -> Result<u64, Box<dyn std::error::Error>> {
        if size > self.block_size {
            return Err("Requested size too large".into());
        }
        
        if let Some(mut block) = self.free_blocks.pop_front() {
            block.is_free = false;
            block.allocated_at = Some(std::time::Instant::now());
            block.tag = tag.to_string();
            
            let block_id = block.id;
            self.allocated_blocks.push(block);
            self.allocation_count.fetch_add(1, Ordering::Relaxed);
            
            // Clear memory for security
            unsafe {
                std::ptr::write_bytes(block.ptr.as_ptr(), 0, size);
            }
            
            Ok(block_id)
        } else {
            Err("No free blocks available".into())
        }
    }
    
    /// Deallocate memory block
    pub fn deallocate(&mut self, block_id: u64) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(pos) = self.allocated_blocks.iter().position(|b| b.id == block_id) {
            let mut block = self.allocated_blocks.remove(pos);
            
            if !block.is_free {
                // Clear memory for security
                unsafe {
                    std::ptr::write_bytes(block.ptr.as_ptr(), 0, block.size);
                }
                
                block.is_free = true;
                block.allocated_at = None;
                block.tag.clear();
                
                self.free_blocks.push_back(block);
                self.deallocation_count.fetch_add(1, Ordering::Relaxed);
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
            .find(|b| b.id == block_id && !b.is_free)
            .map(|b| b.ptr.as_ptr())
    }
    
    /// Get memory block information
    pub fn get_block(&self, block_id: u64) -> Option<&MemoryBlock> {
        self.allocated_blocks
            .iter()
            .find(|b| b.id == block_id && !b.is_free)
    }
    
    /// Pre-allocate video frames
    pub fn preallocate_video_frames(&mut self, num_frames: usize, frame_size: usize, tag: &str) -> Result<Vec<u64>, Box<dyn std::error::Error>> {
        let mut frame_ids = Vec::new();
        
        for i in 0..num_frames {
            let block_id = self.allocate(frame_size, &format!("{}_frame_{}", tag, i))?;
            frame_ids.push(block_id);
        }
        
        println!("🎬 Pre-allocated {} video frames ({}KB each)", num_frames, frame_size / 1024);
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
    
    /// Get memory statistics
    pub fn get_stats(&self) -> MemoryStats {
        let allocation_count = self.allocation_count.load(Ordering::Relaxed);
        let deallocation_count = self.deallocation_count.load(Ordering::Relaxed);
        
        // Calculate fragmentation ratio
        let fragmentation_ratio = if self.free_blocks.len() > 0 {
            let largest_free = self.free_blocks.iter().map(|b| b.size).max().unwrap_or(0);
            let total_free = self.free_blocks.iter().map(|b| b.size).sum::<usize>();
            if total_free > 0 {
                1.0 - (largest_free as f64 / total_free as f64)
            } else {
                0.0
            }
        } else {
            0.0
        };
        
        MemoryStats {
            total_size: self.total_size,
            block_size: self.block_size,
            total_blocks: self.total_size / self.block_size,
            free_blocks: self.free_blocks.len(),
            allocated_blocks: self.allocated_blocks.len(),
            allocation_count,
            deallocation_count,
            fragmentation_ratio,
        }
    }
    
    /// Defragment memory pool
    pub fn defragment(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("🧹 Defragmenting memory pool...");
        
        // Sort free blocks by address
        self.free_blocks.sort_by_key(|b| b.ptr.as_ptr() as usize);
        
        // Merge adjacent free blocks
        let mut merged_blocks = VecDeque::new();
        let mut current_block = None;
        
        for block in self.free_blocks.drain(..) {
            if let Some(mut current) = current_block.take() {
                // Check if blocks are adjacent
                let current_end = current.ptr.as_ptr() as usize + current.size;
                let next_start = block.ptr.as_ptr() as usize;
                
                if current_end == next_start {
                    // Merge blocks
                    current.size += block.size;
                    current_block = Some(current);
                } else {
                    merged_blocks.push_back(current);
                    current_block = Some(block);
                }
            } else {
                current_block = Some(block);
            }
        }
        
        if let Some(block) = current_block {
            merged_blocks.push_back(block);
        }
        
        self.free_blocks = merged_blocks;
        
        println!("✅ Memory pool defragmented");
        Ok(())
    }
    
    /// Cleanup old allocations
    pub fn cleanup_old_allocations(&mut self, max_age: std::time::Duration) -> Result<usize, Box<dyn std::error::Error>> {
        let now = std::time::Instant::now();
        let mut cleaned_count = 0;
        
        self.allocated_blocks.retain(|block| {
            if let Some(allocated_at) = block.allocated_at {
                if now.duration_since(allocated_at) > max_age {
                    // This block is old, deallocate it
                    let block_id = block.id;
                    let _ = self.deallocate(block_id);
                    cleaned_count += 1;
                    false
                } else {
                    true
                }
            } else {
                true
            }
        });
        
        if cleaned_count > 0 {
            println!("🧹 Cleaned up {} old allocations", cleaned_count);
        }
        
        Ok(cleaned_count)
    }
}

impl Drop for MemoryPool {
    fn drop(&mut self) {
        // Deallocate all blocks
        for block in &self.allocated_blocks {
            if !block.is_free {
                let _ = self.deallocate(block.id);
            }
        }
        
        // Free the entire memory pool
        if !self.free_blocks.is_empty() {
            let base_ptr = self.free_blocks[0].ptr.as_ptr();
            unsafe {
                let layout = std::alloc::Layout::from_size_align(self.total_size, 8).unwrap();
                std::alloc::dealloc(base_ptr, layout);
            }
        }
        
        println!("💾 MemoryPool cleaned up");
    }
}
