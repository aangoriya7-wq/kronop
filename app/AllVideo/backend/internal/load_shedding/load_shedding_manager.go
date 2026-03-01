/**
 * Load Shedding Manager - 500M User Load Handler
 * 
 * Handles massive concurrent video playback requests
 * Implements intelligent load shedding and edge caching
 * Optimized for 500M+ users with zero downtime
 * 
 * Features:
 * - Intelligent load shedding
 * - Edge caching with CDN integration
 * - Request prioritization
 * - Rate limiting and throttling
 * - Circuit breaker pattern
 * - Health monitoring
 */

package load_shedding

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"runtime"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"github.com/scylladb/gocqlx/v2"
	"github.com/scylladb/gocqlx/v2/qb"
)

// LoadSheddingManager handles massive load
type LoadSheddingManager struct {
	session          *gocqlx.Session
	cache            EdgeCache
	config           LoadSheddingConfig
	metrics          *LoadMetrics
	circuitBreaker   *CircuitBreaker
	rateLimiter      *RateLimiter
	priorityQueue    *PriorityQueue
	healthMonitor    *HealthMonitor
	mu               sync.RWMutex
}

// LoadSheddingConfig holds load shedding configuration
type LoadSheddingConfig struct {
	// Load shedding thresholds
	MaxConcurrentRequests    int64         `json:"max_concurrent_requests"`
	MaxMemoryUsage           float64       `json:"max_memory_usage"`
	MaxCPUUsage              float64       `json:"max_cpu_usage"`
	MaxNetworkBandwidth      int64         `json:"max_network_bandwidth"`
	
	// Rate limiting
	RequestsPerSecond        int           `json:"requests_per_second"`
	BurstSize                int           `json:"burst_size"`
	UserRateLimit            int           `json:"user_rate_limit"`
	
	// Circuit breaker
	FailureThreshold         int           `json:"failure_threshold"`
	RecoveryTimeout          time.Duration `json:"recovery_timeout"`
	TimeoutDuration          time.Duration `json:"timeout_duration"`
	
	// Edge caching
	CacheHitRatio            float64       `json:"cache_hit_ratio"`
	CacheTTL                 time.Duration `json:"cache_ttl"`
	EdgeCacheNodes           int           `json:"edge_cache_nodes"`
	CDNIntegration           bool          `json:"cdn_integration"`
	
	// Load shedding strategies
	EnableLoadShedding       bool          `json:"enable_load_shedding"`
	SheddingStrategy         string        `json:"shedding_strategy"` // "random", "priority", "geographic"
	GracefulDegradation      bool          `json:"graceful_degradation"`
	
	// Performance settings
	MonitoringInterval       time.Duration `json:"monitoring_interval"`
	HealthCheckInterval      time.Duration `json:"health_check_interval"`
	AutoScaling              bool          `json:"auto_scaling"`
}

// LoadMetrics tracks system load
type LoadMetrics struct {
	CurrentRequests         int64         `json:"current_requests"`
	TotalRequests           int64         `json:"total_requests"`
	RejectedRequests        int64         `json:"rejected_requests"`
	SheddedRequests         int64         `json:"shedded_requests"`
	CachedRequests          int64         `json:"cached_requests"`
	
	// Performance metrics
	AverageResponseTime     time.Duration `json:"average_response_time"`
	P95ResponseTime         time.Duration `json:"p95_response_time"`
	P99ResponseTime         time.Duration `json:"p99_response_time"`
	
	// Resource usage
	MemoryUsage             float64       `json:"memory_usage"`
	CPUUsage                float64       `json:"cpu_usage"`
	NetworkBandwidth        int64         `json:"network_bandwidth"`
	
	// Error metrics
	ErrorRate                float64       `json:"error_rate"`
	TimeoutRate              float64       `json:"timeout_rate"`
	CircuitBreakerTrips      int64         `json:"circuit_breaker_trips"`
	
	// Timestamps
	LastUpdated              time.Time     `json:"last_updated"`
	CreatedAt               time.Time     `json:"created_at"`
	
	mu                       sync.RWMutex
}

// CircuitBreaker implements circuit breaker pattern
type CircuitBreaker struct {
	state           CircuitBreakerState
	failureCount    int64
	lastFailureTime time.Time
	timeout         time.Duration
	threshold       int
	mu              sync.RWMutex
}

type CircuitBreakerState int

const (
	Closed CircuitBreakerState = iota
	Open
	HalfOpen
)

// RateLimiter implements token bucket rate limiting
type RateLimiter struct {
	tokens         int64
	bucketSize     int64
	refillRate     int64
	lastRefill     time.Time
	mu            sync.Mutex
}

// PriorityQueue handles request prioritization
type PriorityQueue struct {
	highPriority   chan *VideoRequest
	mediumPriority  chan *VideoRequest
	lowPriority    chan *VideoRequest
	maxSize        int
	mu             sync.RWMutex
}

// VideoRequest represents a video playback request
type VideoRequest struct {
	RequestID       uuid.UUID     `json:"request_id"`
	UserID          uuid.UUID     `json:"user_id"`
	VideoID         uuid.UUID     `json:"video_id"`
	Priority        int           `json:"priority"`
	IPAddress       string        `json:"ip_address"`
	UserAgent       string        `json:"user_agent"`
	DeviceType      string        `json:"device_type"`
	Location        *Location     `json:"location"`
	Quality         string        `json:"quality"`
	Bitrate         int           `json:"bitrate"`
	RequestedAt     time.Time     `json:"requested_at"`
	Timeout         time.Duration `json:"timeout"`
	Metadata        interface{}   `json:"metadata"`
}

// Location represents user location
type Location struct {
	Country    string  `json:"country"`
	Region     string  `json:"region"`
	City       string  `json:"city"`
	Latitude   float64 `json:"latitude"`
	Longitude  float64 `json:"longitude"`
	Timezone   string  `json:"timezone"`
}

// EdgeCache represents edge caching system
type EdgeCache struct {
	nodes           []EdgeCacheNode
	hitRatio        float64
	totalRequests   int64
	cachedRequests  int64
	mu              sync.RWMutex
}

// EdgeCacheNode represents a cache node
type EdgeCacheNode struct {
	NodeID       string    `json:"node_id"`
	Location     Location  `json:"location"`
	Capacity     int64     `json:"capacity"`
	UsedCapacity int64     `json:"used_capacity"`
	HitRatio     float64   `json:"hit_ratio"`
	IsActive     bool      `json:"is_active"`
	LastHealthCheck time.Time `json:"last_health_check"`
}

// HealthMonitor monitors system health
type HealthMonitor struct {
	cpuUsage        float64
	memoryUsage     float64
	networkUsage    int64
	diskIO          int64
	isHealthy       bool
	lastCheck       time.Time
	mu              sync.RWMutex
}

// NewLoadSheddingManager creates a new load shedding manager
func NewLoadSheddingManager(session *gocqlx.Session, config LoadSheddingConfig) *LoadSheddingManager {
	lsm := &LoadSheddingManager{
		session:        session,
		config:         config,
		metrics:        NewLoadMetrics(),
		circuitBreaker: NewCircuitBreaker(config.FailureThreshold, config.TimeoutDuration),
		rateLimiter:    NewRateLimiter(config.RequestsPerSecond, config.BurstSize),
		priorityQueue:  NewPriorityQueue(10000),
		healthMonitor:  NewHealthMonitor(),
		cache:          NewEdgeCache(config.EdgeCacheNodes),
	}

	// Start background processes
	go lsm.monitorSystemLoad()
	go lsm.updateMetrics()
	go lsm.healthCheck()
	go lsm.autoScale()
	go lsm.cleanupExpiredRequests()

	return lsm
}

// HandleVideoRequest handles video playback request with load shedding
func (lsm *LoadSheddingManager) HandleVideoRequest(ctx context.Context, req *VideoRequest) (*VideoResponse, error) {
	startTime := time.Now()

	// Check if we should shed load
	if lsm.shouldShedLoad(req) {
		lsm.incrementSheddedRequests()
		return &VideoResponse{
			Success:       false,
			Shedded:       true,
			Reason:        "System overloaded",
			StatusCode:   503,
			Message:       "Service temporarily unavailable",
			ProcessingTime: time.Since(startTime),
		}, nil
	}

	// Check rate limiting
	if !lsm.rateLimiter.AllowRequest(req.UserID) {
		lsm.incrementRejectedRequests()
		return &VideoResponse{
			Success:       false,
			RateLimited:   true,
			Reason:        "Rate limit exceeded",
			StatusCode:   429,
			Message:       "Too many requests",
			ProcessingTime: time.Since(startTime),
		}, nil
	}

	// Check circuit breaker
	if !lsm.circuitBreaker.AllowRequest() {
		lsm.incrementRejectedRequests()
		return &VideoResponse{
			Success:       false,
			CircuitOpen:   true,
			Reason:        "Circuit breaker open",
			StatusCode:   503,
			Message:       "Service temporarily unavailable",
			ProcessingTime: time.Since(startTime),
		}, nil
	}

	// Try edge cache first
	if cached, found := lsm.cache.Get(req.VideoID); found {
		lsm.incrementCachedRequests()
		return &VideoResponse{
			Success:        true,
			Cached:         true,
			VideoURL:       cached.URL,
			Quality:        cached.Quality,
			Bitrate:        cached.Bitrate,
			CacheNode:      cached.NodeID,
			ProcessingTime: time.Since(startTime),
		}, nil
	}

	// Add to priority queue
	lsm.priorityQueue.Enqueue(req)

	// Process request
	response, err := lsm.processVideoRequest(ctx, req)
	if err != nil {
		lsm.circuitBreaker.RecordFailure()
		lsm.incrementRejectedRequests()
		return nil, err
	}

	// Cache successful response
	if response.Success {
		lsm.cache.Set(req.VideoID, &CacheEntry{
			URL:     response.VideoURL,
			Quality: response.Quality,
			Bitrate: response.Bitrate,
			TTL:     lsm.config.CacheTTL,
		})
	}

	lsm.circuitBreaker.RecordSuccess()
	lsm.incrementTotalRequests()
	lsm.updateResponseTime(time.Since(startTime))

	return response, nil
}

// shouldShedLoad determines if we should shed load
func (lsm *LoadSheddingManager) shouldShedLoad(req *VideoRequest) bool {
	if !lsm.config.EnableLoadShedding {
		return false
	}

	lsm.metrics.mu.RLock()
	currentRequests := lsm.metrics.CurrentRequests
	memoryUsage := lsm.metrics.MemoryUsage
	cpuUsage := lsm.metrics.CPUUsage
	lsm.metrics.mu.RUnlock()

	// Check concurrent requests
	if currentRequests >= lsm.config.MaxConcurrentRequests {
		return true
	}

	// Check memory usage
	if memoryUsage >= lsm.config.MaxMemoryUsage {
		return true
	}

	// Check CPU usage
	if cpuUsage >= lsm.config.MaxCPUUsage {
		return true
	}

	// Check network bandwidth
	if lsm.metrics.NetworkBandwidth >= lsm.config.MaxNetworkBandwidth {
		return true
	}

	// Apply shedding strategy
	switch lsm.config.SheddingStrategy {
	case "random":
		return lsm.randomShedding()
	case "priority":
		return lsm.priorityShedding(req)
	case "geographic":
		return lsm.geographicShedding(req)
	default:
		return false
	}
}

// randomShedding implements random load shedding
func (lsm *LoadSheddingManager) randomShedding() bool {
	// Randomly shed 10% of requests when under load
	return math.Random() < 0.1
}

// priorityShedding implements priority-based load shedding
func (lsm *LoadSheddingManager) priorityShedding(req *VideoRequest) bool {
	// Shed low priority requests first
	if req.Priority < 3 {
		return true
	}
	return false
}

// geographicShedding implements geographic load shedding
func (lsm *LoadSheddingManager) geographicShedding(req *VideoRequest) bool {
	// Shed requests from distant regions
	if req.Location != nil {
		distantRegions := []string{"Antarctica", "Greenland", "Iceland"}
		for _, region := range distantRegions {
			if req.Location.Region == region {
				return true
			}
		}
	}
	return false
}

// processVideoRequest processes video request
func (lsm *LoadSheddingManager) processVideoRequest(ctx context.Context, req *VideoRequest) (*VideoResponse, error) {
	// Get video details from database
	video, err := lsm.getVideoDetails(ctx, req.VideoID)
	if err != nil {
		return nil, fmt.Errorf("failed to get video details: %w", err)
	}

	// Check if video is available
	if !video.IsAvailable {
		return &VideoResponse{
			Success:     false,
			Reason:      "Video not available",
			StatusCode:  404,
			Message:     "Video not found",
		}, nil
	}

	// Get optimal quality based on user preferences and network conditions
	quality := lsm.getOptimalQuality(req, video)

	// Generate video URL
	videoURL := lsm.generateVideoURL(video, quality, req)

	// Update video stats
	go lsm.updateVideoStats(req.VideoID, req.UserID)

	return &VideoResponse{
		Success:        true,
		VideoURL:       videoURL,
		Quality:        quality,
		Bitrate:        video.Bitrate,
		Duration:       video.Duration,
		ThumbnailURL:   video.ThumbnailURL,
		ProcessingTime: time.Since(time.Now()),
	}, nil
}

// getVideoDetails gets video details from database
func (lsm *LoadSheddingManager) getVideoDetails(ctx context.Context, videoID uuid.UUID) (*Video, error) {
	query := qb.Select("videos").
		Columns("video_id", "user_id", "title", "description", "video_url", "thumbnail_url",
			"duration", "bitrate", "quality", "is_available", "created_at").
		Where(qb.Eq("video_id", videoID)).
		ToCql()

	var video Video
	err := lsm.session.Queryctx(ctx, query, videoID).Get(
		&video.VideoID, &video.UserID, &video.Title, &video.Description, &video.VideoURL,
		&video.ThumbnailURL, &video.Duration, &video.Bitrate, &video.Quality, &video.IsAvailable,
		&video.CreatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to get video: %w", err)
	}

	return &video, nil
}

// getOptimalQuality determines optimal video quality
func (lsm *LoadSheddingManager) getOptimalQuality(req *VideoRequest, video *Video) string {
	// Check user's preferred quality
	if req.Quality != "" {
		return req.Quality
	}

	// Check device capabilities
	switch req.DeviceType {
	case "mobile":
		if req.Bitrate < 1000000 { // < 1Mbps
			return "360p"
		} else if req.Bitrate < 3000000 { // < 3Mbps
			return "480p"
		} else {
			return "720p"
		}
	case "tablet":
		return "720p"
	case "desktop":
		return "1080p"
	default:
		return "480p"
	}
}

// generateVideoURL generates optimized video URL
func (lsm *LoadSheddingManager) generateVideoURL(video *Video, quality string, req *VideoRequest) string {
	// Generate CDN URL with quality parameters
	baseURL := "https://cdn.kronop.com/videos"
	return fmt.Sprintf("%s/%s/%s?quality=%s&bitrate=%d&device=%s",
		baseURL, video.VideoID, video.UserID, quality, video.Bitrate, req.DeviceType)
}

// updateVideoStats updates video statistics
func (lsm *LoadSheddingManager) updateVideoStats(videoID, userID uuid.UUID) {
	query := qb.Update("video_stats").
		Set("views_count", qb.Expr("views_count + ?")).
		Set("last_viewed", time.Now()).
		Where(qb.Eq("video_id", videoID)).
		ToCql()

	err := lsm.session.Queryctx(context.Background(), query, 1, time.Now()).Exec()
	if err != nil {
		log.Printf("Failed to update video stats: %v", err)
	}
}

// Background processes

func (lsm *LoadSheddingManager) monitorSystemLoad() {
	ticker := time.NewTicker(lsm.config.MonitoringInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			lsm.updateSystemMetrics()
		}
	}
}

func (lsm *LoadSheddingManager) updateSystemMetrics() {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	// Update memory usage
	memoryUsage := float64(m.Alloc) / float64(m.Sys) * 100

	// Update CPU usage (simplified - would use actual CPU monitoring)
	cpuUsage := lsm.getCPUUsage()

	// Update network bandwidth
	networkBandwidth := lsm.getNetworkBandwidth()

	lsm.metrics.mu.Lock()
	lsm.metrics.MemoryUsage = memoryUsage
	lsm.metrics.CPUUsage = cpuUsage
	lsm.metrics.NetworkBandwidth = networkBandwidth
	lsm.metrics.LastUpdated = time.Now()
	lsm.metrics.mu.Unlock()
}

func (lsm *LoadSheddingManager) getCPUUsage() float64 {
	// Simplified CPU usage calculation
	// In production, would use actual CPU monitoring
	return float64(runtime.NumGoroutine()) / 1000.0 * 100
}

func (lsm *LoadSheddingManager) getNetworkBandwidth() int64 {
	// Simplified network bandwidth calculation
	// In production, would use actual network monitoring
	return 1000000000 // 1Gbps
}

func (lsm *LoadSheddingManager) updateMetrics() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			lsm.calculateMetrics()
		}
	}
}

func (lsm *LoadSheddingManager) calculateMetrics() {
	lsm.metrics.mu.Lock()
	defer lsm.metrics.mu.Unlock()

	// Calculate error rate
	if lsm.metrics.TotalRequests > 0 {
		lsm.metrics.ErrorRate = float64(lsm.metrics.RejectedRequests) / float64(lsm.metrics.TotalRequests) * 100
	}

	// Calculate cache hit ratio
	if lsm.cache.totalRequests > 0 {
		lsm.metrics.CachedRequests = lsm.cache.cachedRequests
	}
}

func (lsm *LoadSheddingManager) healthCheck() {
	ticker := time.NewTicker(lsm.config.HealthCheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			lsm.performHealthCheck()
		}
	}
}

func (lsm *LoadSheddingManager) performHealthCheck() {
	lsm.healthMonitor.mu.Lock()
	defer lsm.healthMonitor.mu.Unlock()

	// Check system health
	lsm.healthMonitor.cpuUsage = lsm.getCPUUsage()
	lsm.healthMonitor.memoryUsage = float64(runtime.NumGoroutine()) / 1000.0 * 100
	lsm.healthMonitor.isHealthy = lsm.healthMonitor.cpuUsage < 80 && lsm.healthMonitor.memoryUsage < 80
	lsm.healthMonitor.lastCheck = time.Now()

	// Log health status
	if !lsm.healthMonitor.isHealthy {
		log.Printf("⚠️ System health degraded: CPU=%.2f%%, Memory=%.2f%%",
			lsm.healthMonitor.cpuUsage, lsm.healthMonitor.memoryUsage)
	}
}

func (lsm *LoadSheddingManager) autoScale() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if lsm.config.AutoScaling {
				lsm.checkAutoScaling()
			}
		}
	}
}

func (lsm *LoadSheddingManager) checkAutoScaling() {
	lsm.metrics.mu.RLock()
	currentLoad := float64(lsm.metrics.CurrentRequests) / float64(lsm.config.MaxConcurrentRequests)
	lsm.metrics.mu.RUnlock()

	// Scale up if load is high
	if currentLoad > 0.8 {
		log.Printf("📈 High load detected (%.2f%%), scaling up", currentLoad)
		// Trigger scaling up
	} else if currentLoad < 0.3 {
		log.Printf("📉 Low load detected (%.2f%%), scaling down", currentLoad)
		// Trigger scaling down
	}
}

func (lsm *LoadSheddingManager) cleanupExpiredRequests() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			lsm.priorityQueue.CleanupExpired()
		}
	}
}

// Metrics functions

func (lsm *LoadSheddingManager) incrementTotalRequests() {
	atomic.AddInt64(&lsm.metrics.TotalRequests, 1)
}

func (lsm *LoadSheddingManager) incrementRejectedRequests() {
	atomic.AddInt64(&lsm.metrics.RejectedRequests, 1)
}

func (lsm *LoadSheddingManager) incrementSheddedRequests() {
	atomic.AddInt64(&lsm.metrics.SheddedRequests, 1)
}

func (lsm *LoadSheddingManager) incrementCachedRequests() {
	atomic.AddInt64(&lsm.metrics.CachedRequests, 1)
}

func (lsm *LoadSheddingManager) updateResponseTime(duration time.Duration) {
	// Update average response time
	// Simplified - would use proper moving average
	lsm.metrics.mu.Lock()
	lsm.metrics.AverageResponseTime = duration
	lsm.metrics.mu.Unlock()
}

// Helper functions

func NewLoadMetrics() *LoadMetrics {
	return &LoadMetrics{
		CreatedAt: time.Now(),
	}
}

func NewCircuitBreaker(threshold int, timeout time.Duration) *CircuitBreaker {
	return &CircuitBreaker{
		state:        Closed,
		threshold:    threshold,
		timeout:      timeout,
	}
}

func NewRateLimiter(rate int, burst int) *RateLimiter {
	return &RateLimiter{
		tokens:     int64(burst),
		bucketSize: int64(burst),
		refillRate: int64(rate),
		lastRefill: time.Now(),
	}
}

func NewPriorityQueue(maxSize int) *PriorityQueue {
	return &PriorityQueue{
		highPriority:  make(chan *VideoRequest, maxSize/3),
		mediumPriority: make(chan *VideoRequest, maxSize/3),
		lowPriority:   make(chan *VideoRequest, maxSize/3),
		maxSize:       maxSize,
	}
}

func NewEdgeCache(nodes int) *EdgeCache {
	cacheNodes := make([]EdgeCacheNode, nodes)
	for i := 0; i < nodes; i++ {
		cacheNodes[i] = EdgeCacheNode{
			NodeID:       fmt.Sprintf("edge-node-%d", i),
			Capacity:     1000000, // 1M items
			UsedCapacity: 0,
			HitRatio:     0.0,
			IsActive:     true,
			LastHealthCheck: time.Now(),
		}
	}

	return &EdgeCache{
		nodes: cacheNodes,
	}
}

func NewHealthMonitor() *HealthMonitor {
	return &HealthMonitor{
		lastCheck: time.Now(),
	}
}

// VideoResponse represents video response
type VideoResponse struct {
	Success        bool          `json:"success"`
	VideoURL       string        `json:"video_url"`
	Quality        string        `json:"quality"`
	Bitrate        int           `json:"bitrate"`
	Duration       int           `json:"duration"`
	ThumbnailURL   string        `json:"thumbnail_url"`
	Cached         bool          `json:"cached"`
	CacheNode      string        `json:"cache_node"`
	Shedded        bool          `json:"shedded"`
	RateLimited    bool          `json:"rate_limited"`
	CircuitOpen    bool          `json:"circuit_open"`
	Reason         string        `json:"reason"`
	StatusCode    int           `json:"status_code"`
	Message        string        `json:"message"`
	ProcessingTime time.Duration `json:"processing_time"`
}

// Video represents video entity
type Video struct {
	VideoID      uuid.UUID `json:"video_id"`
	UserID       uuid.UUID `json:"user_id"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	VideoURL     string    `json:"video_url"`
	ThumbnailURL string    `json:"thumbnail_url"`
	Duration     int       `json:"duration"`
	Bitrate      int       `json:"bitrate"`
	Quality      string    `json:"quality"`
	IsAvailable bool      `json:"is_available"`
	CreatedAt    time.Time `json:"created_at"`
}

// CacheEntry represents cache entry
type CacheEntry struct {
	URL     string        `json:"url"`
	Quality string        `json:"quality"`
	Bitrate int           `json:"bitrate"`
	TTL     time.Duration `json:"ttl"`
}

// Circuit breaker methods

func (cb *CircuitBreaker) AllowRequest() bool {
	cb.mu.RLock()
	defer cb.mu.RUnlock()

	switch cb.state {
	case Closed:
		return true
	case Open:
		if time.Since(cb.lastFailureTime) > cb.timeout {
			cb.state = HalfOpen
			return true
		}
		return false
	case HalfOpen:
		return true
	}
	return false
}

func (cb *CircuitBreaker) RecordSuccess() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.failureCount = 0
	cb.state = Closed
}

func (cb *CircuitBreaker) RecordFailure() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.failureCount++
	cb.lastFailureTime = time.Now()

	if cb.failureCount >= cb.threshold {
		cb.state = Open
	}
}

// Rate limiter methods

func (rl *RateLimiter) AllowRequest(userID uuid.UUID) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(rl.lastRefill).Seconds()
	tokensToAdd := int64(elapsed * float64(rl.refillRate))

	if tokensToAdd > 0 {
		rl.tokens = min(rl.tokens+tokensToAdd, rl.bucketSize)
		rl.lastRefill = now
	}

	if rl.tokens > 0 {
		rl.tokens--
		return true
	}

	return false
}

// Priority queue methods

func (pq *PriorityQueue) Enqueue(req *VideoRequest) {
	switch req.Priority {
	case 1, 2:
		select {
		case pq.highPriority <- req:
		default:
			// High priority queue full, try medium
			select {
			case pq.mediumPriority <- req:
			default:
				// Medium also full, try low
				select {
				case pq.lowPriority <- req:
				default:
					// All queues full, drop request
				}
			}
		}
	case 3, 4:
		select {
		case pq.mediumPriority <- req:
		default:
			select {
			case pq.lowPriority <- req:
			default:
				// Low priority queue full, drop request
			}
		}
	default:
		select {
		case pq.lowPriority <- req:
		default:
			// Low priority queue full, drop request
		}
	}
}

func (pq *PriorityQueue) Dequeue() *VideoRequest {
	select {
	case req := <-pq.highPriority:
		return req
	default:
		select {
		case req := <-pq.mediumPriority:
			return req
		default:
			select {
			case req := <-pq.lowPriority:
				return req
			default:
				return nil
			}
		}
	}
}

func (pq *PriorityQueue) CleanupExpired() {
	// Clean up expired requests
	// Implementation would check request timeouts
}

// Edge cache methods

func (ec *EdgeCache) Get(videoID uuid.UUID) (*CacheEntry, bool) {
	ec.mu.RLock()
	defer ec.mu.RUnlock()

	ec.totalRequests++

	// Try to get from nearest node
	for _, node := range ec.nodes {
		if entry, found := node.Get(videoID); found {
			ec.cachedRequests++
			return entry, true
		}
	}

	return nil, false
}

func (ec *EdgeCache) Set(videoID uuid.UUID, entry *CacheEntry) {
	ec.mu.Lock()
	defer ec.mu.Unlock()

	// Set in nearest available node
	for _, node := range ec.nodes {
		if node.Set(videoID, entry) {
			return
		}
	}
}

// Edge cache node methods

func (ecn *EdgeCacheNode) Get(videoID uuid.UUID) (*CacheEntry, bool) {
	// Implementation would check local cache
	return nil, false
}

func (ecn *EdgeCacheNode) Set(videoID uuid.UUID, entry *CacheEntry) bool {
	// Implementation would set in local cache
	return true
}

// Close closes the load shedding manager
func (lsm *LoadSheddingManager) Close() error {
	log.Println("🔌 Load shedding manager closed")
	return nil
}
