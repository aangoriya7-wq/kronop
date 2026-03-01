/**
 * Load Redistributor - Dynamic Load Balancing
 * 
 * Redistributes load from slow terminals to fast terminals
 * Ensures seamless video playback during terminal issues
 * Provides real-time load balancing and compensation
 * 
 * Features:
 * - Dynamic load redistribution
 * - Terminal performance monitoring
 * - Automatic load compensation
 * - Real-time balancing strategies
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

// StartLoadBalancing starts load balancing across terminals
func (lr *LoadRedistributor) StartLoadBalancing(terminals []*Terminal) error {
	lr.mu.Lock()
	defer lr.mu.Unlock()

	if !lr.enabled {
		log.Printf("⚠️ Load redistribution disabled")
		return nil
	}

	lr.terminals = terminals
	
	// Initialize load distribution
	lr.currentDistribution = make(map[string]float64)
	lr.targetDistribution = make(map[string]float64)

	// Set initial equal distribution
	equalLoad := 1.0 / float64(len(terminals))
	for _, terminal := range terminals {
		lr.currentDistribution[terminal.TerminalID] = 0.0
		lr.targetDistribution[terminal.TerminalID] = equalLoad
	}

	log.Printf("🔄 Started load balancing across %d terminals", len(terminals))

	// Start background load balancing
	go lr.runLoadBalancing()

	return nil
}

// runLoadBalancing runs continuous load balancing
func (lr *LoadRedistributor) runLoadBalancing() {
	ticker := time.NewTicker(lr.loadBalanceInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			lr.performLoadBalancing()
		}
	}
}

// performLoadBalancing performs load balancing
func (lr *LoadRedistributor) performLoadBalancing() {
	lr.mu.Lock()
	defer lr.mu.Unlock()

	// Get current terminal performance
	terminalPerformance := lr.getTerminalPerformance()

	// Calculate optimal distribution
	optimalDistribution := lr.calculateOptimalDistribution(terminalPerformance)

	// Check if redistribution is needed
	if lr.needsRedistribution(optimalDistribution) {
		err := lr.executeRedistribution(optimalDistribution)
		if err != nil {
			log.Printf("❌ Load redistribution failed: %v", err)
			lr.updateMetrics("redistribution_failed", false)
		} else {
			lr.updateMetrics("redistribution_success", true)
		}
	}
}

// RedistributeLoad redistributes load from a slow terminal
func (lr *LoadRedistributor) RedistributeLoad(slowTerminalID string) error {
	lr.mu.Lock()
	defer lr.mu.Unlock()

	startTime := time.Now()

	log.Printf("🔄 Redistributing load from slow terminal: %s", slowTerminalID)

	// Find slow terminal
	var slowTerminal *Terminal
	for _, terminal := range lr.terminals {
		if terminal.TerminalID == slowTerminalID {
			slowTerminal = terminal
			break
		}
	}

	if slowTerminal == nil {
		return fmt.Errorf("terminal %s not found", slowTerminalID)
	}

	// Get current load from slow terminal
	currentLoad := lr.currentDistribution[slowTerminalID]
	if currentLoad <= 0.1 {
		log.Printf("⚠️ Terminal %s already has minimal load", slowTerminalID)
		return nil
	}

	// Find fast terminals to take over load
	fastTerminals := lr.findFastTerminals(slowTerminalID)
	if len(fastTerminals) == 0 {
		return fmt.Errorf("no fast terminals available to redistribute load")
	}

	// Calculate load redistribution
	loadToRedistribute := currentLoad * 0.8 // Redistribute 80% of load
	loadPerTerminal := loadToRedistribute / float64(len(fastTerminals))

	// Execute redistribution
	redistributionEvent := &RedistributionEvent{
		EventID:             fmt.Sprintf("redist_%d", time.Now().UnixNano()),
		Timestamp:           time.Now(),
		Trigger:             "slow_terminal",
		FromTerminal:        slowTerminalID,
		LoadAmount:          loadToRedistribute,
		Reason:              fmt.Sprintf("Terminal %s performance degraded", slowTerminalID),
		RedistributionTime:  time.Since(startTime),
	}

	// Update distributions
	lr.currentDistribution[slowTerminalID] = currentLoad - loadToRedistribute

	for _, fastTerminal := range fastTerminals {
		lr.currentDistribution[fastTerminal.TerminalID] += loadPerTerminal
		redistributionEvent.ToTerminal = fastTerminal.TerminalID
	}

	redistributionEvent.Success = true
	redistributionEvent.RedistributionTime = time.Since(startTime)

	// Add to history
	lr.redistributionHistory = append(lr.redistributionHistory, *redistributionEvent)

	// Keep only last 100 events
	if len(lr.redistributionHistory) > 100 {
		lr.redistributionHistory = lr.redistributionHistory[1:]
	}

	log.Printf("🔥 Load redistribution completed: %s -> %v (%.2f%% load)", 
		slowTerminalID, lr.getTerminalIDs(fastTerminals), loadToRedistribute*100)

	return nil
}

// getTerminalPerformance gets terminal performance metrics
func (lr *LoadRedistributor) getTerminalPerformance() map[string]float64 {
	performance := make(map[string]float64)

	for _, terminal := range lr.terminals {
		terminal.mu.RLock()
		
		// Calculate performance score based on multiple factors
		transferRateScore := math.Min(1.0, terminal.AverageTransferRate/100.0) // Normalize to 100MB/s
		responseTimeScore := math.Max(0.0, 1.0-float64(terminal.ResponseTime.Milliseconds())/100.0) // Lower is better
		successRateScore := terminal.SuccessRate
		
		// Combined performance score
		performanceScore := (transferRateScore*0.4 + responseTimeScore*0.3 + successRateScore*0.3)
		
		performance[terminal.TerminalID] = performanceScore
		
		terminal.mu.RUnlock()
	}

	return performance
}

// calculateOptimalDistribution calculates optimal load distribution
func (lr *LoadRedistributor) calculateOptimalDistribution(performance map[string]float64) map[string]float64 {
	optimalDistribution := make(map[string]float64)

	// Calculate total performance score
	totalPerformance := 0.0
	for _, score := range performance {
		totalPerformance += score
	}

	if totalPerformance == 0 {
		// Equal distribution if no performance data
		equalLoad := 1.0 / float64(len(lr.terminals))
		for _, terminal := range lr.terminals {
			optimalDistribution[terminal.TerminalID] = equalLoad
		}
		return optimalDistribution
	}

	// Distribute load based on performance
	for terminalID, score := range performance {
		optimalDistribution[terminalID] = score / totalPerformance
	}

	return optimalDistribution
}

// needsRedistribution checks if redistribution is needed
func (lr *LoadRedistributor) needsRedistribution(optimalDistribution map[string]float64) bool {
	for terminalID, optimalLoad := range optimalDistribution {
		currentLoad := lr.currentDistribution[terminalID]
		
		// Check if difference exceeds threshold
		diff := math.Abs(currentLoad - optimalLoad)
		if diff > lr.loadBalanceThreshold {
			return true
		}
	}

	return false
}

// executeRedistribution executes load redistribution
func (lr *LoadRedistributor) executeRedistribution(optimalDistribution map[string]float64) error {
	startTime := time.Now()

	// Calculate redistribution changes
	redistributionChanges := make(map[string]float64)
	maxChange := 0.0

	for terminalID, optimalLoad := range optimalDistribution {
		currentLoad := lr.currentDistribution[terminalID]
		change := optimalLoad - currentLoad
		
		if math.Abs(change) > 0.01 { // Only redistribute significant changes
			redistributionChanges[terminalID] = change
			if math.Abs(change) > maxChange {
				maxChange = math.Abs(change)
			}
		}
	}

	if len(redistributionChanges) == 0 {
		return nil // No redistribution needed
	}

	// Apply redistribution based on strategy
	switch lr.strategy {
	case "immediate":
		err := lr.applyImmediateRedistribution(redistributionChanges)
		if err != nil {
			return err
		}
	case "gradual":
		err := lr.applyGradualRedistribution(redistributionChanges)
		if err != nil {
			return err
		}
	case "predictive":
		err := lr.applyPredictiveRedistribution(redistributionChanges)
		if err != nil {
			return err
		}
	default:
		return lr.applyImmediateRedistribution(redistributionChanges)
	}

	// Create redistribution event
	redistributionEvent := &RedistributionEvent{
		EventID:             fmt.Sprintf("auto_%d", time.Now().UnixNano()),
		Timestamp:           time.Now(),
		Trigger:             "automatic_balancing",
		LoadAmount:          maxChange,
		Reason:              fmt.Sprintf("Load imbalance detected (max change: %.2f%%)", maxChange*100),
		RedistributionTime:  time.Since(startTime),
		Success:             true,
	}

	lr.redistributionHistory = append(lr.redistributionHistory, *redistributionEvent)

	log.Printf("🔄 Automatic load redistribution completed: %d terminals, max change: %.2f%%", 
		len(redistributionChanges), maxChange*100)

	return nil
}

// applyImmediateRedistribution applies immediate redistribution
func (lr *LoadRedistributor) applyImmediateRedistribution(changes map[string]float64) error {
	for terminalID, change := range changes {
		lr.currentDistribution[terminalID] += change
		
		// Ensure distribution stays within bounds
		if lr.currentDistribution[terminalID] < 0 {
			lr.currentDistribution[terminalID] = 0
		}
		if lr.currentDistribution[terminalID] > 1.0 {
			lr.currentDistribution[terminalID] = 1.0
		}
	}

	// Normalize to ensure total equals 1.0
	total := 0.0
	for _, load := range lr.currentDistribution {
		total += load
	}

	if total > 0 {
		for terminalID := range lr.currentDistribution {
			lr.currentDistribution[terminalID] /= total
		}
	}

	return nil
}

// applyGradualRedistribution applies gradual redistribution
func (lr *LoadRedistributor) applyGradualRedistribution(changes map[string]float64) error {
	// Apply changes gradually (50% of immediate change)
	for terminalID, change := range changes {
		gradualChange := change * 0.5
		lr.currentDistribution[terminalID] += gradualChange
		
		// Ensure distribution stays within bounds
		if lr.currentDistribution[terminalID] < 0 {
			lr.currentDistribution[terminalID] = 0
		}
		if lr.currentDistribution[terminalID] > 1.0 {
			lr.currentDistribution[terminalID] = 1.0
		}
	}

	// Normalize
	total := 0.0
	for _, load := range lr.currentDistribution {
		total += load
	}

	if total > 0 {
		for terminalID := range lr.currentDistribution {
			lr.currentDistribution[terminalID] /= total
		}
	}

	return nil
}

// applyPredictiveRedistribution applies predictive redistribution
func (lr *LoadRedistributor) applyPredictiveRedistribution(changes map[string]float64) error {
	// Analyze historical performance trends
	trends := lr.analyzePerformanceTrends()

	// Apply redistribution with predictive adjustments
	for terminalID, change := range changes {
		// Adjust change based on trend
		trend := trends[terminalID]
		predictiveAdjustment := change * (1.0 + trend)
		
		lr.currentDistribution[terminalID] += predictiveAdjustment
		
		// Ensure distribution stays within bounds
		if lr.currentDistribution[terminalID] < 0 {
			lr.currentDistribution[terminalID] = 0
		}
		if lr.currentDistribution[terminalID] > 1.0 {
			lr.currentDistribution[terminalID] = 1.0
		}
	}

	// Normalize
	total := 0.0
	for _, load := range lr.currentDistribution {
		total += load
	}

	if total > 0 {
		for terminalID := range lr.currentDistribution {
			lr.currentDistribution[terminalID] /= total
		}
	}

	return nil
}

// findFastTerminals finds fast terminals to take over load
func (lr *LoadRedistributor) findFastTerminals(excludeTerminalID string) []*Terminal {
	var fastTerminals []*Terminal

	for _, terminal := range lr.terminals {
		if terminal.TerminalID == excludeTerminalID {
			continue
		}

		if terminal.IsActive && terminal.HealthStatus == "healthy" {
			terminal.mu.RLock()
			
			// Check if terminal is fast (performance > 0.7)
			transferRateScore := math.Min(1.0, terminal.AverageTransferRate/100.0)
			responseTimeScore := math.Max(0.0, 1.0-float64(terminal.ResponseTime.Milliseconds())/100.0)
			performanceScore := (transferRateScore*0.6 + responseTimeScore*0.4)
			
			terminal.mu.RUnlock()

			if performanceScore > 0.7 {
				fastTerminals = append(fastTerminals, terminal)
			}
		}
	}

	// Sort by performance (fastest first)
	sort.Slice(fastTerminals, func(i, j int) bool {
		terminalA := fastTerminals[i]
		terminalB := fastTerminals[j]

		terminalA.mu.RLock()
		terminalB.mu.RLock()
		defer terminalA.mu.RUnlock()
		defer terminalB.mu.RUnlock()

		perfA := terminalA.AverageTransferRate
		perfB := terminalB.AverageTransferRate

		return perfA > perfB
	})

	return fastTerminals
}

// getTerminalIDs gets terminal IDs from terminal list
func (lr *LoadRedistributor) getTerminalIDs(terminals []*Terminal) []string {
	ids := make([]string, len(terminals))
	for i, terminal := range terminals {
		ids[i] = terminal.TerminalID
	}
	return ids
}

// analyzePerformanceTrends analyzes performance trends
func (lr *LoadRedistributor) analyzePerformanceTrends() map[string]float64 {
	trends := make(map[string]float64)

	// Simple trend analysis based on recent redistribution history
	if len(lr.redistributionHistory) < 2 {
		// No trend data available
		for _, terminal := range lr.terminals {
			trends[terminal.TerminalID] = 0.0
		}
		return trends
	}

	// Analyze last 10 redistribution events
	recentEvents := lr.redistributionHistory
	if len(recentEvents) > 10 {
		recentEvents = recentEvents[len(recentEvents)-10:]
	}

	// Calculate trends for each terminal
	for _, terminal := range lr.terminals {
		trend := 0.0
		eventCount := 0

		for _, event := range recentEvents {
			if event.FromTerminal == terminal.TerminalID {
				// Terminal was losing load (negative trend)
				trend -= 0.1
				eventCount++
			} else if event.ToTerminal == terminal.TerminalID {
				// Terminal was gaining load (positive trend)
				trend += 0.1
				eventCount++
			}
		}

		if eventCount > 0 {
			trend /= float64(eventCount)
		}

		// Limit trend to reasonable range
		if trend > 0.2 {
			trend = 0.2
		} else if trend < -0.2 {
			trend = -0.2
		}

		trends[terminal.TerminalID] = trend
	}

	return trends
}

// GetCurrentDistribution returns current load distribution
func (lr *LoadRedistributor) GetCurrentDistribution() map[string]float64 {
	lr.mu.RLock()
	defer lr.mu.RUnlock()

	distribution := make(map[string]float64)
	for k, v := range lr.currentDistribution {
		distribution[k] = v
	}

	return distribution
}

// GetRedistributionHistory returns redistribution history
func (lr *LoadRedistributor) GetRedistributionHistory() []RedistributionEvent {
	lr.mu.RLock()
	defer lr.mu.RUnlock()

	history := make([]RedistributionEvent, len(lr.redistributionHistory))
	copy(history, lr.redistributionHistory)
	return history
}

// GetLoadBalanceScore returns load balance score
func (lr *LoadRedistributor) GetLoadBalanceScore() float64 {
	lr.mu.RLock()
	defer lr.mu.RUnlock()

	if len(lr.currentDistribution) == 0 {
		return 0.0
	}

	// Calculate variance from equal distribution
	equalLoad := 1.0 / float64(len(lr.currentDistribution))
	variance := 0.0

	for _, load := range lr.currentDistribution {
		diff := load - equalLoad
		variance += diff * diff
	}

	variance /= float64(len(lr.currentDistribution))

	// Convert variance to score (lower variance = higher score)
	score := math.Max(0.0, 1.0-variance*10)

	return score
}

// updateMetrics updates load redistributor metrics
func (lr *LoadRedistributor) updateMetrics(event string, success bool) {
	lr.metrics.mu.Lock()
	defer lr.metrics.mu.Unlock()

	switch event {
	case "redistribution_success":
		lr.metrics.SuccessfulRedistributions++
		lr.metrics.TotalRedistributions++
	case "redistribution_failed":
		lr.metrics.FailedRedistributions++
		lr.metrics.TotalRedistributions++
	}

	// Update load balance score
	lr.metrics.LoadBalanceScore = lr.GetLoadBalanceScore()

	// Update terminal utilization
	lr.metrics.TerminalUtilization = make(map[string]float64)
	for terminalID, load := range lr.currentDistribution {
		lr.metrics.TerminalUtilization[terminalID] = load
	}

	lr.metrics.LastUpdated = time.Now()
}

// GetMetrics returns load redistributor metrics
func (lr *LoadRedistributor) GetMetrics() *LoadRedistributorMetrics {
	lr.metrics.mu.RLock()
	defer lr.metrics.mu.RUnlock()
	
	metrics := *lr.metrics
	return &metrics
}

// SetStrategy sets redistribution strategy
func (lr *LoadRedistributor) SetStrategy(strategy string) {
	lr.mu.Lock()
	defer lr.mu.Unlock()
	
	lr.strategy = strategy
	log.Printf("🔄 Load redistribution strategy changed to: %s", strategy)
}

// GetStrategy returns current redistribution strategy
func (lr *LoadRedistributor) GetStrategy() string {
	lr.mu.RLock()
	defer lr.mu.RUnlock()
	
	return lr.strategy
}

// Close closes the load redistributor
func (lr *LoadRedistributor) Close() error {
	log.Println("🔌 Load redistributor closed")
	return nil
}
