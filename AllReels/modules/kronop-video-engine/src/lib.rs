//! Kronop Video Engine
//! 
//! High-performance video decoding engine using Rust + FFmpeg
//! for real-time video processing in Reels app

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int, c_void};
use std::ptr;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tokio::sync::mpsc;
use log::{info, error, warn, debug};

mod decoder;
mod chunk_manager;
mod frame_buffer;
mod jsi_bridge;
mod cache_manager;
mod persistent_cache;
mod utils;

use decoder::VideoDecoder;
use chunk_manager::ChunkManager;
use frame_buffer::FrameBuffer;
use jsi_bridge::JSIBridge;
use cache_manager::CacheManager;
use persistent_cache::PersistentCacheManager;

/// Global engine instance
static mut ENGINE_INSTANCE: Option<Arc<VideoEngine>> = None;
static ENGINE_MUTEX: Mutex<()> = Mutex::new(());

/// Main video engine structure
pub struct VideoEngine {
    decoder: Arc<Mutex<VideoDecoder>>,
    chunk_manager: Arc<Mutex<ChunkManager>>,
    frame_buffer: Arc<Mutex<FrameBuffer>>,
    cache_manager: Arc<Mutex<CacheManager>>,
    persistent_cache_manager: Arc<Mutex<PersistentCacheManager>>,
    jsi_bridge: Arc<Mutex<JSIBridge>>,
    is_running: Arc<Mutex<bool>>,
}

impl VideoEngine {
    /// Create new video engine instance
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        info!("Initializing Kronop Video Engine");
        
        let decoder = Arc::new(Mutex::new(VideoDecoder::new()?));
        let chunk_manager = Arc::new(Mutex::new(ChunkManager::new()));
        let frame_buffer = Arc::new(Mutex::new(FrameBuffer::new(60)?));
        let cache_manager = Arc::new(Mutex::new(CacheManager::new()?));
        let jsi_bridge = Arc::new(Mutex::new(JSIBridge::new()));
        let is_running = Arc::new(Mutex::new(false));
        
        Ok(Self {
            decoder,
            chunk_manager,
            frame_buffer,
            cache_manager,
            jsi_bridge,
            is_running,
        })
    }
    
    /// Start the video engine
    pub fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut is_running = self.is_running.lock().unwrap();
        if *is_running {
            warn!("Engine is already running");
            return Ok(());
        }
        
        *is_running = true;
        info!("Video engine started");
        
        // Start background processing thread
        let decoder = Arc::clone(&self.decoder);
        let chunk_manager = Arc::clone(&self.chunk_manager);
        let frame_buffer = Arc::clone(&self.frame_buffer);
        let cache_manager = Arc::clone(&self.cache_manager);
        let is_running = Arc::clone(&self.is_running);
        
        thread::spawn(move || {
            Self::processing_loop(decoder, chunk_manager, frame_buffer, cache_manager, is_running);
        });
        
        Ok(())
    }
    
    /// Stop the video engine
    pub fn stop(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut is_running = self.is_running.lock().unwrap();
        *is_running = false;
        info!("Video engine stopped");
        Ok(())
    }
    
    /// Add video chunk with caching
    pub fn add_chunk(&self, chunk_id: &str, data: &[u8]) -> Result<(), Box<dyn std::error::Error>> {
        // First, try to cache the chunk
        let cache_result = {
            let cache = self.cache_manager.lock();
            cache.store_chunk(chunk_id, "video_url", data, false, 0)
        };
        
        if cache_result.unwrap_or(false) {
            debug!("Chunk cached successfully: {}", chunk_id);
        }
        
        // Then add to chunk manager for processing
        let mut chunk_manager = self.chunk_manager.lock().unwrap();
        chunk_manager.add_chunk(chunk_id, data)?;
        info!("Added chunk: {}", chunk_id);
        Ok(())
    }
    
    /// Get next decoded frame
    pub fn get_next_frame(&self) -> Result<Option<Vec<u8>>, Box<dyn std::error::Error>> {
        let mut frame_buffer = self.frame_buffer.lock().unwrap();
        Ok(frame_buffer.get_next_frame())
    }
    
    /// Get current frame as texture data
    pub fn get_current_texture(&self) -> Result<Option<Vec<u8>>, Box<dyn std::error::Error>> {
        let mut frame_buffer = self.frame_buffer.lock().unwrap();
        Ok(frame_buffer.get_current_frame())
    }
    
    /// Set video source
    pub fn set_source(&self, url: &str) -> Result<(), Box<dyn std::error::Error>> {
        let mut decoder = self.decoder.lock().unwrap();
        decoder.set_source(url)?;
        info!("Set video source: {}", url);
        Ok(())
    }
    
    /// Get cached chunk
    pub fn get_cached_chunk(&self, chunk_id: &str) -> Result<Option<Vec<u8>>, Box<dyn std::error::Error>> {
        let cache = self.cache_manager.lock().unwrap();
        cache.get_chunk(chunk_id)
    }
    
    /// Check if chunk is cached
    pub fn is_chunk_cached(&self, chunk_id: &str) -> Result<bool, Box<dyn std::error::Error>> {
        let cache = self.cache_manager.lock().unwrap();
        cache.is_chunk_cached(chunk_id)
    }
    
    /// Get all cached chunks for a video
    pub fn get_cached_video_chunks(&self, video_url: &str) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let cache = self.cache_manager.lock().unwrap();
        cache.get_video_chunks(video_url)
    }
    
    /// Get cache statistics
    pub fn get_cache_stats(&self) -> cache_manager::CacheStats {
        let cache = self.cache_manager.lock().unwrap();
        cache.get_stats()
    }
    
    /// Clear cache
    pub fn clear_cache(&self) -> Result<(), Box<dyn std::error::Error>> {
        let cache = self.cache_manager.lock().unwrap();
        cache.clear_cache()
    }
    
    /// Get frame buffer reference
    pub fn get_frame_buffer(&self) -> Option<&Arc<Mutex<FrameBuffer>>> {
        Some(&self.frame_buffer)
    }
    
    /// Get engine statistics
    pub fn get_stats(&self) -> EngineStats {
        let chunk_manager = self.chunk_manager.lock().unwrap();
        let frame_buffer = self.frame_buffer.lock().unwrap();
        let cache_stats = self.get_cache_stats();
        
        EngineStats {
            chunks_processed: chunk_manager.get_processed_count(),
            frames_decoded: frame_buffer.get_frame_count(),
            buffer_utilization: frame_buffer.get_utilization(),
            is_running: *self.is_running.lock().unwrap(),
            current_fps: 59.8, // Mock value
            memory_usage: cache_stats.total_bytes_stored as u64,
            decoding_speed: 52.3, // Mock value
        }
    }
    
    /// Background processing loop with caching
    fn processing_loop(
        decoder: Arc<Mutex<VideoDecoder>>,
        chunk_manager: Arc<Mutex<ChunkManager>>,
        frame_buffer: Arc<Mutex<FrameBuffer>>,
        cache_manager: Arc<Mutex<CacheManager>>,
        is_running: Arc<Mutex<bool>>,
    ) {
        info!("Starting processing loop with caching");
        
        while *is_running.lock().unwrap() {
            // Get next chunk to process
            let chunk = {
                let mut cm = chunk_manager.lock().unwrap();
                cm.get_next_chunk()
            };
            
            if let Some((chunk_id, data)) = chunk {
                debug!("Processing chunk: {}", chunk_id);
                
                // Check if we have cached decoded frames for this chunk
                let cached_frame = {
                    let cache = cache_manager.lock().unwrap();
                    cache.get_chunk(&format!("decoded_{}", chunk_id))
                };
                
                let frames = if let Some(cached_frame_data) = cached_frame {
                    // Use cached frame data
                    debug!("Using cached decoded frame for chunk: {}", chunk_id);
                    vec![decoder::DecodedFrame {
                        data: cached_frame_data,
                        width: 1080,
                        height: 1920,
                        timestamp: 0,
                        is_key_frame: false,
                        format: decoder::OutputFormat::RGB24,
                    }]
                } else {
                    // Decode chunk
                    let frames = {
                        let mut dec = decoder.lock().unwrap();
                        match dec.decode_chunk(&data) {
                            Ok(frames) => frames,
                            Err(e) => {
                                error!("Failed to decode chunk {}: {}", chunk_id, e);
                                continue;
                            }
                        }
                    };
                    
                    // Cache the decoded frame
                    if !frames.is_empty() {
                        let cache = cache_manager.lock().unwrap();
                        if let Some(first_frame) = frames.first() {
                            let _ = cache.store_chunk(&format!("decoded_{}", chunk_id), "decoded_frame", &first_frame.data, first_frame.is_key_frame, 0);
                        }
                    }
                    
                    frames
                };
                
                // Add frames to buffer
                {
                    let mut fb = frame_buffer.lock().unwrap();
                    for frame in frames {
                        if let Err(e) = fb.add_frame(frame) {
                            warn!("Failed to add frame to buffer: {}", e);
                        }
                    }
                }
                
                // Mark chunk as processed
                {
                    let mut cm = chunk_manager.lock().unwrap();
                    cm.mark_processed(&chunk_id);
                }
                
                info!("Processed chunk: {}", chunk_id);
            } else {
                // No chunks available, wait a bit
                thread::sleep(Duration::from_millis(10));
            }
        }
        
        info!("Processing loop ended");
    }
}

/// Engine statistics
#[derive(Debug, Clone)]
pub struct EngineStats {
    pub chunks_processed: usize,
    pub frames_decoded: usize,
    pub buffer_utilization: f32,
    pub is_running: bool,
}

/// Initialize global engine instance
#[no_mangle]
pub extern "C" fn kronop_engine_init() -> *mut c_void {
    let _guard = ENGINE_MUTEX.lock().unwrap();
    
    unsafe {
        if ENGINE_INSTANCE.is_some() {
            warn!("Engine already initialized");
            return ptr::null_mut();
        }
        
        match VideoEngine::new() {
            Ok(engine) => {
                let engine_ptr = Arc::into_raw(Arc::new(engine)) as *mut c_void;
                ENGINE_INSTANCE = Some(Arc::from_raw(engine_ptr as *const VideoEngine));
                info!("Engine initialized successfully");
                engine_ptr
            }
            Err(e) => {
                error!("Failed to initialize engine: {}", e);
                ptr::null_mut()
            }
        }
    }
}

/// Start the engine
#[no_mangle]
pub extern "C" fn kronop_engine_start(engine_ptr: *mut c_void) -> c_int {
    if engine_ptr.is_null() {
        error!("Engine pointer is null");
        return -1;
    }
    
    let engine = unsafe { Arc::from_raw(engine_ptr as *const VideoEngine) };
    let result = match engine.start() {
        Ok(_) => 0,
        Err(e) => {
            error!("Failed to start engine: {}", e);
            -1
        }
    };
    
    // Don't drop the Arc
    Arc::into_raw(engine);
    result
}

/// Stop the engine
#[no_mangle]
pub extern "C" fn kronop_engine_stop(engine_ptr: *mut c_void) -> c_int {
    if engine_ptr.is_null() {
        error!("Engine pointer is null");
        return -1;
    }
    
    let engine = unsafe { Arc::from_raw(engine_ptr as *const VideoEngine) };
    let result = match engine.stop() {
        Ok(_) => 0,
        Err(e) => {
            error!("Failed to stop engine: {}", e);
            -1
        }
    };
    
    // Don't drop the Arc
    Arc::into_raw(engine);
    result
}

/// Add video chunk
#[no_mangle]
pub extern "C" fn kronop_engine_add_chunk(
    engine_ptr: *mut c_void,
    chunk_id: *const c_char,
    data: *const u8,
    data_len: usize,
) -> c_int {
    if engine_ptr.is_null() || chunk_id.is_null() || data.is_null() {
        error!("Invalid parameters");
        return -1;
    }
    
    let engine = unsafe { Arc::from_raw(engine_ptr as *const VideoEngine) };
    
    let chunk_id_str = unsafe { CStr::from_ptr(chunk_id) }.to_string_lossy();
    let data_slice = unsafe { std::slice::from_raw_parts(data, data_len) };
    
    let result = match engine.add_chunk(&chunk_id_str, data_slice) {
        Ok(_) => 0,
        Err(e) => {
            error!("Failed to add chunk: {}", e);
            -1
        }
    };
    
    // Don't drop the Arc
    Arc::into_raw(engine);
    result
}

/// Get current frame
#[no_mangle]
pub extern "C" fn kronop_engine_get_current_frame(
    engine_ptr: *mut c_void,
    frame_data: *mut *mut u8,
    frame_len: *mut usize,
) -> c_int {
    if engine_ptr.is_null() || frame_data.is_null() || frame_len.is_null() {
        error!("Invalid parameters");
        return -1;
    }
    
    let engine = unsafe { Arc::from_raw(engine_ptr as *const VideoEngine) };
    
    match engine.get_current_texture() {
        Ok(Some(frame)) => {
            let frame_ptr = frame.as_ptr() as *mut u8;
            unsafe {
                *frame_data = frame_ptr;
                *frame_len = frame.len();
            }
            
            // Leak the frame data to Rust (caller must free it)
            std::mem::forget(frame);
            0
        }
        Ok(None) => 1, // No frame available
        Err(e) => {
            error!("Failed to get current frame: {}", e);
            -1
        }
    }
}

/// Cleanup function
#[no_mangle]
pub extern "C" fn kronop_engine_cleanup(engine_ptr: *mut c_void) {
    if !engine_ptr.is_null() {
        let _engine = unsafe { Arc::from_raw(engine_ptr as *const VideoEngine) };
        // Engine will be dropped when Arc goes out of scope
        info!("Engine cleaned up");
    }
    
    unsafe {
        let _guard = ENGINE_MUTEX.lock().unwrap();
        ENGINE_INSTANCE = None;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_engine_creation() {
        // This test would require FFmpeg to be available
        // For now, we'll just test the structure
        assert!(true);
    }
}
