/**
 * Buffer Manager - Video Buffer Management
 * 
 * Manages video buffer for zero-jitter playback
 * Handles buffer underruns and overruns
 * Provides jitter compensation
 * 
 * Features:
 * - Video buffer management
 * - Jitter compensation
 * - Buffer level monitoring
 * - Seamless playback control
 */

package streaming

import (
	"fmt"
	"log"
	"sync"
	"time"
)

// InitializeBuffer initializes the video buffer
func (bm *BufferManager) InitializeBuffer(bufferSize int64) error {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	log.Printf("🔄 Initializing video buffer with size: %d bytes", bufferSize)

	// Create video buffer
	bm.buffer = &VideoBuffer{
		BufferID:           fmt.Sprintf("buffer_%d", time.Now().UnixNano()),
		Data:               make([]byte, 0, bufferSize),
		Capacity:           bufferSize,
		CurrentLevel:      0.0,
		WritePosition:      0,
		ReadPosition:       0,
		IsBuffering:        false,
		LastWriteTime:      time.Now(),
		LastReadTime:       time.Now(),
		BufferingStartTime: time.Now(),
		TotalBufferedBytes: 0,
		TotalPlayedBytes:   0,
	}

	// Create jitter buffer
	bm.jitterBuffer = &JitterBuffer{
		BufferID:            fmt.Sprintf("jitter_%d", time.Now().UnixNano()),
		Data:               make([]byte, 0, bm.jitterBufferSize),
		Capacity:           bm.jitterBufferSize,
		CurrentLevel:      0.0,
		JitterCompensation: bm.jitterCompensation,
		CompensationActive: false,
		LastCompensationTime: time.Now(),
		TotalCompensations: 0,
		AverageJitter:      0,
	}

	log.Printf("🔥 Video buffer initialized successfully")
	return nil
}

// AddToBuffer adds data to the video buffer
func (bm *BufferManager) AddToBuffer(data []byte) error {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	if bm.buffer == nil {
		return fmt.Errorf("buffer not initialized")
	}

	startTime := time.Now()

	// Check buffer capacity
	availableSpace := bm.buffer.Capacity - int64(len(bm.buffer.Data))
	if int64(len(data)) > availableSpace {
		// Buffer overrun - remove old data
		bm.handleBufferOverrun(data)
		bm.updateMetrics("buffer_overrun", false)
		return fmt.Errorf("buffer_overrun")
	}

	// Add data to buffer
	bm.buffer.Data = append(bm.buffer.Data, data...)
	bm.buffer.WritePosition += int64(len(data))
	bm.buffer.LastWriteTime = time.Now()
	bm.buffer.TotalBufferedBytes += int64(len(data))

	// Update buffer level
	bm.buffer.CurrentLevel = float64(len(bm.buffer.Data)) / float64(bm.buffer.Capacity)

	// Check if buffer level is too low
	if bm.buffer.CurrentLevel < bm.minBufferLevel {
		bm.handleBufferUnderrun()
		bm.updateMetrics("buffer_underrun", false)
		return fmt.Errorf("buffer_underrun")
	}

	// Stop buffering if buffer level is sufficient
	if bm.buffer.IsBuffering && bm.buffer.CurrentLevel >= bm.bufferThreshold {
		bm.buffer.IsBuffering = false
		log.Printf("✅ Buffering completed, level: %.2f%%", bm.buffer.CurrentLevel*100)
	}

	addTime := time.Since(startTime)
	bm.updateMetrics("data_added", true)

	log.Printf("📦 Added %d bytes to buffer (level: %.2f%%, time: %v)", 
		len(data), bm.buffer.CurrentLevel*100, addTime)

	return nil
}

// ReadFromBuffer reads data from the video buffer
func (bm *BufferManager) ReadFromBuffer(size int64) ([]byte, error) {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	if bm.buffer == nil {
		return nil, fmt.Errorf("buffer not initialized")
	}

	startTime := time.Now()

	// Check if buffer has enough data
	if int64(len(bm.buffer.Data)) < size {
		// Buffer underrun
		bm.handleBufferUnderrun()
		bm.updateMetrics("buffer_underrun", false)
		return nil, fmt.Errorf("buffer_underrun")
	}

	// Read data from buffer
	data := make([]byte, size)
	copy(data, bm.buffer.Data[:size])

	// Remove read data from buffer
	bm.buffer.Data = bm.buffer.Data[size:]
	bm.buffer.ReadPosition += size
	bm.buffer.LastReadTime = time.Now()
	bm.buffer.TotalPlayedBytes += size

	// Update buffer level
	bm.buffer.CurrentLevel = float64(len(bm.buffer.Data)) / float64(bm.buffer.Capacity)

	// Check if buffering is needed
	if !bm.buffer.IsBuffering && bm.buffer.CurrentLevel < bm.minBufferLevel {
		bm.buffer.IsBuffering = true
		bm.buffer.BufferingStartTime = time.Now()
		log.Printf("⏸️ Buffering started, level: %.2f%%", bm.buffer.CurrentLevel*100)
	}

	readTime := time.Since(startTime)
	bm.updateMetrics("data_read", true)

	log.Printf("📖 Read %d bytes from buffer (level: %.2f%%, time: %v)", 
		size, bm.buffer.CurrentLevel*100, readTime)

	return data, nil
}

// handleBufferUnderrun handles buffer underrun
func (bm *BufferManager) handleBufferUnderrun() {
	if bm.buffer == nil {
		return
	}

	bm.buffer.IsBuffering = true
	bm.buffer.BufferingStartTime = time.Now()

	log.Printf("⚠️ Buffer underrun detected, level: %.2f%%", bm.buffer.CurrentLevel*100)

	// Try to compensate with jitter buffer if enabled
	if bm.jitterCompensation && bm.jitterBuffer != nil {
		bm.compensateFromJitterBuffer()
	}
}

// handleBufferOverrun handles buffer overrun
func (bm *BufferManager) handleBufferOverrun(data []byte) {
	if bm.buffer == nil {
		return
	}

	// Remove oldest data to make space
	overflowSize := int64(len(data)) - (bm.buffer.Capacity - int64(len(bm.buffer.Data)))
	if overflowSize > 0 {
		// Remove overflow data from beginning
		bm.buffer.Data = bm.buffer.Data[overflowSize:]
		bm.buffer.ReadPosition += overflowSize
		bm.buffer.CurrentLevel = float64(len(bm.buffer.Data)) / float64(bm.buffer.Capacity)

		log.Printf("⚠️ Buffer overrun detected, removed %d bytes", overflowSize)
	}
}

// compensateFromJitterBuffer compensates from jitter buffer
func (bm *BufferManager) compensateFromJitterBuffer() {
	if bm.jitterBuffer == nil || bm.jitterBuffer.CurrentLevel == 0 {
		return
	}

	bm.jitterBuffer.mu.Lock()
	defer bm.jitterBuffer.mu.Unlock()

	// Get data from jitter buffer
	compensationSize := int64(len(bm.jitterBuffer.Data))
	if compensationSize > 0 {
		// Add jitter buffer data to main buffer
		bm.buffer.Data = append(bm.jitterBuffer.Data, bm.buffer.Data...)
		bm.buffer.CurrentLevel = float64(len(bm.buffer.Data)) / float64(bm.buffer.Capacity)

		// Clear jitter buffer
		bm.jitterBuffer.Data = bm.jitterBuffer.Data[:0]
		bm.jitterBuffer.CurrentLevel = 0.0
		bm.jitterBuffer.TotalCompensations++
		bm.jitterBuffer.LastCompensationTime = time.Now()
		bm.jitterBuffer.CompensationActive = true

		log.Printf("🔄 Compensated %d bytes from jitter buffer", compensationSize)
	}
}

// AddToJitterBuffer adds data to jitter buffer
func (bm *BufferManager) AddToJitterBuffer(data []byte) error {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	if bm.jitterBuffer == nil {
		return fmt.Errorf("jitter buffer not initialized")
	}

	// Check jitter buffer capacity
	availableSpace := bm.jitterBuffer.Capacity - int64(len(bm.jitterBuffer.Data))
	if int64(len(data)) > availableSpace {
		// Remove oldest data
		overflowSize := int64(len(data)) - availableSpace
		bm.jitterBuffer.Data = bm.jitterBuffer.Data[overflowSize:]
	}

	// Add data to jitter buffer
	bm.jitterBuffer.Data = append(bm.jitterBuffer.Data, data...)
	bm.jitterBuffer.CurrentLevel = float64(len(bm.jitterBuffer.Data)) / float64(bm.jitterBuffer.Capacity)

	log.Printf("📦 Added %d bytes to jitter buffer (level: %.2f%%)", 
		len(data), bm.jitterBuffer.CurrentLevel*100)

	return nil
}

// GetCurrentBufferLevel returns current buffer level
func (bm *BufferManager) GetCurrentBufferLevel() float64 {
	bm.mu.RLock()
	defer bm.mu.RUnlock()

	if bm.buffer == nil {
		return 0.0
	}

	return bm.buffer.CurrentLevel
}

// GetJitterLevel returns current jitter level
func (bm *BufferManager) GetJitterLevel() time.Duration {
	bm.mu.RLock()
	defer bm.mu.RUnlock()

	if bm.jitterBuffer == nil {
		return 0
	}

	return bm.jitterBuffer.AverageJitter
}

// GetBufferStatus returns buffer status
func (bm *BufferManager) GetBufferStatus() *BufferStatus {
	bm.mu.RLock()
	defer bm.mu.RUnlock()

	status := &BufferStatus{
		BufferLevel:        0.0,
		IsBuffering:       false,
		BufferingDuration:  0,
		JitterLevel:       0,
		JitterCompensation: false,
		TotalBuffered:     0,
		TotalPlayed:       0,
		LastUpdated:       time.Now(),
	}

	if bm.buffer != nil {
		status.BufferLevel = bm.buffer.CurrentLevel
		status.IsBuffering = bm.buffer.IsBuffering
		status.TotalBuffered = bm.buffer.TotalBufferedBytes
		status.TotalPlayed = bm.buffer.TotalPlayedBytes

		if bm.buffer.IsBuffering {
			status.BufferingDuration = time.Since(bm.buffer.BufferingStartTime)
		}
	}

	if bm.jitterBuffer != nil {
		status.JitterLevel = int(bm.jitterBuffer.AverageJitter.Milliseconds())
		status.JitterCompensation = bm.jitterBuffer.CompensationActive
	}

	return status
}

// BufferStatus represents buffer status
type BufferStatus struct {
	BufferLevel        float64       `json:"buffer_level"`        // 0.0 to 1.0
	IsBuffering       bool          `json:"is_buffering"`
	BufferingDuration  time.Duration `json:"buffering_duration"`
	JitterLevel       int           `json:"jitter_level"`        // ms
	JitterCompensation bool          `json:"jitter_compensation"`
	TotalBuffered     int64         `json:"total_buffered"`
	TotalPlayed       int64         `json:"total_played"`
	LastUpdated       time.Time     `json:"last_updated"`
}

// DetectJitter detects jitter in data stream
func (bm *BufferManager) DetectJitter(dataSize int64, processingTime time.Duration) bool {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	if bm.jitterBuffer == nil {
		return false
	}

	// Calculate jitter based on processing time variation
	expectedTime := time.Duration(float64(dataSize) / (10 * 1024 * 1024) * float64(time.Second)) // 10MB/s baseline
	jitter := processingTime - expectedTime

	if jitter < 0 {
		jitter = -jitter
	}

	// Update average jitter
	if bm.jitterBuffer.TotalCompensations == 0 {
		bm.jitterBuffer.AverageJitter = jitter
	} else {
		bm.jitterBuffer.AverageJitter = (bm.jitterBuffer.AverageJitter + jitter) / 2
	}

	// Check if jitter exceeds threshold
	jitterDetected := jitter > 50*time.Millisecond

	if jitterDetected {
		log.Printf("🔄 Jitter detected: %v (threshold: 50ms)", jitter)
	}

	return jitterDetected
}

// CompensateJitter compensates for jitter
func (bm *BufferManager) CompensateJitter(terminalID string) error {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	if bm.jitterBuffer == nil {
		return fmt.Errorf("jitter buffer not initialized")
	}

	bm.jitterBuffer.CompensationActive = true
	bm.jitterBuffer.LastCompensationTime = time.Now()
	bm.jitterBuffer.TotalCompensations++

	log.Printf("🔄 Jitter compensation activated for terminal: %s", terminalID)

	return nil
}

// updateMetrics updates buffer manager metrics
func (bm *BufferManager) updateMetrics(event string, success bool) {
	bm.metrics.mu.Lock()
	defer bm.metrics.mu.Unlock()

	switch event {
	case "data_added":
		bm.metrics.TotalBufferOperations++
	case "data_read":
		bm.metrics.TotalBufferOperations++
	case "buffer_underrun":
		bm.metrics.BufferUnderruns++
	case "buffer_overrun":
		bm.metrics.BufferOverruns++
	case "jitter_compensation":
		bm.metrics.JitterCompensations++
	}

	// Update average buffer level
	if bm.buffer != nil {
		if bm.metrics.AverageBufferLevel == 0 {
			bm.metrics.AverageBufferLevel = bm.buffer.CurrentLevel
		} else {
			bm.metrics.AverageBufferLevel = (bm.metrics.AverageBufferLevel + bm.buffer.CurrentLevel) / 2
		}
	}

	// Update average jitter
	if bm.jitterBuffer != nil {
		if bm.metrics.AverageJitter == 0 {
			bm.metrics.AverageJitter = bm.jitterBuffer.AverageJitter
		} else {
			bm.metrics.AverageJitter = (bm.metrics.AverageJitter + bm.jitterBuffer.AverageJitter) / 2
		}
	}

	// Update buffer efficiency
	totalOps := bm.metrics.TotalBufferOperations
	if totalOps > 0 {
		successfulOps := totalOps - bm.metrics.BufferUnderruns - bm.metrics.BufferOverruns
		bm.metrics.BufferEfficiency = float64(successfulOps) / float64(totalOps)
	}

	bm.metrics.LastUpdated = time.Now()
}

// GetMetrics returns buffer manager metrics
func (bm *BufferManager) GetMetrics() *BufferManagerMetrics {
	bm.metrics.mu.RLock()
	defer bm.metrics.mu.RUnlock()
	
	metrics := *bm.metrics
	return &metrics
}

// ResetBuffer resets the buffer
func (bm *BufferManager) ResetBuffer() error {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	if bm.buffer == nil {
		return fmt.Errorf("buffer not initialized")
	}

	// Clear buffer data
	bm.buffer.Data = bm.buffer.Data[:0]
	bm.buffer.WritePosition = 0
	bm.buffer.ReadPosition = 0
	bm.buffer.CurrentLevel = 0.0
	bm.buffer.IsBuffering = false
	bm.buffer.LastWriteTime = time.Now()
	bm.buffer.LastReadTime = time.Now()

	log.Printf("🔄 Buffer reset completed")

	return nil
}

// ResetJitterBuffer resets the jitter buffer
func (bm *BufferManager) ResetJitterBuffer() error {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	if bm.jitterBuffer == nil {
		return fmt.Errorf("jitter buffer not initialized")
	}

	// Clear jitter buffer data
	bm.jitterBuffer.Data = bm.jitterBuffer.Data[:0]
	bm.jitterBuffer.CurrentLevel = 0.0
	bm.jitterBuffer.CompensationActive = false
	bm.jitterBuffer.LastCompensationTime = time.Now()

	log.Printf("🔄 Jitter buffer reset completed")

	return nil
}

// Close closes the buffer manager
func (bm *BufferManager) Close() error {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	bm.buffer = nil
	bm.jitterBuffer = nil

	log.Println("🔌 Buffer manager closed")
	return nil
}

// PerformanceMonitor implementation

// StartMonitoring starts performance monitoring
func (pm *PerformanceMonitor) StartMonitoring(terminals []*Terminal) {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	pm.terminals = terminals

	// Initialize performance history for each terminal
	for _, terminal := range terminals {
		if pm.performanceHistory[terminal.TerminalID] == nil {
			pm.performanceHistory[terminal.TerminalID] = &PerformanceHistory{
				TerminalID:      terminal.TerminalID,
				TransferRates:   make([]float64, 0, 100),
				ResponseTimes:   make([]time.Duration, 0, 100),
				SuccessRates:    make([]float64, 0, 100),
				LastUpdated:     time.Now(),
				PerformanceTrend: "stable",
			}
		}
	}

	log.Printf("🔍 Started performance monitoring for %d terminals", len(terminals))
}

// MonitorTerminal monitors a single terminal
func (pm *PerformanceMonitor) MonitorTerminal(terminal *Terminal) float64 {
	terminal.mu.RLock()
	defer terminal.mu.RUnlock()

	// Get current performance metrics
	transferRate := terminal.AverageTransferRate
	responseTime := terminal.ResponseTime
	successRate := terminal.SuccessRate

	// Update performance history
	history := pm.performanceHistory[terminal.TerminalID]
	if history != nil {
		history.mu.Lock()
		
		// Add current metrics to history
		history.TransferRates = append(history.TransferRates, transferRate)
		history.ResponseTimes = append(history.ResponseTimes, responseTime)
		history.SuccessRates = append(history.SuccessRates, successRate)
		
		// Keep only last 100 measurements
		if len(history.TransferRates) > 100 {
			history.TransferRates = history.TransferRates[1:]
			history.ResponseTimes = history.ResponseTimes[1:]
			history.SuccessRates = history.SuccessRates[1:]
		}
		
		// Calculate averages
		var totalTransferRate float64
		var totalResponseTime time.Duration
		var totalSuccessRate float64
		
		for i := 0; i < len(history.TransferRates); i++ {
			totalTransferRate += history.TransferRates[i]
			totalResponseTime += history.ResponseTimes[i]
			totalSuccessRate += history.SuccessRates[i]
		}
		
		count := float64(len(history.TransferRates))
		if count > 0 {
			history.AverageTransferRate = totalTransferRate / count
			history.AverageResponseTime = totalResponseTime / time.Duration(count)
			history.AverageSuccessRate = totalSuccessRate / count
		}
		
		// Update performance trend
		history.PerformanceTrend = pm.calculatePerformanceTrend(history)
		history.LastUpdated = time.Now()
		
		history.mu.Unlock()
	}

	// Calculate overall performance score
	transferRateScore := math.Min(1.0, transferRate/100.0) // Normalize to 100MB/s
	responseTimeScore := math.Max(0.0, 1.0-float64(responseTime.Milliseconds())/100.0) // Lower is better
	performanceScore := (transferRateScore*0.4 + responseTimeScore*0.3 + successRate*0.3)

	return performanceScore
}

// calculatePerformanceTrend calculates performance trend
func (pm *PerformanceMonitor) calculatePerformanceTrend(history *PerformanceHistory) string {
	if len(history.TransferRates) < 10 {
		return "stable"
	}

	// Compare recent performance with older performance
	recent := history.TransferRates[len(history.TransferRates)-5:]
	older := history.TransferRates[len(history.TransferRates)-10 : len(history.TransferRates)-5]

	var recentAvg, olderAvg float64

	for _, rate := range recent {
		recentAvg += rate
	}
	recentAvg /= float64(len(recent))

	for _, rate := range older {
		olderAvg += rate
	}
	olderAvg /= float64(len(older))

	// Determine trend
	diff := (recentAvg - olderAvg) / olderAvg

	if diff > 0.1 {
		return "improving"
	} else if diff < -0.1 {
		return "degrading"
	}

	return "stable"
}

// GetTerminalPerformance returns terminal performance
func (pm *PerformanceMonitor) GetTerminalPerformance() map[string]float64 {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	performance := make(map[string]float64)

	for _, terminal := range pm.terminals {
		score := pm.MonitorTerminal(terminal)
		performance[terminal.TerminalID] = score
	}

	return performance
}

// TriggerAlert triggers a performance alert
func (pm *PerformanceMonitor) TriggerAlert(terminalID, alertType string, metric, threshold float64) {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	alert := &PerformanceAlert{
		AlertID:    uuid.New(),
		TerminalID: terminalID,
		Type:       alertType,
		Severity:   pm.determineSeverity(alertType, metric, threshold),
		Message:    fmt.Sprintf("Terminal %s %s: %.2f (threshold: %.2f)", terminalID, alertType, metric, threshold),
		Metric:     metric,
		Threshold:  threshold,
		CreatedAt:  time.Now(),
		IsActive:   true,
	}

	pm.activeAlerts[alert.AlertID.String()] = alert
	pm.metrics.PerformanceAlerts++

	log.Printf("🚨 Performance alert triggered: %s", alert.Message)
}

// determineSeverity determines alert severity
func (pm *PerformanceMonitor) determineSeverity(alertType string, metric, threshold float64) string {
	ratio := metric / threshold

	switch alertType {
	case "slow":
		if ratio < 0.5 {
			return "critical"
		} else if ratio < 0.8 {
			return "high"
		} else {
			return "medium"
		}
	case "unresponsive":
		return "critical"
	case "failing":
		return "critical"
	default:
		return "low"
	}
}

// GetActiveAlerts returns active alerts
func (pm *PerformanceMonitor) GetActiveAlerts() []*PerformanceAlert {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	alerts := make([]*PerformanceAlert, 0, len(pm.activeAlerts))
	for _, alert := range pm.activeAlerts {
		if alert.IsActive {
			alerts = append(alerts, alert)
		}
	}

	return alerts
}

// GetMetrics returns performance monitor metrics
func (pm *PerformanceMonitor) GetMetrics() *PerformanceMonitorMetrics {
	pm.metrics.mu.RLock()
	defer pm.metrics.mu.RUnlock()
	
	metrics := *pm.metrics
	return &metrics
}

// Close closes the performance monitor
func (pm *PerformanceMonitor) Close() error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	pm.terminals = nil
	pm.performanceHistory = make(map[string]*PerformanceHistory)
	pm.activeAlerts = make(map[string]*PerformanceAlert)

	log.Println("🔌 Performance monitor closed")
	return nil
}
