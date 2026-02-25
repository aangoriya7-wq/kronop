// memory_safe.rs - Memory Safety Guard for Long Videos
// Prevents crashes during 1-2 hour video playback

use std::sync::{Arc, Mutex, RwLock};
use std::collections::{VecDeque, HashMap};
use std::time::{Duration, Instant};
use std::mem;
use std::ptr;
use std::alloc::{self, Layout};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};

// Memory pool for efficient allocation
pub struct MemoryPool<T> {
    pool: Mutex<Vec<Box<T>>>,
    max_size: usize,
    allocations: AtomicUsize,
}

impl<T> MemoryPool<T> {
    pub fn new(max_size: usize) -> Self {
        MemoryPool {
            pool: Mutex::new(Vec::with_capacity(max_size)),
            max_size,
            allocations: AtomicUsize::new(0),
        }
    }
    
    pub fn acquire(&self) -> Option<Box<T>> {
        let mut pool = self.pool.lock().unwrap();
        if let Some(item) = pool.pop() {
            self.allocations.fetch_add(1, Ordering::Relaxed);
            Some(item)
        } else if self.allocations.load(Ordering::Relaxed) < self.max_size {
            self.allocations.fetch_add(1, Ordering::Relaxed);
            Some(Box::new(unsafe { mem::zeroed() }))
        } else {
            None
        }
    }
    
    pub fn release(&self, item: Box<T>) {
        let mut pool = self.pool.lock().unwrap();
        if pool.len() < self.max_size {
            pool.push(item);
        }
        self.allocations.fetch_sub(1, Ordering::Relaxed);
    }
}

// Frame buffer manager with leak prevention
pub struct FrameBufferManager {
    buffers: Arc<RwLock<VecDeque<Vec<u8>>>>,
    max_buffers: usize,
    buffer_size: usize,
    memory_usage: Arc<AtomicUsize>,
    max_memory_mb: usize,
}

impl FrameBufferManager {
    pub fn new(max_buffers: usize, buffer_size: usize, max_memory_mb: usize) -> Self {
        FrameBufferManager {
            buffers: Arc::new(RwLock::new(VecDeque::with_capacity(max_buffers))),
            max_buffers,
            buffer_size,
            memory_usage: Arc::new(AtomicUsize::new(0)),
            max_memory_mb: max_memory_mb * 1024 * 1024,
        }
    }
    
    pub fn get_buffer(&self) -> Option<Vec<u8>> {
        let memory_current = self.memory_usage.load(Ordering::Relaxed);
        
        // Check if we're near memory limit
        if memory_current + self.buffer_size > self.max_memory_mb {
            // Force garbage collection
            self.collect_garbage();
            
            if memory_current + self.buffer_size > self.max_memory_mb {
                return None; // Still over limit
            }
        }
        
        // Try to get from pool
        let mut buffers = self.buffers.write().unwrap();
        if let Some(buffer) = buffers.pop_front() {
            self.memory_usage.fetch_add(self.buffer_size, Ordering::Relaxed);
            Some(buffer)
        } else {
            // Allocate new buffer
            self.memory_usage.fetch_add(self.buffer_size, Ordering::Relaxed);
            Some(vec![0u8; self.buffer_size])
        }
    }
    
    pub fn return_buffer(&self, buffer: Vec<u8>) {
        let mut buffers = self.buffers.write().unwrap();
        if buffers.len() < self.max_buffers {
            buffers.push_back(buffer);
        }
        self.memory_usage.fetch_sub(self.buffer_size, Ordering::Relaxed);
    }
    
    fn collect_garbage(&self) {
        let mut buffers = self.buffers.write().unwrap();
        // Keep only 25% of buffers during GC
        let keep_count = self.max_buffers / 4;
        while buffers.len() > keep_count {
            buffers.pop_front();
        }
    }
    
    pub fn get_memory_usage_mb(&self) -> usize {
        self.memory_usage.load(Ordering::Relaxed) / (1024 * 1024)
    }
}

// Zero-copy buffer for video frames
#[repr(align(64))]
pub struct AlignedBuffer {
    data: Vec<u8>,
    layout: Layout,
}

impl AlignedBuffer {
    pub fn new(size: usize, alignment: usize) -> Result<Self, &'static str> {
        unsafe {
            let layout = Layout::from_size_align(size, alignment)
                .map_err(|_| "Invalid layout")?;
            let ptr = alloc::alloc(layout);
            if ptr.is_null() {
                Err("Allocation failed")
            } else {
                Ok(AlignedBuffer {
                    data: Vec::from_raw_parts(ptr, size, size),
                    layout,
                })
            }
        }
    }
    
    pub fn as_ptr(&self) -> *const u8 {
        self.data.as_ptr()
    }
    
    pub fn as_mut_ptr(&mut self) -> *mut u8 {
        self.data.as_mut_ptr()
    }
}

// Memory leak detector
pub struct LeakDetector {
    allocations: Mutex<HashMap<usize, AllocationInfo>>,
    next_id: AtomicUsize,
}

struct AllocationInfo {
    size: usize,
    backtrace: String,
    time: Instant,
}

impl LeakDetector {
    pub fn new() -> Self {
        LeakDetector {
            allocations: Mutex::new(HashMap::new()),
            next_id: AtomicUsize::new(1),
        }
    }
    
    pub fn track_allocation(&self, size: usize) -> usize {
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let info = AllocationInfo {
            size,
            backtrace: self.capture_backtrace(),
            time: Instant::now(),
        };
        
        let mut allocations = self.allocations.lock().unwrap();
        allocations.insert(id, info);
        id
    }
    
    pub fn track_deallocation(&self, id: usize) -> bool {
        let mut allocations = self.allocations.lock().unwrap();
        allocations.remove(&id).is_some()
    }
    
    fn capture_backtrace(&self) -> String {
        // In real implementation, capture actual backtrace
        format!("Backtrace at {:?}", Instant::now())
    }
    
    pub fn report_leaks(&self) -> Vec<(usize, AllocationInfo)> {
        let allocations = self.allocations.lock().unwrap();
        allocations.iter()
            .filter(|(_, info)| info.time.elapsed() > Duration::from_secs(300))
            .map(|(id, info)| (*id, info))
            .collect()
    }
}

// Smart pointer with automatic memory management
pub struct SmartFrame<T> {
    data: Option<Box<T>>,
    manager: Arc<MemoryPool<T>>,
}

impl<T> SmartFrame<T> {
    pub fn new(manager: Arc<MemoryPool<T>>) -> Option<Self> {
        if let Some(data) = manager.acquire() {
            Some(SmartFrame {
                data: Some(data),
                manager,
            })
        } else {
            None
        }
    }
    
    pub fn as_ref(&self) -> Option<&T> {
        self.data.as_ref()
    }
    
    pub fn as_mut(&mut self) -> Option<&mut T> {
        self.data.as_mut()
    }
}

impl<T> Drop for SmartFrame<T> {
    fn drop(&mut self) {
        if let Some(data) = self.data.take() {
            self.manager.release(data);
        }
    }
}

// Main memory safety orchestrator
pub struct MemorySafetyGuard {
    frame_buffer_manager: FrameBufferManager,
    leak_detector: LeakDetector,
    memory_pool: Arc<MemoryPool<[u8; 1920*1080*4]>>, // 1080p frame pool
    memory_limit_mb: usize,
    current_usage_mb: Arc<AtomicUsize>,
    warning_threshold: f32,
    critical_threshold: f32,
}

impl MemorySafetyGuard {
    pub fn new() -> Self {
        MemorySafetyGuard {
            frame_buffer_manager: FrameBufferManager::new(
                30, // max buffers
                1920 * 1080 * 4, // 1080p RGBA frame size
                512 // max 512MB memory
            ),
            leak_detector: LeakDetector::new(),
            memory_pool: Arc::new(MemoryPool::new(10)),
            memory_limit_mb: 512,
            current_usage_mb: Arc::new(AtomicUsize::new(0)),
            warning_threshold: 0.7,
            critical_threshold: 0.9,
        }
    }
    
    pub fn allocate_frame(&self) -> Option<Vec<u8>> {
        self.frame_buffer_manager.get_buffer()
    }
    
    pub fn free_frame(&self, frame: Vec<u8>) {
        self.frame_buffer_manager.return_buffer(frame);
    }
    
    pub fn create_smart_frame(&self) -> Option<SmartFrame<[u8; 1920*1080*4]>> {
        SmartFrame::new(self.memory_pool.clone())
    }
    
    pub fn track_operation(&self, operation_id: &str, size: usize) -> TrackedOperation {
        let id = self.leak_detector.track_allocation(size);
        TrackedOperation::new(id, operation_id.to_string(), size)
    }
    
    pub fn check_memory_health(&self) -> MemoryHealth {
        let usage_mb = self.frame_buffer_manager.get_memory_usage_mb();
        let usage_ratio = usage_mb as f32 / self.memory_limit_mb as f32;
        
        if usage_ratio > self.critical_threshold {
            MemoryHealth::Critical
        } else if usage_ratio > self.warning_threshold {
            MemoryHealth::Warning
        } else {
            MemoryHealth::Healthy
        }
    }
    
    pub fn force_cleanup(&self) {
        self.frame_buffer_manager.collect_garbage();
        
        // Report any leaks
        let leaks = self.leak_detector.report_leaks();
        if !leaks.is_empty() {
            eprintln!("Detected {} potential memory leaks", leaks.len());
            for (id, info) in leaks {
                eprintln!("Leak ID: {}, Size: {} bytes, Time: {:?}, {}", 
                         id, info.size, info.time, info.backtrace);
            }
        }
    }
    
    pub fn get_stats(&self) -> MemoryStats {
        MemoryStats {
            current_mb: self.frame_buffer_manager.get_memory_usage_mb(),
            limit_mb: self.memory_limit_mb,
            buffer_count: 0, // Would need to expose from manager
            leak_count: self.leak_detector.report_leaks().len(),
        }
    }
}

pub struct TrackedOperation {
    id: usize,
    name: String,
    size: usize,
    start_time: Instant,
}

impl TrackedOperation {
    fn new(id: usize, name: String, size: usize) -> Self {
        TrackedOperation {
            id,
            name,
            size,
            start_time: Instant::now(),
        }
    }
}

impl Drop for TrackedOperation {
    fn drop(&mut self) {
        let duration = self.start_time.elapsed();
        if duration > Duration::from_secs(10) {
            eprintln!("Warning: Operation '{}' took {:?} and used {} bytes",
                     self.name, duration, self.size);
        }
    }
}

pub enum MemoryHealth {
    Healthy,
    Warning,
    Critical,
}

pub struct MemoryStats {
    pub current_mb: usize,
    pub limit_mb: usize,
    pub buffer_count: usize,
    pub leak_count: usize,
}

// Global memory guard instance
lazy_static::lazy_static! {
    static ref MEMORY_GUARD: MemorySafetyGuard = MemorySafetyGuard::new();
}

#[no_mangle]
pub extern "C" fn init_memory_guard() {
    // Initialize memory guard
}

#[no_mangle]
pub extern "C" fn allocate_video_frame() -> *mut u8 {
    if let Some(mut frame) = MEMORY_GUARD.allocate_frame() {
        let ptr = frame.as_mut_ptr();
        std::mem::forget(frame); // Prevent drop, will be manually managed
        ptr
    } else {
        ptr::null_mut()
    }
}

#[no_mangle]
pub extern "C" fn free_video_frame(ptr: *mut u8, size: usize) {
    if !ptr.is_null() {
        unsafe {
            let _ = Vec::from_raw_parts(ptr, size, size);
        }
    }
}

#[no_mangle]
pub extern "C" fn get_memory_usage() -> u32 {
    MEMORY_GUARD.get_stats().current_mb as u32
}

#[no_mangle]
pub extern "C" fn check_memory_critical() -> bool {
    match MEMORY_GUARD.check_memory_health() {
        MemoryHealth::Critical => true,
        _ => false,
    }
}

#[no_mangle]
pub extern "C" fn perform_cleanup() {
    MEMORY_GUARD.force_cleanup();
}
