/**
 * Preload Manager - Intelligent Video Preloading
 * 
 * Manages video preloading for zero-latency playback
 * Implements user behavior prediction
 * Provides intelligent cache management
 * 
 * Features:
 * - Intelligent video preloading
 * - User behavior prediction
 * - Priority-based queuing
 * - Cache management
 */

package streaming

import (
	"context"
	"fmt"
	"log"
	"sort"
	"sync"
	"time"
)

// AddToQueue adds a task to the preload queue
func (pm *PreloadManager) AddToQueue(task *PreloadTask) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	if !pm.enabled {
		return fmt.Errorf("preloading is disabled")
	}

	if len(pm.preloadQueue.queue) >= pm.preloadQueue.maxSize {
		// Remove lowest priority task
		pm.removeLowestPriorityTask()
	}

	// Add task to queue
	task.CreatedAt = time.Now()
	task.ScheduledAt = time.Now()
	task.Status = "pending"

	pm.preloadQueue.queue = append(pm.preloadQueue.queue, task)

	// Sort queue by priority
	pm.sortQueueByPriority()

	log.Printf("📦 Added preload task to queue: %s (priority: %d)", task.TaskID, task.Priority)

	return nil
}

// GetPendingTasks gets pending preload tasks
func (pm *PreloadManager) GetPendingTasks() []*PreloadTask {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	var pendingTasks []*PreloadTask
	for _, task := range pm.preloadQueue.queue {
		if task.Status == "pending" {
			pendingTasks = append(pendingTasks, task)
		}
	}

	return pendingTasks
}

// GetTask gets a specific task
func (pm *PreloadManager) GetTask(videoID string) (*PreloadTask, error) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	for _, task := range pm.preloadQueue.queue {
		if task.VideoID == videoID {
			return task, nil
		}
	}

	return nil, fmt.Errorf("task not found for video %s", videoID)
}

// GetFromCache gets video from preload cache
func (pm *PreloadManager) GetFromCache(videoID string) (*PreloadedVideo, error) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	video, exists := pm.preloadCache.cache[videoID]
	if !exists {
		return nil, fmt.Errorf("video not found in cache")
	}

	// Check if video is expired
	if time.Now().After(video.ExpiresAt) {
		delete(pm.preloadCache.cache, videoID)
		pm.preloadCache.currentSize -= video.Size
		return nil, fmt.Errorf("video expired in cache")
	}

	// Update access metrics
	video.LastAccessed = time.Now()
	video.AccessCount++
	video.HitCount++

	// Update cache hit rate
	pm.updateCacheHitRate(true)

	log.Printf("⚡ Cache hit for video: %s (access count: %d)", videoID, video.AccessCount)

	return video, nil
}

// AddToCache adds video to preload cache
func (pm *PreloadManager) AddToCache(video *PreloadedVideo) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	// Check cache size
	if pm.preloadCache.currentSize+video.Size > pm.preloadCache.maxSize {
		// Evict old videos
		err := pm.evictOldVideos(video.Size)
		if err != nil {
			return fmt.Errorf("failed to evict old videos: %w", err)
		}
	}

	// Add to cache
	pm.preloadCache.cache[video.VideoID] = video
	pm.preloadCache.currentSize += video.Size

	// Update cache hit rate
	pm.updateCacheHitRate(false)

	log.Printf("📦 Added video to cache: %s (%d bytes)", video.VideoID, video.Size)

	return nil
}

// removeLowestPriorityTask removes lowest priority task
func (pm *PreloadManager) removeLowestPriorityTask() {
	if len(pm.preloadQueue.queue) == 0 {
		return
	}

	// Find task with lowest priority
	lowestPriority := pm.preloadQueue.queue[0].Priority
	lowestIndex := 0

	for i, task := range pm.preloadQueue.queue {
		if task.Priority < lowestPriority {
			lowestPriority = task.Priority
			lowestIndex = i
		}
	}

	// Remove task
	removedTask := pm.preloadQueue.queue[lowestIndex]
	pm.preloadQueue.queue = append(pm.preloadQueue.queue[:lowestIndex], pm.preloadQueue.queue[lowestIndex+1:]...)

	log.Printf("🗑️ Removed lowest priority task: %s (priority: %d)", removedTask.TaskID, lowestPriority)
}

// sortQueueByPriority sorts queue by priority
func (pm *PreloadManager) sortQueueByPriority() {
	sort.Slice(pm.preloadQueue.queue, func(i, j int) bool {
		// Higher priority first
		return pm.preloadQueue.queue[i].Priority > pm.preloadQueue.queue[j].Priority
	})
}

// evictOldVideos evicts old videos from cache
func (pm *PreloadManager) evictOldVideos(requiredSpace int64) error {
	if pm.preloadCache.evictionPolicy == "lru" {
		return pm.evictLRU(requiredSpace)
	} else if pm.preloadCache.evictionPolicy == "lfu" {
		return pm.evictLFU(requiredSpace)
	} else if pm.preloadCache.evictionPolicy == "fifo" {
		return pm.evictFIFO(requiredSpace)
	}

	return fmt.Errorf("unknown eviction policy: %s", pm.preloadCache.evictionPolicy)
}

// evictLRU evicts least recently used videos
func (pm *PreloadManager) evictLRU(requiredSpace int64) error {
	var videos []*PreloadedVideo
	for _, video := range pm.preloadCache.cache {
		videos = append(videos, video)
	}

	// Sort by last accessed time (oldest first)
	sort.Slice(videos, func(i, j int) bool {
		return videos[i].LastAccessed.Before(videos[j].LastAccessed)
	})

	// Evict videos until enough space is freed
	freedSpace := int64(0)
	for _, video := range videos {
		if freedSpace >= requiredSpace {
			break
		}

		delete(pm.preloadCache.cache, video.VideoID)
		pm.preloadCache.currentSize -= video.Size
		freedSpace += video.Size

		log.Printf("🗑️ Evicted LRU video: %s (%d bytes)", video.VideoID, video.Size)
	}

	return nil
}

// evictLFU evicts least frequently used videos
func (pm *PreloadManager) evictLFU(requiredSpace int64) error {
	var videos []*PreloadedVideo
	for _, video := range pm.preloadCache.cache {
		videos = append(videos, video)
	}

	// Sort by access count (lowest first)
	sort.Slice(videos, func(i, j int) bool {
		return videos[i].AccessCount < videos[j].AccessCount
	})

	// Evict videos until enough space is freed
	freedSpace := int64(0)
	for _, video := range videos {
		if freedSpace >= requiredSpace {
			break
		}

		delete(pm.preloadCache.cache, video.VideoID)
		pm.preloadCache.currentSize -= video.Size
		freedSpace += video.Size

		log.Printf("🗑️ Evicted LFU video: %s (access count: %d)", video.VideoID, video.AccessCount)
	}

	return nil
}

// evictFIFO evicts first-in videos
func (pm *PreloadManager) evictFIFO(requiredSpace int64) error {
	var videos []*PreloadedVideo
	for _, video := range pm.preloadCache.cache {
		videos = append(videos, video)
	}

	// Sort by loaded time (oldest first)
	sort.Slice(videos, func(i, j int) bool {
		return videos[i].LoadedAt.Before(videos[j].LoadedAt)
	})

	// Evict videos until enough space is freed
	freedSpace := int64(0)
	for _, video := range videos {
		if freedSpace >= requiredSpace {
			break
		}

		delete(pm.preloadCache.cache, video.VideoID)
		pm.preloadCache.currentSize -= video.Size
		freedSpace += video.Size

		log.Printf("🗑️ Evicted FIFO video: %s (loaded at: %v)", video.VideoID, video.LoadedAt)
	}

	return nil
}

// updateCacheHitRate updates cache hit rate
func (pm *PreloadManager) updateCacheHitRate(hit bool) {
	pm.preloadCache.mu.Lock()
	defer pm.preloadCache.mu.Unlock()

	totalOperations := pm.preloadCache.hitCount + 1
	if hit {
		pm.preloadCache.hitCount++
	}

	pm.preloadCache.hitRate = float64(pm.preloadCache.hitCount) / float64(totalOperations)
}

// PredictPreloads predicts videos to preload
func (pm *PreloadManager) PredictPreloads(userID string) ([]*PreloadTask, error) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	// Get user behavior predictions
	predictions, err := pm.userBehaviorAnalyzer.PredictUserBehavior(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to predict user behavior: %w", err)
	}

	// Convert predictions to preload tasks
	var tasks []*PreloadTask
	for _, prediction := range predictions {
		if prediction.Probability >= pm.threshold {
			task := &PreloadTask{
				TaskID:           uuid.New(),
				VideoID:          prediction.VideoID,
				UserID:           userID,
				Priority:         int(prediction.Probability * 10),
				Probability:      prediction.Probability,
				EstimatedLoadTime: 5 * time.Second,
				WindowSize:       pm.windowSize,
				CreatedAt:        time.Now(),
				ScheduledAt:      time.Now(),
				Status:           "pending",
			}
			tasks = append(tasks, task)
		}
	}

	// Sort by probability (highest first)
	sort.Slice(tasks, func(i, j int) bool {
		return tasks[i].Probability > tasks[j].Probability
	})

	// Limit to max videos
	if len(tasks) > pm.maxVideos {
		tasks = tasks[:pm.maxVideos]
	}

	log.Printf("🔮 Predicted %d preload tasks for user %s", len(tasks), userID)

	return tasks, nil
}

// GetCacheStatus returns cache status
func (pm *PreloadManager) GetCacheStatus() *PreloadCacheStatus {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	status := &PreloadCacheStatus{
		TotalVideos:      len(pm.preloadCache.cache),
		CurrentSize:      pm.preloadCache.currentSize,
		MaxSize:         pm.preloadCache.maxSize,
		HitRate:         pm.preloadCache.hitRate,
		EvictionPolicy:  pm.preloadCache.evictionPolicy,
		LastUpdated:     time.Now(),
	}

	// Calculate utilization
	if pm.preloadCache.maxSize > 0 {
		status.Utilization = float64(pm.preloadCache.currentSize) / float64(pm.preloadCache.maxSize)
	}

	return status
}

// PreloadCacheStatus represents preload cache status
type PreloadCacheStatus struct {
	TotalVideos      int           `json:"total_videos"`
	CurrentSize      int64         `json:"current_size"`
	MaxSize         int64         `json:"max_size"`
	HitRate         float64       `json:"hit_rate"`
	Utilization     float64       `json:"utilization"`
	EvictionPolicy  string        `json:"eviction_policy"`
	LastUpdated     time.Time     `json:"last_updated"`
}

// GetQueueStatus returns queue status
func (pm *PreloadManager) GetQueueStatus() *PreloadQueueStatus {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	status := &PreloadQueueStatus{
		TotalTasks:      len(pm.preloadQueue.queue),
		PendingTasks:    0,
		ProcessingTasks: 0,
		CompletedTasks:  0,
		FailedTasks:     0,
		MaxSize:         pm.preloadQueue.maxSize,
		PriorityStrategy: pm.preloadQueue.priorityStrategy,
		LastUpdated:     time.Now(),
	}

	for _, task := range pm.preloadQueue.queue {
		switch task.Status {
		case "pending":
			status.PendingTasks++
		case "processing":
			status.ProcessingTasks++
		case "completed":
			status.CompletedTasks++
		case "failed":
			status.FailedTasks++
		}
	}

	return status
}

// PreloadQueueStatus represents preload queue status
type PreloadQueueStatus struct {
	TotalTasks       int       `json:"total_tasks"`
	PendingTasks     int       `json:"pending_tasks"`
	ProcessingTasks  int       `json:"processing_tasks"`
	CompletedTasks   int       `json:"completed_tasks"`
	FailedTasks      int       `json:"failed_tasks"`
	MaxSize          int       `json:"max_size"`
	PriorityStrategy string    `json:"priority_strategy"`
	LastUpdated      time.Time `json:"last_updated"`
}

// GetMetrics returns preload manager metrics
func (pm *PreloadManager) GetMetrics() *PreloadManagerMetrics {
	pm.metrics.mu.RLock()
	defer pm.metrics.mu.RUnlock()

	metrics := *pm.metrics
	return &metrics
}

// UpdateMetrics updates preload manager metrics
func (pm *PreloadManager) UpdateMetrics(event string, success bool) {
	pm.metrics.mu.Lock()
	defer pm.metrics.mu.Unlock()

	switch event {
	case "preload_requested":
		pm.metrics.TotalPreloads++
	case "preload_completed":
		if success {
			pm.metrics.SuccessfulPreloads++
		} else {
			pm.metrics.FailedPreloads++
		}
	case "cache_hit":
		pm.metrics.HitRate = pm.preloadCache.hitRate
	case "cache_miss":
		pm.metrics.CacheHitRate = pm.preloadCache.hitRate
	}

	pm.metrics.LastUpdated = time.Now()
}

// Close closes the preload manager
func (pm *PreloadManager) Close() error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	// Clear queue
	pm.preloadQueue.queue = make([]*PreloadTask, 0)

	// Clear cache
	pm.preloadCache.cache = make(map[string]*PreloadedVideo)
	pm.preloadCache.currentSize = 0

	log.Println("🔌 Preload manager closed")
	return nil
}

// UserBehaviorAnalyzer implementation

// PredictUserBehavior predicts user behavior
func (uba *UserBehaviorAnalyzer) PredictUserBehavior(userID string) ([]*PreloadPrediction, error) {
	uba.mu.RLock()
	defer uba.mu.RUnlock()

	// Get user profile
	profile, exists := uba.userProfiles[userID]
	if !exists {
		return []*PreloadPrediction{}, nil
	}

	// Get watch history
	history := uba.watchHistory[userID]
	if len(history) == 0 {
		return []*PreloadPrediction{}, nil
	}

	// Generate predictions based on watch history
	predictions := make([]*PreloadPrediction, 0)

	// Simple prediction: predict videos similar to recently watched videos
	for _, event := range history {
		if event.WatchedPercentage > 0.8 && !event.Skipped {
			// Predict similar videos will be watched
			prediction := &PreloadPrediction{
				PredictionID:    uuid.New(),
				UserID:          userID,
				VideoID:         event.VideoID,
				Probability:     0.7,
				Confidence:      0.6,
				PredictedAt:     time.Now(),
				PredictionWindow: int64(24 * time.Hour / time.Second),
			}
			predictions = append(predictions, prediction)
		}
	}

	// Sort by probability (highest first)
	sort.Slice(predictions, func(i, j int) bool {
		return predictions[i].Probability > predictions[j].Probability
	})

	return predictions, nil
}

// UpdateUserProfile updates user profile
func (uba *UserBehaviorAnalyzer) UpdateUserProfile(userID string, profile *UserProfile) {
	uba.mu.Lock()
	defer uba.mu.Unlock()

	profile.LastUpdated = time.Now()
	uba.userProfiles[userID] = profile
}

// AddWatchEvent adds a watch event
func (uba *UserBehaviorAnalyzer) AddWatchEvent(userID string, event *WatchEvent) {
	uba.mu.Lock()
	defer uba.mu.Unlock()

	// Add to watch history
	if uba.watchHistory[userID] == nil {
		uba.watchHistory[userID] = make([]*WatchEvent, 0)
	}

	uba.watchHistory[userID] = append(uba.watchHistory[userID], event)

	// Keep only last 100 events
	if len(uba.watchHistory[userID]) > 100 {
		uba.watchHistory[userID] = uba.watchHistory[userID][1:]
	}

	// Update user profile based on event
	profile := uba.userProfiles[userID]
	if profile == nil {
		profile = &UserProfile{
			UserID:               userID,
			PreferredGenres:      make([]string, 0),
			WatchTimes:           make([]time.Time, 0),
			AverageWatchDuration: 30 * time.Minute,
			SkipRate:             0.2,
			QualityPreference:    "1080p",
			DeviceType:           event.DeviceType,
			NetworkType:          event.NetworkType,
			Location:             event.Location,
			LastUpdated:          time.Now(),
			PredictionAccuracy:   0.5,
		}
		uba.userProfiles[userID] = profile
	}

	// Update average watch duration
	if len(uba.watchHistory[userID]) > 0 {
		var totalDuration time.Duration
		for _, e := range uba.watchHistory[userID] {
			totalDuration += e.Duration
		}
		profile.AverageWatchDuration = totalDuration / time.Duration(len(uba.watchHistory[userID]))
	}

	// Update skip rate
	skipCount := 0
	for _, e := range uba.watchHistory[userID] {
		if e.Skipped {
			skipCount++
		}
	}
	profile.SkipRate = float64(skipCount) / float64(len(uba.watchHistory[userID]))

	profile.LastUpdated = time.Now()
}

// GetUserProfile gets user profile
func (uba *UserBehaviorAnalyzer) GetUserProfile(userID string) (*UserProfile, error) {
	uba.mu.RLock()
	defer uba.mu.RUnlock()

	profile, exists := uba.userProfiles[userID]
	if !exists {
		return nil, fmt.Errorf("user profile not found for %s", userID)
	}

	return profile, nil
}

// GetWatchHistory gets watch history
func (uba *UserBehaviorAnalyzer) GetWatchHistory(userID string, limit int) ([]*WatchEvent, error) {
	uba.mu.RLock()
	defer uba.mu.RUnlock()

	history := uba.watchHistory[userID]
	if history == nil {
		return []*WatchEvent{}, nil
	}

	// Return most recent events
	if limit > 0 && len(history) > limit {
		history = history[len(history)-limit:]
	}

	return history, nil
}

// GetMetrics returns user behavior analyzer metrics
func (uba *UserBehaviorAnalyzer) GetMetrics() *UserBehaviorAnalyzerMetrics {
	uba.metrics.mu.RLock()
	defer uba.metrics.mu.RUnlock()

	metrics := *uba.metrics
	return &metrics
}

// Close closes the user behavior analyzer
func (uba *UserBehaviorAnalyzer) Close() error {
	uba.mu.Lock()
	defer uba.mu.Unlock()

	uba.userProfiles = make(map[string]*UserProfile)
	uba.watchHistory = make(map[string][]WatchEvent)
	uba.preloadPredictions = make(map[string]*PreloadPrediction)

	log.Println("🔌 User behavior analyzer closed")
	return nil
}

// UserBehaviorAnalyzerMetrics represents user behavior analyzer metrics
type UserBehaviorAnalyzerMetrics struct {
	TotalUsers            int64         `json:"total_users"`
	TotalWatchEvents       int64         `json:"total_watch_events"`
	TotalPredictions       int64         `json:"total_predictions"`
	AccuracyRate           float64       `json:"accuracy_rate"`
	AverageWatchDuration   time.Duration `json:"average_watch_duration"`
	SkipRate               float64       `json:"skip_rate"`
	LastUpdated            time.Time     `json:"last_updated"`
	CreatedAt              time.Time     `json:"created_at"`
	
	mu                     sync.RWMutex
}

// PreloadQueueMetrics represents preload queue metrics
type PreloadQueueMetrics struct {
	TotalTasks            int64         `json:"total_tasks"`
	ProcessedTasks        int64         `json:"processed_tasks"`
	AverageProcessingTime time.Duration `json:"average_processing_time"`
	QueueUtilization     float64       `json:"queue_utilization"`
	PriorityDistribution  map[string]int64 `json:"priority_distribution"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// PreloadCacheMetrics represents preload cache metrics
type PreloadCacheMetrics struct {
	TotalCacheOperations  int64         `json:"total_cache_operations"`
	CacheHits             int64         `json:"cache_hits"`
	CacheMisses           int64         `json:"cache_misses"`
	HitRate               float64       `json:"hit_rate"`
	AverageAccessTime     time.Duration `json:"average_access_time"`
	CacheUtilization      float64       `json:"cache_utilization"`
	EvictionCount         int64         `json:"eviction_count"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// CacheMetrics represents cache metrics
type CacheMetrics struct {
	TotalOperations       int64         `json:"total_operations"`
	Hits                  int64         `json:"hits"`
	Misses                int64         `json:"misses"`
	HitRate               float64       `json:"hit_rate"`
	AverageResponseTime   time.Duration `json:"average_response_time"`
	Utilization           float64       `json:"utilization"`
	EvictionRate          float64       `json:"eviction_rate"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// DistributedCacheMetrics represents distributed cache metrics
type DistributedCacheMetrics struct {
	TotalNodes            int64         `json:"total_nodes"`
	ActiveNodes            int64         `json:"active_nodes"`
	TotalRequests          int64         `json:"total_requests"`
	CacheHits              int64         `json:"cache_hits"`
	DistributedHitRate     float64       `json:"distributed_hit_rate"`
	AverageResponseTime    time.Duration `json:"average_response_time"`
	NodeUtilization        map[string]float64 `json:"node_utilization"`
	LastUpdated            time.Time     `json:"last_updated"`
	CreatedAt              time.Time     `json:"created_at"`
	
	mu                     sync.RWMutex
}
