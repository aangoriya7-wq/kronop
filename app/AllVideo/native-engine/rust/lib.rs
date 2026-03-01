//! Kronop Native Video Engine - Rust Core
//! High-performance video decoder for React Native

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_void};

pub mod video_decoder;
pub mod memory_pool;
pub mod frame_buffer;

pub use video_decoder::VideoDecoder;
pub use memory_pool::MemoryPool;
pub use frame_buffer::FrameBuffer;

/// Global video engine instance
static mut VIDEO_ENGINE: Option<KronopVideoEngine> = None;

/// Main Video Engine Structure
pub struct KronopVideoEngine {
    decoder: VideoDecoder,
    memory_pool: Arc<Mutex<MemoryPool>>,
    frame_buffer: FrameBuffer,
    active_videos: HashMap<u64, VideoContext>,
}

#[derive(Debug, Clone)]
pub struct VideoContext {
    pub id: u64,
    pub url: String,
    pub width: u32,
    pub height: u32,
    pub duration: f64,
    pub frame_rate: f32,
    pub is_playing: bool,
    pub current_frame: u64,
    pub total_frames: u64,
}

#[derive(Debug, Clone)]
pub struct VideoFrame {
    pub data: Vec<u8>,
    pub width: u32,
    pub height: u32,
    pub timestamp: f64,
    pub is_keyframe: bool,
}

impl KronopVideoEngine {
    /// Create new video engine instance
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let memory_pool = Arc::new(Mutex::new(MemoryPool::new(1024 * 1024 * 256)?)); // 256MB
        let decoder = VideoDecoder::new()?;
        let frame_buffer = FrameBuffer::new(60)?; // 60 frames buffer
        
        Ok(Self {
            decoder,
            memory_pool,
            frame_buffer,
            active_videos: HashMap::new(),
        })
    }

    /// Load video for decoding
    pub fn load_video(&mut self, url: &str) -> Result<u64, Box<dyn std::error::Error>> {
        let video_id = self.generate_video_id();
        
        // Parse video metadata (simplified)
        let context = VideoContext {
            id: video_id,
            url: url.to_string(),
            width: 1920,
            height: 1080,
            duration: 120.0,
            frame_rate: 30.0,
            is_playing: false,
            current_frame: 0,
            total_frames: 3600, // 30fps * 120s
        };
        
        // Initialize decoder
        self.decoder.initialize(&context)?;
        
        // Store video context
        self.active_videos.insert(video_id, context);
        
        println!("🔥 Video {} loaded: {}", video_id, url);
        Ok(video_id)
    }

    /// Start video playback
    pub fn play_video(&mut self, video_id: u64) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(context) = self.active_videos.get_mut(&video_id) {
            context.is_playing = true;
            self.decoder.start_decoding(video_id)?;
            println!("▶️ Video {} started", video_id);
            Ok(())
        } else {
            Err("Video not found".into())
        }
    }

    /// Pause video playback
    pub fn pause_video(&mut self, video_id: u64) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(context) = self.active_videos.get_mut(&video_id) {
            context.is_playing = false;
            self.decoder.pause_decoding(video_id)?;
            println!("⏸️ Video {} paused", video_id);
            Ok(())
        } else {
            Err("Video not found".into())
        }
    }

    /// Get next decoded frame
    pub fn get_next_frame(&mut self, video_id: u64) -> Result<Option<VideoFrame>, Box<dyn std::error::Error>> {
        if let Some(context) = self.active_videos.get_mut(&video_id) {
            if context.is_playing && context.current_frame < context.total_frames {
                let frame = self.decoder.decode_next_frame(video_id)?;
                context.current_frame += 1;
                Ok(frame)
            } else {
                Ok(None)
            }
        } else {
            Err("Video not found".into())
        }
    }

    /// Seek to specific frame
    pub fn seek_to_frame(&mut self, video_id: u64, frame: u64) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(context) = self.active_videos.get_mut(&video_id) {
            context.current_frame = frame;
            self.decoder.seek_to_frame(video_id, frame)?;
            println!("⏩ Video {} seeked to frame {}", video_id, frame);
            Ok(())
        } else {
            Err("Video not found".into())
        }
    }

    /// Get video information
    pub fn get_video_info(&self, video_id: u64) -> Option<&VideoContext> {
        self.active_videos.get(&video_id)
    }

    /// Release video resources
    pub fn release_video(&mut self, video_id: u64) -> Result<(), Box<dyn std::error::Error>> {
        if self.active_videos.remove(&video_id).is_some() {
            self.decoder.release(video_id)?;
            println!("🗑️ Video {} released", video_id);
            Ok(())
        } else {
            Err("Video not found".into())
        }
    }

    /// Generate unique video ID
    fn generate_video_id(&self) -> u64 {
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(1);
        COUNTER.fetch_add(1, Ordering::Relaxed)
    }
}

/// C-compatible functions for React Native integration

/// Initialize video engine
#[no_mangle]
pub extern "C" fn kronop_init() -> *mut c_void {
    match KronopVideoEngine::new() {
        Ok(engine) => {
            unsafe {
                VIDEO_ENGINE = Some(engine);
            }
            println!("🚀 Kronop Video Engine initialized");
            std::ptr::null_mut() // Success
        }
        Err(e) => {
            eprintln!("❌ Failed to initialize engine: {}", e);
            std::ptr::null_mut() // Error
        }
    }
}

/// Load video
#[no_mangle]
pub extern "C" fn kronop_load_video(url: *const c_char) -> u64 {
    if url.is_null() {
        return 0;
    }
    
    let video_url = unsafe { CStr::from_ptr(url) }.to_str().unwrap_or("");
    
    unsafe {
        if let Some(ref mut engine) = VIDEO_ENGINE {
            match engine.load_video(video_url) {
                Ok(video_id) => video_id,
                Err(e) => {
                    eprintln!("❌ Failed to load video: {}", e);
                    0
                }
            }
        } else {
            0
        }
    }
}

/// Play video
#[no_mangle]
pub extern "C" fn kronop_play_video(video_id: u64) -> bool {
    unsafe {
        if let Some(ref mut engine) = VIDEO_ENGINE {
            engine.play_video(video_id).is_ok()
        } else {
            false
        }
    }
}

/// Pause video
#[no_mangle]
pub extern "C" fn kronop_pause_video(video_id: u64) -> bool {
    unsafe {
        if let Some(ref mut engine) = VIDEO_ENGINE {
            engine.pause_video(video_id).is_ok()
        } else {
            false
        }
    }
}

/// Get next frame (returns pointer to frame data)
#[no_mangle]
pub extern "C" fn kronop_get_next_frame(video_id: u64) -> *mut c_void {
    unsafe {
        if let Some(ref mut engine) = VIDEO_ENGINE {
            match engine.get_next_frame(video_id) {
                Ok(Some(frame)) => {
                    // In real implementation, return frame data pointer
                    // For now, return success
                    std::ptr::null_mut()
                }
                _ => std::ptr::null_mut(),
            }
        } else {
            std::ptr::null_mut()
        }
    }
}

/// Seek to frame
#[no_mangle]
pub extern "C" fn kronop_seek_to_frame(video_id: u64, frame: u64) -> bool {
    unsafe {
        if let Some(ref mut engine) = VIDEO_ENGINE {
            engine.seek_to_frame(video_id, frame).is_ok()
        } else {
            false
        }
    }
}

/// Get video info
#[no_mangle]
pub extern "C" fn kronop_get_video_info(video_id: u64) -> *mut c_void {
    unsafe {
        if let Some(ref engine) = VIDEO_ENGINE {
            if let Some(context) = engine.get_video_info(video_id) {
                // In real implementation, return context pointer
                // For now, return success
                std::ptr::null_mut()
            } else {
                std::ptr::null_mut()
            }
        } else {
            std::ptr::null_mut()
        }
    }
}

/// Release video
#[no_mangle]
pub extern "C" fn kronop_release_video(video_id: u64) -> bool {
    unsafe {
        if let Some(ref mut engine) = VIDEO_ENGINE {
            engine.release_video(video_id).is_ok()
        } else {
            false
        }
    }
}

/// Cleanup engine
#[no_mangle]
pub extern "C" fn kronop_cleanup() {
    unsafe {
        VIDEO_ENGINE = None;
    }
    println!("🗑️ Kronop Video Engine cleaned up");
}
