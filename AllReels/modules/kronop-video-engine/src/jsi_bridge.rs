//! JSI Bridge for React Native integration
//! 
//! Provides JavaScript interface for the Rust video engine with real frame streaming

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int, c_void};
use std::ptr;
use std::sync::Arc;
use parking_lot::Mutex;
use log::{info, error, warn, debug};
use anyhow::{Result, anyhow};
use crate::VideoEngine;
use crate::decoder::DecodedFrame;

/// JSI Bridge for React Native integration
pub struct JSIBridge {
    /// Engine instance
    engine: Option<Arc<VideoEngine>>,
    /// Callback function for frame updates
    frame_callback: Option<extern "C" fn(frame_data: *const u8, frame_len: usize, frame_format: i32, width: u32, height: u32, timestamp: u64, user_data: *mut c_void)>,
    /// Callback function for error handling
    error_callback: Option<extern "C" fn(error_msg: *const c_char, user_data: *mut c_void)>,
    /// User data for callbacks
    callback_user_data: *mut c_void,
    /// Is initialized
    initialized: bool,
    /// Frame format for callbacks
    frame_format: i32,
    /// Frame dimensions
    frame_width: u32,
    frame_height: u32,
}

/// Frame format constants
pub const FRAME_FORMAT_YUV420P: i32 = 0;
pub const FRAME_FORMAT_RGB24: i32 = 1;
pub const FRAME_FORMAT_RGBA32: i32 = 2;

impl JSIBridge {
    /// Create new JSI bridge
    pub fn new() -> Self {
        info!("Creating new JSI bridge");
        
        Self {
            engine: None,
            frame_callback: None,
            error_callback: None,
            callback_user_data: ptr::null_mut(),
            initialized: false,
            frame_format: FRAME_FORMAT_RGB24,
            frame_width: 1080,
            frame_height: 1920,
        }
    }
    
    /// Initialize the bridge with engine
    pub fn initialize(&mut self, engine: Arc<VideoEngine>) -> Result<()> {
        if self.initialized {
            warn!("JSI bridge already initialized");
            return Ok(());
        }
        
        self.engine = Some(engine);
        self.initialized = true;
        
        info!("JSI bridge initialized successfully");
        Ok(())
    }
    
    /// Set frame update callback
    pub fn set_frame_callback(
        &mut self,
        callback: extern "C" fn(frame_data: *const u8, frame_len: usize, frame_format: i32, width: u32, height: u32, timestamp: u64, user_data: *mut c_void),
        user_data: *mut c_void,
    ) {
        self.frame_callback = Some(callback);
        self.callback_user_data = user_data;
        info!("Frame callback set");
    }
    
    /// Set error callback
    pub fn set_error_callback(
        &mut self,
        callback: extern "C" fn(error_msg: *const c_char, user_data: *mut c_void),
        user_data: *mut c_void,
    ) {
        self.error_callback = Some(callback);
        self.callback_user_data = user_data;
        info!("Error callback set");
    }
    
    /// Set frame format
    pub fn set_frame_format(&mut self, format: i32) {
        self.frame_format = format;
        info!("Frame format set to: {}", format);
    }
    
    /// Set frame dimensions
    pub fn set_frame_dimensions(&mut self, width: u32, height: u32) {
        self.frame_width = width;
        self.frame_height = height;
        info!("Frame dimensions set to: {}x{}", width, height);
    }
    
    /// Trigger frame callback with decoded frame
    pub fn trigger_frame_callback(&self, frame: &DecodedFrame) {
        if let Some(callback) = self.frame_callback {
            debug!("Triggering frame callback: {}x{} (format: {:?}, size: {} bytes)", 
                   frame.width, frame.height, frame.format, frame.data.len());
            
            // Convert frame format to constant
            let format_constant = match frame.format {
                crate::decoder::OutputFormat::YUV420P => FRAME_FORMAT_YUV420P,
                crate::decoder::OutputFormat::RGB24 => FRAME_FORMAT_RGB24,
                crate::decoder::OutputFormat::RGBA32 => FRAME_FORMAT_RGBA32,
            };
            
            callback(
                frame.data.as_ptr(),
                frame.data.len(),
                format_constant,
                frame.width,
                frame.height,
                frame.timestamp,
                self.callback_user_data
            );
        }
    }
    
    /// Trigger error callback
    pub fn trigger_error_callback(&self, error_msg: &str) {
        if let Some(callback) = self.error_callback {
            error!("Triggering error callback: {}", error_msg);
            let error_cstring = CString::new(error_msg).unwrap();
            callback(error_cstring.as_ptr(), self.callback_user_data);
        }
    }
    
    /// Check if initialized
    pub fn is_initialized(&self) -> bool {
        self.initialized
    }
    
    /// Process decoded frame and send to JSI
    pub fn process_decoded_frame(&self, frame: DecodedFrame) -> Result<()> {
        if !self.initialized {
            return Err(anyhow!("JSI bridge not initialized"));
        }
        
        // Update frame dimensions if needed
        if frame.width != self.frame_width || frame.height != self.frame_height {
            self.set_frame_dimensions(frame.width, frame.height);
        }
        
        // Update frame format if needed
        let format_constant = match frame.format {
            crate::decoder::OutputFormat::YUV420P => FRAME_FORMAT_YUV420P,
            crate::decoder::OutputFormat::RGB24 => FRAME_FORMAT_RGB24,
            crate::decoder::OutputFormat::RGBA32 => FRAME_FORMAT_RGBA32,
        };
        
        if format_constant != self.frame_format {
            self.set_frame_format(format_constant);
        }
        
        // Trigger frame callback
        self.trigger_frame_callback(&frame);
        
        Ok(())
    }
}

impl Default for JSIBridge {
    fn default() -> Self {
        Self::new()
    }
}

// C API functions for JSI integration

/// Create new JSI bridge instance
#[no_mangle]
pub extern "C" fn kronop_jsi_bridge_create() -> *mut c_void {
    info!("Creating JSI bridge instance");
    let bridge = Box::new(JSIBridge::new());
    Box::into_raw(bridge) as *mut c_void
}

/// Initialize JSI bridge with engine
#[no_mangle]
pub extern "C" fn kronop_jsi_bridge_init(
    bridge_ptr: *mut c_void,
    engine_ptr: *mut c_void,
) -> c_int {
    if bridge_ptr.is_null() || engine_ptr.is_null() {
        error!("Invalid parameters for JSI bridge initialization");
        return -1;
    }
    
    let bridge = unsafe { &mut *(bridge_ptr as *mut JSIBridge) };
    let engine = unsafe { Arc::from_raw(engine_ptr as *const VideoEngine) };
    
    match bridge.initialize(engine.clone()) {
        Ok(_) => {
            // Don't drop the engine
            Arc::into_raw(engine);
            info!("JSI bridge initialized successfully");
            0
        }
        Err(e) => {
            error!("Failed to initialize JSI bridge: {}", e);
            // Don't drop the engine
            Arc::into_raw(engine);
            -1
        }
    }
}

/// Set frame callback with enhanced signature
#[no_mangle]
pub extern "C" fn kronop_jsi_bridge_set_frame_callback(
    bridge_ptr: *mut c_void,
    callback: extern "C" fn(frame_data: *const u8, frame_len: usize, frame_format: i32, width: u32, height: u32, timestamp: u64, user_data: *mut c_void),
    user_data: *mut c_void,
) -> c_int {
    if bridge_ptr.is_null() {
        error!("Bridge pointer is null");
        return -1;
    }
    
    let bridge = unsafe { &mut *(bridge_ptr as *mut JSIBridge) };
    bridge.set_frame_callback(callback, user_data);
    info!("Enhanced frame callback set successfully");
    0
}

/// Set error callback
#[no_mangle]
pub extern "C" fn kronop_jsi_bridge_set_error_callback(
    bridge_ptr: *mut c_void,
    callback: extern "C" fn(error_msg: *const c_char, user_data: *mut c_void),
    user_data: *mut c_void,
) -> c_int {
    if bridge_ptr.is_null() {
        error!("Bridge pointer is null");
        return -1;
    }
    
    let bridge = unsafe { &mut *(bridge_ptr as *mut JSIBridge) };
    bridge.set_error_callback(callback, user_data);
    info!("Error callback set successfully");
    0
}

/// Add video chunk through JSI bridge
#[no_mangle]
pub extern "C" fn kronop_jsi_bridge_add_chunk(
    bridge_ptr: *mut c_void,
    chunk_id: *const c_char,
    data: *const u8,
    data_len: usize,
) -> c_int {
    if bridge_ptr.is_null() || chunk_id.is_null() || data.is_null() {
        error!("Invalid parameters for adding chunk");
        return -1;
    }
    
    let bridge = unsafe { &*(bridge_ptr as *mut JSIBridge) };
    
    if let Some(engine) = bridge.get_engine() {
        let chunk_id_str = unsafe { CStr::from_ptr(chunk_id) }.to_string_lossy();
        let data_slice = unsafe { std::slice::from_raw_parts(data, data_len) };
        
        match engine.add_chunk(&chunk_id_str, data_slice) {
            Ok(_) => {
                debug!("Chunk added through JSI bridge: {}", chunk_id_str);
                
                // Add pre-decoding task with high priority
                if let Some(frame_buffer) = engine.get_frame_buffer() {
                    frame_buffer.add_predecode_task(
                        chunk_id_str.to_string(),
                        data_slice.to_vec(),
                        crate::frame_buffer::PredecodePriority::High
                    );
                }
                
                0
            }
            Err(e) => {
                error!("Failed to add chunk through JSI bridge: {}", e);
                bridge.trigger_error_callback(&format!("Failed to add chunk: {}", e));
                -1
            }
        }
    } else {
        error!("Engine not initialized in JSI bridge");
        -1
    }
}

/// Get current frame through JSI bridge with enhanced signature
#[no_mangle]
pub extern "C" fn kronop_jsi_bridge_get_current_frame(
    bridge_ptr: *mut c_void,
    frame_data: *mut *mut u8,
    frame_len: *mut usize,
    frame_format: *mut i32,
    width: *mut u32,
    height: *mut u32,
    timestamp: *mut u64,
) -> c_int {
    if bridge_ptr.is_null() || frame_data.is_null() || frame_len.is_null() || 
       frame_format.is_null() || width.is_null() || height.is_null() || timestamp.is_null() {
        error!("Invalid parameters for getting current frame");
        return -1;
    }
    
    let bridge = unsafe { &*(bridge_ptr as *mut JSIBridge) };
    
    if let Some(engine) = bridge.get_engine() {
        match engine.get_current_texture() {
            Ok(Some(frame)) => {
                let frame_ptr = frame.data.as_ptr() as *mut u8;
                let frame_len_val = frame.data.len();
                let frame_format_val = match frame.format {
                    crate::decoder::OutputFormat::YUV420P => FRAME_FORMAT_YUV420P,
                    crate::decoder::OutputFormat::RGB24 => FRAME_FORMAT_RGB24,
                    crate::decoder::OutputFormat::RGBA32 => FRAME_FORMAT_RGBA32,
                };
                
                unsafe {
                    *frame_data = frame_ptr;
                    *frame_len = frame_len_val;
                    *frame_format = frame_format_val;
                    *width = frame.width;
                    *height = frame.height;
                    *timestamp = frame.timestamp;
                }
                
                // Trigger callback with frame data
                bridge.trigger_frame_callback(&frame);
                
                // Leak the frame data to Rust (caller must free it)
                std::mem::forget(frame);
                debug!("Current frame retrieved through JSI bridge: {}x{} (format: {:?})", 
                         frame.width, frame.height, frame.format);
                0
            }
            Ok(None) => {
                debug!("No frame available through JSI bridge");
                1
            }
            Err(e) => {
                error!("Failed to get current frame through JSI bridge: {}", e);
                bridge.trigger_error_callback(&format!("Failed to get frame: {}", e));
                -1
            }
        }
    } else {
        error!("Engine not initialized in JSI bridge");
        -1
    }
}

/// Set video source through JSI bridge
#[no_mangle]
pub extern "C" fn kronop_jsi_bridge_set_video_source(
    bridge_ptr: *mut c_void,
    url: *const c_char,
) -> c_int {
    if bridge_ptr.is_null() || url.is_null() {
        error!("Invalid parameters for setting video source");
        return -1;
    }
    
    let bridge = unsafe { &*(bridge_ptr as *mut JSIBridge) };
    
    if let Some(engine) = bridge.get_engine() {
        let url_str = unsafe { CStr::from_ptr(url) }.to_string_lossy();
        
        match engine.set_source(&url_str) {
            Ok(_) => {
                info!("Video source set through JSI bridge: {}", url_str);
                
                // Add initial pre-decoding tasks for first few chunks
                for i in 0..5 {
                    let chunk_data = format!("chunk_{}_data", i);
                    bridge.add_predecode_task(
                        format!("initial_chunk_{}", i),
                        chunk_data.as_bytes().to_vec(),
                        crate::frame_buffer::PredecodePriority::High
                    );
                }
                
                0
            }
            Err(e) => {
                error!("Failed to set video source through JSI bridge: {}", e);
                bridge.trigger_error_callback(&format!("Failed to set source: {}", e));
                -1
            }
        }
    } else {
        error!("Engine not initialized in JSI bridge");
        -1
    }
}

/// Get engine statistics through JSI bridge
#[no_mangle]
pub extern "C" fn kronop_jsi_bridge_get_stats(
    bridge_ptr: *mut c_void,
    stats_json: *mut *mut c_char,
) -> c_int {
    if bridge_ptr.is_null() || stats_json.is_null() {
        error!("Invalid parameters for getting stats");
        return -1;
    }
    
    let bridge = unsafe { &*(bridge_ptr as *mut JSIBridge) };
    
    if let Some(engine) = bridge.get_engine() {
        let stats = engine.get_stats();
        
        // Add frame buffer statistics
        let frame_buffer_stats = if let Some(frame_buffer) = engine.get_frame_buffer() {
            frame_buffer.get_stats()
        } else {
            crate::frame_buffer::BufferStats::default()
        };
        
        let stats_json_str = format!(
            r#"{{
            "chunks_processed": {},
            "frames_decoded": {},
            "buffer_utilization": {:.2},
            "is_running": {},
            "current_fps": {:.2},
            "memory_usage": {},
            "decoding_speed": {:.2},
            "predecoded_frames": {},
            "min_predecoded_frames": {},
            "frame_buffer": {{
                "frame_count": {},
                "max_frames": {},
                "utilization": {:.2},
                "memory_usage": {},
                "is_ready": {},
                "predecoded_frames": {},
                "min_predecoded_frames": {}
            }},
            "hardware_acceleration": "{:?}",
            "output_format": "{:?}",
            "frame_dimensions": "{}x{}"
        }}"#,
            stats.chunks_processed,
            stats.frames_decoded,
            stats.buffer_utilization,
            stats.is_running,
            stats.current_fps,
            stats.memory_usage,
            stats.decoding_speed,
            frame_buffer_stats.predecoded_frames,
            frame_buffer_stats.min_predecoded_frames,
            frame_buffer_stats.frame_count,
            frame_buffer_stats.max_frames,
            frame_buffer_stats.utilization,
            frame_buffer_stats.memory_usage,
            frame_buffer_stats.is_ready,
            frame_buffer_stats.predecoded_frames,
            frame_buffer_stats.min_predecoded_frames,
            engine.get_video_info().hw_acceleration,
            engine.get_video_info().output_format,
            engine.get_video_info().width,
            engine.get_video_info().height
        );
        
        match CString::new(stats_json_str) {
            Ok(json_cstring) => {
                unsafe {
                    *stats_json = json_cstring.into_raw();
                }
                debug!("Stats retrieved through JSI bridge");
                0
            }
            Err(e) => {
                error!("Failed to create stats JSON: {}", e);
                -1
            }
        }
    } else {
        error!("Engine not initialized in JSI bridge");
        -1
    }
}

/// Add pre-decoding task through JSI bridge
#[no_mangle]
pub extern "C" fn kronop_jsi_bridge_add_predecode_task(
    bridge_ptr: *mut c_void,
    chunk_id: *const c_char,
    data: *const u8,
    data_len: usize,
    priority: c_int,
) -> c_int {
    if bridge_ptr.is_null() || chunk_id.is_null() || data.is_null() {
        error!("Invalid parameters for adding pre-decode task");
        return -1;
    }
    
    let bridge = unsafe { &*(bridge_ptr as *mut JSIBridge) };
    
    if let Some(frame_buffer) = bridge.get_engine().and_then(|e| e.get_frame_buffer()) {
        let chunk_id_str = unsafe { CStr::from_ptr(chunk_id) }.to_string_lossy();
        let data_slice = unsafe { std::slice::from_raw_parts(data, data_len) };
        
        let priority = match priority {
            0 => crate::frame_buffer::PredecodePriority::High,
            1 => crate::frame_buffer::PredecodePriority::Medium,
            _ => crate::frame_buffer::PredecodePriority::Low,
        };
        
        frame_buffer.add_predecode_task(chunk_id_str.to_string(), data_slice.to_vec(), priority);
        debug!("Pre-decode task added through JSI bridge: {} (priority: {:?})", chunk_id_str, priority);
        0
    } else {
        error!("Frame buffer not available in JSI bridge");
        -1
    }
}

/// Process decoded frame and send to JSI
#[no_mangle]
pub extern "C" fn kronop_jsi_bridge_process_frame(
    bridge_ptr: *mut c_void,
    frame_data: *const u8,
    frame_len: usize,
    frame_format: i32,
    width: u32,
    height: u32,
    timestamp: u64,
) -> c_int {
    if bridge_ptr.is_null() || frame_data.is_null() {
        error!("Invalid parameters for processing frame");
        return -1;
    }
    
    let bridge = unsafe { &mut *(bridge_ptr as *mut JSIBridge) };
    
    // Create DecodedFrame from parameters
    let frame_format = match frame_format {
        FRAME_FORMAT_YUV420P => crate::decoder::OutputFormat::YUV420P,
        FRAME_FORMAT_RGB24 => crate::decoder::OutputFormat::RGB24,
        FRAME_FORMAT_RGBA32 => crate::decoder::OutputFormat::RGBA32,
        _ => crate::decoder::OutputFormat::RGB24, // Default
    };
    
    let frame_data_slice = unsafe { std::slice::from_raw_parts(frame_data, frame_len) };
    let frame = DecodedFrame {
        data: frame_data_slice.to_vec(),
        width,
        height,
        timestamp,
        is_key_frame: false, // This would be determined from frame metadata
        format: frame_format,
    };
    
    match bridge.process_decoded_frame(frame) {
        Ok(_) => {
            debug!("Frame processed successfully through JSI bridge");
            0
        }
        Err(e) => {
            error!("Failed to process frame through JSI bridge: {}", e);
            bridge.trigger_error_callback(&format!("Failed to process frame: {}", e));
            -1
        }
    }
}

/// Cleanup function
#[no_mangle]
pub extern "C" fn kronop_jsi_bridge_cleanup(bridge_ptr: *mut c_void) {
    if !bridge_ptr.is_null() {
        let _bridge = unsafe { Box::from_raw(bridge_ptr as *mut JSIBridge) };
        // Engine will be dropped when Arc goes out of scope
        info!("JSI bridge cleaned up");
    }
}

/// Free string allocated by Rust
#[no_mangle]
pub extern "C" fn kronop_free_string(s: *mut c_char) {
    if !s.is_null() {
        unsafe {
            let _cstring = CString::from_raw(s);
        }
    }
}

/// Free frame data allocated by Rust
#[no_mangle]
pub extern "C" fn kronop_free_frame_data(data: *mut u8, len: usize) {
    if !data.is_null() && len > 0 {
        unsafe {
            let _vec = Vec::from_raw_parts(data, len, len);
        }
    }
}

/// Get frame format string
#[no_mangle]
pub extern "C" fn kronop_get_frame_format_string(format: i32) -> *const c_char {
    let format_str = match format {
        FRAME_FORMAT_YUV420P => "YUV420P",
        FRAME_FORMAT_RGB24 => "RGB24",
        FRAME_FORMAT_RGBA32 => "RGBA32",
        _ => "UNKNOWN",
    };
    
    match CString::new(format_str) {
        Ok(s) => s.into_raw(),
        Err(_) => ptr::null(),
    }
}

/// Get hardware acceleration string
#[no_mangle]
pub extern "C" fn kronop_get_hw_accel_string(hw_accel: i32) -> *const c_char {
    let hw_accel_str = match hw_accel {
        0 => "None",
        1 => "MediaCodec",
        2 => "VideoToolbox",
        3 => "CUDA",
        4 => "VAAPI",
        _ => "Unknown",
    };
    
    match CString::new(hw_accel_str) {
        Ok(s) => s.into_raw(),
        Err(_) => ptr::null(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_jsi_bridge_creation() {
        let bridge = JSIBridge::new();
        assert!(!bridge.is_initialized());
    }
    
    #[test]
    fn test_jsi_bridge_callbacks() {
        let mut bridge = JSIBridge::new();
        
        // Set dummy callbacks
        extern "C" fn dummy_frame_callback(
            _: *const u8, _: usize, _: i32, _: u32, _: u32, _: u64, _: *mut c_void
        ) {}
        extern "C" fn dummy_error_callback(_: *const c_char, _: *mut c_void) {}
        
        bridge.set_frame_callback(dummy_frame_callback, ptr::null_mut());
        bridge.set_error_callback(dummy_error_callback, ptr::null_mut());
        
        // Test frame callback trigger
        let frame = DecodedFrame {
            data: vec![1, 2, 3, 4, 5],
            width: 1080,
            height: 1920,
            timestamp: 1000,
            is_key_frame: false,
            format: crate::decoder::OutputFormat::RGB24,
        };
        
        bridge.trigger_frame_callback(&frame);
        
        // Test error callback trigger
        bridge.trigger_error_callback("Test error");
    }
    
    #[test]
    fn test_frame_format_constants() {
        assert_eq!(FRAME_FORMAT_YUV420P, 0);
        assert_eq!(FRAME_FORMAT_RGB24, 1);
        assert_eq!(FRAME_FORMAT_RGBA32, 2);
        
        assert_eq!(kronop_get_frame_format_string(FRAME_FORMAT_YUV420P), "YUV420P");
        assert_eq!(kronop_get_frame_format_string(FRAME_FORMAT_RGB24), "RGB24");
        assert_eq!(kronop_get_frame_format_string(FRAME_FORMAT_RGBA32), "RGBA32");
    }
}
