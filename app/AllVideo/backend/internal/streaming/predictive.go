package streaming

import (
	"context"
	"fmt"
	"math"
	"sort"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"kronop-backend/internal/network"
	"kronop-backend/internal/cache"
)

type PredictiveManager struct {
	mu               sync.RWMutex
	networkOptimizer *network.Optimizer
	cacheManager     *cache.Manager
	userProfiles     map[string]*UserProfile
	prefetchQueue    chan PrefetchJob
	activeJobs       map[string]*PrefetchJob
	watchHistory     map[string][]WatchSession
}

type UserProfile struct {
	UserID           string
	Preferences      UserPreferences
	WatchHistory     []WatchSession
	Patterns         []ViewingPattern
	LastActive       time.Time
	PrefetchEnabled  bool
}

type UserPreferences struct {
	PreferredGenres     []string
	PreferredQuality    string
	WatchTimePreference string // "short", "medium", "long"
	SkipRate           float64
	CompletionRate     float64
	ActiveHours        []int // Hours of day when user is most active
}

type WatchSession struct {
	SessionID    string
	VideoID      string
	StartTime    time.Time
	EndTime      time.Time
	WatchedDuration time.Duration
	TotalDuration time.Duration
	Quality      string
	Completed    bool
	Skipped      bool
}

type ViewingPattern struct {
	PatternType   string // "genre", "time", "sequence", "quality"
	Confidence    float64 // 0-1
	Data          map[string]interface{}
	LastUpdated   time.Time
}

type PrefetchJob struct {
	JobID         string
	UserID        string
	VideoID       string
	Quality       string
	Priority      int
	Progress      float64 // 0-100
	TargetPercent float64 // 30% for next videos
	StartTime     time.Time
	EndTime       time.Time
	Status        string // "queued", "downloading", "completed", "failed", "paused"
	Segments      []PrefetchSegment
	Reason        string
}

type PrefetchSegment struct {
	Index       int
	Quality     string
	URL         string
	Status      string
	Size        int64
	DownloadTime time.Duration
	RetryCount  int
}

type PredictionResult struct {
	NextVideos    []PredictedVideo
	Confidence    float64
	Reason        string
	GeneratedAt   time.Time
}

type PredictedVideo struct {
	VideoID       string
	Probability   float64 // 0-1
	Reason        string
	EstimatedWatch time.Time
	Priority      int
}

const (
	PrefetchTargetPercent = 30.0 // 30% of video
	MaxPrefetchJobs       = 5
	PrefetchTimeout       = 30 * time.Minute
	MinConfidenceThreshold = 0.3
)

func NewPredictiveManager(networkOptimizer *network.Optimizer, cacheManager *cache.Manager) *PredictiveManager {
	pm := &PredictiveManager{
		networkOptimizer: networkOptimizer,
		cacheManager:     cacheManager,
		userProfiles:     make(map[string]*UserProfile),
		prefetchQueue:    make(chan PrefetchJob, 100),
		activeJobs:       make(map[string]*PrefetchJob),
		watchHistory:     make(map[string][]WatchSession),
	}
	
	// Start prefetch workers
	go pm.startPrefetchWorkers()
	
	// Start pattern analysis
	go pm.startPatternAnalysis()
	
	return pm
}

// StartPredictivePrefetching initiates predictive pre-fetching for a user
func (p *PredictiveManager) StartPredictivePrefetching(c *gin.Context) {
	var request struct {
		UserID    string `json:"userId" binding:"required"`
		VideoID   string `json:"videoId" binding:"required"`
		SessionID string `json:"sessionId" binding:"required"`
		Quality   string `json:"quality"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Get or create user profile
	profile := p.getOrCreateUserProfile(request.UserID)
	
	// Record current watch session
	p.recordWatchSession(request.UserID, request.VideoID, request.SessionID, request.Quality)
	
	// Predict next videos
	prediction := p.predictNextVideos(request.UserID, request.VideoID)
	
	// Start prefetching predicted videos
	prefetchCount := 0
	for _, predictedVideo := range prediction.NextVideos {
		if prefetchCount >= MaxPrefetchJobs {
			break
		}
		
		if predictedVideo.Probability >= MinConfidenceThreshold {
			job := p.createPrefetchJob(request.UserID, predictedVideo, request.Quality)
			
			// Queue for prefetching
			select {
			case p.prefetchQueue <- job:
				prefetchCount++
				p.mu.Lock()
				p.activeJobs[job.JobID] = &job
				p.mu.Unlock()
			default:
				// Queue full, skip
			}
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"prediction": prediction,
		"prefetchJobs": prefetchCount,
		"message": fmt.Sprintf("Started predictive prefetching for %d videos", prefetchCount),
	})
}

// GetPrefetchStatus returns current prefetch status
func (p *PredictiveManager) GetPrefetchStatus(c *gin.Context) {
	userID := c.Param("userId")
	
	p.mu.RLock()
	defer p.mu.RUnlock()
	
	var userJobs []PrefetchJob
	for _, job := range p.activeJobs {
		if job.UserID == userID {
			userJobs = append(userJobs, *job)
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"userId": userID,
		"activeJobs": len(userJobs),
		"jobs": userJobs,
	})
}

// UpdateWatchProgress updates viewing progress for pattern learning
func (p *PredictiveManager) UpdateWatchProgress(c *gin.Context) {
	var request struct {
		UserID          string  `json:"userId" binding:"required"`
		SessionID       string  `json:"sessionId" binding:"required"`
		CurrentPosition float64 `json:"currentPosition"` // seconds
		TotalDuration   float64 `json:"totalDuration"`   // seconds
		Quality         string  `json:"quality"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Update watch session progress
	p.updateSessionProgress(request.UserID, request.SessionID, request.CurrentPosition, request.TotalDuration)
	
	// Check if we should trigger new predictions
	if p.shouldTriggerNewPrediction(request.UserID, request.CurrentPosition, request.TotalDuration) {
		go p.triggerNewPrediction(request.UserID)
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Progress updated"})
}

// predictNextVideos uses ML-like algorithms to predict what user will watch next
func (p *PredictiveManager) predictNextVideos(userID, currentVideoID string) PredictionResult {
	profile := p.getUserProfile(userID)
	if profile == nil {
		return PredictionResult{
			NextVideos:  []PredictedVideo{},
			Confidence:  0.0,
			Reason:      "No user data available",
			GeneratedAt: time.Now(),
		}
	}
	
	var predictions []PredictedVideo
	var totalConfidence float64
	
	// 1. Content-based prediction (similar videos)
	contentPredictions := p.predictByContent(profile, currentVideoID)
	predictions = append(predictions, contentPredictions...)
	
	// 2. Collaborative filtering (users with similar taste)
	collaborativePredictions := p.predictByCollaborativeFiltering(profile, currentVideoID)
	predictions = append(predictions, collaborativePredictions...)
	
	// 3. Sequential pattern prediction (watching sequences)
	sequencePredictions := p.predictBySequentialPatterns(profile, currentVideoID)
	predictions = append(predictions, sequencePredictions...)
	
	// 4. Time-based prediction (what user watches at this time)
	timePredictions := p.predictByTimePatterns(profile)
	predictions = append(predictions, timePredictions...)
	
	// Deduplicate and rank predictions
	predictions = p.deduplicateAndRank(predictions)
	
	// Calculate overall confidence
	if len(predictions) > 0 {
		for _, pred := range predictions {
			totalConfidence += pred.Probability
		}
		totalConfidence /= float64(len(predictions))
	}
	
	result := PredictionResult{
		NextVideos:  predictions[:min(len(predictions), 5)], // Top 5
		Confidence:  totalConfidence,
		Reason:      fmt.Sprintf("Based on %d patterns from user history", len(profile.Patterns)),
		GeneratedAt: time.Now(),
	}
	
	return result
}

// predictByContent predicts based on similar content
func (p *PredictiveManager) predictByContent(profile *UserProfile, currentVideoID string) []PredictedVideo {
	// Get video metadata (simplified - would use actual video service)
	currentVideo := p.getVideoMetadata(currentVideoID)
	
	var predictions []PredictedVideo
	
	// Find videos with similar genre, category, or tags
	similarVideos := p.findSimilarVideos(currentVideo)
	
	for _, video := range similarVideos {
		probability := p.calculateContentSimilarity(currentVideo, video, profile)
		
		if probability > 0.1 {
			predictions = append(predictions, PredictedVideo{
				VideoID:       video.ID,
				Probability:   probability,
				Reason:        fmt.Sprintf("Similar to %s (%s)", currentVideo.Title, video.Category),
				EstimatedWatch: time.Now().Add(5 * time.Minute),
				Priority:      2,
			})
		}
	}
	
	return predictions
}

// predictByCollaborativeFiltering predicts based on similar users
func (p *PredictiveManager) predictByCollaborativeFiltering(profile *UserProfile, currentVideoID string) []PredictedVideo {
	var predictions []PredictedVideo
	
	// Find users with similar viewing patterns
	similarUsers := p.findSimilarUsers(profile.UserID)
	
	// Get videos watched by similar users after current video
	nextVideos := p.getNextVideosFromSimilarUsers(similarUsers, currentVideoID)
	
	for videoID, count := range nextVideos {
		probability := float64(count) / float64(len(similarUsers))
		
		if probability > 0.2 {
			video := p.getVideoMetadata(videoID)
			predictions = append(predictions, PredictedVideo{
				VideoID:       videoID,
				Probability:   probability,
				Reason:        fmt.Sprintf("Users like you watched this after %s", currentVideoID),
				EstimatedWatch: time.Now().Add(10 * time.Minute),
				Priority:      3,
			})
		}
	}
	
	return predictions
}

// predictBySequentialPatterns predicts based on viewing sequences
func (p *PredictiveManager) predictBySequentialPatterns(profile *UserProfile, currentVideoID string) []PredictedVideo {
	var predictions []PredictedVideo
	
	// Find sequential patterns in user's history
	for _, pattern := range profile.Patterns {
		if pattern.PatternType == "sequence" {
			// Check if current video matches pattern start
			if sequence, ok := pattern.Data["sequence"].([]string); ok {
				for i, videoID := range sequence {
					if videoID == currentVideoID && i+1 < len(sequence) {
						nextVideoID := sequence[i+1]
						probability := pattern.Confidence * 0.8 // High confidence for sequential patterns
						
						predictions = append(predictions, PredictedVideo{
							VideoID:       nextVideoID,
							Probability:   probability,
							Reason:        fmt.Sprintf("You usually watch %s after %s", nextVideoID, currentVideoID),
							EstimatedWatch: time.Now().Add(3 * time.Minute),
							Priority:      1, // Highest priority
						})
						break
					}
				}
			}
		}
	}
	
	return predictions
}

// predictByTimePatterns predicts based on time of day
func (p *PredictiveManager) predictByTimePatterns(profile *UserProfile) []PredictedVideo {
	var predictions []PredictedVideo
	
	currentHour := time.Now().Hour()
	
	// Check if current hour matches user's active hours
	for _, activeHour := range profile.Preferences.ActiveHours {
		if activeHour == currentHour {
			// Get videos user typically watches at this time
			timeVideos := p.getVideosByTimePattern(profile.UserID, currentHour)
			
			for _, videoID := range timeVideos {
				probability := 0.3 // Moderate confidence for time-based predictions
				
				predictions = append(predictions, PredictedVideo{
					VideoID:       videoID,
					Probability:   probability,
					Reason:        fmt.Sprintf("You often watch this at %d:00", currentHour),
					EstimatedWatch: time.Now().Add(15 * time.Minute),
					Priority:      4,
				})
			}
			break
		}
	}
	
	return predictions
}

// createPrefetchJob creates a prefetch job for predicted video
func (p *PredictiveManager) createPrefetchJob(userID string, video PredictedVideo, quality string) PrefetchJob {
	jobID := fmt.Sprintf("%s-%s-%d", userID, video.VideoID, time.Now().UnixNano())
	
	// Select optimal quality for prefetching
	prefetchQuality := p.selectPrefetchQuality(userID, quality)
	
	// Get video segments to prefetch
	segments := p.getVideoSegments(video.VideoID, prefetchQuality)
	
	// Calculate how many segments to download (30% of video)
	targetSegments := int(float64(len(segments)) * (PrefetchTargetPercent / 100.0))
	if targetSegments > len(segments) {
		targetSegments = len(segments)
	}
	
	// Create prefetch segments
	var prefetchSegments []PrefetchSegment
	for i := 0; i < targetSegments; i++ {
		prefetchSegments = append(prefetchSegments, PrefetchSegment{
			Index:   i,
			Quality: prefetchQuality,
			URL:     fmt.Sprintf("/api/v1/stream/%s/%s/segment_%03d.ts", video.VideoID, prefetchQuality, i),
			Status:  "queued",
		})
	}
	
	return PrefetchJob{
		JobID:         jobID,
		UserID:        userID,
		VideoID:       video.VideoID,
		Quality:       prefetchQuality,
		Priority:      video.Priority,
		Progress:      0.0,
		TargetPercent: PrefetchTargetPercent,
		StartTime:     time.Now(),
		Status:        "queued",
		Segments:      prefetchSegments,
		Reason:        video.Reason,
	}
}

// startPrefetchWorkers runs background workers for prefetching
func (p *PredictiveManager) startPrefetchWorkers() {
	numWorkers := 3 // Concurrent prefetch workers
	
	for i := 0; i < numWorkers; i++ {
		go func(workerID int) {
			for job := range p.prefetchQueue {
				p.processPrefetchJob(job, workerID)
			}
		}(i)
	}
}

// processPrefetchJob handles individual prefetch job
func (p *PredictiveManager) processPrefetchJob(job PrefetchJob, workerID int) {
	// Update job status
	p.mu.Lock()
	if activeJob, exists := p.activeJobs[job.JobID]; exists {
		activeJob.Status = "downloading"
		activeJob.StartTime = time.Now()
	}
	p.mu.Unlock()
	
	// Download segments
	completedSegments := 0
	for i, segment := range job.Segments {
		// Check if already cached
		cacheKey := p.cacheManager.GenerateCacheKey(job.VideoID, segment.Quality, fmt.Sprintf("segment_%03d.ts", i))
		if _, found := p.cacheManager.Get(cacheKey); found {
			segment.Status = "completed"
			completedSegments++
			continue
		}
		
		// Download segment
		if err := p.downloadSegment(segment); err == nil {
			segment.Status = "completed"
			completedSegments++
		} else {
			segment.Status = "failed"
			segment.RetryCount++
		}
		
		// Update progress
		progress := float64(completedSegments) / float64(len(job.Segments)) * 100
		
		p.mu.Lock()
		if activeJob, exists := p.activeJobs[job.JobID]; exists {
			activeJob.Progress = progress
			activeJob.Segments[i] = segment
		}
		p.mu.Unlock()
		
		// Small delay to prevent overwhelming network
		time.Sleep(100 * time.Millisecond)
	}
	
	// Mark job as completed
	p.mu.Lock()
	if activeJob, exists := p.activeJobs[job.JobID]; exists {
		activeJob.Status = "completed"
		activeJob.EndTime = time.Now()
		activeJob.Progress = 100.0
	}
	p.mu.Unlock()
}

// downloadSegment downloads a single segment
func (p *PredictiveManager) downloadSegment(segment PrefetchSegment) error {
	// Simulate segment download (in production, fetch from CDN)
	start := time.Now()
	
	// Check network conditions and adjust download strategy
	networkQuality := p.networkOptimizer.GetCurrentQuality()
	
	// Add delay based on network quality
	switch networkQuality {
	case "2g":
		time.Sleep(2 * time.Second) // Simulate slow download
	case "3g":
		time.Sleep(1 * time.Second)
	case "4g":
		time.Sleep(500 * time.Millisecond)
	default:
		time.Sleep(200 * time.Millisecond)
	}
	
	segment.DownloadTime = time.Since(start)
	
	// Cache the segment
	cacheKey := p.cacheManager.GenerateCacheKey("prefetch", segment.Quality, fmt.Sprintf("segment_%03d.ts", segment.Index))
	segmentData := []byte(fmt.Sprintf("prefetch-data-%s-%d", segment.Quality, segment.Index))
	p.cacheManager.Set(cacheKey, segmentData, 30*time.Minute)
	
	return nil
}

// Helper functions

func (p *PredictiveManager) getOrCreateUserProfile(userID string) *UserProfile {
	p.mu.RLock()
	profile, exists := p.userProfiles[userID]
	p.mu.RUnlock()
	
	if !exists {
		profile = &UserProfile{
			UserID:          userID,
			Preferences:     UserPreferences{PreferredQuality: "auto"},
			WatchHistory:    []WatchSession{},
			Patterns:        []ViewingPattern{},
			LastActive:      time.Now(),
			PrefetchEnabled: true,
		}
		
		p.mu.Lock()
		p.userProfiles[userID] = profile
		p.mu.Unlock()
	}
	
	return profile
}

func (p *PredictiveManager) getUserProfile(userID string) *UserProfile {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.userProfiles[userID]
}

func (p *PredictiveManager) recordWatchSession(userID, videoID, sessionID, quality string) {
	session := WatchSession{
		SessionID:      sessionID,
		VideoID:        videoID,
		StartTime:      time.Now(),
		Quality:        quality,
		Completed:      false,
	}
	
	p.mu.Lock()
	defer p.mu.Unlock()
	
	if p.watchHistory[userID] == nil {
		p.watchHistory[userID] = []WatchSession{}
	}
	p.watchHistory[userID] = append(p.watchHistory[userID], session)
}

func (p *PredictiveManager) updateSessionProgress(userID, sessionID string, currentPosition, totalDuration float64) {
	p.mu.Lock()
	defer p.mu.Unlock()
	
	sessions := p.watchHistory[userID]
	for i, session := range sessions {
		if session.SessionID == sessionID {
			sessions[i].WatchedDuration = time.Duration(currentPosition) * time.Second
			sessions[i].TotalDuration = time.Duration(totalDuration) * time.Second
			
			// Mark as completed if watched 90% or more
			if currentPosition/totalDuration >= 0.9 {
				sessions[i].Completed = true
			}
			break
		}
	}
}

func (p *PredictiveManager) shouldTriggerNewPrediction(userID string, currentPosition, totalDuration float64) bool {
	// Trigger prediction when user is 70% through current video
	return (currentPosition / totalDuration) >= 0.7
}

func (p *PredictiveManager) triggerNewPrediction(userID string) {
	// Get current session
	p.mu.RLock()
	sessions := p.watchHistory[userID]
	p.mu.RUnlock()
	
	if len(sessions) > 0 {
		currentSession := sessions[len(sessions)-1]
		prediction := p.predictNextVideos(userID, currentSession.VideoID)
		
		// Start prefetching for high-confidence predictions
		for _, predictedVideo := range prediction.NextVideos {
			if predictedVideo.Probability >= 0.5 {
				job := p.createPrefetchJob(userID, predictedVideo, "auto")
				
				select {
				case p.prefetchQueue <- job:
					p.mu.Lock()
					p.activeJobs[job.JobID] = &job
					p.mu.Unlock()
				default:
					// Queue full
				}
			}
		}
	}
}

func (p *PredictiveManager) selectPrefetchQuality(userID, requestedQuality string) string {
	// Use slightly lower quality for prefetching to save bandwidth
	networkQuality := p.networkOptimizer.GetCurrentQuality()
	
	switch networkQuality {
	case "2g":
		return "144p"
	case "3g":
		return "240p"
	case "4g":
		return "360p"
	default:
		return "480p"
	}
}

func (p *PredictiveManager) getVideoSegments(videoID, quality string) []string {
	// Simulate getting video segments (in production, read from manifest)
	segments := make([]string, 600) // 10 minutes video, 1-second segments
	for i := 0; i < 600; i++ {
		segments[i] = fmt.Sprintf("segment_%03d.ts", i)
	}
	return segments
}

func (p *PredictiveManager) deduplicateAndRank(predictions []PredictedVideo) []PredictedVideo {
	// Remove duplicates
	seen := make(map[string]bool)
	var unique []PredictedVideo
	
	for _, pred := range predictions {
		if !seen[pred.VideoID] {
			seen[pred.VideoID] = true
			unique = append(unique, pred)
		}
	}
	
	// Sort by probability and priority
	sort.Slice(unique, func(i, j int) bool {
		if unique[i].Probability != unique[j].Probability {
			return unique[i].Probability > unique[j].Probability
		}
		return unique[i].Priority < unique[j].Priority
	})
	
	return unique
}

// Mock functions (would integrate with actual services)
func (p *PredictiveManager) getVideoMetadata(videoID string) VideoMetadata {
	return VideoMetadata{
		ID:       videoID,
		Title:    fmt.Sprintf("Video %s", videoID),
		Category: "entertainment",
		Duration: 600, // 10 minutes
	}
}

func (p *PredictiveManager) findSimilarVideos(video VideoMetadata) []VideoMetadata {
	// Mock similar videos
	return []VideoMetadata{
		{ID: "similar1", Title: "Similar Video 1", Category: video.Category},
		{ID: "similar2", Title: "Similar Video 2", Category: video.Category},
	}
}

func (p *PredictiveManager) calculateContentSimilarity(video1, video2 VideoMetadata, profile *UserProfile) float64 {
	// Simplified similarity calculation
	if video1.Category == video2.Category {
		return 0.7
	}
	return 0.3
}

func (p *PredictiveManager) findSimilarUsers(userID string) []string {
	// Mock similar users
	return []string{"user1", "user2", "user3"}
}

func (p *PredictiveManager) getNextVideosFromSimilarUsers(users []string, currentVideoID string) map[string]int {
	// Mock next videos from similar users
	return map[string]int{
		"next1": 2,
		"next2": 1,
		"next3": 3,
	}
}

func (p *PredictiveManager) getVideosByTimePattern(userID string, hour int) []string {
	// Mock time-based videos
	return []string{"time1", "time2"}
}

func (p *PredictiveManager) startPatternAnalysis() {
	// Run pattern analysis every hour
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()
	
	for range ticker.C {
		p.analyzeUserPatterns()
	}
}

func (p *PredictiveManager) analyzeUserPatterns() {
	p.mu.RLock()
	defer p.mu.RUnlock()
	
	// Analyze patterns for each user
	for userID, profile := range p.userProfiles {
		p.analyzeUserPatternsInternal(userID, profile)
	}
}

func (p *PredictiveManager) analyzeUserPatternsInternal(userID string, profile *UserProfile) {
	// Analyze viewing patterns and update profile.Patterns
	// This would implement ML-like pattern detection
}

type VideoMetadata struct {
	ID       string
	Title    string
	Category string
	Duration int // seconds
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
