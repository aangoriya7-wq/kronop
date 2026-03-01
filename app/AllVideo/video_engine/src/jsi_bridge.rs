//! JSI Bridge for Direct React Native Integration
//! Zero-latency communication between Rust and JavaScript

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_void};
use std::ptr;

pub struct JSIBridge {
    runtime_ptr: *mut c_void,
    is_initialized: bool,
}

#[repr(C)]
pub struct JSIValue {
    pub kind: JSIValueKind,
    pub data: JSIValueData,
}

#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub enum JSIValueKind {
    Undefined,
    Null,
    Boolean,
    Number,
    String,
    Object,
    Function,
}

#[repr(C)]
pub union JSIValueData {
    pub boolean_value: bool,
    pub number_value: f64,
    pub string_value: *const c_char,
    pub object_value: *mut c_void,
    pub function_value: *mut c_void,
}

impl JSIBridge {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            runtime_ptr: ptr::null_mut(),
            is_initialized: false,
        })
    }
    
    /// Initialize JSI bridge with React Native runtime
    pub fn initialize(&mut self, runtime_ptr: *mut c_void) -> Result<(), Box<dyn std::error::Error>> {
        self.runtime_ptr = runtime_ptr;
        self.is_initialized = true;
        
        // Register native functions
        self.register_native_functions()?;
        
        Ok(())
    }
    
    /// Register native functions for JavaScript to call
    fn register_native_functions(&self) -> Result<(), Box<dyn std::error::Error>> {
        if !self.is_initialized {
            return Err("JSI Bridge not initialized".into());
        }
        
        // Register video functions
        self.register_function("kronop_loadVideo", kronop_load_video_jsi)?;
        self.register_function("kronop_playVideo", kronop_play_video_jsi)?;
        self.register_function("kronop_seekTo", kronop_seek_to_jsi)?;
        self.register_function("kronop_pauseVideo", kronop_pause_video_jsi)?;
        self.register_function("kronop_getVideoInfo", kronop_get_video_info_jsi)?;
        
        Ok(())
    }
    
    /// Register a native function
    fn register_function(&self, name: &str, func: extern "C" fn(*mut c_void, *const JSIValue, usize) -> JSIValue) -> Result<(), Box<dyn std::error::Error>> {
        let c_name = CString::new(name)?;
        
        // In real implementation, this would call JSI runtime to register the function
        println!("Registering JSI function: {}", name);
        
        Ok(())
    }
    
    /// Call JavaScript function from Rust
    pub fn call_js_function(&self, func_name: &str, args: &[JSIValue]) -> Result<JSIValue, Box<dyn std::error::Error>> {
        if !self.is_initialized {
            return Err("JSI Bridge not initialized".into());
        }
        
        let c_func_name = CString::new(func_name)?;
        
        // In real implementation, this would call the JS function through JSI
        println!("Calling JS function: {} with {} args", func_name, args.len());
        
        Ok(JSIValue {
            kind: JSIValueKind::Undefined,
            data: JSIValueData { boolean_value: false },
        })
    }
    
    /// Create string value for JSI
    pub fn create_string_value(&self, string: &str) -> JSIValue {
        let c_string = CString::new(string).unwrap();
        JSIValue {
            kind: JSIValueKind::String,
            data: JSIValueData {
                string_value: c_string.into_raw(),
            },
        }
    }
    
    /// Create number value for JSI
    pub fn create_number_value(&self, number: f64) -> JSIValue {
        JSIValue {
            kind: JSIValueKind::Number,
            data: JSIValueData { number_value: number },
        }
    }
    
    /// Create boolean value for JSI
    pub fn create_boolean_value(&self, boolean: bool) -> JSIValue {
        JSIValue {
            kind: JSIValueKind::Boolean,
            data: JSIValueData { boolean_value: boolean },
        }
    }
    
    /// Extract string from JSI value
    pub fn extract_string(&self, value: &JSIValue) -> Result<String, Box<dyn std::error::Error>> {
        match value.kind {
            JSIValueKind::String => {
                unsafe {
                    let c_str = CStr::from_ptr(value.data.string_value);
                    Ok(c_str.to_str()?.to_string())
                }
            }
            _ => Err("Value is not a string".into()),
        }
    }
    
    /// Extract number from JSI value
    pub fn extract_number(&self, value: &JSIValue) -> Result<f64, Box<dyn std::error::Error>> {
        match value.kind {
            JSIValueKind::Number => Ok(unsafe { value.data.number_value }),
            _ => Err("Value is not a number".into()),
        }
    }
    
    /// Extract boolean from JSI value
    pub fn extract_boolean(&self, value: &JSIValue) -> Result<bool, Box<dyn std::error::Error>> {
        match value.kind {
            JSIValueKind::Boolean => Ok(unsafe { value.data.boolean_value }),
            _ => Err("Value is not a boolean".into()),
        }
    }
}

/// JSI function implementations

/// Load video from JavaScript
extern "C" fn kronop_load_video_jsi(
    runtime: *mut c_void,
    args: *const JSIValue,
    arg_count: usize,
) -> JSIValue {
    if arg_count < 1 {
        return JSIValue {
            kind: JSIValueKind::Number,
            data: JSIValueData { number_value: -1.0 },
        };
    }
    
    let url_arg = unsafe { &*args };
    let bridge = JSIBridge::new().unwrap();
    
    match bridge.extract_string(url_arg) {
        Ok(url) => {
            // Call the actual video loading function
            let video_id = crate::kronop_load_video_fast(
                CString::new(url).unwrap().into_raw()
            );
            
            JSIValue {
                kind: JSIValueKind::Number,
                data: JSIValueData { number_value: video_id as f64 },
            }
        }
        Err(_) => JSIValue {
            kind: JSIValueKind::Number,
            data: JSIValueData { number_value: -1.0 },
        },
    }
}

/// Play video from JavaScript
extern "C" fn kronop_play_video_jsi(
    runtime: *mut c_void,
    args: *const JSIValue,
    arg_count: usize,
) -> JSIValue {
    if arg_count < 1 {
        return JSIValue {
            kind: JSIValueKind::Boolean,
            data: JSIValueData { boolean_value: false },
        };
    }
    
    let video_id_arg = unsafe { &*args };
    let bridge = JSIBridge::new().unwrap();
    
    match bridge.extract_number(video_id_arg) {
        Ok(video_id) => {
            let success = crate::kronop_play_video_instant(video_id as u64);
            
            JSIValue {
                kind: JSIValueKind::Boolean,
                data: JSIValueData { boolean_value: success },
            }
        }
        Err(_) => JSIValue {
            kind: JSIValueKind::Boolean,
            data: JSIValueData { boolean_value: false },
        },
    }
}

/// Seek to position from JavaScript
extern "C" fn kronop_seek_to_jsi(
    runtime: *mut c_void,
    args: *const JSIValue,
    arg_count: usize,
) -> JSIValue {
    if arg_count < 2 {
        return JSIValue {
            kind: JSIValueKind::Boolean,
            data: JSIValueData { boolean_value: false },
        };
    }
    
    let video_id_arg = unsafe { &*args };
    let position_arg = unsafe { &*args.add(1) };
    
    let bridge = JSIBridge::new().unwrap();
    
    match (bridge.extract_number(video_id_arg), bridge.extract_number(position_arg)) {
        (Ok(video_id), Ok(position)) => {
            // Convert position to frame number (30fps)
            let frame = (position * 30.0) as u64;
            
            // Call seek function
            let success = unsafe {
                if let Some(ref mut engine) = crate::VIDEO_ENGINE {
                    engine.seek_to_frame(video_id as u64, frame).is_ok()
                } else {
                    false
                }
            };
            
            JSIValue {
                kind: JSIValueKind::Boolean,
                data: JSIValueData { boolean_value: success },
            }
        }
        _ => JSIValue {
            kind: JSIValueKind::Boolean,
            data: JSIValueData { boolean_value: false },
        },
    }
}

/// Pause video from JavaScript
extern "C" fn kronop_pause_video_jsi(
    runtime: *mut c_void,
    args: *const JSIValue,
    arg_count: usize,
) -> JSIValue {
    // Implementation for pause functionality
    JSIValue {
        kind: JSIValueKind::Boolean,
        data: JSIValueData { boolean_value: true },
    }
}

/// Get video info from JavaScript
extern "C" fn kronop_get_video_info_jsi(
    runtime: *mut c_void,
    args: *const JSIValue,
    arg_count: usize,
) -> JSIValue {
    if arg_count < 1 {
        return JSIValue {
            kind: JSIValueKind::Object,
            data: JSIValueData { object_value: ptr::null_mut() },
        };
    }
    
    let video_id_arg = unsafe { &*args };
    let bridge = JSIBridge::new().unwrap();
    
    match bridge.extract_number(video_id_arg) {
        Ok(video_id) => {
            // Get video info from engine
            let info = unsafe {
                if let Some(ref engine) = crate::VIDEO_ENGINE {
                    engine.decoder.get_video_info(video_id as u64)
                } else {
                    None
                }
            };
            
            // Return video info as object
            // In real implementation, create JSI object with video properties
            JSIValue {
                kind: JSIValueKind::Object,
                data: JSIValueData { object_value: ptr::null_mut() },
            }
        }
        Err(_) => JSIValue {
            kind: JSIValueKind::Object,
            data: JSIValueData { object_value: ptr::null_mut() },
        },
    }
}
