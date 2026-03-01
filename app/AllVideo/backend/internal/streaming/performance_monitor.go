/**
 * Performance Monitor - Real-time Performance Tracking
 * 
 * Monitors streaming performance in real-time
 * Tracks transfer rates, latency, and efficiency
 * Provides alerts for performance issues
 * 
 * Features:
 * - Real-time performance monitoring
 * - Alert system for performance issues
 * - Historical performance tracking
 * - Performance analytics
 */

package streaming

import (
	"fmt"
	"log"
	"sync"
	"time"
)

// CheckAlerts checks for performance alerts
func (pm *PerformanceMonitor) CheckAlerts(metrics *StreamingMetrics) {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	currentTime := time.Now()

	// Check transfer rate alert
	pm.checkTransferRateAlert(metrics, currentTime)

	// Check latency alert
	pm.checkLatencyAlert(metrics, currentTime)

	// Check efficiency alert
	pm.checkEfficiencyAlert(metrics, currentTime)

	// Check failure rate alert
	pm.checkFailureRateAlert(metrics, currentTime)

	// Create metrics snapshot
	pm.createMetricsSnapshot(metrics, currentTime)

	// Clean up old alerts
	pm.cleanupOldAlerts(currentTime)
}

// checkTransferRateAlert checks transfer rate alert
func (pm *PerformanceMonitor) checkTransferRateAlert(metrics *StreamingMetrics, currentTime time.Time) {
	metricName := "transfer_rate"
	currentValue := metrics.AverageTransferRate
	threshold := pm.alertThresholds.MinTransferRate

	var status string
	var alertType string

	if currentValue < threshold*0.5 {
		status = "critical"
		alertType = "critical"
	} else if currentValue < threshold*0.8 {
		status = "warning"
		alertType = "warning"
	} else {
		status = "normal"
		alertType = "info"
	}

	// Update metric
	pm.updateMetric(metricName, currentValue, "MB/s", threshold, status, currentTime)

	// Create alert if needed
	if status != "normal" {
		pm.createAlert(metricName, alertType, fmt.Sprintf("Transfer rate is %.2f MB/s, below threshold %.2f MB/s", currentValue, threshold), currentValue, threshold, currentTime)
	}
}

// checkLatencyAlert checks latency alert
func (pm *PerformanceMonitor) checkLatencyAlert(metrics *StreamingMetrics, currentTime time.Time) {
	metricName := "latency"
	currentValue := float64(metrics.AverageLatency.Milliseconds())
	threshold := float64(pm.alertThresholds.MaxLatency.Milliseconds())

	var status string
	var alertType string

	if currentValue > threshold*2 {
		status = "critical"
		alertType = "critical"
	} else if currentValue > threshold*1.5 {
		status = "warning"
		alertType = "warning"
	} else {
		status = "normal"
		alertType = "info"
	}

	// Update metric
	pm.updateMetric(metricName, currentValue, "ms", threshold, status, currentTime)

	// Create alert if needed
	if status != "normal" {
		pm.createAlert(metricName, alertType, fmt.Sprintf("Latency is %.1f ms, above threshold %.1f ms", currentValue, threshold), currentValue, threshold, currentTime)
	}
}

// checkEfficiencyAlert checks efficiency alert
func (pm *PerformanceMonitor) checkEfficiencyAlert(metrics *StreamingMetrics, currentTime time.Time) {
	metricName := "efficiency"
	currentValue := metrics.ParallelEfficiency
	threshold := pm.alertThresholds.MinEfficiency

	var status string
	var alertType string

	if currentValue < threshold*0.5 {
		status = "critical"
		alertType = "critical"
	} else if currentValue < threshold*0.8 {
		status = "warning"
		alertType = "warning"
	} else {
		status = "normal"
		alertType = "info"
	}

	// Update metric
	pm.updateMetric(metricName, currentValue, "%", threshold, status, currentTime)

	// Create alert if needed
	if status != "normal" {
		pm.createAlert(metricName, alertType, fmt.Sprintf("Efficiency is %.1f%%, below threshold %.1f%%", currentValue*100, threshold*100), currentValue, threshold, currentTime)
	}
}

// checkFailureRateAlert checks failure rate alert
func (pm *PerformanceMonitor) checkFailureRateAlert(metrics *StreamingMetrics, currentTime time.Time) {
	metricName := "failure_rate"
	
	// Calculate failure rate
	totalStreams := metrics.TotalStreams
	completedStreams := metrics.CompletedStreams
	failureRate := 0.0
	
	if totalStreams > 0 {
		failureRate = float64(totalStreams-completedStreams) / float64(totalStreams)
	}

	threshold := pm.alertThresholds.MaxFailureRate

	var status string
	var alertType string

	if failureRate > threshold*2 {
		status = "critical"
		alertType = "critical"
	} else if failureRate > threshold*1.5 {
		status = "warning"
		alertType = "warning"
	} else {
		status = "normal"
		alertType = "info"
	}

	// Update metric
	pm.updateMetric(metricName, failureRate*100, "%", threshold*100, status, currentTime)

	// Create alert if needed
	if status != "normal" {
		pm.createAlert(metricName, alertType, fmt.Sprintf("Failure rate is %.1f%%, above threshold %.1f%%", failureRate*100, threshold*100), failureRate, threshold, currentTime)
	}
}

// updateMetric updates a performance metric
func (pm *PerformanceMonitor) updateMetric(name string, value float64, unit string, threshold float64, status string, currentTime time.Time) {
	metric, exists := pm.metrics[name]
	if !exists {
		metric = &PerformanceMetric{
			MetricID:   fmt.Sprintf("metric_%s", name),
			Name:       name,
			Unit:       unit,
			Threshold:  threshold,
			History:    make([]float64, 0, 100),
		}
		pm.metrics[name] = metric
	}

	metric.Value = value
	metric.Status = status
	metric.LastUpdated = currentTime

	// Add to history (keep last 100 values)
	metric.History = append(metric.History, value)
	if len(metric.History) > 100 {
		metric.History = metric.History[1:]
	}
}

// createAlert creates a performance alert
func (pm *PerformanceMonitor) createAlert(metricName, alertType, message string, value, threshold float64, currentTime time.Time) {
	alertID := fmt.Sprintf("alert_%s_%d", metricName, currentTime.Unix())

	// Check if alert already exists
	if existingAlert, exists := pm.activeAlerts[alertID]; exists {
		// Update existing alert
		existingAlert.Value = value
		existingAlert.CreatedAt = currentTime
		return
	}

	// Create new alert
	alert := &Alert{
		AlertID:    alertID,
		Type:       alertType,
		Severity:   alertType,
		Message:    message,
		Metric:     metricName,
		Value:      value,
		Threshold:  threshold,
		CreatedAt:  currentTime,
		IsActive:   true,
	}

	pm.activeAlerts[alertID] = alert

	log.Printf("🚨 %s Alert: %s", strings.ToUpper(alertType), message)
}

// createMetricsSnapshot creates a metrics snapshot
func (pm *PerformanceMonitor) createMetricsSnapshot(metrics *StreamingMetrics, currentTime time.Time) {
	snapshot := &MetricsSnapshot{
		Timestamp:         currentTime,
		TransferRate:      metrics.AverageTransferRate,
		Latency:           metrics.AverageLatency,
		Efficiency:        metrics.ParallelEfficiency,
		ActiveWorkers:     10, // Default worker count
		CompletedChunks:   metrics.CompletedStreams,
		FailedChunks:      metrics.TotalStreams - metrics.CompletedStreams,
		BufferUtilization: 0.8, // Default buffer utilization
	}

	pm.metricsHistory = append(pm.metricsHistory, *snapshot)

	// Keep only last 1000 snapshots
	if len(pm.metricsHistory) > 1000 {
		pm.metricsHistory = pm.metricsHistory[1:]
	}
}

// cleanupOldAlerts cleans up old alerts
func (pm *PerformanceMonitor) cleanupOldAlerts(currentTime time.Time) {
	for alertID, alert := range pm.activeAlerts {
		// Resolve alerts older than 5 minutes
		if currentTime.Sub(alert.CreatedAt) > 5*time.Minute {
			alert.ResolvedAt = currentTime
			alert.IsActive = false
			delete(pm.activeAlerts, alertID)
		}
	}
}

// GetMetrics returns current performance metrics
func (pm *PerformanceMonitor) GetMetrics() map[string]*PerformanceMetric {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	metrics := make(map[string]*PerformanceMetric)
	for name, metric := range pm.metrics {
		metrics[name] = &PerformanceMetric{
			MetricID:    metric.MetricID,
			Name:        metric.Name,
			Value:       metric.Value,
			Unit:        metric.Unit,
			Threshold:   metric.Threshold,
			Status:      metric.Status,
			LastUpdated: metric.LastUpdated,
			History:     append([]float64{}, metric.History...),
		}
	}

	return metrics
}

// GetActiveAlerts returns active alerts
func (pm *PerformanceMonitor) GetActiveAlerts() []*Alert {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	alerts := make([]*Alert, 0, len(pm.activeAlerts))
	for _, alert := range pm.activeAlerts {
		if alert.IsActive {
			alerts = append(alerts, &Alert{
				AlertID:    alert.AlertID,
				Type:       alert.Type,
				Severity:   alert.Severity,
				Message:    alert.Message,
				Metric:     alert.Metric,
				Value:      alert.Value,
				Threshold:  alert.Threshold,
				CreatedAt:  alert.CreatedAt,
				ResolvedAt: alert.ResolvedAt,
				IsActive:   alert.IsActive,
			})
		}
	}

	// Sort alerts by creation time (newest first)
	sort.Slice(alerts, func(i, j int) bool {
		return alerts[i].CreatedAt.After(alerts[j].CreatedAt)
	})

	return alerts
}

// GetMetricsHistory returns metrics history
func (pm *PerformanceMonitor) GetMetricsHistory(limit int) []MetricsSnapshot {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	if limit <= 0 || limit > len(pm.metricsHistory) {
		limit = len(pm.metricsHistory)
	}

	history := make([]MetricsSnapshot, limit)
	copy(history, pm.metricsHistory[len(pm.metricsHistory)-limit:])
	return history
}

// GetPerformanceSummary returns performance summary
func (pm *PerformanceMonitor) GetPerformanceSummary() *PerformanceSummary {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	summary := &PerformanceSummary{
		Timestamp:         time.Now(),
		TotalMetrics:      len(pm.metrics),
		ActiveAlerts:       0,
		CriticalAlerts:    0,
		WarningAlerts:     0,
		InfoAlerts:         0,
		OverallStatus:     "healthy",
	}

	// Count alerts by severity
	for _, alert := range pm.activeAlerts {
		if alert.IsActive {
			summary.ActiveAlerts++
			switch alert.Severity {
			case "critical":
				summary.CriticalAlerts++
				summary.OverallStatus = "critical"
			case "warning":
				summary.WarningAlerts++
				if summary.OverallStatus == "healthy" {
					summary.OverallStatus = "warning"
				}
			case "info":
				summary.InfoAlerts++
			}
		}
	}

	return summary
}

// PerformanceSummary represents a performance summary
type PerformanceSummary struct {
	Timestamp      time.Time `json:"timestamp"`
	TotalMetrics   int       `json:"total_metrics"`
	ActiveAlerts   int       `json:"active_alerts"`
	CriticalAlerts int       `json:"critical_alerts"`
	WarningAlerts  int       `json:"warning_alerts"`
	InfoAlerts      int       `json:"info_alerts"`
	OverallStatus  string    `json:"overall_status"`
}

// Close closes the performance monitor
func (pm *PerformanceMonitor) Close() error {
	log.Println("🔌 Performance monitor closed")
	return nil
}
