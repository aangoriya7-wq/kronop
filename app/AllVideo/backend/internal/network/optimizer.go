package network

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type Optimizer struct {
	mu             sync.RWMutex
	currentQuality string
	bandwidth      float64
	latency        time.Duration
	packetLoss     float64
	lastTest       time.Time
	history        []NetworkMeasurement
}

type NetworkMeasurement struct {
	Timestamp    time.Time
	Bandwidth    float64 // Mbps
	Latency      time.Duration
	PacketLoss   float64 // percentage
	Quality      string
}

type ConnectionTest struct {
	URL           string        `json:"url"`
	TestDuration  time.Duration `json:"testDuration"`
	DownloadSize  int64         `json:"downloadSize"`
	UploadSize    int64         `json:"uploadSize"`
}

type NetworkQuality struct {
	Quality       string  `json:"quality"`
	Bandwidth     float64 `json:"bandwidth"`     // Mbps
	Latency       string  `json:"latency"`       // ms
	PacketLoss    float64 `json:"packetLoss"`    // percentage
	Recommended   string  `json:"recommended"`   // video quality
	BufferSize    int     `json:"bufferSize"`    // seconds
	PrefetchCount int     `json:"prefetchCount"` // number of segments
}

func NewOptimizer() *Optimizer {
	return &Optimizer{
		currentQuality: "unknown",
		bandwidth:      0,
		latency:        0,
		packetLoss:     0,
		history:        make([]NetworkMeasurement, 0, 100),
	}
}

// TestConnection performs comprehensive network test
func (o *Optimizer) TestConnection(c *gin.Context) {
	var test ConnectionTest
	if err := c.ShouldBindJSON(&test); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set defaults if not provided
	if test.URL == "" {
		test.URL = "https://httpbin.org/bytes/1048576" // 1MB test file
	}
	if test.TestDuration == 0 {
		test.TestDuration = 5 * time.Second
	}
	if test.DownloadSize == 0 {
		test.DownloadSize = 1048576 // 1MB
	}

	// Perform network test
	measurement := o.performNetworkTest(test.URL, test.TestDuration, test.DownloadSize)
	
	// Update current state
	o.mu.Lock()
	o.bandwidth = measurement.Bandwidth
	o.latency = measurement.Latency
	o.packetLoss = measurement.PacketLoss
	o.currentQuality = measurement.Quality
	o.lastTest = time.Now()
	
	// Add to history (keep last 100 measurements)
	o.history = append(o.history, measurement)
	if len(o.history) > 100 {
		o.history = o.history[1:]
	}
	o.mu.Unlock()

	c.JSON(http.StatusOK, measurement)
}

// GetNetworkQuality returns current network quality assessment
func (o *Optimizer) GetNetworkQuality(c *gin.Context) {
	o.mu.RLock()
	quality := NetworkQuality{
		Quality:       o.currentQuality,
		Bandwidth:     o.bandwidth,
		Latency:       fmt.Sprintf("%.0f", float64(o.latency.Nanoseconds())/1000000),
		PacketLoss:    o.packetLoss,
		Recommended:   o.getRecommendedQuality(),
		BufferSize:    o.getOptimalBufferSize(),
		PrefetchCount: o.getOptimalPrefetchCount(),
	}
	o.mu.RUnlock()

	c.JSON(http.StatusOK, quality)
}

// OptimizeStreaming returns streaming parameters based on network conditions
func (o *Optimizer) OptimizeStreaming(c *gin.Context) {
	o.mu.RLock()
	
	optimization := map[string]interface{}{
		"quality":        o.getRecommendedQuality(),
		"bufferSize":     o.getOptimalBufferSize(),
		"prefetchCount":  o.getOptimalPrefetchCount(),
		"segmentDuration": o.getOptimalSegmentDuration(),
		"retryCount":     o.getOptimalRetryCount(),
		"timeout":        o.getOptimalTimeout(),
		"concurrentDownloads": o.getOptimalConcurrentDownloads(),
		"adaptiveBitrate": true,
		"lowLatencyMode": o.packetLoss > 5.0,
	}
	
	o.mu.RUnlock()

	c.JSON(http.StatusOK, optimization)
}

// GetCurrentQuality returns current network quality
func (o *Optimizer) GetCurrentQuality() string {
	o.mu.RLock()
	defer o.mu.RUnlock()
	return o.currentQuality
}

// performNetworkTest conducts comprehensive network assessment
func (o *Optimizer) performNetworkTest(url string, duration time.Duration, size int64) NetworkMeasurement {
	ctx, cancel := context.WithTimeout(context.Background(), duration)
	defer cancel()

	// Test download speed
	bandwidth := o.testDownloadSpeed(ctx, url, size)
	
	// Test latency
	latency := o.testLatency(ctx, url)
	
	// Estimate packet loss (simplified)
	packetLoss := o.estimatePacketLoss()
	
	// Determine network quality
	quality := o.determineQuality(bandwidth, latency, packetLoss)

	return NetworkMeasurement{
		Timestamp:  time.Now(),
		Bandwidth:  bandwidth,
		Latency:    latency,
		PacketLoss: packetLoss,
		Quality:    quality,
	}
}

// testDownloadSpeed measures actual download bandwidth
func (o *Optimizer) testDownloadSpeed(ctx context.Context, url string, size int64) float64 {
	start := time.Now()
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return 0
	}
	
	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	
	resp, err := client.Do(req)
	if err != nil {
		return 0
	}
	defer resp.Body.Close()
	
	// Read response to measure actual download
	buffer := make([]byte, 8192)
	totalBytes := 0
	
	for {
		select {
		case <-ctx.Done():
			goto calculate
		default:
			n, err := resp.Body.Read(buffer)
			if err != nil || n == 0 {
				goto calculate
			}
			totalBytes += n
		}
	}
	
calculate:
	duration := time.Since(start)
	if duration.Seconds() == 0 {
		return 0
	}
	
	// Calculate bandwidth in Mbps
	bandwidthMbps := (float64(totalBytes) * 8) / (1024 * 1024 * duration.Seconds())
	return bandwidthMbps
}

// testLatency measures network latency
func (o *Optimizer) testLatency(ctx context.Context, url string) time.Duration {
	// Use multiple pings for accuracy
	pings := make([]time.Duration, 0, 5)
	
	for i := 0; i < 5; i++ {
		start := time.Now()
		
		req, err := http.NewRequestWithContext(ctx, "HEAD", url, nil)
		if err != nil {
			continue
		}
		
		client := &http.Client{
			Timeout: 2 * time.Second,
		}
		
		resp, err := client.Do(req)
		if err != nil {
			continue
		}
		resp.Body.Close()
		
		latency := time.Since(start)
		pings = append(pings, latency)
	}
	
	if len(pings) == 0 {
		return 0
	}
	
	// Return median latency
	return median(pings)
}

// estimatePacketLoss provides packet loss estimation
func (o *Optimizer) estimatePacketLoss() float64 {
	// In a real implementation, this would use ICMP or custom protocol
	// For now, provide a reasonable estimate based on connection stability
	
	// Simulate packet loss based on multiple connection attempts
	failures := 0
	attempts := 10
	
	for i := 0; i < attempts; i++ {
		client := &http.Client{
			Timeout: 1 * time.Second,
		}
		
		resp, err := client.Get("https://httpbin.org/status/200")
		if err != nil {
			failures++
		} else {
			resp.Body.Close()
		}
	}
	
	return (float64(failures) / float64(attempts)) * 100
}

// determineQuality classifies network quality based on measurements
func (o *Optimizer) determineQuality(bandwidth float64, latency time.Duration, packetLoss float64) string {
	// Priority order: Packet Loss > Latency > Bandwidth
	
	// High packet loss indicates poor connection
	if packetLoss > 10.0 {
		return "2g"
	}
	
	// High latency indicates poor connection
	if latency > 1000*time.Millisecond {
		return "2g"
	} else if latency > 500*time.Millisecond {
		return "3g"
	}
	
	// Bandwidth-based classification
	switch {
	case bandwidth < 0.1: // < 100 kbps
		return "2g"
	case bandwidth < 0.5: // < 500 kbps
		return "3g"
	case bandwidth < 2.0: // < 2 Mbps
		return "4g"
	case bandwidth < 10.0: // < 10 Mbps
		return "wifi"
	default: // >= 10 Mbps
		return "4g+"
	}
}

// getRecommendedQuality returns optimal video quality for current network
func (o *Optimizer) getRecommendedQuality() string {
	switch o.currentQuality {
	case "2g":
		return "144p"
	case "3g":
		return "240p"
	case "4g":
		return "480p"
	case "wifi":
		return "1080p"
	case "4g+":
		return "4k"
	default:
		return "360p"
	}
}

// getOptimalBufferSize returns optimal buffer size in seconds
func (o *Optimizer) getOptimalBufferSize() int {
	switch o.currentQuality {
	case "2g":
		return 30 // 30 seconds buffer for 2G
	case "3g":
		return 20 // 20 seconds buffer for 3G
	case "4g":
		return 10 // 10 seconds buffer for 4G
	default:
		return 5 // 5 seconds buffer for good connections
	}
}

// getOptimalPrefetchCount returns optimal number of segments to prefetch
func (o *Optimizer) getOptimalPrefetchCount() int {
	switch o.currentQuality {
	case "2g":
		return 10 // Prefetch more segments for 2G
	case "3g":
		return 8
	case "4g":
		return 5
	default:
		return 3
	}
}

// getOptimalSegmentDuration returns optimal segment duration
func (o *Optimizer) getOptimalSegmentDuration() int {
	switch o.currentQuality {
	case "2g":
		return 4 // Shorter segments for better adaptation
	case "3g":
		return 6
	default:
		return 10 // Standard segment duration
	}
}

// getOptimalRetryCount returns optimal retry count for failed requests
func (o *Optimizer) getOptimalRetryCount() int {
	switch o.currentQuality {
	case "2g":
		return 5 // More retries for poor connections
	case "3g":
		return 3
	default:
		return 2
	}
}

// getOptimalTimeout returns optimal timeout for requests
func (o *Optimizer) getOptimalTimeout() int {
	switch o.currentQuality {
	case "2g":
		return 30 // Longer timeout for 2G
	case "3g":
		return 20
	default:
		return 10
	}
}

// getOptimalConcurrentDownloads returns optimal concurrent download count
func (o *Optimizer) getOptimalConcurrentDownloads() int {
	switch o.currentQuality {
	case "2g":
		return 1 // Sequential downloads for 2G
	case "3g":
		return 2
	default:
		return 4 // More concurrent downloads for good connections
	}
}

// median calculates median of duration slice
func median(durations []time.Duration) time.Duration {
	if len(durations) == 0 {
		return 0
	}
	
	// Simple median calculation
	for i := 0; i < len(durations); i++ {
		for j := i + 1; j < len(durations); j++ {
			if durations[i] > durations[j] {
				durations[i], durations[j] = durations[j], durations[i]
			}
		}
	}
	
	mid := len(durations) / 2
	if len(durations)%2 == 0 {
		return (durations[mid-1] + durations[mid]) / 2
	}
	return durations[mid]
}
