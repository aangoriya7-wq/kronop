/**
 * Load Balancer - Edge Node Load Balancing
 * 
 * Implements multiple load balancing strategies for edge nodes
 * Provides health-aware node selection
 * Optimizes resource utilization
 * 
 * Features:
 * - Round-robin load balancing
 * - Weighted load balancing
 * - Least connections load balancing
 * - Geographic load balancing
 */

package streaming

import (
	"fmt"
	"log"
	"math"
	"math/rand"
	"sort"
	"sync"
	"sync/atomic"
	"time"
)

// SelectNodes selects optimal nodes based on load balancing strategy
func (lb *LoadBalancer) SelectNodes(nodes []*EdgeNode, maxNodes int) []*EdgeNode {
	lb.mu.RLock()
	defer lb.mu.RUnlock()

	// Filter healthy nodes
	healthyNodes := make([]*EdgeNode, 0)
	for _, node := range nodes {
		if node.IsActive && node.HealthStatus == "healthy" {
			healthyNodes = append(healthyNodes, node)
		}
	}

	if len(healthyNodes) == 0 {
		log.Printf("⚠️ No healthy nodes available")
		return []*EdgeNode{}
	}

	// Apply load balancing strategy
	var selectedNodes []*EdgeNode

	switch lb.strategy {
	case "round_robin":
		selectedNodes = lb.roundRobinSelection(healthyNodes, maxNodes)
	case "weighted":
		selectedNodes = lb.weightedSelection(healthyNodes, maxNodes)
	case "least_connections":
		selectedNodes = lb.leastConnectionsSelection(healthyNodes, maxNodes)
	case "geographic":
		selectedNodes = lb.geographicSelection(healthyNodes, maxNodes)
	default:
		selectedNodes = lb.roundRobinSelection(healthyNodes, maxNodes)
	}

	// Update metrics
	lb.updateLoadBalancerMetrics(len(nodes), len(selectedNodes))

	log.Printf("🎯 Load balancer selected %d nodes using %s strategy", len(selectedNodes), lb.strategy)

	return selectedNodes
}

// roundRobinSelection implements round-robin selection
func (lb *LoadBalancer) roundRobinSelection(nodes []*EdgeNode, maxNodes int) []*EdgeNode {
	if len(nodes) == 0 {
		return []*EdgeNode{}
	}

	selectedNodes := make([]*EdgeNode, 0)
	nodeCount := len(nodes)

	for i := 0; i < maxNodes && i < nodeCount; i++ {
		// Get next node index
		index := int(atomic.AddInt64(&lb.currentIndex, 1)) % nodeCount
		selectedNodes = append(selectedNodes, nodes[index])
	}

	return selectedNodes
}

// weightedSelection implements weighted selection
func (lb *LoadBalancer) weightedSelection(nodes []*EdgeNode, maxNodes int) []*EdgeNode {
	if len(nodes) == 0 {
		return []*EdgeNode{}
	}

	// Calculate total weight
	totalWeight := 0.0
	for _, node := range nodes {
		totalWeight += node.Weight
	}

	if totalWeight == 0 {
		// Fallback to round-robin if no weights
		return lb.roundRobinSelection(nodes, maxNodes)
	}

	selectedNodes := make([]*EdgeNode, 0)
	usedIndices := make(map[int]bool)

	for i := 0; i < maxNodes && len(selectedNodes) < len(nodes); i++ {
		// Generate random weight
		randomWeight := rand.Float64() * totalWeight

		// Find node based on weight
		currentWeight := 0.0
		for j, node := range nodes {
			if usedIndices[j] {
				continue
			}

			currentWeight += node.Weight
			if randomWeight <= currentWeight {
				selectedNodes = append(selectedNodes, node)
				usedIndices[j] = true
				break
			}
		}
	}

	return selectedNodes
}

// leastConnectionsSelection implements least connections selection
func (lb *LoadBalancer) leastConnectionsSelection(nodes []*EdgeNode, maxNodes int) []*EdgeNode {
	if len(nodes) == 0 {
		return []*EdgeNode{}
	}

	// Sort nodes by connection count (ascending)
	sortedNodes := make([]*EdgeNode, len(nodes))
	copy(sortedNodes, nodes)

	sort.Slice(sortedNodes, func(i, j int) bool {
		return sortedNodes[i].ConnectionCount < sortedNodes[j].ConnectionCount
	})

	// Select nodes with least connections
	selectedCount := min(maxNodes, len(sortedNodes))
	return sortedNodes[:selectedCount]
}

// geographicSelection implements geographic selection
func (lb *LoadBalancer) geographicSelection(nodes []*EdgeNode, maxNodes int) []*EdgeNode {
	if len(nodes) == 0 {
		return []*EdgeNode{}
	}

	// For now, use priority-based geographic selection
	// In production, this would consider client location
	sortedNodes := make([]*EdgeNode, len(nodes))
	copy(sortedNodes, nodes)

	sort.Slice(sortedNodes, func(i, j int) bool {
		return sortedNodes[i].Priority < sortedNodes[j].Priority
	})

	// Select nodes by priority
	selectedCount := min(maxNodes, len(sortedNodes))
	return sortedNodes[:selectedCount]
}

// updateLoadBalancerMetrics updates load balancer metrics
func (lb *LoadBalancer) updateLoadBalancerMetrics(totalNodes, selectedNodes int) {
	lb.metrics.mu.Lock()
	defer lb.metrics.mu.Unlock()

	lb.metrics.TotalRequests++

	if selectedNodes > 0 {
		lb.metrics.SuccessfulRequests++
	} else {
		lb.metrics.FailedRequests++
	}

	// Calculate node utilization
	nodeUtilization := make(map[string]float64)
	for _, node := range lb.edgeNodes {
		node.mu.RLock()
		utilization := float64(node.ConnectionCount) / 1000.0 // Normalize to 0-1
		nodeUtilization[node.NodeID] = math.Min(1.0, utilization)
		node.mu.RUnlock()
	}

	lb.metrics.NodeUtilization = nodeUtilization

	// Calculate load distribution score
	if len(nodeUtilization) > 0 {
		var totalUtilization float64
		var utilizationVariance float64

		// Calculate mean utilization
		for _, utilization := range nodeUtilization {
			totalUtilization += utilization
		}
		meanUtilization := totalUtilization / float64(len(nodeUtilization))

		// Calculate variance
		for _, utilization := range nodeUtilization {
			diff := utilization - meanUtilization
			utilizationVariance += diff * diff
		}
		utilizationVariance /= float64(len(nodeUtilization))

		// Calculate distribution score (lower variance = higher score)
		lb.metrics.LoadDistributionScore = math.Max(0, 1.0-utilizationVariance)
	}

	lb.metrics.LastUpdated = time.Now()
}

// GetNodeUtilization returns node utilization metrics
func (lb *LoadBalancer) GetNodeUtilization() map[string]float64 {
	lb.metrics.mu.RLock()
	defer lb.metrics.mu.RUnlock()

	utilization := make(map[string]float64)
	for k, v := range lb.metrics.NodeUtilization {
		utilization[k] = v
	}

	return utilization
}

// GetMetrics returns load balancer metrics
func (lb *LoadBalancer) GetMetrics() *LoadBalancerMetrics {
	lb.metrics.mu.RLock()
	defer lb.metrics.mu.RUnlock()
	
	metrics := *lb.metrics
	return &metrics
}

// SetStrategy sets load balancing strategy
func (lb *LoadBalancer) SetStrategy(strategy string) {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	
	lb.strategy = strategy
	log.Printf("🔄 Load balancing strategy changed to: %s", strategy)
}

// GetStrategy returns current load balancing strategy
func (lb *LoadBalancer) GetStrategy() string {
	lb.mu.RLock()
	defer lb.mu.mu.RUnlock()
	
	return lb.strategy
}

// AddNode adds a new edge node
func (lb *LoadBalancer) AddNode(node *EdgeNode) {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	
	lb.edgeNodes = append(lb.edgeNodes, node)
	log.Printf("➕ Added edge node: %s", node.NodeID)
}

// RemoveNode removes an edge node
func (lb *LoadBalancer) RemoveNode(nodeID string) {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	
	for i, node := range lb.edgeNodes {
		if node.NodeID == nodeID {
			lb.edgeNodes = append(lb.edgeNodes[:i], lb.edgeNodes[i+1:]...)
			log.Printf("➖ Removed edge node: %s", nodeID)
			break
		}
	}
}

// GetHealthyNodes returns healthy edge nodes
func (lb *LoadBalancer) GetHealthyNodes() []*EdgeNode {
	lb.mu.RLock()
	defer lb.mu.RUnlock()
	
	healthyNodes := make([]*EdgeNode, 0)
	for _, node := range lb.edgeNodes {
		if node.IsActive && node.HealthStatus == "healthy" {
			healthyNodes = append(healthyNodes, node)
		}
	}
	
	return healthyNodes
}

// GetNodeByID returns node by ID
func (lb *LoadBalancer) GetNodeByID(nodeID string) *EdgeNode {
	lb.mu.RLock()
	defer lb.mu.RUnlock()
	
	for _, node := range lb.edgeNodes {
		if node.NodeID == nodeID {
			return node
		}
	}
	
	return nil
}

// UpdateNodeWeight updates node weight
func (lb *LoadBalancer) UpdateNodeWeight(nodeID string, weight float64) {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	
	for _, node := range lb.edgeNodes {
		if node.NodeID == nodeID {
			node.mu.Lock()
			node.Weight = weight
			node.mu.Unlock()
			log.Printf("⚖️ Updated node %s weight to %.2f", nodeID, weight)
			break
		}
	}
}

// UpdateNodePriority updates node priority
func (lb *LoadBalancer) UpdateNodePriority(nodeID string, priority int) {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	
	for _, node := range lb.edgeNodes {
		if node.NodeID == nodeID {
			node.mu.Lock()
			node.Priority = priority
			node.mu.Unlock()
			log.Printf("🎯 Updated node %s priority to %d", nodeID, priority)
			break
		}
	}
}

// PerformFailover performs failover to backup nodes
func (lb *LoadBalancer) PerformFailover(failedNodeID string) []*EdgeNode {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	
	log.Printf("🔄 Performing failover for failed node: %s", failedNodeID)
	
	// Mark failed node as inactive
	for _, node := range lb.edgeNodes {
		if node.NodeID == failedNodeID {
			node.mu.Lock()
			node.IsActive = false
			node.HealthStatus = "unhealthy"
			node.mu.Unlock()
			break
		}
	}
	
	// Get remaining healthy nodes
	healthyNodes := lb.GetHealthyNodes()
	
	// Update failover metrics
	lb.metrics.mu.Lock()
	lb.metrics.FailoverCount++
	lb.metrics.mu.Unlock()
	
	log.Printf("🔥 Failover completed: %d healthy nodes remaining", len(healthyNodes))
	
	return healthyNodes
}

// Close closes the load balancer
func (lb *LoadBalancer) Close() error {
	log.Println("🔌 Load balancer closed")
	return nil
}

// Helper functions

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// HealthChecker implementation

// CheckNodeHealth checks health of a specific node
func (hc *HealthChecker) CheckNodeHealth(node *EdgeNode) *HealthCheck {
	startTime := time.Now()

	healthCheck := &HealthCheck{
		NodeID:     node.NodeID,
		CheckTime:  startTime,
		Status:     "unhealthy",
	}

	// Perform health check (simplified)
	client := &http.Client{
		Timeout: hc.timeout,
	}

	req, err := http.NewRequest("GET", node.Endpoint+"/health", nil)
	if err != nil {
		healthCheck.ErrorMessage = fmt.Sprintf("failed to create request: %v", err)
		healthCheck.NextCheckTime = startTime + hc.interval
		return healthCheck
	}

	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		healthCheck.Status = "degraded"
		healthCheck.ErrorMessage = fmt.Sprintf("health check failed: %v", err)
	} else {
		healthCheck.Status = "healthy"
		resp.Body.Close()
	}

	responseTime := time.Since(startTime)
	healthCheck.ResponseTime = responseTime
	healthCheck.NextCheckTime = startTime + hc.interval

	// Update node health status
	node.mu.Lock()
	node.HealthStatus = healthCheck.Status
	node.ResponseTime = responseTime
	node.LastHealthCheck = startTime
	node.mu.Unlock()

	// Update metrics
	hc.updateHealthCheckerMetrics(healthCheck.Status)

	return healthCheck
}

// updateHealthCheckerMetrics updates health checker metrics
func (hc *HealthChecker) updateHealthCheckerMetrics(status string) {
	hc.metrics.mu.Lock()
	defer hc.metrics.mu.Unlock()

	hc.metrics.TotalChecks++

	switch status {
	case "healthy":
		hc.metrics.PassedChecks++
		hc.metrics.HealthyNodes++
	case "degraded":
		hc.metrics.PassedChecks++
		hc.metrics.DegradedNodes++
	case "unhealthy":
		hc.metrics.FailedChecks++
		hc.metrics.UnhealthyNodes++
	}

	hc.metrics.LastUpdated = time.Now()
}

// GetHealthCheckerMetrics returns health checker metrics
func (hc *HealthChecker) GetMetrics() *HealthCheckerMetrics {
	hc.metrics.mu.RLock()
	defer hc.metrics.mu.RUnlock()
	
	metrics := *hc.metrics
	return &metrics
}

// Close closes the health checker
func (hc *HealthChecker) Close() error {
	log.Println("🔌 Health checker closed")
	return nil
}
