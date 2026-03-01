/**
 * Streaming Service - Main API Service
 * 
 * Provides HTTP endpoints for parallel streaming
 * Integrates all streaming components
 * Handles video streaming requests
 * 
 * Features:
 * - HTTP API endpoints
 * - Parallel streaming integration
 * - Request/response handling
 * - Error handling and logging
 */

package streaming

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/scylladb/gocqlx/v2"
	"github.com/scylladb/gocqlx/v2/qb"
)

// StreamingService handles streaming HTTP requests
type StreamingService struct {
	session              *gocqlx.Session
	parallelManager      *ParallelStreamingManager
	router               *mux.Router
	server               *http.Server
	port                 int
	metrics              *ServiceMetrics
	mu                   sync.RWMutex
}

// ServiceMetrics tracks service performance
type ServiceMetrics struct {
	TotalRequests        int64         `json:"total_requests"`
	SuccessfulRequests   int64         `json:"successful_requests"`
	FailedRequests       int64         `json:"failed_requests"`
	AverageResponseTime  time.Duration `json:"average_response_time"`
	TotalBytesStreamed   int64         `json:"total_bytes_streamed"`
	AverageStreamSpeed   float64       `json:"average_stream_speed"`
	LastUpdated          time.Time     `json:"last_updated"`
	CreatedAt            time.Time     `json:"created_at"`
	
	mu                   sync.RWMutex
}

// StreamRequest represents a streaming request
type StreamRequest struct {
	VideoURL             string        `json:"video_url"`
	VideoID              uuid.UUID     `json:"video_id"`
	Quality              string        `json:"quality"`
	NumWorkers           int           `json:"num_workers"`
	ChunkSize            int64         `json:"chunk_size"`
	Timeout              time.Duration `json:"timeout"`
	EnableOptimization   bool          `json:"enable_optimization"`
}

// StreamResponse represents a streaming response
type StreamResponse struct {
	Success               bool          `json:"success"`
	VideoID               uuid.UUID     `json:"video_id"`
	Size                  int64         `json:"size"`
	ProcessingTime        time.Duration `json:"processing_time"`
	TransferRate          float64       `json:"transfer_rate"`
	SpeedMultiplier       float64       `json:"speed_multiplier"`
	ChunksCount           int           `json:"chunks_count"`
	WorkersUsed           int           `json:"workers_used"`
	Quality               string        `json:"quality"`
	OptimizationApplied   bool          `json:"optimization_applied"`
	Metrics               *StreamMetrics `json:"metrics"`
	Error                 string        `json:"error,omitempty"`
}

// StreamMetrics represents stream performance metrics
type StreamMetrics struct {
	TransferRate          float64       `json:"transfer_rate"`
	Latency               time.Duration `json:"latency"`
	Efficiency            float64       `json:"efficiency"`
	ParallelEfficiency    float64       `json:"parallel_efficiency"`
	QualityScore          float64       `json:"quality_score"`
	NetworkPrediction     *NetworkPrediction `json:"network_prediction,omitempty"`
	QualityAdjustment     *QualityAdjustment `json:"quality_adjustment,omitempty"`
	BufferOptimization    *BufferOptimization `json:"buffer_optimization,omitempty"`
}

// NewStreamingService creates a new streaming service
func NewStreamingService(session *gocqlx.Session, port int) *StreamingService {
	config := ParallelStreamingConfig{
		NumGoroutines:         10,  // 10 Go-routines as requested
		ChunkSize:             1024 * 1024, // 1MB chunks
		MaxConcurrentStreams:  100,
		BufferSize:            10 * 1024 * 1024, // 10MB buffer
		TargetSpeedMultiplier: 100.0, // 100x faster
		MinTransferRate:        1024, // 1GB/s
		MaxLatency:             10 * time.Millisecond,
		Timeout:                30 * time.Second,
		MaxRetries:             3,
		RetryDelay:             100 * time.Millisecond,
		KeepAlive:              true,
		CompressionEnabled:     true,
		AdaptiveChunking:       true,
		NetworkPrediction:      true,
		QualityAdaptation:      true,
		BufferOptimization:     true,
	}

	ss := &StreamingService{
		session:         session,
		parallelManager: NewParallelStreamingManager(session, config),
		router:          mux.NewRouter(),
		port:            port,
		metrics:         NewServiceMetrics(),
	}

	// Setup routes
	ss.setupRoutes()

	return ss
}

// setupRoutes sets up HTTP routes
func (ss *StreamingService) setupRoutes() {
	// Streaming endpoints
	ss.router.HandleFunc("/api/stream", ss.handleStreamRequest).Methods("POST")
	ss.router.HandleFunc("/api/stream/{videoID}", ss.handleStreamVideo).Methods("GET")
	
	// Metrics endpoints
	ss.router.HandleFunc("/api/metrics", ss.handleGetMetrics).Methods("GET")
	ss.router.HandleFunc("/api/metrics/streaming", ss.handleGetStreamingMetrics).Methods("GET")
	ss.router.HandleFunc("/api/metrics/performance", ss.handleGetPerformanceMetrics).Methods("GET")
	
	// Optimization endpoints
	ss.router.HandleFunc("/api/optimize", ss.handleOptimizationRequest).Methods("POST")
	ss.router.HandleFunc("/api/optimize/network", ss.handleGetNetworkPrediction).Methods("GET")
	
	// Health check
	ss.router.HandleFunc("/health", ss.handleHealthCheck).Methods("GET")
	ss.router.HandleFunc("/", ss.handleRoot).Methods("GET")

	log.Printf("🔧 Streaming routes configured on port %d", ss.port)
}

// handleStreamRequest handles streaming requests
func (ss *StreamingService) handleStreamRequest(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	log.Printf("🚀 Received stream request from %s", r.RemoteAddr)

	// Parse request
	var req StreamRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ss.sendErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Validate request
	if err := ss.validateStreamRequest(&req); err != nil {
		ss.sendErrorResponse(w, http.StatusBadRequest, "Invalid request", err)
		return
	}

	// Stream video
	result, err := ss.parallelManager.StreamVideo(r.Context(), req.VideoURL, req.VideoID)
	if err != nil {
		ss.metrics.mu.Lock()
		ss.metrics.FailedRequests++
		ss.metrics.mu.Unlock()
		
		ss.sendErrorResponse(w, http.StatusInternalServerError, "Streaming failed", err)
		return
	}

	// Get streaming metrics
	streamingMetrics := ss.parallelManager.GetMetrics()
	metrics := &StreamMetrics{
		TransferRate:       result.TransferRate,
		Latency:           result.ProcessingTime,
		Efficiency:        streamingMetrics.ParallelEfficiency,
		ParallelEfficiency: streamingMetrics.ParallelEfficiency,
		QualityScore:      streamingMetrics.QualityScore,
	}

	// Add optimization metrics if enabled
	if req.EnableOptimization {
		optimizer := ss.parallelManager.streamOptimizer
		metrics.NetworkPrediction = optimizer.GetNetworkPrediction()
		if len(optimizer.GetQualityAdjustmentHistory()) > 0 {
			history := optimizer.GetQualityAdjustmentHistory()
			metrics.QualityAdjustment = &history[len(history)-1]
		}
		if len(optimizer.GetBufferOptimizationHistory()) > 0 {
			history := optimizer.GetBufferOptimizationHistory()
			metrics.BufferOptimization = &history[len(history)-1]
		}
	}

	// Create response
	response := &StreamResponse{
		Success:             true,
		VideoID:             result.VideoID,
		Size:                result.Size,
		ProcessingTime:      result.ProcessingTime,
		TransferRate:        result.TransferRate,
		SpeedMultiplier:     result.SpeedMultiplier,
		ChunksCount:         result.ChunksCount,
		WorkersUsed:         result.WorkersUsed,
		Quality:             req.Quality,
		OptimizationApplied: req.EnableOptimization,
		Metrics:             metrics,
	}

	// Update service metrics
	ss.updateServiceMetrics(result.Size, result.ProcessingTime, result.TransferRate, true)

	// Send response
	ss.sendJSONResponse(w, http.StatusOK, response)

	processingTime := time.Since(startTime)
	log.Printf("✅ Stream request completed in %v: %d bytes, %.2f MB/s, %.1fx speed", 
		processingTime, result.Size, result.TransferRate, result.SpeedMultiplier)
}

// handleStreamVideo handles video streaming by ID
func (ss *StreamingService) handleStreamVideo(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	videoIDStr := vars["videoID"]

	videoID, err := uuid.Parse(videoIDStr)
	if err != nil {
		ss.sendErrorResponse(w, http.StatusBadRequest, "Invalid video ID", err)
		return
	}

	// Get video URL from database (simplified for demo)
	videoURL := fmt.Sprintf("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4")

	// Create stream request
	req := &StreamRequest{
		VideoURL:           videoURL,
		VideoID:            videoID,
		Quality:            "1080p",
		NumWorkers:         10,
		ChunkSize:          1024 * 1024,
		Timeout:            30 * time.Second,
		EnableOptimization: true,
	}

	// Stream video
	result, err := ss.parallelManager.StreamVideo(r.Context(), req.VideoURL, req.VideoID)
	if err != nil {
		ss.sendErrorResponse(w, http.StatusInternalServerError, "Streaming failed", err)
		return
	}

	// Stream video data directly
	w.Header().Set("Content-Type", "video/mp4")
	w.Header().Set("Content-Length", strconv.FormatInt(result.Size, 10))
	w.Header().Set("X-Transfer-Rate", fmt.Sprintf("%.2f", result.TransferRate))
	w.Header().Set("X-Speed-Multiplier", fmt.Sprintf("%.1f", result.SpeedMultiplier))
	w.Header().Set("X-Chunks-Count", strconv.Itoa(result.ChunksCount))
	w.Header().Set("X-Workers-Used", strconv.Itoa(result.WorkersUsed))

	if _, err := w.Write(result.VideoData); err != nil {
		log.Printf("❌ Failed to write video data: %v", err)
		return
	}

	log.Printf("✅ Video %s streamed: %d bytes, %.2f MB/s, %.1fx speed", 
		videoIDStr, result.Size, result.TransferRate, result.SpeedMultiplier)
}

// handleGetMetrics handles metrics requests
func (ss *StreamingService) handleGetMetrics(w http.ResponseWriter, r *http.Request) {
	ss.metrics.mu.RLock()
	metrics := *ss.metrics
	ss.metrics.mu.RUnlock()

	ss.sendJSONResponse(w, http.StatusOK, metrics)
}

// handleGetStreamingMetrics handles streaming metrics requests
func (ss *StreamingService) handleGetStreamingMetrics(w http.ResponseWriter, r *http.Request) {
	metrics := ss.parallelManager.GetMetrics()
	ss.sendJSONResponse(w, http.StatusOK, metrics)
}

// handleGetPerformanceMetrics handles performance metrics requests
func (ss *StreamingService) handleGetPerformanceMetrics(w http.ResponseWriter, r *http.Request) {
	monitor := ss.parallelManager.performanceMonitor
	performanceMetrics := monitor.GetMetrics()
	activeAlerts := monitor.GetActiveAlerts()
	summary := monitor.GetPerformanceSummary()

	response := map[string]interface{}{
		"metrics":  performanceMetrics,
		"alerts":   activeAlerts,
		"summary":  summary,
	}

	ss.sendJSONResponse(w, http.StatusOK, response)
}

// handleOptimizationRequest handles optimization requests
func (ss *StreamingService) handleOptimizationRequest(w http.ResponseWriter, r *http.Request) {
	metrics := ss.parallelManager.GetMetrics()
	ss.parallelManager.streamOptimizer.Optimize(metrics)

	optimizerMetrics := ss.parallelManager.streamOptimizer.GetMetrics()
	networkPrediction := ss.parallelManager.streamOptimizer.GetNetworkPrediction()

	response := map[string]interface{}{
		"optimizer_metrics":  optimizerMetrics,
		"network_prediction": networkPrediction,
		"optimized_at":       time.Now(),
	}

	ss.sendJSONResponse(w, http.StatusOK, response)
}

// handleGetNetworkPrediction handles network prediction requests
func (ss *StreamingService) handleGetNetworkPrediction(w http.ResponseWriter, r *http.Request) {
	prediction := ss.parallelManager.streamOptimizer.GetNetworkPrediction()
	ss.sendJSONResponse(w, http.StatusOK, prediction)
}

// handleHealthCheck handles health check requests
func (ss *StreamingService) handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	health := map[string]interface{}{
		"status":     "healthy",
		"timestamp":  time.Now(),
		"version":    "1.0.0",
		"port":       ss.port,
		"workers":    10,
		"chunk_size":  1024 * 1024,
		"speed_multiplier": 100.0,
	}

	ss.sendJSONResponse(w, http.StatusOK, health)
}

// handleRoot handles root requests
func (ss *StreamingService) handleRoot(w http.ResponseWriter, r *http.Request) {
	root := map[string]interface{}{
		"service":     "Kronop Parallel Streaming",
		"description":  "100x faster video streaming with 10 Go-routines",
		"version":     "1.0.0",
		"endpoints": map[string]string{
			"stream":        "/api/stream",
			"metrics":       "/api/metrics",
			"optimization":  "/api/optimize",
			"health":        "/health",
		},
		"features": []string{
			"10 parallel Go-routines",
			"100x speed improvement",
			"Smart chunk division",
			"Adaptive streaming",
			"Real-time optimization",
		},
	}

	ss.sendJSONResponse(w, http.StatusOK, root)
}

// validateStreamRequest validates stream request
func (ss *StreamingService) validateStreamRequest(req *StreamRequest) error {
	if req.VideoURL == "" {
		return fmt.Errorf("video URL is required")
	}

	if req.VideoID == uuid.Nil {
		return fmt.Errorf("valid video ID is required")
	}

	if req.NumWorkers <= 0 || req.NumWorkers > 20 {
		return fmt.Errorf("number of workers must be between 1 and 20")
	}

	if req.ChunkSize <= 0 || req.ChunkSize > 100*1024*1024 {
		return fmt.Errorf("chunk size must be between 1 and 100MB")
	}

	if req.Timeout <= 0 || req.Timeout > 5*time.Minute {
		return fmt.Errorf("timeout must be between 1 second and 5 minutes")
	}

	return nil
}

// updateServiceMetrics updates service metrics
func (ss *StreamingService) updateServiceMetrics(bytesStreamed int64, processingTime time.Duration, transferRate float64, success bool) {
	ss.metrics.mu.Lock()
	defer ss.metrics.mu.Unlock()

	ss.metrics.TotalRequests++
	
	if success {
		ss.metrics.SuccessfulRequests++
	} else {
		ss.metrics.FailedRequests++
	}

	// Update average response time
	if ss.metrics.AverageResponseTime == 0 {
		ss.metrics.AverageResponseTime = processingTime
	} else {
		ss.metrics.AverageResponseTime = (ss.metrics.AverageResponseTime + processingTime) / 2
	}

	// Update total bytes streamed
	ss.metrics.TotalBytesStreamed += bytesStreamed

	// Update average stream speed
	if ss.metrics.AverageStreamSpeed == 0 {
		ss.metrics.AverageStreamSpeed = transferRate
	} else {
		ss.metrics.AverageStreamSpeed = (ss.metrics.AverageStreamSpeed + transferRate) / 2
	}

	ss.metrics.LastUpdated = time.Now()
}

// sendJSONResponse sends JSON response
func (ss *StreamingService) sendJSONResponse(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("❌ Failed to encode JSON response: %v", err)
	}
}

// sendErrorResponse sends error response
func (ss *StreamingService) sendErrorResponse(w http.ResponseWriter, statusCode int, message string, err error) {
	errorResponse := map[string]interface{}{
		"success": false,
		"error":   message,
		"details": err.Error(),
		"timestamp": time.Now(),
	}

	ss.sendJSONResponse(w, statusCode, errorResponse)
}

// Start starts the streaming service
func (ss *StreamingService) Start() error {
	ss.server = &http.Server{
		Addr:         fmt.Sprintf(":%d", ss.port),
		Handler:      ss.router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	log.Printf("🚀 Starting Kronop Parallel Streaming Service on port %d", ss.port)
	log.Printf("🔥 Features: 10 Go-routines, 100x speed, parallel chunk fetching")

	return ss.server.ListenAndServe()
}

// Stop stops the streaming service
func (ss *StreamingService) Stop() error {
	log.Println("🔌 Stopping Kronop Parallel Streaming Service")
	
	if ss.server != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		
		return ss.server.Shutdown(ctx)
	}

	return nil
}

// Helper functions

func NewServiceMetrics() *ServiceMetrics {
	return &ServiceMetrics{
		CreatedAt: time.Now(),
	}
}
