//! High-Performance Frame Buffer
//! Circular buffer for video frames with zero-copy access

use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use crate::memory_pool::MemoryPool;
use crate::video_decoder::DecodedFrame;

pub struct FrameBuffer {
    frames: VecDeque<BufferedFrame>,
    max_frames: usize,
    memory_pool: Arc<Mutex<MemoryPool>>,
    frame_ids: Vec<u64>,
    write_index: usize,
    read_index: usize,
    total_frames_written: u64,
    total_frames_read: u64,
    dropped_frames: u64,
}

#[derive(Debug, Clone)]
pub struct BufferedFrame {
    pub id: u64,
    pub frame: DecodedFrame,
    pub memory_block_id: u64,
    pub timestamp: std::time::Instant,
    pub is_ready: bool,
    pub reference_count: u32,
}

#[derive(Debug, Clone)]
pub struct FrameBufferStats {
    pub max_frames: usize,
    pub current_frames: usize,
    pub total_written: u64,
    pub total_read: u64,
    pub dropped_frames: u64,
    pub buffer_utilization: f64,
    pub avg_frame_time: f64,
}

impl FrameBuffer {
    /// Create new frame buffer
    pub fn new(max_frames: usize) -> Result<Self, Box<dyn std::error::Error>> {
        let memory_pool = Arc::new(Mutex::new(MemoryPool::new(max_frames * 2 * 1024 * 1024)?)); // 2MB per frame
        
        println!("🎬 FrameBuffer created: {} frames, {}MB pool", 
                 max_frames, (max_frames * 2));
        
        Ok(Self {
            frames: VecDeque::with_capacity(max_frames),
            max_frames,
            memory_pool,
            frame_ids: Vec::with_capacity(max_frames),
            write_index: 0,
            read_index: 0,
            total_frames_written: 0,
            total_frames_read: 0,
            dropped_frames: 0,
        })
    }
    
    /// Add frame to buffer
    pub fn add_frame(&mut self, frame: DecodedFrame) -> Result<u64, Box<dyn std::error::Error>> {
        // Check if buffer is full
        if self.frames.len() >= self.max_frames {
            // Remove oldest frame
            if let Some(old_frame) = self.frames.pop_front() {
                self.dropped_frames += 1;
                
                // Release memory block
                let _ = self.memory_pool.lock().unwrap().deallocate(old_frame.memory_block_id);
                
                // Remove from frame IDs
                if let Some(pos) = self.frame_ids.iter().position(|&id| id == old_frame.id) {
                    self.frame_ids.remove(pos);
                }
            }
        }
        
        // Allocate memory for frame
        let frame_size = frame.data.len();
        let memory_block_id = self.memory_pool.lock().unwrap()
            .allocate(frame_size, &format!("frame_{}", self.total_frames_written))?;
        
        // Copy frame data to memory pool
        let frame_ptr = self.memory_pool.lock().unwrap()
            .get_ptr(memory_block_id)
            .ok_or("Failed to get memory pointer")?;
        
        unsafe {
            std::ptr::copy_nonoverlapping(frame.data.as_ptr(), frame_ptr, frame_size);
        }
        
        // Create buffered frame
        let frame_id = self.generate_frame_id();
        let buffered_frame = BufferedFrame {
            id: frame_id,
            frame: DecodedFrame {
                data: vec![], // Data is now in memory pool
                width: frame.width,
                height: frame.height,
                timestamp: frame.timestamp,
                is_keyframe: frame.is_keyframe,
                quality: frame.quality,
            },
            memory_block_id,
            timestamp: std::time::Instant::now(),
            is_ready: true,
            reference_count: 1,
        };
        
        // Add to buffer
        self.frames.push_back(buffered_frame);
        self.frame_ids.push(frame_id);
        self.write_index = (self.write_index + 1) % self.max_frames;
        self.total_frames_written += 1;
        
        Ok(frame_id)
    }
    
    /// Get next frame for reading
    pub fn get_next_frame(&mut self) -> Option<BufferedFrame> {
        if let Some(frame) = self.frames.get(self.read_index) {
            self.read_index = (self.read_index + 1) % self.frames.len();
            self.total_frames_read += 1;
            
            // Increment reference count
            let mut frame_clone = frame.clone();
            frame_clone.reference_count += 1;
            
            Some(frame_clone)
        } else {
            None
        }
    }
    
    /// Get frame by ID
    pub fn get_frame_by_id(&self, frame_id: u64) -> Option<&BufferedFrame> {
        self.frames.iter().find(|f| f.id == frame_id)
    }
    
    /// Get frame data from memory pool
    pub fn get_frame_data(&self, frame_id: u64) -> Option<Vec<u8>> {
        if let Some(frame) = self.get_frame_by_id(frame_id) {
            let frame_ptr = self.memory_pool.lock().unwrap()
                .get_ptr(frame.memory_block_id)?;
            
            let frame_size = frame.frame.width * frame.frame.height * 3; // RGB
            
            let mut data = vec![0u8; frame_size as usize];
            unsafe {
                std::ptr::copy_nonoverlapping(frame_ptr, data.as_mut_ptr(), frame_size as usize);
            }
            
            Some(data)
        } else {
            None
        }
    }
    
    /// Release frame reference
    pub fn release_frame(&mut self, frame_id: u64) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(frame) = self.frames.iter_mut().find(|f| f.id == frame_id) {
            frame.reference_count = frame.reference_count.saturating_sub(1);
            
            // If no more references, we can remove the frame
            if frame.reference_count == 0 {
                // Remove from buffer
                let pos = self.frames.iter().position(|f| f.id == frame_id);
                if let Some(pos) = pos {
                    let removed_frame = self.frames.remove(pos);
                    
                    // Release memory block
                    let _ = self.memory_pool.lock().unwrap()
                        .deallocate(removed_frame.memory_block_id);
                    
                    // Remove from frame IDs
                    let id_pos = self.frame_ids.iter().position(|&id| id == frame_id);
                    if let Some(id_pos) = id_pos {
                        self.frame_ids.remove(id_pos);
                    }
                }
            }
        }
        
        Ok(())
    }
    
    /// Get frame count in buffer
    pub fn frame_count(&self) -> usize {
        self.frames.len()
    }
    
    /// Check if buffer is empty
    pub fn is_empty(&self) -> bool {
        self.frames.is_empty()
    }
    
    /// Check if buffer is full
    pub fn is_full(&self) -> bool {
        self.frames.len() >= self.max_frames
    }
    
    /// Clear all frames
    pub fn clear(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        // Release all memory blocks
        for frame in &self.frames {
            let _ = self.memory_pool.lock().unwrap().deallocate(frame.memory_block_id);
        }
        
        self.frames.clear();
        self.frame_ids.clear();
        self.read_index = 0;
        self.write_index = 0;
        
        println!("🧹 FrameBuffer cleared");
        Ok(())
    }
    
    /// Get buffer statistics
    pub fn get_stats(&self) -> FrameBufferStats {
        let buffer_utilization = if self.max_frames > 0 {
            self.frames.len() as f64 / self.max_frames as f64
        } else {
            0.0
        };
        
        let avg_frame_time = if self.total_frames_written > 0 {
            // Calculate average time between frames
            let mut total_time = std::time::Duration::ZERO;
            let mut prev_timestamp = None;
            
            for frame in &self.frames {
                if let Some(prev) = prev_timestamp {
                    total_time += frame.timestamp.duration_since(prev);
                }
                prev_timestamp = Some(frame.timestamp);
            }
            
            if self.frames.len() > 1 {
                total_time.as_secs_f64() / (self.frames.len() - 1) as f64
            } else {
                0.0
            }
        } else {
            0.0
        };
        
        FrameBufferStats {
            max_frames: self.max_frames,
            current_frames: self.frames.len(),
            total_written: self.total_frames_written,
            total_read: self.total_frames_read,
            dropped_frames: self.dropped_frames,
            buffer_utilization,
            avg_frame_time,
        }
    }
    
    /// Pre-allocate frames for instant start
    pub fn preallocate_frames(&mut self, count: usize, width: u32, height: u32) -> Result<Vec<u64>, Box<dyn std::error::Error>> {
        let mut frame_ids = Vec::new();
        let frame_size = (width * height * 3) as usize; // RGB
        
        for i in 0..count {
            let memory_block_id = self.memory_pool.lock().unwrap()
                .allocate(frame_size, &format!("prealloc_frame_{}", i))?;
            
            // Create dummy frame
            let dummy_frame = DecodedFrame {
                data: vec![0; frame_size],
                width,
                height,
                timestamp: i as f64 / 30.0, // 30fps
                is_keyframe: i == 0,
                quality: crate::video_decoder::FrameQuality::High,
            };
            
            let frame_id = self.generate_frame_id();
            let buffered_frame = BufferedFrame {
                id: frame_id,
                frame: dummy_frame,
                memory_block_id,
                timestamp: std::time::Instant::now(),
                is_ready: true,
                reference_count: 1,
            };
            
            self.frames.push_back(buffered_frame);
            self.frame_ids.push(frame_id);
            frame_ids.push(frame_id);
        }
        
        println!("🎬 Pre-allocated {} frames ({}x{})", count, width, height);
        Ok(frame_ids)
    }
    
    /// Generate unique frame ID
    fn generate_frame_id(&self) -> u64 {
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(1);
        COUNTER.fetch_add(1, Ordering::Relaxed)
    }
    
    /// Get memory pool statistics
    pub fn get_memory_stats(&self) -> crate::memory_pool::MemoryStats {
        self.memory_pool.lock().unwrap().get_stats()
    }
}

impl Drop for FrameBuffer {
    fn drop(&mut self) {
        // Clear all frames
        let _ = self.clear();
        
        println!("🗑️ FrameBuffer cleaned up");
    }
}
