/**
 * Zero-Jitter Service - HTTP API for Zero-Jitter Buffer
 * 
 * Provides HTTP endpoints for zero-jitter video playback
 * Handles terminal multiplexing and load redistribution
 * Manages buffer levels and jitter compensation
 * 
 * Features:
 * - Zero-jitter video playback API
 * - Terminal management endpoints
 * - Buffer monitoring endpoints
 * - Performance tracking
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

// ZeroJitterService handles zero-jitter HTTP requests
type ZeroJitterService struct {
	session              *gocqlx.Session
	zeroJitterBuffer     *ZeroJitterBuffer
	router               *mux.Router
	server               *http.Server
	port                 int
	activeSessions        map[string]*ZeroJitterSession
	metrics              *ZeroJitterServiceMetrics
	mu                   sync.RWMutex
}

// ZeroJitterServiceMetrics tracks service performance
type ZeroJitterServiceMetrics struct {
	TotalSessions         int64         `json:"total_sessions"`
	ActiveSessions        int64         `json:"active_sessions"`
	CompletedSessions     int64         `json:"completed_sessions"`
	SeamlessPlaybacks     int64         `json:"seamless_playbacks"`
	BufferUnderruns        int64         `json:"buffer_underruns"`
	JitterCompensations    int64         `json:"jitter_compensations"`
	LoadRedistributions   int64         `json:"load_redistributions"`
	FailoverEvents        int64         `json:"failover_events"`
	AverageBufferLevel    float64       `json:"average_buffer_level"`
	SystemUptime          float64       `json:"system_uptime"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// SessionRequest represents a zero-jitter session request
type SessionRequest struct {
	VideoURL              string        `json:"video_url"`
	MaxTerminals          int           `json:"max_terminals"`
	MinActiveTerminals    int           `json:"min_active_terminals"`
	BufferSize            int64         `json:"buffer_size"`
	MinBufferLevel        float64       `json:"min_buffer_level"`
	MaxBufferLevel        float64       `json:"max_buffer_level"`
	JitterThreshold       time.Duration `json:"jitter_threshold"`
	LoadBalancingStrategy  string        `json:"load_balancing_strategy"`
	FailoverEnabled       bool          `json:"failover_enabled"`
	Timeout               time.Duration `json:"timeout"`
}

// SessionResponse represents a zero-jitter session response
type SessionResponse struct {
	Success               bool          `json:"success"`
	SessionID             string        `json:"session_id"`
	VideoURL              string        `json:"video_url"`
	Status                string        `json:"status"`
	ActiveTerminals       []string      `json:"active_terminals"`
	BufferLevel           float64       `json:"buffer_level"`
	JitterLevel           int           `json:"jitter_level"`
	LoadDistribution      map[string]float64 `json:"load_distribution"`
	StartTime             time.Time     `json:"start_time"`
	Metrics               *SessionMetrics `json:"metrics"`
	Error                 string        `json:"error,omitempty"`
}

// SessionMetrics represents session metrics
type SessionMetrics struct {
	TotalBytesBuffered    int64         `json:"total_bytes_buffered"`
	TotalBytesPlayed      int64         `json:"total_bytes_played"`
	SeamlessPlaybackTime   time.Duration `json:"seamless_playback_time"`
	BufferUnderruns        int64         `json:"buffer_underruns"`
	JitterCompensations   int64         `json:"jitter_compensations"`
	LoadRedistributions   int64         `json:"load_redistributions"`
	FailoverEvents        int64         `json:"failover_events"`
	AverageTransferRate   float64       `json:"average_transfer_rate"`
	PerformanceScore      float64       `json:"performance_score"`
}

// BufferRequest represents a buffer request
type BufferRequest struct {
	SessionID             string        `json:"session_id"`
	Data                  []byte        `json:"data"`
	TerminalID            string        `json:"terminal_id"`
	Timestamp             time.Time     `json:"timestamp"`
	SequenceNumber        int64         `json:"sequence_number"`
	ChunkSize             int64         `json:"chunk_size"`
	IsKeyFrame            bool          `json:"is_key_frame"`
}

// BufferResponse represents a buffer response
type BufferResponse struct {
	Success               bool          `json:"success"`
	SessionID             string        `json:"session_id"`
	BufferLevel           float64       `json:"buffer_level"`
	JitterLevel           int           `json:"jitter_level"`
	ProcessingTime        time.Duration `json:"processing_time"`
	TerminalsActive       []string      `json:"terminals_active"`
	LoadDistribution      map[string]float64 `json:"load_distribution"`
	Metrics               *BufferMetrics `json:"metrics"`
	Error                 string        `json:"error,omitempty"`
}

// BufferMetrics represents buffer metrics
type BufferMetrics struct {
	CurrentBufferLevel    float64       `json:"current_buffer_level"`
	IsBuffering           bool          `json:"is_buffering"`
	BufferingDuration     time.Duration `json:"buffering_duration"`
	JitterCompensation     bool          `json:"jitter_compensation"`
	TotalBuffered         int64         `json:"total_buffered"`
	TotalPlayed           int64         `json:"total_played"`
	TransferRate          float64       `json:"transfer_rate"`
}

// NewZeroJitterService creates a new zero-jitter service
func NewZeroJitterService(session *gocqlx.Session, port int) *ZeroJitterService {
	config := ZeroJitterConfig{
		BufferSize:            10 * 1024 * 1024, // 10MB buffer
		MinBufferLevel:        0.2,             // 20% minimum
		MaxBufferLevel:        0.8,             // 80% maximum
		BufferThreshold:       0.5,             // 50% threshold
		MaxTerminals:          10,              // 10 terminals
		MinActiveTerminals:    3,               // 3 terminals minimum
		TerminalTimeout:       5 * time.Second,
		PerformanceThreshold:  0.8,             // 80% performance
		MaxJitter:             100 * time.Millisecond,
		JitterThreshold:       50 * time.Millisecond,
		JitterBufferSize:      1024 * 1024,     // 1MB jitter buffer
		JitterCompensation:    true,
		RedistributionEnabled: true,
		RedistributionStrategy: "adaptive",
		LoadBalanceInterval:   100 * time.Millisecond,
		LoadBalanceThreshold: 0.2,             // 20% load difference
		FailoverEnabled:       true,
		FailoverTimeout:       2 * time.Second,
		RecoveryTimeout:       10 * time.Second,
		MaxFailoverAttempts:   3,
	}

	zjs := &ZeroJitterService{
		session:           session,
		zeroJitterBuffer:  NewZeroJitterBuffer(config),
		router:            mux.NewRouter(),
		port:              port,
		activeSessions:    make(map[string]*ZeroJitterSession),
		metrics:           NewZeroJitterServiceMetrics(),
	}

	// Setup routes
	zjs.setupRoutes()

	return zjs
}

// setupRoutes sets up HTTP routes
func (zjs *ZeroJitterService) setupRoutes() {
	// Zero-jitter session endpoints
	zjs.router.HandleFunc("/api/zero-jitter/session", zjs.handleCreateSession).Methods("POST")
	zjs.router.HandleFunc("/api/zero-jitter/session/{sessionID}", zjs.handleGetSession).Methods("GET")
	zjs.router.HandleFunc("/api/zero-jitter/session/{sessionID}/start", zjs.handleStartSession).Methods("POST")
	zjs.router.HandleFunc("/api/zero-jitter/session/{sessionID}/stop", zjs.handleStopSession).Methods("POST")
	
	// Buffer management endpoints
	zjs.router.HandleFunc("/api/zero-jitter/buffer", zjs.handleBufferRequest).Methods("POST")
	zjs.router.HandleFunc("/api/zero-jitter/buffer/{sessionID}", zjs.handleGetBufferStatus).Methods("GET")
	zjs.router.HandleFunc("/api/zero-jitter/buffer/{sessionID}/reset", zjs.handleResetBuffer).Methods("POST")
	
	// Terminal management endpoints
	zjs.router.HandleFunc("/api/zero-jitter/terminals", zjs.handleGetTerminals).Methods("GET")
	zjs.router.HandleFunc("/api/zero-jitter/terminals/{terminalID}/status", zjs.handleTerminalStatus).Methods("GET")
	zjs.router.HandleFunc("/api/zero-jitter/terminals/{terminalID}/performance", zjs.handleTerminalPerformance).Methods("GET")
	
	// Load redistribution endpoints
	zjs.router.HandleFunc("/api/zero-jitter/redistribute", zjs.handleRedistributeLoad).Methods("POST")
	zjs.router.HandleFunc("/api/zero-jitter/redistribute/history", zjs.handleGetRedistributionHistory).Methods("GET")
	zjs.router.HandleFunc("/api/zero-jitter/redistribute/strategy", zjs.handleGetRedistributionStrategy).Methods("GET")
	zjs.router.HandleFunc("/api/zero-jitter/redistribute/strategy", zjs.handleSetRedistributionStrategy).Methods("PUT")
	
	// Jitter compensation endpoints
	zjs.router.HandleFunc("/api/zero-jitter/jitter/compensate", zjs.handleCompensateJitter).Methods("POST")
	zjs.router.HandleFunc("/api/zero-jitter/jitter/history", zjs.handleGetJitterHistory).Methods("GET")
	zjs.router.HandleFunc("/api/zero-jitter/jitter/level", zjs.handleGetJitterLevel).Methods("GET")
	
	// Performance monitoring endpoints
	zjs.router.HandleFunc("/api/zero-jitter/performance", zjs.handleGetPerformanceMetrics).Methods("GET")
	zjs.router.HandleFunc("/api/zero-jitter/performance/alerts", zjs.handleGetPerformanceAlerts).Methods("GET")
	zjs.router.HandleFunc("/api/zero-jitter/performance/terminals", zjs.handleGetTerminalPerformance).Methods("GET")
	
	// Metrics endpoints
	zjs.router.HandleFunc("/api/zero-jitter/metrics", zjs.handleGetMetrics).Methods("GET")
	zjs.router.HandleFunc("/api/zero-jitter/metrics/sessions", zjs.handleGetSessionMetrics).Methods("GET")
	
	// Health check
	zjs.router.HandleFunc("/health", zjs.handleHealthCheck).Methods("GET")
	zjs.router.HandleFunc("/", zjs.handleRoot).Methods("GET")

	log.Printf("🔄 Zero-jitter routes configured on port %d", zjs.port)
}

// handleCreateSession handles session creation requests
func (zjs *ZeroJitterService) handleCreateSession(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	log.Printf("🔄 Received zero-jitter session creation request from %s", r.RemoteAddr)

	// Parse request
	var req SessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		zjs.sendErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Validate request
	if err := zjs.validateSessionRequest(&req); err != nil {
		zjs.sendErrorResponse(w, http.StatusBadRequest, "Invalid request", err)
		return
	}

	// Create session
	sessionID := fmt.Sprintf("session_%d", time.Now().UnixNano())
	session := &ZeroJitterSession{
		SessionID:        sessionID,
		VideoURL:         req.VideoURL,
		StartTime:        time.Now(),
		Status:           "created",
		LoadDistribution: make(map[string]float64),
	}

	// Store session
	zjs.mu.Lock()
	zjs.activeSessions[sessionID] = session
	zjs.mu.Unlock()

	// Update metrics
	zjs.updateServiceMetrics("session_created", true)

	// Create response
	response := &SessionResponse{
		Success:    true,
		SessionID:  sessionID,
		VideoURL:   req.VideoURL,
		Status:     "created",
		StartTime:  time.Now(),
		Metrics: &SessionMetrics{
			PerformanceScore: 1.0,
		},
	}

	processingTime := time.Since(startTime)
	log.Printf("✅ Zero-jitter session created: %s in %v", sessionID, processingTime)

	zjs.sendJSONResponse(w, http.StatusOK, response)
}

// handleStartSession handles session start requests
func (zjs *ZeroJitterService) handleStartSession(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["sessionID"]

	startTime := time.Now()

	log.Printf("🔄 Starting zero-jitter session: %s", sessionID)

	// Get session
	zjs.mu.RLock()
	session, exists := zjs.activeSessions[sessionID]
	zjs.mu.RUnlock()

	if !exists {
		zjs.sendErrorResponse(w, http.StatusNotFound, "Session not found", fmt.Errorf("session %s not found", sessionID))
		return
	}

	// Start zero-jitter session
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	startedSession, err := zjs.zeroJitterBuffer.StartZeroJitterSession(ctx, session.VideoURL)
	if err != nil {
		zjs.sendErrorResponse(w, http.StatusInternalServerError, "Failed to start session", err)
		return
	}

	// Update session
	session.mu.Lock()
	session.Status = "active"
	session.ActiveTerminals = startedSession.ActiveTerminals
	session.BufferLevel = startedSession.BufferLevel
	session.LoadDistribution = startedSession.LoadDistribution
	session.mu.Unlock()

	// Update metrics
	zjs.updateServiceMetrics("session_started", true)

	// Create response
	response := &SessionResponse{
		Success:          true,
		SessionID:        sessionID,
		VideoURL:         session.VideoURL,
		Status:           "active",
		ActiveTerminals:   session.ActiveTerminals,
		BufferLevel:      session.BufferLevel,
		LoadDistribution: session.LoadDistribution,
		StartTime:        session.StartTime,
		Metrics: &SessionMetrics{
			PerformanceScore: 1.0,
		},
	}

	processingTime := time.Since(startTime)
	log.Printf("✅ Zero-jitter session started: %s in %v", sessionID, processingTime)

	zjs.sendJSONResponse(w, http.StatusOK, response)
}

// handleBufferRequest handles buffer requests
func (zjs *ZeroJitterService) handleBufferRequest(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	// Parse request
	var req BufferRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		zjs.sendErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Validate request
	if err := zjs.validateBufferRequest(&req); err != nil {
		zjs.sendErrorResponse(w, http.StatusBadRequest, "Invalid request", err)
		return
	}

	// Get session
	zjs.mu.RLock()
	session, exists := zjs.activeSessions[req.SessionID]
	zjs.mu.Unlock()

	if !exists {
		zjs.sendErrorResponse(w, http.StatusNotFound, "Session not found", fmt.Errorf("session %s not found", req.SessionID))
		return
	}

	// Process video data
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	err := zjs.zeroJitterBuffer.ProcessVideoData(ctx, session, req.Data, req.TerminalID)
	if err != nil {
		// Handle buffer underrun gracefully
		if err.Error() == "buffer_underrun" {
			// Update session metrics
			session.mu.Lock()
			session.BufferUnderruns++
			session.mu.Unlock()

			// Create response with underrun info
			response := &BufferResponse{
				Success:          false,
				SessionID:        req.SessionID,
				BufferLevel:      session.BufferLevel,
				JitterLevel:      session.JitterLevel,
				ProcessingTime:   time.Since(startTime),
				TerminalsActive:  session.ActiveTerminals,
				LoadDistribution: session.LoadDistribution,
				Error:            "buffer_underrun",
			}

			zjs.sendJSONResponse(w, http.StatusOK, response)
			return
		}

		zjs.sendErrorResponse(w, http.StatusInternalServerError, "Failed to process video data", err)
		return
	}

	// Update session metrics
	session.mu.Lock()
	session.TotalBytesBuffered += int64(len(req.Data))
	session.BufferLevel = zjs.zeroJitterBuffer.bufferManager.GetCurrentBufferLevel()
	session.LoadDistribution = zjs.zeroJitterBuffer.loadRedistributor.GetCurrentDistribution()
	session.mu.Unlock()

	// Create response
	response := &BufferResponse{
		Success:          true,
		SessionID:        req.SessionID,
		BufferLevel:      session.BufferLevel,
		JitterLevel:      session.JitterLevel,
		ProcessingTime:   time.Since(startTime),
		TerminalsActive:  session.ActiveTerminals,
		LoadDistribution: session.LoadDistribution,
		Metrics: &BufferMetrics{
			CurrentBufferLevel: session.BufferLevel,
			TotalBuffered:      session.TotalBytesBuffered,
			TotalPlayed:        session.TotalBytesPlayed,
			TransferRate:       float64(len(req.Data)) / time.Since(startTime).Seconds() / (1024 * 1024),
		},
	}

	processingTime := time.Since(startTime)
	log.Printf("✅ Buffer request processed: %s, %d bytes in %v", req.SessionID, len(req.Data), processingTime)

	zjs.sendJSONResponse(w, http.StatusOK, response)
}

// handleGetSession handles session status requests
func (zjs *ZeroJitterService) handleGetSession(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["sessionID"]

	// Get session
	zjs.mu.RLock()
	session, exists := zjs.activeSessions[sessionID]
	zjs.mu.Unlock()

	if !exists {
		zjs.sendErrorResponse(w, http.StatusNotFound, "Session not found", fmt.Errorf("session %s not found", sessionID))
		return
	}

	// Get session status from zero-jitter buffer
	sessionStatus, err := zjs.zeroJitterBuffer.GetSessionStatus(sessionID)
	if err != nil {
		zjs.sendErrorResponse(w, http.StatusInternalServerError, "Failed to get session status", err)
		return
	}

	// Create response
	response := &SessionResponse{
		Success:          true,
		SessionID:        sessionID,
		VideoURL:         session.VideoURL,
		Status:           sessionStatus.Status,
		ActiveTerminals:  sessionStatus.ActiveTerminals,
		BufferLevel:      sessionStatus.BufferLevel,
		JitterLevel:      sessionStatus.JitterLevel,
		LoadDistribution: sessionStatus.LoadDistribution,
		StartTime:        session.StartTime,
		Metrics: &SessionMetrics{
			TotalBytesBuffered:   session.TotalBytesBuffered,
			TotalBytesPlayed:     session.TotalBytesPlayed,
			SeamlessPlaybackTime:  sessionStatus.SeamlessPlaybackTime,
			BufferUnderruns:      session.BufferUnderruns,
			JitterCompensations:  session.JitterCompensations,
			LoadRedistributions:  session.LoadRedistributions,
			FailoverEvents:       session.FailoverEvents,
			PerformanceScore:     1.0,
		},
	}

	zjs.sendJSONResponse(w, http.StatusOK, response)
}

// handleGetBufferStatus handles buffer status requests
func (zjs *ZeroJitterService) handleGetBufferStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["sessionID"]

	// Get buffer status
	bufferStatus := zjs.zeroJitterBuffer.bufferManager.GetBufferStatus()

	// Add session info
	response := map[string]interface{}{
		"session_id":       sessionID,
		"buffer_status":    bufferStatus,
		"last_updated":     time.Now(),
	}

	zjs.sendJSONResponse(w, http.StatusOK, response)
}

// handleGetTerminals handles terminal information requests
func (zjs *ZeroJitterService) handleGetTerminals(w http.ResponseWriter, r *http.Request) {
	terminals := zjs.zeroJitterBuffer.GetTerminals()
	zjs.sendJSONResponse(w, http.StatusOK, terminals)
}

// handleRedistributeLoad handles load redistribution requests
func (zjs *ZeroJitterService) handleRedistributeLoad(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TerminalID string `json:"terminal_id"`
		Reason     string `json:"reason"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		zjs.sendErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Redistribute load
	err := zjs.zeroJitterBuffer.loadRedistributor.RedistributeLoad(req.TerminalID)
	if err != nil {
		zjs.sendErrorResponse(w, http.StatusInternalServerError, "Failed to redistribute load", err)
		return
	}

	// Update metrics
	zjs.updateServiceMetrics("load_redistributed", true)

	response := map[string]interface{}{
		"success":     true,
		"terminal_id": req.TerminalID,
		"reason":      req.Reason,
		"redistributed_at": time.Now(),
	}

	zjs.sendJSONResponse(w, http.StatusOK, response)
}

// handleCompensateJitter handles jitter compensation requests
func (zjs *ZeroJitterService) handleCompensateJitter(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TerminalID string `json:"terminal_id"`
		JitterLevel int    `json:"jitter_level"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		zjs.sendErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Compensate jitter
	err := zjs.zeroJitterBuffer.bufferManager.CompensateJitter(req.TerminalID)
	if err != nil {
		zjs.sendErrorResponse(w, http.StatusInternalServerError, "Failed to compensate jitter", err)
		return
	}

	// Update metrics
	zjs.updateServiceMetrics("jitter_compensated", true)

	response := map[string]interface{}{
		"success":     true,
		"terminal_id": req.TerminalID,
		"jitter_level": req.JitterLevel,
		"compensated_at": time.Now(),
	}

	zjs.sendJSONResponse(w, http.StatusOK, response)
}

// handleGetMetrics handles metrics requests
func (zjs *ZeroJitterService) handleGetMetrics(w http.ResponseWriter, r *http.Request) {
	zjs.metrics.mu.RLock()
	metrics := *zjs.metrics
	zjs.metrics.mu.RUnlock()

	zjs.sendJSONResponse(w, http.StatusOK, metrics)
}

// handleGetPerformanceMetrics handles performance metrics requests
func (zjs *ZeroJitterService) handleGetPerformanceMetrics(w http.ResponseWriter, r *http.Request) {
	// Get metrics from all components
	zeroJitterMetrics := zjs.zeroJitterBuffer.GetMetrics()
	bufferMetrics := zjs.zeroJitterBuffer.bufferManager.GetMetrics()
	loadRedistributorMetrics := zjs.zeroJitterBuffer.loadRedistributor.GetMetrics()
	performanceMetrics := zjs.zeroJitterBuffer.performanceMonitor.GetMetrics()
	failoverMetrics := zjs.zeroJitterBuffer.failoverManager.GetMetrics()
	jitterMetrics := zjs.zeroJitterBuffer.jitterAnalyzer.GetMetrics()

	response := map[string]interface{}{
		"zero_jitter_metrics":       zeroJitterMetrics,
		"buffer_manager_metrics":     bufferMetrics,
		"load_redistributor_metrics": loadRedistributorMetrics,
		"performance_metrics":        performanceMetrics,
		"failover_metrics":          failoverMetrics,
		"jitter_metrics":             jitterMetrics,
		"collected_at":               time.Now(),
	}

	zjs.sendJSONResponse(w, http.StatusOK, response)
}

// handleHealthCheck handles health check requests
func (zjs *ZeroJitterService) handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	zjs.mu.RLock()
	activeSessionCount := len(zjs.activeSessions)
	zjs.mu.RUnlock()

	health := map[string]interface{}{
		"status":              "healthy",
		"timestamp":           time.Now(),
		"version":             "1.0.0",
		"port":                zjs.port,
		"active_sessions":     activeSessionCount,
		"total_terminals":      len(zjs.zeroJitterBuffer.GetTerminals()),
		"buffer_manager":       zjs.zeroJitterBuffer.bufferManager.GetBufferStatus(),
		"load_balancing":       zjs.zeroJitterBuffer.loadRedistributor.GetLoadBalanceScore(),
		"system_uptime":        0.99, // 99% uptime for demo
	}

	zjs.sendJSONResponse(w, http.StatusOK, health)
}

// handleRoot handles root requests
func (zjs *ZeroJitterService) handleRoot(w http.ResponseWriter, r *http.Request) {
	root := map[string]interface{}{
		"service":     "Kronop Zero-Jitter Buffer",
		"description":  "Zero-jitter video playback with terminal multiplexing",
		"version":     "1.0.0",
		"endpoints": map[string]string{
			"session":           "/api/zero-jitter/session",
			"buffer":            "/api/zero-jitter/buffer",
			"terminals":         "/api/zero-jitter/terminals",
			"redistribute":       "/api/zero-jitter/redistribute",
			"jitter":            "/api/zero-jitter/jitter/compensate",
			"metrics":           "/api/zero-jitter/metrics",
			"health":            "/health",
		},
		"features": []string{
			"Zero-jitter video playback",
			"Terminal multiplexing",
			"Dynamic load redistribution",
			"Jitter compensation",
			"Automatic failover",
		},
	}

	zjs.sendJSONResponse(w, http.StatusOK, root)
}

// validateSessionRequest validates session request
func (zjs *ZeroJitterService) validateSessionRequest(req *SessionRequest) error {
	if req.VideoURL == "" {
		return fmt.Errorf("video URL is required")
	}

	if req.MaxTerminals <= 0 || req.MaxTerminals > 20 {
		return fmt.Errorf("max terminals must be between 1 and 20")
	}

	if req.MinActiveTerminals <= 0 || req.MinActiveTerminals > req.MaxTerminals {
		return fmt.Errorf("min active terminals must be between 1 and max terminals")
	}

	if req.BufferSize <= 0 || req.BufferSize > 100*1024*1024 {
		return fmt.Errorf("buffer size must be between 1 and 100MB")
	}

	if req.MinBufferLevel < 0 || req.MinBufferLevel > 1 || req.MaxBufferLevel < 0 || req.MaxBufferLevel > 1 {
		return fmt.Errorf("buffer levels must be between 0 and 1")
	}

	if req.MinBufferLevel >= req.MaxBufferLevel {
		return fmt.Errorf("min buffer level must be less than max buffer level")
	}

	return nil
}

// validateBufferRequest validates buffer request
func (zjs *ZeroJitterService) validateBufferRequest(req *BufferRequest) error {
	if req.SessionID == "" {
		return fmt.Errorf("session ID is required")
	}

	if req.TerminalID == "" {
		return fmt.Errorf("terminal ID is required")
	}

	if len(req.Data) == 0 {
		return fmt.Errorf("data is required")
	}

	if len(req.Data) > 10*1024*1024 {
		return fmt.Errorf("data size must be less than 10MB")
	}

	return nil
}

// updateServiceMetrics updates service metrics
func (zjs *ZeroJitterService) updateServiceMetrics(event string, success bool) {
	zjs.metrics.mu.Lock()
	defer zjs.metrics.mu.Unlock()

	switch event {
	case "session_created":
		zjs.metrics.TotalSessions++
	case "session_started":
		zjs.metrics.ActiveSessions++
	case "session_completed":
		zjs.metrics.CompletedSessions++
		zjs.metrics.ActiveSessions--
	case "seamless_playback":
		zjs.metrics.SeamlessPlaybacks++
	case "buffer_underrun":
		zjs.metrics.BufferUnderruns++
	case "jitter_compensated":
		zjs.metrics.JitterCompensations++
	case "load_redistributed":
		zjs.metrics.LoadRedistributions++
	case "failover_event":
		zjs.metrics.FailoverEvents++
	}

	// Update average buffer level
	bufferMetrics := zjs.zeroJitterBuffer.bufferManager.GetMetrics()
	zjs.metrics.AverageBufferLevel = bufferMetrics.AverageBufferLevel

	// Update system uptime (simplified)
	zjs.metrics.SystemUptime = 0.99 // 99% uptime for demo

	zjs.metrics.LastUpdated = time.Now()
}

// sendJSONResponse sends JSON response
func (zjs *ZeroJitterService) sendJSONResponse(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("❌ Failed to encode JSON response: %v", err)
	}
}

// sendErrorResponse sends error response
func (zjs *ZeroJitterService) sendErrorResponse(w http.ResponseWriter, statusCode int, message string, err error) {
	errorResponse := map[string]interface{}{
		"success": false,
		"error":   message,
		"details": err.Error(),
		"timestamp": time.Now(),
	}

	zjs.sendJSONResponse(w, statusCode, errorResponse)
}

// Start starts the zero-jitter service
func (zjs *ZeroJitterService) Start() error {
	zjs.server = &http.Server{
		Addr:         fmt.Sprintf(":%d", zjs.port),
		Handler:      zjs.router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	log.Printf("🔄 Starting Kronop Zero-Jitter Buffer Service on port %d", zjs.port)
	log.Printf("🔥 Features: Zero-jitter playback, terminal multiplexing, load redistribution")

	return zjs.server.ListenAndServe()
}

// Stop stops the zero-jitter service
func (zjs *ZeroJitterService) Stop() error {
	log.Println("🔌 Stopping Kronop Zero-Jitter Buffer Service")
	
	if zjs.server != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		
		return zjs.server.Shutdown(ctx)
	}

	return nil
}

// Helper functions

func NewZeroJitterServiceMetrics() *ZeroJitterServiceMetrics {
	return &ZeroJitterServiceMetrics{
		CreatedAt: time.Now(),
	}
}
