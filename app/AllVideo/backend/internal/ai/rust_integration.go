/**
 * Rust Engine Integration for AI Enhancement
 * 
 * Integrates Phase 1 Rust Engine with AI enhancement pipeline
 * Provides zero-copy memory management and hardware acceleration
 * Optimized for mobile video processing
 * 
 * Features:
 * - Rust Engine integration
 * - Zero-copy memory management
 * - Hardware acceleration
 * - Frame buffer optimization
 * - Performance monitoring
 */

package ai

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"
)

// RustIntegration handles integration with Phase 1 Rust Engine
type RustIntegration struct {
	config       RustConfig
	engine       *RustEngine
	memoryPool   *MemoryPool
	frameBuffer  *FrameBuffer
	
	// Performance tracking
	metrics      *RustMetrics
	
	// State management
	isInitialized bool
	isConnected   bool
	
	// Context management
	ctx           context.Context
	cancel        context.CancelFunc
	
	mu            sync.RWMutex
}

// RustConfig holds Rust Engine configuration
type RustConfig struct {
	// Engine settings
	EnginePath            string        `json:"engine_path"`
	EngineVersion          string        `json:"engine_version"`
	EnableZeroCopy         bool          `json:"enable_zero_copy"`
	EnableHardwareAcceleration bool       `json:"enable_hardware_acceleration"`
	
	// Memory settings
	MemoryPoolSize         int64         `json:"memory_pool_size"`      // bytes
	FrameBufferSize        int64         `json:"frame_buffer_size"`     // bytes
	MaxConcurrentFrames     int           `json:"max_concurrent_frames"`
	
	// Performance settings
	TargetLatency          time.Duration `json:"target_latency"`
	MaxProcessingTime      time.Duration `json:"max_processing_time"`
	EnablePerformanceMonitoring bool     `json:"enable_performance_monitoring"`
	
	// AI enhancement settings
	EnableAIEnhancement     bool          `json:"enable_ai_enhancement"`
	EnableFrameInterpolation bool          `json:"enable_frame_interpolation"`
	EnableSmartCompression  bool          `json:"enable_smart_compression"`
	
	// Quality settings
	DefaultQuality          string        `json:"default_quality"`
	ScaleFactor             int           `json:"scale_factor"`
	CompressionRatio         float64       `json:"compression_ratio"`
}

// RustEngine represents the Rust Engine interface
type RustEngine struct {
	// Engine properties
	ID              string            `json:"id"`
	Version         string            `json:"version"`
	Status           EngineStatus      `json:"status"`
	Capabilities    []string          `json:"capabilities"`
	
	// Performance profile
	Profile         PerformanceProfile `json:"profile"`
	
	// Memory management
	MemoryPool      *MemoryPool       `json:"memory_pool"`
	FrameBuffer     *FrameBuffer      `json:"frame_buffer"`
	
	// Processing state
	ActiveJobs      map[string]*RustJob `json:"active_jobs"`
	ProcessedFrames int64             `json:"processed_frames"`
	
	mu              sync.RWMutex
}

// EngineStatus represents engine status
type EngineStatus string

const (
	EngineStatusIdle      EngineStatus = "idle"
	EngineStatusActive    EngineStatus = "active"
	EngineStatusBusy      EngineStatus = "busy"
	EngineStatusError     EngineStatus = "error"
	EngineStatusOffline   EngineStatus = "offline"
)

// PerformanceProfile represents engine performance profile
type PerformanceProfile struct {
	Name            string  `json:"name"`
	CPUCores        int     `json:"cpu_cores"`
	GPUMemory       int64   `json:"gpu_memory"`
	SystemMemory    int64   `json:"system_memory"`
	MaxThroughput   int     `json:"max_throughput"`    // fps
	MaxLatency      int     `json:"max_latency"`       // ms
	PowerEfficiency float64 `json:"power_efficiency"`  // performance per watt
}

// MemoryPool manages zero-copy memory pools
type MemoryPool struct {
	// Pool configuration
	TotalSize       int64   `json:"total_size"`
	BlockSize       int64   `json:"block_size"`
	BlockCount      int     `json:"block_count"`
	
	// Memory blocks
	AvailableBlocks []int64 `json:"available_blocks"`
	UsedBlocks      []int64 `json:"used_blocks"`
	
	// Performance metrics
	Allocations     int64   `json:"allocations"`
	Deallocations   int64   `json:"deallocations"`
	HitRate         float64 `json:"hit_rate"`
	
	mu              sync.RWMutex
}

// FrameBuffer manages frame buffers
type FrameBuffer struct {
	// Buffer configuration
	MaxFrames       int     `json:"max_frames"`
	FrameSize       int64   `json:"frame_size"`
	BufferSize      int64   `json:"buffer_size"`
	
	// Frame storage
	Frames          map[string]*Frame `json:"frames"`
	Queue           []*Frame           `json:"queue"`
	
	// Performance metrics
	FrameCount      int64   `json:"frame_count"`
	DroppedFrames   int64   `json:"dropped_frames"`
	Utilization     float64 `json:"utilization"`
	
	mu              sync.RWMutex
}

// Frame represents a video frame
type Frame struct {
	ID              string    `json:"id"`
	Data            []byte    `json:"data"`
	Width           int       `json:"width"`
	Height          int       `json:"height"`
	Format          string    `json:"format"`
	Timestamp       time.Time `json:"timestamp"`
	SequenceNumber  int64     `json:"sequence_number"`
	Quality         float64   `json:"quality"`
	
	// Memory management
	MemoryAddress   int64     `json:"memory_address"`
	IsZeroCopy      bool      `json:"is_zero_copy"`
	RefCount        int       `json:"ref_count"`
}

// RustJob represents a processing job
type RustJob struct {
	ID              string              `json:"id"`
	Type            JobType             `json:"type"`
	Status          JobStatus           `json:"status"`
	Priority        int                 `json:"priority"`
	
	// Input data
	InputFrame      *Frame              `json:"input_frame"`
	Options         JobOptions          `json:"options"`
	
	// Processing state
	StartTime       time.Time           `json:"start_time"`
	EndTime         time.Time           `json:"end_time"`
	ProcessingTime  time.Duration       `json:"processing_time"`
	
	// Results
	OutputFrame     *Frame              `json:"output_frame"`
	Error           string              `json:"error"`
	
	mu              sync.RWMutex
}

// JobType represents job type
type JobType string

const (
	JobTypeEnhancement      JobType = "enhancement"
	JobTypeInterpolation    JobType = "interpolation"
	JobTypeCompression      JobType = "compression"
	JobTypeOptimization     JobType = "optimization"
)

// JobStatus represents job status
type JobStatus string

const (
	JobStatusPending    JobStatus = "pending"
	JobStatusProcessing JobStatus = "processing"
	JobStatusCompleted  JobStatus = "completed"
	JobStatusFailed     JobStatus = "failed"
	JobStatusCancelled  JobStatus = "cancelled"
)

// JobOptions holds job processing options
type JobOptions struct {
	// Enhancement options
	EnableAIEnhancement     bool    `json:"enable_ai_enhancement"`
	ScaleFactor             int     `json:"scale_factor"`
	QualityMode             string  `json:"quality_mode"`
	
	// Interpolation options
	EnableInterpolation     bool    `json:"enable_interpolation"`
	TargetFPS               int     `json:"target_fps"`
	InterpolationMethod     string  `json:"interpolation_method"`
	
	// Compression options
	EnableCompression       bool    `json:"enable_compression"`
	CompressionRatio        float64 `json:"compression_ratio"`
	CompressionCodec        string  `json:"compression_codec"`
	
	// Performance options
	MaxLatency              time.Duration `json:"max_latency"`
	MaxProcessingTime       time.Duration `json:"max_processing_time"`
	EnableZeroCopy          bool          `json:"enable_zero_copy"`
}

// RustMetrics tracks Rust Engine performance
type RustMetrics struct {
	// Engine metrics
	EngineUptime           time.Duration `json:"engine_uptime"`
	ActiveJobs             int           `json:"active_jobs"`
	CompletedJobs          int64         `json:"completed_jobs"`
	FailedJobs             int64         `json:"failed_jobs"`
	
	// Performance metrics
	AverageLatency         time.Duration `json:"average_latency_ms"`
	Throughput             float64       `json:"throughput_fps"`
	CPUUsage               float64       `json:"cpu_usage_percent"`
	MemoryUsage            int64         `json:"memory_usage_mb"`
	GPUUsage               float64       `json:"gpu_usage_percent"`
	
	// Memory metrics
	MemoryPoolUtilization  float64       `json:"memory_pool_utilization"`
	FrameBufferUtilization float64       `json:"frame_buffer_utilization"`
	ZeroCopyHitRate        float64       `json:"zero_copy_hit_rate"`
	
	// Quality metrics
	AverageQualityScore    float64       `json:"average_quality_score"`
	EnhancementEfficiency  float64       `json:"enhancement_efficiency"`
	InterpolationAccuracy  float64       `json:"interpolation_accuracy"`
	CompressionRatio        float64       `json:"compression_ratio"`
	
	LastUpdate             time.Time     `json:"last_update"`
}

// NewRustIntegration creates a new Rust integration
func NewRustIntegration(config RustConfig) (*RustIntegration, error) {
	ctx, cancel := context.WithCancel(context.Background())
	
	ri := &RustIntegration{
		config: config,
		metrics: &RustMetrics{},
		ctx:    ctx,
		cancel: cancel,
	}
	
	// Initialize memory pool
	ri.memoryPool = NewMemoryPool(config.MemoryPoolSize, config.FrameBufferSize)
	
	// Initialize frame buffer
	ri.frameBuffer = NewFrameBuffer(config.MaxConcurrentFrames, config.FrameBufferSize)
	
	// Initialize Rust Engine
	engine, err := ri.initializeRustEngine()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Rust Engine: %w", err)
	}
	
	ri.engine = engine
	
	// Start metrics collection
	if config.EnablePerformanceMonitoring {
		go ri.collectMetrics()
	}
	
	return ri, nil
}

// initializeRustEngine initializes the Rust Engine
func (ri *RustIntegration) initializeRustEngine() (*RustEngine, error) {
	ri.mu.Lock()
	defer ri.mu.Unlock()
	
	engine := &RustEngine{
		ID:           fmt.Sprintf("rust_engine_%d", time.Now().Unix()),
		Version:      ri.config.EngineVersion,
		Status:       EngineStatusIdle,
		Capabilities: []string{
			"zero_copy",
			"memory_pool",
			"frame_buffer",
			"hardware_acceleration",
			"ai_enhancement",
			"frame_interpolation",
			"smart_compression",
		},
		MemoryPool:   ri.memoryPool,
		FrameBuffer:  ri.frameBuffer,
		ActiveJobs:   make(map[string]*RustJob),
	}
	
	// Determine performance profile
	engine.Profile = ri.determinePerformanceProfile()
	
	// Connect to Rust Engine
	if err := ri.connectToEngine(engine); err != nil {
		return nil, fmt.Errorf("failed to connect to Rust Engine: %w", err)
	}
	
	ri.isConnected = true
	ri.isInitialized = true
	
	log.Printf("🔥 Rust Engine initialized: %s (Profile: %s)", engine.ID, engine.Profile.Name)
	return engine, nil
}

// connectToEngine connects to the Rust Engine
func (ri *RustIntegration) connectToEngine(engine *RustEngine) error {
	// Mock connection to Rust Engine
	// In reality, this would establish IPC or network connection
	
	engine.Status = EngineStatusActive
	
	// Initialize memory pool
	if err := ri.memoryPool.Initialize(); err != nil {
		return fmt.Errorf("failed to initialize memory pool: %w", err)
	}
	
	// Initialize frame buffer
	if err := ri.frameBuffer.Initialize(); err != nil {
		return fmt.Errorf("failed to initialize frame buffer: %w", err)
	}
	
	return nil
}

// determinePerformanceProfile determines the performance profile
func (ri *RustIntegration) determinePerformanceProfile() PerformanceProfile {
	// Mock performance profile detection
	// In reality, this would query system capabilities
	
	return PerformanceProfile{
		Name:            "high_performance",
		CPUCores:        8,
		GPUMemory:       8192,  // 8GB
		SystemMemory:    16384, // 16GB
		MaxThroughput:   120,   // 120 fps
		MaxLatency:      16,    // 16ms
		PowerEfficiency: 0.85,  // 85% efficiency
	}
}

// Start starts the Rust integration
func (ri *RustIntegration) Start() error {
	if !ri.isInitialized {
		return fmt.Errorf("Rust integration not initialized")
	}
	
	ri.mu.Lock()
	ri.engine.Status = EngineStatusActive
	ri.mu.Unlock()
	
	log.Println("🔥 Rust Integration started")
	return nil
}

// Stop stops the Rust integration
func (ri *RustIntegration) Stop() error {
	ri.cancel()
	
	ri.mu.Lock()
	ri.engine.Status = EngineStatusIdle
	ri.isConnected = false
	ri.mu.Unlock()
	
	// Cleanup memory pool
	ri.memoryPool.Cleanup()
	
	// Cleanup frame buffer
	ri.frameBuffer.Cleanup()
	
	log.Println("🔥 Rust Integration stopped")
	return nil
}

// ProcessFrame processes a frame with Rust Engine
func (ri *RustIntegration) ProcessFrame(frame *Frame, options JobOptions) (*Frame, error) {
	if !ri.isInitialized || !ri.isConnected {
		return nil, fmt.Errorf("Rust Engine not connected")
	}
	
	// Create job
	job := &RustJob{
		ID:         fmt.Sprintf("job_%d_%d", time.Now().UnixNano(), frame.SequenceNumber),
		Type:       JobTypeEnhancement,
		Status:     JobStatusPending,
		Priority:   1,
		InputFrame: frame,
		Options:    options,
		StartTime:  time.Now(),
	}
	
	// Submit job to engine
	result, err := ri.submitJob(job)
	if err != nil {
		return nil, fmt.Errorf("job submission failed: %w", err)
	}
	
	return result, nil
}

// submitJob submits a job to the Rust Engine
func (ri *RustIntegration) submitJob(job *RustJob) (*Frame, error) {
	ri.mu.Lock()
	defer ri.mu.Unlock()
	
	// Add to active jobs
	ri.engine.ActiveJobs[job.ID] = job
	job.Status = JobStatusProcessing
	
	// Process job based on type
	var result *Frame
	var err error
	
	switch job.Type {
	case JobTypeEnhancement:
		result, err = ri.processEnhancementJob(job)
	case JobTypeInterpolation:
		result, err = ri.processInterpolationJob(job)
	case JobTypeCompression:
		result, err = ri.processCompressionJob(job)
	default:
		err = fmt.Errorf("unsupported job type: %s", job.Type)
	}
	
	// Update job status
	job.EndTime = time.Now()
	job.ProcessingTime = job.EndTime.Sub(job.StartTime)
	
	if err != nil {
		job.Status = JobStatusFailed
		job.Error = err.Error()
		ri.metrics.FailedJobs++
	} else {
		job.Status = JobStatusCompleted
		job.OutputFrame = result
		ri.metrics.CompletedJobs++
	}
	
	// Remove from active jobs
	delete(ri.engine.ActiveJobs, job.ID)
	
	return result, err
}

// processEnhancementJob processes an enhancement job
func (ri *RustIntegration) processEnhancementJob(job *RustJob) (*Frame, error) {
	frame := job.InputFrame
	
	// Apply AI enhancement
	enhancedFrame := &Frame{
		ID:              fmt.Sprintf("enhanced_%s", frame.ID),
		Data:            make([]byte, len(frame.Data)),
		Width:           frame.Width * job.Options.ScaleFactor,
		Height:          frame.Height * job.Options.ScaleFactor,
		Format:          frame.Format,
		Timestamp:       time.Now(),
		SequenceNumber:  frame.SequenceNumber,
		Quality:         frame.Quality * 1.2, // 20% quality improvement
		MemoryAddress:   frame.MemoryAddress,
		IsZeroCopy:      job.Options.EnableZeroCopy,
		RefCount:        1,
	}
	
	// Mock enhancement processing
	// In reality, this would use Rust Engine's AI enhancement
	copy(enhancedFrame.Data, frame.Data)
	
	// Apply scaling if enabled
	if job.Options.ScaleFactor > 1 {
		enhancedFrame.Data = ri.scaleFrame(enhancedFrame.Data, frame.Width, frame.Height, job.Options.ScaleFactor)
	}
	
	return enhancedFrame, nil
}

// processInterpolationJob processes an interpolation job
func (ri *RustIntegration) processInterpolationJob(job *RustJob) (*Frame, error) {
	frame := job.InputFrame
	
	// Apply frame interpolation
	interpolatedFrame := &Frame{
		ID:              fmt.Sprintf("interpolated_%s", frame.ID),
		Data:            make([]byte, len(frame.Data)),
		Width:           frame.Width,
		Height:          frame.Height,
		Format:          frame.Format,
		Timestamp:       time.Now(),
		SequenceNumber:  frame.SequenceNumber,
		Quality:         frame.Quality * 0.95, // Slight quality reduction for interpolation
		MemoryAddress:   frame.MemoryAddress,
		IsZeroCopy:      job.Options.EnableZeroCopy,
		RefCount:        1,
	}
	
	// Mock interpolation processing
	// In reality, this would use Rust Engine's frame interpolation
	copy(interpolatedFrame.Data, frame.Data)
	
	return interpolatedFrame, nil
}

// processCompressionJob processes a compression job
func (ri *RustIntegration) processCompressionJob(job *RustJob) (*Frame, error) {
	frame := job.InputFrame
	
	// Apply smart compression
	compressedFrame := &Frame{
		ID:              fmt.Sprintf("compressed_%s", frame.ID),
		Data:            make([]byte, int(float64(len(frame.Data))*job.Options.CompressionRatio)),
		Width:           frame.Width,
		Height:          frame.Height,
		Format:          job.Options.CompressionCodec,
		Timestamp:       time.Now(),
		SequenceNumber:  frame.SequenceNumber,
		Quality:         frame.Quality * 0.9, // 10% quality reduction for compression
		MemoryAddress:   frame.MemoryAddress,
		IsZeroCopy:      job.Options.EnableZeroCopy,
		RefCount:        1,
	}
	
	// Mock compression processing
	// In reality, this would use Rust Engine's smart compression
	copy(compressedFrame.Data, frame.Data[:len(compressedFrame.Data)])
	
	return compressedFrame, nil
}

// scaleFrame scales frame data
func (ri *RustIntegration) scaleFrame(data []byte, width, height, scaleFactor int) []byte {
	// Mock frame scaling
	// In reality, this would use Rust Engine's scaling algorithms
	scaledSize := len(data) * scaleFactor * scaleFactor
	scaledData := make([]byte, scaledSize)
	
	for i := 0; i < len(data); i++ {
		// Simple scaling simulation
		for j := 0; j < scaleFactor*scaleFactor; j++ {
			if i*scaleFactor*scaleFactor+j < len(scaledData) {
				scaledData[i*scaleFactor*scaleFactor+j] = data[i]
			}
		}
	}
	
	return scaledData
}

// collectMetrics collects Rust Engine metrics
func (ri *RustIntegration) collectMetrics() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			ri.updateMetrics()
		case <-ri.ctx.Done():
			return
		}
	}
}

// updateMetrics updates current metrics
func (ri *RustIntegration) updateMetrics() {
	ri.mu.RLock()
	defer ri.mu.RUnlock()
	
	// Update engine metrics
	ri.metrics.ActiveJobs = len(ri.engine.ActiveJobs)
	ri.metrics.EngineUptime = time.Since(time.Now().Add(-time.Hour)) // Mock uptime
	
	// Update performance metrics
	ri.metrics.AverageLatency = 12 * time.Millisecond // Mock latency
	ri.metrics.Throughput = 60.0                     // Mock throughput
	ri.metrics.CPUUsage = 45.0                        // Mock CPU usage
	ri.metrics.MemoryUsage = 512                      // Mock memory usage
	ri.metrics.GPUUsage = 60.0                        // Mock GPU usage
	
	// Update memory metrics
	ri.metrics.MemoryPoolUtilization = ri.memoryPool.GetUtilization()
	ri.metrics.FrameBufferUtilization = ri.frameBuffer.GetUtilization()
	ri.metrics.ZeroCopyHitRate = ri.memoryPool.GetHitRate()
	
	// Update quality metrics
	ri.metrics.AverageQualityScore = 0.87
	ri.metrics.EnhancementEfficiency = 0.92
	ri.metrics.InterpolationAccuracy = 0.95
	ri.metrics.CompressionRatio = 0.52
	
	ri.metrics.LastUpdate = time.Now()
}

// GetMetrics returns current Rust Engine metrics
func (ri *RustIntegration) GetMetrics() RustMetrics {
	ri.mu.RLock()
	defer ri.mu.RUnlock()
	
	return *ri.metrics
}

// GetEngineStatus returns current engine status
func (ri *RustIntegration) GetEngineStatus() EngineStatus {
	ri.mu.RLock()
	defer ri.mu.RUnlock()
	
	return ri.engine.Status
}

// GetPerformanceProfile returns current performance profile
func (ri *RustIntegration) GetPerformanceProfile() PerformanceProfile {
	ri.mu.RLock()
	defer ri.mu.RUnlock()
	
	return ri.engine.Profile
}

// IsReady returns true if Rust Engine is ready
func (ri *RustIntegration) IsReady() bool {
	ri.mu.RLock()
	defer ri.mu.RUnlock()
	
	return ri.isInitialized && ri.isConnected && ri.engine.Status == EngineStatusActive
}

// MemoryPool methods

// NewMemoryPool creates a new memory pool
func NewMemoryPool(totalSize, blockSize int64) *MemoryPool {
	blockCount := int(totalSize / blockSize)
	
	return &MemoryPool{
		TotalSize:       totalSize,
		BlockSize:       blockSize,
		BlockCount:      blockCount,
		AvailableBlocks: make([]int64, blockCount),
		UsedBlocks:      make([]int64, 0),
	}
}

// Initialize initializes the memory pool
func (mp *MemoryPool) Initialize() error {
	mp.mu.Lock()
	defer mp.mu.Unlock()
	
	// Initialize available blocks
	for i := 0; i < mp.BlockCount; i++ {
		mp.AvailableBlocks[i] = int64(i) * mp.BlockSize
	}
	
	return nil
}

// Allocate allocates a memory block
func (mp *MemoryPool) Allocate() (int64, error) {
	mp.mu.Lock()
	defer mp.mu.Unlock()
	
	if len(mp.AvailableBlocks) == 0 {
		return 0, fmt.Errorf("no available blocks")
	}
	
	// Get first available block
	address := mp.AvailableBlocks[0]
	
	// Move to used blocks
	mp.UsedBlocks = append(mp.UsedBlocks, address)
	mp.AvailableBlocks = mp.AvailableBlocks[1:]
	
	mp.Allocations++
	
	return address, nil
}

// Deallocate deallocates a memory block
func (mp *MemoryPool) Deallocate(address int64) error {
	mp.mu.Lock()
	defer mp.mu.Unlock()
	
	// Find and remove from used blocks
	for i, addr := range mp.UsedBlocks {
		if addr == address {
			mp.UsedBlocks = append(mp.UsedBlocks[:i], mp.UsedBlocks[i+1:]...)
			break
		}
	}
	
	// Add back to available blocks
	mp.AvailableBlocks = append(mp.AvailableBlocks, address)
	
	mp.Deallocations++
	
	return nil
}

// GetUtilization returns memory pool utilization
func (mp *MemoryPool) GetUtilization() float64 {
	mp.mu.RLock()
	defer mp.mu.RUnlock()
	
	if mp.BlockCount == 0 {
		return 0.0
	}
	
	return float64(len(mp.UsedBlocks)) / float64(mp.BlockCount)
}

// GetHitRate returns memory pool hit rate
func (mp *MemoryPool) GetHitRate() float64 {
	mp.mu.RLock()
	defer mp.mu.RUnlock()
	
	total := mp.Allocations + mp.Deallocations
	if total == 0 {
		return 0.0
	}
	
	return float64(mp.Allocations) / float64(total)
}

// Cleanup cleans up the memory pool
func (mp *MemoryPool) Cleanup() {
	mp.mu.Lock()
	defer mp.mu.Unlock()
	
	mp.AvailableBlocks = mp.AvailableBlocks[:0]
	mp.UsedBlocks = mp.UsedBlocks[:0]
}

// FrameBuffer methods

// NewFrameBuffer creates a new frame buffer
func NewFrameBuffer(maxFrames int, frameSize int64) *FrameBuffer {
	return &FrameBuffer{
		MaxFrames:    maxFrames,
		FrameSize:    frameSize,
		BufferSize:   int64(maxFrames) * frameSize,
		Frames:       make(map[string]*Frame),
		Queue:        make([]*Frame, 0),
	}
}

// Initialize initializes the frame buffer
func (fb *FrameBuffer) Initialize() error {
	fb.mu.Lock()
	defer fb.mu.Unlock()
	
	// Pre-allocate frame storage
	fb.Queue = make([]*Frame, 0, fb.MaxFrames)
	
	return nil
}

// AddFrame adds a frame to the buffer
func (fb *FrameBuffer) AddFrame(frame *Frame) error {
	fb.mu.Lock()
	defer fb.mu.Unlock()
	
	// Check buffer capacity
	if len(fb.Queue) >= fb.MaxFrames {
		// Remove oldest frame
		oldest := fb.Queue[0]
		delete(fb.Frames, oldest.ID)
		fb.Queue = fb.Queue[1:]
		fb.DroppedFrames++
	}
	
	// Add frame
	fb.Frames[frame.ID] = frame
	fb.Queue = append(fb.Queue, frame)
	fb.FrameCount++
	
	return nil
}

// GetFrame gets a frame from the buffer
func (fb *FrameBuffer) GetFrame(frameID string) (*Frame, error) {
	fb.mu.RLock()
	defer fb.mu.RUnlock()
	
	frame, exists := fb.Frames[frameID]
	if !exists {
		return nil, fmt.Errorf("frame not found: %s", frameID)
	}
	
	return frame, nil
}

// GetUtilization returns frame buffer utilization
func (fb *FrameBuffer) GetUtilization() float64 {
	fb.mu.RLock()
	defer fb.mu.RUnlock()
	
	if fb.MaxFrames == 0 {
		return 0.0
	}
	
	return float64(len(fb.Queue)) / float64(fb.MaxFrames)
}

// Cleanup cleans up the frame buffer
func (fb *FrameBuffer) Cleanup() {
	fb.mu.Lock()
	defer fb.mu.Unlock()
	
	fb.Frames = make(map[string]*Frame)
	fb.Queue = fb.Queue[:0]
}
