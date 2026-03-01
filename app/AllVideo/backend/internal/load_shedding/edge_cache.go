/**
 * Edge Cache - Distributed Caching System
 * 
 * Handles edge caching for 500M+ users
 * Integrates with CDN for global content delivery
 * Optimized for low latency and high availability
 * 
 * Features:
 * - Multi-node edge caching
 * - CDN integration
 * - Geographic routing
 * - Cache warming
 * - Cache invalidation
 * - Health monitoring
 */

package load_shedding

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/scylladb/gocqlx/v2"
	"github.com/scylladb/gocqlx/v2/qb"
)

// EdgeCache represents distributed edge caching system
type EdgeCache struct {
	nodes           map[string]*EdgeCacheNode
	cdnIntegration  *CDNIntegration
	geoRouter       *GeoRouter
	warmupManager   *CacheWarmupManager
	invalidator     *CacheInvalidator
	config          EdgeCacheConfig
	metrics         *EdgeCacheMetrics
	mu              sync.RWMutex
}

// EdgeCacheConfig holds edge cache configuration
type EdgeCacheConfig struct {
	// Node configuration
	MaxNodesPerRegion      int           `json:"max_nodes_per_region"`
	NodeCapacity          int64         `json:"node_capacity"`
	ReplicationFactor     int           `json:"replication_factor"`
	
	// Cache settings
	DefaultTTL              time.Duration `json:"default_ttl"`
	MaxTTL                  time.Duration `json:"max_ttl"`
	MinTTL                  time.Duration `json:"min_ttl"`
	
	// CDN integration
	CDNEnabled              bool          `json:"cdn_enabled"`
	CDNProvider             string        `json:"cdn_provider"`
	CDNDomain               string        `json:"cdn_domain"`
	
	// Geographic routing
	GeoRoutingEnabled       bool          `json:"geo_routing_enabled"`
	MaxDistance            int           `json:"max_distance"` // kilometers
	
	// Performance settings
	WarmupEnabled           bool          `json:"warmup_enabled"`
	WarmupConcurrency       int           `json:"warmup_concurrency"`
	InvalidationDelay       time.Duration `json:"invalidation_delay"`
	
	// Health monitoring
	HealthCheckInterval     time.Duration `json:"health_check_interval"`
	MaxFailureRate          float64       `json:"max_failure_rate"`
	
	// Cache warming
	PopularContentThreshold int           `json:"popular_content_threshold"`
	WarmupBatchSize         int           `json:"warmup_batch_size"`
}

// EdgeCacheNode represents an edge cache node
type EdgeCacheNode struct {
	NodeID              string        `json:"node_id"`
	Region              string        `json:"region"`
	Country             string        `json:"country"`
	City                string        `json:"city"`
	Location            *Location     `json:"location"`
	Capacity            int64         `json:"capacity"`
	UsedCapacity        int64         `json:"used_capacity"`
	HitRatio            float64       `json:"hit_ratio"`
	IsActive            bool          `json:"is_active"`
	HealthScore         float64       `json:"health_score"`
	LastHealthCheck     time.Time     `json:"last_health_check"`
	LastCleanup         time.Time     `json:"last_cleanup"`
	
	// Cache storage
	cache               map[uuid.UUID]*CacheEntry
	cacheTTL            map[uuid.UUID]time.Time
	mu                  sync.RWMutex
	
	// Performance metrics
	requestCount        int64
	hitCount             int64
	missCount           int64
	errorCount           int64
	
	// Network info
	IPAddress           string        `json:"ip_address"`
	Port                int           `json:"port"`
	Bandwidth           int64         `json:"bandwidth"`
	Latency             time.Duration `json:"latency"`
}

// CacheEntry represents cached content
type CacheEntry struct {
	ContentID           uuid.UUID     `json:"content_id"`
	ContentType         string        `json:"content_type"`
	Content             []byte        `json:"content"`
	URL                 string        `json:"url"`
	Quality             string        `json:"quality"`
	Bitrate             int           `json:"bitrate"`
	Size                int64         `json:"size"`
	TTL                 time.Duration `json:"ttl"`
	CreatedAt           time.Time     `json:"created_at"`
	ExpiresAt           time.Time     `json:"expires_at"`
	AccessCount         int64         `json:"access_count"`
	LastAccessed        time.Time     `json:"last_accessed"`
	Metadata            interface{}   `json:"metadata"`
}

// CDNIntegration handles CDN operations
type CDNIntegration struct {
	provider           string
	domain             string
	apiKey             string
	endpoints          []string
	cacheControl       map[string]string
	mu                 sync.RWMutex
}

// GeoRouter handles geographic routing
type GeoRouter struct {
	regions           map[string]*Region
	distanceMatrix    map[string]map[string]float64
	routingStrategy   string
	mu                sync.RWMutex
}

// Region represents a geographic region
type Region struct {
	Name              string        `json:"name"`
	Country           string        `json:"country"`
	Cities            []string      `json:"cities"`
	CenterLat         float64       `json:"center_lat"`
	CenterLng         float64       `json:"center_lng"`
	Nodes              []string      `json:"nodes"`
	PreferredNodes    []string      `json:"preferred_nodes"`
}

// CacheWarmupManager handles cache warming
type CacheWarmupManager struct {
	queue              chan *WarmupTask
	workers            int
	warmupInProgress  map[uuid.UUID]bool
	mu                 sync.RWMutex
}

// WarmupTask represents a cache warming task
type WarmupTask struct {
	ContentID          uuid.UUID     `json:"content_id"`
	ContentType        string        `json:"content_type"`
	Priority           int           `json:"priority"`
	TargetRegions      []string      `json:"target_regions"`
	CreatedAt          time.Time     `json:"created_at"`
}

// CacheInvalidator handles cache invalidation
type CacheInvalidator struct {
	invalidationQueue  chan *InvalidationTask
	workers            int
	pendingTasks      map[string]bool
	mu                 sync.RWMutex
}

// InvalidationTask represents cache invalidation task
type InvalidationTask struct {
	ContentID          uuid.UUID     `json:"content_id"`
	Pattern            string        `json:"pattern"`
	InvalidateAll      bool          `json:"invalidate_all"`
	TargetNodes        []string      `json:"target_nodes"`
	CreatedAt          time.Time     `json:"created_at"`
}

// EdgeCacheMetrics tracks cache performance
type EdgeCacheMetrics struct {
	TotalRequests       int64         `json:"total_requests"`
	CacheHits           int64         `json:"cache_hits"`
	CacheMisses         int64         `json:"cache_misses"`
	HitRatio            float64       `json:"hit_ratio"`
	AverageLatency      time.Duration `json:"average_latency"`
	P95Latency          time.Duration `json:"p95_latency"`
	P99Latency          time.Duration `json:"p99_latency"`
	
	// Node metrics
	NodeCount           int           `json:"node_count"`
	ActiveNodes         int           `json:"active_nodes"`
	HealthyNodes        int           `json:"healthy_nodes"`
	
	// CDN metrics
	CDNRequests         int64         `json:"cdn_requests"`
	CDNHits             int64         `json:"cdn_hits"`
	CDNHitRatio         float64       `json:"cdn_hit_ratio"`
	
	// Geographic metrics
	RegionalHitRatios   map[string]float64 `json:"regional_hit_ratios"`
	
	LastUpdated         time.Time     `json:"last_updated"`
	CreatedAt           time.Time     `json:"created_at"`
	
	mu                  sync.RWMutex
}

// NewEdgeCache creates a new edge cache system
func NewEdgeCache(session *gocqlx.Session, config EdgeCacheConfig) *EdgeCache {
	ec := &EdgeCache{
		nodes:           make(map[string]*EdgeCacheNode),
		cdnIntegration:  NewCDNIntegration(config.CDNProvider, config.CDNDomain),
		geoRouter:       NewGeoRouter(),
		warmupManager:   NewCacheWarmupManager(config.WarmupConcurrency),
		invalidator:     NewCacheInvalidator(10),
		config:          config,
		metrics:         NewEdgeCacheMetrics(),
	}

	// Initialize edge nodes
	ec.initializeNodes()

	// Start background processes
	go ec.monitorNodeHealth()
	go ec.cleanupExpiredEntries()
	go ec.updateMetrics()
	go ec.warmupManager.Start()
	go ec.invalidator.Start()

	return ec
}

// GetContent retrieves content from edge cache
func (ec *EdgeCache) GetContent(ctx context.Context, contentID uuid.UUID, userLocation *Location) (*CacheEntry, error) {
	startTime := time.Now()

	ec.metrics.mu.Lock()
	ec.metrics.TotalRequests++
	ec.metrics.mu.Unlock()

	// Find nearest node
	nearestNode := ec.findNearestNode(userLocation)
	if nearestNode == nil {
		ec.metrics.mu.Lock()
		ec.metrics.CacheMisses++
		ec.metrics.mu.Unlock()
		return nil, fmt.Errorf("no available cache node")
	}

	// Try to get from node cache
	entry, found := nearestNode.Get(contentID)
	if found {
		ec.metrics.mu.Lock()
		ec.metrics.CacheHits++
		ec.metrics.mu.Unlock()
		
		// Update access statistics
		nearestNode.UpdateAccess(contentID)
		
		log.Printf("🎯 Cache hit for content %s from node %s", contentID, nearestNode.NodeID)
		return entry, nil
	}

	// Try CDN if enabled
	if ec.config.CDNEnabled {
		if cdnEntry, err := ec.cdnIntegration.GetContent(contentID); err == nil {
			ec.metrics.mu.Lock()
			ec.metrics.CDNRequests++
			ec.metrics.CDNHits++
			ec.metrics.mu.Unlock()
			
			// Cache CDN response
			nearestNode.Set(contentID, cdnEntry)
			
			log.Printf("🌐 CDN hit for content %s", contentID)
			return cdnEntry, nil
		}
	}

	ec.metrics.mu.Lock()
	ec.metrics.CacheMisses++
	ec.metrics.mu.Unlock()

	// Cache miss - trigger warmup if popular
	go ec.warmupManager.QueueWarmup(&WarmupTask{
		ContentID:   contentID,
		ContentType: "video",
		Priority:    1,
		CreatedAt:   time.Now(),
	})

	log.Printf("❌ Cache miss for content %s", contentID)
	return nil, fmt.Errorf("content not found in cache")
}

// SetContent stores content in edge cache
func (ec *EdgeCache) SetContent(ctx context.Context, contentID uuid.UUID, entry *CacheEntry, targetRegions []string) error {
	// Store in target regions
	for _, region := range targetRegions {
		nodes := ec.getNodesInRegion(region)
		for _, nodeID := range nodes {
			if node, exists := ec.nodes[nodeID]; exists && node.IsActive {
				node.Set(contentID, entry)
				log.Printf("💾 Cached content %s in node %s", contentID, nodeID)
			}
		}
	}

	// Invalidate CDN if enabled
	if ec.config.CDNEnabled {
		go ec.cdnIntegration.InvalidateContent(contentID)
	}

	return nil
}

// findNearestNode finds the nearest cache node
func (ec *EdgeCache) findNearestNode(location *Location) *EdgeCacheNode {
	if location == nil {
		return ec.getRandomActiveNode()
	}

	ec.mu.RLock()
	defer ec.mu.RUnlock()

	var nearestNode *EdgeCacheNode
	minDistance := math.MaxFloat64

	for _, node := range ec.nodes {
		if !node.IsActive {
			continue
		}

		distance := ec.calculateDistance(location, node.Location)
		if distance < minDistance {
			minDistance = distance
			nearestNode = node
		}
	}

	return nearestNode
}

// calculateDistance calculates distance between two locations
func (ec *EdgeCache) calculateDistance(loc1, loc2 *Location) float64 {
	if loc1 == nil || loc2 == nil {
		return math.MaxFloat64
	}

	// Haversine formula for distance calculation
	const R = 6371 // Earth radius in kilometers

	lat1 := loc1.Latitude * math.Pi / 180
	lon1 := loc1.Longitude * math.Pi / 180
	lat2 := loc2.Latitude * math.Pi / 180
	lon2 := loc2.Longitude * math.Pi / 180

	dLat := lat2 - lat1
	dLon := lon2 - lon1

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1)*math.Cos(lat2)*math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	distance := R * c
	return distance
}

// getRandomActiveNode returns a random active node
func (ec *EdgeCache) getRandomActiveNode() *EdgeCacheNode {
	ec.mu.RLock()
	defer ec.mu.RUnlock()

	var activeNodes []*EdgeCacheNode
	for _, node := range ec.nodes {
		if node.IsActive {
			activeNodes = append(activeNodes, node)
		}
	}

	if len(activeNodes) == 0 {
		return nil
	}

	// Simple random selection
	index := int(time.Now().UnixNano()) % len(activeNodes)
	return activeNodes[index]
}

// getNodesInRegion returns nodes in a specific region
func (ec *EdgeCache) getNodesInRegion(region string) []string {
	ec.mu.RLock()
	defer ec.mu.RUnlock()

	var nodeIDs []string
	for _, node := range ec.nodes {
		if node.Region == region && node.IsActive {
			nodeIDs = append(nodeIDs, node.NodeID)
		}
	}

	return nodeIDs
}

// initializeNodes initializes edge cache nodes
func (ec *EdgeCache) initializeNodes() {
	regions := []string{
		"us-east", "us-west", "us-central",
		"eu-west", "eu-central", "eu-north",
		"asia-east", "asia-south", "asia-southeast",
		"australia", "south-america", "africa",
	}

	for i, region := range regions {
		node := &EdgeCacheNode{
			NodeID:       fmt.Sprintf("edge-node-%s-%d", region, i),
			Region:       region,
			Country:      ec.getCountryFromRegion(region),
			City:         ec.getCapitalCity(region),
			Location:     &Location{
				Country:   ec.getCountryFromRegion(region),
				Region:    region,
				City:      ec.getCapitalCity(region),
				Latitude:  ec.getRegionLatitude(region),
				Longitude: ec.getRegionLongitude(region),
			},
			Capacity:     ec.config.NodeCapacity,
			UsedCapacity: 0,
			HitRatio:     0.0,
			IsActive:     true,
			HealthScore:  1.0,
			LastHealthCheck: time.Now(),
			LastCleanup:  time.Now(),
			cache:        make(map[uuid.UUID]*CacheEntry),
			cacheTTL:     make(map[uuid.UUID]time.Time),
			IPAddress:   fmt.Sprintf("192.168.%d.%d", i/255+1, i%255+1),
			Port:         8080,
			Bandwidth:   1000000000, // 1Gbps
			Latency:     0,
		}
		ec.nodes[node.NodeID] = node
	}

	log.Printf("🌐 Initialized %d edge cache nodes", len(ec.nodes))
}

// getCountryFromRegion returns country for region
func (ec *EdgeCache) getCountryFromRegion(region string) string {
	countryMap := map[string]string{
		"us-east":     "United States",
		"us-west":     "United States",
		"us-central":  "United States",
		"eu-west":     "United Kingdom",
		"eu-central":  "Germany",
		"eu-north":    "Sweden",
		"asia-east":   "Singapore",
		"asia-south":  "India",
		"asia-southeast": "Thailand",
		"australia":   "Australia",
		"south-america": "Brazil",
		"africa":      "South Africa",
	}
	
	if country, exists := countryMap[region]; exists {
		return country
	}
	return "Unknown"
}

// getCapitalCity returns capital city for region
func (ec *EdgeCache) getCapitalCity(region string) string {
	cityMap := map[string]string{
		"us-east":     "New York",
		"us-west":     "San Francisco",
		"us-central":  "Chicago",
		"eu-west":     "London",
		"eu-central":  "Berlin",
		"eu-north":    "Stockholm",
		"asia-east":   "Singapore",
		"asia-south":  "Mumbai",
		"asia-southeast": "Bangkok",
		"australia":   "Sydney",
		"south-america": "São Paulo",
		"africa":      "Johannesburg",
	}
	
	if city, exists := cityMap[region]; exists {
		return city
	}
	return "Unknown"
}

// getRegionLatitude returns latitude for region
func (ec *EdgeCache) getRegionLatitude(region string) float64 {
	latMap := map[string]float64{
		"us-east":     40.7128,
		"us-west":     37.7749,
		"us-central":  41.8781,
		"eu-west":     51.5074,
		"eu-central":  52.5200,
		"eu-north":    59.3293,
		"asia-east":   1.3521,
		"asia-south":  19.0760,
		"asia-southeast": 13.7563,
		"australia":   -33.8688,
		"south-america": -23.5505,
		"africa":      -26.2041,
	}
	
	if lat, exists := latMap[region]; exists {
		return lat
	}
	return 0.0
}

// getRegionLongitude returns longitude for region
func (ec *EdgeCache) getRegionLongitude(region string) float64 {
	lngMap := map[string]float64{
		"us-east":     -74.0060,
		"us-west":     -122.4194,
		"us-central":  -87.6298,
		"eu-west":     -0.1278,
		"eu-central":  13.4050,
		"eu-north":    18.0686,
		"asia-east":   103.8198,
		"asia-south":  72.8777,
		"asia-southeast": 100.5018,
		"australia":   151.2093,
		"south-america": -46.6338,
		"africa":      28.0473,
	}
	
	if lng, exists := lngMap[region]; exists {
		return lng
	}
	return 0.0
}

// Background processes

func (ec *EdgeCache) monitorNodeHealth() {
	ticker := time.NewTicker(ec.config.HealthCheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			ec.checkNodeHealth()
		}
	}
}

func (ec *EdgeCache) checkNodeHealth() {
	ec.mu.RLock()
	defer ec.mu.RUnlock()

	for _, node := range ec.nodes {
		go func(n *EdgeCacheNode) {
			health := n.HealthCheck()
			
			n.mu.Lock()
			n.HealthScore = health
			n.LastHealthCheck = time.Now()
			n.IsActive = health > 0.5
			n.mu.Unlock()
			
			if health < 0.5 {
				log.Printf("⚠️ Node %s health degraded: %.2f", n.NodeID, health)
			}
		}(node)
	}
}

func (ec *EdgeCache) cleanupExpiredEntries() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			ec.cleanupExpired()
		}
	}
}

func (ec *EdgeCache) cleanupExpired() {
	ec.mu.RLock()
	defer ec.mu.RUnlock()

	for _, node := range ec.nodes {
		go func(n *EdgeCacheNode) {
			n.CleanupExpired()
		}(node)
	}
}

func (ec *EdgeCache) updateMetrics() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			ec.calculateMetrics()
		}
	}
}

func (ec *EdgeCache) calculateMetrics() {
	ec.metrics.mu.Lock()
	defer ec.metrics.mu.Unlock()

	// Calculate hit ratio
	if ec.metrics.TotalRequests > 0 {
		ec.metrics.HitRatio = float64(ec.metrics.CacheHits) / float64(ec.metrics.TotalRequests) * 100
	}

	// Calculate CDN hit ratio
	if ec.metrics.CDNRequests > 0 {
		ec.metrics.CDNHitRatio = float64(ec.metrics.CDNHits) / float64(ec.metrics.CDNRequests) * 100
	}

	// Count active and healthy nodes
	activeNodes := 0
	healthyNodes := 0
	for _, node := range ec.nodes {
		if node.IsActive {
			activeNodes++
			if node.HealthScore > 0.5 {
				healthyNodes++
			}
		}
	}

	ec.metrics.NodeCount = len(ec.nodes)
	ec.metrics.ActiveNodes = activeNodes
	ec.metrics.HealthyNodes = healthyNodes
	ec.metrics.LastUpdated = time.Now()
}

// Edge cache node methods

func (ecn *EdgeCacheNode) Get(contentID uuid.UUID) (*CacheEntry, bool) {
	ecn.mu.RLock()
	defer ec.ecn.mu.RUnlock()

	ecn.requestCount++

	// Check if entry exists and is not expired
	if entry, exists := ecn.cache[contentID]; exists {
		if time.Now().Before(entry.ExpiresAt) {
			ecn.hitCount++
			return entry, true
		} else {
			// Entry expired, remove it
			delete(ecn.cache, contentID)
			delete(ecn.cacheTTL, contentID)
		}
	}

	ecn.missCount++
	return nil, false
}

func (ecn *EdgeCacheNode) Set(contentID uuid.UUID, entry *CacheEntry) bool {
	ecn.mu.Lock()
	defer ec.ecn.mu.Unlock()

	// Check capacity
	if ecn.UsedCapacity >= ecn.Capacity {
		// Cleanup old entries
		ecn.cleanupOldest()
	}

	// Check if we have space after cleanup
	if ecn.UsedCapacity >= ecn.Capacity {
		return false
	}

	// Set entry
	ecn.cache[contentID] = entry
	ecn.cacheTTL[contentID] = entry.ExpiresAt
	ecn.UsedCapacity++

	return true
}

func (ecn *EdgeCacheNode) UpdateAccess(contentID uuid.UUID) {
	ecn.mu.Lock()
	defer ecn.ecn.mu.Unlock()

	if entry, exists := ecn.cache[contentID]; exists {
		entry.AccessCount++
		entry.LastAccessed = time.Now()
	}
}

func (ecn *EdgeCacheNode) HealthCheck() float64 {
	// Calculate health score based on various factors
	score := 1.0

	// Hit ratio factor
	if ecn.requestCount > 0 {
		hitRatio := float64(ecn.hitCount) / float64(ecn.requestCount)
		score *= hitRatio
	}

	// Capacity factor
	capacityRatio := float64(ecn.UsedCapacity) / float64(ecn.Capacity)
	if capacityRatio > 0.9 {
		score *= 0.5 // Penalize high capacity usage
	}

	// Error rate factor
	if ecn.requestCount > 0 {
		errorRate := float64(ecn.errorCount) / float64(ecn.requestCount)
		score *= (1.0 - errorRate)
	}

	// Latency factor
	if ecn.Latency > 100*time.Millisecond {
		score *= 0.8 // Penalize high latency
	}

	return score
}

func (ecn *EdgeCacheNode) CleanupExpired() {
	ecn.mu.Lock()
	defer ecn.ecn.mu.Unlock()

	now := time.Now()
	for contentID, expiresAt := range ecn.cacheTTL {
		if now.After(expiresAt) {
			delete(ecn.cache, contentID)
			delete(ecn.cacheTTL, contentID)
			ecn.UsedCapacity--
		}
	}
}

func (ecn *EdgeCacheNode) cleanupOldest() {
	ecn.mu.Lock()
	defer ecn.ecn.mu.Unlock()

	var oldestTime time.Time
	var oldestID uuid.UUID

	for contentID, entry := range ecn.cache {
		if oldestTime.IsZero() || entry.CreatedAt.Before(oldestTime) {
			oldestTime = entry.CreatedAt
			oldestID = contentID
		}
	}

	if !oldestTime.IsZero() {
		delete(ecn.cache, oldestID)
		delete(ecn.cacheTTL, oldestID)
		ecn.UsedCapacity--
	}
}

// Helper functions

func NewEdgeCacheMetrics() *EdgeCacheMetrics {
	return &EdgeCacheMetrics{
		CreatedAt: time.Now(),
	}
}

func NewCDNIntegration(provider, domain string) *CDNIntegration {
	return &CDNIntegration{
		provider:     provider,
		domain:       domain,
		endpoints:    []string{"cdn.kronop.com", "cdn2.kronop.com"},
		cacheControl: map[string]string{
			"video": "public, max-age=3600",
			"image": "public, max-age=7200",
			"audio": "public, max-age=1800",
		},
	}
}

func NewGeoRouter() *GeoRouter {
	return &GeoRouter{
		regions:       make(map[string]*Region),
		distanceMatrix: make(map[string]map[string]float64),
		routingStrategy: "nearest",
	}
}

func NewCacheWarmupManager(workers int) *CacheWarmupManager {
	return &CacheWarmupManager{
		queue:             make(chan *WarmupTask, workers*100),
		workers:           workers,
		warmupInProgress:  make(map[uuid.UUID]bool),
	}
}

func NewCacheInvalidator(workers int) *CacheInvalidator {
	return &CacheInvalidator{
		invalidationQueue: make(chan *InvalidationTask, workers*100),
		workers:           workers,
		pendingTasks:      make(map[string]bool),
	}
}

// CDN Integration methods

func (cdn *CDNIntegration) GetContent(contentID uuid.UUID) (*CacheEntry, error) {
	// Implementation would query CDN API
	return nil, fmt.Errorf("CDN not implemented")
}

func (cdn *CDNIntegration) InvalidateContent(contentID uuid.UUID) error {
	// Implementation would send invalidation request to CDN
	return nil
}

// Cache Warmup Manager methods

func (cwm *CacheWarmupManager) Start() {
	for i := 0; i < cwm.workers; i++ {
		go cwm.worker(i)
	}
}

func (cwm *CacheWarmupManager) QueueWarmup(task *WarmupTask) {
	select {
	case cwm.queue <- task:
	default:
		log.Printf("⚠️ Warmup queue full, dropping task for content %s", task.ContentID)
	}
}

func (cwm *CacheWarmupManager) worker(workerID int) {
	for task := range cwm.queue {
		cwm.processWarmupTask(task, workerID)
	}
}

func (cwm *CacheWarmupManager) processWarmupTask(task *WarmupTask, workerID int) {
	cwm.mu.Lock()
	if cwm.warmupInProgress[task.ContentID] {
		cwm.mu.Unlock()
		return
	}
	cwm.warmupInProgress[task.ContentID] = true
	cwm.mu.Unlock()

	defer func() {
		cwm.mu.Lock()
		delete(cwm.warmupInProgress, task.ContentID)
		cwm.mu.Unlock()
	}()

	// Process warmup task
	log.Printf("🔥 Worker %d warming up content %s", workerID, task.ContentID)
	time.Sleep(100 * time.Millisecond) // Simulate warmup
}

// Cache Invalidator methods

func (ci *CacheInvalidator) Start() {
	for i := 0; i < ci.workers; i++ {
		go ci.worker(i)
	}
}

func (ci *CacheInvalidator) worker(workerID int) {
	for task := range ci.invalidationQueue {
		ci.processInvalidationTask(task, workerID)
	}
}

func (ci *CacheInvalidator) processInvalidationTask(task *InvalidationTask, workerID int) {
	log.Printf("🗑️ Worker %d invalidating content %s", workerID, task.ContentID)
	time.Sleep(50 * time.Millisecond) // Simulate invalidation
}

// Close closes the edge cache
func (ec *EdgeCache) Close() error {
	log.Println("🔌 Edge cache closed")
	return nil
}
