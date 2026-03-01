/**
 * Global AI Brain - International Video Recommendation Engine
 * 
 * Red Note style algorithm for international video recommendations
 * Processes global data and serves personalized content
 * Optimized for 500M+ users worldwide
 * 
 * Features:
 * - Interest-based filtering
 * - Watch history analysis
 * - Language and cultural preferences
 * - Global content discovery
 * - Real-time personalization
 */

package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/scylladb/gocqlx/v2"
	"github.com/scylladb/gocqlx/v2/qb"
	"gonum.org/v1/gonum/mat"
)

// RecommendationEngine handles global video recommendations
type RecommendationEngine struct {
	session        *gocqlx.Session
	cache          RedisGlobalCache
	config         RecommendationConfig
	userProfiles   map[uuid.UUID]*UserProfile
	videoFeatures  map[uuid.UUID]*VideoFeatures
	interestMatrix *mat.Dense
	mu             sync.RWMutex
}

// RecommendationConfig holds recommendation configuration
type RecommendationConfig struct {
	// Algorithm parameters
	MaxRecommendations    int           `json:"max_recommendations"`
	MinWatchHistory      int           `json:"min_watch_history"`
	InterestDecayFactor  float64       `json:"interest_decay_factor"`
	SimilarityThreshold  float64       `json:"similarity_threshold"`
	
	// Language and cultural preferences
	DefaultLanguage       string        `json:"default_language"`
	SupportedLanguages    []string      `json:"supported_languages"`
	CulturalWeights       map[string]float64 `json:"cultural_weights"`
	
	// Performance settings
	BatchSize            int           `json:"batch_size"`
	CacheTTL             time.Duration `json:"cache_ttl"`
	UpdateInterval       time.Duration `json:"update_interval"`
	
	// Global content settings
	GlobalContentRatio   float64       `json:"global_content_ratio"`
	LocalContentRatio    float64       `json:"local_content_ratio"`
	TrendingBoost        float64       `json:"trending_boost"`
	QualityBoost         float64       `json:"quality_boost"`
}

// UserProfile represents user recommendation profile
type UserProfile struct {
	UserID              uuid.UUID  `json:"user_id"`
	Language            string     `json:"language"`
	Country             string     `json:"country"`
	Timezone            string     `json:"timezone"`
	Age                 int        `json:"age"`
	Gender              string     `json:"gender"`
	
	// Interest scores (0-1)
	CategoryInterests   map[string]float64 `json:"category_interests"`
	TagInterests        map[string]float64 `json:"tag_interests"`
	LanguageInterests   map[string]float64 `json:"language_interests"`
	
	// Behavioral patterns
	AvgWatchTime        float64    `json:"avg_watch_time"`
	SkipRate            float64    `json:"skip_rate"`
	EngagementRate      float64    `json:"engagement_rate"`
	PreferredQuality    string     `json:"preferred_quality"`
	PreferredDuration   int        `json:"preferred_duration"`
	
	// Temporal patterns
	ActiveHours         []int      `json:"active_hours"`
	ActiveDays          []int      `json:"active_days"`
	LastActive          time.Time  `json:"last_active"`
	
	// Social preferences
	SocialInfluence     float64    `json:"social_influence"`
	FollowingInterests  map[string]float64 `json:"following_interests"`
	
	// Discovery preferences
	DiscoveryRate       float64    `json:"discovery_rate"`
	GlobalContentPref   float64    `json:"global_content_pref"`
	
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

// VideoFeatures represents video feature vector
type VideoFeatures struct {
	VideoID             uuid.UUID  `json:"video_id"`
	UserID              uuid.UUID  `json:"user_id"`
	
	// Content features
	Category            string     `json:"category"`
	Tags                []string   `json:"tags"`
	Language            string     `json:"language"`
	Country             string     `json:"country"`
	Quality             string     `json:"quality"`
	Duration            int        `json:"duration"`
	
	// Engagement metrics
	ViewsCount          int64      `json:"views_count"`
	LikesCount          int64      `json:"likes_count"`
	CommentsCount       int64      `json:"comments_count"`
	SharesCount         int64      `json:"shares_count"`
	WatchTime           int64      `json:"watch_time"`
	RetentionRate       float64    `json:"retention_rate"`
	EngagementRate      float64    `json:"engagement_rate"`
	
	// Quality metrics
	QualityScore        float64    `json:"quality_score"`
	TrendingScore       float64    `json:"trending_score"`
	ViralScore          float64    `json:"viral_score"`
	
	// Cultural features
	CulturalScore       map[string]float64 `json:"cultural_score"`
	InternationalScore  float64    `json:"international_score"`
	
	// Temporal features
	PublishTime         time.Time  `json:"publish_time"`
	PeakHours           []int      `json:"peak_hours"`
	
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

// RecommendationRequest represents recommendation request
type RecommendationRequest struct {
	UserID              uuid.UUID  `json:"user_id"`
	Context             *RecommendationContext `json:"context"`
	MaxResults          int        `json:"max_results"`
	Filters             *RecommendationFilters `json:"filters"`
}

// RecommendationContext provides context for recommendations
type RecommendationContext struct {
	CurrentTime         time.Time  `json:"current_time"`
	CurrentVideo        *uuid.UUID `json:"current_video"`
	SessionDuration     int        `json:"session_duration"`
	DeviceType          string     `json:"device_type"`
	Platform            string     `json:"platform"`
	Location            *Location  `json:"location"`
	SearchQuery         string     `json:"search_query"`
}

// Location represents user location
type Location struct {
	Country             string     `json:"country"`
	City                string     `json:"city"`
	Timezone            string     `json:"timezone"`
	Latitude            float64    `json:"latitude"`
	Longitude           float64    `json:"longitude"`
}

// RecommendationFilters filters for recommendations
type RecommendationFilters struct {
	Categories          []string   `json:"categories"`
	Tags                []string   `json:"tags"`
	Languages           []string   `json:"languages"`
	Countries           []string   `json:"countries"`
	Quality             string     `json:"quality"`
	MinDuration         int        `json:"min_duration"`
	MaxDuration         int        `json:"max_duration"`
	MinViews            int64      `json:"min_views"`
	MinEngagementRate   float64    `json:"min_engagement_rate"`
	ExcludeWatched      bool       `json:"exclude_watched"`
	ExcludeFollowing    bool       `json:"exclude_following"`
}

// RecommendationResult represents recommendation result
type RecommendationResult struct {
	VideoID             uuid.UUID  `json:"video_id"`
	Score               float64    `json:"score"`
	Reason              string     `json:"reason"`
	Confidence          float64    `json:"confidence"`
	Features            []string   `json:"features"`
}

// RecommendationResponse represents recommendation response
type RecommendationResponse struct {
	UserID              uuid.UUID             `json:"user_id"`
	Recommendations     []*RecommendationResult `json:"recommendations"`
	Algorithm           string                `json:"algorithm"`
	Version             string                `json:"version"`
	GeneratedAt         time.Time             `json:"generated_at"`
	CacheHit            bool                  `json:"cache_hit"`
	ProcessingTime      time.Duration         `json:"processing_time"`
}

// NewRecommendationEngine creates a new recommendation engine
func NewRecommendationEngine(session *gocqlx.Session, cache RedisGlobalCache, config RecommendationConfig) *RecommendationEngine {
	re := &RecommendationEngine{
		session:       session,
		cache:         cache,
		config:        config,
		userProfiles:  make(map[uuid.UUID]*UserProfile),
		videoFeatures: make(map[uuid.UUID]*VideoFeatures),
		interestMatrix: mat.NewDense(1000, 1000, nil), // 1000x1000 interest matrix
	}

	// Start background processes
	go re.updateUserProfiles()
	go re.updateVideoFeatures()
	go re.buildInterestMatrix()
	go re.cleanupCache()

	return re
}

// GetRecommendations gets personalized recommendations for user
func (re *RecommendationEngine) GetRecommendations(ctx context.Context, req *RecommendationRequest) (*RecommendationResponse, error) {
	startTime := time.Now()

	// Check cache first
	if re.cache.IsReady() {
		cacheKey := fmt.Sprintf("recommendations:%s", req.UserID.String())
		cached, err := re.cache.GetRecommendations(ctx, cacheKey)
		if err == nil && cached != nil {
			cached.CacheHit = true
			cached.ProcessingTime = time.Since(startTime)
			return cached, nil
		}
	}

	// Get user profile
	userProfile, err := re.getUserProfile(ctx, req.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user profile: %w", err)
	}

	// Generate recommendations
	recommendations, err := re.generateRecommendations(ctx, userProfile, req)
	if err != nil {
		return nil, fmt.Errorf("failed to generate recommendations: %w", err)
	}

	// Create response
	response := &RecommendationResponse{
		UserID:          req.UserID,
		Recommendations: recommendations,
		Algorithm:       "global_ai_brain_v2",
		Version:         "2.0.0",
		GeneratedAt:     time.Now(),
		CacheHit:        false,
		ProcessingTime:  time.Since(startTime),
	}

	// Cache results
	if re.cache.IsReady() {
		cacheKey := fmt.Sprintf("recommendations:%s", req.UserID.String())
		re.cache.CacheRecommendations(ctx, cacheKey, response)
	}

	log.Printf("🧠 Recommendations generated for user %s: %d results in %v", 
		req.UserID, len(recommendations), time.Since(startTime))

	return response, nil
}

// getUserProfile gets or creates user profile
func (re *RecommendationEngine) getUserProfile(ctx context.Context, userID uuid.UUID) (*UserProfile, error) {
	re.mu.RLock()
	if profile, exists := re.userProfiles[userID]; exists {
		re.mu.RUnlock()
		return profile, nil
	}
	re.mu.RUnlock()

	// Load from database
	profile, err := re.loadUserProfileFromDB(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to load user profile: %w", err)
	}

	// Cache in memory
	re.mu.Lock()
	re.userProfiles[userID] = profile
	re.mu.Unlock()

	return profile, nil
}

// loadUserProfileFromDB loads user profile from database
func (re *RecommendationEngine) loadUserProfileFromDB(ctx context.Context, userID uuid.UUID) (*UserProfile, error) {
	// Get user data
	userQuery := qb.Select("users").
		Columns("user_id", "language", "timezone", "date_of_birth", "gender", "location", "created_at").
		Where(qb.Eq("user_id", userID)).
		ToCql()

	var user User
	err := re.session.Queryctx(ctx, userQuery, userID).Get(
		&user.UserID, &user.Language, &user.Timezone, &user.DateOfBirth, &user.Gender, &user.Location, &user.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Get user analytics
	analyticsQuery := qb.Select("user_analytics").
		Columns("user_id", "action", "duration", "device_type", "platform", "location", "timestamp").
		Where(qb.Eq("user_id", userID)).
		OrderBy("timestamp", qb.DESC).
		Limit(1000).
		ToCql()

	iter := re.session.Queryctx(ctx, analyticsQuery, userID)
	defer iter.Close()

	var analytics []*UserAnalytics
	for iter.StructScan(&UserAnalytics{}) {
		var analytic UserAnalytics
		if err := iter.Get(&analytic); err == nil {
			analytics = append(analytics, &analytic)
		}
	}

	// Build profile from data
	profile := &UserProfile{
		UserID:           user.UserID,
		Language:         user.Language,
		Country:          re.extractCountry(user.Location),
		Timezone:         user.Timezone,
		Age:              re.calculateAge(user.DateOfBirth),
		Gender:           user.Gender,
		CategoryInterests: make(map[string]float64),
		TagInterests:      make(map[string]float64),
		LanguageInterests: make(map[string]float64),
		FollowingInterests: make(map[string]float64),
		ActiveHours:      make([]int, 0),
		ActiveDays:       make([]int, 0),
		CreatedAt:        user.CreatedAt,
		UpdatedAt:        time.Now(),
	}

	// Analyze watch history
	re.analyzeWatchHistory(profile, analytics)

	// Calculate preferences
	re.calculateUserPreferences(profile)

	return profile, nil
}

// analyzeWatchHistory analyzes user watch history
func (re *RecommendationEngine) analyzeWatchHistory(profile *UserProfile, analytics []*UserAnalytics) {
	var totalWatchTime int64
	var totalVideos int
	var skippedVideos int
	var categoryCounts map[string]int = make(map[string]int)
	var tagCounts map[string]int = make(map[string]int)
	var languageCounts map[string]int = make(map[string]int)
	var hourCounts map[int]int = make(map[int]int)
	var dayCounts map[int]int = make(map[int]int)

	for _, analytic := range analytics {
		if analytic.Action == "view" {
			totalVideos++
			totalWatchTime += int64(analytic.Duration)

			// Extract hour and day
			hour := analytic.Timestamp.Hour()
			day := int(analytic.Timestamp.Weekday())
			hourCounts[hour]++
			dayCounts[day]++

			// Get video details to extract categories, tags, language
			if video, err := re.getVideoDetails(analytic.TargetID); err == nil {
				categoryCounts[video.Category]++
				for _, tag := range video.Tags {
					tagCounts[tag]++
				}
				languageCounts[video.Language]++
			}

			// Check if skipped (watch time < 30% of video duration)
			if analytic.Duration < 30 { // Assuming 30 seconds as skip threshold
				skippedVideos++
			}
		}
	}

	// Calculate averages
	if totalVideos > 0 {
		profile.AvgWatchTime = float64(totalWatchTime) / float64(totalVideos)
		profile.SkipRate = float64(skippedVideos) / float64(totalVideos)
		profile.EngagementRate = 1.0 - profile.SkipRate
	}

	// Calculate interest scores
	totalCategories := len(categoryCounts)
	for category, count := range categoryCounts {
		profile.CategoryInterests[category] = float64(count) / float64(totalCategories)
	}

	totalTags := len(tagCounts)
	for tag, count := range tagCounts {
		if totalTags > 0 {
			profile.TagInterests[tag] = float64(count) / float64(totalTags)
		}
	}

	totalLanguages := len(languageCounts)
	for language, count := range languageCounts {
		if totalLanguages > 0 {
			profile.LanguageInterests[language] = float64(count) / float64(totalLanguages)
		}
	}

	// Extract active hours and days
	for hour, count := range hourCounts {
		if count > totalVideos/24 { // Above average
			profile.ActiveHours = append(profile.ActiveHours, hour)
		}
	}

	for day, count := range dayCounts {
		if count > totalVideos/7 { // Above average
			profile.ActiveDays = append(profile.ActiveDays, day)
		}
	}
}

// calculateUserPreferences calculates user preferences
func (re *RecommendationEngine) calculateUserPreferences(profile *UserProfile) {
	// Set preferred quality based on engagement
	if profile.EngagementRate > 0.8 {
		profile.PreferredQuality = "4k"
	} else if profile.EngagementRate > 0.6 {
		profile.PreferredQuality = "1080p"
	} else if profile.EngagementRate > 0.4 {
		profile.PreferredQuality = "720p"
	} else {
		profile.PreferredQuality = "480p"
	}

	// Set preferred duration based on average watch time
	if profile.AvgWatchTime > 600 { // > 10 minutes
		profile.PreferredDuration = 1200 // 20 minutes
	} else if profile.AvgWatchTime > 300 { // > 5 minutes
		profile.PreferredDuration = 600 // 10 minutes
	} else {
		profile.PreferredDuration = 300 // 5 minutes
	}

	// Calculate discovery rate (how much user likes new content)
	profile.DiscoveryRate = profile.SkipRate * 0.5 + (1.0 - profile.EngagementRate) * 0.5

	// Calculate global content preference
	globalLangScore := 0.0
	for lang, score := range profile.LanguageInterests {
		if lang != profile.Language {
			globalLangScore += score
		}
	}
	profile.GlobalContentPref = globalLangScore / float64(len(profile.LanguageInterests))
}

// generateRecommendations generates personalized recommendations
func (re *RecommendationEngine) generateRecommendations(ctx context.Context, profile *UserProfile, req *RecommendationRequest) ([]*RecommendationResult, error) {
	var recommendations []*RecommendationResult

	// Get candidate videos
	candidates, err := re.getCandidateVideos(ctx, profile, req)
	if err != nil {
		return nil, fmt.Errorf("failed to get candidate videos: %w", err)
	}

	// Score candidates
	scores := re.scoreCandidates(profile, candidates)

	// Sort by score
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].Score > scores[j].Score
	})

	// Apply filters and return top results
	maxResults := req.MaxResults
	if maxResults == 0 {
		maxResults = re.config.MaxRecommendations
	}

	for i, score := range scores {
		if i >= maxResults {
			break
		}

		if re.passesFilters(score, req.Filters) {
			recommendations = append(recommendations, score)
		}
	}

	return recommendations, nil
}

// getCandidateVideos gets candidate videos for recommendation
func (re *RecommendationEngine) getCandidateVideos(ctx context.Context, profile *UserProfile, req *RecommendationRequest) ([]*VideoFeatures, error) {
	var candidates []*VideoFeatures

	// Get videos based on user interests
	for category, interest := range profile.CategoryInterests {
		if interest > 0.1 { // Only consider categories with >10% interest
			videos, err := re.getVideosByCategory(ctx, category, 100)
			if err != nil {
				log.Printf("Failed to get videos for category %s: %v", category, err)
				continue
			}
			candidates = append(candidates, videos...)
		}
	}

	// Get trending videos
	trendingVideos, err := re.getTrendingVideos(ctx, profile.Language, 50)
	if err == nil {
		candidates = append(candidates, trendingVideos...)
	}

	// Get international content based on preferences
	if profile.GlobalContentPref > 0.3 {
		internationalVideos, err := re.getInternationalVideos(ctx, profile, 50)
		if err == nil {
			candidates = append(candidates, internationalVideos...)
		}
	}

	// Remove duplicates
	seen := make(map[uuid.UUID]bool)
	var uniqueCandidates []*VideoFeatures
	for _, video := range candidates {
		if !seen[video.VideoID] {
			seen[video.VideoID] = true
			uniqueCandidates = append(uniqueCandidates, video)
		}
	}

	return uniqueCandidates, nil
}

// getVideosByCategory gets videos by category
func (re *RecommendationEngine) getVideosByCategory(ctx context.Context, category string, limit int) ([]*VideoFeatures, error) {
	query := qb.Select("videos").
		Columns("video_id", "user_id", "category", "tags", "language", "country", "quality", "duration", "created_at").
		Where(qb.Eq("category", category), qb.Eq("is_public", true)).
		OrderBy("created_at", qb.DESC).
		Limit(uint64(limit)).
		ToCql()

	iter := re.session.Queryctx(ctx, query)
	defer iter.Close()

	var videos []*VideoFeatures
	for iter.StructScan(&Video{}) {
		var video Video
		if err := iter.Get(&video); err == nil {
			features := re.videoToFeatures(&video)
			videos = append(videos, features)
		}
	}

	return videos, nil
}

// getTrendingVideos gets trending videos
func (re *RecommendationEngine) getTrendingVideos(ctx context.Context, language string, limit int) ([]*VideoFeatures, error) {
	query := qb.Select("video_stats").
		Columns("video_id", "views_count", "likes_count", "comments_count", "shares_count", "trending_score", "engagement_rate").
		Where(qb.Gt("trending_score", 0.5)).
		OrderBy("trending_score", qb.DESC).
		Limit(uint64(limit)).
		ToCql()

	iter := re.session.Queryctx(ctx, query)
	defer iter.Close()

	var videoIDs []uuid.UUID
	for iter.StructScan(&VideoStats{}) {
		var stats VideoStats
		if err := iter.Get(&stats); err == nil {
			videoIDs = append(videoIDs, stats.VideoID)
		}
	}

	// Get full video details
	var videos []*VideoFeatures
	for _, videoID := range videoIDs {
		video, err := re.getVideoDetails(videoID)
		if err == nil {
			features := re.videoToFeatures(video)
			videos = append(videos, features)
		}
	}

	return videos, nil
}

// getInternationalVideos gets international videos
func (re *RecommendationEngine) getInternationalVideos(ctx context.Context, profile *UserProfile, limit int) ([]*VideoFeatures, error) {
	// Get videos from different countries/languages
	query := qb.Select("videos").
		Columns("video_id", "user_id", "category", "tags", "language", "country", "quality", "duration", "created_at").
		Where(qb.NotEq("language", profile.Language), qb.NotEq("country", profile.Country), qb.Eq("is_public", true)).
		OrderBy("created_at", qb.DESC).
		Limit(uint64(limit)).
		ToCql()

	iter := re.session.Queryctx(ctx, query)
	defer iter.Close()

	var videos []*VideoFeatures
	for iter.StructScan(&Video{}) {
		var video Video
		if err := iter.Get(&video); err == nil {
			features := re.videoToFeatures(&video)
			videos = append(videos, features)
		}
	}

	return videos, nil
}

// scoreCandidates scores candidate videos
func (re *RecommendationEngine) scoreCandidates(profile *UserProfile, candidates []*VideoFeatures) []*RecommendationResult {
	var results []*RecommendationResult

	for _, video := range candidates {
		score := re.calculateScore(profile, video)
		
		result := &RecommendationResult{
			VideoID:    video.VideoID,
			Score:      score.Score,
			Reason:     score.Reason,
			Confidence: score.Confidence,
			Features:   score.Features,
		}

		results = append(results, result)
	}

	return results
}

// calculateScore calculates recommendation score
func (re *RecommendationEngine) calculateScore(profile *UserProfile, video *VideoFeatures) *RecommendationResult {
	var score float64
	var reasons []string
	var features []string
	var confidence float64

	// Category interest score
	if categoryScore, exists := profile.CategoryInterests[video.Category]; exists {
		score += categoryScore * 0.3
		reasons = append(reasons, fmt.Sprintf("category_interest:%.2f", categoryScore))
		features = append(features, "category_match")
	}

	// Language preference score
	if langScore, exists := profile.LanguageInterests[video.Language]; exists {
		score += langScore * 0.2
		reasons = append(reasons, fmt.Sprintf("language_interest:%.2f", langScore))
		features = append(features, "language_match")
	}

	// Tag interest score
	tagScore := 0.0
	matchingTags := 0
	for _, tag := range video.Tags {
		if tagInterest, exists := profile.TagInterests[tag]; exists {
			tagScore += tagInterest
			matchingTags++
		}
	}
	if len(video.Tags) > 0 {
		tagScore = tagScore / float64(len(video.Tags))
		score += tagScore * 0.2
		reasons = append(reasons, fmt.Sprintf("tag_interest:%.2f", tagScore))
		if matchingTags > 0 {
			features = append(features, "tag_match")
		}
	}

	// Quality preference score
	qualityScore := 0.0
	if video.Quality == profile.PreferredQuality {
		qualityScore = 1.0
	} else if video.Quality == "1080p" && profile.PreferredQuality == "4k" {
		qualityScore = 0.8
	} else if video.Quality == "720p" && profile.PreferredQuality == "1080p" {
		qualityScore = 0.8
	}
	score += qualityScore * 0.1
	reasons = append(reasons, fmt.Sprintf("quality_match:%.2f", qualityScore))
	if qualityScore > 0.5 {
		features = append(features, "quality_match")
	}

	// Duration preference score
	durationScore := 0.0
	durationDiff := math.Abs(float64(video.Duration - profile.PreferredDuration))
	if durationDiff < 300 { // Within 5 minutes
		durationScore = 1.0 - (durationDiff / 300.0)
	}
	score += durationScore * 0.1
	reasons = append(reasons, fmt.Sprintf("duration_match:%.2f", durationScore))
	if durationScore > 0.5 {
		features = append(features, "duration_match")
	}

	// Trending boost
	if video.TrendingScore > 0.7 {
		score += video.TrendingScore * re.config.TrendingBoost
		reasons = append(reasons, fmt.Sprintf("trending_boost:%.2f", video.TrendingScore))
		features = append(features, "trending")
	}

	// International content boost
	if video.InternationalScore > 0.5 {
		internationalBoost := profile.GlobalContentPref * video.InternationalScore * 0.2
		score += internationalBoost
		reasons = append(reasons, fmt.Sprintf("international_boost:%.2f", internationalBoost))
		features = append(features, "international")
	}

	// Cultural relevance
	if culturalScore, exists := video.CulturalScore[profile.Country]; exists {
		score += culturalScore * 0.1
		reasons = append(reasons, fmt.Sprintf("cultural_relevance:%.2f", culturalScore))
		features = append(features, "cultural_match")
	}

	// Calculate confidence based on data availability
	confidenceFactors := 0
	if len(profile.CategoryInterests) > 0 {
		confidenceFactors++
	}
	if len(profile.LanguageInterests) > 0 {
		confidenceFactors++
	}
	if len(profile.TagInterests) > 0 {
		confidenceFactors++
	}
	if profile.AvgWatchTime > 0 {
		confidenceFactors++
	}

	confidence = float64(confidenceFactors) / 4.0

	// Normalize score to 0-1 range
	score = math.Min(1.0, math.Max(0.0, score))

	return &RecommendationResult{
		VideoID:    video.VideoID,
		Score:      score,
		Reason:     strings.Join(reasons, ","),
		Confidence: confidence,
		Features:   features,
	}
}

// passesFilters checks if recommendation passes filters
func (re *RecommendationEngine) passesFilters(result *RecommendationResult, filters *RecommendationFilters) bool {
	if filters == nil {
		return true
	}

	// Get video details
	video, err := re.getVideoDetails(result.VideoID)
	if err != nil {
		return false
	}

	// Category filter
	if len(filters.Categories) > 0 {
		found := false
		for _, category := range filters.Categories {
			if video.Category == category {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}

	// Language filter
	if len(filters.Languages) > 0 {
		found := false
		for _, language := range filters.Languages {
			if video.Language == language {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}

	// Quality filter
	if filters.Quality != "" && video.Quality != filters.Quality {
		return false
	}

	// Duration filter
	if filters.MinDuration > 0 && video.Duration < filters.MinDuration {
		return false
	}
	if filters.MaxDuration > 0 && video.Duration > filters.MaxDuration {
		return false
	}

	return true
}

// Helper functions

func (re *RecommendationEngine) extractCountry(location string) string {
	// Simple country extraction - in production would use geocoding
	parts := strings.Split(location, ",")
	if len(parts) > 0 {
		return strings.TrimSpace(parts[len(parts)-1])
	}
	return "Unknown"
}

func (re *RecommendationEngine) calculateAge(dob time.Time) int {
	now := time.Now()
	age := now.Year() - dob.Year()
	if now.Month() < dob.Month() || (now.Month() == dob.Month() && now.Day() < dob.Day()) {
		age--
	}
	return age
}

func (re *RecommendationEngine) getVideoDetails(videoID uuid.UUID) (*Video, error) {
	query := qb.Select("videos").
		Columns("video_id", "user_id", "title", "description", "category", "tags", "language", "country", "quality", "duration", "created_at").
		Where(qb.Eq("video_id", videoID)).
		ToCql()

	var video Video
	err := re.session.Queryctx(context.Background(), query, videoID).Get(
		&video.VideoID, &video.UserID, &video.Title, &video.Description, &video.Category, &video.Tags, &video.Language, &video.Country, &video.Quality, &video.Duration, &video.CreatedAt)

	if err != nil {
		return nil, err
	}

	return &video, nil
}

func (re *RecommendationEngine) videoToFeatures(video *Video) *VideoFeatures {
	return &VideoFeatures{
		VideoID:    video.VideoID,
		UserID:     video.UserID,
		Category:   video.Category,
		Tags:       video.Tags,
		Language:   video.Language,
		Country:    re.extractCountry(video.Location),
		Quality:    video.Quality,
		Duration:   video.Duration,
		CreatedAt:  video.CreatedAt,
		UpdatedAt:  video.UpdatedAt,
	}
}

// Background processes

func (re *RecommendationEngine) updateUserProfiles() {
	ticker := time.NewTicker(re.config.UpdateInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			re.refreshUserProfiles()
		}
	}
}

func (re *RecommendationEngine) updateVideoFeatures() {
	ticker := time.NewTicker(re.config.UpdateInterval * 2)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			re.refreshVideoFeatures()
		}
	}
}

func (re *RecommendationEngine) buildInterestMatrix() {
	ticker := time.NewTicker(re.config.UpdateInterval * 4)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			re.rebuildInterestMatrix()
		}
	}
}

func (re *RecommendationEngine) cleanupCache() {
	ticker := time.NewTicker(re.config.CacheTTL)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			re.cleanExpiredCache()
		}
	}
}

func (re *RecommendationEngine) refreshUserProfiles() {
	// Implementation for refreshing user profiles
	log.Println("🧠 Refreshing user profiles...")
}

func (re *RecommendationEngine) refreshVideoFeatures() {
	// Implementation for refreshing video features
	log.Println("🎬 Refreshing video features...")
}

func (re *RecommendationEngine) rebuildInterestMatrix() {
	// Implementation for rebuilding interest matrix
	log.Println("🔄 Rebuilding interest matrix...")
}

func (re *RecommendationEngine) cleanExpiredCache() {
	// Implementation for cleaning expired cache
	log.Println("🧹 Cleaning expired cache...")
}

// Close closes the recommendation engine
func (re *RecommendationEngine) Close() error {
	log.Println("🔌 Recommendation engine closed")
	return nil
}
