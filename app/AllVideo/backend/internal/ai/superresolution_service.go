/**
 * AI Super-Resolution Service
 * 
 * HTTP API service for AI video upscaling
 * Integrates with streaming pipeline for real-time enhancement
 * 
 * Endpoints:
 * - POST /api/v1/ai/enhance - Enhance video frame
 * - POST /api/v1/ai/enhance/stream - Real-time stream enhancement
 * - GET /api/v1/ai/capabilities - Get AI capabilities
 * - GET /api/v1/ai/metrics - Get performance metrics
 */

package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// SuperResolutionService provides HTTP API for AI super-resolution
type SuperResolutionService struct {
	upscaler    *RealTimeUpscaler
	engine      *SuperResolutionEngine
	gpuManager  *gpu.GPUManager
	
	// WebSocket upgrader for real-time streaming
	upgrader    websocket.Upgrader
	
	// Active streams
	streams     map[string]*ActiveStream
	streamsMu   sync.RWMutex
	
	// Service configuration
	config      ServiceConfig
	
	// Metrics and monitoring
	metrics     *ServiceMetrics
	
	// Context management
	ctx         context.Context
	cancel      context.CancelFunc
}

// ServiceConfig holds service configuration
type ServiceConfig struct {
	Port                int           `json:"port"`
	EnableWebSocket     bool          `json:"enable_websocket"`
	MaxStreams          int           `json:"max_streams"`
	StreamBufferSize    int           `json:"stream_buffer_size"`
	EnableMetrics       bool          `json:"enable_metrics"`
	MetricsInterval     time.Duration `json:"metrics_interval"`
	EnableCORS          bool          `json:"enable_cors"`
	AllowedOrigins      []string      `json:"allowed_origins"`
}

// ActiveStream represents an active enhancement stream
type ActiveStream struct {
	ID          string              `json:"id"`
	Conn        *websocket.Conn     `json:"-"`
	InputChan   chan *VideoFrame     `json:"-"`
	OutputChan  chan *EnhancedFrame  `json:"-"`
	StartTime   time.Time           `json:"start_time"`
	FrameCount  int64               `json:"frame_count"`
	DroppedCount int64              `json:"dropped_count"`
	Quality     string              `json:"quality"`
	DeviceInfo  DeviceInfo          `json:"device_info"`
	mu          sync.RWMutex
}

// ServiceMetrics tracks service performance
type ServiceMetrics struct {
	// Connection metrics
	ActiveConnections  int           `json:"active_connections"`
	TotalConnections    int64         `json:"total_connections"`
	WebSocketStreams    int           `json:"websocket_streams"`
	
	// Processing metrics
	FramesProcessed     int64         `json:"frames_processed"`
	AverageLatency      time.Duration `json:"average_latency_ms"`
	ThroughputFPS       float64       `json:"throughput_fps"`
	
	// Resource metrics
	GPUUtilization      float64       `json:"gpu_utilization_percent"`
	MemoryUsage         int64         `json:"memory_usage_mb"`
	CPUUsage            float64       `json:"cpu_usage_percent"`
	
	// Quality metrics
	AverageQuality      float64       `json:"average_quality"`
	QualityDistribution  map[string]int `json:"quality_distribution"`
	
	// Error metrics
	ErrorRate           float64       `json:"error_rate_percent"`
	LastError           time.Time     `json:"last_error"`
	
	LastUpdate          time.Time     `json:"last_update"`
}

// EnhancementRequest represents an enhancement request
type EnhancementRequest struct {
	FrameID       string      `json:"frame_id" binding:"required"`
	Width         int         `json:"width" binding:"required"`
	Height        int         `json:"height" binding:"required"`
	Pixels        string      `json:"pixels" binding:"required"` // Base64 encoded
	Quality       string      `json:"quality"`
	DeviceInfo    DeviceInfo  `json:"device_info"`
	Options       EnhancementOptions `json:"options"`
}

// EnhancementOptions holds enhancement options
type EnhancementOptions struct {
	ScaleFactor         int     `json:"scale_factor"`
	EnhancementLevel    float64 `json:"enhancement_level"`
	SharpnessBoost      float64 `json:"sharpness_boost"`
	NoiseReduction      float64 `json:"noise_reduction"`
	ArtifactSuppression float64 `json:"artifact_suppression"`
	RealTime           bool    `json:"real_time"`
}

// EnhancementResponse represents enhancement response
type EnhancementResponse struct {
	Success      bool              `json:"success"`
	FrameID      string            `json:"frame_id"`
	Enhanced     *EnhancedFrame    `json:"enhanced"`
	ProcessingTime time.Duration    `json:"processing_time_ms"`
	Quality      string            `json:"quality"`
	Metrics      EnhancementMetrics `json:"metrics"`
	Error        string            `json:"error,omitempty"`
}

// EnhancementMetrics holds enhancement metrics
type EnhancementMetrics struct {
	ScaleFactor      int     `json:"scale_factor"`
	SharpnessGain    float64 `json:"sharpness_gain"`
	NoiseReduction   float64 `json:"noise_reduction"`
	ProcessingTime   int64   `json:"processing_time_ms"`
	GPUUtilization   float64 `json:"gpu_utilization"`
	MemoryUsage      int64   `json:"memory_usage_mb"`
	QualityScore     float64 `json:"quality_score"`
}

// CapabilitiesResponse represents AI capabilities
type CapabilitiesResponse struct {
	SupportedModels     []ModelInfo    `json:"supported_models"`
	SupportedGPUs       []GPUDevice    `json:"supported_gpus"`
	MaxResolution       Resolution     `json:"max_resolution"`
	MaxScaleFactor      int            `json:"max_scale_factor"`
	TargetLatency       time.Duration  `json:"target_latency_ms"`
	MaxConcurrentFrames int            `json:"max_concurrent_frames"`
	SupportedFormats    []string       `json:"supported_formats"`
	Features            []string       `json:"features"`
}

// StreamRequest represents a stream enhancement request
type StreamRequest struct {
	StreamID     string            `json:"stream_id" binding:"required"`
	Resolution   Resolution        `json:"resolution" binding:"required"`
	TargetFPS    int               `json:"target_fps"`
	Quality      string            `json:"quality"`
	DeviceInfo   DeviceInfo         `json:"device_info"`
	Options      EnhancementOptions `json:"options"`
}

// NewSuperResolutionService creates a new AI super-resolution service
func NewSuperResolutionService(config ServiceConfig) (*SuperResolutionService, error) {
	ctx, cancel := context.WithCancel(context.Background())
	
	service := &SuperResolutionService{
		config:     config,
		upgrader:   websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				if !config.EnableCORS {
					return true
				}
				
				origin := r.Header.Get("Origin")
				for _, allowed := range config.AllowedOrigins {
					if allowed == "*" || allowed == origin {
						return true
					}
				}
				return false
			},
		},
		streams:    make(map[string]*ActiveStream),
		metrics:    &ServiceMetrics{
			QualityDistribution: make(map[string]int),
		},
		ctx:        ctx,
		cancel:     cancel,
	}
	
	// Initialize upscaler
	upscalerConfig := UpscalerConfig{
		InputResolution:    Resolution{Width: 640, Height: 360},
		OutputResolution:   Resolution{Width: 1280, Height: 720},
		TargetFPS:          30,
		MaxLatency:         50 * time.Millisecond,
		EnhancementLevel:   0.8,
		SharpnessBoost:     0.3,
		NoiseReduction:     0.2,
		ArtifactSuppression: 0.1,
		MaxConcurrentFrames: 4,
		BufferSize:         32,
		AdaptiveQuality:    true,
		PowerSavingMode:    false,
		DeviceProfile: DeviceProfile{
			Name:              "Default",
			GPUCapability:    0.8,
			MemoryCapability: 4096,
			ThermalLimit:     85.0,
			BatteryOptimized: false,
			SupportedFeatures: []string{"cuda", "opencl", "vulkan"},
		},
	}
	
	var err error
	service.upscaler, err = NewRealTimeUpscaler(upscalerConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize upscaler: %w", err)
	}
	
	// Start upscaler
	if err := service.upscaler.Start(); err != nil {
		return nil, fmt.Errorf("failed to start upscaler: %w", err)
	}
	
	// Get references to internal components
	service.engine = service.upscaler.engine
	service.gpuManager = service.upscaler.gpuManager
	
	// Start metrics collection
	if config.EnableMetrics {
		go service.collectMetrics()
	}
	
	// Start stream cleanup
	go service.cleanupStreams()
	
	return service, nil
}

// Start starts the HTTP service
func (srs *SuperResolutionService) Start() error {
	router := gin.Default()
	
	// Setup middleware
	if srs.config.EnableCORS {
		router.Use(srs.corsMiddleware())
	}
	
	// Setup routes
	srs.setupRoutes(router)
	
	// Start HTTP server
	addr := fmt.Sprintf(":%d", srs.config.Port)
	log.Printf("AI Super-Resolution Service starting on %s", addr)
	
	return router.Run(addr)
}

// Stop stops the service
func (srs *SuperResolutionService) Stop() error {
	srs.cancel()
	
	// Close all active streams
	srs.streamsMu.Lock()
	for _, stream := range srs.streams {
		stream.Conn.Close()
	}
	srs.streams = make(map[string]*ActiveStream)
	srs.streamsMu.Unlock()
	
	// Stop upscaler
	if srs.upscaler != nil {
		srs.upscaler.Stop()
	}
	
	log.Println("AI Super-Resolution Service stopped")
	return nil
}

// setupRoutes sets up HTTP routes
func (srs *SuperResolutionService) setupRoutes(router *gin.Engine) {
	api := router.Group("/api/v1/ai")
	{
		// Enhancement endpoints
		api.POST("/enhance", srs.enhanceFrame)
		api.POST("/enhance/batch", srs.enhanceBatch)
		
		// Streaming endpoints
		api.GET("/enhance/stream/:streamId", srs.enhanceStream)
		api.POST("/enhance/stream", srs.createStream)
		api.DELETE("/enhance/stream/:streamId", srs.closeStream)
		
		// Information endpoints
		api.GET("/capabilities", srs.getCapabilities)
		api.GET("/metrics", srs.getMetrics)
		api.GET("/health", srs.healthCheck)
		
		// Configuration endpoints
		api.POST("/config", srs.updateConfig)
		api.GET("/config", srs.getConfig)
	}
}

// enhanceFrame handles single frame enhancement
func (srs *SuperResolutionService) enhanceFrame(c *gin.Context) {
	startTime := time.Now()
	
	var req EnhancementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, EnhancementResponse{
			Success: false,
			Error:   fmt.Sprintf("Invalid request: %v", err),
		})
		return
	}
	
	// Decode base64 pixels
	pixels, err := srs.decodeBase64Pixels(req.Pixels)
	if err != nil {
		c.JSON(http.StatusBadRequest, EnhancementResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to decode pixels: %v", err),
		})
		return
	}
	
	// Create video frame
	frame := &VideoFrame{
		ID:         req.FrameID,
		Width:      req.Width,
		Height:     req.Height,
		Pixels:     pixels,
		Timestamp:  time.Now(),
		FrameIndex: 0,
		Quality:    req.Quality,
		DeviceInfo: req.DeviceInfo,
	}
	
	// Process frame
	enhanced, err := srs.upscaler.ProcessFrame(frame)
	if err != nil {
		srs.metrics.ErrorRate++
		srs.metrics.LastError = time.Now()
		
		c.JSON(http.StatusInternalServerError, EnhancementResponse{
			Success: false,
			FrameID: req.FrameID,
			Error:   fmt.Sprintf("Enhancement failed: %v", err),
		})
		return
	}
	
	// Encode enhanced pixels
	encodedPixels := srs.encodeBase64Pixels(enhanced.Pixels)
	
	// Create response
	response := EnhancementResponse{
		Success:        true,
		FrameID:        req.FrameID,
		Enhanced: &EnhancedFrame{
			ID:         enhanced.ID,
			OriginalID: enhanced.OriginalID,
			Width:      enhanced.Width,
			Height:     enhanced.Height,
			Pixels:     encodedPixels,
			Timestamp:  enhanced.Timestamp,
			Quality:    enhanced.Quality,
		},
		ProcessingTime: time.Since(startTime),
		Quality:       enhanced.Quality,
		Metrics: EnhancementMetrics{
			ScaleFactor:    enhanced.Metadata.ScaleFactor,
			SharpnessGain:  enhanced.Metadata.SharpnessGain,
			NoiseReduction: enhanced.Metadata.NoiseReduction,
			ProcessingTime:  enhanced.Metadata.ProcessingTime,
			GPUUtilization:  enhanced.Metadata.GPUUtilization,
			MemoryUsage:     enhanced.Metadata.MemoryUsage,
			QualityScore:   0.85, // Mock quality score
		},
	}
	
	// Update metrics
	srs.updateMetrics(enhanced)
	
	c.JSON(http.StatusOK, response)
}

// enhanceBatch handles batch frame enhancement
func (srs *SuperResolutionService) enhanceBatch(c *gin.Context) {
	var requests []EnhancementRequest
	if err := c.ShouldBindJSON(&requests); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Invalid request: %v", err),
		})
		return
	}
	
	// Process batch
	responses := make([]EnhancementResponse, len(requests))
	
	for i, req := range requests[i:] {
		// Decode pixels
		pixels, err := srs.decodeBase64Pixels(req.Pixels)
		if err != nil {
			responses[i] = EnhancementResponse{
				Success: false,
				FrameID: req.FrameID,
				Error:   fmt.Sprintf("Failed to decode pixels: %v", err),
			}
			continue
		}
		
		// Create frame
		frame := &VideoFrame{
			ID:         req.FrameID,
			Width:      req.Width,
			Height:     req.Height,
			Pixels:     pixels,
			Timestamp:  time.Now(),
			FrameIndex: i,
			Quality:    req.Quality,
			DeviceInfo: req.DeviceInfo,
		}
		
		// Process frame
		enhanced, err := srs.upscaler.ProcessFrame(frame)
		if err != nil {
			responses[i] = EnhancementResponse{
				Success: false,
				FrameID: req.FrameID,
				Error:   fmt.Sprintf("Enhancement failed: %v", err),
			}
			continue
		}
		
		// Create response
		responses[i] = EnhancementResponse{
			Success: true,
			FrameID: req.FrameID,
			Enhanced: &EnhancedFrame{
				ID:         enhanced.ID,
				OriginalID: enhanced.OriginalID,
				Width:      enhanced.Width,
				Height:     enhanced.Height,
				Pixels:     srs.encodeBase64Pixels(enhanced.Pixels),
				Timestamp:  enhanced.Timestamp,
				Quality:    enhanced.Quality,
			},
			Quality: enhanced.Quality,
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"results": responses,
		"count":   len(responses),
	})
}

// enhanceStream handles WebSocket stream enhancement
func (srs *SuperResolutionService) enhanceStream(c *gin.Context) {
	streamID := c.Param("streamId")
	
	// Upgrade to WebSocket
	conn, err := srs.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade to WebSocket: %v", err)
		return
	}
	defer conn.Close()
	
	// Create active stream
	stream := &ActiveStream{
		ID:         streamID,
		Conn:       conn,
		InputChan:  make(chan *VideoFrame, 32),
		OutputChan: make(chan *EnhancedFrame, 32),
		StartTime:  time.Now(),
		Quality:    "medium",
	}
	
	// Register stream
	srs.streamsMu.Lock()
	srs.streams[streamID] = stream
	srs.streamsMu.Unlock()
	
	defer func() {
		srs.streamsMu.Lock()
		delete(srs.streams, streamID)
		srs.streamsMu.Unlock()
	}()
	
	log.Printf("WebSocket stream connected: %s", streamID)
	
	// Start stream processing
	go srs.processWebSocketStream(stream)
	
	// Handle WebSocket messages
	srs.handleWebSocketMessages(stream)
}

// createStream creates a new enhancement stream
func (srs *SuperResolutionService) createStream(c *gin.Context) {
	var req StreamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Invalid request: %v", err),
		})
		return
	}
	
	// Check stream limit
	srs.streamsMu.RLock()
	if len(srs.streams) >= srs.config.MaxStreams {
		srs.streamsMu.RUnlock()
		c.JSON(http.StatusTooManyRequests, gin.H{
			"success": false,
			"error":   "Maximum number of streams reached",
		})
		return
	}
	srs.streamsMu.RUnlock()
	
	// Create stream
	stream := &ActiveStream{
		ID:         req.StreamID,
		InputChan:  make(chan *VideoFrame, srs.config.StreamBufferSize),
		OutputChan: make(chan *EnhancedFrame, srs.config.StreamBufferSize),
		StartTime:  time.Now(),
		Quality:    req.Quality,
		DeviceInfo: req.DeviceInfo,
	}
	
	// Register stream
	srs.streamsMu.Lock()
	srs.streams[req.StreamID] = stream
	srs.streamsMu.Unlock()
	
	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"stream_id": req.StreamID,
		"ws_url":    fmt.Sprintf("ws://localhost:%d/api/v1/ai/enhance/stream/%s", srs.config.Port, req.StreamID),
	})
}

// closeStream closes an enhancement stream
func (srs *SuperResolutionService) closeStream(c *gin.Context) {
	streamID := c.Param("streamId")
	
	srs.streamsMu.Lock()
	stream, exists := srs.streams[streamID]
	if exists {
		delete(srs.streams, streamID)
		stream.Conn.Close()
	}
	srs.streamsMu.Unlock()
	
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Stream not found",
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"stream_id": streamID,
		"message":   "Stream closed",
	})
}

// getCapabilities returns AI capabilities
func (srs *SuperResolutionService) getCapabilities(c *gin.Context) {
	capabilities := CapabilitiesResponse{
		SupportedModels:     []ModelInfo{srs.engine.GetModelInfo()},
		SupportedGPUs:       srs.gpuManager.GetDevices(),
		MaxResolution:       Resolution{Width: 3840, Height: 2160}, // 4K
		MaxScaleFactor:      4,
		TargetLatency:       50 * time.Millisecond,
		MaxConcurrentFrames: 8,
		SupportedFormats:    []string{"RGBA", "RGB", "YUV420"},
		Features: []string{
			"real-time-upscaling",
			"adaptive-quality",
			"gpu-acceleration",
			"frame-interpolation",
			"noise-reduction",
			"artifact-suppression",
			"multi-gpu-support",
			"websocket-streaming",
		},
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"capabilities": capabilities,
	})
}

// getMetrics returns service metrics
func (srs *SuperResolutionService) getMetrics(c *gin.Context) {
	srs.metricsMu.Lock()
	metrics := *srs.metrics
	srs.metricsMu.Unlock()
	
	// Add upscaler metrics
	if srs.upscaler != nil {
		upscalerMetrics := srs.upscaler.GetMetrics()
		metrics.FramesProcessed = upscalerMetrics.FramesProcessed
		metrics.AverageLatency = upscalerMetrics.AverageLatency
		metrics.ThroughputFPS = upscalerMetrics.CurrentFPS
		metrics.GPUUtilization = upscalerMetrics.GPUUtilization
		metrics.MemoryUsage = upscalerMetrics.MemoryUsage
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"metrics": metrics,
	})
}

// healthCheck returns service health status
func (srs *SuperResolutionService) healthCheck(c *gin.Context) {
	status := "healthy"
	
	// Check upscaler status
	if srs.upscaler == nil {
		status = "unhealthy"
	} else {
		metrics := srs.upscaler.GetMetrics()
		if metrics.CurrentFPS < float64(srs.upscaler.config.TargetFPS)*0.5 {
			status = "degraded"
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"status":    status,
		"timestamp": time.Now(),
		"version":   "1.0.0",
		"uptime":    time.Since(time.Now()), // Mock uptime
	})
}

// updateConfig updates service configuration
func (srs *SuperResolutionService) updateConfig(c *gin.Context) {
	var config ServiceConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Invalid config: %v", err),
		})
		return
	}
	
	// Update configuration (simplified)
	srs.config = config
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Configuration updated",
	})
}

// getConfig returns current configuration
func (srs *SuperResolutionService) getConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"config":  srs.config,
	})
}

// processWebSocketStream processes WebSocket stream
func (srs *SuperResolutionService) processWebSocketStream(stream *ActiveStream) {
	ctx, cancel := context.WithCancel(srs.ctx)
	defer cancel()
	
	// Process frames from input channel
	for {
		select {
		case frame := <-stream.InputChan:
			// Enhance frame
			enhanced, err := srs.upscaler.ProcessFrame(frame)
			if err != nil {
				log.Printf("Failed to enhance frame %s: %v", frame.ID, err)
				stream.DroppedCount++
				continue
			}
			
			// Send enhanced frame
			select {
			case stream.OutputChan <- enhanced:
				stream.FrameCount++
			case <-ctx.Done():
				return
			default:
				// Output buffer full, drop frame
				stream.DroppedCount++
			}
			
		case <-ctx.Done():
			return
		}
	}
}

// handleWebSocketMessages handles WebSocket messages
func (srs *SuperResolutionService) handleWebSocketMessages(stream *ActiveStream) {
	for {
		messageType, data, err := stream.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
		
		switch messageType {
		case websocket.TextMessage:
			// Handle text messages (control commands)
			srs.handleControlMessage(stream, string(data))
			
		case websocket.BinaryMessage:
			// Handle binary messages (video frames)
			frame, err := srs.parseBinaryFrame(data)
			if err != nil {
				log.Printf("Failed to parse frame: %v", err)
				continue
			}
			
			// Send frame to processing
			select {
			case stream.InputChan <- frame:
			default:
				// Input buffer full, drop frame
				stream.DroppedCount++
			}
		}
	}
}

// handleControlMessage handles WebSocket control messages
func (srs *SuperResolutionService) handleControlMessage(stream *ActiveStream, message string) {
	var command map[string]interface{}
	if err := json.Unmarshal([]byte(message), &command); err != nil {
		log.Printf("Invalid control message: %v", err)
		return
	}
	
	action, ok := command["action"].(string)
	if !ok {
		return
	}
	
	switch action {
	case "set_quality":
		if quality, ok := command["quality"].(string); ok {
			stream.mu.Lock()
			stream.Quality = quality
			stream.mu.Unlock()
		}
		
	case "get_stats":
		stats := map[string]interface{}{
			"frame_count":    stream.FrameCount,
			"dropped_count":  stream.DroppedCount,
			"uptime":         time.Since(stream.StartTime).Seconds(),
			"quality":        stream.Quality,
		}
		
		response, _ := json.Marshal(map[string]interface{}{
			"type": "stats",
			"data": stats,
		})
		stream.Conn.WriteMessage(websocket.TextMessage, response)
	}
}

// parseBinaryFrame parses binary frame data
func (srs *SuperResolutionService) parseBinaryFrame(data []byte) (*VideoFrame, error) {
	// Mock frame parsing
	// In reality, this would parse the actual frame format
	
	frame := &VideoFrame{
		ID:         fmt.Sprintf("frame_%d", time.Now().UnixNano()),
		Width:      640,
		Height:     360,
		Pixels:     data,
		Timestamp:  time.Now(),
		FrameIndex: 0,
		Quality:    "medium",
	}
	
	return frame, nil
}

// decodeBase64Pixels decodes base64 encoded pixels
func (srs *SuperResolutionService) decodeBase64Pixels(encoded string) ([]byte, error) {
	// Mock base64 decoding
	// In reality, this would use proper base64 decoding
	return []byte(encoded), nil
}

// encodeBase64Pixels encodes pixels to base64
func (srs *SuperResolutionService) encodeBase64Pixels(pixels []byte) string {
	// Mock base64 encoding
	// In reality, this would use proper base64 encoding
	return string(pixels)
}

// updateMetrics updates service metrics
func (srs *SuperResolutionService) updateMetrics(enhanced *EnhancedFrame) {
	srs.metricsMu.Lock()
	defer srs.metricsMu.Unlock()
	
	srs.metrics.FramesProcessed++
	srs.metrics.QualityDistribution[enhanced.Quality]++
	
	// Update average quality
	total := int64(0)
	for _, count := range srs.metrics.QualityDistribution {
		total += count
	}
	
	if total > 0 {
		// Mock quality calculation
		srs.metrics.AverageQuality = 0.85
	}
	
	srs.metrics.LastUpdate = time.Now()
}

// collectMetrics collects service metrics periodically
func (srs *SuperResolutionService) collectMetrics() {
	ticker := time.NewTicker(srs.config.MetricsInterval)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			srs.updateServiceMetrics()
		case <-srs.ctx.Done():
			return
		}
	}
}

// updateServiceMetrics updates service-wide metrics
func (srs *SuperResolutionService) updateServiceMetrics() {
	srs.metricsMu.Lock()
	defer srs.metricsMu.Unlock()
	
	// Update connection metrics
	srs.metrics.ActiveConnections = len(srs.streams)
	srs.metrics.WebSocketStreams = len(srs.streams)
	
	// Update resource metrics
	if srs.gpuManager != nil {
		srs.metrics.GPUUtilization = srs.gpuManager.GetUtilization()
		srs.metrics.MemoryUsage = srs.gpuManager.GetMemoryUsage()
	}
	
	// Update CPU usage (mock)
	srs.metrics.CPUUsage = 25.0
	
	srs.metrics.LastUpdate = time.Now()
}

// cleanupStreams cleans up inactive streams
func (srs *SuperResolutionService) cleanupStreams() {
	ticker := time.NewTicker(30 * time.Second) // Cleanup every 30 seconds
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			srs.cleanupInactiveStreams()
		case <-srs.ctx.Done():
			return
		}
	}
}

// cleanupInactiveStreams removes inactive streams
func (srs *SuperResolutionService) cleanupInactiveStreams() {
	srs.streamsMu.Lock()
	defer srs.streamsMu.Unlock()
	
	now := time.Now()
	for id, stream := range srs.streams {
		// Check if stream is inactive (no frames for 60 seconds)
		if now.Sub(stream.StartTime) > 60*time.Second && stream.FrameCount == 0 {
			log.Printf("Cleaning up inactive stream: %s", id)
			stream.Conn.Close()
			delete(srs.streams, id)
		}
	}
}

// corsMiddleware adds CORS headers
func (srs *SuperResolutionService) corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		
		// Check if origin is allowed
		allowed := false
		for _, allowedOrigin := range srs.config.AllowedOrigins {
			if allowedOrigin == "*" || allowedOrigin == origin {
				allowed = true
				break
			}
		}
		
		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
			c.Header("Access-Control-Allow-Credentials", "true")
		}
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		
		c.Next()
	}
}
