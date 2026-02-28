package analyzer

import (
	"math"
	"time"

	"github.com/sirupsen/logrus"
)

// BehaviorAnalyzer analyzes user behavior patterns
type BehaviorAnalyzer struct {
	config AnalyzerConfig
}

// AnalyzerConfig holds analyzer configuration
type AnalyzerConfig struct {
	EnableScrollTracking      bool    `yaml:"enable_scroll_tracking"`
	EnableWatchTimeTracking   bool    `yaml:"enable_watch_time_tracking"`
	EnableInteractionTracking bool    `yaml:"enable_interaction_tracking"`
	AnalysisWindow           time.Duration `yaml:"analysis_window"`
	MinSamplesForPattern     int     `yaml:"min_samples_for_pattern"`
	PatternConfidenceThreshold float64 `yaml:"pattern_confidence_threshold"`
	BehaviorCategories       map[string]BehaviorCategory `yaml:"behavior_categories"`
}

// BehaviorCategory defines user behavior categories
type BehaviorCategory struct {
	ThresholdScrollSpeed float64 `yaml:"threshold_scroll_speed"`
	PrefetchCount        int     `yaml:"prefetch_count"`
	Priority            string  `yaml:"priority"`
}

// BehaviorProfile represents analyzed user behavior
type BehaviorProfile struct {
	UserType         string    `json:"user_type"`
	ScrollSpeed      float64   `json:"scroll_speed"`
	AvgWatchTime     float64   `json:"avg_watch_time"`
	PrefetchCount    int       `json:"prefetch_count"`
	Confidence       float64   `json:"confidence"`
	LastUpdated      time.Time `json:"last_updated"`
}

// UserBehaviorData holds collected user behavior data
type UserBehaviorData struct {
	ScrollEvents    []ScrollEvent    `json:"scroll_events"`
	WatchEvents     []WatchEvent     `json:"watch_events"`
	Interactions    []Interaction    `json:"interactions"`
	FirstSeen       time.Time        `json:"first_seen"`
	LastSeen        time.Time        `json:"last_seen"`
}

// ScrollEvent represents a scrolling event
type ScrollEvent struct {
	Timestamp   time.Time `json:"timestamp"`
	FromReel    int       `json:"from_reel"`
	ToReel      int       `json:"to_reel"`
	ScrollSpeed float64   `json:"scroll_speed"`
}

// WatchEvent represents a watch event
type WatchEvent struct {
	Timestamp  time.Time `json:"timestamp"`
	ReelID     int       `json:"reel_id"`
	WatchTime  float64   `json:"watch_time"` // in seconds
	Completed  bool      `json:"completed"`
}

// Interaction represents user interactions
type Interaction struct {
	Timestamp time.Time `json:"timestamp"`
	Type      string    `json:"type"` // like, comment, share, save
	ReelID    int       `json:"reel_id"`
}

// NewBehaviorAnalyzer creates a new behavior analyzer
func NewBehaviorAnalyzer(config AnalyzerConfig) BehaviorAnalyzer {
	logrus.Info("🧠 Initializing AI-based Behavior Analyzer")
	return BehaviorAnalyzer{
		config: config,
	}
}

// AnalyzeBehavior analyzes user behavior and returns updated profile
func (ba *BehaviorAnalyzer) AnalyzeBehavior(currentProfile *BehaviorProfile, scrollSpeed float, watchTime time.Duration) *BehaviorProfile {
	logrus.Debugf("🔍 Analyzing behavior: scroll=%.2f, watch=%v", scrollSpeed, watchTime)

	// Create new profile with updated data
	newProfile := &BehaviorProfile{
		UserType:     currentProfile.UserType,
		ScrollSpeed:  scrollSpeed,
		AvgWatchTime: float64(watchTime.Seconds()),
		PrefetchCount: currentProfile.PrefetchCount,
		Confidence:    currentProfile.Confidence,
		LastUpdated:   time.Now(),
	}

	// Determine user type based on behavior
	userType, confidence := ba.determineUserType(newProfile)
	newProfile.UserType = userType
	newProfile.Confidence = confidence

	// Set prefetch count based on user type
	if category, exists := ba.config.BehaviorCategories[userType]; exists {
		newProfile.PrefetchCount = category.PrefetchCount
	}

	logrus.Debugf("🎯 User behavior analysis: type=%s, confidence=%.2f, prefetch=%d", 
		userType, confidence, newProfile.PrefetchCount)

	return newProfile
}

// determineUserType determines the user type based on behavior patterns
func (ba *BehaviorAnalyzer) determineUserType(profile *BehaviorProfile) (string, float64) {
	scores := map[string]float64{
		"fast_scroller":   ba.calculateFastScrollerScore(profile),
		"normal_viewer":   ba.calculateNormalViewerScore(profile),
		"slow_viewer":     ba.calculateSlowViewerScore(profile),
		"binge_watcher":   ba.calculateBingeWatcherScore(profile),
		"casual_browser":  ba.calculateCasualBrowserScore(profile),
	}

	// Find the best match
	bestType := "normal_viewer"
	bestScore := 0.0

	for userType, score := range scores {
		if score > bestScore {
			bestScore = score
			bestType = userType
		}
	}

	// Calculate confidence based on score difference
	secondBestScore := 0.0
	for _, score := range scores {
		if score > secondBestScore && score < bestScore {
			secondBestScore = score
		}
	}

	confidence := bestScore - secondBestScore
	if confidence > 1.0 {
		confidence = 1.0
	}

	return bestType, confidence
}

// calculateFastScrollerScore calculates score for fast scroller behavior
func (ba *BehaviorAnalyzer) calculateFastScrollerScore(profile *BehaviorProfile) float64 {
	score := 0.0
	
	// High scroll speed is primary indicator
	if profile.ScrollSpeed > ba.config.BehaviorCategories["fast_scroller"].ThresholdScrollSpeed {
		score += 0.8
	}
	
	// Low watch time supports fast scrolling
	if profile.AvgWatchTime < 5.0 {
		score += 0.2
	}
	
	return score
}

// calculateNormalViewerScore calculates score for normal viewer behavior
func (ba *BehaviorAnalyzer) calculateNormalViewerScore(profile *BehaviorProfile) float64 {
	score := 0.0
	
	// Moderate scroll speed
	threshold := ba.config.BehaviorCategories["normal_viewer"].ThresholdScrollSpeed
	scrollDiff := math.Abs(profile.ScrollSpeed - threshold)
	if scrollDiff < 1.0 {
		score += 0.6
	}
	
	// Moderate watch time
	if profile.AvgWatchTime >= 5.0 && profile.AvgWatchTime <= 30.0 {
		score += 0.4
	}
	
	return score
}

// calculateSlowViewerScore calculates score for slow viewer behavior
func (ba *BehaviorAnalyzer) calculateSlowViewerScore(profile *BehaviorProfile) float64 {
	score := 0.0
	
	// Low scroll speed
	if profile.ScrollSpeed < ba.config.BehaviorCategories["slow_viewer"].ThresholdScrollSpeed {
		score += 0.6
	}
	
	// High watch time
	if profile.AvgWatchTime > 30.0 {
		score += 0.4
	}
	
	return score
}

// calculateBingeWatcherScore calculates score for binge watcher behavior
func (ba *BehaviorAnalyzer) calculateBingeWatcherScore(profile *BehaviorProfile) float64 {
	score := 0.0
	
	// High watch time is primary indicator
	if profile.AvgWatchTime > ba.config.BehaviorCategories["binge_watcher"].ThresholdWatchTime {
		score += 0.7
	}
	
	// Moderate to high scroll speed (watching many reels)
	if profile.ScrollSpeed >= 1.0 && profile.ScrollSpeed <= 3.0 {
		score += 0.3
	}
	
	return score
}

// calculateCasualBrowserScore calculates score for casual browser behavior
func (ba *BehaviorAnalyzer) calculateCasualBrowserScore(profile *BehaviorProfile) float64 {
	score := 0.0
	
	// Very low watch time
	if profile.AvgWatchTime < ba.config.BehaviorCategories["casual_browser"].ThresholdWatchTime {
		score += 0.6
	}
	
	// Low scroll speed
	if profile.ScrollSpeed < 0.5 {
		score += 0.4
	}
	
	return score
}

// AnalyzeScrollPattern analyzes scrolling patterns over time
func (ba *BehaviorAnalyzer) AnalyzeScrollPattern(data *UserBehaviorData) (*ScrollPattern, error) {
	if len(data.ScrollEvents) < ba.config.MinSamplesForPattern {
		return nil, fmt.Errorf("insufficient scroll data: need at least %d events", ba.config.MinSamplesForPattern)
	}

	pattern := &ScrollPattern{
		AvgScrollSpeed: ba.calculateAverageScrollSpeed(data.ScrollEvents),
		ScrollVariance: ba.calculateScrollVariance(data.ScrollEvents),
		DirectionChanges: ba.countDirectionChanges(data.ScrollEvents),
		PeakSpeed:      ba.findPeakScrollSpeed(data.ScrollEvents),
		Consistency:    ba.calculateScrollConsistency(data.ScrollEvents),
	}

	logrus.Debugf("📈 Scroll pattern: avg=%.2f, variance=%.2f, consistency=%.2f", 
		pattern.AvgScrollSpeed, pattern.ScrollVariance, pattern.Consistency)

	return pattern, nil
}

// ScrollPattern represents analyzed scrolling patterns
type ScrollPattern struct {
	AvgScrollSpeed  float64 `json:"avg_scroll_speed"`
	ScrollVariance  float64 `json:"scroll_variance"`
	DirectionChanges int    `json:"direction_changes"`
	PeakSpeed       float64 `json:"peak_speed"`
	Consistency     float64 `json:"consistency"`
}

// calculateAverageScrollSpeed calculates average scrolling speed
func (ba *BehaviorAnalyzer) calculateAverageScrollSpeed(events []ScrollEvent) float64 {
	if len(events) == 0 {
		return 0.0
	}

	totalSpeed := 0.0
	for _, event := range events {
		totalSpeed += event.ScrollSpeed
	}

	return totalSpeed / float64(len(events))
}

// calculateScrollVariance calculates variance in scroll speed
func (ba *BehaviorAnalyzer) calculateScrollVariance(events []ScrollEvent) float64 {
	if len(events) < 2 {
		return 0.0
	}

	avg := ba.calculateAverageScrollSpeed(events)
	variance := 0.0

	for _, event := range events {
		diff := event.ScrollSpeed - avg
		variance += diff * diff
	}

	return variance / float64(len(events))
}

// countDirectionChanges counts changes in scroll direction
func (ba *BehaviorAnalyzer) countDirectionChanges(events []ScrollEvent) int {
	if len(events) < 2 {
		return 0
	}

	changes := 0
	for i := 1; i < len(events); i++ {
		prevDirection := events[i-1].ToReel - events[i-1].FromReel
		currDirection := events[i].ToReel - events[i].FromReel
		
		if (prevDirection > 0 && currDirection < 0) || (prevDirection < 0 && currDirection > 0) {
			changes++
		}
	}

	return changes
}

// findPeakScrollSpeed finds the maximum scroll speed
func (ba *BehaviorAnalyzer) findPeakScrollSpeed(events []ScrollEvent) float64 {
	maxSpeed := 0.0
	for _, event := range events {
		if event.ScrollSpeed > maxSpeed {
			maxSpeed = event.ScrollSpeed
		}
	}
	return maxSpeed
}

// calculateScrollConsistency calculates how consistent the scrolling is
func (ba *BehaviorAnalyzer) calculateScrollConsistency(events []ScrollEvent) float64 {
	if len(events) < 2 {
		return 1.0
	}

	avg := ba.calculateAverageScrollSpeed(events)
	if avg == 0.0 {
		return 0.0
	}

	variance := ba.calculateScrollVariance(events)
	consistency := 1.0 - (variance / (avg * avg))
	
	if consistency < 0.0 {
		consistency = 0.0
	}
	
	return consistency
}

// PredictNextBehavior predicts user's next behavior based on patterns
func (ba *BehaviorAnalyzer) PredictNextBehavior(profile *BehaviorProfile, recentData *UserBehaviorData) (*BehaviorPrediction, error) {
	if len(recentData.ScrollEvents) < 3 {
		return nil, fmt.Errorf("insufficient recent data for prediction")
	}

	prediction := &BehaviorPrediction{
		PredictedUserType:    profile.UserType,
		NextScrollSpeed:     profile.ScrollSpeed,
		NextWatchTime:       profile.AvgWatchTime,
		Confidence:          profile.Confidence,
		RecommendedPrefetch: profile.PrefetchCount,
		PredictionTime:      time.Now(),
	}

	// Analyze recent trends
	recentScrollSpeed := ba.calculateAverageScrollSpeed(recentData.ScrollEvents[len(recentData.ScrollEvents)-3:])
	
	// Adjust prediction based on recent behavior
	if math.Abs(recentScrollSpeed-profile.ScrollSpeed) > 1.0 {
		// Significant change in behavior
		prediction.NextScrollSpeed = recentScrollSpeed
		prediction.Confidence *= 0.8 // Reduce confidence due to change
		
		// Recompute user type
		tempProfile := *profile
		tempProfile.ScrollSpeed = recentScrollSpeed
		newUserType, newConfidence := ba.determineUserType(&tempProfile)
		prediction.PredictedUserType = newUserType
		prediction.Confidence = newConfidence * 0.8
	}

	logrus.Debugf("🔮 Behavior prediction: type=%s, confidence=%.2f, next_speed=%.2f", 
		prediction.PredictedUserType, prediction.Confidence, prediction.NextScrollSpeed)

	return prediction, nil
}

// BehaviorPrediction represents predicted user behavior
type BehaviorPrediction struct {
	PredictedUserType    string    `json:"predicted_user_type"`
	NextScrollSpeed     float64   `json:"next_scroll_speed"`
	NextWatchTime       float64   `json:"next_watch_time"`
	Confidence          float64   `json:"confidence"`
	RecommendedPrefetch int       `json:"recommended_prefetch"`
	PredictionTime      time.Time `json:"prediction_time"`
}

// GetOptimalPrefetchCount returns optimal prefetch count based on current conditions
func (ba *BehaviorAnalyzer) GetOptimalPrefetchCount(profile *BehaviorProfile, networkCondition NetworkCondition) int {
	baseCount := profile.PrefetchCount

	// Adjust based on network conditions
	switch networkCondition {
	case NetworkExcellent:
		baseCount = int(float64(baseCount) * 1.5)
	case NetworkGood:
		baseCount = int(float64(baseCount) * 1.2)
	case NetworkPoor:
		baseCount = int(float64(baseCount) * 0.7)
	case NetworkVeryPoor:
		baseCount = 1
	}

	// Ensure within limits
	if baseCount > 10 {
		baseCount = 10
	}
	if baseCount < 1 {
		baseCount = 1
	}

	logrus.Debugf("🎯 Optimal prefetch count: %d (base=%d, network=%v)", baseCount, profile.PrefetchCount, networkCondition)
	return baseCount
}

// NetworkCondition represents network quality
type NetworkCondition int

const (
	NetworkVeryPoor NetworkCondition = iota
	NetworkPoor
	NetworkGood
	NetworkExcellent
)

// UpdateProfile updates user profile with new data
func (ba *BehaviorAnalyzer) UpdateProfile(profile *BehaviorProfile, newData *UserBehaviorData) error {
	if newData == nil {
		return fmt.Errorf("new data is nil")
	}

	// Recalculate metrics from new data
	if len(newData.ScrollEvents) > 0 {
		profile.ScrollSpeed = ba.calculateAverageScrollSpeed(newData.ScrollEvents)
	}

	if len(newData.WatchEvents) > 0 {
		totalWatchTime := 0.0
		for _, event := range newData.WatchEvents {
			totalWatchTime += event.WatchTime
		}
		profile.AvgWatchTime = totalWatchTime / float64(len(newData.WatchEvents))
	}

	// Re-analyze user type
	userType, confidence := ba.determineUserType(profile)
	profile.UserType = userType
	profile.Confidence = confidence
	profile.LastUpdated = time.Now()

	// Update prefetch count
	if category, exists := ba.config.BehaviorCategories[userType]; exists {
		profile.PrefetchCount = category.PrefetchCount
	}

	logrus.Debugf("🔄 Updated profile: type=%s, confidence=%.2f, prefetch=%d", 
		userType, confidence, profile.PrefetchCount)

	return nil
}
