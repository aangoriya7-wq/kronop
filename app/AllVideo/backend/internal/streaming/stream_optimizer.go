/**
 * Stream Optimizer - Smart Performance Optimization
 * 
 * Optimizes streaming performance in real-time
 * Adaptive quality adjustment based on network conditions
 * Buffer optimization for maximum efficiency
 * 
 * Features:
 * - Network prediction and adaptation
 * - Quality adjustment based on bandwidth
 * - Buffer optimization
 * - Real-time performance tuning
 */

package streaming

import (
	"context"
	"fmt"
	"log"
	"math"
	"sort"
	"time"
)

// Optimize optimizes streaming performance
func (so *StreamOptimizer) Optimize(metrics *StreamingMetrics) {
	startTime := time.Now()

	log.Printf("🧠 Starting stream optimization...")

	// Predict network conditions
	networkPrediction := so.networkPredictor.PredictNetworkConditions(metrics)

	// Adjust quality based on network
	qualityAdjustment := so.qualityAdjuster.AdjustQuality(metrics, networkPrediction)

	// Optimize buffer settings
	bufferOptimization := so.bufferOptimizer.OptimizeBuffer(metrics, networkPrediction)

	optimizationTime := time.Since(startTime)

	log.Printf("🔥 Stream optimization completed in %v", optimizationTime)
	log.Printf("📊 Network prediction: %.2f Mbps, %.1fms latency", networkPrediction.Bandwidth, networkPrediction.Latency.Milliseconds())
	log.Printf("🎯 Quality adjustment: %s -> %s", qualityAdjustment.FromQuality, qualityAdjustment.ToQuality)
	log.Printf("📦 Buffer optimization: %d -> %d chunks", bufferOptimization.OldWorkerCount, bufferOptimization.NewWorkerCount)

	// Update metrics
	so.updateOptimizationMetrics(networkPrediction, qualityAdjustment, bufferOptimization, optimizationTime)
}

// PredictNetworkConditions predicts network conditions
func (np *NetworkPredictor) PredictNetworkConditions(metrics *StreamingMetrics) *NetworkPrediction {
	np.mu.Lock()
	defer np.mu.Unlock()

	// Calculate current bandwidth from metrics
	currentBandwidth := metrics.AverageTransferRate * 8 // Convert MB/s to Mbps
	currentLatency := metrics.AverageLatency

	// Add to history
	measurement := &BandwidthMeasurement{
		Timestamp:        time.Now(),
		Bandwidth:        int64(currentBandwidth),
		TransferRate:     metrics.AverageTransferRate,
		BytesTransferred: metrics.TotalBytesTransferred,
		Duration:         metrics.AverageLatency,
		WorkerID:         0,
	}

	np.bandwidthHistory = append(np.bandwidthHistory, *measurement)

	// Keep only last 100 measurements
	if len(np.bandwidthHistory) > 100 {
		np.bandwidthHistory = np.bandwidthHistory[1:]
	}

	// Calculate average bandwidth
	if len(np.bandwidthHistory) > 0 {
		var totalBandwidth int64
		for _, m := range np.bandwidthHistory {
			totalBandwidth += m.Bandwidth
		}
		np.averageBandwidth = totalBandwidth / int64(len(np.bandwidthHistory))
	}

	// Calculate network stability
	np.calculateNetworkStability()

	// Predict future conditions
	prediction := &NetworkPrediction{
		PredictedBandwidth: np.averageBandwidth,
		PredictedLatency:   currentLatency,
		Confidence:         np.networkStability,
		RecommendedQuality: np.recommendQuality(np.averageBandwidth),
		OptimalChunkSize:   np.recommendChunkSize(np.averageBandwidth),
		OptimalWorkerCount: np.recommendWorkerCount(np.averageBandwidth),
		PredictionTime:    time.Now(),
	}

	np.LastUpdated = time.Now()
	return prediction
}

// calculateNetworkStability calculates network stability
func (np *NetworkPredictor) calculateNetworkStability() {
	if len(np.bandwidthHistory) < 10 {
		np.networkStability = 0.5 // Default stability
		return
	}

	// Calculate variance in bandwidth
	var variance float64
	mean := float64(np.averageBandwidth)

	for _, m := range np.bandwidthHistory {
		diff := float64(m.Bandwidth) - mean
		variance += diff * diff
	}

	variance /= float64(len(np.bandwidthHistory))
	stdDev := math.Sqrt(variance)

	// Calculate stability (lower std dev = higher stability)
	np.networkStability = math.Max(0, 1.0-(stdDev/mean))
}

// recommendQuality recommends optimal quality based on bandwidth
func (np *NetworkPredictor) recommendQuality(bandwidth int64) string {
	bandwidthMbps := float64(bandwidth)

	switch {
	case bandwidthMbps >= 100:
		return "4K"
	case bandwidthMbps >= 50:
		return "1080p"
	case bandwidthMbps >= 25:
		return "720p"
	case bandwidthMbps >= 10:
		return "480p"
	default:
		return "360p"
	}
}

// recommendChunkSize recommends optimal chunk size
func (np *NetworkPredictor) recommendChunkSize(bandwidth int64) int64 {
	bandwidthMBps := float64(bandwidth) / 8 // Convert to MB/s

	// Optimal chunk size = bandwidth * 0.1 seconds (100ms chunks)
	optimalSize := int64(bandwidthMBps * 0.1 * 1024 * 1024) // Convert to bytes

	// Clamp between 256KB and 10MB
	if optimalSize < 256*1024 {
		optimalSize = 256 * 1024
	} else if optimalSize > 10*1024*1024 {
		optimalSize = 10 * 1024 * 1024
	}

	return optimalSize
}

// recommendWorkerCount recommends optimal worker count
func (np *NetworkPredictor) recommendWorkerCount(bandwidth int64) int {
	bandwidthMBps := float64(bandwidth) / 8

	// More workers for higher bandwidth
	switch {
	case bandwidthMBps >= 100:
		return 20
	case bandwidthMBps >= 50:
		return 15
	case bandwidthMBps >= 25:
		return 10
	case bandwidthMBps >= 10:
		return 8
	default:
		return 4
	}
}

// AdjustQuality adjusts streaming quality
func (qa *QualityAdjuster) AdjustQuality(metrics *StreamingMetrics, prediction *NetworkPrediction) *QualityAdjustment {
	qa.mu.Lock()
	defer qa.mu.Unlock()

	currentQuality := qa.currentQuality
	if currentQuality == "" {
		currentQuality = "1080p" // Default quality
	}

	recommendedQuality := prediction.RecommendedQuality

	// Only adjust if significantly different
	if qa.shouldAdjustQuality(currentQuality, recommendedQuality, prediction) {
		adjustment := &QualityAdjustment{
			Timestamp:     time.Now(),
			FromQuality:   currentQuality,
			ToQuality:     recommendedQuality,
			Reason:        fmt.Sprintf("Network prediction: %.2f Mbps", prediction.PredictedBandwidth),
			Bandwidth:     prediction.PredictedBandwidth,
			Latency:       prediction.PredictedLatency,
			Success:       true,
		}

		qa.currentQuality = recommendedQuality
		qa.qualityHistory = append(qa.qualityHistory, *adjustment)

		// Keep only last 50 adjustments
		if len(qa.qualityHistory) > 50 {
			qa.qualityHistory = qa.qualityHistory[1:]
		}

		qa.LastUpdated = time.Now()
		return adjustment
	}

	return nil
}

// shouldAdjustQuality determines if quality should be adjusted
func (qa *QualityAdjuster) shouldAdjustQuality(current, recommended string, prediction *NetworkPrediction) bool {
	// Don't adjust if confidence is low
	if prediction.Confidence < 0.7 {
		return false
	}

	// Quality hierarchy
	qualityHierarchy := map[string]int{
		"360p": 1,
		"480p": 2,
		"720p": 3,
		"1080p": 4,
		"4K":   5,
	}

	currentLevel := qualityHierarchy[current]
	recommendedLevel := qualityHierarchy[recommended]

	// Adjust if difference is more than 1 level
	return math.Abs(float64(currentLevel-recommendedLevel)) >= 1
}

// OptimizeBuffer optimizes buffer settings
func (bo *BufferOptimizer) OptimizeBuffer(metrics *StreamingMetrics, prediction *NetworkPrediction) *BufferOptimization {
	bo.mu.Lock()
	defer bo.mu.Unlock()

	oldWorkerCount := bo.optimalWorkerCount
	oldChunkSize := bo.optimalChunkSize

	// Update optimal settings based on prediction
	bo.optimalChunkSize = prediction.OptimalChunkSize
	bo.optimalWorkerCount = prediction.OptimalWorkerCount

	// Calculate improvement
	improvement := float64(bo.optimalWorkerCount-oldWorkerCount) / float64(oldWorkerCount) * 100

	optimization := &BufferOptimization{
		Timestamp:      time.Now(),
		OldBufferSize:  bo.bufferSize,
		NewBufferSize:  bo.bufferSize, // Keep same buffer size
		OldChunkSize:   oldChunkSize,
		NewChunkSize:   bo.optimalChunkSize,
		OldWorkerCount: oldWorkerCount,
		NewWorkerCount: bo.optimalWorkerCount,
		Improvement:    improvement,
		Reason:         fmt.Sprintf("Network prediction: %.2f Mbps", prediction.PredictedBandwidth),
	}

	bo.bufferHistory = append(bo.bufferHistory, *optimization)

	// Keep only last 20 optimizations
	if len(bo.bufferHistory) > 20 {
		bo.bufferHistory = bo.bufferHistory[1:]
	}

	bo.LastUpdated = time.Now()
	return optimization
}

// updateOptimizationMetrics updates optimization metrics
func (so *StreamOptimizer) updateOptimizationMetrics(prediction *NetworkPrediction, qualityAdjustment *QualityAdjustment, bufferOptimization *BufferOptimization, optimizationTime time.Duration) {
	so.metrics.mu.Lock()
	defer so.metrics.mu.Unlock()

	so.metrics.TotalOptimizations++

	if qualityAdjustment != nil {
		so.metrics.SuccessfulOptimizations++
	}

	// Update prediction accuracy
	so.metrics.PredictionAccuracy = prediction.Confidence

	// Update adaptation efficiency
	if qualityAdjustment != nil {
		so.metrics.AdaptationEfficiency = 0.9 // High efficiency for successful adjustments
	}

	// Update buffer efficiency
	if bufferOptimization != nil {
		so.metrics.BufferEfficiency = math.Max(0, bufferOptimization.Improvement/100)
	}

	so.metrics.LastUpdated = time.Now()
}

// GetMetrics returns optimizer metrics
func (so *StreamOptimizer) GetMetrics() *OptimizerMetrics {
	so.metrics.mu.RLock()
	defer so.metrics.mu.RUnlock()
	
	metrics := *so.metrics
	return &metrics
}

// GetNetworkPrediction returns current network prediction
func (so *StreamOptimizer) GetNetworkPrediction() *NetworkPrediction {
	so.networkPredictor.mu.RLock()
	defer so.networkPredictor.mu.RUnlock()

	return &NetworkPrediction{
		PredictedBandwidth: so.networkPredictor.averageBandwidth,
		PredictedLatency:   so.networkPredictor.averageLatency,
		Confidence:         so.networkPredictor.networkStability,
		RecommendedQuality: so.networkPredictor.recommendQuality(so.networkPredictor.averageBandwidth),
		OptimalChunkSize:   so.networkPredictor.recommendChunkSize(so.networkPredictor.averageBandwidth),
		OptimalWorkerCount: so.networkPredictor.recommendWorkerCount(so.networkPredictor.averageBandwidth),
		PredictionTime:    so.networkPredictor.LastUpdated,
	}
}

// GetQualityAdjustmentHistory returns quality adjustment history
func (so *StreamOptimizer) GetQualityAdjustmentHistory() []QualityAdjustment {
	so.qualityAdjuster.mu.RLock()
	defer so.qualityAdjuster.mu.RUnlock()

	history := make([]QualityAdjustment, len(so.qualityAdjuster.qualityHistory))
	copy(history, so.qualityAdjuster.qualityHistory)
	return history
}

// GetBufferOptimizationHistory returns buffer optimization history
func (so *StreamOptimizer) GetBufferOptimizationHistory() []BufferOptimization {
	so.bufferOptimizer.mu.RLock()
	defer so.bufferOptimizer.mu.RUnlock()

	history := make([]BufferOptimization, len(so.bufferOptimizer.bufferHistory))
	copy(history, so.bufferOptimizer.bufferHistory)
	return history
}

// NetworkPrediction represents network condition prediction
type NetworkPrediction struct {
	PredictedBandwidth  int64         `json:"predicted_bandwidth"`  // Mbps
	PredictedLatency    time.Duration `json:"predicted_latency"`    // ms
	Confidence          float64       `json:"confidence"`           // 0.0 to 1.0
	RecommendedQuality  string        `json:"recommended_quality"`
	OptimalChunkSize    int64         `json:"optimal_chunk_size"`   // bytes
	OptimalWorkerCount  int           `json:"optimal_worker_count"`
	PredictionTime      time.Time     `json:"prediction_time"`
}

// Close closes the stream optimizer
func (so *StreamOptimizer) Close() error {
	log.Println("🔌 Stream optimizer closed")
	return nil
}
