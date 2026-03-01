package buffer

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"kronop-backend/internal/network"
)

type Manager struct {
	mu               sync.RWMutex
	buffers          map[string]*VideoBuffer
	networkOptimizer *network.Optimizer
}

type VideoBuffer struct {
	VideoID      string
	Quality      string
	Segments     map[int]*BufferSegment
	CurrentIndex int
	TotalSegments int
	BufferHealth float64 // 0-100 percentage
	LastUpdate   time.Time
	Strategy     BufferStrategy
}

type BufferSegment struct {
	Index       int
	Quality     string
	Data        []byte
	Size        int64
	Status      string // "empty", "buffering", "ready", "error"
	LoadTime    time.Time
	AccessTime  time.Time
	RetryCount  int
	Priority    int
}

type BufferStrategy struct {
	TargetBufferTime int         // seconds
	MinBufferTime    int         // seconds
	MaxBufferTime    int         // seconds
	PrefetchCount    int         // number of segments to prefetch
	SegmentDuration  int         // seconds per segment
	AdaptiveQuality  bool        // enable adaptive bitrate
	AggressiveMode   bool        // aggressive buffering for poor networks
	NetworkQuality   string      // current network quality
}

type BufferStatus struct {
	VideoID         string    `json:"videoId"`
	Quality         string    `json:"quality"`
	BufferedTime    float64   `json:"bufferedTime"`    // seconds
	BufferHealth    float64   `json:"bufferHealth"`    // percentage
	ReadySegments   int       `json:"readySegments"`
	TotalSegments   int       `json:"totalSegments"`
	CurrentIndex    int       `json:"currentIndex"`
	Strategy        BufferStrategy `json:"strategy"`
	EstimatedTimeLeft float64 `json:"estimatedTimeLeft"` // seconds
	NetworkQuality  string    `json:"networkQuality"`
}

func NewManager(networkOptimizer *network.Optimizer) *Manager {
	return &Manager{
		buffers:          make(map[string]*VideoBuffer),
		networkOptimizer: networkOptimizer,
	}
}

// CreateBuffer initializes buffer for video playback
func (m *Manager) CreateBuffer(c *gin.Context) {
	var request struct {
		VideoID      string `json:"videoId" binding:"required"`
		Quality      string `json:"quality"`
		TotalSegments int   `json:"totalSegments" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Auto-select quality if not specified
	if request.Quality == "" {
		request.Quality = m.networkOptimizer.GetCurrentQuality()
	}
	
	// Create buffer strategy based on network conditions
	strategy := m.createBufferStrategy(request.Quality)
	
	// Initialize video buffer
	buffer := &VideoBuffer{
		VideoID:       request.VideoID,
		Quality:       request.Quality,
		Segments:      make(map[int]*BufferSegment),
		CurrentIndex:  0,
		TotalSegments: request.TotalSegments,
		BufferHealth:  0.0,
		LastUpdate:    time.Now(),
		Strategy:      strategy,
	}
	
	// Initialize segment slots
	for i := 0; i < request.TotalSegments; i++ {
		buffer.Segments[i] = &BufferSegment{
			Index:      i,
			Quality:    request.Quality,
			Status:     "empty",
			Priority:   m.calculateSegmentPriority(i, request.TotalSegments),
		}
	}
	
	m.mu.Lock()
	m.buffers[request.VideoID] = buffer
	m.mu.Unlock()
	
	// Start buffering process
	go m.startBuffering(request.VideoID)
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Buffer created successfully",
		"bufferId": request.VideoID,
		"strategy": strategy,
	})
}

// GetBufferStatus returns current buffer status
func (m *Manager) GetBufferStatus(c *gin.Context) {
	videoID := c.Param("videoId")
	
	m.mu.RLock()
	buffer, exists := m.buffers[videoID]
	m.mu.RUnlock()
	
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Buffer not found"})
		return
	}
	
	status := m.calculateBufferStatus(buffer)
	c.JSON(http.StatusOK, status)
}

// UpdateBufferQuality changes video quality dynamically
func (m *Manager) UpdateBufferQuality(c *gin.Context) {
	var request struct {
		VideoID string `json:"videoId" binding:"required"`
		Quality string `json:"quality" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	m.mu.Lock()
	defer m.mu.Unlock()
	
	buffer, exists := m.buffers[request.VideoID]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Buffer not found"})
		return
	}
	
	// Update quality and strategy
	buffer.Quality = request.Quality
	buffer.Strategy = m.createBufferStrategy(request.Quality)
	
	// Mark existing segments for rebuffering if quality changed
	for _, segment := range buffer.Segments {
		if segment.Quality != request.Quality && segment.Status == "ready" {
			segment.Status = "empty"
			segment.Quality = request.Quality
		}
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Quality updated successfully"})
}

// createBufferStrategy creates optimal buffering strategy based on network
func (m *Manager) createBufferStrategy(quality string) BufferStrategy {
	networkQuality := m.networkOptimizer.GetCurrentQuality()
	
	strategy := BufferStrategy{
		AdaptiveQuality: true,
		NetworkQuality:  networkQuality,
	}
	
	switch networkQuality {
	case "2g":
		strategy.TargetBufferTime = 60  // 1 minute buffer
		strategy.MinBufferTime = 30     // 30 seconds minimum
		strategy.MaxBufferTime = 120    // 2 minutes maximum
		strategy.PrefetchCount = 15     // Aggressive prefetching
		strategy.SegmentDuration = 4    // Short segments
		strategy.AggressiveMode = true  // Aggressive buffering
	case "3g":
		strategy.TargetBufferTime = 30  // 30 seconds buffer
		strategy.MinBufferTime = 15     // 15 seconds minimum
		strategy.MaxBufferTime = 60     // 1 minute maximum
		strategy.PrefetchCount = 8
		strategy.SegmentDuration = 6
		strategy.AggressiveMode = true
	case "4g":
		strategy.TargetBufferTime = 15  // 15 seconds buffer
		strategy.MinBufferTime = 8      // 8 seconds minimum
		strategy.MaxBufferTime = 30     // 30 seconds maximum
		strategy.PrefetchCount = 5
		strategy.SegmentDuration = 10
		strategy.AggressiveMode = false
	default: // wifi, 4g+
		strategy.TargetBufferTime = 10  // 10 seconds buffer
		strategy.MinBufferTime = 5      // 5 seconds minimum
		strategy.MaxBufferTime = 20     // 20 seconds maximum
		strategy.PrefetchCount = 3
		strategy.SegmentDuration = 10
		strategy.AggressiveMode = false
	}
	
	return strategy
}

// startBuffering initiates the buffering process
func (m *Manager) startBuffering(videoID string) {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()
	
	for range ticker.C {
		m.mu.RLock()
		buffer, exists := m.buffers[videoID]
		m.mu.RUnlock()
		
		if !exists {
			return
		}
		
		// Check if buffering is complete
		if buffer.CurrentIndex >= buffer.TotalSegments {
			return
		}
		
		// Buffer next segments
		m.bufferNextSegments(buffer)
		
		// Update buffer health
		m.updateBufferHealth(buffer)
		
		// Adaptive quality adjustment
		if buffer.Strategy.AdaptiveQuality {
			m.adjustQualityIfNeeded(buffer)
		}
	}
}

// bufferNextSegments buffers the next set of segments
func (m *Manager) bufferNextSegments(buffer *VideoBuffer) {
	prefetchCount := buffer.Strategy.PrefetchCount
	startIndex := buffer.CurrentIndex
	endIndex := startIndex + prefetchCount
	
	if endIndex > buffer.TotalSegments {
		endIndex = buffer.TotalSegments
	}
	
	// Buffer segments in priority order
	for i := startIndex; i < endIndex; i++ {
		segment := buffer.Segments[i]
		
		if segment.Status == "empty" || segment.Status == "error" {
			go m.bufferSegment(buffer, segment)
		}
	}
}

// bufferSegment handles individual segment buffering
func (m *Manager) bufferSegment(buffer *VideoBuffer, segment *BufferSegment) {
	segment.Status = "buffering"
	segment.LoadTime = time.Now()
	
	// Simulate segment loading (in production, fetch from CDN/cache)
	time.Sleep(time.Duration(buffer.Strategy.SegmentDuration*100) * time.Millisecond)
	
	// Update segment status
	segment.Status = "ready"
	segment.AccessTime = time.Now()
	segment.Data = []byte(fmt.Sprintf("segment-data-%d-%s", segment.Index, segment.Quality))
	segment.Size = int64(len(segment.Data))
	
	buffer.LastUpdate = time.Now()
}

// updateBufferHealth calculates buffer health percentage
func (m *Manager) updateBufferHealth(buffer *VideoBuffer) {
	readyCount := 0
	totalDuration := 0.0
	
	for i := buffer.CurrentIndex; i < buffer.TotalSegments; i++ {
		segment := buffer.Segments[i]
		if segment.Status == "ready" {
			readyCount++
			totalDuration += float64(buffer.Strategy.SegmentDuration)
		}
	}
	
	// Calculate health based on buffered time vs target
	bufferedTime := totalDuration
	targetTime := float64(buffer.Strategy.TargetBufferTime)
	
	if bufferedTime >= targetTime {
		buffer.BufferHealth = 100.0
	} else {
		buffer.BufferHealth = (bufferedTime / targetTime) * 100
	}
}

// adjustQualityIfNeeded adjusts video quality based on buffer health
func (m *Manager) adjustQualityIfNeeded(buffer *VideoBuffer) {
	// Downgrade if buffer health is poor
	if buffer.BufferHealth < 20.0 && buffer.Strategy.AggressiveMode {
		newQuality := m.downgradeQuality(buffer.Quality)
		if newQuality != buffer.Quality {
			buffer.Quality = newQuality
			buffer.Strategy = m.createBufferStrategy(newQuality)
		}
	}
	
	// Upgrade if buffer health is excellent and network is good
	if buffer.BufferHealth > 80.0 && !buffer.Strategy.AggressiveMode {
		newQuality := m.upgradeQuality(buffer.Quality)
		if newQuality != buffer.Quality {
			buffer.Quality = newQuality
			buffer.Strategy = m.createBufferStrategy(newQuality)
		}
	}
}

// calculateSegmentPriority determines segment loading priority
func (m *Manager) calculateSegmentPriority(index, totalSegments int) int {
	// Higher priority for current and next few segments
	if index <= 5 {
		return 3 // High priority
	} else if index <= 15 {
		return 2 // Medium priority
	} else {
		return 1 // Low priority
	}
}

// calculateBufferStatus generates buffer status report
func (m *Manager) calculateBufferStatus(buffer *VideoBuffer) BufferStatus {
	readyCount := 0
	bufferedTime := 0.0
	
	for i := buffer.CurrentIndex; i < buffer.TotalSegments; i++ {
		segment := buffer.Segments[i]
		if segment.Status == "ready" {
			readyCount++
			bufferedTime += float64(buffer.Strategy.SegmentDuration)
		}
	}
	
	// Estimate time left to buffer
	segmentsLeft := buffer.TotalSegments - buffer.CurrentIndex
	estimatedTimeLeft := float64(segmentsLeft) * float64(buffer.Strategy.SegmentDuration)
	
	return BufferStatus{
		VideoID:          buffer.VideoID,
		Quality:          buffer.Quality,
		BufferedTime:     bufferedTime,
		BufferHealth:     buffer.BufferHealth,
		ReadySegments:    readyCount,
		TotalSegments:    buffer.TotalSegments,
		CurrentIndex:     buffer.CurrentIndex,
		Strategy:         buffer.Strategy,
		EstimatedTimeLeft: estimatedTimeLeft,
		NetworkQuality:   buffer.Strategy.NetworkQuality,
	}
}

// downgradeQuality reduces video quality for better buffering
func (m *Manager) downgradeQuality(current string) string {
	qualityMap := map[string]string{
		"4k":     "1080p",
		"1080p":  "720p",
		"720p":   "480p",
		"480p":   "360p",
		"360p":   "240p",
		"240p":   "144p",
		"144p":   "144p", // Lowest quality
	}
	
	if newQuality, exists := qualityMap[current]; exists {
		return newQuality
	}
	return current
}

// upgradeQuality increases video quality if conditions allow
func (m *Manager) upgradeQuality(current string) string {
	qualityMap := map[string]string{
		"144p":   "240p",
		"240p":   "360p",
		"360p":   "480p",
		"480p":   "720p",
		"720p":   "1080p",
		"1080p":  "4k",
		"4k":     "4k", // Highest quality
	}
	
	if newQuality, exists := qualityMap[current]; exists {
		return newQuality
	}
	return current
}

// AdvanceCurrentIndex moves playback forward
func (m *Manager) AdvanceCurrentIndex(videoID string, newIndex int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	if buffer, exists := m.buffers[videoID]; exists {
		if newIndex >= 0 && newIndex < buffer.TotalSegments {
			buffer.CurrentIndex = newIndex
			buffer.LastUpdate = time.Now()
		}
	}
}

// CleanupBuffer removes buffer for completed playback
func (m *Manager) CleanupBuffer(videoID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	delete(m.buffers, videoID)
}
