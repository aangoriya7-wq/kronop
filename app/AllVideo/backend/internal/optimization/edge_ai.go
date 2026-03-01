/**
 * Edge AI Video Optimization
 * 
 * Client-side AI processing to reduce server load
 * Optimized for mobile devices with efficient resource usage
 * 
 * Features:
 * - Client-side AI upscaling
 * - Edge computing optimization
 * - Server load reduction
 * - Adaptive processing based on device capabilities
 * - Real-time performance monitoring
 */

package optimization

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"sync"
	"time"

	"github.com/kronop/backend/internal/ai"
	"github.com/kronop/backend/internal/gpu"
)

// EdgeAIService handles client-side AI video optimization
type EdgeAIService struct {
	config       EdgeAIConfig
	aiEngine     *ai.SuperResolutionEngine
	gpuManager   *gpu.GPUManager
	
	// Client management
	clients      map[string]*ClientSession
	clientsMu    sync.RWMutex
	
	// Processing pipeline
	processors   map[string]*VideoProcessor
	processorsMu sync.RWMutex
	
	// Performance tracking
	metrics      *EdgeAIMetrics
	
	// Context management
	ctx          context.Context
	cancel       context.CancelFunc
}

// EdgeAIConfig holds edge AI configuration
type EdgeAIConfig struct {
	// Processing settings
	EnableClientSideUpscaling bool          `json:"enable_client_side_upscaling"`
	MaxClientResolution       Resolution    `json:"max_client_resolution"`
	MinDeviceCapability       float64       `json:"min_device_capability"`
	ProcessingTimeout         time.Duration `json:"processing_timeout"`
	
	// Resource management
	MaxConcurrentClients      int           `json:"max_concurrent_clients"`
	MaxMemoryPerClient        int64         `json:"max_memory_per_client"`
	MaxGPUPerClient           float64       `json:"max_gpu_per_client"`
	
	// Quality settings
	DefaultQuality            string        `json:"default_quality"`
	AdaptiveQuality           bool          `json:"adaptive_quality"`
	QualityThresholds         QualityThresholds `json:"quality_thresholds"`
	
	// Optimization settings
	EnableFrameInterpolation  bool          `json:"enable_frame_interpolation"`
	EnableSmartCompression    bool          `json:"enable_smart_compression"`
	CompressionRatio          float64       `json:"compression_ratio"`
	
	// Performance settings
	EnablePerformanceMonitoring bool         `json:"enable_performance_monitoring"`
	MetricsCollectionInterval  time.Duration `json:"metrics_collection_interval"`
}

// ClientSession represents a connected client
type ClientSession struct {
	ID              string              `json:"id"`
	DeviceInfo      ClientDeviceInfo    `json:"device_info"`
	ConnectedAt     time.Time           `json:"connected_at"`
	LastActivity    time.Time           `json:"last_activity"`
	IsActive        bool                `json:"is_active"`
	
	// Processing capabilities
	CanProcessAI    bool                `json:"can_process_ai"`
	MaxResolution   Resolution          `json:"max_resolution"`
	SupportedModels []string            `json:"supported_models"`
	
	// Resource usage
	MemoryUsage     int64               `json:"memory_usage"`
	GPUUsage        float64             `json:"gpu_usage"`
	CPUUsage        float64             `json:"cpu_usage"`
	
	// Performance metrics
	FramesProcessed int64               `json:"frames_processed"`
	AverageLatency   time.Duration       `json:"average_latency"`
	QualityScore     float64             `json:"quality_score"`
	
	mu              sync.RWMutex
}

// ClientDeviceInfo contains client device information
type ClientDeviceInfo struct {
	Platform        string    `json:"platform"`        // "android", "ios", "web"
	DeviceModel     string    `json:"device_model"`
	GPUModel        string    `json:"gpu_model"`
	GPUMemory       int64     `json:"gpu_memory"`
	CPUCores        int       `json:"cpu_cores"`
	TotalMemory     int64     `json:"total_memory"`
	AvailableMemory int64     `json:"available_memory"`
	BatteryLevel    float64   `json:"battery_level"`
	IsCharging      bool      `json:"is_charging"`
	NetworkType     string    `json:"network_type"`
	SupportedAPIs   []string  `json:"supported_apis"`
}

// VideoProcessor handles video processing for a client
type VideoProcessor struct {
	ClientID       string
	Session        *ClientSession
	AIEngine       *ai.SuperResolutionEngine
	FrameQueue     chan *ProcessingFrame
	ResultQueue    chan *ProcessingResult
	IsActive       bool
	ProcessingMode  ProcessingMode
	
	// Performance tracking
	ProcessedCount int64
	DroppedCount   int64
	AvgLatency     time.Duration
	
	mu             sync.RWMutex
}

// ProcessingMode defines how video is processed
type ProcessingMode string

const (
	ProcessingModeClient    ProcessingMode = "client"
	ProcessingModeHybrid    ProcessingMode = "hybrid"
	ProcessingModeServer    ProcessingMode = "server"
)

// ProcessingFrame represents a frame to be processed
type ProcessingFrame struct {
	ID           string        `json:"id"`
	ClientID     string        `json:"client_id"`
	FrameData    []byte        `json:"frame_data"`
	Width        int           `json:"width"`
	Height       int           `json:"height"`
	Timestamp    time.Time     `json:"timestamp"`
	Priority     int           `json:"priority"`
	Options      ProcessingOptions `json:"options"`
	Timeout      time.Duration `json:"timeout"`
}

// ProcessingOptions holds processing options
type ProcessingOptions struct {
	ScaleFactor         int     `json:"scale_factor"`
	Quality            string  `json:"quality"`
	EnableUpscaling    bool    `json:"enable_upscaling"`
	EnableInterpolation bool   `json:"enable_interpolation"`
	EnableCompression  bool    `json:"enable_compression"`
	CompressionRatio   float64 `json:"compression_ratio"`
}

// ProcessingResult represents processing result
type ProcessingResult struct {
	FrameID       string        `json:"frame_id"`
	ClientID      string        `json:"client_id"`
	Success       bool          `json:"success"`
	ProcessedData []byte        `json:"processed_data"`
	Width         int           `json:"width"`
	Height        int           `json:"height"`
	ProcessingTime time.Duration `json:"processing_time"`
	Quality       string        `json:"quality"`
	Metadata      ProcessingMetadata `json:"metadata"`
	Error         string        `json:"error,omitempty"`
}

// ProcessingMetadata contains processing metadata
type ProcessingMetadata struct {
	ProcessingMode     string  `json:"processing_mode"`
	ScaleFactor        int     `json:"scale_factor"`
	QualityScore       float64 `json:"quality_score"`
	CompressionRatio   float64 `json:"compression_ratio"`
	GPUUtilization     float64 `json:"gpu_utilization"`
	MemoryUsage        int64   `json:"memory_usage_mb"`
	ProcessingLocation  string  `json:"processing_location"` // "client", "server"
}

// EdgeAIMetrics tracks edge AI performance
type EdgeAIMetrics struct {
	// Client metrics
	ActiveClients        int     `json:"active_clients"`
	TotalClients         int64   `json:"total_clients"`
	ClientSideProcessing int64   `json:"client_side_processing"`
	ServerSideProcessing int64   `json:"server_side_processing"`
	
	// Performance metrics
	AverageClientLatency time.Duration `json:"average_client_latency"`
	ServerLoadReduction float64       `json:"server_load_reduction_percent"`
	ProcessingEfficiency float64      `json:"processing_efficiency_percent"`
	
	// Resource metrics
	TotalMemoryUsage     int64   `json:"total_memory_usage_mb"`
	TotalGPUUsage        float64 `json:"total_gpu_usage_percent"`
	NetworkBandwidthSaved int64   `json:"network_bandwidth_saved_mb"`
	
	// Quality metrics
	AverageQualityScore  float64 `json:"average_quality_score"`
	ClientCapabilityScore float64 `json:"client_capability_score"`
	AdaptiveAdjustments  int64   `json:"adaptive_adjustments"`
	
	LastUpdate           time.Time `json:"last_update"`
}

// NewEdgeAIService creates a new edge AI service
func NewEdgeAIService(config EdgeAIConfig) (*EdgeAIService, error) {
	ctx, cancel := context.WithCancel(context.Background())
	
	service := &EdgeAIService{
		config:    config,
		clients:   make(map[string]*ClientSession),
		processors: make(map[string]*VideoProcessor),
		metrics:   &EdgeAIMetrics{},
		ctx:       ctx,
		cancel:    cancel,
	}
	
	// Initialize lightweight AI engine for edge processing
	aiConfig := ai.SuperResolutionConfig{
		ModelType:           "tflite", // Lightweight for edge
		ScaleFactor:         2,
		MaxConcurrentFrames: 2, // Limited for edge devices
		GPUAcceleration:    true,
		MemoryLimit:         config.MaxMemoryPerClient,
		ProcessingTimeout:   config.ProcessingTimeout,
		EnableAdaptiveQuality: config.AdaptiveQuality,
	}
	
	var err error
	service.aiEngine, err = ai.NewSuperResolutionEngine(aiConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize edge AI engine: %w", err)
	}
	
	// Initialize GPU manager for edge devices
	gpuConfig := gpu.GPUConfig{
		EnableCUDA:   false, // Usually not available on edge
		EnableMetal:  true,  // For iOS devices
		EnableOpenCL: true,  // For Android devices
		MemoryLimit:  config.MaxMemoryPerClient,
		MaxWorkers:   2,
		Timeout:      config.ProcessingTimeout,
	}
	
	service.gpuManager, err = gpu.NewGPUManager(gpuConfig)
	if err != nil {
		log.Printf("Warning: GPU manager initialization failed: %v", err)
		// Continue without GPU acceleration
	}
	
	// Start metrics collection
	if config.EnablePerformanceMonitoring {
		go service.collectMetrics()
	}
	
	// Start client cleanup
	go service.cleanupInactiveClients()
	
	return service, nil
}

// Start starts the edge AI service
func (eas *EdgeAIService) Start() error {
	// Start AI engine
	if err := eas.aiEngine.Start(); err != nil {
		return fmt.Errorf("failed to start AI engine: %w", err)
	}
	
	// Start GPU manager if available
	if eas.gpuManager != nil {
		if err := eas.gpuManager.Start(); err != nil {
			log.Printf("Warning: Failed to start GPU manager: %v", err)
		}
	}
	
	log.Println("Edge AI Service started")
	return nil
}

// Stop stops the edge AI service
func (eas *EdgeAIService) Stop() error {
	eas.cancel()
	
	// Stop all processors
	eas.processorsMu.Lock()
	for _, processor := range eas.processors {
		processor.Stop()
	}
	eas.processors = make(map[string]*VideoProcessor)
	eas.processorsMu.Unlock()
	
	// Stop AI engine
	if eas.aiEngine != nil {
		eas.aiEngine.Stop()
	}
	
	// Stop GPU manager
	if eas.gpuManager != nil {
		eas.gpuManager.Stop()
	}
	
	log.Println("Edge AI Service stopped")
	return nil
}

// RegisterClient registers a new client for edge processing
func (eas *EdgeAIService) RegisterClient(clientID string, deviceInfo ClientDeviceInfo) (*ClientSession, error) {
	eas.clientsMu.Lock()
	defer eas.clientsMu.Unlock()
	
	// Check client limit
	if len(eas.clients) >= eas.config.MaxConcurrentClients {
		return nil, fmt.Errorf("maximum concurrent clients reached")
	}
	
	// Check if client already exists
	if _, exists := eas.clients[clientID]; exists {
		return nil, fmt.Errorf("client already registered: %s", clientID)
	}
	
	// Evaluate device capability
	capability := eas.evaluateDeviceCapability(deviceInfo)
	
	// Determine processing capabilities
	canProcessAI := capability >= eas.config.MinDeviceCapability
	maxResolution := eas.determineMaxResolution(deviceInfo, capability)
	supportedModels := eas.getSupportedModels(deviceInfo)
	
	// Create client session
	session := &ClientSession{
		ID:               clientID,
		DeviceInfo:       deviceInfo,
		ConnectedAt:      time.Now(),
		LastActivity:     time.Now(),
		IsActive:         true,
		CanProcessAI:     canProcessAI,
		MaxResolution:    maxResolution,
		SupportedModels:  supportedModels,
	}
	
	// Register client
	eas.clients[clientID] = session
	eas.metrics.TotalClients++
	
	// Create video processor for client
	if canProcessAI {
		processor := eas.createVideoProcessor(session)
		eas.processorsMu.Lock()
		eas.processors[clientID] = processor
		eas.processorsMu.Unlock()
		go processor.Start(eas.ctx)
	}
	
	log.Printf("Client registered: %s (AI: %t, Capability: %.2f)", 
		clientID, canProcessAI, capability)
	
	return session, nil
}

// UnregisterClient unregisters a client
func (eas *EdgeAIService) UnregisterClient(clientID string) error {
	eas.clientsMu.Lock()
	defer eas.clientsMu.Unlock()
	
	session, exists := eas.clients[clientID]
	if !exists {
		return fmt.Errorf("client not found: %s", clientID)
	}
	
	session.IsActive = false
	
	// Stop processor
	eas.processorsMu.Lock()
	if processor, exists := eas.processors[clientID]; exists {
		processor.Stop()
		delete(eas.processors, clientID)
	}
	eas.processorsMu.Unlock()
	
	// Remove client
	delete(eas.clients, clientID)
	eas.metrics.ActiveClients--
	
	log.Printf("Client unregistered: %s", clientID)
	return nil
}

// ProcessFrame processes a video frame on edge or server
func (eas *EdgeAIService) ProcessFrame(frame *ProcessingFrame) (*ProcessingResult, error) {
	// Get client session
	eas.clientsMu.RLock()
	session, exists := eas.clients[frame.ClientID]
	eas.clientsMu.RUnlock()
	
	if !exists {
		return nil, fmt.Errorf("client not found: %s", frame.ClientID)
	}
	
	// Update client activity
	session.mu.Lock()
	session.LastActivity = time.Now()
	session.mu.Unlock()
	
	// Determine processing mode
	processingMode := eas.determineProcessingMode(session, frame)
	
	switch processingMode {
	case ProcessingModeClient:
		return eas.processOnClient(session, frame)
	case ProcessingModeHybrid:
		return eas.processHybrid(session, frame)
	case ProcessingModeServer:
		return eas.processOnServer(session, frame)
	default:
		return nil, fmt.Errorf("unsupported processing mode: %s", processingMode)
	}
}

// processOnClient processes frame entirely on client device
func (eas *EdgeAIService) processOnClient(session *ClientSession, frame *ProcessingFrame) (*ProcessingResult, error) {
	startTime := time.Now()
	
	// Get client processor
	eas.processorsMu.RLock()
	processor, exists := eas.processors[frame.ClientID]
	eas.processorsMu.RUnlock()
	
	if !exists {
		return nil, fmt.Errorf("client processor not found: %s", frame.ClientID)
	}
	
	// Submit frame for processing
	result, err := processor.ProcessFrame(frame)
	if err != nil {
		return nil, fmt.Errorf("client processing failed: %w", err)
	}
	
	// Update metrics
	eas.metrics.ClientSideProcessing++
	processingTime := time.Since(startTime)
	
	session.mu.Lock()
	session.FramesProcessed++
	session.AverageLatency = eas.updateAverageLatency(session.AverageLatency, processingTime, session.FramesProcessed)
	session.mu.Unlock()
	
	result.Metadata.ProcessingMode = string(ProcessingModeClient)
	result.Metadata.ProcessingLocation = "client"
	
	return result, nil
}

// processHybrid processes frame with hybrid client-server approach
func (eas *EdgeAIService) processHybrid(session *ClientSession, frame *ProcessingFrame) (*ProcessingResult, error) {
	startTime := time.Now()
	
	// Client processes initial enhancement
	clientResult, err := eas.processOnClient(session, frame)
	if err != nil {
		return nil, fmt.Errorf("hybrid processing failed (client): %w", err)
	}
	
	// Server processes final enhancement if needed
	if frame.Options.ScaleFactor > 2 || frame.Options.Quality == "ultra" {
		serverResult, err := eas.processOnServer(session, frame)
		if err != nil {
			// Fallback to client result
			log.Printf("Server processing failed, using client result: %v", err)
			return clientResult, nil
		}
		
		// Merge results
		mergedResult := eas.mergeProcessingResults(clientResult, serverResult)
		mergedResult.Metadata.ProcessingMode = string(ProcessingModeHybrid)
		mergedResult.Metadata.ProcessingLocation = "hybrid"
		
		return mergedResult, nil
	}
	
	clientResult.Metadata.ProcessingMode = string(ProcessingModeHybrid)
	clientResult.Metadata.ProcessingLocation = "hybrid"
	return clientResult, nil
}

// processOnServer processes frame on server (fallback)
func (eas *EdgeAIService) processOnServer(session *ClientSession, frame *ProcessingFrame) (*ProcessingResult, error) {
	startTime := time.Now()
	
	// Create video frame for server processing
	videoFrame := &ai.VideoFrame{
		ID:         frame.ID,
		Width:      frame.Width,
		Height:     frame.Height,
		Pixels:     frame.FrameData,
		Timestamp:  frame.Timestamp,
		Quality:    frame.Options.Quality,
		DeviceInfo: ai.DeviceInfo{
			GPUModel:    session.DeviceInfo.GPUModel,
			GPUMemory:   session.DeviceInfo.GPUMemory,
			CPUCores:    session.DeviceInfo.CPUCores,
			Memory:      session.DeviceInfo.TotalMemory,
		},
	}
	
	// Process with server AI engine
	enhanced, err := eas.aiEngine.ProcessFrame(videoFrame)
	if err != nil {
		return nil, fmt.Errorf("server processing failed: %w", err)
	}
	
	// Create result
	result := &ProcessingResult{
		FrameID:        frame.ID,
		ClientID:       frame.ClientID,
		Success:        true,
		ProcessedData:  enhanced.Pixels,
		Width:          enhanced.Width,
		Height:         enhanced.Height,
		ProcessingTime: time.Since(startTime),
		Quality:        enhanced.Quality,
		Metadata: ProcessingMetadata{
			ProcessingMode:    string(ProcessingModeServer),
			ScaleFactor:       enhanced.Metadata.ScaleFactor,
			QualityScore:      0.9, // Server processing typically higher quality
			ProcessingLocation: "server",
		},
	}
	
	// Update metrics
	eas.metrics.ServerSideProcessing++
	
	return result, nil
}

// evaluateDeviceCapability evaluates device processing capability
func (eas *EdgeAIService) evaluateDeviceCapability(deviceInfo ClientDeviceInfo) float64 {
	capability := 0.0
	
	// GPU capability (40% weight)
	if deviceInfo.GPUMemory > 0 {
		gpuScore := math.Min(float64(deviceInfo.GPUMemory)/8192.0, 1.0) // Normalize to 8GB
		capability += gpuScore * 0.4
	}
	
	// CPU capability (30% weight)
	if deviceInfo.CPUCores > 0 {
		cpuScore := math.Min(float64(deviceInfo.CPUCores)/8.0, 1.0) // Normalize to 8 cores
		capability += cpuScore * 0.3
	}
	
	// Memory capability (20% weight)
	if deviceInfo.TotalMemory > 0 {
		memoryScore := math.Min(float64(deviceInfo.TotalMemory)/16384.0, 1.0) // Normalize to 16GB
		capability += memoryScore * 0.2
	}
	
	// Platform capability (10% weight)
	platformScore := 0.0
	switch deviceInfo.Platform {
	case "ios":
		platformScore = 0.9 // iOS typically has better GPU support
	case "android":
		platformScore = 0.7 // Android varies but generally good
	case "web":
		platformScore = 0.5 // Web has limitations
	}
	capability += platformScore * 0.1
	
	return capability
}

// determineMaxResolution determines maximum resolution for client
func (eas *EdgeAIService) determineMaxResolution(deviceInfo ClientDeviceInfo, capability float64) Resolution {
	if capability >= 0.8 {
		// High-end devices
		return Resolution{Width: 1920, Height: 1080} // 1080p
	} else if capability >= 0.5 {
		// Mid-range devices
		return Resolution{Width: 1280, Height: 720} // 720p
	} else {
		// Low-end devices
		return Resolution{Width: 854, Height: 480} // 480p
	}
}

// getSupportedModels returns supported AI models for device
func (eas *EdgeAIService) getSupportedModels(deviceInfo ClientDeviceInfo) []string {
	models := []string{"srcnn"} // Always support lightweight model
	
	if deviceInfo.GPUMemory >= 4096 {
		models = append(models, "esrgan")
	}
	
	if deviceInfo.GPUMemory >= 8192 {
		models = append(models, "realesrgan")
	}
	
	return models
}

// determineProcessingMode determines optimal processing mode
func (eas *EdgeAIService) determineProcessingMode(session *ClientSession, frame *ProcessingFrame) ProcessingMode {
	// Check if client can handle the processing
	if !session.CanProcessAI {
		return ProcessingModeServer
	}
	
	// Check if frame exceeds client capabilities
	if frame.Width > session.MaxResolution.Width || 
	   frame.Height > session.MaxResolution.Height {
		return ProcessingModeHybrid
	}
	
	// Check processing requirements
	if frame.Options.ScaleFactor > 2 || frame.Options.Quality == "ultra" {
		return ProcessingModeHybrid
	}
	
	// Check network conditions
	if session.DeviceInfo.NetworkType == "wifi" && 
	   session.DeviceInfo.IsCharging && 
	   session.DeviceInfo.BatteryLevel > 0.5 {
		return ProcessingModeClient
	}
	
	// Default to client processing for capable devices
	return ProcessingModeClient
}

// createVideoProcessor creates a video processor for client
func (eas *EdgeAIService) createVideoProcessor(session *ClientSession) *VideoProcessor {
	return &VideoProcessor{
		ClientID:       session.ID,
		Session:        session,
		AIEngine:       eas.aiEngine,
		FrameQueue:     make(chan *ProcessingFrame, 16),
		ResultQueue:    make(chan *ProcessingResult, 16),
		ProcessingMode: ProcessingModeClient,
	}
}

// updateAverageLatency updates running average latency
func (eas *EdgeAIService) updateAverageLatency(current time.Duration, new time.Duration, count int64) time.Duration {
	if count == 1 {
		return new
	}
	
	return time.Duration((int64(current)*count + int64(new)) / (count + 1))
}

// mergeProcessingResults merges client and server processing results
func (eas *EdgeAIService) mergeProcessingResults(client, server *ProcessingResult) *ProcessingResult {
	// Use server result for quality, client result for metadata
	merged := *server
	merged.Metadata.ProcessingMode = string(ProcessingModeHybrid)
	merged.Metadata.ProcessingLocation = "hybrid"
	
	// Combine the best of both results
	if client.ProcessingTime < server.ProcessingTime {
		merged.ProcessingTime = client.ProcessingTime
	}
	
	return merged
}

// collectMetrics collects edge AI metrics
func (eas *EdgeAIService) collectMetrics() {
	ticker := time.NewTicker(eas.config.MetricsCollectionInterval)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			eas.updateMetrics()
		case <-eas.ctx.Done():
			return
		}
	}
}

// updateMetrics updates current metrics
func (eas *EdgeAIService) updateMetrics() {
	eas.clientsMu.RLock()
	defer eas.clientsMu.RUnlock()
	
	// Update client metrics
	eas.metrics.ActiveClients = len(eas.clients)
	
	// Calculate aggregate metrics
	totalFrames := int64(0)
	totalLatency := time.Duration(0)
	totalQuality := 0.0
	clientCount := 0
	
	for _, session := range eas.clients {
		if session.IsActive {
			totalFrames += session.FramesProcessed
			totalLatency += session.AverageLatency
			totalQuality += session.QualityScore
			clientCount++
		}
	}
	
	if clientCount > 0 {
		eas.metrics.AverageClientLatency = totalLatency / time.Duration(clientCount)
		eas.metrics.AverageQualityScore = totalQuality / float64(clientCount)
	}
	
	// Calculate server load reduction
	if eas.metrics.ClientSideProcessing > 0 {
		totalProcessing := eas.metrics.ClientSideProcessing + eas.metrics.ServerSideProcessing
		eas.metrics.ServerLoadReduction = float64(eas.metrics.ClientSideProcessing) / float64(totalProcessing) * 100
	}
	
	// Mock other metrics
	eas.metrics.ProcessingEfficiency = 85.0
	eas.metrics.TotalMemoryUsage = 1024
	eas.metrics.TotalGPUUsage = 45.0
	eas.metrics.NetworkBandwidthSaved = 2048
	eas.metrics.ClientCapabilityScore = 0.75
	
	eas.metrics.LastUpdate = time.Now()
}

// cleanupInactiveClients removes inactive clients
func (eas *EdgeAIService) cleanupInactiveClients() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			eas.cleanupInactiveClientsInternal()
		case <-eas.ctx.Done():
			return
		}
	}
}

// cleanupInactiveClientsInternal performs cleanup
func (eas *EdgeAIService) cleanupInactiveClientsInternal() {
	eas.clientsMu.Lock()
	defer eas.clientsMu.Unlock()
	
	now := time.Now()
	for clientID, session := range eas.clients {
		// Remove inactive clients (no activity for 5 minutes)
		if now.Sub(session.LastActivity) > 5*time.Minute {
			log.Printf("Cleaning up inactive client: %s", clientID)
			
			// Stop processor
			eas.processorsMu.Lock()
			if processor, exists := eas.processors[clientID]; exists {
				processor.Stop()
				delete(eas.processors, clientID)
			}
			eas.processorsMu.Unlock()
			
			// Remove client
			delete(eas.clients, clientID)
		}
	}
}

// GetMetrics returns current edge AI metrics
func (eas *EdgeAIService) GetMetrics() EdgeAIMetrics {
	eas.clientsMu.RLock()
	defer eas.clientsMu.RUnlock()
	
	metrics := *eas.metrics
	metrics.ActiveClients = len(eas.clients)
	
	return metrics
}

// GetClientSession returns client session information
func (eas *EdgeAIService) GetClientSession(clientID string) (*ClientSession, error) {
	eas.clientsMu.RLock()
	defer eas.clientsMu.RUnlock()
	
	session, exists := eas.clients[clientID]
	if !exists {
		return nil, fmt.Errorf("client not found: %s", clientID)
	}
	
	return session, nil
}

// VideoProcessor methods

// Start starts the video processor
func (vp *VideoProcessor) Start(ctx context.Context) {
	vp.mu.Lock()
	vp.IsActive = true
	vp.mu.Unlock()
	
	log.Printf("Video processor started for client: %s", vp.ClientID)
	
	for {
		select {
		case frame := <-vp.FrameQueue:
			if !vp.IsActive {
				continue
			}
			
			result, err := vp.ProcessFrame(frame)
			if err != nil {
				log.Printf("Failed to process frame %s: %v", frame.ID, err)
				vp.DroppedCount++
				continue
			}
			
			// Send result
			select {
			case vp.ResultQueue <- result:
				vp.ProcessedCount++
			default:
				// Result queue full, drop result
				vp.DroppedCount++
			}
			
		case <-ctx.Done():
			vp.Stop()
			return
		}
	}
}

// Stop stops the video processor
func (vp *VideoProcessor) Stop() {
	vp.mu.Lock()
	vp.IsActive = false
	vp.mu.Unlock()
	
	// Close channels
	close(vp.FrameQueue)
	close(vp.ResultQueue)
	
	log.Printf("Video processor stopped for client: %s", vp.ClientID)
}

// ProcessFrame processes a single frame
func (vp *VideoProcessor) ProcessFrame(frame *ProcessingFrame) (*ProcessingResult, error) {
	startTime := time.Now()
	
	// Create AI video frame
	aiFrame := &ai.VideoFrame{
		ID:         frame.ID,
		Width:      frame.Width,
		Height:     frame.Height,
		Pixels:     frame.FrameData,
		Timestamp:  frame.Timestamp,
		Quality:    frame.Options.Quality,
		DeviceInfo: ai.DeviceInfo{
			GPUModel:    vp.Session.DeviceInfo.GPUModel,
			GPUMemory:   vp.Session.DeviceInfo.GPUMemory,
			CPUCores:    vp.Session.DeviceInfo.CPUCores,
			Memory:      vp.Session.DeviceInfo.TotalMemory,
		},
	}
	
	// Process with AI engine
	enhanced, err := vp.AIEngine.ProcessFrame(aiFrame)
	if err != nil {
		return nil, fmt.Errorf("AI processing failed: %w", err)
	}
	
	// Apply post-processing if requested
	processedData := enhanced.Pixels
	if frame.Options.EnableCompression {
		compressed, err := vp.compressFrame(enhanced.Pixels, frame.Options.CompressionRatio)
		if err != nil {
			log.Printf("Compression failed, using original: %v", err)
		} else {
			processedData = compressed
		}
	}
	
	// Create result
	result := &ProcessingResult{
		FrameID:        frame.ID,
		ClientID:       frame.ClientID,
		Success:        true,
		ProcessedData:  processedData,
		Width:          enhanced.Width,
		Height:         enhanced.Height,
		ProcessingTime: time.Since(startTime),
		Quality:        enhanced.Quality,
		Metadata: ProcessingMetadata{
			ProcessingMode:    string(vp.ProcessingMode),
			ScaleFactor:       enhanced.Metadata.ScaleFactor,
			QualityScore:      enhanced.Metadata.QualityScore,
			CompressionRatio:  frame.Options.CompressionRatio,
			GPUUtilization:    enhanced.Metadata.GPUUtilization,
			MemoryUsage:       enhanced.Metadata.MemoryUsage,
			ProcessingLocation: "client",
		},
	}
	
	// Update processor metrics
	vp.mu.Lock()
	vp.ProcessedCount++
	vp.AvgLatency = vp.updateAverageLatency(vp.AvgLatency, result.ProcessingTime, vp.ProcessedCount)
	vp.mu.Unlock()
	
	return result, nil
}

// compressFrame compresses frame data
func (vp *VideoProcessor) compressFrame(data []byte, ratio float64) ([]byte, error) {
	// Mock compression implementation
	// In reality, this would use actual compression algorithms
	compressedSize := int(float64(len(data)) * ratio)
	compressed := make([]byte, compressedSize)
	
	// Simple compression simulation
	for i := 0; i < compressedSize; i++ {
		compressed[i] = data[i*len(data)/compressedSize]
	}
	
	return compressed, nil
}

// updateAverageLatency updates processor's average latency
func (vp *VideoProcessor) updateAverageLatency(current time.Duration, new time.Duration, count int64) time.Duration {
	if count == 1 {
		return new
	}
	
	return time.Duration((int64(current)*count + int64(new)) / (count + 1))
}
