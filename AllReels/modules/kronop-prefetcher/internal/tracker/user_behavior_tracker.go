package tracker

import (
	"context"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

// UserBehaviorTracker tracks user behavior patterns in real-time
type UserBehaviorTracker struct {
	userID       string
	sessions     *sync.Map // map[string]*UserSession
	mu           sync.RWMutex
	config       TrackerConfig
	eventChan    chan UserEvent
	stopChan     chan struct{}
}

// TrackerConfig holds tracker configuration
type TrackerConfig struct {
	EnableScrollTracking      bool          `yaml:"enable_scroll_tracking"`
	EnableWatchTimeTracking   bool          `yaml:"enable_watch_time_tracking"`
	EnableInteractionTracking bool          `yaml:"enable_interaction_tracking"`
	MaxSessionsPerUser       int           `yaml:"max_sessions_per_user"`
	SessionTimeout           time.Duration `yaml:"session_timeout"`
	EventBufferSize          int           `yaml:"event_buffer_size"`
	AnalysisInterval         time.Duration `yaml:"analysis_interval"`
}

// UserSession represents a user's current session
type UserSession struct {
	ID              string
	CurrentReel      int
	ScrollEvents     []ScrollEvent
	WatchEvents      []WatchEvent
	Interactions     []Interaction
	FirstSeen        time.Time
	LastSeen         time.Time
	LastActivity     time.Time
	TotalScrolls     int
	TotalWatchTime   time.Duration
	mu              sync.RWMutex
}

// UserEvent represents any user action
type UserEvent struct {
	Type      string    `json:"type"`
	UserID    string    `json:"user_id"`
	Timestamp time.Time `json:"timestamp"`
	ReelID    int       `json:"reel_id"`
	Data      interface{} `json:"data"`
}

// ScrollEvent represents a scrolling action
type ScrollEvent struct {
	Timestamp   time.Time `json:"timestamp"`
	FromReel    int       `json:"from_reel"`
	ToReel      int       `json:"to_reel"`
	ScrollSpeed float64   `json:"scroll_speed"`
	Direction  string    `json:"direction"` // "forward" or "backward"
	Duration   time.Duration `json:"duration"`
}

// WatchEvent represents watching a reel
type WatchEvent struct {
	Timestamp  time.Time     `json:"timestamp"`
	ReelID     int           `json:"reel_id"`
	WatchTime  time.Duration `json:"watch_time"`
	Completed  bool          `json:"completed"`
	Position   float64       `json:"position"` // 0.0 to 1.0
}

// Interaction represents user interactions
type Interaction struct {
	Timestamp time.Time `json:"timestamp"`
	Type      string    `json:"type"` // "like", "comment", "share", "save"
	ReelID    int       `json:"reel_id"`
	Data      interface{} `json:"data"`
}

// ScrollMetrics holds calculated scroll metrics
type ScrollMetrics struct {
	AvgSpeed      float64   `json:"avg_speed"`
	PeakSpeed      float64   `json:"peak_speed"`
	TotalScrolls   int       `json:"total_scrolls"`
	ScrollVariance float64   `json:"scroll_variance"`
	DirectionRatio float64   `json:"direction_ratio"`
	Consistency    float64   `json:"consistency"`
}

// WatchMetrics holds calculated watch metrics
type WatchMetrics struct {
	AvgWatchTime   float64   `json:"avg_watch_time"`
	TotalWatchTime  time.Duration `json:"total_watch_time"`
	CompletionRate float64   `json:"completion_rate"`
	EngagementScore float64   `json:"engagement_score"`
}

// BehaviorProfile represents analyzed user behavior
type BehaviorProfile struct {
	UserType        string    `json:"user_type"`
	ScrollMetrics    ScrollMetrics `json:"scroll_metrics"`
	WatchMetrics     WatchMetrics `json:"watch_metrics"`
	InteractionCount int       `json:"interaction_count"`
	Confidence       float64   `json:"confidence"`
	LastUpdated      time.Time `json:"last_updated"`
	PrefetchCount    int       `json:"prefetch_count"`
}

// NewUserBehaviorTracker creates a new user behavior tracker
func NewUserBehaviorTracker(userID string, config TrackerConfig) *UserBehaviorTracker {
	tracker := &UserBehaviorTracker{
		userID:    userID,
		sessions:  &sync.Map{},
		config:    config,
		eventChan: make(chan UserEvent, config.EventBufferSize),
		stopChan: make(chan struct{}),
	}

	// Start background processing
	go tracker.startBackgroundProcessor()

	logrus.Infof("👤 Created user behavior tracker for user: %s", userID)
	return tracker
}

// TrackScrollEvent tracks a scrolling event
func (ubt *UserBehaviorTracker) TrackScrollEvent(fromReel, toReel int, direction string, duration time.Duration) error {
	if !ubt.config.EnableScrollTracking {
		return nil
	}

	// Calculate scroll speed
	scrollSpeed := float64(toReel-fromReel) / duration.Seconds()
	if scrollSpeed < 0 {
		scrollSpeed = -scrollSpeed
	}

	event := UserEvent{
		Type:      "scroll",
		UserID:    ubt.userID,
		Timestamp: time.Now(),
		ReelID:    toReel,
		Data: map[string]interface{}{
			"from_reel":     fromReel,
			"to_reel":       toReel,
			"scroll_speed":  scrollSpeed,
			"direction":    direction,
			"duration":     duration.Seconds(),
		},
	}

	select {
	case ubt.eventChan <- event:
		logrus.Debugf("📜 Tracked scroll event: user=%s, %d->%d, speed=%.2f", 
			ubt.userID, fromReel, toReel, scrollSpeed)
		return nil
	case <-time.After(100 * time.Millisecond):
		logrus.Warn("⚠️ Event buffer full, dropping scroll event")
		return fmt.Errorf("event buffer full")
	}
}

// TrackWatchEvent tracks a watch event
func (ubt *UserBehaviorTracker) TrackWatchEvent(reelID int, watchTime time.Duration, completed bool, position float64) error {
	if !ubt.config.EnableWatchTimeTracking {
		return nil
	}

	event := UserEvent{
		Type:      "watch",
		UserID:    ubt.userID,
		Timestamp: time.Now(),
		ReelID:    reelID,
		Data: map[string]interface{}{
			"watch_time": watchTime.Seconds(),
			"completed":   completed,
			"position":   position,
		},
	}

	select {
	case ubt.eventChan <- event:
		logrus.Debugf("👁️ Tracked watch event: user=%s, reel=%d, time=%.2fs, completed=%t", 
			ubt.userID, reelID, watchTime.Seconds(), completed)
		return nil
	case <-time.After(100 * time.Millisecond):
		logrus.Warn("⚠️ Event buffer full, dropping watch event")
		return fmt.Errorf("event buffer full")
	}
}

// TrackInteraction tracks user interactions
func (ubt *UserBehaviorTracker) TrackInteraction(reelID int, interactionType string, data interface{}) error {
	if !ubt.config.EnableInteractionTracking {
		return nil
	}

	event := UserEvent{
		Type:      "interaction",
		UserID:    ubt.userID,
		Timestamp: time.Now(),
		ReelID:    reelID,
		Data: map[string]interface{}{
			"type": interactionType,
			"data": data,
		},
	}

	select {
	case ubt.eventChan <- event:
		logrus.Debugf("❤️ Tracked interaction: user=%s, reel=%d, type=%s", 
			ubt.userID, reelID, interactionType)
		return nil
	case <-time.After(100 * time.Millisecond):
		logrus.Warn("⚠️ Event buffer full, dropping interaction")
		return fmt.Errorf("event buffer full")
	}
}

// GetCurrentSession gets the user's current session
func (ubt *UserBehaviorTracker) GetCurrentSession() *UserSession {
	session, exists := ubt.sessions.Load(ubt.userID)
	if !exists {
		session = ubt.createNewSession()
		ubt.sessions.Store(ubt.userID, session)
	}
	return session
}

// createNewSession creates a new user session
func (ubt *UserBehaviorTracker) createNewSession() *UserSession {
	session := &UserSession{
		ID:          ubt.userID,
		CurrentReel:  0,
		FirstSeen:    time.Now(),
	LastSeen:     time.Now(),
		LastActivity: time.Now(),
		TotalScrolls: 0,
	TotalWatchTime: 0,
	}

	// Clean up old sessions if needed
	ubt.cleanupOldSessions()

	ubt.sessions.Store(ubt.userID, session)
	logrus.Infof("🆕 Created new session for user: %s", ubt.userID)
	return session
}

// cleanupOldSessions removes old sessions
func (ubt *UserBehaviorTracker) cleanupOldSessions() {
	ubt.sessions.Range(func(key, value interface{}) bool {
		session := value.(*UserSession)
		
		// Remove inactive sessions
		if time.Since(session.LastActivity) > ubt.config.SessionTimeout {
			ubt.sessions.Delete(key)
			logrus.Infof("🗑️ Cleaned up inactive session: %s", key)
		}
		return true
	})
}

// startBackgroundProcessor starts the background event processor
func (ubt *UserBehaviorTracker) startBackgroundProcessor() {
	ticker := time.NewTicker(ubt.config.AnalysisInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ubt.stopChan:
			logrus.Info("🛑 Stopping user behavior tracker")
			return
		case <-ticker.C:
			ubt.processEvents()
		case event := <-ubt.eventChan:
			ubt.processEvent(event)
		}
	}
}

// processEvents processes pending events
func (ubt *UserBehaviorTracker) processEvents() {
	// Process up to 100 events per cycle to prevent blocking
	for i := 0; i < 100; i++ {
		select {
		case event := <-ubt.eventChan:
			ubt.processEvent(event)
		default:
			return
		}
	}
}

// processEvent processes a single event
func (ubt *UserBehaviorTracker) processEvent(event UserEvent) {
	session := ubt.GetCurrentSession()

	session.mu.Lock()
	defer session.mu.Unlock()

	// Update last activity
	session.LastActivity = event.Timestamp
	session.LastSeen = event.Timestamp

	switch event.Type {
	case "scroll":
		ubt.processScrollEvent(session, event)
	case "watch":
		ubt.processWatchEvent(session, event)
	case "interaction":
		ubt.processInteractionEvent(session, event)
	default:
		logrus.Warnf("⚠️ Unknown event type: %s", event.Type)
	}
}

// processScrollEvent processes a scroll event
func (ubt *UserBehaviorTracker) processScrollEvent(session *UserSession, event UserEvent) {
	data := event.Data.(map[string]interface{})
	
	fromReel := int(data["from_reel"].(float64))
	toReel := int(data["to_reel"].(float64))
	scrollSpeed := data["scroll_speed"].(float64)
	direction := data["direction"].(string)
	duration := time.Duration(data["duration"].(float64)) * time.Second

	scrollEvent := ScrollEvent{
		Timestamp:   event.Timestamp,
	FromReel:    fromReel,
	ToReel:      toReel,
		ScrollSpeed: scrollSpeed,
		Direction:  direction,
		Duration:   duration,
	}

	session.ScrollEvents = append(session.ScrollEvents, scrollEvent)
	session.CurrentReel = toReel
	session.TotalScrolls++

	// Keep only recent events (last 100)
	if len(session.ScrollEvents) > 100 {
		session.ScrollEvents = session.ScrollEvents[len(session.ScrollEvents)-100:]
	}

	logrus.Debugf("📜 Processed scroll event: %s -> %s (speed: %.2f)", 
		fromReel, toReel, scrollSpeed)
}

// processWatchEvent processes a watch event
func (ubt *UserBehaviorTracker) processWatchEvent(session *UserSession, event UserEvent) {
	data := event.Data.(map[string]interface{})
	
	reelID := int(data["reel_id"].(float64))
	watchTime := time.Duration(data["watch_time"].(float64)) * time.Second
	completed := data["completed"].(bool)
	position := data["position"].(float64)

	watchEvent := WatchEvent{
		Timestamp:  event.Timestamp,
	ReelID:    reelID,
		WatchTime:  watchTime,
	Completed:  completed,
		Position:  position,
	}

	session.WatchEvents = append(session.WatchEvents, watchEvent)
	session.TotalWatchTime += watchTime

	// Keep only recent events (last 100)
	if len(session.WatchEvents) > 100 {
		session.WatchEvents = session.WatchEvents[len(session.WatchEvents)-100:]
	}

	logrus.Debugf("👁️ Processed watch event: reel=%d, time=%.2fs, completed=%t", 
		reelID, watchTime.Seconds(), completed)
}

// processInteractionEvent processes an interaction event
func (ubt *UserBehaviorTracker) processInteractionEvent(session *UserSession, event UserEvent) {
	data := event.Data.(map[string]interface{})
	
	reelID := int(data["reel_id"].(float64))
	interactionType := data["type"].(string)
	interactionData := data["data"]

	interaction := Interaction{
		Timestamp: event.Timestamp,
		Type:      interactionType,
		ReelID:    reelID,
		Data:      interactionData,
	}

	session.Interactions = append(session.Interactions, interaction)

	// Keep only recent interactions (last 50)
	if len(session.Interactions) > 50 {
		session.Interactions = session.Interactions[len(session.Interactions)-50:]
	}

	logrus.Debugf("❤️ Processed interaction: reel=%d, type=%s", reelID, interactionType)
}

// GetBehaviorProfile gets the current behavior profile
func (ubt *UserBehaviorTracker) GetBehaviorProfile() *BehaviorProfile {
	session := ubt.GetCurrentSession()

	session.mu.RLock()
	defer session.mu.RUnlock()

	// Calculate metrics
	scrollMetrics := ubt.calculateScrollMetrics(session)
	watchMetrics := ubt.calculateWatchMetrics(session)

	profile := &BehaviorProfile{
		UserType:        "unknown",
		ScrollMetrics:    scrollMetrics,
		WatchMetrics:     watchMetrics,
		InteractionCount: len(session.Interactions),
		Confidence:       0.0,
		LastUpdated:      time.Now(),
		PrefetchCount:    3, // Default
	}

	// Determine user type
	profile.UserType = ubt.determineUserType(profile)
	profile.Confidence = ubt.calculateConfidence(profile)
	profile.LastUpdated = time.Now()

	return profile
}

// calculateScrollMetrics calculates scroll metrics from events
func (ubt *UserBehaviorTracker) calculateScrollMetrics(session *UserSession) ScrollMetrics {
	if len(session.ScrollEvents) == 0 {
		return ScrollMetrics{}
	}

	var totalSpeed float64
	var maxSpeed float64
	speeds := make([]float64, 0, len(session.ScrollEvents))
	directionCount := map[string]int{"forward": 0, "backward": 0}

	for _, event := range session.ScrollEvents {
		totalSpeed += event.ScrollSpeed
		speeds = append(speeds, event.ScrollSpeed)
		directionCount[event.Direction]++

		if event.ScrollSpeed > maxSpeed {
			maxSpeed = event.ScrollSpeed
		}
	}

	avgSpeed := totalSpeed / float64(len(session.ScrollEvents))
	
	// Calculate variance
	var variance float64
	if len(speeds) > 0 {
		mean := avgSpeed
		for _, speed := range speeds {
			diff := speed - mean
			variance += diff * diff
		}
		variance = variance / float64(len(speeds))
	}

	// Calculate direction ratio
	totalDirections := len(directionCount)
	forwardCount := directionCount["forward"]
	directionRatio := float64(forwardCount) / float64(totalDirections)

	// Calculate consistency (1.0 = perfect consistency, 0.0 = no consistency)
	consistency := 1.0
	if variance > 0 && avgSpeed > 0 {
		consistency = 1.0 - (variance / (avgSpeed * avgSpeed))
	}
	if consistency < 0.0 {
		consistency = 0.0
	}

	return ScrollMetrics{
		AvgSpeed:      avgSpeed,
		PeakSpeed:      maxSpeed,
		TotalScrolls:   session.TotalScrolls,
		ScrollVariance: variance,
		DirectionRatio: directionRatio,
		Consistency:    consistency,
	}
}

// calculateWatchMetrics calculates watch metrics from events
func (ubt *UserBehaviorTracker) calculateWatchMetrics(session *UserSession) WatchMetrics {
	if len(session.WatchEvents) == 0 {
		return WatchMetrics{}
	}

	var totalWatchTime time.Duration
	var completedCount int
	var totalPosition float64

	for _, event := range session.WatchEvents {
		totalWatchTime += event.WatchTime
		if event.Completed {
			completedCount++
		}
		totalPosition += event.Position
	}

	avgWatchTime := float64(totalWatchTime.Nanoseconds()) / float64(len(session.WatchEvents)) / 1e9
	completionRate := float64(completedCount) / float64(len(session.WatchEvents))
	
	// Calculate engagement score based on watch time and completion
	engagementScore := avgWatchTime * completionRate

	return WatchMetrics{
		AvgWatchTime:   avgWatchTime,
		TotalWatchTime:  totalWatchTime,
		CompletionRate: completionRate,
		EngagementScore: engagementScore,
	}
}

// determineUserType determines the user type based on behavior
func (ubt *UserBehaviorTracker) determineUserType(profile *BehaviorProfile) string {
	scrollSpeed := profile.ScrollMetrics.AvgSpeed
	watchTime := profile.WatchMetrics.AvgWatchTime
	completionRate := profile.WatchMetrics.CompletionRate

	// Decision tree for user type classification
	if scrollSpeed > 5.0 {
		return "fast_scroller"
	} else if watchTime > 30.0 && completionRate > 0.8 {
		return "binge_watcher"
	} else if scrollSpeed < 0.5 && watchTime < 5.0 {
		return "slow_viewer"
	} else if watchTime < 5.0 {
		return "casual_browser"
	} else {
		return "normal_viewer"
	}
}

// calculateConfidence calculates confidence in the user type determination
func (ubt *UserBehaviorTracker) calculateConfidence(profile *BehaviorProfile) float64 {
	scrollSpeed := profile.ScrollMetrics.AvgSpeed
	watchTime := profile.WatchMetrics.AvgWatchTime
	completionRate := profile.WatchMetrics.CompletionRate

	// Base confidence on how well the behavior matches the determined type
	userType := profile.UserType
	var confidence float64

	switch userType {
	case "fast_scroller":
		if scrollSpeed > 5.0 {
			confidence = 0.9
		} else {
			confidence = 0.4
		}
	case "binge_watcher":
		if watchTime > 30.0 && completionRate > 0.8 {
			confidence = 0.85
		} else {
			confidence = 0.3
		}
	case "slow_viewer":
		if scrollSpeed < 0.5 && watchTime > 10.0 {
			confidence = 0.8
		} else {
		_confidence = 0.4
		}
	case "casual_browser":
		if watchTime < 5.0 && scrollSpeed < 1.0 {
			confidence = 0.7
		} else {
			confidence = 0.3
		}
	case "normal_viewer":
		if scrollSpeed >= 1.0 && scrollSpeed <= 3.0 && watchTime >= 5.0 && watchTime <= 30.0 {
			confidence = 0.75
		} else {
			confidence = 0.4
		}
	default:
		confidence = 0.0
	}

	// Adjust confidence based on consistency
	consistency := profile.ScrollMetrics.Consistency
	confidence *= consistency

	// Adjust confidence based on data volume
	eventCount := len(profile.ScrollEvents) + len(profile.WatchEvents) + len(profile.Interactions)
	if eventCount < 10 {
		confidence *= 0.5
	} else if eventCount > 100 {
		confidence = 1.0
	} else {
		// Scale confidence based on data volume
		confidence *= float64(eventCount) / 100.0
	}

	if confidence > 1.0 {
		confidence = 1.0
	}

	return confidence
}

// GetRecentEvents gets recent events for analysis
func (ubt *UserBehaviorTracker) GetRecentEvents(count int) []UserEvent {
	session := ubt.GetCurrentSession()
	
	session.mu.RLock()
	defer session.mu.RUnlock()

	var recentEvents []UserEvent
	
	// Combine all events and sort by timestamp
	allEvents := make([]UserEvent, 0, len(session.ScrollEvents)+len(session.WatchEvents)+len(session.Interactions))
	
	for _, event := range session.ScrollEvents {
		allEvents = append(allEvents, UserEvent{
			Type:      "scroll",
			UserID:    ubt.userID,
			Timestamp: event.Timestamp,
			ReelID:    event.ToReel,
			Data: map[string]interface{}{
				"from_reel":     event.FromReel,
				"to_reel":       event.ToReel,
				"scroll_speed": event.ScrollSpeed,
				"direction":    event.Direction,
				"duration":     event.Duration.Seconds(),
			},
		})
	}
	
	for _, event := range session.WatchEvents {
		allEvents = append(allEvents, UserEvent{
			Type:      "watch",
			UserID:    ubt.userID,
			Timestamp: event.Timestamp,
			ReelID:    event.ReelID,
			Data: map[string]interface{}{
				"watch_time": event.WatchTime.Seconds(),
				"completed":   event.Completed,
				"position":   event.Position,
			},
		})
	}
	
	for _, event := range session.Interactions {
		allEvents = append(allEvents, UserEvent{
			Type:      "interaction",
			UserID:    ubt.userID,
			Timestamp: event.Timestamp,
			ReelID:    event.ReelID,
			Data: map[string]interface{}{
				"type": event.Type,
				"data": event.Data,
			},
		})
	}
	
	// Sort by timestamp (most recent first)
	for i := range len(allEvents) {
		for j := i + 1; j < len(allEvents); j++ {
			if allEvents[i].Timestamp.After(allEvents[j].Timestamp) {
				allEvents[i], allEvents[j] = allEvents[j], allEvents[i]
			}
		}
	}
	
	// Return recent events
	if count > len(allEvents) {
		return allEvents[:count]
	}
	
	return allEvents
}

// GetSessionStats gets statistics for the current session
func (ubt *UserBehaviorTracker) GetSessionStats() map[string]interface{} {
	session := ubt.GetCurrentSession()
	
	session.mu.RLock()
	defer session.mu.RUnlock()

	return map[string]interface{}{
		"user_id":            session.ID,
		"current_reel":       session.CurrentReel,
		"total_scrolls":       session.TotalScrolls,
		"total_watch_time":    session.TotalWatchTime.Seconds(),
		"scroll_events_count": len(session.ScrollEvents),
	"watch_events_count":  len(session.WatchEvents),
	"interactions_count":  len(session.Interactions),
		"first_seen":         session.FirstSeen,
		"last_seen":          session.LastSeen,
		"last_activity":       session.LastActivity,
	}
}

// Stop stops the behavior tracker
func (ubt *UserBehaviorTracker) Stop() {
	close(ubt.stopChan)
	close(ubt.eventChan)
	
	// Clean up sessions
	ubt.sessions.Range(func(key, value interface{}) bool {
		ubt.sessions.Delete(key)
		return true
	})
	
	logrus.Infof("🛑 Stopped user behavior tracker for user: %s", ubt.userID)
}

// GetActiveUsersCount returns the number of active users
func (ubt *UserBehaviorTracker) GetActiveUsersCount() int {
	count := 0
	ubt.sessions.Range(func(key, value interface{}) bool {
		count++
		return true
	})
	return count
}

// GetAllSessions returns all active sessions
func (ubt *UserBehaviorTracker) GetAllSessions() map[string]*UserSession {
	sessions := make(map[string]*UserSession)
	
	ubt.sessions.Range(func(key, value interface{}) bool {
		userID := key.(string)
		session := value.(*UserSession)
		sessions[userID] = session
		return true
	})
	
	return sessions
}
