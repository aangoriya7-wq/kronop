/**
 * Multi-Source Integration - Cloudflare R2 Edge Nodes
 * 
 * Fetches video data from multiple Cloudflare R2 edge nodes simultaneously
 * Aggregates data from multiple sources for maximum speed
 * Provides redundancy and load balancing across edge locations
 * 
 * Features:
 * - Multi-source fetching from Cloudflare R2 edge nodes
 * - Data aggregation and reassembly
 * - Edge node load balancing
 * - Redundancy and failover
 * - Geographic optimization
 */

package streaming

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
)

// MultiSourceManager manages multi-source integration
type MultiSourceManager struct {
	config               MultiSourceConfig
	edgeNodes             []*EdgeNode
	dataAggregator        *DataAggregator
	loadBalancer          *LoadBalancer
	redundancyManager     *RedundancyManager
	geoOptimizer          *GeoOptimizer
	metrics              *MultiSourceMetrics
	mu                   sync.RWMutex
}

// MultiSourceConfig holds multi-source configuration
type MultiSourceConfig struct {
	// Edge node settings
	MaxConcurrentNodes   int           `json:"max_concurrent_nodes"`
	MinNodesRequired     int           `json:"min_nodes_required"`
	Timeout              time.Duration `json:"timeout"`
	RetryDelay           time.Duration `json:"retry_delay"`
	MaxRetries           int           `json:"max_retries"`
	
	// Data aggregation settings
	AggregationStrategy   string        `json:"aggregation_strategy"`   // "parallel", "sequential", "hybrid"
	ChunkSize            int64         `json:"chunk_size"`             // 1MB chunks
	MaxConcurrentChunks  int           `json:"max_concurrent_chunks"`
	BufferSize           int64         `json:"buffer_size"`            // 10MB buffer
	
	// Load balancing settings
	LoadBalancingStrategy string        `json:"load_balancing_strategy"` // "round_robin", "weighted", "least_connections", "geographic"
	HealthCheckInterval   time.Duration `json:"health_check_interval"`
	FailoverThreshold     float64       `json:"failover_threshold"`
	
	// Geographic settings
	EnableGeoOptimization bool          `json:"enable_geo_optimization"`
	PreferNearestNodes    bool          `json:"prefer_nearest_nodes"`
	MaxDistance           int           `json:"max_distance"`           // km
	
	// Redundancy settings
	EnableRedundancy      bool          `json:"enable_redundancy"`
	RedundancyFactor     int           `json:"redundancy_factor"`        // 2x redundancy
	DataVerification      bool          `json:"data_verification"`
	ChecksumValidation    bool          `json:"checksum_validation"`
}

// EdgeNode represents a Cloudflare R2 edge node
type EdgeNode struct {
	NodeID               string        `json:"node_id"`
	Name                 string        `json:"name"`
	Region               string        `json:"region"`
	Country              string        `json:"country"`
	City                 string        `json:"city"`
	Latitude             float64       `json:"latitude"`
	Longitude            float64       `json:"longitude"`
	Endpoint             string        `json:"endpoint"`
	AccessKey            string        `json:"access_key"`
	SecretKey            string        `json:"secret_key"`
	Bucket               string        `json:"bucket"`
	Priority             int           `json:"priority"`
	Weight                float64       `json:"weight"`
	IsActive              bool          `json:"is_active"`
	HealthStatus          string        `json:"health_status"`        // "healthy", "degraded", "unhealthy"
	ResponseTime          time.Duration `json:"response_time"`
	LastHealthCheck       time.Time     `json:"last_health_check"`
	ConnectionCount       int64         `json:"connection_count"`
	SuccessRate           float64       `json:"success_rate"`
	Bandwidth             int64         `json:"bandwidth"`             // Mbps
	mu                    sync.RWMutex
}

// DataAggregator aggregates data from multiple sources
type DataAggregator struct {
	strategy              string
	chunkSize             int64
	maxConcurrentChunks   int
	bufferSize            int64
	verificationEnabled   bool
	metrics              *AggregatorMetrics
	mu                    sync.RWMutex
}

// AggregatorMetrics tracks aggregation performance
type AggregatorMetrics struct {
	TotalAggregations    int64         `json:"total_aggregations"`
	SuccessfulAggregations int64        `json:"successful_aggregations"`
	FailedAggregations   int64         `json:"failed_aggregations"`
	AverageAggregationTime time.Duration `json:"average_aggregation_time"`
	DataIntegrityScore    float64       `json:"data_integrity_score"`
	RedundancyUtilization float64       `json:"redundancy_utilization"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// LoadBalancer manages load balancing across edge nodes
type LoadBalancer struct {
	strategy              string
	edgeNodes             []*EdgeNode
	currentIndex          int64
	healthChecker         *HealthChecker
	metrics              *LoadBalancerMetrics
	mu                    sync.RWMutex
}

// LoadBalancerMetrics tracks load balancing performance
type LoadBalancerMetrics struct {
	TotalRequests         int64         `json:"total_requests"`
	SuccessfulRequests    int64         `json:"successful_requests"`
	FailedRequests        int64         `json:"failed_requests"`
	AverageResponseTime   time.Duration `json:"average_response_time"`
	NodeUtilization       map[string]float64 `json:"node_utilization"`
	FailoverCount         int64         `json:"failover_count"`
	LoadDistributionScore  float64       `json:"load_distribution_score"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// HealthChecker checks health of edge nodes
type HealthChecker struct {
	interval             time.Duration
	timeout              time.Duration
	maxRetries           int
	healthThresholds     *HealthThresholds
	activeChecks         map[string]*HealthCheck
	metrics              *HealthCheckerMetrics
	mu                   sync.RWMutex
}

// HealthThresholds defines health check thresholds
type HealthThresholds {
	MaxResponseTime      time.Duration `json:"max_response_time"`
	MinSuccessRate        float64       `json:"min_success_rate"`
	MinBandwidth         int64         `json:"min_bandwidth"`
	MaxConnectionCount    int64         `json:"max_connection_count"`
}

// HealthCheck represents a health check result
type HealthCheck struct {
	NodeID               string        `json:"node_id"`
	Status               string        `json:"status"`                // "healthy", "degraded", "unhealthy"
	ResponseTime         time.Duration `json:"response_time"`
	SuccessRate          float64       `json:"success_rate"`
	Bandwidth            int64         `json:"bandwidth"`
	ConnectionCount      int64         `json:"connection_count"`
	ErrorMessage         string        `json:"error_message"`
	CheckTime            time.Time     `json:"check_time"`
	NextCheckTime         time.Time     `json:"next_check_time"`
}

// HealthCheckerMetrics tracks health checker performance
type HealthCheckerMetrics struct {
	TotalChecks           int64         `json:"total_checks"`
	PassedChecks          int64         `json:"passed_checks"`
	FailedChecks          int64         `json:"failed_checks"`
	AverageCheckTime      time.Duration `json:"average_check_time"`
	HealthyNodes          int64         `json:"healthy_nodes"`
	DegradedNodes         int64         `json:"degraded_nodes"`
	UnhealthyNodes        int64         `json:"unhealthy_nodes"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// RedundancyManager manages data redundancy
type RedundancyManager struct {
	redundancyFactor     int
	verificationEnabled   bool
	checksumValidation    bool
	dataValidator         *DataValidator
	metrics              *RedundancyMetrics
	mu                    sync.RWMutex
}

// DataValidator validates data integrity
type DataValidator struct {
	validationMethods     []string
	checksumAlgorithm     string
	validationThreshold   float64
	metrics              *ValidatorMetrics
	mu                    sync.RWMutex
}

// RedundancyMetrics tracks redundancy performance
type RedundancyMetrics struct {
	TotalValidations      int64         `json:"total_validations"`
	SuccessfulValidations int64        `json:"successful_validations"`
	FailedValidations     int64         `json:"failed_validations"`
	DataIntegrityScore    float64       `json:"data_integrity_score"`
	RedundancyCoverage     float64       `json:"redundancy_coverage"`
	ValidationTime        time.Duration `json:"validation_time"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// ValidatorMetrics tracks validator performance
type ValidatorMetrics struct {
	TotalValidations      int64         `json:"total_validations"`
	ChecksumValidations    int64         `json:"checksum_validations"`
	HashValidations       int64         `json:"hash_validations"`
	SignatureValidations   int64         `json:"signature_validations"`
	AverageValidationTime  time.Duration `json:"average_validation_time"`
	ValidationAccuracy     float64       `json:"validation_accuracy"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// GeoOptimizer optimizes geographic distribution
type GeoOptimizer struct {
	enableOptimization    bool
	preferNearestNodes    bool
	maxDistance           int
	clientLocation        *ClientLocation
	nodeDistances         map[string]float64
	metrics              *GeoOptimizerMetrics
	mu                    sync.RWMutex
}

// ClientLocation represents client location
type ClientLocation struct {
	IP                   string        `json:"ip"`
	Country              string        `json:"country"`
	Region               string        `json:"region"`
	City                 string        `json:"city"`
	Latitude             float64       `json:"latitude"`
	Longitude            float64       `json:"longitude"`
	ISP                  string        `json:"isp"`
	DetectedAt           time.Time     `json:"detected_at"`
}

// GeoOptimizerMetrics tracks geo optimization performance
type GeoOptimizerMetrics struct {
	TotalOptimizations    int64         `json:"total_optimizations"`
	NearestNodeSelections int64         `json:"nearest_node_selections"`
	AverageDistance       float64       `json:"average_distance"`       // km
	LatencyImprovement     float64       `json:"latency_improvement"`     // percentage
	OptimizationAccuracy   float64       `json:"optimization_accuracy"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// MultiSourceMetrics tracks multi-source performance
type MultiSourceMetrics struct {
	TotalRequests         int64         `json:"total_requests"`
	SuccessfulRequests    int64         `json:"successful_requests"`
	FailedRequests        int64         `json:"failed_requests"`
	AverageResponseTime   time.Duration `json:"average_response_time"`
	NodesUtilized         int64         `json:"nodes_utilized"`
	DataAggregationTime   time.Duration `json:"data_aggregation_time"`
	RedundancyScore       float64       `json:"redundancy_score"`
	GeoOptimizationScore  float64       `json:"geo_optimization_score"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// SourceData represents data from a single source
type SourceData struct {
	NodeID               string        `json:"node_id"`
	Data                 []byte        `json:"data"`
	Size                 int64         `json:"size"`
	Checksum             string        `json:"checksum"`
	FetchTime            time.Duration `json:"fetch_time"`
	TransferRate         float64       `json:"transfer_rate"`
	Success              bool          `json:"success"`
	ErrorMessage         string        `json:"error_message"`
	Retries              int           `json:"retries"`
	ReceivedAt           time.Time     `json:"received_at"`
}

// AggregatedData represents aggregated data from multiple sources
type AggregatedData struct {
	Data                 []byte        `json:"data"`
	Size                 int64         `json:"size"`
	Sources              []string      `json:"sources"`
	AggregationTime      time.Duration `json:"aggregation_time"`
	RedundancyScore      float64       `json:"redundancy_score"`
	IntegrityVerified     bool          `json:"integrity_verified"`
	ValidationTime       time.Duration `json:"validation_time"`
	NodesUsed            int           `json:"nodes_used"`
	TotalTransferRate    float64       `json:"total_transfer_rate"`
	AggregatedAt         time.Time     `json:"aggregated_at"`
}

// NewMultiSourceManager creates a new multi-source manager
func NewMultiSourceManager(config MultiSourceConfig) *MultiSourceManager {
	msm := &MultiSourceManager{
		config:            config,
		edgeNodes:         make([]*EdgeNode, 0),
		dataAggregator:    NewDataAggregator(config.AggregationStrategy, config.ChunkSize, config.MaxConcurrentChunks, config.BufferSize, config.DataVerification),
		loadBalancer:      NewLoadBalancer(config.LoadBalancingStrategy),
		redundancyManager: NewRedundancyManager(config.RedundancyFactor, config.DataVerification, config.ChecksumValidation),
		geoOptimizer:      NewGeoOptimizer(config.EnableGeoOptimization, config.PreferNearestNodes, config.MaxDistance),
		metrics:           NewMultiSourceMetrics(),
	}

	// Initialize edge nodes
	msm.initializeEdgeNodes()

	// Start background processes
	go msm.startHealthChecking()
	go msm.updateMetrics()

	return msm
}

// initializeEdgeNodes initializes Cloudflare R2 edge nodes
func (msm *MultiSourceManager) initializeEdgeNodes() {
	// Cloudflare R2 edge nodes (example configuration)
	edgeNodes := []*EdgeNode{
		{
			NodeID:    "r2-us-east-1",
			Name:      "US East - Ashburn",
			Region:    "us-east-1",
			Country:   "US",
			City:      "Ashburn",
			Latitude:  39.0438,
			Longitude: -77.4874,
			Endpoint:  "https://account-id.r2.cloudflarestorage.com",
			Bucket:    "video-bucket",
			Priority:  1,
			Weight:    1.0,
			IsActive:  true,
		},
		{
			NodeID:    "r2-us-west-1",
			Name:      "US West - San Francisco",
			Region:    "us-west-1",
			Country:   "US",
			City:      "San Francisco",
			Latitude:  37.7749,
			Longitude: -122.4194,
			Endpoint:  "https://account-id.r2.cloudflarestorage.com",
			Bucket:    "video-bucket",
			Priority:  2,
			Weight:    1.0,
			IsActive:  true,
		},
		{
			NodeID:    "r2-eu-west-1",
			Name:      "EU West - London",
			Region:    "eu-west-1",
			Country:   "UK",
			City:      "London",
			Latitude:  51.5074,
			Longitude: -0.1278,
			Endpoint:  "https://account-id.r2.cloudflarestorage.com",
			Bucket:    "video-bucket",
			Priority:  3,
			Weight:    1.0,
			IsActive:  true,
		},
		{
			NodeID:    "r2-ap-south-1",
			Name:      "Asia Pacific - Mumbai",
			Region:    "ap-south-1",
			Country:   "IN",
			City:      "Mumbai",
			Latitude:  19.0760,
			Longitude: 72.8777,
			Endpoint:  "https://account-id.r2.cloudflarestorage.com",
			Bucket:    "video-bucket",
			Priority:  4,
			Weight:    1.0,
			IsActive:  true,
		},
		{
			NodeID:    "r2-ap-southeast-1",
			Name:      "Asia Pacific - Singapore",
			Region:    "ap-southeast-1",
			Country:   "SG",
			City:      "Singapore",
			Latitude:  1.3521,
			Longitude: 103.8198,
			Endpoint:  "https://account-id.r2.cloudflarestorage.com",
			Bucket:    "video-bucket",
			Priority:  5,
			Weight:    1.0,
			IsActive:  true,
		},
	}

	msm.edgeNodes = edgeNodes
	msm.loadBalancer.edgeNodes = edgeNodes

	log.Printf("🌐 Initialized %d Cloudflare R2 edge nodes", len(edgeNodes))
}

// FetchFromMultipleSources fetches data from multiple edge nodes
func (msm *MultiSourceManager) FetchFromMultipleSources(ctx context.Context, videoKey string, clientLocation *ClientLocation) (*AggregatedData, error) {
	startTime := time.Now()

	log.Printf("🌐 Starting multi-source fetch for video %s", videoKey)

	// Select optimal edge nodes
	selectedNodes := msm.selectOptimalNodes(clientLocation)
	if len(selectedNodes) < msm.config.MinNodesRequired {
		return nil, fmt.Errorf("insufficient healthy edge nodes: got %d, required %d", len(selectedNodes), msm.config.MinNodesRequired)
	}

	log.Printf("🎯 Selected %d edge nodes: %v", len(selectedNodes), msm.getNodeIDs(selectedNodes))

	// Fetch data from multiple sources
	sourceDataChan := make(chan *SourceData, len(selectedNodes))
	var wg sync.WaitGroup

	for _, node := range selectedNodes {
		wg.Add(1)
		go func(edgeNode *EdgeNode) {
			defer wg.Done()
			sourceData := msm.fetchFromNode(ctx, edgeNode, videoKey)
			sourceDataChan <- sourceData
		}(node)
	}

	// Wait for all fetches to complete
	go func() {
		wg.Wait()
		close(sourceDataChan)
	}()

	// Collect source data
	var sourceDataList []*SourceData
	for sourceData := range sourceDataChan {
		sourceDataList = append(sourceDataList, sourceData)
	}

	// Aggregate data
	aggregatedData, err := msm.dataAggregator.AggregateData(sourceDataList)
	if err != nil {
		return nil, fmt.Errorf("data aggregation failed: %w", err)
	}

	// Apply redundancy verification
	if msm.config.EnableRedundancy {
		verifiedData, err := msm.redundancyManager.VerifyRedundancy(aggregatedData, sourceDataList)
		if err != nil {
			log.Printf("⚠️ Redundancy verification failed: %v", err)
		} else {
			aggregatedData = verifiedData
		}
	}

	processingTime := time.Since(startTime)
	aggregatedData.AggregationTime = processingTime
	aggregatedData.AggregatedAt = time.Now()

	// Update metrics
	msm.updateMultiSourceMetrics(len(selectedNodes), processingTime, aggregatedData.Size, true)

	log.Printf("🔥 Multi-source fetch completed: %v, %d bytes, %d sources, %.2f MB/s", 
		processingTime, aggregatedData.Size, len(sourceDataList), aggregatedData.TotalTransferRate)

	return aggregatedData, nil
}

// selectOptimalNodes selects optimal edge nodes based on strategy
func (msm *MultiSourceManager) selectOptimalNodes(clientLocation *ClientLocation) []*EdgeNode {
	msm.mu.RLock()
	defer msm.mu.RUnlock()

	// Filter healthy nodes
	var healthyNodes []*EdgeNode
	for _, node := range msm.edgeNodes {
		if node.IsActive && node.HealthStatus == "healthy" {
			healthyNodes = append(healthyNodes, node)
		}
	}

	// Apply geographic optimization if enabled
	if msm.config.EnableGeoOptimization && clientLocation != nil {
		healthyNodes = msm.geoOptimizer.SortByDistance(healthyNodes, clientLocation)
	}

	// Apply load balancing
	selectedNodes := msm.loadBalancer.SelectNodes(healthyNodes, msm.config.MaxConcurrentNodes)

	return selectedNodes
}

// fetchFromNode fetches data from a single edge node
func (msm *MultiSourceManager) fetchFromNode(ctx context.Context, node *EdgeNode, videoKey string) *SourceData {
	startTime := time.Now()

	sourceData := &SourceData{
		NodeID:    node.NodeID,
		Success:   false,
		ReceivedAt: time.Now(),
	}

	// Create HTTP request
	url := fmt.Sprintf("%s/%s", node.Endpoint, videoKey)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		sourceData.ErrorMessage = fmt.Sprintf("failed to create request: %v", err)
		return sourceData
	}

	// Set headers
	req.Header.Set("User-Agent", "Kronop-MultiSource/1.0")
	req.Header.Set("Accept", "application/octet-stream")

	// Make request with retries
	var resp *http.Response
	var lastError error

	for attempt := 0; attempt <= msm.config.MaxRetries; attempt++ {
		if attempt > 0 {
			time.Sleep(msm.config.RetryDelay * time.Duration(attempt))
		}

		client := &http.Client{
			Timeout: msm.config.Timeout,
		}

		resp, lastError = client.Do(req)
		if lastError == nil && resp.StatusCode == http.StatusOK {
			break
		}

		sourceData.Retries = attempt + 1
	}

	if lastError != nil {
		sourceData.ErrorMessage = fmt.Sprintf("request failed after %d attempts: %v", sourceData.Retries, lastError)
		return sourceData
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		sourceData.ErrorMessage = fmt.Sprintf("HTTP error: %s", resp.Status)
		return sourceData
	}

	// Read data
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		sourceData.ErrorMessage = fmt.Sprintf("failed to read response: %v", err)
		return sourceData
	}

	// Calculate checksum
	checksum := msm.calculateChecksum(data)

	// Update source data
	fetchTime := time.Since(startTime)
	sourceData.Data = data
	sourceData.Size = int64(len(data))
	sourceData.Checksum = checksum
	sourceData.FetchTime = fetchTime
	sourceData.TransferRate = float64(len(data)) / fetchTime.Seconds() / (1024 * 1024) // MB/s
	sourceData.Success = true

	// Update node metrics
	node.mu.Lock()
	node.ConnectionCount++
	node.ResponseTime = fetchTime
	node.mu.Unlock()

	log.Printf("📦 Node %s fetched %d bytes in %v (%.2f MB/s)", 
		node.NodeID, sourceData.Size, fetchTime, sourceData.TransferRate)

	return sourceData
}

// calculateChecksum calculates checksum for data
func (msm *MultiSourceManager) calculateChecksum(data []byte) string {
	// Simple checksum calculation (in production, use SHA-256)
	var sum uint32
	for _, b := range data {
		sum += uint32(b)
	}
	return fmt.Sprintf("%x", sum)
}

// getNodeIDs gets node IDs from node list
func (msm *MultiSourceManager) getNodeIDs(nodes []*EdgeNode) []string {
	ids := make([]string, len(nodes))
	for i, node := range nodes {
		ids[i] = node.NodeID
	}
	return ids
}

// updateMultiSourceMetrics updates multi-source metrics
func (msm *MultiSourceManager) updateMultiSourceMetrics(nodesUsed int, processingTime time.Duration, dataSize int64, success bool) {
	msm.metrics.mu.Lock()
	defer msm.metrics.mu.Unlock()

	msm.metrics.TotalRequests++
	
	if success {
		msm.metrics.SuccessfulRequests++
	} else {
		msm.metrics.FailedRequests++
	}

	// Update average response time
	if msm.metrics.AverageResponseTime == 0 {
		msm.metrics.AverageResponseTime = processingTime
	} else {
		msm.metrics.AverageResponseTime = (msm.metrics.AverageResponseTime + processingTime) / 2
	}

	// Update nodes utilized
	msm.metrics.NodesUtilized += int64(nodesUsed)

	// Update data aggregation time
	if msm.metrics.DataAggregationTime == 0 {
		msm.metrics.DataAggregationTime = processingTime
	} else {
		msm.metrics.DataAggregationTime = (msm.metrics.DataAggregationTime + processingTime) / 2
	}

	msm.metrics.LastUpdated = time.Now()
}

// startHealthChecking starts health checking for edge nodes
func (msm *MultiSourceManager) startHealthChecking() {
	ticker := time.NewTicker(msm.config.HealthCheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			msm.performHealthChecks()
		}
	}
}

// performHealthChecks performs health checks on all edge nodes
func (msm *MultiSourceManager) performHealthChecks() {
	var wg sync.WaitGroup

	for _, node := range msm.edgeNodes {
		wg.Add(1)
		go func(edgeNode *EdgeNode) {
			defer wg.Done()
			msm.checkNodeHealth(edgeNode)
		}(node)
	}

	wg.Wait()
}

// checkNodeHealth checks health of a single edge node
func (msm *MultiSourceManager) checkNodeHealth(node *EdgeNode) {
	startTime := time.Now()

	// Simple health check (in production, implement proper health check)
	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	req, err := http.NewRequest("GET", node.Endpoint+"/health", nil)
	if err != nil {
		node.mu.Lock()
		node.HealthStatus = "unhealthy"
		node.LastHealthCheck = time.Now()
		node.mu.Unlock()
		return
	}

	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		node.mu.Lock()
		node.HealthStatus = "degraded"
		node.LastHealthCheck = time.Now()
		node.mu.Unlock()
		return
	}
	defer resp.Body.Close()

	responseTime := time.Since(startTime)

	node.mu.Lock()
	node.HealthStatus = "healthy"
	node.ResponseTime = responseTime
	node.LastHealthCheck = time.Now()
	node.mu.Unlock()

	log.Printf("🏥 Node %s health check: %s (%v)", node.NodeID, node.HealthStatus, responseTime)
}

// updateMetrics updates metrics periodically
func (msm *MultiSourceManager) updateMetrics() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			msm.calculateMetrics()
		}
	}
}

// calculateMetrics calculates aggregated metrics
func (msm *MultiSourceManager) calculateMetrics() {
	// Update metrics from all components
	aggregatorMetrics := msm.dataAggregator.GetMetrics()
	loadBalancerMetrics := msm.loadBalancer.GetMetrics()
	redundancyMetrics := msm.redundancyManager.GetMetrics()
	geoMetrics := msm.geoOptimizer.GetMetrics()

	msm.metrics.mu.Lock()
	defer msm.metrics.mu.Unlock()

	// Calculate redundancy score
	msm.metrics.RedundancyScore = redundancyMetrics.DataIntegrityScore

	// Calculate geo optimization score
	msm.metrics.GeoOptimizationScore = geoMetrics.OptimizationAccuracy

	msm.metrics.LastUpdated = time.Now()
}

// GetMetrics returns multi-source metrics
func (msm *MultiSourceManager) GetMetrics() *MultiSourceMetrics {
	msm.metrics.mu.RLock()
	defer msm.metrics.mu.RUnlock()
	
	metrics := *msm.metrics
	return &metrics
}

// GetEdgeNodes returns edge node information
func (msm *MultiSourceManager) GetEdgeNodes() []*EdgeNode {
	msm.mu.RLock()
	defer msm.mu.RUnlock()

	nodes := make([]*EdgeNode, len(msm.edgeNodes))
	for i, node := range msm.edgeNodes {
		node.mu.RLock()
		nodes[i] = &EdgeNode{
			NodeID:        node.NodeID,
			Name:          node.Name,
			Region:        node.Region,
			Country:       node.Country,
			City:          node.City,
			Latitude:      node.Latitude,
			Longitude:     node.Longitude,
			Endpoint:      node.Endpoint,
			Bucket:        node.Bucket,
			Priority:      node.Priority,
			Weight:        node.Weight,
			IsActive:      node.IsActive,
			HealthStatus:  node.HealthStatus,
			ResponseTime:  node.ResponseTime,
			LastHealthCheck: node.LastHealthCheck,
			ConnectionCount: node.ConnectionCount,
			SuccessRate:   node.SuccessRate,
			Bandwidth:     node.Bandwidth,
		}
		node.mu.RUnlock()
	}

	return nodes
}

// Close closes the multi-source manager
func (msm *MultiSourceManager) Close() error {
	log.Println("🔌 Multi-source manager closed")
	return nil
}

// Helper functions

func NewMultiSourceMetrics() *MultiSourceMetrics {
	return &MultiSourceMetrics{
		CreatedAt: time.Now(),
	}
}

func NewDataAggregator(strategy string, chunkSize int64, maxConcurrentChunks int, bufferSize int64, verificationEnabled bool) *DataAggregator {
	return &DataAggregator{
		strategy:            strategy,
		chunkSize:           chunkSize,
		maxConcurrentChunks:  maxConcurrentChunks,
		bufferSize:          bufferSize,
		verificationEnabled:  verificationEnabled,
		metrics:            &AggregatorMetrics{CreatedAt: time.Now()},
	}
}

func NewLoadBalancer(strategy string) *LoadBalancer {
	return &LoadBalancer{
		strategy:      strategy,
		healthChecker: NewHealthChecker(30*time.Second, 5*time.Second, 3, &HealthThresholds{
			MaxResponseTime:   5 * time.Second,
			MinSuccessRate:     0.95,
			MinBandwidth:       100, // 100 Mbps
			MaxConnectionCount: 1000,
		}),
		metrics:      &LoadBalancerMetrics{CreatedAt: time.Now()},
	}
}

func NewRedundancyManager(redundancyFactor int, verificationEnabled, checksumValidation bool) *RedundancyManager {
	return &RedundancyManager{
		redundancyFactor:    redundancyFactor,
		verificationEnabled:  verificationEnabled,
		checksumValidation:   checksumValidation,
		dataValidator:       NewDataValidator([]string{"checksum", "hash"}, "sha256", 0.95),
		metrics:            &RedundancyMetrics{CreatedAt: time.Now()},
	}
}

func NewGeoOptimizer(enableOptimization, preferNearestNodes bool, maxDistance int) *GeoOptimizer {
	return &GeoOptimizer{
		enableOptimization: enableOptimization,
		preferNearestNodes:  preferNearestNodes,
		maxDistance:         maxDistance,
		nodeDistances:      make(map[string]float64),
		metrics:            &GeoOptimizerMetrics{CreatedAt: time.Now()},
	}
}

func NewHealthChecker(interval, timeout time.Duration, maxRetries int, thresholds *HealthThresholds) *HealthChecker {
	return &HealthChecker{
		interval:         interval,
		timeout:          timeout,
		maxRetries:       maxRetries,
		healthThresholds: thresholds,
		activeChecks:     make(map[string]*HealthCheck),
		metrics:          &HealthCheckerMetrics{CreatedAt: time.Now()},
	}
}

func NewDataValidator(methods []string, algorithm string, threshold float64) *DataValidator {
	return &DataValidator{
		validationMethods:   methods,
		checksumAlgorithm:   algorithm,
		validationThreshold: threshold,
		metrics:            &ValidatorMetrics{CreatedAt: time.Now()},
	}
}
