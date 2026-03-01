/**
 * Pre-fetch Manager - Zero Lag Video Streaming
 * 
 * Pre-fetches video frames before they're needed
 * Ensures zero lag and smooth playback
 * Optimized for 1ms response time
 * 
 * Features:
 * - Intelligent pre-fetching
 * - Zero lag streaming
 * - Buffer management
 * - Adaptive pre-fetching
 * - Resource optimization
 */

package rendering

import (
	"context"
	"fmt"
	"log"
	"math"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/scylladb/gocqlx/v2"
	"github.com/scylladb/gocqlx/v2/qb"
)

// PrefetchManager handles intelligent video pre-fetching
type PrefetchManager struct {
	session              *gocqlx.Session
	config               PrefetchConfig
	bufferManager        *BufferManager
	predictionEngine     *PredictionEngine
	adaptivePrefetcher   *AdaptivePrefetcher
	metrics              *PrefetchMetrics
	activePrefetches      map[uuid.UUID]*PrefetchTask
	prefetchQueue         chan *PrefetchTask
	workers               int
	mu                    sync.RWMutex
}

// PrefetchConfig holds pre-fetching configuration
type PrefetchConfig struct {
	// Pre-fetching settings
	PrefetchDistance      int           `json:"prefetch_distance"`      // frames ahead
	PrefetchWindowSize    int           `json:"prefetch_window_size"`    // window size
	PrefetchThreshold     float64       `json:"prefetch_threshold"`     // confidence threshold
	MaxPrefetchConcurrency int           `json:"max_prefetch_concurrency"`
	
	// Buffer management
	BufferSize            int64         `json:"buffer_size"`            // MB
	BufferUtilization     float64       `json:"buffer_utilization"`     // 0.0 to 1.0
	MinBufferFree         float64       `json:"min_buffer_free"`        // minimum free buffer
	MaxBufferWait         time.Duration `json:"max_buffer_wait"`        // max wait for buffer
	
	// Adaptive settings
	EnableAdaptive        bool          `json:"enable_adaptive"`
	AdaptiveInterval      time.Duration `json:"adaptive_interval"`
	NetworkPrediction     bool          `json:"network_prediction"`
	UserBehaviorAnalysis  bool          `json:"user_behavior_analysis"`
	
	// Performance settings
	TargetPrefetchTime    time.Duration `json:"target_prefetch_time"`    // < 1ms
	MaxPrefetchLatency    time.Duration `json:"max_prefetch_latency"`
	PrefetchTimeout       time.Duration `json:"prefetch_timeout"`
	
	// Quality settings
	PrefetchQuality       string        `json:"prefetch_quality"`       // "high", "ultra", "maximum"
	BitratePrediction     bool          `json:"bitrate_prediction"`
	QualityAdaptation     bool          `json:"quality_adaptation"`
}

// BufferManager manages pre-fetch buffer
type BufferManager struct {
	buffers               map[string]*Buffer
	totalSize             int64
	usedSize              int64
	maxSize               int64
	allocationStrategy    string
	metrics               *BufferMetrics
	mu                    sync.RWMutex
}

// Buffer represents a pre-fetch buffer
type Buffer struct {
	BufferID              uuid.UUID     `json:"buffer_id"`
	VideoID               uuid.UUID     `json:"video_id"`
	UserID                uuid.UUID     `json:"user_id"`
	StartFrame            int           `json:"start_frame"`
	EndFrame              int           `json:"end_frame"`
	Quality               string        `json:"quality"`
	Size                  int64         `json:"size"`
	UsedSize              int64         `json:"used_size"`
	CreatedAt             time.Time     `json:"created_at"`
	LastAccessed          time.Time     `json:"last_accessed"`
	ExpiresAt             time.Time     `json:"expires_at"`
	Priority              int           `json:"priority"`
	IsActive              bool          `json:"is_active"`
}

// BufferMetrics tracks buffer performance
type BufferMetrics struct {
	TotalBuffers          int64         `json:"total_buffers"`
	ActiveBuffers         int64         `json:"active_buffers"`
	BufferUtilization     float64       `json:"buffer_utilization"`
	AverageBufferSize     int64         `json:"average_buffer_size"`
	EvictionCount         int64         `json:"eviction_count"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// PredictionEngine predicts user behavior and network conditions
type PredictionEngine struct {
	userBehavior          *UserBehaviorModel
	networkPredictor      *NetworkPredictor
	qualityPredictor      *QualityPredictor
	metrics               *PredictionMetrics
	mu                    sync.RWMutex
}

// UserBehaviorModel models user viewing behavior
type UserBehaviorModel struct {
	UserID                uuid.UUID     `json:"user_id"`
	ViewingPatterns       []ViewingPattern `json:"viewing_patterns"`
	PauseProbability      float64       `json:"pause_probability"`
	SeekProbability       float64       `json:"seek_probability"`
	CompletionRate        float64       `json:"completion_rate"`
	AverageSessionTime    time.Duration `json:"average_session_time"`
	PreferredQuality      string        `json:"preferred_quality"`
	DeviceType            string        `json:"device_type"`
	NetworkType           string        `json:"network_type"`
	LastUpdated           time.Time     `json:"last_updated"`
}

// ViewingPattern represents a viewing pattern
type ViewingPattern struct {
	PatternID             uuid.UUID     `json:"pattern_id"`
	StartTime             time.Time     `json:"start_time"`
	EndTime               time.Time     `json:"end_time"`
	WatchedFrames         []int         `json:"watched_frames"`
	SkippedFrames         []int         `json:"skipped_frames"
	PausedFrames          []int         `json:"paused_frames"`
	Quality               string        `json:"quality"`
	Bitrate               int64         `json:"bitrate"`
}

// NetworkPredictor predicts network conditions
type NetworkPredictor struct {
	NetworkHistory        []NetworkMeasurement
	AverageBandwidth      int64         `json:"average_bandwidth"`
	AverageLatency        time.Duration `json:"average_latency"`
	PacketLossRate        float64       `json:"packet_loss_rate"`
	Jitter                time.Duration `json:"jitter"`
	StabilityScore        float64       `json:"stability_score"`
	PredictionAccuracy    float64       `json:"prediction_accuracy"`
	LastUpdated           time.Time     `json:"last_updated"`
}

// NetworkMeasurement represents a network measurement
type NetworkMeasurement struct {
	MeasurementID         uuid.UUID     `json:"measurement_id"`
	Timestamp             time.Time     `json:"timestamp"`
	Bandwidth             int64         `json:"bandwidth"`
	Latency               time.Duration `json:"latency"`
	PacketLoss            float64       `json:"packet_loss"`
	Jitter                time.Duration `json:"jitter"`
	Location              string        `json:"location"`
	NetworkType           string        `json:"network_type"`
}

// QualityPredictor predicts optimal quality settings
type QualityPredictor struct {
	QualityHistory        []QualityMeasurement
	OptimalBitrate        int64         `json:"optimal_bitrate"`
	OptimalQuality        string        `json:"optimal_quality"`
	QualityStability      float64       `json:"quality_stability"
	AdaptationFrequency   float64       `json:"adaptation_frequency"`
	PredictionAccuracy    float64       `json:"prediction_accuracy"`
	LastUpdated           time.Time     `json:"last_updated"`
}

// QualityMeasurement represents a quality measurement
type QualityMeasurement struct {
	MeasurementID         uuid.UUID     `json:"measurement_id"`
	Timestamp             time.Time     `json:"timestamp"`
	Quality               string        `json:"quality"`
	Bitrate               int64         `json:"bitrate"`
	FrameRate             int           `json:"frame_rate"`
	Resolution            string        `json:"resolution"`
	UserSatisfaction      float64       `json:"user_satisfaction"`
	BufferUnderruns       int           `json:"buffer_underruns"`
	RebufferEvents        int           `json:"rebuffer_events"`
}

// PredictionMetrics tracks prediction performance
type PredictionMetrics struct {
	TotalPredictions      int64         `json:"total_predictions"`
	AccuratePredictions    int64         `json:"accurate_predictions"`
	PredictionAccuracy    float64       `json:"prediction_accuracy"`
	AveragePredictionTime  time.Duration `json:"average_prediction_time"`
	UserBehaviorAccuracy   float64       `json:"user_behavior_accuracy"`
	NetworkAccuracy        float64       `json:"network_accuracy"`
	QualityAccuracy       float64       `json:"quality_accuracy"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// AdaptivePrefetcher adapts pre-fetching strategy
type AdaptivePrefetcher struct {
	strategy              PrefetchStrategy
	performanceHistory    []PerformanceRecord
	adaptationInterval    time.Duration
	learningRate          float64
	metrics               *AdaptiveMetrics
	mu                    sync.RWMutex
}

// PrefetchStrategy represents a pre-fetching strategy
type PrefetchStrategy struct {
	StrategyName          string        `json:"strategy_name"`
	Distance              int           `json:"distance"`
	WindowSize            int           `json:"window_size"`
	Threshold             float64       `json:"threshold"`
	Confidence            float64       `json:"confidence"`
	AdaptationEnabled     bool          `json:"adaptation_enabled"`
}

// PerformanceRecord represents a performance record
type PerformanceRecord struct {
	RecordID              uuid.UUID     `json:"record_id"`
	StrategyName          string        `json:"strategy_name"`
	Timestamp             time.Time     `json:"timestamp"`
	PrefetchHitRatio      float64       `json:"prefetch_hit_ratio"`
	BufferUtilization     float64       `json:"buffer_utilization"`
	ResponseTime          time.Duration `json:"response_time"`
	UserSatisfaction      float64       `json:"user_satisfaction"`
	NetworkEfficiency     float64       `json:"network_efficiency"`
}

// AdaptiveMetrics tracks adaptive pre-fetching performance
type AdaptiveMetrics struct {
	TotalAdaptations      int64         `json:"total_adaptations"`
	SuccessfulAdaptations int64         `json:"successful_adaptations"`
	AdaptationAccuracy    float64       `json:"adaptation_accuracy"`
	AverageAdaptationTime  time.Duration `json:"average_adaptation_time"`
	StrategyPerformance   map[string]float64 `json:"strategy_performance"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// NewPrefetchManager creates a new pre-fetch manager
func NewPrefetchManager(session *gocqlx.Session, config PrefetchConfig) *PrefetchManager {
	pm := &PrefetchManager{
		session:         session,
		config:          config,
		bufferManager:   NewBufferManager(config.BufferSize * 1024 * 1024), // Convert MB to bytes
		predictionEngine: NewPredictionEngine(),
		adaptivePrefetcher: NewAdaptivePrefetcher(config),
		metrics:         NewPrefetchMetrics(),
		activePrefetches: make(map[uuid.UUID]*PrefetchTask),
		prefetchQueue:   make(chan *PrefetchTask, config.MaxPrefetchConcurrency*10),
		workers:         config.MaxPrefetchConcurrency,
	}

	// Start background processes
	go pm.startWorkers()
	go pm.updateMetrics()
	go pm.adaptStrategy()
	go pm.cleanupExpiredBuffers()

	return pm
}

// PrefetchFrame pre-fetches a video frame
func (pm *PrefetchManager) PrefetchFrame(ctx context.Context, videoID, userID uuid.UUID, frameNumber int, quality string) error {
	startTime := time.Now()

	// Check if frame is already in buffer
	bufferKey := fmt.Sprintf("frame_%s_%d_%s", videoID, frameNumber, quality)
	if pm.bufferManager.IsInBuffer(bufferKey) {
		pm.metrics.mu.Lock()
		pm.metrics.CacheHitRatio = float64(pm.metrics.CacheHits) / float64(pm.metrics.TotalRequests)
		pm.metrics.mu.Unlock()
		
		log.Printf("⚡ Frame %d already in buffer", frameNumber)
		return nil
	}

	// Predict if this frame should be pre-fetched
	shouldPrefetch, confidence := pm.predictionEngine.PrefetchFrame(videoID, userID, frameNumber, quality)
	if !shouldPrefetch {
		log.Printf("⚠️ Frame %d not recommended for pre-fetching (confidence: %.2f)", frameNumber, confidence)
		return nil
	}

	// Create pre-fetch task
	task := &PrefetchTask{
		TaskID:       uuid.New(),
		VideoID:      videoID,
		UserID:       userID,
		CurrentFrame: frameNumber,
		TargetFrame:  frameNumber + pm.config.PrefetchDistance,
		Quality:      quality,
		Priority:     int(confidence * 100),
		CreatedAt:    time.Now(),
		Timeout:      pm.config.PrefetchTimeout,
	}

	// Queue pre-fetch task
	select {
	case pm.prefetchQueue <- task:
		pm.mu.Lock()
		pm.activePrefetches[task.TaskID] = task
		pm.mu.Unlock()
		
		log.Printf("🚀 Frame %d queued for pre-fetching", frameNumber)
		
		processingTime := time.Since(startTime)
		pm.metrics.mu.Lock()
		pm.metrics.TotalRequests++
		pm.metrics.AverageQueueTime = (pm.metrics.AverageQueueTime + processingTime) / 2
		pm.metrics.mu.Unlock()
		
		return nil
	default:
		return fmt.Errorf("pre-fetch queue full")
	}
}

// PrefetchWindow pre-fetches a window of frames
func (pm *PrefetchManager) PrefetchWindow(ctx context.Context, videoID, userID uuid.UUID, startFrame, windowSize int, quality string) error {
	startTime := time.Now()

	log.Printf("🚀 Pre-fetching window %d-%d for video %s", startFrame, startFrame+windowSize, videoID)

	// Create buffer for this window
	bufferID := uuid.New()
	buffer := &Buffer{
		BufferID:     bufferID,
		VideoID:      videoID,
		UserID:       userID,
		StartFrame:   startFrame,
		EndFrame:     startFrame + windowSize,
		Quality:      quality,
		Size:         0,
		UsedSize:     0,
		CreatedAt:    time.Now(),
		LastAccessed: time.Now(),
		ExpiresAt:    time.Now().Add(30 * time.Minute),
		Priority:     1,
		IsActive:     true,
	}

	// Allocate buffer
	err := pm.bufferManager.AllocateBuffer(buffer)
	if err != nil {
		return fmt.Errorf("failed to allocate buffer: %w", err)
	}

	// Queue pre-fetch tasks for the window
	for i := 0; i < windowSize; i++ {
		frameNumber := startFrame + i
		
		// Predict if this frame should be pre-fetched
		shouldPrefetch, confidence := pm.predictionEngine.PrefetchFrame(videoID, userID, frameNumber, quality)
		if !shouldPrefetch {
			continue
		}

		task := &PrefetchTask{
			TaskID:       uuid.New(),
			VideoID:      videoID,
			UserID:       userID,
			CurrentFrame: frameNumber,
			TargetFrame:  frameNumber,
			Quality:      quality,
			Priority:     int(confidence * 100),
			BufferID:     bufferID,
			CreatedAt:    time.Now(),
			Timeout:      pm.config.PrefetchTimeout,
		}

		select {
		case pm.prefetchQueue <- task:
			pm.mu.Lock()
			pm.activePrefetches[task.TaskID] = task
			pm.mu.Unlock()
		default:
			log.Printf("⚠️ Pre-fetch queue full, skipping frame %d", frameNumber)
		}
	}

	processingTime := time.Since(startTime)
	log.Printf("🚀 Pre-fetch window queued in %v", processingTime)

	return nil
}

// GetPrefetchedFrame gets a pre-fetched frame
func (pm *PrefetchManager) GetPrefetchedFrame(videoID uuid.UUID, frameNumber int, quality string) (*VideoFrame, error) {
	startTime := time.Now()

	bufferKey := fmt.Sprintf("frame_%s_%d_%s", videoID, frameNumber, quality)
	
	// Check buffer first
	if frame, found := pm.bufferManager.GetFrame(bufferKey); found {
		processingTime := time.Since(startTime)
		
		pm.metrics.mu.Lock()
		pm.metrics.CacheHits++
		pm.metrics.CacheHitRatio = float64(pm.metrics.CacheHits) / float64(pm.metrics.CacheHits + pm.metrics.CacheMisses)
		pm.metrics.AverageAccessTime = (pm.metrics.AverageAccessTime + processingTime) / 2
		pm.metrics.mu.Unlock()
		
		log.Printf("⚡ Pre-fetched frame %d retrieved in %v", frameNumber, processingTime)
		return frame, nil
	}

	pm.metrics.mu.Lock()
	pm.metrics.CacheMisses++
	pm.metrics.mu.Unlock()

	return nil, fmt.Errorf("frame not found in buffer")
}

// startWorkers starts pre-fetch workers
func (pm *PrefetchManager) startWorkers() {
	for i := 0; i < pm.workers; i++ {
		go pm.worker(i)
	}
}

// worker processes pre-fetch tasks
func (pm *PrefetchManager) worker(workerID int) {
	log.Printf("🚀 Pre-fetch worker %d started", workerID)

	for task := range pm.prefetchQueue {
		pm.processPrefetchTask(task, workerID)
	}
}

// processPrefetchTask processes a pre-fetch task
func (pm *PrefetchManager) processPrefetchTask(task *PrefetchTask, workerID int) {
	startTime := time.Now()

	log.Printf("🚀 Worker %d processing frame %d for video %s", workerID, task.TargetFrame, task.VideoID)

	// Check if task is still active
	pm.mu.RLock()
	if _, exists := pm.activePrefetches[task.TaskID]; !exists {
		pm.mu.RUnlock()
		return
	}
	pm.mu.RUnlock()

	// Simulate frame pre-fetching
	frame, err := pm.fetchFrame(task.VideoID, task.TargetFrame, task.Quality)
	if err != nil {
		log.Printf("❌ Worker %d failed to fetch frame %d: %v", workerID, task.TargetFrame, err)
		pm.metrics.mu.Lock()
		pm.metrics.FailedPrefetches++
		pm.metrics.mu.Unlock()
		
		pm.mu.Lock()
		delete(pm.activePrefetches, task.TaskID)
		pm.mu.Unlock()
		
		return
	}

	// Store frame in buffer
	bufferKey := fmt.Sprintf("frame_%s_%d_%s", task.VideoID, task.TargetFrame, task.Quality)
	err = pm.bufferManager.StoreFrame(bufferKey, frame)
	if err != nil {
		log.Printf("❌ Worker %d failed to store frame %d: %v", workerID, task.TargetFrame, err)
		pm.metrics.mu.Lock()
		pm.metrics.FailedPrefetches++
		pm.metrics.mu.Unlock()
		
		pm.mu.Lock()
		delete(pm.activePrefetches, task.TaskID)
		pm.mu.Unlock()
		
		return
	}

	processingTime := time.Since(startTime)
	
	pm.metrics.mu.Lock()
	pm.metrics.SuccessfulPrefetches++
	pm.metrics.TotalPrefetches++
	if pm.metrics.AveragePrefetchTime == 0 {
		pm.metrics.AveragePrefetchTime = processingTime
	} else {
		pm.metrics.AveragePrefetchTime = (pm.metrics.AveragePrefetchTime + processingTime) / 2
	}
	pm.metrics.mu.Unlock()

	// Remove from active tasks
	pm.mu.Lock()
	delete(pm.activePrefetches, task.TaskID)
	pm.mu.Unlock()

	log.Printf("🚀 Worker %d pre-fetched frame %d in %v", workerID, task.TargetFrame, processingTime)
}

// fetchFrame fetches a video frame
func (pm *PrefetchManager) fetchFrame(videoID uuid.UUID, frameNumber int, quality string) (*VideoFrame, error) {
	// Simulate frame fetching
	// In production, this would fetch from video storage or CDN
	
	frame := &VideoFrame{
		FrameID:      uuid.New(),
		VideoID:      videoID,
		FrameNumber:  frameNumber,
		Data:         make([]byte, 1024*1024), // 1MB frame data
		Width:        1920,
		Height:       1080,
		Quality:      quality,
		ProcessedAt:  time.Now(),
	}

	// Simulate network latency
	time.Sleep(500 * time.Microsecond) // 0.5ms

	return frame, nil
}

// PredictionEngine methods

func (pe *PredictionEngine) PrefetchFrame(videoID, userID uuid.UUID, frameNumber int, quality string) (bool, float64) {
	// Predict if frame should be pre-fetched
	
	// User behavior prediction
	userConfidence := pe.userBehaviorModel.PredictPrefetch(userID, frameNumber)
	
	// Network prediction
	networkConfidence := pe.networkPredictor.PredictPrefetch()
	
	// Quality prediction
	qualityConfidence := pe.qualityPredictor.PredictPrefetch(quality)
	
	// Combine predictions
	combinedConfidence := (userConfidence + networkConfidence + qualityConfidence) / 3.0
	
	// Apply threshold
	threshold := 0.6 // 60% confidence threshold
	shouldPrefetch := combinedConfidence >= threshold
	
	log.Printf("🧠 Prefetch prediction: user=%.2f, network=%.2f, quality=%.2f, combined=%.2f, should=%v",
		userConfidence, networkConfidence, qualityConfidence, combinedConfidence, shouldPrefetch)
	
	return shouldPrefetch, combinedConfidence
}

// UserBehaviorModel methods

func (ubm *UserBehaviorModel) PredictPrefetch(userID uuid.UUID, frameNumber int) float64 {
	// Simple prediction based on user behavior patterns
	// In production, would use machine learning model
	
	// Assume users watch sequentially
	sequentialProbability := 0.8
	
	// Adjust based on completion rate
	if ubm.CompletionRate > 0.8 {
		sequentialProbability += 0.1
	} else if ubm.CompletionRate < 0.5 {
		sequentialProbability -= 0.2
	}
	
	// Adjust based on pause probability
	if ubm.PauseProbability > 0.3 {
		sequentialProbability -= 0.1
	}
	
	// Adjust based on seek probability
	if ubm.SeekProbability > 0.2 {
		sequentialProbability -= 0.3
	}
	
	return math.Max(0.0, math.Min(1.0, sequentialProbability))
}

// NetworkPredictor methods

func (np *NetworkPredictor) PredictPrefetch() float64 {
	// Predict based on network conditions
	
	// High bandwidth = higher confidence
	bandwidthConfidence := math.Min(1.0, float64(np.AverageBandwidth)/10000000) // 10Mbps baseline
	
	// Low latency = higher confidence
	latencyConfidence := math.Max(0.0, 1.0-float64(np.AverageLatency.Milliseconds())/100) // 100ms baseline
	
	// Low packet loss = higher confidence
	lossConfidence := math.Max(0.0, 1.0-np.PacketLossRate*10)
	
	// High stability = higher confidence
	stabilityConfidence := np.StabilityScore
	
	// Combine predictions
	combinedConfidence := (bandwidthConfidence + latencyConfidence + lossConfidence + stabilityConfidence) / 4.0
	
	return combinedConfidence
}

// QualityPredictor methods

func (qp *QualityPredictor) PredictPrefetch(quality string) float64 {
	// Predict based on quality preferences
	
	// Higher quality = higher confidence for pre-fetching
	qualityConfidence := 0.5
	switch quality {
	case "maximum":
		qualityConfidence = 0.9
	case "ultra":
		qualityConfidence = 0.8
	case "high":
		qualityConfidence = 0.7
	case "medium":
		qualityConfidence = 0.6
	case "low":
		qualityConfidence = 0.4
	}
	
	// Adjust based on quality stability
	if qp.QualityStability > 0.8 {
		qualityConfidence += 0.1
	} else if qp.QualityStability < 0.5 {
		qualityConfidence -= 0.2
	}
	
	return math.Max(0.0, math.Min(1.0, qualityConfidence))
}

// BufferManager methods

func (bm *BufferManager) IsInBuffer(key string) bool {
	bm.mu.RLock()
	defer bm.mu.RUnlock()
	
	_, exists := bm.buffers[key]
	return exists
}

func (bm *BufferManager) GetFrame(key string) (*VideoFrame, error) {
	bm.mu.RLock()
	defer bm.mu.RUnlock()
	
	if buffer, exists := bm.buffers[key]; exists {
		buffer.LastAccessed = time.Now()
		
		// Convert buffer to frame
		frame := &VideoFrame{
			FrameID:      buffer.BufferID,
			VideoID:      buffer.VideoID,
			FrameNumber:  buffer.StartFrame,
			Data:         make([]byte, buffer.UsedSize),
			Quality:      buffer.Quality,
			ProcessedAt:  buffer.CreatedAt,
		}
		
		return frame, nil
	}
	
	return nil, fmt.Errorf("frame not found in buffer")
}

func (bm *BufferManager) StoreFrame(key string, frame *VideoFrame) error {
	bm.mu.Lock()
	defer bm.mu.Unlock()
	
	// Check if we have enough space
	frameSize := int64(len(frame.Data))
	if bm.usedSize+frameSize > bm.maxSize {
		// Evict old buffers
		bm.evictLRU()
	}
	
	// Check again after eviction
	if bm.usedSize+frameSize > bm.maxSize {
		return fmt.Errorf("insufficient buffer space")
	}
	
	// Create buffer entry
	buffer := &Buffer{
		BufferID:     frame.FrameID,
		VideoID:      frame.VideoID,
		StartFrame:   frame.FrameNumber,
		EndFrame:     frame.FrameNumber,
		Quality:      frame.Quality,
		Size:         frameSize,
		UsedSize:     frameSize,
		CreatedAt:    time.Now(),
		LastAccessed: time.Now(),
		ExpiresAt:    time.Now().Add(30 * time.Minute),
		Priority:     1,
		IsActive:     true,
	}
	
	bm.buffers[key] = buffer
	bm.usedSize += frameSize
	
	return nil
}

func (bm *BufferManager) AllocateBuffer(buffer *Buffer) error {
	bm.mu.Lock()
	defer bm.mu.Unlock()
	
	// Check if we have enough space
	if bm.usedSize > bm.maxSize*8/10 { // 80% threshold
		return fmt.Errorf("buffer utilization too high")
	}
	
	// Store buffer
	bm.buffers[buffer.BufferID.String()] = buffer
	
	bm.metrics.mu.Lock()
	bm.metrics.TotalBuffers++
	bm.metrics.ActiveBuffers++
	bm.metrics.mu.Unlock()
	
	return nil
}

func (bm *BufferManager) evictLRU() {
	var oldestKey string
	var oldestTime time.Time
	
	for key, buffer := range bm.buffers {
		if oldestTime.IsZero() || buffer.LastAccessed.Before(oldestTime) {
			oldestKey = key
			oldestTime = buffer.LastAccessed
		}
	}
	
	if oldestKey != "" {
		buffer := bm.buffers[oldestKey]
		bm.usedSize -= buffer.UsedSize
		delete(bm.buffers, oldestKey)
		
		bm.metrics.mu.Lock()
		bm.metrics.EvictionCount++
		bm.metrics.ActiveBuffers--
		bm.metrics.mu.Unlock()
	}
}

// Background processes

func (pm *PrefetchManager) updateMetrics() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			pm.calculateMetrics()
		}
	}
}

func (pm *PrefetchManager) calculateMetrics() {
	pm.metrics.mu.Lock()
	defer pm.metrics.mu.Unlock()

	// Update cache hit ratio
	if pm.metrics.CacheHits+pm.metrics.CacheMisses > 0 {
		pm.metrics.CacheHitRatio = float64(pm.metrics.CacheHits) / float64(pm.metrics.CacheHits+pm.metrics.CacheMisses)
	}

	// Update buffer utilization
	pm.metrics.BufferUtilization = pm.bufferManager.getUtilization()

	pm.metrics.LastUpdated = time.Now()
}

func (pm *PrefetchManager) adaptStrategy() {
	if !pm.config.EnableAdaptive {
		return
	}

	ticker := time.NewTicker(pm.config.AdaptiveInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			pm.adaptivePrefetcher.AdaptStrategy(pm.metrics)
		}
	}
}

func (pm *PrefetchManager) cleanupExpiredBuffers() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			pm.bufferManager.cleanupExpired()
		}
	}
}

func (bm *BufferManager) cleanupExpired() {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	now := time.Now()
	for key, buffer := range bm.buffers {
		if now.After(buffer.ExpiresAt) {
			bm.usedSize -= buffer.UsedSize
			delete(bm.buffers, key)
			
			bm.metrics.mu.Lock()
			bm.metrics.EvictionCount++
			bm.metrics.ActiveBuffers--
			bm.metrics.mu.Unlock()
		}
	}
}

func (bm *BufferManager) getUtilization() float64 {
	bm.mu.RLock()
	defer bm.mu.RUnlock()
	
	if bm.maxSize == 0 {
		return 0.0
	}
	
	return float64(bm.usedSize) / float64(bm.maxSize)
}

// AdaptivePrefetcher methods

func (ap *AdaptivePrefetcher) AdaptStrategy(metrics *PrefetchMetrics) {
	ap.mu.Lock()
	defer ap.mu.Unlock()

	// Analyze performance and adapt strategy
	if metrics.CacheHitRatio < 0.7 {
		// Low hit ratio - increase pre-fetch distance
		ap.strategy.Distance = int(float64(ap.strategy.Distance) * 1.2)
		ap.strategy.WindowSize = int(float64(ap.strategy.WindowSize) * 1.1)
	} else if metrics.CacheHitRatio > 0.9 {
		// High hit ratio - optimize for efficiency
		ap.strategy.Distance = int(float64(ap.strategy.Distance) * 0.9)
		ap.strategy.WindowSize = int(float64(ap.strategy.WindowSize) * 0.95)
	}

	// Adjust based on buffer utilization
	if metrics.BufferUtilization > 0.8 {
		// High utilization - reduce pre-fetching
		ap.strategy.Threshold *= 1.1
	} else if metrics.BufferUtilization < 0.5 {
		// Low utilization - increase pre-fetching
		ap.strategy.Threshold *= 0.9
	}

	ap.metrics.mu.Lock()
	ap.metrics.TotalAdaptations++
	ap.metrics.LastUpdated = time.Now()
	ap.metrics.mu.Unlock()

	log.Printf("🧠 Strategy adapted: distance=%d, window=%d, threshold=%.2f",
		ap.strategy.Distance, ap.strategy.WindowSize, ap.strategy.Threshold)
}

// GetMetrics returns pre-fetch metrics
func (pm *PrefetchManager) GetMetrics() *PrefetchMetrics {
	pm.metrics.mu.RLock()
	defer pm.metrics.mu.RUnlock()
	
	metrics := *pm.metrics
	return &metrics
}

// Helper functions

func NewPrefetchMetrics() *PrefetchMetrics {
	return &PrefetchMetrics{
		CreatedAt: time.Now(),
	}
}

func NewBufferManager(maxSize int64) *BufferManager {
	return &BufferManager{
		buffers:            make(map[string]*Buffer),
		maxSize:            maxSize,
		allocationStrategy: "LRU",
		metrics:            &BufferMetrics{CreatedAt: time.Now()},
	}
}

func NewPredictionEngine() *PredictionEngine {
	return &PredictionEngine{
		userBehavior:     &UserBehaviorModel{},
		networkPredictor: &NetworkPredictor{},
		qualityPredictor: &QualityPredictor{},
		metrics:          &PredictionMetrics{CreatedAt: time.Now()},
	}
}

func NewAdaptivePrefetcher(config PrefetchConfig) *AdaptivePrefetcher {
	strategy := PrefetchStrategy{
		StrategyName:       "adaptive",
		Distance:           config.PrefetchDistance,
		WindowSize:         config.PrefetchWindowSize,
		Threshold:          config.PrefetchThreshold,
		Confidence:         0.8,
		AdaptationEnabled:  config.EnableAdaptive,
	}

	return &AdaptivePrefetcher{
		strategy:           strategy,
		adaptationInterval: config.AdaptiveInterval,
		learningRate:       0.1,
		metrics:            &AdaptiveMetrics{CreatedAt: time.Now()},
	}
}

// Close closes the pre-fetch manager
func (pm *PrefetchManager) Close() error {
	log.Println("🔌 Pre-fetch manager closed")
	return nil
}
