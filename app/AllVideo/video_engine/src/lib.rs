//! Kronop Video Engine - World's Fastest Video Player
//! Rust core with JSI bridge for React Native

use jni::{JNIEnv, objects::{JClass, JString, JObject}, sys::{jstring, jlong, jobject}};
use std::ffi::CStr;
use std::os::raw::c_char;
use std::ptr;

mod video_decoder;
mod vulkan_renderer;
mod memory_pool;
mod jsi_bridge;
mod exoplayer_integration;
mod zero_copy_renderer;
mod hardware_accelerator;
mod ultra_low_latency;
mod hls_dash_streaming;

use video_decoder::VideoDecoder;
use vulkan_renderer::VulkanRenderer;
use memory_pool::MemoryPool;
use jsi_bridge::JSIBridge;

/// Global video engine instance
static mut VIDEO_ENGINE: Option<KronopVideoEngine> = None;

/// Main Video Engine Structure with all advanced features
pub struct KronopVideoEngine {
    decoder: VideoDecoder,
    renderer: VulkanRenderer,
    memory_pool: MemoryPool,
    jsi_bridge: JSIBridge,
    zero_copy_renderer: zero_copy_renderer::ZeroCopyRenderer,
    hardware_accelerator: hardware_accelerator::HardwareAccelerator,
    ultra_low_latency: ultra_low_latency::UltraLowLatencyEngine,
    hls_dash_streaming: hls_dash_streaming::HlsDashStreamingEngine,
}

impl KronopVideoEngine {
    /// Initialize the video engine with maximum performance
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        // Initialize core components
        let memory_pool = MemoryPool::new(1024 * 1024 * 512)?; // 512MB pool
        let decoder = VideoDecoder::new()?;
        let renderer = VulkanRenderer::new()?;
        let jsi_bridge = JSIBridge::new()?;
        
        // Initialize advanced components
        let zero_copy_renderer = zero_copy_renderer::ZeroCopyRenderer::new(
            renderer.device.clone(),
            renderer.physical_device,
            renderer.command_pool,
            std::sync::Arc::new(memory_pool.clone()),
        )?;
        
        let hardware_accelerator = hardware_accelerator::HardwareAccelerator::new()?;
        let ultra_low_latency = ultra_low_latency::UltraLowLatencyEngine::new()?;
        let hls_dash_streaming = hls_dash_streaming::HlsDashStreamingEngine::new()?;
        
        Ok(Self {
            decoder,
            renderer,
            memory_pool,
            jsi_bridge,
            zero_copy_renderer,
            hardware_accelerator,
            ultra_low_latency,
            hls_dash_streaming,
        })
    }

    /// Load video with zero-copy optimization and instant start
    pub fn load_video(&mut self, url: &str) -> Result<u64, Box<dyn std::error::Error>> {
        // Start hardware acceleration for maximum performance
        self.hardware_accelerator.start()?;
        
        // Preload video for ultra-low latency
        let video_id = self.ultra_low_latency.preload_video(url, ultra_low_latency::PrefetchPriority::Critical).await?;
        
        // Pre-allocate memory for video frames
        self.decoder.load_video_fast(url, &mut self.memory_pool)?;
        
        // Setup zero-copy rendering pipeline
        self.renderer.setup_pipeline(video_id)?;
        
        // Create zero-copy buffer for direct GPU transfer
        let buffer_id = self.zero_copy_renderer.create_zero_copy_buffer(1024 * 1024 * 10, true)?; // 10MB buffer
        
        println!("🔥 Video {} loaded with zero-copy and hardware acceleration", video_id);
        Ok(video_id)
    }

    /// Play video with instant start (Red Note style)
    pub fn play_video(&mut self, video_id: u64) -> Result<(), Box<dyn std::error::Error>> {
        // Start ultra-low latency playback
        let playback_result = self.ultra_low_latency.start_playback(video_id).await?;
        
        if playback_result.is_instant {
            println!("⚡ Instant playback achieved! Start time: {:?}", playback_result.start_time);
        }
        
        // Use hardware acceleration
        self.decoder.play_with_hardware_acceleration(video_id)?;
        
        // Start Vulkan rendering with zero-copy
        self.renderer.start_rendering(video_id)?;
        
        Ok(())
    }

    /// Seek to frame with instant response
    pub fn seek_to_frame(&mut self, video_id: u64, frame: u64) -> Result<(), Box<dyn std::error::Error>> {
        // Instant seek with zero-copy
        self.decoder.instant_seek(video_id, frame)?;
        Ok(())
    }
    
    /// Load HLS stream with adaptive streaming
    pub async fn load_hls_stream(&mut self, url: &str) -> Result<String, Box<dyn std::error::Error>> {
        let stream_id = self.hls_dash_streaming.load_hls_stream(url).await?;
        println!("🌊 HLS stream loaded: {}", stream_id);
        Ok(stream_id)
    }
    
    /// Load DASH stream with adaptive streaming
    pub async fn load_dash_stream(&mut self, url: &str) -> Result<String, Box<dyn std::error::Error>> {
        let stream_id = self.hls_dash_streaming.load_dash_stream(url).await?;
        println!("🌊 DASH stream loaded: {}", stream_id);
        Ok(stream_id)
    }
    
    /// Get performance metrics
    pub fn get_performance_metrics(&self) -> PerformanceMetrics {
        PerformanceMetrics {
            hardware_acceleration: self.hardware_accelerator.get_performance_metrics(),
            ultra_low_latency: self.ultra_low_latency.get_performance_metrics(),
            zero_copy_buffers: self.zero_copy_renderer.zero_copy_buffers.len(),
            memory_pool_stats: self.memory_pool.get_stats(),
        }
    }
}

#[derive(Debug)]
pub struct PerformanceMetrics {
    pub hardware_acceleration: hardware_accelerator::PerformanceMetrics,
    pub ultra_low_latency: ultra_low_latency::LatencyMetrics,
    pub zero_copy_buffers: usize,
    pub memory_pool_stats: memory_pool::MemoryStats,
}

/// JNI entry point for Android
#[no_mangle]
pub extern "C" fn Java_com_kronop_videoengine_KronopVideoEngine_nativeInit(
    env: JNIEnv,
    _class: JClass,
) -> jlong {
    match KronopVideoEngine::new() {
        Ok(engine) => {
            unsafe {
                VIDEO_ENGINE = Some(engine);
            }
            1 // Success
        }
        Err(_) => 0, // Error
    }
}

/// JNI method to load video
#[no_mangle]
pub extern "C" fn Java_com_kronop_videoengine_KronopVideoEngine_nativeLoadVideo(
    env: JNIEnv,
    _class: JClass,
    video_url: JString,
) -> jlong {
    let url: String = env.get_string(video_url).expect("Couldn't get string").into();
    
    unsafe {
        if let Some(ref mut engine) = VIDEO_ENGINE {
            match engine.load_video(&url) {
                Ok(video_id) => video_id as jlong,
                Err(_) => -1,
            }
        } else {
            -1
        }
    }
}

/// JNI method to play video
#[no_mangle]
pub extern "C" fn Java_com_kronop_videoengine_KronopVideoEngine_nativePlayVideo(
    _env: JNIEnv,
    _class: JClass,
    video_id: jlong,
) -> jboolean {
    unsafe {
        if let Some(ref mut engine) = VIDEO_ENGINE {
            match engine.play_video(video_id as u64) {
                Ok(_) => 1, // true
                Err(_) => 0, // false
            }
        } else {
            0
        }
    }
}

/// JSI Bridge function for React Native (direct call, no bridge)
#[no_mangle]
pub extern "C" fn kronop_video_engine_init(
    _runtime: *mut c_char,
) -> *mut c_char {
    unsafe {
        if VIDEO_ENGINE.is_none() {
            match KronopVideoEngine::new() {
                Ok(engine) => {
                    VIDEO_ENGINE = Some(engine);
                    ptr::null_mut() // Success
                }
                Err(_) => ptr::null_mut(), // Error
            }
        } else {
            ptr::null_mut() // Already initialized
        }
    }
}

/// JSI Bridge for instant video loading
#[no_mangle]
pub extern "C" fn kronop_load_video_fast(
    url: *const c_char,
) -> u64 {
    if url.is_null() {
        return 0;
    }
    
    let video_url = unsafe { CStr::from_ptr(url) }.to_str().unwrap_or("");
    
    unsafe {
        if let Some(ref mut engine) = VIDEO_ENGINE {
            match engine.load_video(video_url) {
                Ok(video_id) => video_id,
                Err(_) => 0,
            }
        } else {
            0
        }
    }
}

/// JSI Bridge for instant playback
#[no_mangle]
pub extern "C" fn kronop_play_video_instant(
    video_id: u64,
) -> bool {
    unsafe {
        if let Some(ref mut engine) = VIDEO_ENGINE {
            engine.play_video(video_id).is_ok()
        } else {
            false
        }
    }
}
