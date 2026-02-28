package concurrency

import (
	"context"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
	"github.com/kronop/prefetcher/internal/bridge"
	"github.com/kronop/prefetcher/internal/ai"
	"github.com/kronop/prefetcher/internal/tracker"
)

// SmartConcurrency manages intelligent concurrent prefetching with Go channels
type SmartConcurrency struct {
	rustBridge    *bridge.RustBridge
	cppBridge    *bridge.CppBridge
	analyzer     *ai.PredictionLogic
	tracker      *tracker.UserBehaviorTracker
	config       ConcurrencyConfig
	priorityQueue chan PrefetchTask
	workerPool    chan struct{}
	workers      []*Worker
	mu           sync.RWMutex
	stats        *ConcurrencyStats
	stopChan      chan struct{}
}

// ConcurrencyConfig holds concurrency configuration
type ConcurrencyConfig struct {
	MaxWorkers           int           `yaml:"max_workers"`
	MaxQueueSize         int           `yaml:"max_queue_size"`
	WorkerTimeout        time.Duration `yaml:"worker_timeout"`
	RetryAttempts        int           `yaml:"retry_attempts"`
	RetryDelay           time.Duration `yaml:"retry_delay"`
	EnableAdaptiveScheduling bool          `yaml:"enable_adaptive_scheduling"`
	EnablePriorityBoosting    bool          `yaml:"enable_priority_boosting"`
	NetworkMultiplier     float64       `yaml:"network_multiplier"`
}

// PrefetchTask represents a prefetching task
type PrefetchTask struct {
	ID              string
	UserID          string
	ReelID          int
	ChunkID         string
	Priority       Priority
	URL             string
	Timeout        time.Duration
	MaxRetries      int
	CurrentRetries   int
	CreatedAt       time.Time
	ExpiresAt       time.Time
	Dependencies   []string
	WorkerID        int
	StartTime      time.Time
	CompletedAt     time.Time
	Success        bool
	ErrorMessage  string
}

// Priority represents task priority levels
type Priority int

const (
	PriorityUrgent Priority = iota
	PriorityHigh   Priority = iota
	PriorityMedium Priority = iota
	PriorityLow    Priority = iota
)

// Worker represents a worker goroutine
type Worker struct {
	ID          int
	Channel     chan PrefetchTask
	QuitChan     chan struct{}
	Stats       *WorkerStats
	isActive    bool
}

// WorkerStats holds worker statistics
type WorkerStats struct {
	TasksProcessed    int     `json:"tasks_processed"`
	TasksSucceeded   int     `json:"tasks_succeeded"`
	TasksFailed      int     `json:"tasks_failed"`
	AvgProcessTime   time.Duration `json:"avg_process_time"`
	TotalProcessTime time.Duration `json:"total_process_time"`
	LastError      string    `json:"last_error"`
	LastActiveTime   time.Time `json:"last_active_time"`
}

// ConcurrencyStats holds concurrency statistics
type ConcurrencyStats struct {
	TotalTasks        int       `json:"total_tasks"`
	SuccessfulTasks   int       `json:"successful_tasks"`
	FailedTasks       int       `json:"failed_tasks"`
	AvgProcessTime    time.Duration `json:"avg_process_time"`
	ActiveWorkers     int       `json:"active_workers"`
	QueueUtilization float64   `json:"queue_utilization"`
	ThroughputBPS     float64   `json:"throughput_bps"`
	CacheHitRate       float64   `json:"cache_hit_rate"`
	NetworkEfficiency float64   `json:"network_efficiency"`
}

// NewSmartConcurrency creates a new smart concurrency manager
func NewSmartConcurrency(
	rustBridge *bridge.RustBridge,
	cppBridge *bridge.CppBridge,
	analyzer *ai.PredictionLogic,
	tracker *tracker.UserBehaviorTracker,
	config ConcurrencyConfig,
) *SmartConcurrency {
	return &SmartConcurrency{
		rustBridge:    rustBridge,
		cppBridge:    cppBridge,
		analyzer:     analyzer,
		tracker:      tracker,
		config:      config,
		priorityQueue: make(chan PrefetchTask, config.MaxQueueSize),
		workerPool:    make(chan struct{}, config.MaxWorkers),
		workers:      make([]*Worker, config.MaxWorkers),
		stats:        &ConcurrencyStats{},
		stopChan:     make(chan struct{}),
	}
}

// Start starts the smart concurrency manager
func (sc *SmartConcurrency) Start(ctx context.Context) error {
	logrus.Info("🚀 Starting Smart Concurrency Manager")

	// Create worker pool
	for i := 0; i < sc.config.MaxWorkers; i++ {
		worker := &Worker{
			ID:          i,
			Channel:     make(chan PrefetchTask),
			QuitChan:     make(chan struct{}),
			Stats:       &WorkerStats{},
			isActive:    true,
		}
		
		sc.workers[i] = worker
		go sc.startWorker(ctx, worker)
	}

	// Start task dispatcher
	go sc.taskDispatcher(ctx)

	// Start performance monitor
	go sc.performanceMonitor(ctx)

	// Start adaptive scheduler
	if sc.config.EnableAdaptiveScheduling {
		go sc.adaptiveScheduler(ctx)
	}

	logrus.Infof("✅ Smart Concurrency Manager started with %d workers", sc.config.MaxWorkers)
	return nil
}

// startWorker starts a worker goroutine
func (sc *SmartConcurrency) startWorker(ctx context.Context, worker *Worker) {
	logrus.Infof("👷 Started worker %d", worker.ID)

	for {
		select {
		case task := <-worker.Channel:
			worker.processTask(ctx, worker, task)
		case <-worker.QuitChan:
			worker.isActive = false
			logrus.Infof("🛑 Worker %d stopped", worker.ID)
			return
		case <-ctx.Done():
			worker.isActive = false
			logrus.Infof("🛑 Worker %d shutting down", worker.ID)
			return
		}
	}
}

// processTask processes a single prefetch task
func (sc *SmartConcurrency) processTask(ctx context.Context, worker *Worker, task PrefetchTask) {
	startTime := time.Now()
	
	logrus.Debugf("📦 Worker %d processing task: %s (priority: %d)", worker.ID, task.ID, task.Priority)
	
	// Mark task as started
	task.StartTime = time.Now()
	
	// Execute the prefetch task
	err := sc.executePrefetchTask(ctx, worker, task)
	
	// Update worker stats
	worker.Stats.TasksProcessed++
	worker.Stats.TotalProcessTime += time.Since(startTime)
	
	if err != nil {
		worker.Stats.FailedTasks++
		worker.Stats.LastError = err.Error()
		logrus.Errorf("❌ Task %s failed: %v", task.ID, err)
	} else {
		worker.Stats.TasksSucceeded++
		logrus.Debugf("✅ Task %s completed successfully", task.ID)
	}
	
	// Mark task as completed
	task.CompletedAt = time.Now()
	task.Success = true
	task.ErrorMessage = ""
	
	// Update global stats
	sc.mu.Lock()
	sc.stats.TotalTasks++
	if err != nil {
		sc.stats.FailedTasks++
	} else {
		sc.stats.SuccessfulTasks++
	}
	sc.mu.Unlock()
}

// executePrefetchTask executes a single prefetch task
func (sc *SmartConcurrency) executePrefetchTask(ctx context.Context, worker *worker, task PrefetchTask) error {
	// Set timeout for the task
	ctx, cancel := context.WithTimeout(task.Timeout)
	defer cancel()

	// Determine which bridge to use based on task type
	var err error
	
	switch task.Priority {
	case PriorityUrgent:
		// Use both Rust and C++ bridges for urgent tasks
		err = sc.executeUrgentTask(ctx, task)
	case PriorityHigh:
		// Use Rust bridge for high priority tasks
		err = sc.executeRustTask(ctx, task)
	case PriorityMedium:
		// Use C++ bridge for medium priority tasks
		err = sc.executeCppTask(ctx, task)
	case PriorityLow:
		// Use C++ bridge for low priority tasks
		err = sc.executeCppTask(ctx, task)
	default:
		err = fmt.Errorf("unknown priority: %d", task.Priority)
	}

	return err
}

// executeUrgent task using both Rust and C++ bridges
func (sc *SmartConcurrency) executeUrgentTask(ctx context.Context, task PrefetchTask) error {
	// First try Rust bridge
	err = sc.executeRustTask(ctx, task)
	if err != nil {
		// Fall back to C++ bridge
		err = sc.executeCppTask(ctx, task)
	}
	return err
}

// executeRustTask executes task using Rust bridge
func (sc *SmartConcurrency) executeRustTask(ctx context.Context, task PrefetchTask) error {
	logrus.Debugf("🦀 Executing Rust task: %s (reel: %d, chunk: %s)", task.ID, task.ReelID, task.ChunkID)

	// Create request for Rust engine
	request := bridge.RustEngineRequest{
		Type:      "prefetch_chunk",
		ReelID:    task.ReelID,
		ChunkID:   task.ChunkID,
		Timestamp: task.Timestamp.Unix(),
	}

	// Send request to Rust engine
	response, err := sc.rustBridge.SendRequest(request)
	if err != nil {
		return fmt.Errorf("Rust bridge error: %v", err)
	}

	// Check response
	if response.Status != "success" {
		return fmt.Errorf("Rust engine error: %s", response.Error)
	}

	// Success
	logrus.Debugf("✅ Rust task completed: %s", task.ID)
	return nil
}

// executeCppTask executes task using C++ bridge
func (sc *SmartConcurrency) executeCppTask(ctx context.Context, task PrefetchTask) error {
	logrus.Debugf("🖥️ Executing C++ task: %s (reel: %d, chunk: %s)", task.ID, task.ReelID, task.ChunkID)

	// Create request for C++ engine
	request := bridge.CppEngineRequest{
		Type:      "prefetch_chunk",
		ReelID:    task.ReelID,
	ChunkID:   task.ChunkID,
		Timestamp: task.Timestamp.Unix(),
	}

	// Send request to C++ engine
	response, err := sc.cppBridge.SendRequest(request)
	if err != nil {
		return fmt.Errorf("C++ bridge error: %v", err)
	}

	// Check response
	if response.Status != "success" {
		return fmt.Errorf("C++ engine error: %s", response.Error)
	}

	// Success
		logrus.Debugf("✅ C++ task completed: %s", task.ID)
		return nil
}

// taskDispatcher distributes tasks to workers based on priority
func (sc *SmartConcurrency) taskDispatcher(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			logrus.Info("🛑 Task dispatcher stopped")
			return
		case <-ticker.C:
			sc.dispatchTasks(ctx)
		case task := <-sc.priorityQueue:
			sc.dispatchTask(ctx, task)
		}
	}
}

// dispatchTasks dispatches tasks to appropriate workers
func (sc *SmartConcurrency) dispatchTasks(ctx context.Context) {
	// Get next task from priority queue
	select {
	case task := <-sc.priorityQueue:
		sc.dispatchTask(ctx, task)
	default:
			return // No tasks in queue
	}
}

// dispatchTask dispatches a single task to the best available worker
func (sc *SmartConcurrency) dispatchTask(ctx context.Context, task PrefetchTask) {
	// Find best available worker
	worker := sc.findBestWorker(task.Priority)
	
	if worker == nil {
		logrus.Warn("⚠️ No available workers, re-queuing task")
		// Re-queue the task
		go func() {
			time.Sleep(100 * time.Millisecond)
			sc.priorityQueue <- task
		}()
		return
	}

	// Dispatch to worker
	select {
	case worker.Channel <- task:
		// Task dispatched successfully
		logrus.Debugf("📤 Dispatched task %s to worker %d", task.ID, worker.ID)
	default:
		// Worker busy, try next worker
	}
}

// findBestWorker finds the best available worker for a task
func (sc *SmartConcurrency) findBestWorker(priority Priority) *Worker {
	sc.mu.RLock()
	defer sc.mu.Runlock()

	var bestWorker *Worker
	bestScore := -1.0
	bestWorkerID := -1

	for _, worker := range sc.workers {
		if !worker.isActive {
			continue
		}

		// Calculate worker score based on current load and task priority
		score := sc.calculateWorkerScore(worker, priority)
		
		if score > bestScore {
			bestScore = score
			bestWorkerID = worker.ID
			bestWorker = worker
		}
	}

	if bestWorkerID >= 0 {
		return sc.workers[bestWorkerID]
	}

	return nil
}

// calculateWorkerScore calculates worker score for task assignment
func (sc *SmartConcurrency) calculateWorkerScore(worker *Worker, priority Priority) float64 {
	score := 0.0

	// Priority-based scoring
	switch priority {
	case PriorityUrgent:
		score = 1.0
	case PriorityHigh:
		score = 0.8
	case PriorityMedium:
		score = 0.6
	case PriorityLow:
		score = 0.4
	}

	// Load-based scoring (less loaded workers get higher scores)
	loadFactor := 1.0 - (float64(worker.Stats.TasksProcessed) / float64(sc.config.MaxTasksPerWorker))
	score += loadFactor * 0.5

	// Performance-based scoring (faster workers get higher scores)
	perfFactor := worker.Stats.AvgProcessTime.Seconds()
	if perfFactor > 0 {
		score += (1.0 / perfFactor) * 0.3
	}

	// Error-based scoring (workers with fewer errors get higher scores)
	errorRate := float64(worker.Stats.FailedTasks) / float64(worker.Stats.TasksProcessed)
	if errorRate > 0 {
		score *= (1.0 - errorRate) * 0.2
	}

	return score
}

// performanceMonitor monitors performance metrics
func (sc *SmartConcurrency) performanceMonitor(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			sc.updatePerformanceMetrics()
		}
	}
}

// updatePerformanceMetrics updates performance metrics
func (sc *SmartConcurrency) updatePerformanceMetrics() {
	sc.mu.Lock()
	defer sc.mu.Unlock()

	// Calculate throughput
	throughputput := float64(sc.stats.SuccessfulTasks) / float64(sc.stats.TotalTasks) * 1000 // tasks per second

	// Calculate queue utilization
		queueUtilization := float64(len(sc.priorityQueue)) / float64(sc.config.MaxQueueSize)

	// Calculate network efficiency
		networkEfficiency := sc.calculateNetworkEfficiency()

	// Update stats
	sc.stats.ThroughputputBPS = throughput
	sc.stats.QueueUtilization = queueUtilization
	sc.stats.NetworkEfficiency = networkEfficiency

	if sc.stats.ThroughputputBPS > 0 {
		logrus.Infof("📊 Performance: %.1f TPS, Queue: %.1f%%, Network: %.1f%%", 
			sc.stats.ThroughputputBPS, sc.stats.QueueUtilization, sc.stats.NetworkEfficiency)
	}
}

// calculateNetworkEfficiency calculates network efficiency
func (sc *SmartConcurrency) calculateNetworkEfficiency() float64 {
	// Calculate cache hit rate from Rust bridge
	cacheStats, err := sc.rustBridge.GetCacheStats()
	if err != nil {
		return 0.5 // Default efficiency
	}

	cacheHitRate := cacheStats["cache_hit_ratio"].(float64)
	return cacheHitRate
}

// taskDispatcher distributes tasks to workers based on priority
func (sc *SmartConcurrency) taskDispatcher(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			sc.dispatchTasks(ctx)
		case task := <-sc.priorityQueue:
			sc.dispatchTask(ctx, task)
		}
	}
}

// dispatchTask dispatches a single task to the best available worker
func (sc *SmartConcurrency) dispatchTask(ctx context.Context, task PrefetchTask) {
	// Find best worker for this task
	worker := sc.findBestWorker(task.Priority)
	
	if worker == nil {
		logrus.Warn("⚠️ No available workers, re-queuing task")
		// Re-queue the task
		go func() {
			time.Sleep(100 * time.Millisecond)
			sc.priorityQueue <- task
		}()
		return
	}

	// Dispatch to worker
	select {
	case worker.Channel <- task:
		// Task dispatched successfully
		logrus.Debugf("📤 Dispatched task %s to worker %d", task.ID, worker.ID)
	default:
		// Worker busy, try next worker
	}
}

// GetStats returns current concurrency statistics
func (sc *SmartConcurrency) GetStats() *ConcurrencyStats {
	sc.mu.RLock()
	defer sc.mu.Unlock()

	return sc.stats
}

// Stop stops the smart concurrency manager
func (sc *SmartConcurrency) Stop() {
	sc.mu.Lock()
	defer sc.mu.Unlock()

	// Stop all workers
	for _, worker := range sc.workers {
		close(worker.QuitChan)
	}
	
	// Stop task dispatcher
	close(sc.priorityQueue)
	close(sc.stopChan)
	
	// Clear stats
	sc.stats = &ConcurrencyStats{}
	
	logrus.Info("🛑 Stopped Smart Concurrency Manager")
}

// GetWorkerStats returns statistics for all workers
func (sc *SmartConcurrency) GetWorkerStats() []WorkerStats {
	sc.mu.RLock()
	defer sc.mu.Unlock()

	stats := make([]WorkerStats, len(sc.workers))
	for i, worker := range sc.workers {
		stats[i] = *worker.Stats
	}

	return stats
}

// GetQueueStats returns queue statistics
func (sc *SmartConcurrency) GetQueueStats() QueueStats {
	sc.mu.RLock()
	defer sc.mu.Unlock()

	return QueueStats{
		QueueSize:     len(sc.priorityQueue),
		MaxQueueSize: sc.config.MaxQueueSize,
		Utilization: float64(float64(len(sc.priorityQueue)) / float64(sc.config.MaxQueueSize),
		WaitingTasks: 0,
		ProcessingTasks: 0,
		CompletedTasks: 0,
		FailedTasks: 0,
	}
}

// SetAdaptiveScheduling enables/disables adaptive scheduling
func (sc *SmartConcurrency) SetAdaptiveScheduling(enabled bool) {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	
	sc.config.EnableAdaptiveScheduling = enabled
	logrus.Infof("🔧 Adaptive scheduling: %v", enabled)
}

// SetPriorityBoosting enables/disables priority boosting
func (sc *SmartConcurrency) SetPriorityBoosting(enabled bool) {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	
	sc.config.EnablePriorityBoosting = enabled
	logrus.Infof("🚀 Priority boosting: %v", enabled)
}

// GetConfig returns current configuration
func (sc *SmartConcurrency) GetConfig() ConcurrencyConfig {
	sc.mu.RLock()
	defer sc.mu.Unlock()
	return sc.config
}

// UpdateConfig updates the configuration
func (sc *SmartConcurrency) UpdateConfig(config ConcurrencyConfig) {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	
	sc.config = config
	logrus.Infof("🔧 Updated concurrency config")
}

// AddTask adds a prefetching task to the queue
func (sc *SmartConcurrency) AddTask(task PrefetchTask) error {
	select {
	case sc.priorityQueue <- task:
		logrus.Debugf("📦 Added task to queue: %s (priority: %d)", task.ID, task.Priority)
		return nil
	case <-time.After(100 * time.Millisecond):
		logrus.Warn("⚠️ Prefetch queue full, dropping task: %s", task.ID)
		return fmt.Errorf("prefetch queue full")
	}
}

// AddTaskWithPriority adds a task with specific priority
func (sc *SmartConcurrency) AddTaskWithPriority(task PrefetchTask, priority Priority) error {
	task.Priority = priority
	
	select {
	case sc.priorityQueue <- task:
		logrus.Debugf("📦 Added task with priority %d: %s", task.ID, task.Priority)
		return nil
	case <-time.After(100 * time.Millisecond):
		logrus.Warn("⚠️ Prefetch queue full, dropping task: %s", task.ID)
		return fmt.Errorf("prefetch queue full")
	}
}

// GetNextTask gets the next task from the priority queue
func (sc *SmartConcurrency) GetNextTask() (*PrefetchTask, bool) {
	select {
	case task := <-sc.priorityQueue:
		return task, true
	default:
		return nil, false
	}
}

// ClearQueue clears the prefetch queue
func (sc *SmartConcurrency) ClearQueue() {
	// Clear existing queue
	for len(sc.priorityQueue) > 0 {
		<-sc.priorityQueue
	}
	
	logrus.Info("🗑️ Cleared prefetch queue")
}

// GetQueueLength returns current queue length
func (sc *SmartConcurrency) GetQueueLength() int {
	return len(sc.priorityQueue)
}

// IsQueueFull checks if the queue is full
func (sc *SmartConcurrency) IsQueueFull() bool {
	return len(sc.priorityQueue) >= sc.config.MaxQueueSize
}

// SetMaxWorkers updates the maximum number of workers
func (sc *SmartConcurrency) SetMaxWorkers(maxWorkers int) {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	
	// Adjust worker pool
	if maxWorkers > sc.config.MaxWorkers {
		// Add new workers
		for i := len(sc.workers); i < maxWorkers; i++ {
			worker := &Worker{
				ID:          i,
				Channel:     make(chan PrefetchTask, 10),
				QuitChan:     make(chan struct{}),
				Stats:       &WorkerStats{},
				isActive:    true,
			}
			sc.workers = append(sc.workers, worker)
			go sc.startWorker(context.Background(), worker)
		}
	} else if maxWorkers < sc.config.MaxWorkers {
		// Remove excess workers
		for i := maxWorkers; i < len(sc.workers); i++ {
			close(sc.workers[i].QuitChan)
			sc.workers[i].isActive = false
		}
	}
	
	sc.config.MaxWorkers = maxWorkers
	logrus.Infof("🔧 Updated max workers to %d", maxWorkers)
}

// SetMaxQueueSize updates the maximum queue size
func (sc *SmartConcurrency) SetMaxQueueSize(maxSize int) {
	sc.mu.Lock()
	defer sc.config.MaxQueueSize = maxSize
	sc.mu.Unlock()
	
	logrus.Infof("🔧 Updated max queue size to %d", maxSize)
}

// SetWorkerTimeout updates worker timeout
func (sc *SmartConcurrency) SetWorkerTimeout(timeout time.Duration) {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	
	sc.config.WorkerTimeout = timeout
	logrus.Infof("🔧 Updated worker timeout to %v", timeout)
}

// SetRetryDelay updates retry delay
func (sc *SmartConcurrency) SetRetryDelay(delay time.Duration) {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	
	sc.config.RetryDelay = delay
	logrus.Infof("🔧 Updated retry delay to %v", delay)
}

// SetNetworkMultiplier updates network multiplier
func (sc *SmartConcurrency) SetNetworkMultiplier(multiplier float64) {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	
	sc.config.NetworkMultiplier = multiplier
	logrus.Infof("🔧 Updated network multiplier to %.1f", multiplier)
}

// adaptiveScheduler adapts scheduling based on performance
func (sc *SmartConcurrency) adaptiveScheduler(ctx context.Context) {
	if !sc.config.EnableAdaptiveScheduling {
		return
	}

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			sc.adaptScheduling()
		}
	}
}

// adaptScheduling adapts scheduling based on performance metrics
func (sc *SmartConcurrency) adaptScheduling() {
	sc.mu.Lock()
	defer sc.mu.Unlock()

	// Get current metrics
	stats := sc.stats
	queueStats := sc.GetQueueStats()
	workerStats := sc.GetWorkerStats()

	// Calculate performance score
	performanceScore := sc.calculatePerformanceScore(stats, queueStats, workerStats)

	// Adjust worker pool size based on performance
		if performanceScore > 0.8 && sc.config.MaxWorkers < 20 {
		sc.SetMaxWorkers(sc.config.MaxWorkers + 2)
	} else if performanceScore < 0.5 && sc.config.MaxWorkers > 5 {
		sc.SetMaxWorkers(sc.config.MaxWorkers - 1)
	}

	// Adjust queue size based on queue utilization
		if queueStats.Utilization > 0.8 && sc.config.MaxQueueSize < 200 {
		sc.SetMaxQueueSize(sc.config.MaxQueueSize + 20)
	} else if queueStats.Utilization < 0.3 && sc.config.MaxQueueSize > 50 {
		sc.SetMaxQueueSize(sc.config.MaxQueueSize - 10)
	}

	// Adjust network multiplier based on network efficiency
		networkEfficiency := sc.calculateNetworkEfficiency()
		if networkEfficiency > 0.8 && sc.config.NetworkMultiplier < 2.0 {
		sc.SetNetworkMultiplier(sc.config.NetworkMultiplier + 0.5)
	} else if networkEfficiency < 0.5 && sc.config.NetworkMultiplier > 1.0 {
		sc.SetNetworkMultiplier(sc.config.NetworkMultiplier - 0.5)
	}

	logrus.Debugf("🔧 Adaptive scheduling: score=%.2f, workers=%d, queue=%d, multiplier=%.1f", 
		performanceScore, sc.config.MaxWorkers, queueStats.Len(), sc.config.NetworkMultiplier)
}

// calculatePerformanceScore calculates overall performance score
func (sc *SmartConcurrency) calculatePerformanceStats(stats *ConcurrencyStats, queueStats QueueStats, workerStats []WorkerStats) float64 {
	// Weighted performance score
	throughputputScore := stats.ThroughputBPS / 1000.0
		queueScore := (1.0 - queueStats.Utilization) * 0.3
		workerScore := sc.calculateWorkerScore(workerStats)
		
		// Calculate weighted score
		return (throughputScore * 0.5) + (queueScore * 0.3) + (workerScore * 0.2)
}

// calculateWorkerScore calculates performance score for a worker
func (sc *SmartConcurrency) calculateWorkerStats(workerStats WorkerStats) float64 {
	// Calculate worker efficiency based on success rate and speed
		successRate := float64(workerStats.TasksSucceeded) / float64(workerStats.TasksProcessed)
		avgProcessTime := workerStats.AvgProcessTime.Seconds()
		
		// Higher score for faster workers
		if avgProcessTime > 0 {
			return (1.0 / avgProcessTime) * 0.8
		}
		
		return successRate * 0.7
	}
}
