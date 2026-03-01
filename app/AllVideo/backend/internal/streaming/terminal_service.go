/**
 * Terminal Service - HTTP API for Terminal Multiplexing
 * 
 * Provides HTTP endpoints for terminal multiplexing
 * Handles byte range requests and memory stitching
 * Manages terminal connections and performance
 * 
 * Features:
 * - Terminal multiplexing API
 * - Byte range management
 * - Memory stitching endpoints
 * - Performance monitoring
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
)

// TerminalService handles terminal multiplexing HTTP requests
type TerminalService struct {
	session              *gocqlx.Session
	terminalMultiplexer  *TerminalMultiplexer
	router               *mux.Router
	server               *http.Server
	port                 int
	metrics              *TerminalServiceMetrics
	mu                   sync.RWMutex
}

// TerminalServiceMetrics tracks service performance
type TerminalServiceMetrics struct {
	TotalRequests         int64         `json:"total_requests"`
	SuccessfulRequests    int64         `json:"successful_requests"`
	FailedRequests        int64         `json:"failed_requests"`
	AverageResponseTime   time.Duration `json:"average_response_time"`
	TotalBytesStitched    int64         `json:"total_bytes_stitched"`
	TerminalsUtilized     int64         `json:"terminals_utilized"`
	MemoryEfficiency      float64       `json:"memory_efficiency"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// StitchRequest represents a stitch request
type StitchRequest struct {
	VideoURL              string        `json:"video_url"`
	Start                 int64         `json:"start"`
	End                   int64         `json:"end"`
	PreferredTerminals    []string      `json:"preferred_terminals"`
	MaxConcurrentRanges   int           `json:"max_concurrent_ranges"`
	StitchingStrategy     string        `json:"stitching_strategy"`
	Timeout               time.Duration `json:"timeout"`
	EnableZeroCopy        bool          `json:"enable_zero_copy"`
	EnablePrefetch        bool          `json:"enable_prefetch"`
	MemoryPoolSize        int64         `json:"memory_pool_size"`
	ChunkSize             int64         `json:"chunk_size"`
}

// StitchResponse represents a stitch response
type StitchResponse struct {
	Success               bool          `json:"success"`
	Data                  []byte        `json:"data,omitempty"`
	Size                  int64         `json:"size"`
	ProcessingTime        time.Duration `json:"processing_time"`
	TerminalsUsed         []string      `json:"terminals_used"`
	RangeCount            int           `json:"range_count"`
	StitchingTime         time.Duration `json:"stitching_time"`
	AssemblyTime          time.Duration `json:"assembly_time"`
	MemoryEfficiency      float64       `json:"memory_efficiency"`
	ZeroCopyUsed          bool          `json:"zero_copy_used"`
	PrefetchHits          int64         `json:"prefetch_hits"`
	TransferRate          float64       `json:"transfer_rate"`
	Metrics               *StitchMetrics `json:"metrics"`
	Error                 string        `json:"error,omitempty"`
}

// StitchMetrics represents stitch metrics
type StitchMetrics struct {
	RangeData            []*RangeData `json:"range_data"`
	SourceRanges         []Range       `json:"source_ranges"`
	MemoryPoolStats      *MemoryPoolStats `json:"memory_pool_stats"`
	AssemblyBufferStats   *AssemblyBufferMetrics `json:"assembly_buffer_stats"`
	ByteRangeStats       *RangeStatistics `json:"byte_range_stats"`
	StitchingStrategy    string        `json:"stitching_strategy"`
}

// RangeRequest represents a range request
type RangeRequest struct {
	VideoURL              string        `json:"video_url"`
	Start                 int64         `json:"start"`
	End                   int64         `json:"end"`
	TerminalID            string        `json:"terminal_id"`
	Timeout               time.Duration `json:"timeout"`
}

// RangeResponse represents a range response
type RangeResponse struct {
	Success               bool          `json:"success"`
	Data                  []byte        `json:"data,omitempty"`
	Size                  int64         `json:"size"`
	Range                 Range         `json:"range"`
	TerminalID            string        `json:"terminal_id"`
	FetchTime             time.Duration `json:"fetch_time"`
	TransferRate          float64       `json:"transfer_rate"`
	Error                 string        `json:"error,omitempty"`
}

// NewTerminalService creates a new terminal service
func NewTerminalService(session *gocqlx.Session, port int) *TerminalService {
	config := TerminalMultiplexingConfig{
		MaxConcurrentTerminals: 5,
		MinTerminalsRequired:   2,
		Timeout:                30 * time.Second,
		RetryDelay:             100 * time.Millisecond,
		MaxRetries:             3,
		ChunkSize:              64 * 1024, // 64KB chunks
		MaxRangeSize:           1024 * 1024, // 1MB max range
		MinRangeSize:           1024, // 1KB min range
		RangeOverlap:           1024, // 1KB overlap
		RangeAlignment:         4096, // 4KB alignment
		StitchingStrategy:      "adaptive",
		MemoryPoolSize:         100 * 1024 * 1024, // 100MB pool
		MaxConcurrentStitches:  10,
		ZeroCopyEnabled:        true,
		PrefetchEnabled:        true,
		OptimizationLevel:      "balanced",
		AssemblyTimeout:        30 * time.Second,
		MaxAssemblyTime:        10 * time.Second,
		MemoryThreshold:        0.8, // 80% memory usage
	}

	ts := &TerminalService{
		session:             session,
		terminalMultiplexer: NewTerminalMultiplexer(config),
		router:              mux.NewRouter(),
		port:                port,
		metrics:             NewTerminalServiceMetrics(),
	}

	// Setup routes
	ts.setupRoutes()

	return ts
}

// setupRoutes sets up HTTP routes
func (ts *TerminalService) setupRoutes() {
	// Terminal multiplexing endpoints
	ts.router.HandleFunc("/api/terminal/stitch", ts.handleStitchRequest).Methods("POST")
	ts.router.HandleFunc("/api/terminal/stitch/{videoID}", ts.handleStitchVideo).Methods("GET")
	ts.router.HandleFunc("/api/terminal/range", ts.handleRangeRequest).Methods("POST")
	ts.router.HandleFunc("/api/terminal/range/{videoID}/{start}/{end}", ts.handleRangeVideo).Methods("GET")
	
	// Terminal management endpoints
	ts.router.HandleFunc("/api/terminals", ts.handleGetTerminals).Methods("GET")
	ts.router.HandleFunc("/api/terminals/{terminalID}/health", ts.handleTerminalHealth).Methods("GET")
	ts.router.HandleFunc("/api/terminals/{terminalID}/stats", ts.handleTerminalStats).Methods("GET")
	
	// Memory management endpoints
	ts.router.HandleFunc("/api/memory/pool/stats", ts.handleMemoryPoolStats).Methods("GET")
	ts.router.HandleFunc("/api/memory/assembly/stats", ts.handleAssemblyBufferStats).Methods("GET")
	ts.router.HandleFunc("/api/memory/cleanup", ts.handleMemoryCleanup).Methods("POST")
	
	// Byte range management endpoints
	ts.router.HandleFunc("/api/ranges/optimize", ts.handleOptimizeRanges).Methods("POST")
	ts.router.HandleFunc("/api/ranges/stats", ts.handleRangeStats).Methods("GET")
	ts.router.HandleFunc("/api/ranges/calculate", ts.handleCalculateRanges).Methods("POST")
	
	// Performance endpoints
	ts.router.HandleFunc("/api/terminal/metrics", ts.handleGetMetrics).Methods("GET")
	ts.router.HandleFunc("/api/terminal/performance", ts.handleGetPerformanceMetrics).Methods("GET")
	ts.router.HandleFunc("/api/terminal/strategy", ts.handleGetStitchingStrategy).Methods("GET")
	ts.router.HandleFunc("/api/terminal/strategy", ts.handleSetStitchingStrategy).Methods("PUT")
	
	// Health check
	ts.router.HandleFunc("/health", ts.handleHealthCheck).Methods("GET")
	ts.router.HandleFunc("/", ts.handleRoot).Methods("GET")

	log.Printf("📱 Terminal routes configured on port %d", ts.port)
}

// handleStitchRequest handles stitch requests
func (ts *TerminalService) handleStitchRequest(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	log.Printf("📱 Received stitch request from %s", r.RemoteAddr)

	// Parse request
	var req StitchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ts.sendErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Validate request
	if err := ts.validateStitchRequest(&req); err != nil {
		ts.sendErrorResponse(w, http.StatusBadRequest, "Invalid request", err)
		return
	}

	// Create range request
	rangeReq := &RangeRequest{
		VideoURL:              req.VideoURL,
		Start:                 req.Start,
		End:                   req.End,
		PreferredTerminals:    req.PreferredTerminals,
		MaxConcurrentRanges:   req.MaxConcurrentRanges,
		Timeout:               req.Timeout,
		EnableZeroCopy:        req.EnableZeroCopy,
		EnablePrefetch:        req.EnablePrefetch,
	}

	// Stitch data from terminals
	ctx, cancel := context.WithTimeout(r.Context(), req.Timeout)
	defer cancel()

	stitchedData, err := ts.terminalMultiplexer.StitchData(ctx, rangeReq)
	if err != nil {
		ts.metrics.mu.Lock()
		ts.metrics.FailedRequests++
		ts.metrics.mu.Unlock()
		
		ts.sendErrorResponse(w, http.StatusInternalServerError, "Terminal stitching failed", err)
		return
	}

	// Create response
	response := &StitchResponse{
		Success:          true,
		Size:             stitchedData.Size,
		ProcessingTime:   time.Since(startTime),
		TerminalsUsed:    stitchedData.TerminalsUsed,
		RangeCount:       len(stitchedData.SourceRanges),
		StitchingTime:    stitchedData.StitchingTime,
		AssemblyTime:     stitchedData.AssemblyTime,
		MemoryEfficiency: stitchedData.MemoryEfficiency,
		ZeroCopyUsed:     stitchedData.ZeroCopyUsed,
		PrefetchHits:     stitchedData.PrefetchHits,
		TransferRate:     float64(stitchedData.Size) / stitchedData.StitchingTime.Seconds() / (1024 * 1024), // MB/s
		Metrics: &StitchMetrics{
			SourceRanges:      stitchedData.SourceRanges,
			StitchingStrategy: ts.terminalMultiplexer.memoryStitcher.GetStrategy(),
		},
	}

	// Update service metrics
	ts.updateServiceMetrics(stitchedData.Size, time.Since(startTime), len(stitchedData.TerminalsUsed), true)

	// Send response
	ts.sendJSONResponse(w, http.StatusOK, response)

	processingTime := time.Since(startTime)
	log.Printf("✅ Stitch request completed: %v, %d bytes, %d terminals, %.2f MB/s", 
		processingTime, stitchedData.Size, len(stitchedData.TerminalsUsed), response.TransferRate)
}

// handleStitchVideo handles video stitching by ID
func (ts *TerminalService) handleStitchVideo(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	videoID := vars["videoID"]

	// Parse query parameters
	startStr := r.URL.Query().Get("start")
	endStr := r.URL.Query().Get("end")
	
	start := int64(0)
	end := int64(1024 * 1024 - 1) // Default 1MB

	if startStr != "" {
		if parsed, err := strconv.ParseInt(startStr, 10, 64); err == nil {
			start = parsed
		}
	}

	if endStr != "" {
		if parsed, err := strconv.ParseInt(endStr, 10, 64); err == nil {
			end = parsed
		}
	}

	// Create mock video URL
	videoURL := fmt.Sprintf("https://api.example.com/videos/%s", videoID)

	// Create stitch request
	req := &RangeRequest{
		VideoURL:           videoURL,
		Start:              start,
		End:                end,
		MaxConcurrentRanges: 10,
		Timeout:            30 * time.Second,
		EnableZeroCopy:     true,
		EnablePrefetch:     true,
	}

	// Stitch data
	ctx, cancel := context.WithTimeout(r.Context(), req.Timeout)
	defer cancel()

	stitchedData, err := ts.terminalMultiplexer.StitchData(ctx, req)
	if err != nil {
		ts.sendErrorResponse(w, http.StatusInternalServerError, "Video stitching failed", err)
		return
	}

	// Stream video data directly
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Length", strconv.FormatInt(stitchedData.Size, 10))
	w.Header().Set("X-Transfer-Rate", fmt.Sprintf("%.2f", float64(stitchedData.Size)/stitchedData.StitchingTime.Seconds()/(1024*1024)))
	w.Header().Set("X-Terminals-Used", fmt.Sprintf("%d", len(stitchedData.TerminalsUsed)))
	w.Header().Set("X-Range-Count", fmt.Sprintf("%d", len(stitchedData.SourceRanges)))
	w.Header().Set("X-Memory-Efficiency", fmt.Sprintf("%.2f", stitchedData.MemoryEfficiency))
	w.Header().Set("X-Zero-Copy-Used", fmt.Sprintf("%t", stitchedData.ZeroCopyUsed))

	if _, err := w.Write(stitchedData.Data); err != nil {
		log.Printf("❌ Failed to write stitched data: %v", err)
		return
	}

	log.Printf("✅ Video %s stitched: %d bytes, %d terminals, %.2f MB/s", 
		videoID, stitchedData.Size, len(stitchedData.TerminalsUsed), float64(stitchedData.Size)/stitchedData.StitchingTime.Seconds()/(1024*1024))
}

// handleRangeRequest handles range requests
func (ts *TerminalService) handleRangeRequest(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	// Parse request
	var req RangeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ts.sendErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Validate request
	if req.Start < 0 || req.End < req.Start {
		ts.sendErrorResponse(w, http.StatusBadRequest, "Invalid range", fmt.Errorf("invalid byte range"))
		return
	}

	// Create range
	rangeObj := Range{
		Start:     req.Start,
		End:       req.End,
		Size:      req.End - req.Start + 1,
		Status:    "pending",
		FetchedAt: time.Now(),
	}

	// Mock range data (in production, fetch from terminal)
	data := make([]byte, rangeObj.Size)
	for i := range data {
		data[i] = byte(i % 256)
	}

	fetchTime := time.Since(startTime)
	transferRate := float64(len(data)) / fetchTime.Seconds() / (1024 * 1024) // MB/s

	// Create response
	response := &RangeResponse{
		Success:      true,
		Data:         data,
		Size:         int64(len(data)),
		Range:        rangeObj,
		TerminalID:   req.TerminalID,
		FetchTime:    fetchTime,
		TransferRate: transferRate,
	}

	ts.sendJSONResponse(w, http.StatusOK, response)

	log.Printf("✅ Range %d-%d fetched: %d bytes in %v (%.2f MB/s)", 
		req.Start, req.End, len(data), fetchTime, transferRate)
}

// handleRangeVideo handles video range requests
func (ts *TerminalService) handleRangeVideo(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	videoID := vars["videoID"]
	startStr := vars["start"]
	endStr := vars["end"]

	start, err := strconv.ParseInt(startStr, 10, 64)
	if err != nil {
		ts.sendErrorResponse(w, http.StatusBadRequest, "Invalid start parameter", err)
		return
	}

	end, err := strconv.ParseInt(endStr, 10, 64)
	if err != nil {
		ts.sendErrorResponse(w, http.StatusBadRequest, "Invalid end parameter", err)
		return
	}

	// Create range
	rangeObj := Range{
		Start:     start,
		End:       end,
		Size:      end - start + 1,
		Status:    "completed",
		FetchedAt: time.Now(),
	}

	// Mock range data
	data := make([]byte, rangeObj.Size)
	for i := range data {
		data[i] = byte((start + int64(i)) % 256)
	}

	// Stream range data
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Length", strconv.FormatInt(int64(len(data)), 10))
	w.Header().Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end, end+1))
	w.Header().Set("X-Video-ID", videoID)
	w.Header().Set("X-Range-Start", strconv.FormatInt(start, 10))
	w.Header().Set("X-Range-End", strconv.FormatInt(end, 10))

	if _, err := w.Write(data); err != nil {
		log.Printf("❌ Failed to write range data: %v", err)
		return
	}

	log.Printf("✅ Video %s range %d-%d streamed: %d bytes", videoID, start, end, len(data))
}

// handleGetTerminals handles terminal information requests
func (ts *TerminalService) handleGetTerminals(w http.ResponseWriter, r *http.Request) {
	terminals := ts.terminalMultiplexer.GetTerminals()
	ts.sendJSONResponse(w, http.StatusOK, terminals)
}

// handleTerminalHealth handles terminal health check requests
func (ts *TerminalService) handleTerminalHealth(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	terminalID := vars["terminalID"]

	// Mock health check
	health := map[string]interface{}{
		"terminal_id": terminalID,
		"status":      "healthy",
		"response_time": "50ms",
		"last_check":  time.Now(),
		"active_connections": 5,
		"success_rate": 0.98,
	}

	ts.sendJSONResponse(w, http.StatusOK, health)
}

// handleTerminalStats handles terminal statistics requests
func (ts *TerminalService) handleTerminalStats(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	terminalID := vars["terminalID"]

	// Mock terminal stats
	stats := map[string]interface{}{
		"terminal_id":           terminalID,
		"total_bytes_transferred": int64(1024 * 1024 * 1024), // 1GB
		"average_transfer_rate":  50.5, // MB/s
		"active_connections":     5,
		"success_rate":          0.98,
		"last_updated":          time.Now(),
	}

	ts.sendJSONResponse(w, http.StatusOK, stats)
}

// handleMemoryPoolStats handles memory pool statistics requests
func (ts *TerminalService) handleMemoryPoolStats(w http.ResponseWriter, r *http.Request) {
	stats := ts.terminalMultiplexer.memoryStitcher.memoryPool.GetStats()
	ts.sendJSONResponse(w, http.StatusOK, stats)
}

// handleAssemblyBufferStats handles assembly buffer statistics requests
func (ts *TerminalService) handleAssemblyBufferStats(w http.ResponseWriter, r *http.Request) {
	stats := ts.terminalMultiplexer.memoryStitcher.assemblyBuffer.GetMetrics()
	ts.sendJSONResponse(w, http.StatusOK, stats)
}

// handleMemoryCleanup handles memory cleanup requests
func (ts *TerminalService) handleMemoryCleanup(w http.ResponseWriter, r *http.Request) {
	err := ts.terminalMultiplexer.memoryStitcher.memoryPool.Cleanup()
	if err != nil {
		ts.sendErrorResponse(w, http.StatusInternalServerError, "Memory cleanup failed", err)
		return
	}

	response := map[string]interface{}{
		"success":     true,
		"message":     "Memory cleanup completed",
		"cleaned_at":  time.Now(),
	}

	ts.sendJSONResponse(w, http.StatusOK, response)
}

// handleOptimizeRanges handles range optimization requests
func (ts *TerminalService) handleOptimizeRanges(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Start          int64  `json:"start"`
		End            int64  `json:"end"`
		TerminalCount  int    `json:"terminal_count"`
		NetworkCondition string `json:"network_condition"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ts.sendErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Calculate optimal ranges
	ranges := ts.terminalMultiplexer.byteRangeManager.CalculateOptimalRanges(req.Start, req.End, req.TerminalCount)

	response := map[string]interface{}{
		"success":            true,
		"ranges":             ranges,
		"range_count":        len(ranges),
		"network_condition":  req.NetworkCondition,
		"optimized_at":       time.Now(),
	}

	ts.sendJSONResponse(w, http.StatusOK, response)
}

// handleRangeStats handles range statistics requests
func (ts *TerminalService) handleRangeStats(w http.ResponseWriter, r *http.Request) {
	stats := ts.terminalMultiplexer.byteRangeManager.GetRangeStatistics()
	ts.sendJSONResponse(w, http.StatusOK, stats)
}

// handleCalculateRanges handles range calculation requests
func (ts *TerminalService) handleCalculateRanges(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Start         int64 `json:"start"`
		End           int64 `json:"end"`
		TerminalCount int   `json:"terminal_count"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ts.sendErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Calculate ranges
	ranges := ts.terminalMultiplexer.byteRangeManager.CalculateOptimalRanges(req.Start, req.End, req.TerminalCount)

	response := map[string]interface{}{
		"success":      true,
		"ranges":       ranges,
		"range_count":  len(ranges),
		"calculated_at": time.Now(),
	}

	ts.sendJSONResponse(w, http.StatusOK, response)
}

// handleGetMetrics handles metrics requests
func (ts *TerminalService) handleGetMetrics(w http.ResponseWriter, r *http.Request) {
	ts.metrics.mu.RLock()
	metrics := *ts.metrics
	ts.metrics.mu.RUnlock()

	ts.sendJSONResponse(w, http.StatusOK, metrics)
}

// handleGetPerformanceMetrics handles performance metrics requests
func (ts *TerminalService) handleGetPerformanceMetrics(w http.ResponseWriter, r *http.Request) {
	// Get metrics from all components
	terminalMetrics := ts.terminalMultiplexer.GetMetrics()
	memoryStitcherMetrics := ts.terminalMultiplexer.memoryStitcher.GetMetrics()
	memoryPoolMetrics := ts.terminalMultiplexer.memoryStitcher.memoryPool.GetMetrics()
	assemblyBufferMetrics := ts.terminalMultiplexer.memoryStitcher.assemblyBuffer.GetMetrics()
	byteRangeMetrics := ts.terminalMultiplexer.byteRangeManager.GetMetrics()

	response := map[string]interface{}{
		"terminal_metrics":       terminalMetrics,
		"memory_stitcher_metrics": memoryStitcherMetrics,
		"memory_pool_metrics":     memoryPoolMetrics,
		"assembly_buffer_metrics": assemblyBufferMetrics,
		"byte_range_metrics":      byteRangeMetrics,
		"collected_at":           time.Now(),
	}

	ts.sendJSONResponse(w, http.StatusOK, response)
}

// handleGetStitchingStrategy handles stitching strategy requests
func (ts *TerminalService) handleGetStitchingStrategy(w http.ResponseWriter, r *http.Request) {
	strategy := ts.terminalMultiplexer.memoryStitcher.GetStrategy()

	response := map[string]interface{}{
		"strategy":    strategy,
		"updated_at":  time.Now(),
	}

	ts.sendJSONResponse(w, http.StatusOK, response)
}

// handleSetStitchingStrategy handles stitching strategy updates
func (ts *TerminalService) handleSetStitchingStrategy(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Strategy string `json:"strategy"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ts.sendErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	ts.terminalMultiplexer.memoryStitcher.SetStrategy(req.Strategy)
	
	response := map[string]interface{}{
		"success":    true,
		"strategy":   req.Strategy,
		"updated_at": time.Now(),
	}

	ts.sendJSONResponse(w, http.StatusOK, response)
}

// handleHealthCheck handles health check requests
func (ts *TerminalService) handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	health := map[string]interface{}{
		"status":     "healthy",
		"timestamp":  time.Now(),
		"version":    "1.0.0",
		"port":       ts.port,
		"terminals":  len(ts.terminalMultiplexer.GetTerminals()),
		"memory_pool": ts.terminalMultiplexer.memoryStitcher.memoryPool.GetStats(),
		"stitching_strategy": ts.terminalMultiplexer.memoryStitcher.GetStrategy(),
	}

	ts.sendJSONResponse(w, http.StatusOK, health)
}

// handleRoot handles root requests
func (ts *TerminalService) handleRoot(w http.ResponseWriter, r *http.Request) {
	root := map[string]interface{}{
		"service":     "Kronop Terminal Multiplexing",
		"description":  "Terminal multiplexing with memory stitching",
		"version":     "1.0.0",
		"endpoints": map[string]string{
			"stitch":           "/api/terminal/stitch",
			"range":            "/api/terminal/range",
			"terminals":        "/api/terminals",
			"memory_pool":      "/api/memory/pool/stats",
			"ranges":           "/api/ranges/stats",
			"metrics":          "/api/terminal/metrics",
			"health":           "/health",
		},
		"features": []string{
			"Terminal multiplexing",
			"Byte range fetching",
			"Memory stitching",
			"Zero-copy operations",
			"Real-time optimization",
		},
	}

	ts.sendJSONResponse(w, http.StatusOK, root)
}

// validateStitchRequest validates stitch request
func (ts *TerminalService) validateStitchRequest(req *StitchRequest) error {
	if req.VideoURL == "" {
		return fmt.Errorf("video URL is required")
	}

	if req.Start < 0 || req.End < req.Start {
		return fmt.Errorf("invalid byte range")
	}

	if req.MaxConcurrentRanges <= 0 || req.MaxConcurrentRanges > 50 {
		return fmt.Errorf("max concurrent ranges must be between 1 and 50")
	}

	if req.Timeout <= 0 || req.Timeout > 5*time.Minute {
		return fmt.Errorf("timeout must be between 1 second and 5 minutes")
	}

	validStrategies := []string{"sequential", "parallel", "adaptive"}
	valid := false
	for _, strategy := range validStrategies {
		if req.StitchingStrategy == strategy {
			valid = true
			break
		}
	}
	if !valid && req.StitchingStrategy != "" {
		return fmt.Errorf("invalid stitching strategy: %s", req.StitchingStrategy)
	}

	return nil
}

// updateServiceMetrics updates service metrics
func (ts *TerminalService) updateServiceMetrics(bytesStitched int64, processingTime time.Duration, terminalsUsed int, success bool) {
	ts.metrics.mu.Lock()
	defer ts.metrics.mu.Unlock()

	ts.metrics.TotalRequests++
	
	if success {
		ts.metrics.SuccessfulRequests++
	} else {
		ts.metrics.FailedRequests++
	}

	// Update average response time
	if ts.metrics.AverageResponseTime == 0 {
		ts.metrics.AverageResponseTime = processingTime
	} else {
		ts.metrics.AverageResponseTime = (ts.metrics.AverageResponseTime + processingTime) / 2
	}

	// Update total bytes stitched
	ts.metrics.TotalBytesStitched += bytesStitched

	// Update terminals utilized
	ts.metrics.TerminalsUtilized += int64(terminalsUsed)

	// Update memory efficiency
	if ts.metrics.MemoryEfficiency == 0 {
		ts.metrics.MemoryEfficiency = 0.85 // High efficiency for demo
	}

	ts.metrics.LastUpdated = time.Now()
}

// sendJSONResponse sends JSON response
func (ts *TerminalService) sendJSONResponse(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("❌ Failed to encode JSON response: %v", err)
	}
}

// sendErrorResponse sends error response
func (ts *TerminalService) sendErrorResponse(w http.ResponseWriter, statusCode int, message string, err error) {
	errorResponse := map[string]interface{}{
		"success": false,
		"error":   message,
		"details": err.Error(),
		"timestamp": time.Now(),
	}

	ts.sendJSONResponse(w, statusCode, errorResponse)
}

// Start starts the terminal service
func (ts *TerminalService) Start() error {
	ts.server = &http.Server{
		Addr:         fmt.Sprintf(":%d", ts.port),
		Handler:      ts.router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	log.Printf("📱 Starting Kronop Terminal Multiplexing Service on port %d", ts.port)
	log.Printf("🔥 Features: Terminal multiplexing, memory stitching, zero-copy operations")

	return ts.server.ListenAndServe()
}

// Stop stops the terminal service
func (ts *TerminalService) Stop() error {
	log.Println("🔌 Stopping Kronop Terminal Multiplexing Service")
	
	if ts.server != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		
		return ts.server.Shutdown(ctx)
	}

	return nil
}

// Helper functions

func NewTerminalServiceMetrics() *TerminalServiceMetrics {
	return &TerminalServiceMetrics{
		CreatedAt: time.Now(),
	}
}
