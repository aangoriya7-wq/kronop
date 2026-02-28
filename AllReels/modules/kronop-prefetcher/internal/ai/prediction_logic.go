package ai

import (
	"math"
	"sync"
	"time"

	"github.com/kronop/prefetcher/internal/analyzer"
	"github.com/kronop/prefetcher/internal/tracker"
	"github.com/sirupsen/logrus"
)

// PredictionLogic handles AI-based prediction logic
type PredictionLogic struct {
	analyzer analyzer.BehaviorAnalyzer
	config    PredictionConfig
	cache     *PredictionCache
	mu        sync.RWMutex
}

// PredictionConfig holds prediction configuration
type PredictionConfig struct {
	EnablePrediction        bool          `yaml:"enable_prediction"`
	PredictionWindow        time.Duration `yaml:"prediction_window"`
	MinConfidenceThreshold   float64       `yaml:"min_confidence_threshold"`
	MaxPredictionCount      int           `yaml:"max_prediction_count"`
	AdaptiveThreshold       float64       `yaml:"adaptive_threshold"`
	EnableLearning          bool          `yaml:"enable_learning"`
	LearningRate            float64       `yaml:"learning_rate"`
}

// PredictionCache caches recent predictions
type PredictionCache struct {
	predictions map[string]*PredictionEntry
	mu         sync.RWMutex
	maxSize    int
}

// PredictionEntry represents a cached prediction
type PredictionEntry struct {
	UserID       string
	Prediction  *BehaviorPrediction
	CreatedAt   time.Time
	ExpiresAt   time.Time
	Used        bool
	Confidence  float64
}

// BehaviorPrediction represents a behavior prediction
type BehaviorPrediction struct {
	UserType           string    `json:"user_type"`
	NextReelID         int       `json:"next_reel_id"`
	PrefetchCount       int       `json:"prefetch_count"`
	Confidence         float64   `json:"confidence"`
	PredictionTime     time.Time `json:"prediction_time"`
	Reasoning          string    `json:"reasoning"`
	RecommendedAction   string    `json:"recommended_action"`
	ExpectedImpact     float64   `json:"expected_impact"`
	ValidationScore    float64   `json:"validation_score"`
}

// ScrollPrediction represents a scroll prediction
type ScrollPrediction struct {
	NextReelID         int       `json:"next_reel_id"`
	ScrollDirection    string    `json:"scroll_direction"`
	ExpectedSpeed       float64   `json:"expected_speed"`
	Confidence         float64   `json:"confidence"`
	TimeToNextScroll    time.Duration `json:"time_to_next_scroll"`
}

// WatchPrediction represents a watch prediction
type WatchPrediction struct {
	ReelID             int       `json:"reel_id"`
	ExpectedWatchTime   float64   `json:"expected_watch_time"`
	CompletionRate      float64   `json:"completion_rate"`
	Confidence         float64   `json:"confidence"`
	EngagementScore    float64   `json:"engagement_score"`
}

// InteractionPrediction represents an interaction prediction
type InteractionPrediction struct {
	ReelID             int       `json:"reel_id"`
	InteractionType     string    `json:"interaction_type"`
	Probability        float64   `json:"probability"`
	Confidence         float64   `json:"confidence"`
	ExpectedTime       time.Time `json:"expected_time"`
}

// NewPredictionLogic creates a new prediction logic instance
func NewPredictionLogic(analyzer analyzer.BehaviorAnalyzer, config PredictionConfig) *PredictionLogic {
	return &PredictionLogic{
		analyzer: analyzer,
		config:    config,
		cache: &PredictionCache{
			predictions: make(map[string]*PredictionEntry),
			maxSize:    100,
			mu:         sync.RWMutex{},
		},
	}
}

// PredictBehavior predicts user behavior based on current patterns
func (pl *PredictionLogic) PredictBehavior(userID string, currentProfile *analyzer.BehaviorProfile, recentEvents []tracker.UserEvent) (*BehaviorPrediction, error) {
	if !pl.config.EnablePrediction {
		return nil, fmt.Errorf("prediction is disabled")
	}

	pl.mu.Lock()
	defer pl.mu.Unlock()

	logrus.Debugf("🔮 Predicting behavior for user: %s", userID)

	// Check cache first
	if cached, found := pl.getCachedPrediction(userID); found && !cached.Expired {
		// Update confidence based on recent events
		updatedConfidence := pl.updatePredictionConfidence(cached.Prediction, recentEvents)
		cached.Prediction.Confidence = updatedConfidence
		cached.Prediction.PredictionTime = time.Now()
		return cached.Prediction, nil
	}

	// Create new prediction
	prediction, err := pl.createPrediction(userID, currentProfile, recentEvents)
	if err != nil {
		return nil, fmt.Errorf("failed to create prediction: %v", err)
	}

	// Cache the prediction
	pl.cachePrediction(userID, prediction)

	logrus.Debugf("🎯 Created new prediction: type=%s, confidence=%.2f, reels=%d", 
		prediction.UserType, prediction.Confidence, prediction.PrefetchCount)

	return prediction, nil
}

// createPrediction creates a new behavior prediction
func (pl *PredictionLogic) createPrediction(userID string, currentProfile *analyzer.BehaviorProfile, recentEvents []tracker.UserEvent) (*BehaviorPrediction, error) {
	if len(recentEvents) < 3 {
		return nil, fmt.Errorf("insufficient data for prediction")
	}

	// Analyze recent behavior patterns
	scrollPattern := pl.analyzeScrollPattern(recentEvents)
	watchPattern := pl.analyzeWatchPattern(recentEvents)
	interactionPattern := pl.analyzeInteractionPattern(recentEvents)

	// Create prediction based on patterns
	prediction := &BehaviorPrediction{
		UserType:           currentProfile.UserType,
		NextReelID:         currentProfile.CurrentReelID + 1,
		PrefetchCount:       currentProfile.PrefetchCount,
		Confidence:         0.0,
		PredictionTime:     time.Now(),
		Reasoning:          "",
		RecommendedAction:   "",
		ExpectedImpact:     0.0,
		ValidationScore:    0.0,
	}

	// Adjust prediction based on patterns
	pl.adjustPredictionBasedOnPatterns(prediction, scrollPattern, watchPattern, interactionPattern)

	// Calculate confidence
	prediction.Confidence = pl.calculatePredictionConfidence(prediction, currentProfile)

	// Set reasoning
	prediction.Reasoning = pl.generateReasoning(prediction, scrollPattern, watchPattern, interactionPattern)

	// Set recommended action
	prediction.RecommendedAction = pl.generateRecommendedAction(prediction)

	// Calculate expected impact
	prediction.ExpectedImpact = pl.calculateExpectedImpact(prediction)

	// Set validation score
	prediction.ValidationScore = pl.calculateValidationScore(prediction)

	return prediction, nil
}

// analyzeScrollPattern analyzes scrolling patterns
func (pl *PredictionLogic) analyzeScrollPattern(events []tracker.UserEvent) ScrollPattern {
	if len(events) < 2 {
		return ScrollPattern{}
	}

	var totalSpeed float64
	var speeds []float64
	var directions []string
	var intervals []time.Duration

	for i := 1; i < len(events); i++ {
		if events[i].Type == "scroll" {
			data := events[i].Data.(map[string]interface{})
			speed := data["scroll_speed"].(float64)
			direction := data["direction"].(string)
			duration := time.Duration(data["duration"].(float64)) * time.Second

			totalSpeed += speed
			speeds = append(speeds, speed)
			directions = append(directions, direction)
			intervals = append(intervals, duration)
		}
	}

	if len(speeds) == 0 {
		return ScrollPattern{}
	}

	avgSpeed := totalSpeed / float64(len(speeds))
	peakSpeed := pl.findMaxSpeed(speeds)
	
	// Calculate scroll consistency
	var consistency float64
	if len(speeds) > 1 {
		mean := avgSpeed
		var variance float64
		for _, speed := range speeds {
			diff := speed - mean
			variance += diff * diff
		}
		variance = variance / float64(len(speeds))
		if mean > 0 {
			consistency = 1.0 - (variance / (mean * mean))
		}
		if consistency < 0.0 {
			consistency = 0.0
		}
	}

	// Calculate average interval
	var avgInterval time.Duration
	if len(intervals) > 0 {
		var totalTime time.Duration
		for _, interval := range intervals {
			totalTime += interval
		}
		avgInterval = totalTime / time.Duration(len(intervals))
	}

	// Determine scroll direction preference
	forwardCount := 0
		for _, direction := range directions {
			if direction == "forward" {
				forwardCount++
			}
		}
		directionPreference := float64(forwardCount) / float64(len(directions))

	return ScrollPattern{
		AvgSpeed:        avgSpeed,
		PeakSpeed:        peakSpeed,
		Consistency:      consistency,
		DirectionRatio:    directionPreference,
		AvgInterval:      avgInterval,
		RecentSpeeds:     speeds,
		RecentDirections: directions,
	}
}

// analyzeWatchPattern analyzes watching patterns
func (pl *PredictionLogic) analyzeWatchPattern(events []tracker.UserEvent) WatchPattern {
	if len(events) < 2 {
		return WatchPattern{}
	}

	var totalWatchTime time.Duration
	var watchTimes []float64
	var completedCount int
	var positions []float64

	for _, event := range events {
		if event.Type == "watch" {
			data := event.Data.(map[string]interface{})
			watchTime := time.Duration(data["watch_time"].(float64)) * time.Second
			completed := data["completed"].(bool)
			position := data["position"].(float64)

			totalWatchTime += watchTime
			watchTimes = append(watchTimes, watchTime.Seconds())
			if completed {
				completedCount++
			}
			positions = append(positions, position)
		}
	}

	if len(watchTimes) == 0 {
		return WatchPattern{}
	}

	avgWatchTime := totalWatchTime / time.Duration(len(watchTimes))
	completionRate := float64(completedCount) / float64(len(watchTimes))
	
	// Calculate engagement score
	engagementScore := avgWatchTime * completionRate

	// Calculate position preference
	var avgPosition float64
	if len(positions) > 0 {
		var totalPosition float64
		for _, position := range positions {
			totalPosition += position
		}
		avgPosition = totalPosition / float64(len(positions))
	}

	return WatchPattern{
		AvgWatchTime:    avgWatchTime.Seconds(),
		CompletionRate:  completionRate,
		EngagementScore: engagementScore,
		AvgPosition:    avgPosition,
	RecentWatchTimes: watchTimes,
		CompletedCount:  completedCount,
	}
}

// analyzeInteractionPattern analyzes interaction patterns
func (pl *PredictionLogic) analyzeInteractionPattern(events []tracker.UserEvent) InteractionPattern {
	if len(events) == 0 {
		return InteractionPattern{}
	}

	interactionTypes := make(map[string]int)
	interactionTimes := make(map[string][]time.Time)

	for _, event := range events {
		if event.Type == "interaction" {
			data := event.Data.(map[string]interface{})
			interactionType := data["type"].(string)
			timestamp := event.Timestamp

			interactionTypes[interactionType]++
			interactionTimes[interactionType] = append(interactionTimes[interactionType], timestamp)
		}
	}

	// Calculate interaction frequency
	mostFrequentType := ""
	maxCount := 0
	for interactionType, count := range interactionTypes {
		if count > maxCount {
			mostFrequentType = interactionType
			maxCount = count
		}
	}

	// Calculate average interaction intervals
	var avgInterval time.Duration
	if len(interactionTimes[mostFrequentType]) > 1 {
		var totalTime time.Duration
		times := interactionTimes[mostFrequentType]
		for i := 1; i < len(times); i++ {
			totalTime += times[i].Sub(times[i-1])
		}
		avgInterval = totalTime / time.Duration(len(times)-1)
	}

	return InteractionPattern{
		MostFrequentType: mostFrequentType,
		TotalInteractions: len(events),
		InteractionTypes: interactionTypes,
		AvgInterval: avgInterval,
	}
}

// findMaxSpeed finds the maximum speed in a slice
func (pl *PredictionLogic) findMaxSpeed(speeds []float64) float64 {
	maxSpeed := 0.0
	for _, speed := range speeds {
		if speed > maxSpeed {
			maxSpeed = speed
		}
	}
	return maxSpeed
}

// adjustPredictionBasedOnPatterns adjusts prediction based on analyzed patterns
func (pl *PredictionLogic) adjustPredictionBasedOnPatterns(prediction *BehaviorPrediction, scrollPattern ScrollPattern, watchPattern WatchPattern, interactionPattern InteractionPattern) {
	// Adjust based on scroll pattern
	if scrollPattern.AvgSpeed > 5.0 {
		prediction.PrefetchCount = 5
		prediction.UserType = "fast_scroller"
		prediction.NextReelID = prediction.NextReelID + 2 // Skip 2 reels for fast scroller
	} else if scrollPattern.AvgSpeed < 0.5 {
		prediction.PrefetchCount = 2
		prediction.UserType = "slow_viewer"
		prediction.NextReelID = prediction.NextReelID + 1 // Next reel only
	}

	// Adjust based on watch pattern
	if watchPattern.AvgWatchTime > 30.0 && watchPattern.CompletionRate > 0.8 {
		prediction.PrefetchCount = 8
		prediction.UserType = "binge_watcher"
		prediction.NextReelID = prediction.NextReelID + 3 // Prefetch more for binge watcher
	} else if watchPattern.AvgWatchTime < 5.0 {
		prediction.PrefetchCount = 2
		prediction.UserType = "casual_browser"
	}

	// Adjust based on interaction pattern
	if interactionPattern.MostFrequentType == "like" {
		prediction.PrefetchCount++ // Add one more for engaged users
	}

	// Adjust based on scroll consistency
	if scrollPattern.Consistency > 0.8 {
		prediction.Confidence += 0.1
	} else {
		prediction.Confidence -= 0.1
	}

	// Adjust based on engagement
	if watchPattern.EngagementScore > 0.7 {
		prediction.Confidence += 0.1
	}
}

// calculatePredictionConfidence calculates confidence in the prediction
func (pl *PredictionLogic) calculatePredictionConfidence(prediction *BehaviorPrediction, currentProfile *analyzer.BehaviorProfile) float64 {
	confidence := 0.5 // Base confidence

	// Adjust based on pattern consistency
	if prediction.UserType == currentProfile.UserType {
		confidence += 0.3
	} else {
		confidence -= 0.2
	}

	// Adjust based on data volume
	eventCount := len(currentProfile.ScrollEvents) + len(currentProfile.WatchEvents) + len(currentProfile.Interactions)
	if eventCount > 100 {
		confidence += 0.2
	} else if eventCount < 10 {
		confidence -= 0.3
	}

	// Adjust based on recent behavior consistency
	if prediction.UserType == "fast_scroller" && currentProfile.ScrollMetrics.Consistency > 0.8 {
		confidence += 0.1
	}

	// Ensure confidence is within bounds
	if confidence > 1.0 {
		confidence = 1.0
	} else if confidence < 0.0 {
		confidence = 0.0
	}

	return confidence
}

// generateReasoning generates reasoning for the prediction
func (pl *PredictionLogic) generateReasoning(prediction *BehaviorPrediction, scrollPattern ScrollPattern, watchPattern WatchPattern, interactionPattern InteractionPattern) string {
	reasoning := "Based on "

	var reasons []string

	// Add scroll pattern reasoning
	if scrollPattern.AvgSpeed > 5.0 {
		reasons = append(reasons, fmt.Sprintf("fast scrolling (%.1f reels/sec)", scrollPattern.AvgSpeed))
	} else if scrollPattern.AvgSpeed < 0.5 {
		reasons = append(reasons, fmt.Sprintf("slow scrolling (%.1f reels/sec)", scrollPattern.AvgSpeed))
	}

	// Add watch pattern reasoning
	if watchPattern.AvgWatchTime > 30.0 {
		reasons = append(reasons, fmt.Sprintf("long viewing sessions (%.1fs avg)", watchPattern.AvgWatchTime))
	} else if watchPattern.AvgWatchTime < 5.0 {
		reasons = append(reasons, fmt.Sprintf("quick browsing (%.1fs avg)", watchPattern.AvgWatchTime))
	}

	// Add interaction reasoning
	if interactionPattern.TotalInteractions > 10 {
		reasons = append(reasons, fmt.Sprintf("%d interactions (%s)", interactionPattern.TotalInteractions, interactionPattern.MostFrequentType))
	}

	// Add confidence reasoning
	if prediction.Confidence > 0.8 {
		reasons = append(reasons, "high confidence")
	} else if prediction.Confidence < 0.5 {
		reasons = append(reasons, "low confidence")
	}

	return fmt.Sprintf("%s", strings.Join(", ", reasons))
}

// generateRecommendedAction generates recommended action based on prediction
func (pl *PredictionLogic) generateRecommendedAction(prediction *BehaviorPrediction) string {
	switch prediction.UserType {
	case "fast_scroller":
		return "Prefetch 5 reels ahead for instant playback"
	case "binge_watcher":
		return "Prefetch 8 reels for seamless binge watching"
	case "slow_viewer":
		return "Prefetch 2 reels for careful viewing"
	case "casual_browser":
		return "Prefetch 2 reels for quick browsing"
	default:
		return "Prefetch 3 reels for normal viewing"
	}
}

// calculateExpectedImpact calculates expected impact of the prediction
func (pl *PredictionLogic) calculateExpectedImpact(prediction *BehaviorPrediction) float64 {
	impact := 0.0

	// Base impact based on prefetch count
	impact += float64(prediction.PrefetchCount) * 0.1

	// Adjust based on user type
	switch prediction.UserType {
	case "fast_scroller":
		impact += 0.8 // High impact for fast scrollers
	case "binge_watcher":
		impact += 0.9 // Very high impact for binge watchers
	case "normal_viewer":
		impact += 0.6 // Medium impact for normal viewers
	case "slow_viewer":
		impact += 0.3 // Low impact for slow viewers
	case "casual_browser":
	impact += 0.2 // Low impact for casual browsers
	}

	// Adjust based on confidence
	impact *= prediction.Confidence

	return impact
}

// calculateValidationScore calculates validation score for the prediction
func (pl *PredictionLogic) calculateValidationScore(prediction *BehaviorPrediction) float64 {
	score := 0.0

	// Base score based on confidence
	score += prediction.Confidence * 0.5

	// Adjust based on prefetch count reasonableness
	switch prediction.UserType {
	case "fast_scroller":
		if prediction.PrefetchCount <= 5 {
			score += 0.3
		} else {
			score -= 0.2
		}
	case "binge_watcher":
		if prediction.PrefetchCount >= 6 && prediction.PrefetchCount <= 10 {
			score += 0.3
		} else {
			score -= 0.2
		}
	case "slow_viewer":
		if prediction.PrefetchCount <= 2 {
			score += 0.3
		} else {
			score -= 0.2
		}
	case "casual_browser":
		if prediction.PrefetchCount <= 2 {
			score += 0.2
		} else {
			score -= 0.1
		}
	default:
		if prediction.PrefetchCount >= 2 && prediction.PrefetchCount <= 4 {
			score += 0.2
		} else {
			score -= 0.1
		}
	}

	// Ensure score is within bounds
	if score > 1.0 {
		score = 1.0
	} else if score < 0.0 {
		score = 0.0
	}

	return score
}

// cachePrediction caches a prediction
func (pl *PredictionLogic) cachePrediction(userID string, prediction *BehaviorPrediction) {
	pl.mu.Lock()
	defer pl.mu.Unlock()

	// Remove old predictions if cache is full
	if len(pl.cache.predictions) >= pl.cache.maxSize {
		// Remove oldest prediction
		var oldestKey string
		oldestTime := time.Now()
		
		for key, entry := range pl.cache.predictions {
			if entry.CreatedAt.Before(oldestTime) {
				oldestKey = key
				break
			}
		}
		
		if oldestKey != "" {
			delete(pl.cache.predictions, oldestKey)
		}
	}

	// Add new prediction
	entry := &PredictionEntry{
		UserID:      userID,
		Prediction:  prediction,
		CreatedAt:    time.Now(),
		ExpiresAt:    time.Now().Add(pl.config.PredictionWindow),
		Used:        false,
		Confidence:  prediction.Confidence,
	}

	pl.cache.predictions[userID] = entry
}

// getCachedPrediction retrieves a cached prediction
func (pl *PredictionLogic) getCachedPrediction(userID string) (*PredictionEntry, bool) {
	pl.mu.RLock()
	defer pl.mu.RUnlock()

	entry, exists := pl.cache.predictions[userID]
	if !exists {
		return nil, false
	}

	// Check if prediction has expired
	if time.Now().After(entry.ExpiresAt) {
		delete(pl.cache.predictions[userID]
		return nil, false
	}

	return entry, true
}

// updatePredictionConfidence updates confidence based on recent events
func (pl *PredictionLogic) updatePredictionConfidence(entry *PredictionEntry, recentEvents []tracker.UserEvent) float64 {
	if len(recentEvents) == 0 {
		return entry.Confidence
	}

	// Calculate recent behavior consistency
	recentScrollSpeed := pl.calculateRecentScrollSpeed(recentEvents)
	currentSpeed := entry.Prediction.PrefetchCount

	// Adjust confidence based on how well recent behavior matches prediction
	if entry.Prediction.UserType == "fast_scroller" && recentScrollSpeed > 5.0 {
		entry.Confidence = math.Min(1.0, entry.Confidence+0.1)
	} else if entry.Prediction.UserType == "slow_viewer" && recentScrollSpeed < 0.5 {
		entry.Confidence = math.Min(1.0, entry.Confidence+0.1)
	} else {
		entry.Confidence = math.Max(0.0, entry.Confidence-0.1)
	}

	return entry.Confidence
}

// calculateRecentScrollSpeed calculates recent scroll speed from recent events
func (pl *PredictionLogic) calculateRecentScrollSpeed(recentEvents []tracker.UserEvent) float64 {
	var recentScrollSpeeds []float64
	
	for _, event := range recentEvents {
		if event.Type == "scroll" {
			data := event.Data.(map[string]interface{})
			scrollSpeed := data["scroll_speed"].(float64)
			recentScrollSpeeds = append(recentScrollSpeeds, scrollSpeed)
		}
	}

	if len(recentScrollSpeeds) == 0 {
		return 0.0
	}

	var totalSpeed float64
	for _, speed := range recentScrollSpeeds {
		totalSpeed += speed
	}

	return totalSpeed / float64(len(recentScrollSpeeds))
}

// ClearCache clears the prediction cache
func (pl *PredictionLogic) ClearCache() {
	pl.mu.Lock()
	defer pl.mu.Unlock()

	pl.cache.predictions = make(map[string]*PredictionEntry)
	logrus.Info("🗑️ Cleared prediction cache")
}

// GetCacheStats returns cache statistics
func (pl *PredictionLogic) GetCacheStats() map[string]interface{} {
	pl.mu.RLock()
	defer pl.mu.RUnlock()

	stats := map[string]interface{}{
		"cache_size":     len(pl.cache.predictions),
		"max_size":      pl.cache.maxSize,
		"hit_rate":      pl.calculateCacheHitRate(),
		"miss_rate":      pl.calculateCacheMissRate(),
	}

	return stats
}

// calculateCacheHitRate calculates cache hit rate
func (pl *PredictionLogic) calculateCacheHitRate() float64 {
	if len(pl.cache.predictions) == 0 {
		return 0.0
	}

	hitCount := 0
	for _, entry := range pl.cache.predictions {
		if entry.Used {
			hitCount++
		}
	}

	return float64(hitCount) / float64(len(pl.cache.predictions))
}

// calculateCacheMissRate calculates cache miss rate
func (pl *PredictionLogic) calculateCacheMissRate() float64 {
	return 1.0 - pl.calculateCacheHitRate()
}

// GetPredictionHistory gets prediction history for a user
func (pl *PredictionLogic) GetPredictionHistory(userID string, count int) []*BehaviorPrediction {
	pl.mu.RLock()
	defer pl.mu.RUnlock()

	var history []*BehaviorPrediction
	count = pl.config.MaxPredictionCount
	if count > len(pl.cache.predictions) {
		count = len(pl.cache.predictions)
	}

	// Get recent predictions sorted by creation time
	type predictionEntry struct {
		CreatedAt time.Time
		Prediction *BehaviorPrediction
	}

	var entries []predictionEntry
	for _, entry := range pl.cache.predictions {
		entries = append(entries, predictionEntry{
			CreatedAt: entry.CreatedAt,
			Prediction: entry.Prediction,
		})
	}

	// Sort by creation time (most recent first)
	for i := 0; i < len(entries); i++ {
		for j := i + 1; j < len(entries); j++ {
			if entries[i].CreatedAt.After(entries[j].CreatedAt) {
				entries[i], entries[j] = entries[j], entries[i]
			}
		}
	}

	// Return recent predictions
	if count > len(entries) {
		entries = entries[:count]
	}

	for _, entry := range entries {
		history = append(history, entry.Prediction)
	}

	return history
}

// UpdateLearning updates the prediction model based on validation results
func (pl *PredictionLogic) UpdateLearning(userID string, prediction *BehaviorPrediction, actualBehavior string, success bool) {
	if !pl.config.EnableLearning {
		return
	}

	pl.mu.Lock()
	defer pl.mu.Unlock()

	// Get cached prediction
	entry, exists := pl.cache.predictions[userID]
	if !exists {
		return
	}

	// Update learning based on validation
	if success {
		// Increase confidence for successful predictions
		entry.Confidence = math.Min(1.0, entry.Confidence+0.1)
	} else {
		// Decrease confidence for failed predictions
		entry.Confidence = math.Max(0.0, entry.Confidence-0.2)
	}

	// Update prediction based on actual behavior
	if actualBehavior != prediction.UserType {
		// User behavior changed, update user type
		entry.Prediction.UserType = actualBehavior
		entry.Prediction.Confidence = 0.5 // Reset confidence on type change
	}

	// Update timestamp
	entry.Prediction.PredictionTime = time.Now()
		entry.Used = true

	logrus.Debugf("📚 Updated learning for user %s: success=%t, confidence=%.2f", userID, success, entry.Prediction.Confidence)
}

// GetLearningStats returns learning statistics
func (pl *PredictionLogic) GetLearningStats() map[string]interface{} {
	pl.mu.RLock()
	defer pl.mu.Unlock()

	stats := map[string]interface{}{
		"enable_learning": pl.config.EnableLearning,
		"learning_rate": pl.config.LearningRate,
		"total_updates": pl.getTotalLearningUpdates(),
		"success_rate": pl.getSuccessRate(),
		"adaptation_threshold": pl.config.AdaptiveThreshold,
	}

	return stats
}

// getTotalLearningUpdates returns total learning updates
func (pl *PredictionLogic) getTotalLearningUpdates() int {
	pl.mu.RLock()
	defer pl.mu.Unlock()

	count := 0
	for _, entry := range pl.cache.predictions {
		if entry.Used {
			count++
		}
	}

	return count
}

// getSuccessRate calculates prediction success rate
func (pl *PredictionLogic) getSuccessRate() float64 {
	pl.mu.RLock()
	defer pl.mu.Unlock()

	if len(pl.cache.predictions) == 0 {
		return 0.0
	}

	successCount := 0
	totalCount := 0
	for _, entry := range pl.cache.predictions {
		if entry.Used {
			totalCount++
			if entry.Prediction.Confidence > 0.7 {
				successCount++
			}
		}
	}

	return float64(successCount) / float64(totalCount)
}

// Stop stops the prediction logic
func (pl *PredictionLogic) Stop() {
	pl.mu.Lock()
	defer pl.mu.Unlock()

	pl.cache.predictions = make(map[string]*PredictionEntry)
	logrus.Info("🛑️ Stopped prediction logic")
}
