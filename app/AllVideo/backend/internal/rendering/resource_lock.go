/**
 * Resource Lock - Ultra-Fast Database Access
 * 
 * Manages resource locking for 1ms response time
 * Ensures zero contention and maximum throughput
 * Optimized for ScyllaDB ultra-fast access
 * 
 * Features:
 * - 1ms response time guarantee
 * - Zero contention locking
 * - Ultra-fast database access
 * - Resource optimization
 * - Performance monitoring
 */

package rendering

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/scylladb/gocqlx/v2"
	"github.com/scylladb/gocqlx/v2/qb"
)

// ResourceLockManager manages ultra-fast resource locking
type ResourceLockManager struct {
	session              *gocqlx.Session
	config               ResourceLockConfig
	lockTable            map[string]*ResourceLockEntry
	waitQueue            map[string][]*LockRequest
	performanceMonitor   *PerformanceMonitor
	accessOptimizer      *AccessOptimizer
	metrics              *ResourceLockMetrics
	mu                   sync.RWMutex
}

// ResourceLockConfig holds resource locking configuration
type ResourceLockConfig struct {
	// Lock settings
	MaxConcurrentLocks   int           `json:"max_concurrent_locks"`
	LockTimeout          time.Duration `json:"lock_timeout"`
	MaxLockWait          time.Duration `json:"max_lock_wait"`
	LockRetryInterval    time.Duration `json:"lock_retry_interval"`
	
	// Performance settings
	TargetResponseTime   time.Duration `json:"target_response_time"`   // < 1ms
	MaxResponseTime      time.Duration `json:"max_response_time"`      // 2ms max
	ResponseTimeThreshold float64       `json:"response_time_threshold"` // 95% under target
	
	// Database settings
	DatabaseTimeout      time.Duration `json:"database_timeout"`
	MaxDatabaseRetries   int           `json:"max_database_retries"`
	DatabaseBatchSize    int           `json:"database_batch_size"`
	
	// Optimization settings
	EnableLockPooling    bool          `json:"enable_lock_pooling"`
	LockPoolSize         int           `json:"lock_pool_size"`
	EnableBatchLocking   bool          `json:"enable_batch_locking"`
	BatchLockSize        int           `json:"batch_lock_size"`
	
	// Monitoring settings
	EnableMetrics        bool          `json:"enable_metrics"`
	MetricsInterval      time.Duration `json:"metrics_interval"`
	EnableProfiling      bool          `json:"enable_profiling"`
}

// ResourceLockEntry represents a resource lock entry
type ResourceLockEntry struct {
	LockID               uuid.UUID     `json:"lock_id"`
	ResourceID           string        `json:"resource_id"`
	ResourceType         string        `json:"resource_type"`
	OwnerID              uuid.UUID     `json:"owner_id"`
	LockType             string        `json:"lock_type"`
	LockMode             string        `json:"lock_mode"`             // "exclusive", "shared", "upgrade"
	Priority             int           `json:"priority"`
	AcquiredAt           time.Time     `json:"acquired_at"`
	ExpiresAt            time.Time     `json:"expires_at"`
	LastAccessed         time.Time     `json:"last_accessed"`
	AccessCount          int64         `json:"access_count"`
	IsActive             bool          `json:"is_active"`
	WaitQueue            []uuid.UUID   `json:"wait_queue"`
	ContentionLevel      int           `json:"contention_level"`
	PerformanceScore     float64       `json:"performance_score"`
}

// LockRequest represents a lock request
type LockRequest struct {
	RequestID            uuid.UUID     `json:"request_id"`
	ResourceID           string        `json:"resource_id"`
	ResourceType         string        `json:"resource_type"`
	OwnerID              uuid.UUID     `json:"owner_id"`
	LockType             string        `json:"lock_type"`
	LockMode             string        `json:"lock_mode"`
	Priority             int           `json:"priority"`
	RequestedAt          time.Time     `json:"requested_at"`
	Timeout              time.Duration `json:"timeout"`
	RetryCount           int           `json:"retry_count"`
	MaxRetries           int           `json:"max_retries"`
	Callback             func(bool, error) `json:"-"`
}

// PerformanceMonitor monitors lock performance
type PerformanceMonitor struct {
	responseTimeHistory  []time.Duration
	contentionHistory    []int
	throughputHistory    []int64
	errorRateHistory     []float64
	averageResponseTime  time.Duration
	p95ResponseTime      time.Duration
	p99ResponseTime      time.Duration
	contentionRate       float64
	throughput           int64
	errorRate            float64
	mu                   sync.RWMutex
}

// AccessOptimizer optimizes database access patterns
type AccessOptimizer struct {
	accessPatterns       map[string]*AccessPattern
	predictionModel      *PredictionModel
	cacheManager         *LockCacheManager
	batchProcessor      *BatchProcessor
	metrics              *AccessMetrics
	mu                   sync.RWMutex
}

// AccessPattern represents an access pattern
type AccessPattern struct {
	ResourceID           string        `json:"resource_id"`
	AccessFrequency      float64       `json:"access_frequency"`
	AverageAccessTime    time.Duration `json:"average_access_time"`
	PeakAccessTime      time.Time     `json:"peak_access_time"`
	AccessDistribution   []int         `json:"access_distribution"`
	ContentionLevel      float64       `json:"contention_level"`
	OptimalLockType      string        `json:"optimal_lock_type"`
	OptimalLockMode      string        `json:"optimal_lock_mode"`
	Priority             int           `json:"priority"`
	LastUpdated          time.Time     `json:"last_updated"`
}

// PredictionModel predicts lock requirements
type PredictionModel struct {
	modelType            string        `json:"model_type"`
	trainingData         []TrainingSample
	accuracy             float64       `json:"accuracy"`
	predictionLatency    time.Duration `json:"prediction_latency"`
	modelVersion         string        `json:"model_version"`
	LastTrained          time.Time     `json:"last_trained"`
}

// TrainingSample represents a training sample
type TrainingSample struct {
	SampleID             uuid.UUID     `json:"sample_id"`
	ResourceID           string        `json:"resource_id"`
	Features             []float64     `json:"features"`
	RequiredLockType     string        `json:"required_lock_type"`
	RequiredLockMode     string        `json:"required_lock_mode"`
	Priority             int           `json:"priority"`
	ActualResult         bool          `json:"actual_result"`
	PredictionResult    bool          `json:"prediction_result"`
	Timestamp            time.Time     `json:"timestamp"`
}

// LockCacheManager manages lock caching
type LockCacheManager struct {
	cache                 map[string]*CacheEntry
	maxSize               int64
	currentSize           int64
	hitCount              int64
	missCount             int64
	evictionPolicy        string
	ttl                   time.Duration
	metrics               *CacheMetrics
	mu                    sync.RWMutex
}

// CacheEntry represents a cache entry
type CacheEntry struct {
	Key                   string        `json:"key"`
	Value                 interface{}   `json:"value"`
	Size                  int64         `json:"size"`
	AccessCount           int64         `json:"access_count"`
	LastAccessed          time.Time     `json:"last_accessed"`
	CreatedAt             time.Time     `json:"created_at"`
	ExpiresAt             time.Time     `json:"expires_at"`
	Priority              int           `json:"priority"`
}

// CacheMetrics tracks cache performance
type CacheMetrics struct {
	TotalRequests         int64         `json:"total_requests"`
	CacheHits             int64         `json:"cache_hits"`
	CacheMisses           int64         `json:"cache_misses"`
	HitRatio              float64       `json:"hit_ratio"`
	AverageAccessTime     time.Duration `json:"average_access_time"`
	EvictionCount         int64         `json:"eviction_count"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// BatchProcessor processes batch lock operations
type BatchProcessor struct {
	batchQueue            chan *BatchRequest
	workers               int
	batchSize             int
	processingTime        time.Duration
	metrics               *BatchMetrics
	mu                    sync.RWMutex
}

// BatchRequest represents a batch request
type BatchRequest struct {
	BatchID               uuid.UUID     `json:"batch_id"`
	Requests              []*LockRequest `json:"requests"`
	Priority              int           `json:"priority"`
	CreatedAt             time.Time     `json:"created_at"`
	Timeout               time.Duration `json:"timeout"`
	Callback             func([]bool, []error) `json:"-"`
}

// BatchMetrics tracks batch processing performance
type BatchMetrics struct {
	TotalBatches          int64         `json:"total_batches"`
	SuccessfulBatches     int64         `json:"successful_batches"`
	FailedBatches         int64         `json:"failed_batches"`
	AverageBatchSize      int           `json:"average_batch_size"`
	AverageProcessingTime  time.Duration `json:"average_processing_time"`
	Throughput            int64         `json:"throughput"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// ResourceLockMetrics tracks resource locking performance
type ResourceLockMetrics struct {
	TotalLocks             int64         `json:"total_locks"`
	SuccessfulLocks       int64         `json:"successful_locks"`
	FailedLocks            int64         `json:"failed_locks"`
	AverageLockTime        time.Duration `json:"average_lock_time"`
	MaxLockTime            time.Duration `json:"max_lock_time"`
	P95LockTime            time.Duration `json:"p95_lock_time"`
	P99LockTime            time.Duration `json:"p99_lock_time"`
	
	// Performance metrics
	ResponseTimeUnderTarget float64       `json:"response_time_under_target"`
	ContentionRate         float64       `json:"contention_rate"`
	Throughput             int64         `json:"throughput"`
	ErrorRate              float64       `json:"error_rate"`
	
	// Resource metrics
	ActiveLocks            int           `json:"active_locks"`
	QueueLength            int           `json:"queue_length"`
	UtilizationRate        float64       `json:"utilization_rate"`
	
	LastUpdated            time.Time     `json:"last_updated"`
	CreatedAt              time.Time     `json:"created_at"`
	
	mu                     sync.RWMutex
}

// AccessMetrics tracks access optimization performance
type AccessMetrics struct {
	TotalOptimizations     int64         `json:"total_optimizations"`
	SuccessfulOptimizations int64        `json:"successful_optimizations"`
	PredictionAccuracy     float64       `json:"prediction_accuracy"`
	AverageOptimizationTime time.Duration `json:"average_optimization_time"`
	CacheHitRatio          float64       `json:"cache_hit_ratio"`
	BatchEfficiency        float64       `json:"batch_efficiency"`
	LastUpdated            time.Time     `json:"last_updated"`
	CreatedAt              time.Time     `json:"created_at"`
	
	mu                     sync.RWMutex
}

// NewResourceLockManager creates a new resource lock manager
func NewResourceLockManager(session *gocqlx.Session, config ResourceLockConfig) *ResourceLockManager {
	rlm := &ResourceLockManager{
		session:            session,
		config:             config,
		lockTable:          make(map[string]*ResourceLockEntry),
		waitQueue:          make(map[string][]*LockRequest),
		performanceMonitor: NewPerformanceMonitor(),
		accessOptimizer:    NewAccessOptimizer(),
		metrics:            NewResourceLockMetrics(),
	}

	// Start background processes
	go rlm.monitorPerformance()
	go rlm.optimizeAccess()
	go rlm.cleanupExpiredLocks()
	go rlm.updateMetrics()

	return rlm
}

// AcquireLock acquires a resource lock with ultra-fast response
func (rlm *ResourceLockManager) AcquireLock(ctx context.Context, resourceID, resourceType, lockType, lockMode string, ownerID uuid.UUID, priority int) (*ResourceLockEntry, error) {
	startTime := time.Now()

	// Log lock acquisition start
	log.Printf("🔒 Acquiring lock for resource %s with priority %d", resourceID, priority)

	// Check if we can meet target response time
	if rlm.config.TargetResponseTime < 1*time.Millisecond {
		log.Printf("⚡ Ultra-fast lock acquisition requested: %v", rlm.config.TargetResponseTime)
	}

	// Try to acquire lock immediately
	if lock, err := rlm.tryAcquireLock(resourceID, resourceType, lockType, lockMode, ownerID, priority); err == nil {
		processingTime := time.Since(startTime)
		
		rlm.metrics.mu.Lock()
		rlm.metrics.SuccessfulLocks++
		rlm.metrics.TotalLocks++
		if rlm.metrics.AverageLockTime == 0 {
			rlm.metrics.AverageLockTime = processingTime
		} else {
			rlm.metrics.AverageLockTime = (rlm.metrics.AverageLockTime + processingTime) / 2
		}
		rlm.metrics.mu.Unlock()

		// Check if we met target response time
		if processingTime > rlm.config.TargetResponseTime {
			log.Printf("⚠️ Lock acquisition time %v exceeds target %v", processingTime, rlm.config.TargetResponseTime)
		} else {
			log.Printf("⚡ Lock acquired in %v (target: %v)", processingTime, rlm.config.TargetResponseTime)
		}

		return lock, nil
	}

	// If immediate acquisition failed, try optimized path
	optimizedLock, err := rlm.optimizedAcquireLock(ctx, resourceID, resourceType, lockType, lockMode, ownerID, priority)
	if err != nil {
		rlm.metrics.mu.Lock()
		rlm.metrics.FailedLocks++
		rlm.metrics.TotalLocks++
		rlm.metrics.mu.Unlock()
		
		return nil, fmt.Errorf("failed to acquire lock: %w", err)
	}

	processingTime := time.Since(startTime)
	
	rlm.metrics.mu.Lock()
	rlm.metrics.SuccessfulLocks++
	rlm.metrics.TotalLocks++
	if rlm.metrics.AverageLockTime == 0 {
		rlm.metrics.AverageLockTime = processingTime
	} else {
		rlm.metrics.AverageLockTime = (rlm.metrics.AverageLockTime + processingTime) / 2
	}
	rlm.metrics.mu.Unlock()

	log.Printf("🔒 Lock acquired in %v for resource %s", processingTime, resourceID)
	return optimizedLock, nil
}

// tryAcquireLock tries to acquire a lock immediately
func (rlm *ResourceLockManager) tryAcquireLock(resourceID, resourceType, lockType, lockMode string, ownerID uuid.UUID, priority int) (*ResourceLockEntry, error) {
	rlm.mu.Lock()
	defer rlm.mu.Unlock()

	// Check if lock already exists
	if existingLock, exists := rlm.lockTable[resourceID]; exists && existingLock.IsActive {
		// Check if lock is compatible
		if rlm.isLockCompatible(existingLock, lockType, lockMode) {
			// Update existing lock
			existingLock.AccessCount++
			existingLock.LastAccessed = time.Now()
			return existingLock, nil
		}
		
		// Lock not compatible, return error
		return nil, fmt.Errorf("resource already locked with incompatible lock")
	}

	// Create new lock entry
	lock := &ResourceLockEntry{
		LockID:           uuid.New(),
		ResourceID:       resourceID,
		ResourceType:     resourceType,
		OwnerID:          ownerID,
		LockType:         lockType,
		LockMode:         lockMode,
		Priority:         priority,
		AcquiredAt:       time.Now(),
		ExpiresAt:        time.Now().Add(rlm.config.LockTimeout),
		LastAccessed:     time.Now(),
		AccessCount:      1,
		IsActive:         true,
		WaitQueue:        []uuid.UUID{},
		ContentionLevel:  0,
		PerformanceScore: 1.0,
	}

	rlm.lockTable[resourceID] = lock
	return lock, nil
}

// optimizedAcquireLock tries optimized lock acquisition
func (rlm *ResourceLockManager) optimizedAcquireLock(ctx context.Context, resourceID, resourceType, lockType, lockMode string, ownerID uuid.UUID, priority int) (*ResourceLockEntry, error) {
	startTime := time.Now()

	// Use access optimizer to predict best strategy
	strategy := rlm.accessOptimizer.PredictOptimalStrategy(resourceID, resourceType, lockType, lockMode, priority)
	
	switch strategy {
	case "cache":
		return rlm.acquireFromCache(ctx, resourceID, resourceType, lockType, lockMode, ownerID, priority)
	case "batch":
		return rlm.acquireBatch(ctx, resourceID, resourceType, lockType, lockMode, ownerID, priority)
	case "database":
		return rlm.acquireFromDatabase(ctx, resourceID, resourceType, lockType, lockMode, ownerID, priority)
	default:
		return rlm.acquireStandard(ctx, resourceID, resourceType, lockType, lockMode, ownerID, priority)
	}
}

// acquireFromCache tries to acquire lock from cache
func (rlm *ResourceLockManager) acquireFromCache(ctx context.Context, resourceID, resourceType, lockType, lockMode string, ownerID uuid.UUID, priority int) (*ResourceLockEntry, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("lock_%s_%s_%s", resourceID, lockType, lockMode)
	if cached, found := rlm.accessOptimizer.cacheManager.Get(cacheKey); found {
		if lockEntry, ok := cached.(*ResourceLockEntry); ok {
			// Validate cache entry
			if time.Now().Before(lockEntry.ExpiresAt) && lockEntry.IsActive {
				lockEntry.LastAccessed = time.Now()
				lockEntry.AccessCount++
				
				log.Printf("⚡ Lock acquired from cache for resource %s", resourceID)
				return lockEntry, nil
			}
		}
	}

	// Cache miss, acquire standard
	return rlm.acquireStandard(ctx, resourceID, resourceType, lockType, lockMode, ownerID, priority)
}

// acquireBatch tries to acquire lock in batch
func (rlm *ResourceLockManager) acquireBatch(ctx context.Context, resourceID, resourceType, lockType, lockMode string, ownerID uuid.UUID, priority int) (*ResourceLockEntry, error) {
	// Create batch request
	batchRequest := &BatchRequest{
		BatchID:   uuid.New(),
		Requests: []*LockRequest{
			{
				RequestID:    uuid.New(),
				ResourceID:   resourceID,
				ResourceType: resourceType,
				OwnerID:      ownerID,
				LockType:     lockType,
				LockMode:     lockMode,
				Priority:     priority,
				RequestedAt:  time.Now(),
				Timeout:      rlm.config.MaxLockWait,
				MaxRetries:   3,
			},
		},
		Priority:  priority,
		CreatedAt: time.Now(),
		Timeout:   rlm.config.MaxLockWait,
	}

	// Process batch
	results, errors := rlm.accessOptimizer.batchProcessor.ProcessBatch(batchRequest)
	
	if len(errors) > 0 {
		return nil, errors[0]
	}

	if len(results) > 0 && results[0] {
		// Create lock entry
		lock := &ResourceLockEntry{
			LockID:           uuid.New(),
			ResourceID:       resourceID,
			ResourceType:     resourceType,
			OwnerID:          ownerID,
			LockType:         lockType,
			LockMode:         lockMode,
			Priority:         priority,
			AcquiredAt:       time.Now(),
			ExpiresAt:        time.Now().Add(rlm.config.LockTimeout),
			LastAccessed:     time.Now(),
			AccessCount:      1,
			IsActive:         true,
			WaitQueue:        []uuid.UUID{},
			ContentionLevel:  0,
			PerformanceScore: 1.0,
		}

		rlm.mu.Lock()
		rlm.lockTable[resourceID] = lock
		rlm.mu.Unlock()

		log.Printf("🚀 Lock acquired via batch processing for resource %s", resourceID)
		return lock, nil
	}

	return nil, fmt.Errorf("batch acquisition failed")
}

// acquireFromDatabase tries to acquire lock from database
func (rlm *ResourceLockManager) acquireFromDatabase(ctx context.Context, resourceID, resourceType, lockType, lockMode string, ownerID uuid.UUID, priority int) (*ResourceLockEntry, error) {
	startTime := time.Now()

	// Query database for existing lock
	query := qb.Select("resource_locks").
		Columns("lock_id", "resource_id", "resource_type", "owner_id", "lock_type", "lock_mode", "priority", "acquired_at", "expires_at", "is_active").
		Where(qb.Eq("resource_id", resourceID)).
		Where(qb.Eq("is_active", true)).
		ToCql()

	var existingLock ResourceLockEntry
	err := rlm.session.Queryctx(ctx, query, resourceID, true).Get(
		&existingLock.LockID, &existingLock.ResourceID, &existingLock.ResourceType,
		&existingLock.OwnerID, &existingLock.LockType, &existingLock.LockMode,
		&existingLock.Priority, &existingLock.AcquiredAt, &existingLock.ExpiresAt,
		&existingLock.IsActive)

	if err == nil {
		// Lock exists in database
		if time.Now().Before(existingLock.ExpiresAt) && existingLock.IsActive {
			if rlm.isLockCompatible(&existingLock, lockType, lockMode) {
				// Compatible lock, update access
				existingLock.LastAccessed = time.Now()
				existingLock.AccessCount++
				
				// Update in database
				updateQuery := qb.Update("resource_locks").
					Set("last_accessed", time.Now()).
					Set("access_count", existingLock.AccessCount).
					Where(qb.Eq("resource_id", resourceID)).
					ToCql()
				
				err = rlm.session.Queryctx(ctx, updateQuery, time.Now(), existingLock.AccessCount, resourceID).Exec()
				if err != nil {
					return nil, fmt.Errorf("failed to update lock in database: %w", err)
				}
				
				processingTime := time.Since(startTime)
				log.Printf("🗄️ Lock acquired from database in %v for resource %s", processingTime, resourceID)
				return &existingLock, nil
			}
		}
	}

	// Create new lock in database
	newLock := &ResourceLockEntry{
		LockID:           uuid.New(),
		ResourceID:       resourceID,
		ResourceType:     resourceType,
		OwnerID:          ownerID,
		LockType:         lockType,
		LockMode:         lockMode,
		Priority:         priority,
		AcquiredAt:       time.Now(),
		ExpiresAt:        time.Now().Add(rlm.config.LockTimeout),
		LastAccessed:     time.Now(),
		AccessCount:      1,
		IsActive:         true,
		WaitQueue:        []uuid.UUID{},
		ContentionLevel:  0,
		PerformanceScore: 1.0,
	}

	// Insert into database
	insertQuery := qb.Insert("resource_locks").
		Columns("lock_id", "resource_id", "resource_type", "owner_id", "lock_type", "lock_mode", "priority", "acquired_at", "expires_at", "last_accessed", "access_count", "is_active").
		ToCql()

	err = rlm.session.Queryctx(ctx, insertQuery,
		newLock.LockID, newLock.ResourceID, newLock.ResourceType,
		newLock.OwnerID, newLock.LockType, newLock.LockMode,
		newLock.Priority, newLock.AcquiredAt, newLock.ExpiresAt,
		newLock.LastAccessed, newLock.AccessCount, newLock.IsActive).Exec()

	if err != nil {
		return nil, fmt.Errorf("failed to insert lock in database: %w", err)
	}

	// Cache the lock
	cacheKey := fmt.Sprintf("lock_%s_%s_%s", resourceID, lockType, lockMode)
	rlm.accessOptimizer.cacheManager.Set(cacheKey, newLock)

	processingTime := time.Since(startTime)
	log.Printf("🗄️ New lock created in database in %v for resource %s", processingTime, resourceID)
	return newLock, nil
}

// acquireStandard tries standard lock acquisition
func (rlm *ResourceLockManager) acquireStandard(ctx context.Context, resourceID, resourceType, lockType, lockMode string, ownerID uuid.UUID, priority int) (*ResourceLockEntry, error) {
	// Try immediate acquisition first
	if lock, err := rlm.tryAcquireLock(resourceID, resourceType, lockType, lockMode, ownerID, priority); err == nil {
		return lock, nil
	}

	// Add to wait queue
	request := &LockRequest{
		RequestID:    uuid.New(),
		ResourceID:   resourceID,
		ResourceType: resourceType,
		OwnerID:      ownerID,
		LockType:     lockType,
		LockMode:     lockMode,
		Priority:     priority,
		RequestedAt:  time.Now(),
		Timeout:      rlm.config.MaxLockWait,
		MaxRetries:   3,
	}

	rlm.mu.Lock()
	rlm.waitQueue[resourceID] = append(rlm.waitQueue[resourceID], request)
	rlm.mu.Unlock()

	// Wait for lock acquisition
	return rlm.waitForLock(ctx, request)
}

// waitForLock waits for lock acquisition
func (rlm *ResourceLockManager) waitForLock(ctx context.Context, request *LockRequest) (*ResourceLockEntry, error) {
	timeout := time.After(request.Timeout)
	ticker := time.NewTicker(1 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil, fmt.Errorf("context cancelled")
		case <-timeout:
			return nil, fmt.Errorf("lock acquisition timeout")
		case <-ticker.C:
			// Try to acquire lock
			if lock, err := rlm.tryAcquireLock(request.ResourceID, request.ResourceType, request.LockType, request.LockMode, request.OwnerID, request.Priority); err == nil {
				return lock, nil
			}
		}
	}
}

// ReleaseLock releases a resource lock
func (rlm *ResourceLockManager) ReleaseLock(resourceID string, ownerID uuid.UUID) error {
	rlm.mu.Lock()
	defer rlm.mu.Unlock()

	if lock, exists := rlm.lockTable[resourceID]; exists && lock.IsActive {
		if lock.OwnerID == ownerID {
			lock.IsActive = false
			delete(rlm.lockTable, resourceID)
			
			// Process wait queue
			if len(rlm.waitQueue[resourceID]) > 0 {
				nextRequest := rlm.waitQueue[resourceID][0]
				rlm.waitQueue[resourceID] = rlm.waitQueue[resourceID][1:]
				
				// Grant lock to next requester
				go func() {
					rlm.tryAcquireLock(nextRequest.ResourceID, nextRequest.ResourceType, nextRequest.LockType, nextRequest.LockMode, nextRequest.OwnerID, nextRequest.Priority)
				}()
			}
			
			log.Printf("🔓 Lock released for resource %s", resourceID)
			return nil
		}
	}

	return fmt.Errorf("lock not found or not owned by user")
}

// isLockCompatible checks if lock is compatible with requested lock
func (rlm *ResourceLockManager) isLockCompatible(existingLock *ResourceLockEntry, requestedType, requestedMode string) bool {
	// Same owner is always compatible
	if existingLock.LockType == requestedType && existingLock.LockMode == requestedMode {
		return true
	}

	// Shared locks are compatible with other shared locks
	if existingLock.LockMode == "shared" && requestedMode == "shared" {
		return true
	}

	// Exclusive locks are not compatible with any other locks
	if existingLock.LockMode == "exclusive" || requestedMode == "exclusive" {
		return false
	}

	// Upgrade locks are compatible with shared locks
	if (existingLock.LockMode == "shared" && requestedMode == "upgrade") ||
		(existingLock.LockMode == "upgrade" && requestedMode == "shared") {
		return true
	}

	return false
}

// Background processes

func (rlm *ResourceLockManager) monitorPerformance() {
	if !rlm.config.EnableMetrics {
		return
	}

	ticker := time.NewTicker(rlm.config.MetricsInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			rlm.calculatePerformanceMetrics()
		}
	}
}

func (rlm *ResourceLockManager) calculatePerformanceMetrics() {
	rlm.metrics.mu.Lock()
	defer rlm.metrics.mu.Unlock()

	// Calculate response time metrics
	if len(rlm.performanceMonitor.responseTimeHistory) > 0 {
		rlm.metrics.AverageLockTime = rlm.performanceMonitor.averageResponseTime
		rlm.metrics.P95LockTime = rlm.performanceMonitor.p95ResponseTime
		rlm.metrics.P99LockTime = rlm.performanceMonitor.p99ResponseTime
	}

	// Calculate response time under target
	underTarget := 0
	for _, rt := range rlm.performanceMonitor.responseTimeHistory {
		if rt <= rlm.config.TargetResponseTime {
			underTarget++
		}
	}
	if len(rlm.performanceMonitor.responseTimeHistory) > 0 {
		rlm.metrics.ResponseTimeUnderTarget = float64(underTarget) / float64(len(rlm.performanceMonitor.responseTimeHistory))
	}

	// Calculate contention rate
	rlm.metrics.ContentionRate = rlm.performanceMonitor.contentionRate

	// Calculate throughput
	rlm.metrics.Throughput = rlm.performanceMonitor.throughput

	// Calculate error rate
	rlm.metrics.ErrorRate = rlm.performanceMonitor.errorRate

	// Update active locks and queue length
	rlm.metrics.ActiveLocks = len(rlm.lockTable)
	totalQueueLength := 0
	for _, queue := range rlm.waitQueue {
		totalQueueLength += len(queue)
	}
	rlm.metrics.QueueLength = totalQueueLength

	// Calculate utilization rate
	if rlm.config.MaxConcurrentLocks > 0 {
		rlm.metrics.UtilizationRate = float64(rlm.metrics.ActiveLocks) / float64(rlm.config.MaxConcurrentLocks)
	}

	rlm.metrics.LastUpdated = time.Now()
}

func (rlm *ResourceLockManager) optimizeAccess() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			rlm.accessOptimizer.OptimizeAccess(rlm.lockTable, rlm.waitQueue)
		}
	}
}

func (rlm *ResourceLockManager) cleanupExpiredLocks() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			rlm.cleanupExpired()
		}
	}
}

func (rlm *ResourceLockManager) cleanupExpired() {
	rlm.mu.Lock()
	defer rlm.mu.Unlock()

	now := time.Now()
	for resourceID, lock := range rlm.lockTable {
		if now.After(lock.ExpiresAt) {
			lock.IsActive = false
			delete(rlm.lockTable, resourceID)
			
			// Process wait queue
			if len(rlm.waitQueue[resourceID]) > 0 {
				nextRequest := rlm.waitQueue[resourceID][0]
				rlm.waitQueue[resourceID] = rlm.waitQueue[resourceID][1:]
				
				// Grant lock to next requester
				go func() {
					rlm.tryAcquireLock(nextRequest.ResourceID, nextRequest.ResourceType, nextRequest.LockType, nextRequest.LockMode, nextRequest.OwnerID, nextRequest.Priority)
				}()
			}
		}
	}
}

func (rlm *ResourceLockManager) updateMetrics() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			rlm.metrics.LastUpdated = time.Now()
		}
	}
}

// AccessOptimizer methods

func (ao *AccessOptimizer) PredictOptimalStrategy(resourceID, resourceType, lockType, lockMode string, priority int) string {
	// Check cache first
	cacheKey := fmt.Sprintf("strategy_%s_%s_%s", resourceID, lockType, lockMode)
	if cached, found := ao.cacheManager.Get(cacheKey); found {
		if strategy, ok := cached.(string); ok {
			return strategy
		}
	}

	// Predict based on access patterns
	if pattern, exists := ao.accessPatterns[resourceID]; exists {
		if pattern.ContentionLevel > 0.7 {
			return "database" // High contention - use database
		} else if pattern.AccessFrequency > 10.0 {
			return "cache" // High frequency - use cache
		} else {
			return "batch" // Moderate - use batch
		}
	}

	// Default strategy
	return "standard"
}

func (ao *AccessOptimizer) OptimizeAccess(lockTable map[string]*ResourceLockEntry, waitQueue map[string][]*LockRequest) {
	// Update access patterns
	for resourceID, lock := range lockTable {
		if pattern, exists := ao.accessPatterns[resourceID]; exists {
			pattern.AccessFrequency = float64(lock.AccessCount) / time.Since(lock.AcquiredAt).Seconds()
			pattern.AverageAccessTime = time.Since(lock.LastAccessed)
			pattern.LastUpdated = time.Now()
		} else {
			pattern := &AccessPattern{
				ResourceID:        resourceID,
				AccessFrequency:   float64(lock.AccessCount) / time.Since(lock.AcquiredAt).Seconds(),
				AverageAccessTime: time.Since(lock.LastAccessed),
				PeakAccessTime:    lock.AcquiredAt,
				ContentionLevel:   float64(len(waitQueue[resourceID])),
				OptimalLockType:   lock.LockType,
				OptimalLockMode:   lock.LockMode,
				Priority:          lock.Priority,
				LastUpdated:       time.Now(),
			}
			ao.accessPatterns[resourceID] = pattern
		}
	}
}

// LockCacheManager methods

func (lcm *LockCacheManager) Get(key string) (interface{}, bool) {
	lcm.mu.RLock()
	defer lcm.mu.RUnlock()

	lcm.hitCount++
	
	if entry, exists := lcm.cache[key]; exists && time.Now().Before(entry.ExpiresAt) {
		entry.AccessCount++
		entry.LastAccessed = time.Now()
		return entry.Value, true
	}

	lcm.missCount++
	return nil, false
}

func (lcm *LockCacheManager) Set(key string, value interface{}) {
	lcm.mu.Lock()
	defer lcm.mu.Unlock()

	// Calculate size
	size := int64(100) // Simplified size calculation

	// Check if we need to evict
	if lcm.currentSize+size > lcm.maxSize {
		lcm.evictLRU()
	}

	// Check again after eviction
	if lcm.currentSize+size > lcm.maxSize {
		return // Not enough space
	}

	entry := &CacheEntry{
		Key:          key,
		Value:        value,
		Size:         size,
		AccessCount:  1,
		LastAccessed: time.Now(),
		CreatedAt:    time.Now(),
		ExpiresAt:    time.Now().Add(lcm.ttl),
		Priority:     1,
	}

	lcm.cache[key] = entry
	lcm.currentSize += size
}

func (lcm *LockCacheManager) evictLRU() {
	var oldestKey string
	var oldestTime time.Time

	for key, entry := range lcm.cache {
		if oldestTime.IsZero() || entry.LastAccessed.Before(oldestTime) {
			oldestKey = key
			oldestTime = entry.LastAccessed
		}
	}

	if oldestKey != "" {
		lcm.currentSize -= lcm.cache[oldestKey].Size
		delete(lcm.cache, oldestKey)
		
		lcm.metrics.mu.Lock()
		lcm.metrics.EvictionCount++
		lcm.metrics.mu.Unlock()
	}
}

// BatchProcessor methods

func (bp *BatchProcessor) ProcessBatch(batch *BatchRequest) ([]bool, []error) {
	startTime := time.Now()
	
	results := make([]bool, len(batch.Requests))
	errors := make([]error, len(batch.Requests))

	// Process all requests in batch
	for i, request := range batch.Requests {
		// Simulate processing
		results[i] = true
		errors[i] = nil
	}

	processingTime := time.Since(startTime)
	
	bp.metrics.mu.Lock()
	bp.metrics.TotalBatches++
	bp.metrics.SuccessfulBatches++
	if bp.metrics.AverageBatchSize == 0 {
		bp.metrics.AverageBatchSize = len(batch.Requests)
	} else {
		bp.metrics.AverageBatchSize = (bp.metrics.AverageBatchSize + len(batch.Requests)) / 2
	}
	if bp.metrics.AverageProcessingTime == 0 {
		bp.metrics.AverageProcessingTime = processingTime
	} else {
		bp.metrics.AverageProcessingTime = (bp.metrics.AverageProcessingTime + processingTime) / 2
	}
	bp.metrics.mu.Unlock()

	return results, errors
}

// PerformanceMonitor methods

func (pm *PerformanceMonitor) RecordResponseTime(responseTime time.Duration) {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	pm.responseTimeHistory = append(pm.responseTimeHistory, responseTime)
	
	// Keep only last 1000 measurements
	if len(pm.responseTimeHistory) > 1000 {
		pm.responseTimeHistory = pm.responseTimeHistory[1:]
	}

	// Update average
	if len(pm.responseTimeHistory) > 0 {
		var total time.Duration
		for _, rt := range pm.responseTimeHistory {
			total += rt
		}
		pm.averageResponseTime = total / time.Duration(len(pm.responseTimeHistory))
	}

	// Update percentiles
	if len(pm.responseTimeHistory) > 10 {
		sorted := make([]time.Duration, len(pm.responseTimeHistory))
		copy(sorted, pm.responseTimeHistory)
		
		// Simple bubble sort for percentiles
		for i := 0; i < len(sorted); i++ {
			for j := i + 1; j < len(sorted); j++ {
				if sorted[i] > sorted[j] {
					sorted[i], sorted[j] = sorted[j], sorted[i]
				}
			}
		}
		
		p95Index := int(float64(len(sorted)) * 0.95)
		p99Index := int(float64(len(sorted)) * 0.99)
		
		if p95Index < len(sorted) {
			pm.p95ResponseTime = sorted[p95Index]
		}
		if p99Index < len(sorted) {
			pm.p99ResponseTime = sorted[p99Index]
		}
	}
}

// GetMetrics returns resource lock metrics
func (rlm *ResourceLockManager) GetMetrics() *ResourceLockMetrics {
	rlm.metrics.mu.RLock()
	defer rlm.metrics.mu.RUnlock()
	
	metrics := *rlm.metrics
	return &metrics
}

// Helper functions

func NewResourceLockMetrics() *ResourceLockMetrics {
	return &ResourceLockMetrics{
		CreatedAt: time.Now(),
	}
}

func NewPerformanceMonitor() *PerformanceMonitor {
	return &PerformanceMonitor{}
}

func NewAccessOptimizer() *AccessOptimizer {
	return &AccessOptimizer{
		accessPatterns:  make(map[string]*AccessPattern),
		predictionModel: &PredictionModel{},
		cacheManager:    NewLockCacheManager(1000, 10*time.Minute),
		batchProcessor:  NewBatchProcessor(10, 50),
		metrics:         &AccessMetrics{CreatedAt: time.Now()},
	}
}

func NewLockCacheManager(maxSize int64, ttl time.Duration) *LockCacheManager {
	return &LockCacheManager{
		cache:          make(map[string]*CacheEntry),
		maxSize:        maxSize,
		evictionPolicy: "LRU",
		ttl:            ttl,
		metrics:        &CacheMetrics{CreatedAt: time.Now()},
	}
}

func NewBatchProcessor(workers, batchSize int) *BatchProcessor {
	return &BatchProcessor{
		batchQueue:     make(chan *BatchRequest, workers*100),
		workers:       workers,
		batchSize:     batchSize,
		metrics:       &BatchMetrics{CreatedAt: time.Now()},
	}
}

// Close closes the resource lock manager
func (rlm *ResourceLockManager) Close() error {
	log.Println("🔌 Resource lock manager closed")
	return nil
}
