/**
 * Geo Optimizer - Geographic Optimization for Edge Nodes
 * 
 * Optimizes edge node selection based on geographic location
 * Calculates distances between clients and edge nodes
 * Provides nearest node selection
 * 
 * Features:
 * - Geographic distance calculation
 * - Nearest node selection
 * - Latency optimization
 * - Regional load balancing
 */

package streaming

import (
	"fmt"
	"log"
	"math"
	"sort"
	"sync"
	"time"
)

// SortByDistance sorts edge nodes by distance from client location
func (go *GeoOptimizer) SortByDistance(nodes []*EdgeNode, clientLocation *ClientLocation) []*EdgeNode {
	if !go.enableOptimization || clientLocation == nil {
		return nodes
	}

	// Calculate distances for all nodes
	nodeDistances := make([]NodeDistance, 0, len(nodes))

	for _, node := range nodes {
		distance := go.calculateDistance(clientLocation, node)
		nodeDistances = append(nodeDistances, NodeDistance{
			Node:     node,
			Distance: distance,
		})

		// Store distance for metrics
		go.mu.Lock()
		go.nodeDistances[node.NodeID] = distance
		go.mu.Unlock()
	}

	// Sort by distance (ascending)
	sort.Slice(nodeDistances, func(i, j int) bool {
		return nodeDistances[i].Distance < nodeDistances[j].Distance
	})

	// Convert back to node list
	sortedNodes := make([]*EdgeNode, len(nodeDistances))
	for i, nd := range nodeDistances {
		sortedNodes[i] = nd.Node
	}

	// Update metrics
	go.updateGeoOptimizerMetrics(len(nodes), clientLocation)

	log.Printf("🌍 Sorted %d nodes by distance from client (%s, %s)", 
		len(sortedNodes), clientLocation.Country, clientLocation.City)

	return sortedNodes
}

// NodeDistance represents distance between client and node
type NodeDistance struct {
	Node     *EdgeNode
	Distance float64 // km
}

// calculateDistance calculates distance between client and edge node
func (go *GeoOptimizer) calculateDistance(clientLocation *ClientLocation, node *EdgeNode) float64 {
	// Haversine formula for calculating distance between two points on Earth
	const earthRadiusKm = 6371.0

	// Convert to radians
	clientLatRad := clientLocation.Latitude * math.Pi / 180
	clientLonRad := clientLocation.Longitude * math.Pi / 180
	nodeLatRad := node.Latitude * math.Pi / 180
	nodeLonRad := node.Longitude * math.Pi / 180

	// Calculate differences
	deltaLat := nodeLatRad - clientLatRad
	deltaLon := nodeLonRad - clientLonRad

	// Haversine formula
	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(clientLatRad)*math.Cos(nodeLatRad)*
		math.Sin(deltaLon/2)*math.Sin(deltaLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	distance := earthRadiusKm * c

	return distance
}

// GetNearestNodes returns nearest nodes to client location
func (go *GeoOptimizer) GetNearestNodes(nodes []*EdgeNode, clientLocation *ClientLocation, maxNodes int) []*EdgeNode {
	if !go.enableOptimization || clientLocation == nil {
		return nodes[:min(maxNodes, len(nodes))]
	}

	// Sort by distance
	sortedNodes := go.SortByDistance(nodes, clientLocation)

	// Filter by max distance if specified
	if go.maxDistance > 0 {
		nearestNodes := make([]*EdgeNode, 0)
		for _, node := range sortedNodes {
			distance := go.calculateDistance(clientLocation, node)
			if distance <= float64(go.maxDistance) {
				nearestNodes = append(nearestNodes, node)
			}
		}

		// Return nearest nodes within distance limit
		if len(nearestNodes) > 0 {
			return nearestNodes[:min(maxNodes, len(nearestNodes))]
		}
	}

	// Return nearest nodes
	return sortedNodes[:min(maxNodes, len(sortedNodes))]
}

// OptimizeForRegion optimizes node selection for a specific region
func (go *GeoOptimizer) OptimizeForRegion(nodes []*EdgeNode, region string) []*EdgeNode {
	if !go.enableOptimization {
		return nodes
	}

	// Filter nodes by region
	regionNodes := make([]*EdgeNode, 0)
	for _, node := range nodes {
		if node.Region == region || node.Country == region {
			regionNodes = append(regionNodes, node)
		}
	}

	// If no nodes found in region, return all nodes
	if len(regionNodes) == 0 {
		log.Printf("⚠️ No nodes found in region %s, using all nodes", region)
		return nodes
	}

	// Sort by priority within region
	sort.Slice(regionNodes, func(i, j int) bool {
		return regionNodes[i].Priority < regionNodes[j].Priority
	})

	log.Printf("🌍 Optimized %d nodes for region %s", len(regionNodes), region)

	return regionNodes
}

// EstimateLatency estimates latency based on geographic distance
func (go *GeoOptimizer) EstimateLatency(clientLocation *ClientLocation, node *EdgeNode) time.Duration {
	if !go.enableOptimization || clientLocation == nil {
		return 100 * time.Millisecond // Default estimate
	}

	distance := go.calculateDistance(clientLocation, node)

	// Rough latency estimation: 1ms per 100km + base latency
	baseLatency := 10 * time.Millisecond
	distanceLatency := time.Duration(distance/100) * time.Millisecond

	estimatedLatency := baseLatency + distanceLatency

	return estimatedLatency
}

// GetOptimalRegion determines optimal region for client
func (go *GeoOptimizer) GetOptimalRegion(clientLocation *ClientLocation, nodes []*EdgeNode) string {
	if !go.enableOptimization || clientLocation == nil {
		return "global"
	}

	// Count nodes by region
	regionCounts := make(map[string]int)
	regionDistances := make(map[string]float64)

	for _, node := range nodes {
		distance := go.calculateDistance(clientLocation, node)
		
		// Update region counts
		regionCounts[node.Region]++
		
		// Update region distances (use minimum distance)
		if currentDist, exists := regionDistances[node.Region]; !exists || distance < currentDist {
			regionDistances[node.Region] = distance
		}
	}

	// Find optimal region (closest region with available nodes)
	optimalRegion := "global"
	minDistance := math.MaxFloat64

	for region, count := range regionCounts {
		if count > 0 {
			distance := regionDistances[region]
			if distance < minDistance {
				minDistance = distance
				optimalRegion = region
			}
		}
	}

	log.Printf("🌍 Optimal region for client: %s (distance: %.1f km)", optimalRegion, minDistance)

	return optimalRegion
}

// DetectClientLocation detects client location from IP address
func (go *GeoOptimizer) DetectClientLocation(ipAddress string) *ClientLocation {
	// In production, this would use a GeoIP service
	// For demo, return a mock location based on IP patterns

	location := &ClientLocation{
		IP:         ipAddress,
		DetectedAt: time.Now(),
	}

	// Mock IP-based location detection
	switch {
	case len(ipAddress) > 0 && ipAddress[0] == '8':
		// US East Coast
		location.Country = "US"
		location.Region = "us-east-1"
		location.City = "New York"
		location.Latitude = 40.7128
		location.Longitude = -74.0060
		location.ISP = "Cloudflare"
	case len(ipAddress) > 0 && ipAddress[0] == '1':
		// US West Coast
		location.Country = "US"
		location.Region = "us-west-1"
		location.City = "San Francisco"
		location.Latitude = 37.7749
		location.Longitude = -122.4194
		location.ISP = "Cloudflare"
	case len(ipAddress) > 0 && ipAddress[0] == '5':
		// Europe
		location.Country = "UK"
		location.Region = "eu-west-1"
		location.City = "London"
		location.Latitude = 51.5074
		location.Longitude = -0.1278
		location.ISP = "Cloudflare"
	default:
		// Default location
		location.Country = "US"
		location.Region = "us-east-1"
		location.City = "Ashburn"
		location.Latitude = 39.0438
		location.Longitude = -77.4874
		location.ISP = "Cloudflare"
	}

	log.Printf("🌍 Detected client location: %s, %s, %s (%.4f, %.4f)", 
		location.Country, location.Region, location.City, location.Latitude, location.Longitude)

	return location
}

// updateGeoOptimizerMetrics updates geo optimizer metrics
func (go *GeoOptimizer) updateGeoOptimizerMetrics(nodeCount int, clientLocation *ClientLocation) {
	go.metrics.mu.Lock()
	defer go.metrics.mu.Unlock()

	go.metrics.TotalOptimizations++

	// Calculate average distance
	if len(go.nodeDistances) > 0 {
		var totalDistance float64
		for _, distance := range go.nodeDistances {
			totalDistance += distance
		}
		go.metrics.AverageDistance = totalDistance / float64(len(go.nodeDistances))
	}

	// Update nearest node selections
	if go.preferNearestNodes {
		go.metrics.NearestNodeSelections++
	}

	// Calculate optimization accuracy (mock implementation)
	go.metrics.OptimizationAccuracy = 0.95 // High accuracy for demo

	go.metrics.LastUpdated = time.Now()
}

// GetMetrics returns geo optimizer metrics
func (go *GeoOptimizer) GetMetrics() *GeoOptimizerMetrics {
	go.metrics.mu.RLock()
	defer go.metrics.mu.RUnlock()
	
	metrics := *go.metrics
	return &metrics
}

// GetNodeDistances returns node distances
func (go *GeoOptimizer) GetNodeDistances() map[string]float64 {
	go.mu.RLock()
	defer go.mu.RUnlock()
	
	distances := make(map[string]float64)
	for k, v := range go.nodeDistances {
		distances[k] = v
	}
	
	return distances
}

// SetClientLocation sets client location
func (go *GeoOptimizer) SetClientLocation(clientLocation *ClientLocation) {
	go.mu.Lock()
	defer go.mu.Unlock()
	
	go.clientLocation = clientLocation
	log.Printf("🌍 Client location set: %s, %s, %s", 
		clientLocation.Country, clientLocation.Region, clientLocation.City)
}

// GetClientLocation returns current client location
func (go *GeoOptimizer) GetClientLocation() *ClientLocation {
	go.mu.RLock()
	defer go.mu.RUnlock()
	
	if go.clientLocation == nil {
		return nil
	}
	
	// Return a copy to avoid race conditions
	location := *go.clientLocation
	return &location
}

// CalculateCoverage calculates geographic coverage
func (go *GeoOptimizer) CalculateCoverage(nodes []*EdgeNode) *CoverageAnalysis {
	if len(nodes) == 0 {
		return &CoverageAnalysis{
			TotalNodes:      0,
			UniqueRegions:   0,
			UniqueCountries: 0,
			MaxDistance:     0,
			AverageDistance: 0,
			CoverageScore:   0,
		}
	}

	// Analyze node distribution
	regions := make(map[string]bool)
	countries := make(map[string]bool)
	distances := make([]float64, 0)

	for _, node := range nodes {
		regions[node.Region] = true
		countries[node.Country] = true
	}

	// Calculate pairwise distances (simplified)
	maxDistance := 0.0
	totalDistance := 0.0
	pairCount := 0

	for i, node1 := range nodes {
		for j, node2 := range nodes {
			if i < j {
				distance := go.calculateDistance(&ClientLocation{
					Latitude:  node1.Latitude,
					Longitude: node1.Longitude,
				}, node2)
				
				distances = append(distances, distance)
				totalDistance += distance
				pairCount++
				
				if distance > maxDistance {
					maxDistance = distance
				}
			}
		}
	}

	averageDistance := 0.0
	if pairCount > 0 {
		averageDistance = totalDistance / float64(pairCount)
	}

	// Calculate coverage score
	coverageScore := float64(len(regions)) / 10.0 // Normalize by expected regions
	coverageScore = math.Min(1.0, coverageScore)

	analysis := &CoverageAnalysis{
		TotalNodes:      len(nodes),
		UniqueRegions:   len(regions),
		UniqueCountries: len(countries),
		MaxDistance:     maxDistance,
		AverageDistance: averageDistance,
		CoverageScore:   coverageScore,
		Regions:         getMapKeys(regions),
		Countries:       getMapKeys(countries),
		AnalyzedAt:      time.Now(),
	}

	log.Printf("🌍 Coverage analysis: %d nodes, %d regions, %d countries, coverage: %.2f", 
		analysis.TotalNodes, analysis.UniqueRegions, analysis.UniqueCountries, analysis.CoverageScore)

	return analysis
}

// CoverageAnalysis represents geographic coverage analysis
type CoverageAnalysis struct {
	TotalNodes      int       `json:"total_nodes"`
	UniqueRegions   int       `json:"unique_regions"`
	UniqueCountries int       `json:"unique_countries"`
	MaxDistance     float64   `json:"max_distance"`     // km
	AverageDistance float64   `json:"average_distance"` // km
	CoverageScore   float64   `json:"coverage_score"`   // 0.0 to 1.0
	Regions         []string  `json:"regions"`
	Countries       []string  `json:"countries"`
	AnalyzedAt      time.Time `json:"analyzed_at"`
}

// Helper functions

func getMapKeys(m map[string]bool) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

// Close closes the geo optimizer
func (go *GeoOptimizer) Close() error {
	log.Println("🔌 Geo optimizer closed")
	return nil
}
