//! Frame buffer for managing decoded video frames
//! 
//! Provides circular buffer with pre-decoding for smooth video playback

use std::collections::VecDeque;
use std::sync::Arc;
use parking_lot::Mutex;
use log::{info, warn, debug, error};
use anyhow::{Result, anyhow};
use crate::decoder::DecodedFrame;

/// Frame buffer for managing decoded frames with pre-decoding
pub struct FrameBuffer {
    /// Circular buffer of frames
    frames: VecDeque<BufferedFrame>,
    /// Maximum number of frames to store
    max_frames: usize,
    /// Target FPS
    target_fps: u32,
    /// Minimum frames to keep pre-decoded
    min_predecoded_frames: usize,
    /// Current frame index
    current_frame_index: usize,
    /// Total frames processed
    total_frames_processed: usize,
    /// Dropped frames count
    dropped_frames: usize,
    /// Last frame timestamp
    last_frame_timestamp: u64,
    /// Pre-decoding thread handle
    predecode_thread: Option<std::thread::JoinHandle<()>>,
    /// Stop signal for pre-decoding thread
    stop_predecode: Arc<Mutex<bool>>,
    /// Pre-decoding queue
    predecode_queue: Arc<Mutex<VecDeque<PredecodeTask>>>,
}

/// Buffered frame with metadata
#[derive(Debug, Clone)]
pub struct BufferedFrame {
    pub frame: DecodedFrame,
    pub buffer_index: usize,
    pub added_timestamp: u64,
    pub is_consumed: bool,
    pub is_predecoded: bool,
}

/// Pre-decoding task
#[derive(Debug, Clone)]
pub struct PredecodeTask {
    pub chunk_id: String,
    pub chunk_data: Vec<u8>,
    pub priority: PredecodePriority,
    pub timestamp: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub enum PredecodePriority {
    High,    // Key frames, first frames
    Medium,  // Regular frames
    Low,     // Background frames
}

impl FrameBuffer {
    /// Create new frame buffer with pre-decoding
    pub fn new(target_fps: u32) -> Result<Self> {
        Self::with_capacity_and_predecode(target_fps * 2, target_fps, 10)
    }
    
    /// Create new frame buffer with custom capacity and pre-decoding
    pub fn with_capacity_and_predecode(
        max_frames: usize, 
        target_fps: u32, 
        min_predecoded_frames: usize
    ) -> Result<Self> {
        info!("Creating frame buffer with capacity: {} frames, target FPS: {}, min predecoded: {}", 
              max_frames, target_fps, min_predecoded_frames);
        
        let stop_predecode = Arc::new(Mutex::new(false));
        let predecode_queue = Arc::new(Mutex::new(VecDeque::new()));
        
        let buffer = Self {
            frames: VecDeque::with_capacity(max_frames),
            max_frames,
            target_fps,
            min_predecoded_frames,
            current_frame_index: 0,
            total_frames_processed: 0,
            dropped_frames: 0,
            last_frame_timestamp: 0,
            predecode_thread: None,
            stop_predecode,
            predecode_queue,
        };
        
        // Start pre-decoding thread
        buffer.start_predecode_thread();
        
        Ok(buffer)
    }
    
    /// Start pre-decoding thread
    fn start_predecode_thread(&mut self) {
        let stop_signal = Arc::clone(&self.stop_predecode);
        let queue = Arc::clone(&self.predecode_queue);
        
        let thread = std::thread::spawn(move || {
            Self::predecode_worker(stop_signal, queue);
        });
        
        self.predecode_thread = Some(thread);
        info!("Pre-decoding thread started");
    }
    
    /// Pre-decoding worker thread
    fn predecode_worker(
        stop_signal: Arc<Mutex<bool>>,
        queue: Arc<Mutex<VecDeque<PredecodeTask>>>,
    ) {
        info!("Pre-decoding worker started");
        
        loop {
            // Check stop signal
            if *stop_signal.lock() {
                info!("Pre-decoding worker stopping");
                break;
            }
            
            // Get next task
            let task = {
                let mut q = queue.lock();
                q.pop_front()
            };
            
            if let Some(task) = task {
                debug!("Processing pre-decode task: {} (priority: {:?})", task.chunk_id, task.priority);
                
                // Simulate pre-decoding (in real implementation, this would decode the chunk)
                let predecoded_frames = Self::simulate_predecode(&task);
                
                // Add predecoded frames to buffer (this would be done via callback)
                for frame in predecoded_frames {
                    debug!("Pre-decoded frame: {}x{} at {}", frame.width, frame.height, frame.timestamp);
                }
                
                // Small delay to prevent CPU spinning
                std::thread::sleep(std::time::Duration::from_millis(1));
            } else {
                // No tasks, wait a bit
                std::thread::sleep(std::time::Duration::from_millis(10));
            }
        }
    }
    
    /// Simulate pre-decoding of a chunk
    fn simulate_predecode(task: &PredecodeTask) -> Vec<DecodedFrame> {
        let mut frames = Vec::new();
        let frame_count = (task.chunk_data.len() / 1024).min(5); // Estimate frames
        
        for i in 0..frame_count {
            let frame = DecodedFrame {
                data: create_test_frame_data(i, task.timestamp),
                width: 1080,
                height: 1920,
                timestamp: task.timestamp + (i as u64 * 16667), // ~60 FPS
                is_key_frame: i == 0,
                format: crate::decoder::OutputFormat::RGB24,
            };
            frames.push(frame);
        }
        
        frames
    }
    
    /// Add pre-decoding task
    pub fn add_predecode_task(&self, chunk_id: String, chunk_data: Vec<u8>, priority: PredecodePriority) {
        let task = PredecodeTask {
            chunk_id,
            chunk_data,
            priority,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
        };
        
        let mut queue = self.predecode_queue.lock();
        
        // Insert task based on priority
        match priority {
            PredecodePriority::High => queue.push_front(task),
            PredecodePriority::Medium => {
                // Insert after high priority tasks
                let mut pos = 0;
                for (i, existing_task) in queue.iter().enumerate() {
                    if existing_task.priority == PredecodePriority::Low {
                        pos = i;
                        break;
                    }
                    pos += 1;
                }
                queue.insert(pos, task);
            }
            PredecodePriority::Low => queue.push_back(task),
        }
        
        debug!("Added pre-decode task: {} (priority: {:?})", task.chunk_id, priority);
    }
    
    /// Add a frame to the buffer
    pub fn add_frame(&mut self, frame: DecodedFrame) -> Result<()> {
        debug!("Adding frame (timestamp: {}, size: {} bytes)", frame.timestamp, frame.data.len());
        
        // Check if buffer is full
        if self.frames.len() >= self.max_frames {
            self.drop_oldest_frame()?;
        }
        
        let buffered_frame = BufferedFrame {
            buffer_index: self.current_frame_index,
            added_timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            is_consumed: false,
            is_predecoded: false,
            frame,
        };
        
        self.frames.push_back(buffered_frame);
        self.current_frame_index = (self.current_frame_index + 1) % self.max_frames;
        self.total_frames_processed += 1;
        self.last_frame_timestamp = buffered_frame.frame.timestamp;
        
        debug!("Frame added to buffer (total frames: {})", self.frames.len());
        Ok(())
    }
    
    /// Get next frame for display
    pub fn get_next_frame(&mut self) -> Option<Vec<u8>> {
        // Find the next unconsumed frame
        while let Some(frame) = self.frames.front_mut() {
            if !frame.is_consumed {
                frame.is_consumed = true;
                debug!("Returning next frame (timestamp: {})", frame.frame.timestamp);
                return Some(frame.frame.data.clone());
            } else {
                // Move to next frame
                self.frames.pop_front();
            }
        }
        
        debug!("No frames available in buffer");
        None
    }
    
    /// Get current frame (for texture rendering)
    pub fn get_current_frame(&self) -> Option<Vec<u8>> {
        // Return the most recent frame
        if let Some(frame) = self.frames.back() {
            debug!("Returning current frame (timestamp: {})", frame.frame.timestamp);
            Some(frame.frame.data.clone())
        } else {
            debug!("No current frame available");
            None
        }
    }
    
    /// Get frame by index
    pub fn get_frame_by_index(&self, index: usize) -> Option<&DecodedFrame> {
        for buffered_frame in &self.frames {
            if buffered_frame.buffer_index == index {
                return Some(&buffered_frame.frame);
            }
        }
        None
    }
    
    /// Get frame count
    pub fn get_frame_count(&self) -> usize {
        self.frames.len()
    }
    
    /// Get pre-decoded frame count
    pub fn get_predecoded_frame_count(&self) -> usize {
        self.frames.iter().filter(|f| f.is_predecoded).count()
    }
    
    /// Check if buffer has enough pre-decoded frames
    pub fn has_sufficient_predecoded_frames(&self) -> bool {
        self.get_predecoded_frame_count() >= self.min_predecoded_frames
    }
    
    /// Get buffer utilization (0.0 to 1.0)
    pub fn get_utilization(&self) -> f32 {
        self.frames.len() as f32 / self.max_frames as f32
    }
    
    /// Get total frames processed
    pub fn get_total_frames_processed(&self) -> usize {
        self.total_frames_processed
    }
    
    /// Get dropped frames count
    pub fn get_dropped_frames(&self) -> usize {
        self.dropped_frames
    }
    
    /// Clear all frames
    pub fn clear(&mut self) {
        info!("Clearing frame buffer");
        self.frames.clear();
        self.current_frame_index = 0;
        self.total_frames_processed = 0;
        self.dropped_frames = 0;
        self.last_frame_timestamp = 0;
        
        // Clear pre-decoding queue
        let mut queue = self.predecode_queue.lock();
        queue.clear();
    }
    
    /// Drop oldest frame to make room
    fn drop_oldest_frame(&mut self) -> Result<()> {
        if let Some(frame) = self.frames.pop_front() {
            if !frame.is_consumed {
                self.dropped_frames += 1;
                warn!("Dropped unconsumed frame (timestamp: {})", frame.frame.timestamp);
            } else {
                debug!("Dropped consumed frame (timestamp: {})", frame.frame.timestamp);
            }
            Ok(())
        } else {
            Err(anyhow!("No frames to drop"))
        }
    }
    
    /// Check if buffer is ready for playback
    pub fn is_ready_for_playback(&self) -> bool {
        self.frames.len() >= (self.target_fps / 2) as usize && // At least 0.5 seconds of frames
           self.has_sufficient_predecoded_frames() // And enough pre-decoded frames
    }
    
    /// Get frame rate statistics
    pub fn get_frame_rate_stats(&self) -> FrameRateStats {
        let current_fps = if self.frames.len() > 1 {
            let first_frame = self.frames.front().unwrap();
            let last_frame = self.frames.back().unwrap();
            
            let time_diff = last_frame.frame.timestamp.saturating_sub(first_frame.frame.timestamp);
            if time_diff > 0 {
                (self.frames.len() as f64 * 1000.0 / time_diff as f64) as f32
            } else {
                0.0
            }
        } else {
            0.0
        };
        
        FrameRateStats {
            current_fps,
            target_fps: self.target_fps as f32,
            efficiency: if self.target_fps > 0 { current_fps / self.target_fps as f32 } else { 0.0 },
            total_frames: self.total_frames_processed,
            dropped_frames: self.dropped_frames,
            predecoded_frames: self.get_predecoded_frame_count(),
        }
    }
    
    /// Optimize buffer for memory usage
    pub fn optimize_memory(&mut self) {
        debug!("Optimizing frame buffer memory");
        
        // Remove consumed frames that are older than 1 second
        let current_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        let mut to_remove = Vec::new();
        
        for (i, frame) in self.frames.iter().enumerate() {
            if frame.is_consumed && (current_time - frame.added_timestamp) > 1000 {
                to_remove.push(i);
            }
        }
        
        // Remove frames in reverse order to maintain indices
        for &i in to_remove.iter().rev() {
            if i < self.frames.len() {
                self.frames.remove(i);
            }
        }
        
        debug!("Memory optimization completed (frames: {})", self.frames.len());
    }
    
    /// Get memory usage in bytes
    pub fn get_memory_usage(&self) -> usize {
        self.frames.iter()
            .map(|f| f.frame.data.len())
            .sum()
    }
    
    /// Get buffer statistics
    pub fn get_stats(&self) -> BufferStats {
        BufferStats {
            frame_count: self.frames.len(),
            max_frames: self.max_frames,
            utilization: self.get_utilization(),
            memory_usage: self.get_memory_usage(),
            total_processed: self.total_frames_processed,
            dropped_frames: self.dropped_frames,
            is_ready: self.is_ready_for_playback(),
            predecoded_frames: self.get_predecoded_frame_count(),
            min_predecoded_frames: self.min_predecoded_frames,
        }
    }
}

/// Frame rate statistics
#[derive(Debug, Clone)]
pub struct FrameRateStats {
    pub current_fps: f32,
    pub target_fps: f32,
    pub efficiency: f32,
    pub total_frames: usize,
    pub dropped_frames: usize,
    pub predecoded_frames: usize,
}

/// Buffer statistics
#[derive(Debug, Clone)]
pub struct BufferStats {
    pub frame_count: usize,
    pub max_frames: usize,
    pub utilization: f32,
    pub memory_usage: usize,
    pub total_processed: usize,
    pub dropped_frames: usize,
    pub is_ready: bool,
    pub predecoded_frames: usize,
    pub min_predecoded_frames: usize,
}

impl Drop for FrameBuffer {
    fn drop(&mut self) {
        // Stop pre-decoding thread
        if let Some(thread) = self.predecode_thread.take() {
            *self.stop_predecode.lock() = true;
            let _ = thread.join();
            info!("Pre-decoding thread stopped");
        }
    }
}

// Helper function to create test frame data
fn create_test_frame_data(frame_index: usize, timestamp: u64) -> Vec<u8> {
    let width = 1080;
    let height = 1920;
    let frame_size = width * height * 3; // RGB
    
    let mut data = vec![0u8; frame_size];
    
    // Create a gradient pattern
    for y in 0..height {
        for x in 0..width {
            let idx = (y * width + x) * 3;
            let r = ((x * 255) / width) as u8;
            let g = ((y * 255) / height) as u8;
            let b = ((frame_index * 50 + timestamp as usize / 1000) % 255) as u8;
            
            if idx + 2 < data.len() {
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
            }
        }
    }
    
    data
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::decoder::DecodedFrame;
    
    fn create_test_frame(timestamp: u64) -> DecodedFrame {
        DecodedFrame {
            data: create_test_frame_data(0, timestamp),
            width: 1080,
            height: 1920,
            timestamp,
            is_key_frame: false,
            format: crate::decoder::OutputFormat::RGB24,
        }
    }
    
    #[test]
    fn test_frame_buffer_creation() {
        let buffer = FrameBuffer::new(60);
        assert!(buffer.is_ok());
        
        let buffer = buffer.unwrap();
        assert_eq!(buffer.get_frame_count(), 0);
        assert_eq!(buffer.get_utilization(), 0.0);
        assert_eq!(buffer.get_predecoded_frame_count(), 0);
    }
    
    #[test]
    fn test_predecoded_frames() {
        let mut buffer = FrameBuffer::with_capacity_and_predecode(20, 60, 10).unwrap();
        
        // Add pre-decoded frames
        for i in 0..15 {
            let frame = create_test_frame(i * 16667);
            let mut buffered_frame = BufferedFrame {
                frame,
                buffer_index: i,
                added_timestamp: 0,
                is_consumed: false,
                is_predecoded: true,
            };
            buffer.frames.push_back(buffered_frame);
        }
        
        assert_eq!(buffer.get_predecoded_frame_count(), 15);
        assert!(buffer.has_sufficient_predecoded_frames());
        assert!(buffer.is_ready_for_playback());
    }
    
    #[test]
    fn test_insufficient_predecoded_frames() {
        let mut buffer = FrameBuffer::with_capacity_and_predecode(20, 60, 10).unwrap();
        
        // Add only 5 pre-decoded frames (less than required 10)
        for i in 0..5 {
            let frame = create_test_frame(i * 16667);
            let mut buffered_frame = BufferedFrame {
                frame,
                buffer_index: i,
                added_timestamp: 0,
                is_consumed: false,
                is_predecoded: true,
            };
            buffer.frames.push_back(buffered_frame);
        }
        
        assert_eq!(buffer.get_predecoded_frame_count(), 5);
        assert!(!buffer.has_sufficient_predecoded_frames());
        assert!(!buffer.is_ready_for_playback());
    }
    
    #[test]
    fn test_predecode_task_priority() {
        let buffer = FrameBuffer::with_capacity_and_predecode(20, 60, 10).unwrap();
        
        // Add tasks with different priorities
        buffer.add_predecode_task("low1".to_string(), vec![1, 2, 3], PredecodePriority::Low);
        buffer.add_predecode_task("high1".to_string(), vec![4, 5, 6], PredecodePriority::High);
        buffer.add_predecode_task("medium1".to_string(), vec![7, 8, 9], PredecodePriority::Medium);
        buffer.add_predecode_task("high2".to_string(), vec![10, 11, 12], PredecodePriority::High);
        
        let queue = buffer.predecode_queue.lock();
        
        // High priority tasks should be at the front
        assert_eq!(queue[0].chunk_id, "high1");
        assert_eq!(queue[1].chunk_id, "high2");
        
        // Medium priority should be after high priority
        assert_eq!(queue[2].chunk_id, "medium1");
        
        // Low priority should be at the end
        assert_eq!(queue[3].chunk_id, "low1");
    }
}
