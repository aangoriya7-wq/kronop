/**
 * Video Handler - 500M User Load Handler
 * 
 * Handles video playback requests with load shedding
 * Integrates edge caching and CDN
 * Optimized for massive concurrent requests
 * 
 * Features:
 * - Video request routing
 * - Load shedding integration
 * - Edge cache integration
 * - Request prioritization
 * - Performance monitoring
 */

package load_shedding

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/scylladb/gocqlx/v2"
	"github.com/scylladb/gocqlx/v2/qb"
)

// VideoHandler handles video requests
type VideoHandler struct {
	loadSheddingManager *LoadSheddingManager
	edgeCache           *EdgeCache
	session             *gocqlx.Session
	config              VideoHandlerConfig
	metrics             *VideoHandlerMetrics
}

// VideoHandlerConfig holds video handler configuration
type VideoHandlerConfig struct {
	// Request handling
	MaxConcurrentRequests int64         `json:"max_concurrent_requests"`
	RequestTimeout        time.Duration `json:"request_timeout"`
	EnableLoadShedding    bool          `json:"enable_load_shedding"`
	
	// Video processing
	MaxVideoSize          int64         `json:"max_video_size"`
	SupportedFormats      []string      `json:"supported_formats"`
	MaxQuality            string        `json:"max_quality"`
	
	// Performance settings
	EnableMetrics         bool          `json:"enable_metrics"`
	MetricsInterval       time.Duration `json:"metrics_interval"`
	EnableTracing         bool          `json:"enable_tracing"`
	
	// Security
	EnableRateLimiting    bool          `json:"enable_rate_limiting"`
	MaxRequestsPerUser    int           `json:"max_requests_per_user"`
	EnableAuth            bool          `json:"enable_auth"`
}

// VideoHandlerMetrics tracks video handler performance
type VideoHandlerMetrics struct {
	TotalRequests         int64         `json:"total_requests"`
	SuccessfulRequests    int64         `json:"successful_requests"`
	FailedRequests        int64         `json:"failed_requests"`
	SheddedRequests       int64         `json:"shedded_requests"`
	
	// Performance metrics
	AverageResponseTime   time.Duration `json:"average_response_time"`
	P95ResponseTime       time.Duration `json:"p95_response_time"`
	P99ResponseTime       time.Duration `json:"p99_response_time"`
	
	// Video metrics
	VideosServed          int64         `json:"videos_served"`
	TotalBandwidth        int64         `json:"total_bandwidth"`
	AverageBitrate        int           `json:"average_bitrate"`
	
	// Quality metrics
	QualityDistribution    map[string]int64 `json:"quality_distribution"`
	DeviceDistribution    map[string]int64 `json:"device_distribution"`
	GeographicDistribution map[string]int64 `json:"geographic_distribution"`
	
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// VideoRequest represents a video request
type VideoRequest struct {
	RequestID       uuid.UUID     `json:"request_id"`
	UserID          uuid.UUID     `json:"user_id"`
	VideoID         uuid.UUID     `json:"video_id"`
	Quality         string        `json:"quality"`
	Bitrate         int           `json:"bitrate"`
	Format          string        `json:"format"`
	DeviceType      string        `json:"device_type"`
	UserAgent       string        `json:"user_agent"`
	IPAddress       string        `json:"ip_address"`
	Location        *Location     `json:"location"`
	RequestedAt     time.Time     `json:"requested_at"`
	Timeout         time.Duration `json:"timeout"`
	Priority        int           `json:"priority"`
	Metadata        interface{}   `json:"metadata"`
}

// VideoResponse represents video response
type VideoResponse struct {
	Success        bool          `json:"success"`
	VideoURL       string        `json:"video_url"`
	Quality        string        `json:"quality"`
	Bitrate        int           `json:"bitrate"`
	Format         string        `json:"format"`
	Duration       int           `json:"duration"`
	Size           int64         `json:"size"`
	ThumbnailURL   string        `json:"thumbnail_url"`
	Cached         bool          `json:"cached"`
	CacheNode      string        `json:"cache_node"`
	CDNURL         string        `json:"cdn_url"`
	Shedded        bool          `json:"shedded"`
	RateLimited    bool          `json:"rate_limited"`
	Reason         string        `json:"reason"`
	StatusCode     int           `json:"status_code"`
	Message        string        `json:"message"`
	ProcessingTime time.Duration `json:"processing_time"`
	Metadata       interface{}   `json:"metadata"`
}

// NewVideoHandler creates a new video handler
func NewVideoHandler(session *gocqlx.Session, config VideoHandlerConfig) *VideoHandler {
	vh := &VideoHandler{
		session: session,
		config:  config,
		metrics: NewVideoHandlerMetrics(),
	}

	// Initialize load shedding manager
	loadSheddingConfig := LoadSheddingConfig{
		MaxConcurrentRequests: config.MaxConcurrentRequests,
		MaxMemoryUsage:        80.0,
		MaxCPUUsage:           80.0,
		MaxNetworkBandwidth:    10000000000, // 10Gbps
		RequestsPerSecond:     10000,
		BurstSize:            1000,
		UserRateLimit:        config.MaxRequestsPerUser,
		FailureThreshold:     100,
		RecoveryTimeout:      30 * time.Second,
		TimeoutDuration:      5 * time.Second,
		CacheHitRatio:        0.8,
		CacheTTL:             1 * time.Hour,
		EdgeCacheNodes:       12,
		CDNIntegration:       true,
		EnableLoadShedding:   config.EnableLoadShedding,
		SheddingStrategy:     "priority",
		GracefulDegradation:  true,
		MonitoringInterval:   1 * time.Second,
		HealthCheckInterval:  30 * time.Second,
		AutoScaling:          true,
	}

	vh.loadSheddingManager = NewLoadSheddingManager(session, loadSheddingConfig)

	// Initialize edge cache
	edgeCacheConfig := EdgeCacheConfig{
		MaxNodesPerRegion:      3,
		NodeCapacity:          1000000,
		ReplicationFactor:     2,
		DefaultTTL:             1 * time.Hour,
		MaxTTL:                 24 * time.Hour,
		MinTTL:                 5 * time.Minute,
		CDNEnabled:             true,
		CDNProvider:            "cloudflare",
		CDNDomain:              "cdn.kronop.com",
		GeoRoutingEnabled:       true,
		MaxDistance:            1000, // 1000km
		WarmupEnabled:          true,
		WarmupConcurrency:      10,
		InvalidationDelay:      5 * time.Minute,
		HealthCheckInterval:    30 * time.Second,
		MaxFailureRate:         0.1,
		PopularContentThreshold: 1000,
		WarmupBatchSize:        100,
	}

	vh.edgeCache = NewEdgeCache(session, edgeCacheConfig)

	// Start background processes
	go vh.updateMetrics()

	return vh
}

// HandleVideoRequest handles video playback request
func (vh *VideoHandler) HandleVideoRequest(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	// Parse request
	req, err := vh.parseVideoRequest(r)
	if err != nil {
		vh.sendErrorResponse(w, http.StatusBadRequest, "Invalid request", err)
		return
	}

	// Log request
	log.Printf("🎥 Video request: %s for user %s, video %s, quality %s", 
		req.RequestID, req.UserID, req.VideoID, req.Quality)

	// Update metrics
	vh.metrics.mu.Lock()
	vh.metrics.TotalRequests++
	vh.metrics.mu.Unlock()

	// Handle request through load shedding manager
	response, err := vh.loadSheddingManager.HandleVideoRequest(r.Context(), req)
	if err != nil {
		vh.metrics.mu.Lock()
		vh.metrics.FailedRequests++
		vh.metrics.mu.Unlock()
		
		vh.sendErrorResponse(w, http.StatusInternalServerError, "Internal server error", err)
		return
	}

	// Update metrics based on response
	vh.updateResponseMetrics(response)

	// Send response
	vh.sendVideoResponse(w, response)

	// Log performance
	log.Printf("📊 Request completed in %v: success=%v, cached=%v, shedded=%v", 
		response.ProcessingTime, response.Success, response.Cached, response.Shedded)
}

// parseVideoRequest parses video request from HTTP request
func (vh *VideoHandler) parseVideoRequest(r *http.Request) (*VideoRequest, error) {
	vars := mux.Vars(r)
	
	// Parse video ID
	videoIDStr := vars["video_id"]
	if videoIDStr == "" {
		return nil, fmt.Errorf("video_id is required")
	}
	
	videoID, err := uuid.Parse(videoIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid video_id: %w", err)
	}

	// Parse user ID (from header or query)
	userIDStr := r.Header.Get("X-User-ID")
	if userIDStr == "" {
		userIDStr = r.URL.Query().Get("user_id")
	}
	
	var userID uuid.UUID
	if userIDStr != "" {
		userID, err = uuid.Parse(userIDStr)
		if err != nil {
			return nil, fmt.Errorf("invalid user_id: %w", err)
		}
	} else {
		userID = uuid.New() // Generate anonymous user ID
	}

	// Parse quality
	quality := r.URL.Query().Get("quality")
	if quality == "" {
		quality = "auto"
	}

	// Parse bitrate
	bitrate := 0
	if bitrateStr := r.URL.Query().Get("bitrate"); bitrateStr != "" {
		bitrate, err = strconv.Atoi(bitrateStr)
		if err != nil {
			bitrate = 0
		}
	}

	// Parse format
	format := r.URL.Query().Get("format")
	if format == "" {
		format = "mp4"
	}

	// Determine device type
	deviceType := vh.detectDeviceType(r.UserAgent())

	// Parse location (from IP geolocation)
	location := vh.parseLocationFromIP(r.RemoteAddr)

	// Determine priority
	priority := vh.determinePriority(userID, deviceType, location)

	req := &VideoRequest{
		RequestID:   uuid.New(),
		UserID:      userID,
		VideoID:     videoID,
		Quality:     quality,
		Bitrate:     bitrate,
		Format:      format,
		DeviceType:  deviceType,
		UserAgent:   r.UserAgent(),
		IPAddress:   vh.getClientIP(r),
		Location:    location,
		RequestedAt: time.Now(),
		Timeout:     vh.config.RequestTimeout,
		Priority:    priority,
	}

	return req, nil
}

// detectDeviceType detects device type from user agent
func (vh *VideoHandler) detectDeviceType(userAgent string) string {
	userAgent = strings.ToLower(userAgent)
	
	if strings.Contains(userAgent, "mobile") || strings.Contains(userAgent, "android") || strings.Contains(userAgent, "iphone") {
		return "mobile"
	} else if strings.Contains(userAgent, "tablet") || strings.Contains(userAgent, "ipad") {
		return "tablet"
	} else {
		return "desktop"
	}
}

// parseLocationFromIP parses location from IP address
func (vh *VideoHandler) parseLocationFromIP(ip string) *Location {
	// Simplified location parsing
	// In production, would use actual IP geolocation service
	
	if strings.HasPrefix(ip, "192.168.") || strings.HasPrefix(ip, "10.") || strings.HasPrefix(ip, "127.") {
		return &Location{
			Country:   "United States",
			Region:    "us-east",
			City:      "New York",
			Latitude:  40.7128,
			Longitude: -74.0060,
		}
	}

	return &Location{
		Country:   "Unknown",
		Region:    "unknown",
		City:      "Unknown",
		Latitude:  0.0,
		Longitude: 0.0,
	}
}

// getClientIP gets client IP address
func (vh *VideoHandler) getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}

	// Check X-Real-IP header
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Use RemoteAddr
	return r.RemoteAddr
}

// determinePriority determines request priority
func (vh *VideoHandler) determinePriority(userID uuid.UUID, deviceType string, location *Location) int {
	priority := 5 // Default priority

	// Premium users get higher priority
	if vh.isPremiumUser(userID) {
		priority = 1
	}

	// Mobile devices get higher priority
	if deviceType == "mobile" {
		priority = min(priority, 2)
	}

	// Users in certain regions get higher priority
	if location != nil && vh.isHighPriorityRegion(location.Region) {
		priority = min(priority, 3)
	}

	return priority
}

// isPremiumUser checks if user is premium
func (vh *VideoHandler) isPremiumUser(userID uuid.UUID) bool {
	// In production, would check user subscription status
	return false
}

// isHighPriorityRegion checks if region is high priority
func (vh *VideoHandler) isHighPriorityRegion(region string) bool {
	highPriorityRegions := []string{"us-east", "us-west", "eu-west", "asia-east"}
	for _, r := range highPriorityRegions {
		if r == region {
			return true
		}
	}
	return false
}

// updateResponseMetrics updates metrics based on response
func (vh *VideoHandler) updateResponseMetrics(response *VideoResponse) {
	vh.metrics.mu.Lock()
	defer vh.metrics.mu.Unlock()

	if response.Success {
		vh.metrics.SuccessfulRequests++
		vh.metrics.VideosServed++
		
		// Update quality distribution
		if vh.metrics.QualityDistribution == nil {
			vh.metrics.QualityDistribution = make(map[string]int64)
		}
		vh.metrics.QualityDistribution[response.Quality]++
		
		// Update device distribution
		// This would be extracted from request context
	} else {
		vh.metrics.FailedRequests++
		
		if response.Shedded {
			vh.metrics.SheddedRequests++
		}
	}

	// Update response time metrics
	vh.updateResponseTimeMetrics(response.ProcessingTime)
}

// updateResponseTimeMetrics updates response time metrics
func (vh *VideoHandler) updateResponseTimeMetrics(duration time.Duration) {
	// Simple moving average
	if vh.metrics.AverageResponseTime == 0 {
		vh.metrics.AverageResponseTime = duration
	} else {
		vh.metrics.AverageResponseTime = (vh.metrics.AverageResponseTime + duration) / 2
	}
}

// sendVideoResponse sends video response
func (vh *VideoHandler) sendVideoResponse(w http.ResponseWriter, response *VideoResponse) {
	// Set headers
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Response-Time", response.ProcessingTime.String())
	w.Header().Set("X-Cache-Status", vh.getCacheStatus(response))
	w.Header().Set("X-Load-Shedding", vh.getLoadSheddingStatus(response))

	// Set status code
	statusCode := http.StatusOK
	if response.StatusCode > 0 {
		statusCode = response.StatusCode
	}
	w.WriteHeader(statusCode)

	// Encode response
	json.NewEncoder(w).Encode(response)
}

// getCacheStatus gets cache status string
func (vh *VideoHandler) getCacheStatus(response *VideoResponse) string {
	if response.Cached {
		return "HIT"
	} else if response.CDNURL != "" {
		return "CDN"
	} else {
		return "MISS"
	}
}

// getLoadSheddingStatus gets load shedding status
func (vh *VideoHandler) getLoadSheddingStatus(response *VideoResponse) string {
	if response.Shedded {
		return "SHED"
	} else if response.RateLimited {
		return "LIMITED"
	} else {
		return "ALLOWED"
	}
}

// sendErrorResponse sends error response
func (vh *VideoHandler) sendErrorResponse(w http.ResponseWriter, statusCode int, message string, err error) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	response := VideoResponse{
		Success:        false,
		StatusCode:     statusCode,
		Message:        message,
		ProcessingTime: 0,
	}

	json.NewEncoder(w).Encode(response)
}

// GetVideoMetrics returns video handler metrics
func (vh *VideoHandler) GetVideoMetrics() *VideoHandlerMetrics {
	vh.metrics.mu.RLock()
	defer vh.metrics.mu.RUnlock()

	// Return copy to avoid concurrent access
	metrics := *vh.metrics
	return &metrics
}

// GetLoadSheddingMetrics returns load shedding metrics
func (vh *VideoHandler) GetLoadSheddingMetrics() *LoadMetrics {
	return vh.loadSheddingManager.GetMetrics()
}

// GetEdgeCacheMetrics returns edge cache metrics
func (vh *VideoHandler) GetEdgeCacheMetrics() *EdgeCacheMetrics {
	return vh.edgeCache.GetMetrics()
}

// updateMetrics updates metrics periodically
func (vh *VideoHandler) updateMetrics() {
	if !vh.config.EnableMetrics {
		return
	}

	ticker := time.NewTicker(vh.config.MetricsInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			vh.collectMetrics()
		}
	}
}

// collectMetrics collects various metrics
func (vh *VideoHandler) collectMetrics() {
	vh.metrics.mu.Lock()
	vh.metrics.LastUpdated = time.Now()
	vh.metrics.mu.Unlock()

	// Log current metrics
	metrics := vh.GetVideoMetrics()
	log.Printf("📊 Video Handler Metrics: Total=%d, Success=%d, Failed=%d, Shed=%d, AvgTime=%v",
		metrics.TotalRequests, metrics.SuccessfulRequests, metrics.FailedRequests, 
		metrics.SheddedRequests, metrics.AverageResponseTime)
}

// SetupRoutes sets up HTTP routes
func (vh *VideoHandler) SetupRoutes(router *mux.Router) {
	// Video playback endpoint
	router.HandleFunc("/videos/{video_id}", vh.HandleVideoRequest).Methods("GET")
	
	// Metrics endpoints
	router.HandleFunc("/metrics/video", vh.handleVideoMetrics).Methods("GET")
	router.HandleFunc("/metrics/load-shedding", vh.handleLoadSheddingMetrics).Methods("GET")
	router.HandleFunc("/metrics/edge-cache", vh.handleEdgeCacheMetrics).Methods("GET")
	router.HandleFunc("/metrics/all", vh.handleAllMetrics).Methods("GET")
	
	// Health check endpoint
	router.HandleFunc("/health", vh.handleHealthCheck).Methods("GET")
}

// handleVideoMetrics handles video metrics request
func (vh *VideoHandler) handleVideoMetrics(w http.ResponseWriter, r *http.Request) {
	metrics := vh.GetVideoMetrics()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}

// handleLoadSheddingMetrics handles load shedding metrics request
func (vh *VideoHandler) handleLoadSheddingMetrics(w http.ResponseWriter, r *http.Request) {
	metrics := vh.GetLoadSheddingMetrics()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}

// handleEdgeCacheMetrics handles edge cache metrics request
func (vh *VideoHandler) handleEdgeCacheMetrics(w http.ResponseWriter, r *http.Request) {
	metrics := vh.GetEdgeCacheMetrics()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}

// handleAllMetrics handles all metrics request
func (vh *VideoHandler) handleAllMetrics(w http.ResponseWriter, r *http.Request) {
	allMetrics := map[string]interface{}{
		"video_handler":     vh.GetVideoMetrics(),
		"load_shedding":     vh.GetLoadSheddingMetrics(),
		"edge_cache":        vh.GetEdgeCacheMetrics(),
		"timestamp":         time.Now(),
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(allMetrics)
}

// handleHealthCheck handles health check request
func (vh *VideoHandler) handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	health := map[string]interface{}{
		"status": "healthy",
		"timestamp": time.Now(),
		"load_shedding": vh.loadSheddingManager.IsHealthy(),
		"edge_cache": vh.edgeCache.IsHealthy(),
		"metrics": vh.GetVideoMetrics(),
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
}

// Helper functions

func NewVideoHandlerMetrics() *VideoHandlerMetrics {
	return &VideoHandlerMetrics{
		CreatedAt: time.Now(),
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Close closes the video handler
func (vh *VideoHandler) Close() error {
	if vh.loadSheddingManager != nil {
		vh.loadSheddingManager.Close()
	}
	
	if vh.edgeCache != nil {
		vh.edgeCache.Close()
	}
	
	log.Println("🔌 Video handler closed")
	return nil
}
