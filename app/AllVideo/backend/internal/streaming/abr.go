package streaming

import (
	"context"
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"kronop-backend/internal/network"
)

type ABRManager struct {
	mu               sync.RWMutex
	networkOptimizer *network.Optimizer
	sessions         map[string]*ABRSession
	qualityProfiles  []QualityProfile
}

type ABRSession struct {
	SessionID      string
	VideoID        string
	CurrentQuality string
	TargetQuality  string
	LastSwitch     time.Time
	SwitchCount    int
	BufferHealth   float64
	NetworkHistory []NetworkMeasurement
	ABRStrategy    ABRStrategy
}

type QualityProfile struct {
	Name         string
	Resolution   string
	Bitrate      int    // kbps
	MinBandwidth int    // kbps
	MaxBandwidth int    // kbps
	Priority     int    // Lower number = higher priority
	Codec        string
}

type NetworkMeasurement struct {
	Timestamp    time.Time
	Bandwidth    float64 // Mbps
	Latency      time.Duration
	PacketLoss   float64 // percentage
	Quality      string
}

type ABRStrategy struct {
	Algorithm        string // "throughput", "buffer", "hybrid"
	SwitchUpThreshold float64 // percentage
	SwitchDownThreshold float64 // percentage
	MinSwitchInterval time.Duration
	BufferThreshold   float64 // percentage
	NetworkWindow     time.Duration // measurement window
}

type ABRDecision struct {
	CurrentQuality string
	TargetQuality  string
	Reason         string
	Confidence     float64 // 0-1
	EstimatedTime  time.Duration
	NetworkQuality string
}

// Quality profiles for adaptive streaming
var (
	QualityProfiles = []QualityProfile{
		{
			Name:         "144p",
			Resolution:   "256x144",
			Bitrate:      200,
			MinBandwidth: 150,
			MaxBandwidth: 300,
			Priority:     7, // Lowest priority
			Codec:        "h264",
		},
		{
			Name:         "240p",
			Resolution:   "426x240",
			Bitrate:      400,
			MinBandwidth: 300,
			MaxBandwidth: 600,
			Priority:     6,
			Codec:        "h264",
		},
		{
			Name:         "360p",
			Resolution:   "640x360",
			Bitrate:      800,
			MinBandwidth: 600,
			MaxBandwidth: 1200,
			Priority:     5,
			Codec:        "h264",
		},
		{
			Name:         "480p",
			Resolution:   "854x480",
			Bitrate:      1200,
			MinBandwidth: 1000,
			MaxBandwidth: 1800,
			Priority:     4,
			Codec:        "h264",
		},
		{
			Name:         "720p",
			Resolution:   "1280x720",
			Bitrate:      2500,
			MinBandwidth: 2000,
			MaxBandwidth: 3500,
			Priority:     3,
			Codec:        "h264",
		},
		{
			Name:         "1080p",
			Resolution:   "1920x1080",
			Bitrate:      5000,
			MinBandwidth: 4000,
			MaxBandwidth: 7000,
			Priority:     2,
			Codec:        "h264",
		},
		{
			Name:         "4k",
			Resolution:   "3840x2160",
			Bitrate:      15000,
			MinBandwidth: 12000,
			MaxBandwidth: 20000,
			Priority:     1, // Highest priority
			Codec:        "h264",
		},
	}
)

func NewABRManager(networkOptimizer *network.Optimizer) *ABRManager {
	return &ABRManager{
		networkOptimizer: networkOptimizer,
		sessions:         make(map[string]*ABRSession),
		qualityProfiles:  QualityProfiles,
	}
}

// CreateABRSession initializes adaptive bitrate for a viewing session
func (a *ABRManager) CreateABRSession(c *gin.Context) {
	var request struct {
		SessionID string `json:"sessionId" binding:"required"`
		VideoID   string `json:"videoId" binding:"required"`
		InitialQuality string `json:"initialQuality"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Auto-select initial quality if not specified
	if request.InitialQuality == "" {
		request.InitialQuality = a.selectInitialQuality()
	}
	
	// Create ABR session
	session := &ABRSession{
		SessionID:      request.SessionID,
		VideoID:        request.VideoID,
		CurrentQuality: request.InitialQuality,
		TargetQuality:  request.InitialQuality,
		LastSwitch:     time.Now(),
		SwitchCount:    0,
		BufferHealth:   100.0, // Start with full buffer
		NetworkHistory: make([]NetworkMeasurement, 0, 100),
		ABRStrategy:    a.createABRStrategy(),
	}
	
	a.mu.Lock()
	a.sessions[request.SessionID] = session
	a.mu.Unlock()
	
	// Start ABR monitoring
	go a.startABRMonitoring(request.SessionID)
	
	c.JSON(http.StatusOK, gin.H{
		"sessionId": request.SessionID,
		"initialQuality": request.InitialQuality,
		"strategy": session.ABRStrategy,
	})
}

// GetABRDecision returns current adaptive bitrate decision
func (a *ABRManager) GetABRDecision(c *gin.Context) {
	sessionID := c.Param("sessionId")
	
	a.mu.RLock()
	session, exists := a.sessions[sessionID]
	a.mu.RUnlock()
	
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}
	
	decision := a.makeABRDecision(session)
	c.JSON(http.StatusOK, decision)
}

// UpdateBufferHealth updates buffer health for ABR calculations
func (a *ABRManager) UpdateBufferHealth(c *gin.Context) {
	var request struct {
		SessionID    string  `json:"sessionId" binding:"required"`
		BufferHealth float64 `json:"bufferHealth" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	a.mu.Lock()
	defer a.mu.Unlock()
	
	session, exists := a.sessions[request.SessionID]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}
	
	session.BufferHealth = request.BufferHealth
	session.LastSwitch = time.Now()
	
	c.JSON(http.StatusOK, gin.H{"message": "Buffer health updated"})
}

// selectInitialQuality chooses optimal starting quality
func (a *ABRManager) selectInitialQuality() string {
	networkQuality := a.networkOptimizer.GetCurrentQuality()
	
	switch networkQuality {
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

// createABRStrategy creates adaptive bitrate strategy
func (a *ABRManager) createABRStrategy() ABRStrategy {
	networkQuality := a.networkOptimizer.GetCurrentQuality()
	
	strategy := ABRStrategy{
		Algorithm:           "hybrid",
		SwitchUpThreshold:   80.0, // Switch up when 80% confident
		SwitchDownThreshold: 60.0, // Switch down when 60% confident
		MinSwitchInterval:   10 * time.Second,
		BufferThreshold:     30.0, // 30% buffer threshold
		NetworkWindow:       30 * time.Second,
	}
	
	// Adjust strategy based on network quality
	switch networkQuality {
	case "2g":
		strategy.Algorithm = "buffer"
		strategy.SwitchUpThreshold = 90.0
		strategy.SwitchDownThreshold = 40.0
		strategy.MinSwitchInterval = 30 * time.Second
		strategy.BufferThreshold = 50.0
	case "3g":
		strategy.Algorithm = "hybrid"
		strategy.SwitchUpThreshold = 85.0
		strategy.SwitchDownThreshold = 50.0
		strategy.MinSwitchInterval = 20 * time.Second
		strategy.BufferThreshold = 40.0
	default:
		strategy.Algorithm = "throughput"
		strategy.SwitchUpThreshold = 75.0
		strategy.SwitchDownThreshold = 60.0
		strategy.MinSwitchInterval = 10 * time.Second
		strategy.BufferThreshold = 30.0
	}
	
	return strategy
}

// startABRMonitoring continuously monitors and adjusts quality
func (a *ABRManager) startABRMonitoring(sessionID string) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	
	for range ticker.C {
		a.mu.RLock()
		session, exists := a.sessions[sessionID]
		a.mu.RUnlock()
		
		if !exists {
			return
		}
		
		// Update network measurements
		a.updateNetworkMeasurements(session)
		
		// Make ABR decision
		decision := a.makeABRDecision(session)
		
		// Apply quality change if needed
		if decision.TargetQuality != session.CurrentQuality {
			a.applyQualityChange(session, decision)
		}
	}
}

// updateNetworkMeasurements collects network data
func (a *ABRManager) updateNetworkMeasurements(session *ABRSession) {
	// Get current network quality
	networkQuality := a.networkOptimizer.GetCurrentQuality()
	
	// Create measurement (simplified - would use actual network optimizer data)
	measurement := NetworkMeasurement{
		Timestamp:  time.Now(),
		Bandwidth:  a.getCurrentBandwidth(),
		Latency:    a.getCurrentLatency(),
		PacketLoss: a.getCurrentPacketLoss(),
		Quality:    networkQuality,
	}
	
	// Add to history
	session.NetworkHistory = append(session.NetworkHistory, measurement)
	
	// Keep only recent measurements (within window)
	cutoff := time.Now().Add(-session.ABRStrategy.NetworkWindow)
	filtered := make([]NetworkMeasurement, 0)
	for _, m := range session.NetworkHistory {
		if m.Timestamp.After(cutoff) {
			filtered = append(filtered, m)
		}
	}
	session.NetworkHistory = filtered
}

// makeABRDecision decides optimal quality based on current conditions
func (a *ABRManager) makeABRDecision(session *ABRSession) ABRDecision {
	decision := ABRDecision{
		CurrentQuality: session.CurrentQuality,
		TargetQuality:  session.CurrentQuality,
		NetworkQuality: a.networkOptimizer.GetCurrentQuality(),
	}
	
	switch session.ABRStrategy.Algorithm {
	case "throughput":
		decision = a.throughputBasedDecision(session)
	case "buffer":
		decision = a.bufferBasedDecision(session)
	case "hybrid":
		decision = a.hybridDecision(session)
	}
	
	// Apply minimum switch interval
	if time.Since(session.LastSwitch) < session.ABRStrategy.MinSwitchInterval {
		decision.TargetQuality = session.CurrentQuality
		decision.Reason = "Too soon to switch (minimum interval)"
	}
	
	return decision
}

// throughputBasedDecision uses bandwidth measurements for quality selection
func (a *ABRManager) throughputBasedDecision(session *ABRSession) ABRDecision {
	avgBandwidth := a.getAverageBandwidth(session)
	currentProfile := a.getQualityProfile(session.CurrentQuality)
	
	decision := ABRDecision{
		CurrentQuality: session.CurrentQuality,
		NetworkQuality: a.networkOptimizer.GetCurrentQuality(),
	}
	
	// Find optimal quality based on bandwidth
	optimalQuality := a.findOptimalQualityByBandwidth(avgBandwidth)
	
	// Calculate confidence
	confidence := a.calculateBandwidthConfidence(session, avgBandwidth, optimalQuality)
	
	// Make decision
	if confidence >= session.ABRStrategy.SwitchUpThreshold/100 && optimalQuality.Priority < currentProfile.Priority {
		decision.TargetQuality = optimalQuality.Name
		decision.Reason = fmt.Sprintf("Bandwidth sufficient for upgrade (%.2f Mbps)", avgBandwidth)
	} else if confidence <= session.ABRStrategy.SwitchDownThreshold/100 && optimalQuality.Priority > currentProfile.Priority {
		decision.TargetQuality = optimalQuality.Name
		decision.Reason = fmt.Sprintf("Bandwidth too low for current quality (%.2f Mbps)", avgBandwidth)
	} else {
		decision.TargetQuality = session.CurrentQuality
		decision.Reason = fmt.Sprintf("Current quality optimal (%.2f Mbps)", avgBandwidth)
	}
	
	decision.Confidence = confidence
	return decision
}

// bufferBasedDecision uses buffer health for quality selection
func (a *ABRManager) bufferBasedDecision(session *ABRSession) ABRDecision {
	decision := ABRDecision{
		CurrentQuality: session.CurrentQuality,
		NetworkQuality: a.networkOptimizer.GetCurrentQuality(),
	}
	
	// Buffer-based quality adjustment
	if session.BufferHealth < session.ABRStrategy.BufferThreshold {
		// Buffer is low, downgrade quality
		newQuality := a.findLowerQuality(session.CurrentQuality)
		if newQuality != "" {
			decision.TargetQuality = newQuality
			decision.Reason = fmt.Sprintf("Buffer health low (%.1f%%)", session.BufferHealth)
			decision.Confidence = 0.9
		}
	} else if session.BufferHealth > 80.0 {
		// Buffer is healthy, consider upgrade
		newQuality := a.findHigherQuality(session.CurrentQuality)
		if newQuality != "" {
			decision.TargetQuality = newQuality
			decision.Reason = fmt.Sprintf("Buffer health excellent (%.1f%%)", session.BufferHealth)
			decision.Confidence = 0.7
		}
	} else {
		decision.TargetQuality = session.CurrentQuality
		decision.Reason = fmt.Sprintf("Buffer health stable (%.1f%%)", session.BufferHealth)
		decision.Confidence = 0.8
	}
	
	return decision
}

// hybridDecision combines throughput and buffer metrics
func (a *ABRManager) hybridDecision(session *ABRSession) ABRDecision {
	throughputDecision := a.throughputBasedDecision(session)
	bufferDecision := a.bufferBasedDecision(session)
	
	decision := ABRDecision{
		CurrentQuality: session.CurrentQuality,
		NetworkQuality: a.networkOptimizer.GetCurrentQuality(),
	}
	
	// Weight decisions based on network conditions
	networkQuality := a.networkOptimizer.GetCurrentQuality()
	var throughputWeight, bufferWeight float64
	
	switch networkQuality {
	case "2g", "3g":
		throughputWeight = 0.3
		bufferWeight = 0.7 // Prioritize buffer health on poor networks
	default:
		throughputWeight = 0.7
		bufferWeight = 0.3 // Prioritize throughput on good networks
	}
	
	// Combine decisions
	if throughputDecision.TargetQuality == bufferDecision.TargetQuality {
		decision.TargetQuality = throughputDecision.TargetQuality
		decision.Reason = fmt.Sprintf("Both algorithms agree: %s", throughputDecision.Reason)
		decision.Confidence = (throughputDecision.Confidence + bufferDecision.Confidence) / 2
	} else {
		// Choose based on weighted confidence
		throughputScore := throughputDecision.Confidence * throughputWeight
		bufferScore := bufferDecision.Confidence * bufferWeight
		
		if throughputScore > bufferScore {
			decision.TargetQuality = throughputDecision.TargetQuality
			decision.Reason = fmt.Sprintf("Throughput prioritized: %s", throughputDecision.Reason)
			decision.Confidence = throughputScore
		} else {
			decision.TargetQuality = bufferDecision.TargetQuality
			decision.Reason = fmt.Sprintf("Buffer prioritized: %s", bufferDecision.Reason)
			decision.Confidence = bufferScore
		}
	}
	
	return decision
}

// Helper functions

func (a *ABRManager) getCurrentBandwidth() float64 {
	// Simplified - would get from network optimizer
	return 5.0 // 5 Mbps default
}

func (a *ABRManager) getCurrentLatency() time.Duration {
	// Simplified - would get from network optimizer
	return 100 * time.Millisecond
}

func (a *ABRManager) getCurrentPacketLoss() float64 {
	// Simplified - would get from network optimizer
	return 1.0 // 1% packet loss
}

func (a *ABRManager) getAverageBandwidth(session *ABRSession) float64 {
	if len(session.NetworkHistory) == 0 {
		return a.getCurrentBandwidth()
	}
	
	var total float64
	for _, measurement := range session.NetworkHistory {
		total += measurement.Bandwidth
	}
	
	return total / float64(len(session.NetworkHistory))
}

func (a *ABRManager) findOptimalQualityByBandwidth(bandwidthMbps float64) QualityProfile {
	bandwidthKbps := bandwidthMbps * 1000
	
	// Find the highest quality that fits within bandwidth
	var bestProfile QualityProfile
	for _, profile := range a.qualityProfiles {
		if bandwidthKbps >= profile.MinBandwidth {
			bestProfile = profile
		} else {
			break
		}
	}
	
	// Default to lowest quality if none fits
	if bestProfile.Name == "" {
		bestProfile = a.qualityProfiles[len(a.qualityProfiles)-1]
	}
	
	return bestProfile
}

func (a *ABRManager) calculateBandwidthConfidence(session *ABRSession, bandwidth float64, quality QualityProfile) float64 {
	if len(session.NetworkHistory) < 3 {
		return 0.5 // Low confidence with insufficient data
	}
	
	// Calculate bandwidth variance
	var variance float64
	mean := bandwidth
	for _, measurement := range session.NetworkHistory {
		diff := measurement.Bandwidth - mean
		variance += diff * diff
	}
	variance /= float64(len(session.NetworkHistory))
	
	// Lower variance = higher confidence
	stdDev := math.Sqrt(variance)
	confidence := 1.0 - (stdDev / mean)
	
	// Clamp between 0 and 1
	if confidence < 0 {
		confidence = 0
	} else if confidence > 1 {
		confidence = 1
	}
	
	return confidence
}

func (a *ABRManager) getQualityProfile(qualityName string) QualityProfile {
	for _, profile := range a.qualityProfiles {
		if profile.Name == qualityName {
			return profile
		}
	}
	return a.qualityProfiles[0] // Default to lowest quality
}

func (a *ABRManager) findLowerQuality(currentQuality string) string {
	currentProfile := a.getQualityProfile(currentQuality)
	
	for _, profile := range a.qualityProfiles {
		if profile.Priority > currentProfile.Priority {
			return profile.Name
		}
	}
	
	return "" // Already at lowest quality
}

func (a *ABRManager) findHigherQuality(currentQuality string) string {
	currentProfile := a.getQualityProfile(currentQuality)
	
	for _, profile := range a.qualityProfiles {
		if profile.Priority < currentProfile.Priority {
			return profile.Name
		}
	}
	
	return "" // Already at highest quality
}

func (a *ABRManager) applyQualityChange(session *ABRSession, decision ABRDecision) {
	session.CurrentQuality = decision.TargetQuality
	session.TargetQuality = decision.TargetQuality
	session.LastSwitch = time.Now()
	session.SwitchCount++
	
	// Log quality change
	fmt.Printf("Session %s: Quality changed to %s (%s)\n", 
		session.SessionID, decision.TargetQuality, decision.Reason)
}

// GetSessionStats returns ABR session statistics
func (a *ABRManager) GetSessionStats(c *gin.Context) {
	sessionID := c.Param("sessionId")
	
	a.mu.RLock()
	session, exists := a.sessions[sessionID]
	a.mu.RUnlock()
	
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}
	
	stats := map[string]interface{}{
		"sessionId":      session.SessionID,
		"videoId":        session.VideoID,
		"currentQuality": session.CurrentQuality,
		"switchCount":    session.SwitchCount,
		"bufferHealth":   session.BufferHealth,
		"networkQuality": a.networkOptimizer.GetCurrentQuality(),
		"strategy":       session.ABRStrategy,
		"measurements":   len(session.NetworkHistory),
	}
	
	c.JSON(http.StatusOK, stats)
}
