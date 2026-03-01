/**
 * Multi-Source Service - HTTP API for Multi-Source Integration
 * 
 * Provides HTTP endpoints for multi-source streaming
 * Integrates with Cloudflare R2 edge nodes
 * Handles geographic optimization and load balancing
 * 
 * Features:
 * - Multi-source streaming API
 * - Geographic optimization
 * - Edge node management
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

// MultiSourceService handles multi-source HTTP requests
type MultiSourceService struct {
	session              *gocqlx.Session
	multiSourceManager   *MultiSourceManager
	router               *mux.Router
	server               *http.Server
	port                 int
	metrics              *MultiSourceServiceMetrics
	mu                   sync.RWMutex
}

// MultiSourceServiceMetrics tracks service performance
type MultiSourceServiceMetrics struct {
	TotalRequests         int64         `json:"total_requests"`
	SuccessfulRequests    int64         `json:"successful_requests"`
	FailedRequests        int64         `json:"failed_requests"`
	AverageResponseTime   time.Duration `json:"average_response_time"`
	TotalBytesStreamed    int64         `json:"total_bytes_streamed"`
	NodesUtilized         int64         `json:"nodes_utilized"`
	GeographicOptimizations int64       `json:"geographic_optimizations"`
	RedundancyVerifications int64       `json:"redundancy_verifications"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// MultiSourceRequest represents a multi-source streaming request
type MultiSourceRequest struct {
	VideoKey              string        `json:"video_key"`
	ClientIP              string        `json:"client_ip"`
	ClientLocation        *ClientLocation `json:"client_location,omitempty"`
	MaxNodes              int           `json:"max_nodes"`
	EnableGeoOptimization bool          `json:"enable_geo_optimization"`
	EnableRedundancy      bool          `json:"enable_redundancy"`
	AggregationStrategy   string        `json:"aggregation_strategy"`
	LoadBalancingStrategy  string        `json:"load_balancing_strategy"`
	Timeout               time.Duration `json:"timeout"`
}

// MultiSourceResponse represents a multi-source streaming response
type MultiSourceResponse struct {
	Success               bool          `json:"success"`
	VideoKey              string        `json:"video_key"`
	Data                  []byte        `json:"data,omitempty"`
	Size                  int64         `json:"size"`
	ProcessingTime        time.Duration `json:"processing_time"`
	NodesUsed             []string      `json:"nodes_used"`
	AggregationTime       time.Duration `json:"aggregation_time"`
	RedundancyScore       float64       `json:"redundancy_score"`
	GeoOptimizationScore   float64       `json:"geo_optimization_score"`
	IntegrityVerified      bool          `json:"integrity_verified"`
	TransferRate          float64       `json:"transfer_rate"`
	Metrics               *MultiSourceStreamMetrics `json:"metrics"`
	Error                 string        `json:"error,omitempty"`
}

// MultiSourceStreamMetrics represents stream metrics
type MultiSourceStreamMetrics struct {
	SourceData           []*SourceData `json:"source_data"`
	AggregatedData       *AggregatedData `json:"aggregated_data"`
	EdgeNodes            []*EdgeNode    `json:"edge_nodes"`
	ClientLocation       *ClientLocation `json:"client_location"`
	SelectedNodes        []string       `json:"selected_nodes"`
	LoadBalancingStrategy string         `json:"load_balancing_strategy"`
	AggregationStrategy  string         `json:"aggregation_strategy"`
}

// NewMultiSourceService creates a new multi-source service
func NewMultiSourceService(session *gocqlx.Session, port int) *MultiSourceService {
	config := MultiSourceConfig{
		MaxConcurrentNodes:    5,
		MinNodesRequired:      2,
		Timeout:               30 * time.Second,
		RetryDelay:            100 * time.Millisecond,
		MaxRetries:            3,
		AggregationStrategy:   "parallel",
		ChunkSize:             1024 * 1024, // 1MB chunks
		MaxConcurrentChunks:   10,
		BufferSize:            10 * 1024 * 1024, // 10MB buffer
		LoadBalancingStrategy: "geographic",
		HealthCheckInterval:   30 * time.Second,
		FailoverThreshold:     0.5,
		EnableGeoOptimization: true,
		PreferNearestNodes:    true,
		MaxDistance:           5000, // 5000km
		EnableRedundancy:      true,
		RedundancyFactor:      2,
		DataVerification:      true,
		ChecksumValidation:    true,
	}

	mss := &MultiSourceService{
		session:            session,
		multiSourceManager: NewMultiSourceManager(config),
		router:             mux.NewRouter(),
		port:               port,
		metrics:            NewMultiSourceServiceMetrics(),
	}

	// Setup routes
	mss.setupRoutes()

	return mss
}

// setupRoutes sets up HTTP routes
func (mss *MultiSourceService) setupRoutes() {
	// Multi-source streaming endpoints
	mss.router.HandleFunc("/api/multi-source/stream", mss.handleMultiSourceStream).Methods("POST")
	mss.router.HandleFunc("/api/multi-source/stream/{videoKey}", mss.handleStreamVideoKey).Methods("GET")
	
	// Edge node management endpoints
	mss.router.HandleFunc("/api/edge-nodes", mss.handleGetEdgeNodes).Methods("GET")
	mss.router.HandleFunc("/api/edge-nodes/{nodeID}/health", mss.handleNodeHealth).Methods("GET")
	mss.router.HandleFunc("/api/edge-nodes/{nodeID}/weight", mss.handleUpdateNodeWeight).Methods("PUT")
	
	// Geographic optimization endpoints
	mss.router.HandleFunc("/api/geo/optimize", mss.handleGeoOptimization).Methods("POST")
	mss.router.HandleFunc("/api/geo/location/{ip}", mss.handleDetectLocation).Methods("GET")
	mss.router.HandleFunc("/api/geo/coverage", mss.handleGetCoverage).Methods("GET")
	
	// Load balancing endpoints
	mss.router.HandleFunc("/api/load-balance/strategy", mss.handleGetLoadBalancingStrategy).Methods("GET")
	mss.router.HandleFunc("/api/load-balance/strategy", mss.handleSetLoadBalancingStrategy).Methods("PUT")
	mss.router.HandleFunc("/api/load-balance/utilization", mss.handleGetUtilization).Methods("GET")
	
	// Redundancy endpoints
	mss.router.HandleFunc("/api/redundancy/verify", mss.handleVerifyRedundancy).Methods("POST")
	mss.router.HandleFunc("/api/redundancy/integrity", mss.handleCheckIntegrity).Methods("POST")
	
	// Metrics endpoints
	mss.router.HandleFunc("/api/multi-source/metrics", mss.handleGetMetrics).Methods("GET")
	mss.router.HandleFunc("/api/multi-source/performance", mss.handleGetPerformanceMetrics).Methods("GET")
	
	// Health check
	mss.router.HandleFunc("/health", mss.handleHealthCheck).Methods("GET")
	mss.router.HandleFunc("/", mss.handleRoot).Methods("GET")

	log.Printf("🌐 Multi-source routes configured on port %d", mss.port)
}

// handleMultiSourceStream handles multi-source streaming requests
func (mss *MultiSourceService) handleMultiSourceStream(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	log.Printf("🌐 Received multi-source stream request from %s", r.RemoteAddr)

	// Parse request
	var req MultiSourceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		mss.sendErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Validate request
	if err := mss.validateMultiSourceRequest(&req); err != nil {
		mss.sendErrorResponse(w, http.StatusBadRequest, "Invalid request", err)
		return
	}

	// Detect client location if not provided
	clientLocation := req.ClientLocation
	if clientLocation == nil && req.ClientIP != "" {
		clientLocation = mss.multiSourceManager.geoOptimizer.DetectClientLocation(req.ClientIP)
	}

	// Fetch from multiple sources
	ctx, cancel := context.WithTimeout(r.Context(), req.Timeout)
	defer cancel()

	aggregatedData, err := mss.multiSourceManager.FetchFromMultipleSources(ctx, req.VideoKey, clientLocation)
	if err != nil {
		mss.metrics.mu.Lock()
		mss.metrics.FailedRequests++
		mss.metrics.mu.Unlock()
		
		mss.sendErrorResponse(w, http.StatusInternalServerError, "Multi-source streaming failed", err)
		return
	}

	// Create response
	response := &MultiSourceResponse{
		Success:              true,
		VideoKey:             req.VideoKey,
		Size:                 aggregatedData.Size,
		ProcessingTime:       time.Since(startTime),
		NodesUsed:            aggregatedData.Sources,
		AggregationTime:       aggregatedData.AggregationTime,
		RedundancyScore:      aggregatedData.RedundancyScore,
		GeoOptimizationScore: mss.multiSourceManager.geoOptimizer.GetMetrics().OptimizationAccuracy,
		IntegrityVerified:     aggregatedData.IntegrityVerified,
		TransferRate:         aggregatedData.TotalTransferRate,
		Metrics: &MultiSourceStreamMetrics{
			AggregatedData:       aggregatedData,
			ClientLocation:       clientLocation,
			SelectedNodes:        aggregatedData.Sources,
			LoadBalancingStrategy: mss.multiSourceManager.loadBalancer.GetStrategy(),
			AggregationStrategy:  mss.multiSourceManager.dataAggregator.GetStrategy(),
		},
	}

	// Update service metrics
	mss.updateServiceMetrics(aggregatedData.Size, time.Since(startTime), len(aggregatedData.Sources), true)

	// Send response
	mss.sendJSONResponse(w, http.StatusOK, response)

	processingTime := time.Since(startTime)
	log.Printf("✅ Multi-source stream completed: %v, %d bytes, %d sources, %.2f MB/s", 
		processingTime, aggregatedData.Size, len(aggregatedData.Sources), aggregatedData.TotalTransferRate)
}

// handleStreamVideoKey handles video streaming by key
func (mss *MultiSourceService) handleStreamVideoKey(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	videoKey := vars["videoKey"]

	// Get client IP
	clientIP := mss.getClientIP(r)

	// Create request
	req := &MultiSourceRequest{
		VideoKey:              videoKey,
		ClientIP:              clientIP,
		MaxNodes:              5,
		EnableGeoOptimization: true,
		EnableRedundancy:      true,
		AggregationStrategy:   "parallel",
		LoadBalancingStrategy: "geographic",
		Timeout:               30 * time.Second,
	}

	// Detect client location
	clientLocation := mss.multiSourceManager.geoOptimizer.DetectClientLocation(clientIP)

	// Fetch from multiple sources
	ctx, cancel := context.WithTimeout(r.Context(), req.Timeout)
	defer cancel()

	aggregatedData, err := mss.multiSourceManager.FetchFromMultipleSources(ctx, req.VideoKey, clientLocation)
	if err != nil {
		mss.sendErrorResponse(w, http.StatusInternalServerError, "Streaming failed", err)
		return
	}

	// Stream video data directly
	w.Header().Set("Content-Type", "video/mp4")
	w.Header().Set("Content-Length", strconv.FormatInt(aggregatedData.Size, 10))
	w.Header().Set("X-Transfer-Rate", fmt.Sprintf("%.2f", aggregatedData.TotalTransferRate))
	w.Header().Set("X-Nodes-Used", fmt.Sprintf("%d", len(aggregatedData.Sources)))
	w.Header().Set("X-Redundancy-Score", fmt.Sprintf("%.2f", aggregatedData.RedundancyScore))
	w.Header().Set("X-Integrity-Verified", fmt.Sprintf("%t", aggregatedData.IntegrityVerified))
	w.Header().Set("X-Client-Region", clientLocation.Region)
	w.Header().Set("X-Client-Country", clientLocation.Country)

	if _, err := w.Write(aggregatedData.Data); err != nil {
		log.Printf("❌ Failed to write video data: %v", err)
		return
	}

	log.Printf("✅ Video %s streamed from %d sources: %d bytes, %.2f MB/s", 
		videoKey, len(aggregatedData.Sources), aggregatedData.Size, aggregatedData.TotalTransferRate)
}

// handleGetEdgeNodes handles edge node information requests
func (mss *MultiSourceService) handleGetEdgeNodes(w http.ResponseWriter, r *http.Request) {
	edgeNodes := mss.multiSourceManager.GetEdgeNodes()
	mss.sendJSONResponse(w, http.StatusOK, edgeNodes)
}

// handleNodeHealth handles node health check requests
func (mss *MultiSourceService) handleNodeHealth(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	nodeID := vars["nodeID"]

	node := mss.multiSourceManager.loadBalancer.GetNodeByID(nodeID)
	if node == nil {
		mss.sendErrorResponse(w, http.StatusNotFound, "Node not found", fmt.Errorf("node %s not found", nodeID))
		return
	}

	healthCheck := mss.multiSourceManager.loadBalancer.healthChecker.CheckNodeHealth(node)
	mss.sendJSONResponse(w, http.StatusOK, healthCheck)
}

// handleUpdateNodeWeight handles node weight update requests
func (mss *MultiSourceService) handleUpdateNodeWeight(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	nodeID := vars["nodeID"]

	var req struct {
		Weight float64 `json:"weight"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		mss.sendErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	mss.multiSourceManager.loadBalancer.UpdateNodeWeight(nodeID, req.Weight)
	
	response := map[string]interface{}{
		"success": true,
		"node_id": nodeID,
		"weight":  req.Weight,
		"updated_at": time.Now(),
	}

	mss.sendJSONResponse(w, http.StatusOK, response)
}

// handleGeoOptimization handles geographic optimization requests
func (mss *MultiSourceService) handleGeoOptimization(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ClientIP       string        `json:"client_ip"`
		ClientLocation *ClientLocation `json:"client_location"`
		MaxNodes       int           `json:"max_nodes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		mss.sendErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Detect location if not provided
	clientLocation := req.ClientLocation
	if clientLocation == nil && req.ClientIP != "" {
		clientLocation = mss.multiSourceManager.geoOptimizer.DetectClientLocation(req.ClientIP)
	}

	// Get optimal nodes
	edgeNodes := mss.multiSourceManager.GetEdgeNodes()
	optimalNodes := mss.multiSourceManager.geoOptimizer.GetNearestNodes(edgeNodes, clientLocation, req.MaxNodes)

	response := map[string]interface{}{
		"client_location": clientLocation,
		"optimal_nodes":   optimalNodes,
		"optimization_score": mss.multiSourceManager.geoOptimizer.GetMetrics().OptimizationAccuracy,
		"optimized_at":    time.Now(),
	}

	mss.sendJSONResponse(w, http.StatusOK, response)
}

// handleDetectLocation handles location detection requests
func (mss *MultiSourceService) handleDetectLocation(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ip := vars["ip"]

	location := mss.multiSourceManager.geoOptimizer.DetectClientLocation(ip)
	mss.sendJSONResponse(w, http.StatusOK, location)
}

// handleGetCoverage handles geographic coverage requests
func (mss *MultiSourceService) handleGetCoverage(w http.ResponseWriter, r *http.Request) {
	edgeNodes := mss.multiSourceManager.GetEdgeNodes()
	coverage := mss.multiSourceManager.geoOptimizer.CalculateCoverage(edgeNodes)
	mss.sendJSONResponse(w, http.StatusOK, coverage)
}

// handleGetLoadBalancingStrategy handles load balancing strategy requests
func (mss *MultiSourceService) handleGetLoadBalancingStrategy(w http.ResponseWriter, r *http.Request) {
	strategy := mss.multiSourceManager.loadBalancer.GetStrategy()
	utilization := mss.multiSourceManager.loadBalancer.GetNodeUtilization()

	response := map[string]interface{}{
		"strategy":    strategy,
		"utilization": utilization,
		"updated_at":  time.Now(),
	}

	mss.sendJSONResponse(w, http.StatusOK, response)
}

// handleSetLoadBalancingStrategy handles load balancing strategy updates
func (mss *MultiSourceService) handleSetLoadBalancingStrategy(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Strategy string `json:"strategy"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		mss.sendErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	mss.multiSourceManager.loadBalancer.SetStrategy(req.Strategy)
	
	response := map[string]interface{}{
		"success":   true,
		"strategy":  req.Strategy,
		"updated_at": time.Now(),
	}

	mss.sendJSONResponse(w, http.StatusOK, response)
}

// handleGetUtilization handles utilization requests
func (mss *MultiSourceService) handleGetUtilization(w http.ResponseWriter, r *http.Request) {
	utilization := mss.multiSourceManager.loadBalancer.GetNodeUtilization()
	mss.sendJSONResponse(w, http.StatusOK, utilization)
}

// handleVerifyRedundancy handles redundancy verification requests
func (mss *MultiSourceService) handleVerifyRedundancy(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Data         []byte        `json:"data"`
		SourceData   []*SourceData `json:"source_data"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		mss.sendErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Create mock aggregated data
	aggregatedData := &AggregatedData{
		Data:  req.Data,
		Size:  int64(len(req.Data)),
		Sources: make([]string, 0),
	}

	for _, source := range req.SourceData {
		aggregatedData.Sources = append(aggregatedData.Sources, source.NodeID)
	}

	// Verify redundancy
	verifiedData, err := mss.multiSourceManager.redundancyManager.VerifyRedundancy(aggregatedData, req.SourceData)
	if err != nil {
		mss.sendErrorResponse(w, http.StatusInternalServerError, "Redundancy verification failed", err)
		return
	}

	mss.sendJSONResponse(w, http.StatusOK, verifiedData)
}

// handleCheckIntegrity handles integrity check requests
func (mss *MultiSourceService) handleCheckIntegrity(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Data         []byte        `json:"data"`
		SourceData   []*SourceData `json:"source_data"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		mss.sendErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Check integrity
	integrityReport, err := mss.multiSourceManager.redundancyManager.VerifyDataIntegrity(req.Data, req.SourceData)
	if err != nil {
		mss.sendErrorResponse(w, http.StatusInternalServerError, "Integrity check failed", err)
		return
	}

	mss.sendJSONResponse(w, http.StatusOK, integrityReport)
}

// handleGetMetrics handles metrics requests
func (mss *MultiSourceService) handleGetMetrics(w http.ResponseWriter, r *http.Request) {
	mss.metrics.mu.RLock()
	metrics := *mss.metrics
	mss.metrics.mu.RUnlock()

	mss.sendJSONResponse(w, http.StatusOK, metrics)
}

// handleGetPerformanceMetrics handles performance metrics requests
func (mss *MultiSourceService) handleGetPerformanceMetrics(w http.ResponseWriter, r *http.Request) {
	// Get metrics from all components
	multiSourceMetrics := mss.multiSourceManager.GetMetrics()
	aggregatorMetrics := mss.multiSourceManager.dataAggregator.GetMetrics()
	loadBalancerMetrics := mss.multiSourceManager.loadBalancer.GetMetrics()
	geoMetrics := mss.multiSourceManager.geoOptimizer.GetMetrics()
	redundancyMetrics := mss.multiSourceManager.redundancyManager.GetMetrics()

	response := map[string]interface{}{
		"multi_source_metrics":  multiSourceMetrics,
		"aggregator_metrics":   aggregatorMetrics,
		"load_balancer_metrics": loadBalancerMetrics,
		"geo_metrics":          geoMetrics,
		"redundancy_metrics":   redundancyMetrics,
		"collected_at":         time.Now(),
	}

	mss.sendJSONResponse(w, http.StatusOK, response)
}

// handleHealthCheck handles health check requests
func (mss *MultiSourceService) handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	health := map[string]interface{}{
		"status":     "healthy",
		"timestamp":  time.Now(),
		"version":    "1.0.0",
		"port":       mss.port,
		"edge_nodes": len(mss.multiSourceManager.GetEdgeNodes()),
		"healthy_nodes": len(mss.multiSourceManager.loadBalancer.GetHealthyNodes()),
		"geo_optimization": mss.multiSourceManager.geoOptimizer.GetMetrics().OptimizationAccuracy,
		"redundancy_enabled": mss.multiSourceManager.config.EnableRedundancy,
	}

	mss.sendJSONResponse(w, http.StatusOK, health)
}

// handleRoot handles root requests
func (mss *MultiSourceService) handleRoot(w http.ResponseWriter, r *http.Request) {
	root := map[string]interface{}{
		"service":     "Kronop Multi-Source Streaming",
		"description":  "Multi-source video streaming from Cloudflare R2 edge nodes",
		"version":     "1.0.0",
		"endpoints": map[string]string{
			"stream":           "/api/multi-source/stream",
			"edge_nodes":       "/api/edge-nodes",
			"geo_optimize":     "/api/geo/optimize",
			"load_balance":     "/api/load-balance/strategy",
			"redundancy":       "/api/redundancy/verify",
			"metrics":          "/api/multi-source/metrics",
			"health":           "/health",
		},
		"features": []string{
			"Multi-source fetching from Cloudflare R2",
			"Geographic optimization",
			"Load balancing across edge nodes",
			"Data redundancy and verification",
			"Real-time performance monitoring",
		},
	}

	mss.sendJSONResponse(w, http.StatusOK, root)
}

// validateMultiSourceRequest validates multi-source request
func (mss *MultiSourceService) validateMultiSourceRequest(req *MultiSourceRequest) error {
	if req.VideoKey == "" {
		return fmt.Errorf("video key is required")
	}

	if req.MaxNodes <= 0 || req.MaxNodes > 10 {
		return fmt.Errorf("max nodes must be between 1 and 10")
	}

	if req.Timeout <= 0 || req.Timeout > 5*time.Minute {
		return fmt.Errorf("timeout must be between 1 second and 5 minutes")
	}

	validStrategies := []string{"parallel", "sequential", "hybrid"}
	valid := false
	for _, strategy := range validStrategies {
		if req.AggregationStrategy == strategy {
			valid = true
			break
		}
	}
	if !valid {
		return fmt.Errorf("invalid aggregation strategy: %s", req.AggregationStrategy)
	}

	validLBStrategies := []string{"round_robin", "weighted", "least_connections", "geographic"}
	valid = false
	for _, strategy := range validLBStrategies {
		if req.LoadBalancingStrategy == strategy {
			valid = true
			break
		}
	}
	if !valid {
		return fmt.Errorf("invalid load balancing strategy: %s", req.LoadBalancingStrategy)
	}

	return nil
}

// updateServiceMetrics updates service metrics
func (mss *MultiSourceService) updateServiceMetrics(bytesStreamed int64, processingTime time.Duration, nodesUsed int, success bool) {
	mss.metrics.mu.Lock()
	defer mss.metrics.mu.Unlock()

	mss.metrics.TotalRequests++
	
	if success {
		mss.metrics.SuccessfulRequests++
	} else {
		mss.metrics.FailedRequests++
	}

	// Update average response time
	if mss.metrics.AverageResponseTime == 0 {
		mss.metrics.AverageResponseTime = processingTime
	} else {
		mss.metrics.AverageResponseTime = (mss.metrics.AverageResponseTime + processingTime) / 2
	}

	// Update total bytes streamed
	mss.metrics.TotalBytesStreamed += bytesStreamed

	// Update nodes utilized
	mss.metrics.NodesUtilized += int64(nodesUsed)

	mss.metrics.LastUpdated = time.Now()
}

// getClientIP gets client IP address
func (mss *MultiSourceService) getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}

	// Check X-Real-IP header
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	return r.RemoteAddr
}

// sendJSONResponse sends JSON response
func (mss *MultiSourceService) sendJSONResponse(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("❌ Failed to encode JSON response: %v", err)
	}
}

// sendErrorResponse sends error response
func (mss *MultiSourceService) sendErrorResponse(w http.ResponseWriter, statusCode int, message string, err error) {
	errorResponse := map[string]interface{}{
		"success": false,
		"error":   message,
		"details": err.Error(),
		"timestamp": time.Now(),
	}

	mss.sendJSONResponse(w, statusCode, errorResponse)
}

// Start starts the multi-source service
func (mss *MultiSourceService) Start() error {
	mss.server = &http.Server{
		Addr:         fmt.Sprintf(":%d", mss.port),
		Handler:      mss.router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	log.Printf("🌐 Starting Kronop Multi-Source Streaming Service on port %d", mss.port)
	log.Printf("🔥 Features: Cloudflare R2 integration, geographic optimization, load balancing")

	return mss.server.ListenAndServe()
}

// Stop stops the multi-source service
func (mss *MultiSourceService) Stop() error {
	log.Println("🔌 Stopping Kronop Multi-Source Streaming Service")
	
	if mss.server != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		
		return mss.server.Shutdown(ctx)
	}

	return nil
}

// Helper functions

func NewMultiSourceServiceMetrics() *MultiSourceServiceMetrics {
	return &MultiSourceServiceMetrics{
		CreatedAt: time.Now(),
	}
}
