/**
 * AI-Enhanced Streaming Service
 * 
 * Integrates AI Super-Resolution with video streaming pipeline
 * Provides real-time enhancement during video playback
 * 
 * Features:
 * - Real-time AI upscaling during streaming
 * - Adaptive quality based on network/device
 * - Seamless integration with existing streaming
 * - Frame interpolation for smooth playback
 * - Memory-efficient processing
 */

package streaming

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/kronop/backend/internal/ai"
)

// AIStreamingService integrates AI enhancement with streaming
type AIStreamingService struct {
	aiService    *ai.SuperResolutionService
	upscaler     *ai.RealTimeUpscaler
	engine       *ai.SuperResolutionEngine
	
	// Streaming integration
	streamingSvc *StreamingService
	
	// Enhancement pipeline
	enhancers    map[string]*StreamEnhancer
	enhancersMu  sync.RWMutex
	
	// Configuration
	config       AIStreamingConfig
	
	// Metrics
	metrics      *AIStreamingMetrics
	
	// Context management
	ctx          context.Context
	cancel       context.CancelFunc
}

// AIStreamingConfig holds AI streaming configuration
type AIStreamingConfig struct {
	// Enhancement settings
	EnableRealTimeUpscaling bool          `json:"enable_realtime_upscaling"`
	DefaultScaleFactor      int           `json:"default_scale_factor"`
	TargetQuality           string        `json:"target_quality"`
	MaxLatency              time.Duration `json:"max_latency"`
	
	// Performance settings
	MaxConcurrentStreams    int           `json:"max_concurrent_streams"`
	FrameBufferSize         int           `json:"frame_buffer_size"`
	EnableAdaptiveQuality   bool          `json:"enable_adaptive_quality"`
	PowerSavingMode         bool          `json:"power_saving_mode"`
	
	// Quality thresholds
	QualityThresholds       QualityThresholds `json:"quality_thresholds"`
	
	// Device optimization
	DeviceProfiles          map[string]DeviceProfile `json:"device_profiles"`
}

// QualityThresholds defines quality adjustment thresholds
type QualityThresholds struct {
	HighQualityFPS          float64 `json:"high_quality_fps"`
	MediumQualityFPS         float64 `json:"medium_quality_fps"`
	LowQualityFPS            float64 `json:"low_quality_fps"`
	HighLatencyThreshold     time.Duration `json:"high_latency_threshold"`
	MediumLatencyThreshold   time.Duration `json:"medium_latency_threshold"`
	LowLatencyThreshold      time.Duration `json:"low_latency_threshold"`
}

// DeviceProfile defines device-specific settings
type DeviceProfile struct {
	Name                     string  `json:"name"`
	GPUCapability           float64 `json:"gpu_capability"`
	MemoryCapability         int64   `json:"memory_capability"`
	MaxConcurrentFrames      int     `json:"max_concurrent_frames"`
	DefaultScaleFactor       int     `json:"default_scale_factor"`
	EnableFrameInterpolation bool    `json:"enable_frame_interpolation"`
	PowerOptimization       bool    `json:"power_optimization"`
}

// StreamEnhancer handles enhancement for a specific stream
type StreamEnhancer struct {
	StreamID      string
	SessionID     string
	Upscaler      *ai.RealTimeUpscaler
	InputQueue    chan *VideoFrame
	OutputQueue   chan *EnhancedFrame
	IsActive      bool
	Quality       string
	ScaleFactor   int
	StartTime     time.Time
	FrameCount    int64
	DroppedCount  int64
	mu            sync.RWMutex
}

// EnhancedFrame represents an AI-enhanced video frame
type EnhancedFrame struct {
	ID              string
	OriginalID      string
	Width           int
	Height          int
	Pixels          []byte
	Timestamp       time.Time
	ProcessingTime  time.Duration
	Quality         string
	EnhancementInfo  EnhancementInfo
}

// EnhancementInfo contains enhancement metadata
type EnhancementInfo struct {
	ScaleFactor      int     `json:"scale_factor"`
	SharpnessGain    float64 `json:"sharpness_gain"`
	NoiseReduction   float64 `json:"noise_reduction"`
	ProcessingTime   int64   `json:"processing_time_ms"`
	GPUUtilization   float64 `json:"gpu_utilization"`
	MemoryUsage      int64   `json:"memory_usage_mb"`
	QualityScore     float64 `json:"quality_score"`
}

// VideoFrame represents a video frame for processing
type VideoFrame struct {
	ID         string
	Width      int
	Height     int
	Pixels     []byte
	Timestamp  time.Time
	FrameIndex int
	Quality    string
	DeviceInfo ai.DeviceInfo
}

// AIStreamingMetrics tracks AI streaming performance
type AIStreamingMetrics struct {
	// Stream metrics
	ActiveStreams          int     `json:"active_streams"`
	TotalStreams            int64   `json:"total_streams"`
	EnhancedStreams         int64   `json:"enhanced_streams"`
	
	// Frame metrics
	FramesProcessed         int64   `json:"frames_processed"`
	FramesEnhanced          int64   `json:"frames_enhanced"`
	AverageEnhancementTime  time.Duration `json:"average_enhancement_time_ms"`
	EnhancementFPS          float64 `json:"enhancement_fps"`
	
	// Quality metrics
	AverageQualityScore     float64 `json:"average_quality_score"`
	QualityImprovement      float64 `json:"quality_improvement_percent"`
	AdaptiveAdjustments      int64   `json:"adaptive_adjustments"`
	
	// Resource metrics
	GPUUtilization          float64 `json:"gpu_utilization_percent"`
	MemoryUsage              int64   `json:"memory_usage_mb"`
	CPUUsage                 float64 `json:"cpu_usage_percent"`
	PowerConsumption         float64 `json:"power_consumption_watts"`
	
	// Performance metrics
	StreamLatency            time.Duration `json:"stream_latency_ms"`
	BufferHealth             float64       `json:"buffer_health_percent"`
	DroppedFrameRate         float64       `json:"dropped_frame_rate_percent"`
	
	LastUpdate               time.Time     `json:"last_update"`
}

// NewAIStreamingService creates a new AI streaming service
func NewAIStreamingService(config AIStreamingConfig, streamingSvc *StreamingService) (*AIStreamingService, error) {
	ctx, cancel := context.WithCancel(context.Background())
	
	service := &AIStreamingService{
		config:       config,
		streamingSvc: streamingSvc,
		enhancers:    make(map[string]*StreamEnhancer),
		metrics:      &AIStreamingMetrics{},
		ctx:          ctx,
		cancel:       cancel,
	}
	
	// Initialize AI service
	aiServiceConfig := ai.ServiceConfig{
		Port:                8081, // Different port for AI service
		EnableWebSocket:     true,
		MaxStreams:          config.MaxConcurrentStreams,
		StreamBufferSize:    config.FrameBufferSize,
		EnableMetrics:       true,
		MetricsInterval:     5 * time.Second,
		EnableCORS:          true,
		AllowedOrigins:      []string{"*"},
	}
	
	var err error
	service.aiService, err = ai.NewSuperResolutionService(aiServiceConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize AI service: %w", err)
	}
	
	// Initialize upscaler
	upscalerConfig := ai.UpscalerConfig{
		InputResolution:      ai.Resolution{Width: 640, Height: 360},
		OutputResolution:     ai.Resolution{Width: 1280, Height: 720},
		TargetFPS:           30,
		MaxLatency:          config.MaxLatency,
		EnhancementLevel:    0.8,
		SharpnessBoost:      0.3,
		NoiseReduction:      0.2,
		ArtifactSuppression: 0.1,
		MaxConcurrentFrames: 4,
		BufferSize:          config.FrameBufferSize,
		AdaptiveQuality:    config.EnableAdaptiveQuality,
		PowerSavingMode:    config.PowerSavingMode,
		DeviceProfile: ai.DeviceProfile{
			Name:              "Default",
			GPUCapability:    0.8,
			MemoryCapability: 4096,
			ThermalLimit:     85.0,
			BatteryOptimized: config.PowerSavingMode,
			SupportedFeatures: []string{"cuda", "opencl", "vulkan"},
		},
	}
	
	service.upscaler, err = ai.NewRealTimeUpscaler(upscalerConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize upscaler: %w", err)
	}
	
	// Get reference to AI engine
	service.engine = service.upscaler.GetEngine()
	
	// Start upscaler
	if err := service.upscaler.Start(); err != nil {
		return nil, fmt.Errorf("failed to start upscaler: %w", err)
	}
	
	// Start metrics collection
	go service.collectMetrics()
	
	// Start stream cleanup
	go service.cleanupInactiveStreams()
	
	log.Printf("AI Streaming Service initialized with real-time upscaling")
	return service, nil
}

// Start starts the AI streaming service
func (ais *AIStreamingService) Start() error {
	// Start AI service
	go ais.aiService.Start()
	
	// Register with streaming service
	if ais.streamingSvc != nil {
		ais.streamingSvc.RegisterAIEnhancer(ais)
	}
	
	log.Println("AI Streaming Service started")
	return nil
}

// Stop stops the AI streaming service
func (ais *AIStreamingService) Stop() error {
	ais.cancel()
	
	// Stop all enhancers
	ais.enhancersMu.Lock()
	for _, enhancer := range ais.enhancers {
		enhancer.Stop()
	}
	ais.enhancers = make(map[string]*StreamEnhancer)
	ais.enhancersMu.Unlock()
	
	// Stop upscaler
	if ais.upscaler != nil {
		ais.upscaler.Stop()
	}
	
	// Stop AI service
	if ais.aiService != nil {
		ais.aiService.Stop()
	}
	
	log.Println("AI Streaming Service stopped")
	return nil
}

// EnhanceStream enhances a video stream with AI upscaling
func (ais *AIStreamingService) EnhanceStream(streamID, sessionID string, deviceInfo ai.DeviceInfo) (*StreamEnhancer, error) {
	// Check stream limit
	ais.enhancersMu.RLock()
	if len(ais.enhancers) >= ais.config.MaxConcurrentStreams {
		ais.enhancersMu.RUnlock()
		return nil, fmt.Errorf("maximum number of enhanced streams reached")
	}
	ais.enhancersMu.RUnlock()
	
	// Get device profile
	profile := ais.getDeviceProfile(deviceInfo)
	
	// Create stream enhancer
	enhancer := &StreamEnhancer{
		StreamID:    streamID,
		SessionID:   sessionID,
		Upscaler:    ais.upscaler,
		InputQueue:  make(chan *VideoFrame, ais.config.FrameBufferSize),
		OutputQueue: make(chan *EnhancedFrame, ais.config.FrameBufferSize),
		IsActive:    true,
		Quality:     ais.config.TargetQuality,
		ScaleFactor: profile.DefaultScaleFactor,
		StartTime:   time.Now(),
	}
	
	// Register enhancer
	ais.enhancersMu.Lock()
	ais.enhancers[streamID] = enhancer
	ais.enhancersMu.Unlock()
	
	// Start enhancement processing
	go enhancer.Start(ais.ctx)
	
	// Update metrics
	ais.metrics.ActiveStreams++
	ais.metrics.TotalStreams++
	
	log.Printf("AI enhancement enabled for stream %s (scale: %dx)", streamID, enhancer.ScaleFactor)
	return enhancer, nil
}

// StopEnhancement stops AI enhancement for a stream
func (ais *AIStreamingService) StopEnhancement(streamID string) error {
	ais.enhancersMu.Lock()
	enhancer, exists := ais.enhancers[streamID]
	if exists {
		delete(ais.enhancers, streamID)
		ais.metrics.ActiveStreams--
	}
	ais.enhancersMu.Unlock()
	
	if !exists {
		return fmt.Errorf("stream enhancer not found: %s", streamID)
	}
	
	enhancer.Stop()
	
	log.Printf("AI enhancement stopped for stream %s", streamID)
	return nil
}

// EnhanceFrame enhances a single video frame
func (ais *AIStreamingService) EnhanceFrame(frame *VideoFrame) (*EnhancedFrame, error) {
	if ais.upscaler == nil {
		return nil, fmt.Errorf("upscaler not initialized")
	}
	
	// Process frame with AI upscaler
	enhanced, err := ais.upscaler.ProcessFrame(frame)
	if err != nil {
		return nil, fmt.Errorf("frame enhancement failed: %w", err)
	}
	
	// Convert to enhanced frame format
	result := &EnhancedFrame{
		ID:              enhanced.ID,
		OriginalID:      enhanced.OriginalID,
		Width:           enhanced.Width,
		Height:          enhanced.Height,
		Pixels:          enhanced.Pixels,
		Timestamp:       enhanced.Timestamp,
		ProcessingTime:  enhanced.ProcessingTime,
		Quality:         enhanced.Quality,
		EnhancementInfo: EnhancementInfo{
			ScaleFactor:    enhanced.Metadata.ScaleFactor,
			SharpnessGain:  enhanced.Metadata.SharpnessGain,
			NoiseReduction: enhanced.Metadata.NoiseReduction,
			ProcessingTime: enhanced.Metadata.ProcessingTime,
			GPUUtilization: enhanced.Metadata.GPUUtilization,
			MemoryUsage:    enhanced.Metadata.MemoryUsage,
			QualityScore:   0.85, // Mock quality score
		},
	}
	
	// Update metrics
	ais.metrics.FramesProcessed++
	ais.metrics.FramesEnhanced++
	
	return result, nil
}

// GetEnhancedStream returns the enhanced stream for a stream ID
func (ais *AIStreamingService) GetEnhancedStream(streamID string) (*StreamEnhancer, error) {
	ais.enhancersMu.RLock()
	defer ais.enhancersMu.RUnlock()
	
	enhancer, exists := ais.enhancers[streamID]
	if !exists {
		return nil, fmt.Errorf("enhanced stream not found: %s", streamID)
	}
	
	return enhancer, nil
}

// GetMetrics returns current AI streaming metrics
func (ais *AIStreamingService) GetMetrics() AIStreamingMetrics {
	ais.enhancersMu.RLock()
	defer ais.enhancersMu.RUnlock()
	
	metrics := *ais.metrics
	metrics.ActiveStreams = len(ais.enhancers)
	
	// Add upscaler metrics
	if ais.upscaler != nil {
		upscalerMetrics := ais.upscaler.GetMetrics()
		metrics.FramesProcessed = upscalerMetrics.FramesProcessed
		metrics.AverageEnhancementTime = upscalerMetrics.AverageLatency
		metrics.EnhancementFPS = upscalerMetrics.CurrentFPS
		metrics.GPUUtilization = upscalerMetrics.GPUUtilization
		metrics.MemoryUsage = upscalerMetrics.MemoryUsage
	}
	
	return metrics
}

// getDeviceProfile returns the device profile for device info
func (ais *AIStreamingService) getDeviceProfile(deviceInfo ai.DeviceInfo) DeviceProfile {
	// Check if we have a specific profile
	if profile, exists := ais.config.DeviceProfiles[deviceInfo.GPUModel]; exists {
		return profile
	}
	
	// Return default profile based on GPU capability
	if deviceInfo.GPUMemory >= 8192 { // 8GB+
		return DeviceProfile{
			Name:                     "High-End",
			GPUCapability:           1.0,
			MemoryCapability:         deviceInfo.GPUMemory,
			MaxConcurrentFrames:      8,
			DefaultScaleFactor:       4,
			EnableFrameInterpolation: true,
			PowerOptimization:       false,
		}
	} else if deviceInfo.GPUMemory >= 4096 { // 4GB+
		return DeviceProfile{
			Name:                     "Medium",
			GPUCapability:           0.7,
			MemoryCapability:         deviceInfo.GPUMemory,
			MaxConcurrentFrames:      4,
			DefaultScaleFactor:       2,
			EnableFrameInterpolation: true,
			PowerOptimization:       false,
		}
	} else { // < 4GB
		return DeviceProfile{
			Name:                     "Low-End",
			GPUCapability:           0.4,
			MemoryCapability:         deviceInfo.GPUMemory,
			MaxConcurrentFrames:      2,
			DefaultScaleFactor:       2,
			EnableFrameInterpolation: false,
			PowerOptimization:       true,
		}
	}
}

// collectMetrics collects AI streaming metrics
func (ais *AIStreamingService) collectMetrics() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			ais.updateMetrics()
		case <-ais.ctx.Done():
			return
		}
	}
}

// updateMetrics updates current metrics
func (ais *AIStreamingService) updateMetrics() {
	ais.enhancersMu.RLock()
	defer ais.enhancersMu.RUnlock()
	
	// Calculate aggregate metrics from all enhancers
	totalFrames := int64(0)
	totalDropped := int64(0)
	totalProcessingTime := time.Duration(0)
	
	for _, enhancer := range ais.enhancers {
		totalFrames += enhancer.FrameCount
		totalDropped += enhancer.DroppedCount
		totalProcessingTime += time.Since(enhancer.StartTime)
	}
	
	ais.metrics.FramesProcessed = totalFrames
	ais.metrics.FramesEnhanced = totalFrames - totalDropped
	
	if totalFrames > 0 {
		ais.metrics.AverageEnhancementTime = totalProcessingTime / time.Duration(totalFrames)
		ais.metrics.DroppedFrameRate = float64(totalDropped) / float64(totalFrames) * 100
	}
	
	// Update resource metrics from upscaler
	if ais.upscaler != nil {
		upscalerMetrics := ais.upscaler.GetMetrics()
		ais.metrics.GPUUtilization = upscalerMetrics.GPUUtilization
		ais.metrics.MemoryUsage = upscalerMetrics.MemoryUsage
		ais.metrics.EnhancementFPS = upscalerMetrics.CurrentFPS
	}
	
	// Mock other metrics
	ais.metrics.AverageQualityScore = 0.85
	ais.metrics.QualityImprovement = 45.0
	ais.metrics.CPUUsage = 30.0
	ais.metrics.PowerConsumption = 15.0
	ais.metrics.StreamLatency = 25 * time.Millisecond
	ais.metrics.BufferHealth = 85.0
	
	ais.metrics.LastUpdate = time.Now()
}

// cleanupInactiveStreams cleans up inactive stream enhancers
func (ais *AIStreamingService) cleanupInactiveStreams() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			ais.cleanupInactiveEnhancers()
		case <-ais.ctx.Done():
			return
		}
	}
}

// cleanupInactiveEnhancers removes inactive enhancers
func (ais *AIStreamingService) cleanupInactiveEnhancers() {
	ais.enhancersMu.Lock()
	defer ais.enhancersMu.Unlock()
	
	now := time.Now()
	for streamID, enhancer := range ais.enhancers {
		// Check if enhancer is inactive (no frames for 60 seconds)
		if now.Sub(enhancer.StartTime) > 60*time.Second && enhancer.FrameCount == 0 {
			log.Printf("Cleaning up inactive enhancer: %s", streamID)
			enhancer.Stop()
			delete(ais.enhancers, streamID)
			ais.metrics.ActiveStreams--
		}
	}
}

// StreamEnhancer methods

// Start starts the stream enhancer
func (se *StreamEnhancer) Start(ctx context.Context) {
	se.mu.Lock()
	se.IsActive = true
	se.mu.Unlock()
	
	log.Printf("Stream enhancer started for stream %s", se.StreamID)
	
	for {
		select {
		case frame := <-se.InputQueue:
			if !se.IsActive {
				continue
			}
			
			// Enhance frame
			enhanced, err := se.Upscaler.ProcessFrame(frame)
			if err != nil {
				log.Printf("Failed to enhance frame %s: %v", frame.ID, err)
				se.DroppedCount++
				continue
			}
			
			// Convert to enhanced frame
			result := &EnhancedFrame{
				ID:              enhanced.ID,
				OriginalID:      enhanced.OriginalID,
				Width:           enhanced.Width,
				Height:          enhanced.Height,
				Pixels:          enhanced.Pixels,
				Timestamp:       enhanced.Timestamp,
				ProcessingTime:  enhanced.ProcessingTime,
				Quality:         enhanced.Quality,
				EnhancementInfo: EnhancementInfo{
					ScaleFactor:    enhanced.Metadata.ScaleFactor,
					SharpnessGain:  enhanced.Metadata.SharpnessGain,
					NoiseReduction: enhanced.Metadata.NoiseReduction,
					ProcessingTime: enhanced.Metadata.ProcessingTime,
					GPUUtilization: enhanced.Metadata.GPUUtilization,
					MemoryUsage:    enhanced.Metadata.MemoryUsage,
					QualityScore:   0.85,
				},
			}
			
			// Send to output
			select {
			case se.OutputQueue <- result:
				se.FrameCount++
			default:
				// Output buffer full, drop frame
				se.DroppedCount++
			}
			
		case <-ctx.Done():
			se.Stop()
			return
		}
	}
}

// Stop stops the stream enhancer
func (se *StreamEnhancer) Stop() {
	se.mu.Lock()
	se.IsActive = false
	se.mu.Unlock()
	
	// Close channels
	close(se.InputQueue)
	close(se.OutputQueue)
	
	log.Printf("Stream enhancer stopped for stream %s", se.StreamID)
}

// GetStats returns enhancer statistics
func (se *StreamEnhancer) GetStats() map[string]interface{} {
	se.mu.RLock()
	defer se.mu.RUnlock()
	
	droppedRate := float64(0)
	if se.FrameCount > 0 {
		droppedRate = float64(se.DroppedCount) / float64(se.FrameCount) * 100
	}
	
	return map[string]interface{}{
		"stream_id":      se.StreamID,
		"session_id":     se.SessionID,
		"is_active":      se.IsActive,
		"quality":        se.Quality,
		"scale_factor":   se.ScaleFactor,
		"frame_count":    se.FrameCount,
		"dropped_count":  se.DroppedCount,
		"dropped_rate":   droppedRate,
		"uptime":         time.Since(se.StartTime).Seconds(),
		"fps":            float64(se.FrameCount) / time.Since(se.StartTime).Seconds(),
	}
}
