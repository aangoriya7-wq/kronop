//! Utility functions for the video engine
//! 
//! Common utilities and helper functions

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_void};
use log::{info, error, debug};
use anyhow::{Result, anyhow};

/// Convert C string to Rust string
pub fn cstr_to_string(cstr: *const c_char) -> Result<String> {
    if cstr.is_null() {
        return Err(anyhow!("C string pointer is null"));
    }
    
    unsafe {
        let c_string = CStr::from_ptr(cstr);
        c_string.to_str()
            .map(|s| s.to_string())
            .map_err(|e| anyhow!("Invalid UTF-8 in C string: {}", e))
    }
}

/// Convert Rust string to C string
pub fn string_to_cstring(string: &str) -> Result<CString> {
    CString::new(string)
        .map_err(|e| anyhow!("Failed to create C string: {}", e))
}

/// Convert Rust string to C string pointer
pub fn string_to_cstr_ptr(string: &str) -> Result<*const c_char> {
    let cstring = string_to_cstring(string)?;
    Ok(cstring.as_ptr())
}

/// Safe pointer dereferencing
pub fn safe_deref_ptr<T>(ptr: *const T) -> Option<&T> {
    if ptr.is_null() {
        None
    } else {
        unsafe { Some(&*ptr) }
    }
}

/// Safe mutable pointer dereferencing
pub fn safe_deref_mut_ptr<T>(ptr: *mut T) -> Option<&mut T> {
    if ptr.is_null() {
        None
    } else {
        unsafe { Some(&mut *ptr) }
    }
}

/// Memory alignment utilities
pub mod alignment {
    /// Align size to given alignment
    pub fn align_size(size: usize, alignment: usize) -> usize {
        (size + alignment - 1) & !(alignment - 1)
    }
    
    /// Check if pointer is aligned
    pub fn is_aligned(ptr: *const c_void, alignment: usize) -> bool {
        let addr = ptr as usize;
        addr % alignment == 0
    }
    
    /// Get next aligned address
    pub fn next_aligned_address(ptr: *const c_void, alignment: usize) -> *const c_void {
        let addr = ptr as usize;
        let aligned = align_size(addr, alignment);
        aligned as *const c_void
    }
}

/// Time utilities
pub mod time {
    use std::time::{SystemTime, UNIX_EPOCH, Duration};
    
    /// Get current timestamp in milliseconds
    pub fn current_timestamp_ms() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
    }
    
    /// Get current timestamp in microseconds
    pub fn current_timestamp_us() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_micros() as u64
    }
    
    /// Format duration as human readable string
    pub fn format_duration(duration: Duration) -> String {
        let total_seconds = duration.as_secs();
        let hours = total_seconds / 3600;
        let minutes = (total_seconds % 3600) / 60;
        let seconds = total_seconds % 60;
        let milliseconds = duration.subsec_millis();
        
        if hours > 0 {
            format!("{}h {}m {}s {}ms", hours, minutes, seconds, milliseconds)
        } else if minutes > 0 {
            format!("{}m {}s {}ms", minutes, seconds, milliseconds)
        } else if seconds > 0 {
            format!("{}s {}ms", seconds, milliseconds)
        } else {
            format!("{}ms", milliseconds)
        }
    }
    
    /// Convert timestamp to human readable string
    pub fn format_timestamp(timestamp: u64) -> String {
        let duration = Duration::from_millis(timestamp);
        format_duration(duration)
    }
}

/// Math utilities
pub mod math {
    /// Clamp value between min and max
    pub fn clamp<T: PartialOrd>(value: T, min: T, max: T) -> T {
        if value < min {
            min
        } else if value > max {
            max
        } else {
            value
        }
    }
    
    /// Linear interpolation
    pub fn lerp(a: f32, b: f32, t: f32) -> f32 {
        a + (b - a) * t
    }
    
    /// Map value from one range to another
    pub fn map_range(value: f32, from_min: f32, from_max: f32, to_min: f32, to_max: f32) -> f32 {
        let normalized = (value - from_min) / (from_max - from_min);
        lerp(to_min, to_max, normalized)
    }
    
    /// Calculate frame timestamp from frame number and FPS
    pub fn frame_timestamp(frame_number: u64, fps: u32) -> u64 {
        let frame_duration_ms = 1000.0 / fps as f64;
        (frame_number as f64 * frame_duration_ms) as u64
    }
    
    /// Calculate FPS from frame timestamps
    pub fn calculate_fps(timestamps: &[u64]) -> f32 {
        if timestamps.len() < 2 {
            return 0.0;
        }
        
        let first = timestamps[0];
        let last = timestamps[timestamps.len() - 1];
        let duration = last - first;
        
        if duration == 0 {
            return 0.0;
        }
        
        (timestamps.len() as f64 - 1.0) * 1000.0 / duration as f64
    }
}

/// Byte utilities
pub mod bytes {
    /// Format bytes as human readable string
    pub fn format_bytes(bytes: usize) -> String {
        const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
        const THRESHOLD: f64 = 1024.0;
        
        if bytes == 0 {
            return "0 B".to_string();
        }
        
        let mut size = bytes as f64;
        let mut unit_index = 0;
        
        while size >= THRESHOLD && unit_index < UNITS.len() - 1 {
            size /= THRESHOLD;
            unit_index += 1;
        }
        
        format!("{:.2} {}", size, UNITS[unit_index])
    }
    
    /// Calculate checksum for data
    pub fn calculate_checksum(data: &[u8]) -> u32 {
        data.iter().fold(0u32, |acc, &byte| {
            acc.wrapping_mul(31).wrapping_add(byte as u32)
        })
    }
    
    /// Validate data with checksum
    pub fn validate_checksum(data: &[u8], expected_checksum: u32) -> bool {
        calculate_checksum(data) == expected_checksum
    }
}

/// Error utilities
pub mod error {
    use std::fmt;
    
    /// Custom error type for the video engine
    #[derive(Debug)]
    pub enum VideoEngineError {
        InitializationFailed(String),
        DecodingFailed(String),
        BufferOverflow(String),
        InvalidParameter(String),
        ResourceUnavailable(String),
        Unknown(String),
    }
    
    impl fmt::Display for VideoEngineError {
        fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
            match self {
                VideoEngineError::InitializationFailed(msg) => write!(f, "Initialization failed: {}", msg),
                VideoEngineError::DecodingFailed(msg) => write!(f, "Decoding failed: {}", msg),
                VideoEngineError::BufferOverflow(msg) => write!(f, "Buffer overflow: {}", msg),
                VideoEngineError::InvalidParameter(msg) => write!(f, "Invalid parameter: {}", msg),
                VideoEngineError::ResourceUnavailable(msg) => write!(f, "Resource unavailable: {}", msg),
                VideoEngineError::Unknown(msg) => write!(f, "Unknown error: {}", msg),
            }
        }
    }
    
    impl std::error::Error for VideoEngineError {}
    
    /// Create initialization error
    pub fn initialization_failed<T: Into<String>>(msg: T) -> VideoEngineError {
        VideoEngineError::InitializationFailed(msg.into())
    }
    
    /// Create decoding error
    pub fn decoding_failed<T: Into<String>>(msg: T) -> VideoEngineError {
        VideoEngineError::DecodingFailed(msg.into())
    }
    
    /// Create buffer overflow error
    pub fn buffer_overflow<T: Into<String>>(msg: T) -> VideoEngineError {
        VideoEngineError::BufferOverflow(msg.into())
    }
    
    /// Create invalid parameter error
    pub fn invalid_parameter<T: Into<String>>(msg: T) -> VideoEngineError {
        VideoEngineError::InvalidParameter(msg.into())
    }
    
    /// Create resource unavailable error
    pub fn resource_unavailable<T: Into<String>>(msg: T) -> VideoEngineError {
        VideoEngineError::ResourceUnavailable(msg.into())
    }
    
    /// Create unknown error
    pub fn unknown<T: Into<String>>(msg: T) -> VideoEngineError {
        VideoEngineError::Unknown(msg.into())
    }
}

/// Logging utilities
pub mod logging {
    use log::Level;
    
    /// Initialize logging with custom configuration
    pub fn init_logging(level: Level) -> Result<(), Box<dyn std::error::Error>> {
        env_logger::Builder::from_default_env()
            .filter_level(level.to_level_filter())
            .init();
        
        info!("Logging initialized at level: {:?}", level);
        Ok(())
    }
    
    /// Log performance metrics
    pub fn log_performance(operation: &str, duration_ms: u64, details: Option<&str>) {
        let details_str = details.map(|d| format!(" ({})", d)).unwrap_or_default();
        info!("Performance: {} took {}ms{}", operation, duration_ms, details_str);
    }
    
    /// Log memory usage
    pub fn log_memory_usage(component: &str, bytes: usize) {
        info!("Memory: {} using {} ({})", component, bytes, crate::utils::bytes::format_bytes(bytes));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_cstr_to_string() {
        let test_string = "Hello, World!";
        let cstring = CString::new(test_string).unwrap();
        let result = cstr_to_string(cstring.as_ptr());
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), test_string);
    }
    
    #[test]
    fn test_cstr_to_string_null() {
        let result = cstr_to_string(std::ptr::null());
        assert!(result.is_err());
    }
    
    #[test]
    fn test_alignment() {
        assert_eq!(alignment::align_size(10, 8), 16);
        assert_eq!(alignment::align_size(16, 8), 16);
        assert_eq!(alignment::align_size(17, 8), 24);
    }
    
    #[test]
    fn test_time_utilities() {
        let timestamp = time::current_timestamp_ms();
        assert!(timestamp > 0);
        
        let formatted = time::format_timestamp(timestamp);
        assert!(!formatted.is_empty());
    }
    
    #[test]
    fn test_math_utilities() {
        assert_eq!(math::clamp(5, 0, 10), 5);
        assert_eq!(math::clamp(-5, 0, 10), 0);
        assert_eq!(math::clamp(15, 0, 10), 10);
        
        assert_eq!(math::lerp(0.0, 10.0, 0.5), 5.0);
        assert_eq!(math::map_range(5.0, 0.0, 10.0, 0.0, 100.0), 50.0);
    }
    
    #[test]
    fn test_bytes_utilities() {
        assert_eq!(bytes::format_bytes(0), "0 B");
        assert_eq!(bytes::format_bytes(1024), "1.00 KB");
        assert_eq!(bytes::format_bytes(1048576), "1.00 MB");
        
        let data = vec![1, 2, 3, 4, 5];
        let checksum = bytes::calculate_checksum(&data);
        assert!(bytes::validate_checksum(&data, checksum));
    }
    
    #[test]
    fn test_error_utilities() {
        let error = error::initialization_failed("Test error");
        assert!(matches!(error, error::VideoEngineError::InitializationFailed(_)));
        
        let error_str = format!("{}", error);
        assert!(error_str.contains("Initialization failed"));
    }
}
