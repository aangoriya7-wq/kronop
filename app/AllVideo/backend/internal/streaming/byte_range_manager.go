/**
 * Byte Range Manager - Intelligent Range Management
 * 
 * Manages byte ranges for terminal multiplexing
 * Optimizes range sizes and overlap
 * Provides intelligent range allocation
 * 
 * Features:
 * - Intelligent byte range calculation
 * - Range overlap management
 * - Range alignment optimization
 * - Range completion tracking
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

// CalculateOptimalRanges calculates optimal byte ranges for terminal multiplexing
func (brm *ByteRangeManager) CalculateOptimalRanges(start, end int64, terminalCount int) []Range {
	brm.mu.Lock()
	defer brm.mu.Unlock()

	startTime := time.Now()

	totalSize := end - start + 1
	log.Printf("📏 Calculating optimal ranges for %d-%d (%d bytes, %d terminals)", start, end, totalSize, terminalCount)

	// Calculate optimal range size based on terminals and total size
	optimalRangeSize := brm.calculateOptimalRangeSizeForTerminals(totalSize, terminalCount)
	
	// Calculate range overlap for seamless stitching
	rangeOverlap := brm.calculateRangeOverlap(optimalRangeSize)
	
	// Calculate range alignment
	rangeAlignment := brm.calculateRangeAlignment(optimalRangeSize)

	// Create ranges with overlap and alignment
	ranges := brm.createRangesWithOverlap(start, end, optimalRangeSize, rangeOverlap, rangeAlignment)

	// Optimize ranges for terminal distribution
	optimizedRanges := brm.optimizeRangesForTerminals(ranges, terminalCount)

	// Validate ranges
	brm.validateRanges(optimizedRanges, start, end)

	processingTime := time.Since(startTime)
	
	// Update metrics
	brm.updateByteRangeManagerMetrics(len(optimizedRanges), totalSize, processingTime)

	log.Printf("🔥 Optimal ranges calculated: %d ranges, size: %d, overlap: %d, alignment: %d in %v", 
		len(optimizedRanges), optimalRangeSize, rangeOverlap, rangeAlignment, processingTime)

	return optimizedRanges
}

// calculateOptimalRangeSizeForTerminals calculates optimal range size for given terminals
func (brm *ByteRangeManager) calculateOptimalRangeSizeForTerminals(totalSize, terminalCount int64) int64 {
	if terminalCount <= 0 {
		terminalCount = 1
	}

	// Base range size = total size / terminals
	baseSize := totalSize / terminalCount

	// Apply constraints
	if baseSize < brm.minRangeSize {
		return brm.minRangeSize
	}

	if baseSize > brm.maxRangeSize {
		return brm.maxRangeSize
	}

	// Align to chunk size
	alignedSize := (baseSize / brm.chunkSize) * brm.chunkSize
	if alignedSize < brm.minRangeSize {
		alignedSize = brm.minRangeSize
	}

	return alignedSize
}

// calculateRangeOverlap calculates optimal range overlap
func (brm *ByteRangeManager) calculateRangeOverlap(rangeSize int64) int64 {
	// Overlap = 10% of range size, but at least 1KB and at most 64KB
	overlap := rangeSize / 10

	if overlap < 1024 {
		overlap = 1024
	}

	if overlap > 64*1024 {
		overlap = 64 * 1024
	}

	// Align overlap to 1KB
	overlap = (overlap / 1024) * 1024

	return overlap
}

// calculateRangeAlignment calculates optimal range alignment
func (brm *ByteRangeManager) calculateRangeAlignment(rangeSize int64) int64 {
	// Alignment = min(rangeSize / 100, 64KB), but at least 4KB
	alignment := rangeSize / 100

	if alignment < 4*1024 {
		alignment = 4 * 1024
	}

	if alignment > 64*1024 {
		alignment = 64 * 1024
	}

	// Align to power of 2
	return int64(math.Pow(2, math.Ceil(math.Log2(float64(alignment)))))
}

// createRangesWithOverlap creates ranges with overlap and alignment
func (brm *ByteRangeManager) createRangesWithOverlap(start, end, rangeSize, overlap, alignment int64) []Range {
	ranges := make([]Range, 0)
	currentStart := start
	rangeIndex := 0

	for currentStart <= end {
		// Align start
		alignedStart := ((currentStart + alignment - 1) / alignment) * alignment
		if alignedStart > end {
			break
		}

		// Calculate end
		currentEnd := alignedStart + rangeSize - 1
		if currentEnd > end {
			currentEnd = end
		}

		// Align end
		alignedEnd := ((currentEnd + alignment) / alignment) * alignment - 1
		if alignedEnd > end {
			alignedEnd = end
		}

		// Create range
		rangeObj := Range{
			Start:      alignedStart,
			End:        alignedEnd,
			Size:       alignedEnd - alignedStart + 1,
			Status:     "pending",
			FetchedAt:  time.Now(),
			RetryCount: 0,
		}

		ranges = append(ranges, rangeObj)

		// Calculate next start (with overlap)
		nextStart := alignedEnd + 1 - overlap
		if nextStart <= currentStart {
			nextStart = currentStart + 1
		}

		currentStart = nextStart
		rangeIndex++
	}

	return ranges
}

// optimizeRangesForTerminals optimizes ranges for terminal distribution
func (brm *ByteRangeManager) optimizeRangesForTerminals(ranges []Range, terminalCount int) []Range {
	if len(ranges) == 0 || terminalCount <= 1 {
		return ranges
	}

	// Calculate ranges per terminal
	rangesPerTerminal := len(ranges) / terminalCount
	if rangesPerTerminal == 0 {
		rangesPerTerminal = 1
	}

	// Distribute ranges evenly across terminals
	optimizedRanges := make([]Range, len(ranges))
	for i, rangeObj := range ranges {
		terminalIndex := i / rangesPerTerminal
		if terminalIndex >= terminalCount {
			terminalIndex = terminalCount - 1
		}

		// Assign terminal ID
		optimizedRange := rangeObj
		optimizedRange.TerminalID = fmt.Sprintf("terminal-%d", terminalIndex+1)

		optimizedRanges[i] = optimizedRange
	}

	return optimizedRanges
}

// validateRanges validates range configuration
func (brm *ByteRangeManager) validateRanges(ranges []Range, expectedStart, expectedEnd int64) {
	if len(ranges) == 0 {
		log.Printf("⚠️ No ranges to validate")
		return
	}

	// Sort ranges by start
	sort.Slice(ranges, func(i, j int) bool {
		return ranges[i].Start < ranges[j].Start
	})

	// Check for gaps and overlaps
	gaps := make([][int64]int64, 0)
	overlaps := make([][int64]int64, 0)

	for i := 0; i < len(ranges)-1; i++ {
		current := ranges[i]
		next := ranges[i+1]

		// Check for gap
		if current.End+1 < next.Start {
			gaps = append(gaps, [2]int64{current.End + 1, next.Start - 1})
		}

		// Check for overlap
		if current.End >= next.Start {
			overlaps = append(overlaps, [2]int64{next.Start, current.End})
		}
	}

	// Check coverage
	actualStart := ranges[0].Start
	actualEnd := ranges[len(ranges)-1].End

	if actualStart != expectedStart || actualEnd != expectedEnd {
		log.Printf("⚠️ Range coverage mismatch: expected %d-%d, actual %d-%d", 
			expectedStart, expectedEnd, actualStart, actualEnd)
	}

	// Log validation results
	if len(gaps) > 0 {
		log.Printf("⚠️ Found %d gaps in ranges", len(gaps))
		for _, gap := range gaps {
			log.Printf("  Gap: %d-%d", gap[0], gap[1])
		}
	}

	if len(overlaps) > 0 {
		log.Printf("⚠️ Found %d overlaps in ranges", len(overlaps))
		for _, overlap := range overlaps {
			log.Printf("  Overlap: %d-%d", overlap[0], overlap[1])
		}
	}

	if len(gaps) == 0 && len(overlaps) == 0 {
		log.Printf("✅ Range validation passed: %d ranges, no gaps or overlaps", len(ranges))
	}
}

// TrackRangeCompletion tracks completion of ranges
func (brm *ByteRangeManager) TrackRangeCompletion(rangeID string, completed bool, transferRate float64) {
	brm.mu.Lock()
	defer brm.mu.Unlock()

	// Update range completion status
	if rangeID == "" {
		return
	}

	// Update metrics
	if completed {
		brm.metrics.CompletedRanges++
	} else {
		brm.metrics.FailedRanges++
	}

	// Update range completion rate
	totalRanges := brm.metrics.TotalRanges
	if totalRanges > 0 {
		brm.metrics.RangeCompletionRate = float64(brm.metrics.CompletedRanges) / float64(totalRanges)
	}

	brm.metrics.LastUpdated = time.Now()
}

// GetRangeStatistics returns range statistics
func (brm *ByteRangeManager) GetRangeStatistics() *RangeStatistics {
	brm.mu.RLock()
	defer brm.mu.RUnlock()

	stats := &RangeStatistics{
		TotalRanges:         brm.metrics.TotalRanges,
		CompletedRanges:     brm.metrics.CompletedRanges,
		FailedRanges:        brm.metrics.FailedRanges,
		PendingRanges:       brm.metrics.TotalRanges - brm.metrics.CompletedRanges - brm.metrics.FailedRanges,
		AverageRangeSize:    brm.metrics.AverageRangeSize,
		RangeCompletionRate: brm.metrics.RangeCompletionRate,
		OverlapUtilization:  brm.metrics.OverlapUtilization,
		LastUpdated:         brm.metrics.LastUpdated,
	}

	return stats
}

// RangeStatistics represents range statistics
type RangeStatistics struct {
	TotalRanges         int64     `json:"total_ranges"`
	CompletedRanges     int64     `json:"completed_ranges"`
	FailedRanges        int64     `json:"failed_ranges"`
	PendingRanges       int64     `json:"pending_ranges"`
	AverageRangeSize    int64     `json:"average_range_size"`
	RangeCompletionRate float64   `json:"range_completion_rate"`
	OverlapUtilization  float64   `json:"overlap_utilization"`
	LastUpdated         time.Time `json:"last_updated"`
}

// OptimizeRangeSize optimizes range size based on performance feedback
func (brm *ByteRangeManager) OptimizeRangeSize(currentSize int64, transferRate float64, latency time.Duration) int64 {
	brm.mu.Lock()
	defer brm.mu.Unlock()

	// Calculate performance score
	performanceScore := brm.calculatePerformanceScore(transferRate, latency)

	// Adjust range size based on performance
	var newSize int64

	if performanceScore > 0.8 {
		// High performance: increase range size
		newSize = int64(float64(currentSize) * 1.2)
	} else if performanceScore < 0.5 {
		// Low performance: decrease range size
		newSize = int64(float64(currentSize) * 0.8)
	} else {
		// Medium performance: keep current size
		newSize = currentSize
	}

	// Apply constraints
	if newSize < brm.minRangeSize {
		newSize = brm.minRangeSize
	}

	if newSize > brm.maxRangeSize {
		newSize = brm.maxRangeSize
	}

	// Align to chunk size
	newSize = (newSize / brm.chunkSize) * brm.chunkSize
	if newSize < brm.minRangeSize {
		newSize = brm.minRangeSize
	}

	log.Printf("🎯 Optimized range size: %d -> %d (performance: %.2f)", currentSize, newSize, performanceScore)

	return newSize
}

// calculatePerformanceScore calculates performance score
func (brm *ByteRangeManager) calculatePerformanceScore(transferRate float64, latency time.Duration) float64 {
	// Normalize transfer rate (0-1 scale)
	// Assume 100MB/s as excellent
	transferScore := math.Min(1.0, transferRate/100.0)

	// Normalize latency (0-1 scale, inverted)
	// Assume 100ms as baseline, lower is better
	latencyScore := math.Max(0.0, 1.0-(float64(latency.Milliseconds())/100.0))

	// Combined score (weighted average)
	performanceScore := (transferScore * 0.7) + (latencyScore * 0.3)

	return performanceScore
}

// GetOptimalRangeSize returns optimal range size for current conditions
func (brm *ByteRangeManager) GetOptimalRangeSize(totalSize int64, terminalCount int, networkCondition string) int64 {
	brm.mu.RLock()
	defer brm.mu.RUnlock()

	// Base calculation
	baseSize := brm.calculateOptimalRangeSizeForTerminals(totalSize, int64(terminalCount))

	// Adjust based on network condition
	switch networkCondition {
	case "excellent":
		baseSize = int64(float64(baseSize) * 1.5)
	case "good":
		baseSize = int64(float64(baseSize) * 1.2)
	case "fair":
		baseSize = int64(float64(baseSize) * 1.0)
	case "poor":
		baseSize = int64(float64(baseSize) * 0.8)
	case "very_poor":
		baseSize = int64(float64(baseSize) * 0.6)
	}

	// Apply constraints
	if baseSize < brm.minRangeSize {
		baseSize = brm.minRangeSize
	}

	if baseSize > brm.maxRangeSize {
		baseSize = brm.maxRangeSize
	}

	// Align to chunk size
	baseSize = (baseSize / brm.chunkSize) * brm.chunkSize
	if baseSize < brm.minRangeSize {
		baseSize = brm.minRangeSize
	}

	return baseSize
}

// updateByteRangeManagerMetrics updates byte range manager metrics
func (brm *ByteRangeManager) updateByteRangeManagerMetrics(rangeCount int, totalSize int64, processingTime time.Duration) {
	brm.metrics.mu.Lock()
	defer brm.metrics.mu.Unlock()

	brm.metrics.TotalRanges += int64(rangeCount)

	// Update average range size
	if brm.metrics.AverageRangeSize == 0 {
		brm.metrics.AverageRangeSize = totalSize / int64(rangeCount)
	} else {
		avgSize := totalSize / int64(rangeCount)
		brm.metrics.AverageRangeSize = (brm.metrics.AverageRangeSize + avgSize) / 2
	}

	// Update range completion rate
	if brm.metrics.TotalRanges > 0 {
		brm.metrics.RangeCompletionRate = float64(brm.metrics.CompletedRanges) / float64(brm.metrics.TotalRanges)
	}

	// Update overlap utilization
	if brm.rangeOverlap > 0 {
		overlapUtilization := float64(brm.rangeOverlap) / float64(brm.chunkSize)
		if brm.metrics.OverlapUtilization == 0 {
			brm.metrics.OverlapUtilization = overlapUtilization
		} else {
			brm.metrics.OverlapUtilization = (brm.metrics.OverlapUtilization + overlapUtilization) / 2
		}
	}

	brm.metrics.LastUpdated = time.Now()
}

// GetMetrics returns byte range manager metrics
func (brm *ByteRangeManager) GetMetrics() *ByteRangeManagerMetrics {
	brm.metrics.mu.RLock()
	defer brm.metrics.mu.RUnlock()
	
	metrics := *brm.metrics
	return &metrics
}

// ResetMetrics resets byte range manager metrics
func (brm *ByteRangeManager) ResetMetrics() {
	brm.metrics.mu.Lock()
	defer brm.metrics.mu.Unlock()

	brm.metrics.TotalRanges = 0
	brm.metrics.CompletedRanges = 0
	brm.metrics.FailedRanges = 0
	brm.metrics.AverageRangeSize = 0
	brm.metrics.RangeCompletionRate = 0
	brm.metrics.OverlapUtilization = 0
	brm.metrics.LastUpdated = time.Now()

	log.Println("🔄 Byte range manager metrics reset")
}

// Close closes the byte range manager
func (brm *ByteRangeManager) Close() error {
	brm.mu.Lock()
	defer brm.mu.Unlock()

	brm.completedRanges = make(map[int64]*Range)
	brm.pendingRanges = make([]Range, 0)
	brm.activeRanges = make(map[int64]*Range)

	log.Println("🔌 Byte range manager closed")
	return nil
}
