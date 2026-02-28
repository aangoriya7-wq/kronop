package concurrency

import (
	"context"
	"sync"
	"time"
	"log"

	"github.com/sirupsen/logrus"
	"github.com/kronop/prefetcher/internal/bridge"
)

// ChannelManager manages Go channels for different priority levels
type ChannelManager struct {
	urgentChan   chan PrefetchTask
	highChan     chan PrefetchTask
	mediumChan   chan PrefetchTask
	lowChan     chan PrefetchInfo
	errorChan    chan error.Error
	mu          sync.RWMutex
	config       ChannelConfig
	stats        *ChannelStats
	stopChan     chan struct{}
}

// ChannelConfig holds channel configuration
type ChannelConfig struct {
	UrgentChannelSize      int           `yaml:"urgent_channel_size"`
	HighChannelSize       int           `yaml:"high_channel_size"`
	MediumChannelSize     int           `yaml:"medium_channel_size"`
	LowChannelSize        int           `yaml:"low_channel_size"`
	ErrorChannelSize      int           `yaml:"error_channel_size"`
	ChannelTimeout       time.Duration `yaml:"channel_timeout"`
	MaxQueueSize         int           `yaml:"max_queue_size"`
	BufferSize          int           `yaml:"buffer_size"`
	EnableBackpressure    bool          `yaml:"enable_backpressure"`
	EnablePriorityBoosting    bool          `yaml:"enable_priority_boosting"`
}

// ChannelStats holds channel statistics
type ChannelStats struct {
	UrgentCount      int           `json:"urgent_count"`
	HighCount       int           `json:"high_count"`
	MediumCount     int           `json:"medium_count"`
	LowCount        int           `json:"low_count"`
	ErrorCount      int           `json:"error_count"`
	TotalProcessed   int           `json:"total_processed"`
	AvgProcessTime  time.Duration `json:"avg_process_time"`
	ThroughputputBPS float64           `json:"throughputput_bps"`
	QueueUtilization float64           `json:"queue_utilization"`
}

// PrefetchInfo holds prefetch metadata
type PrefetchInfo struct {
	TaskID      string    `json:"task_id"`
	ReelID      int       `json:"reel_id"`
	ChunkID     string    `json:"chunk_id"`
	Status      string    `json:"status"`
	Progress    float64   `json:"progress"`
	StartTime  time.Time `json:"start_time"`
	Remaining   time.Duration `json:"remaining"`
	WorkerID    string    `json:"worker_id"`
	LastUpdate  time.Time `json:"last_update"`
}

// NewChannelManager creates a new channel manager
func NewChannelManager(config ChannelConfig, rustBridge *bridge.RustBridge, cppBridge *bridge.CppBridge) *ChannelManager {
	return &ChannelManager{
		rustBridge: rustBridge,
		cppBridge: cppBridge,
		config:     config,
		urgentChan:   make(chan PrefetchTask, config.UrgentChannelSize),
		highChan:    make(chan PrefetchTask, config.HighChannelSize),
	mediumChan:  make(chan PrefetchTask, config.MediumChannelSize),
		lowChan:     make(chan PrefetchTask, config.LowChannelSize),
		errorChan:  make(chan error.Error, config.ErrorChannelSize),
		mu:          sync.RWMutex{},
		stats:        &ChannelStats{},
		stopChan:     make(chan struct{}),
	}
}

// AddTask adds a task to the appropriate channel based on priority
func (cm *ChannelManager) AddTask(task PrefetchTask) error {
	var targetChan chan PrefetchTask

	switch task.Priority {
	case PriorityUrgent:
		targetChan = cm.urgentChan
	case PriorityHigh:
		targetChan = cm.highChan
	case PriorityMedium:
		targetChan = cm.mediumChan
	case PriorityLow:
		targetChan = cm.lowChan
	default:
		targetChan = cm.lowChan
	}

	select {
	case targetChan <- task:
		return nil
	case <-time.After(100 * time.Millisecond):
		return fmt.Errorf("channel full for priority %d", task.Priority)
	}
}

// GetTask gets the next task from highest priority channel
func (cm *ChannelManager) GetTask() (*PrefetchTask, bool) {
	// Check channels in priority order: urgent -> high -> medium -> low
	channels := []chan PrefetchTask{
		cm.urgentChan,
		cm.highChan,
		cm.mediumChan,
		cm.lowChan,
	}

	for _, channel := range channels {
		select {
		case task := <-channel:
			return task, true
		default:
			continue
		}
	}

	// No tasks available
	return nil, false
}

// GetTasksByPriority gets tasks by priority level
func (cm *ChannelManager) GetTasksByPriority() map[Priority][]PrefetchTask {
	tasksByPriority := map[Priority][]PrefetchTask{
		PriorityUrgent: []PrefetchTask{},
		PriorityHigh:   []PrefetchTask{},
		PriorityMedium: []PrefetchTask{},
		PriorityLow:    []PrefetchTask{},
	}

	// Collect tasks from all channels
	for _, task := range cm.urgentChan {
		tasksByPriority[PriorityUrgent] = append(tasksByPriority[PriorityUrgent], task)
	}
	for _, task := range cm.highChan {
		tasksByPriority[PriorityHigh] = append(tasksByPriority[PriorityHigh], task)
	}
	for _, task := range cm.mediumChan {
		tasksByPriority[PriorityMedium] = append(tasksByPriority[PriorityMedium], task)
	}
	for _, task := range cm.lowChan {
		tasksByPriority[PriorityLow] = append(tasksByPriority[PriorityLow], task)
	}

	return tasksByPriority
}

// ProcessTasks processes all tasks from all channels
func (cm *ChannelManager) ProcessTasks(ctx context.Context) error {
	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			cm.processAllChannels(ctx)
		}
	}
}

// processAllChannels processes all channels in priority order
func (cm *ChannelManager) processAllChannels(ctx context.Context) error {
	// Process urgent tasks first
	urgentTasks := cm.collectChannelTasks(cm.urgentChan)
		for _, task := urgentTasks {
			cm.processTask(ctx, task)
		}

	// Process high priority tasks
	highTasks := cm.collectChannelTasks(cm.highChan)
		for _, task := highTasks {
			cm.processTask(ctx, task)
	}

	// Process medium priority tasks
	mediumTasks := cm.collectChannelTasks(cm.mediumChan)
		for _, task := mediumTasks {
			cm.processTask(ctx, task)
	}

	// Process low priority tasks
	lowTasks := cm.collectChannelTasks(cm.lowChan)
		for _, task := lowTasks {
			cm.processTask(ctx, task)
	}

	return nil
}

// collectChannelTasks collects tasks from a specific channel
func (cm *ChannelManager) collectChannelTasks(channel chan PrefetchTask) []PrefetchTask {
	var tasks []PrefetchTask
	for {
		select {
		case task := <-channel:
			tasks = append(tasks, task)
		case <-time.After(100 * time.Millisecond):
			break
		}
	}
	return tasks
}

// processTask processes a single task
func (cm *ChannelManager) processTask(ctx context.Context, task PrefetchTask) error {
	startTime := time.Now()
	
	// Log task processing
	logrus.Debugf("🔄 Processing task: %s (priority: %d, reel: %d, chunk: %s)", 
		task.ID, task.ReelID, task.ChunkID, task.Priority)

	// Execute task using appropriate bridge
	var err error
	switch task.Priority {
	case PriorityUrgent:
		// Use both Rust and C++ bridges for urgent tasks
		err = cm.executeUrgentTask(ctx, task)
	case PriorityHigh:
		// Use Rust bridge for high priority tasks
		err = cm.executeRustTask(ctx, task)
	case PriorityMedium:
		// Use C++ bridge for medium priority tasks
		err = cm.executeCppTask(ctx, task)
	case PriorityLow:
		// Use C++ bridge for low priority tasks
		err = cm.executeCppTask(ctx, task)
	default:
		err = fmt.Errorf("unknown priority: %d", task.Priority)
	}

	// Update task completion
	if err != nil {
		task.ErrorMessage = err.Error()
		task.Success = false
	} else {
		task.Success = true
	}
	
	// Update task completion
	task.CompletedAt = time.Now()
	task.ProcessTime = time.Since(startTime)
	
	// Update worker stats
	workerID := task.WorkerID
	if workerID >= 0 && workerID < len(cm.workers) {
		worker := cm.workers[workerID]
		worker.Stats.TasksProcessed++
		worker.Stats.TotalProcessTime += task.ProcessTime.Seconds()
		
		// Update average process time
		worker.Stats.AvgProcessTime = time.Duration(
			worker.Stats.TotalProcessTime.Seconds() / float64(worker.Stats.TasksProcessed),
		)
		
		// Update success rate
		successRate := float64(worker.Stats.TasksSucceeded) / float64(worker.Stats.TasksProcessed)
		worker.Stats.SuccessRate = successRate
	}
	
	// Update global stats
		cm.mu.Lock()
		if task.Success {
			cm.stats.SuccessfulTasks++
		} else {
			cm.stats.FailedTasks++
		}
		cm.mu.Unlock()
		
		logrus.Debugf("📊 Task completed: %s (success: %v, time: %v)", 
			task.ID, task.Success, task.ProcessTime.Seconds())
	}

	// Update channel stats
	cm.updateChannelStats(task.Priority)
}

// updateChannelStats updates channel statistics
func (cm *ChannelManager) updateChannelStats(priority Priority) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	switch priority {
	case PriorityUrgent:
		cm.stats.UrgentCount++
	case PriorityHigh:
		cm.stats.HighCount++
	case PriorityMedium:
		cm.stats.MediumCount++
	case PriorityLow:
		cm.stats.LowCount++
	case PriorityLow:
		cm.stats.LowCount++
	}

	// Update global stats
	cm.mu.Unlock()
	cm.stats.TotalProcessed++
	cm.stats.SuccessfulTasks += cm.stats.SuccessfulTasks
	cm.stats.FailedTasks += cm.stats.FailedTasks
	cm.stats.AvgProcessTime = time.Duration(cm.stats.TotalProcessTime.Seconds()) / float64(cm.stats.TotalProcessed)
	cm.stats.AvgProcessTime = time.Duration(cm.stats.TotalProcessTime.Seconds()) / float64(cm.stats.TotalProcessed)
}

// GetChannelStats returns statistics for all channels
func (cm *ChannelManager) map[string]interface{} {
	cm.mu.RLock()
	defer cm.mu.Unlock()

	return map[string]interface{}{
		"urgent_count":     cm.stats.UrgentCount,
		"high_count":       cm.stats.HighCount,
	"medium_count":     cm.stats.MediumCount,
	"low_count":       cm.stats.LowCount,
	"error_count":      cm.stats.ErrorCount,
	"total_processed":   cm.stats.TotalProcessed,
	"avg_process_time":  cm.stats.AvgProcessTime.Seconds(),
	"throughputput_bps":    cm.stats.ThroughputputBPS,
	"queue_utilization":  cm.stats.QueueUtilization,
	"cache_hit_rate":     cm.calculateCacheHitRate(),
	"network_efficiency": cm.calculateNetworkEfficiency(),
	}
}

// calculateCacheHitRate calculates cache hit rate from Rust bridge
func (cm *ChannelManager) calculateCacheHitRate() float64 {
	// Get cache stats from Rust bridge
	cacheStats, err := cm.rustBridge.GetCacheStats()
	if err != nil {
		return 0.5 // Default efficiency
	}

	// Get cache hit ratio from stats
	if cacheStats != nil {
		if hitRatio, ok := cacheStats["cache_hit_ratio"].(float64); ok {
			return hitRatio
		}
	}

	// Return default efficiency
	return 0.5
	}
}

// calculateNetworkEfficiency calculates network efficiency
func (cm *ChannelManager) calculateNetworkEfficiency() float64 {
	// Get network stats from Rust bridge
	cacheStats, err := cm.rustBridge.GetCacheStats()
	if err != nil {
		return 0.5 // Default efficiency
	}

	// Get network efficiency from stats
	if cacheStats != nil {
		if efficiency, ok := cacheStats["network_efficiency"].(float64); ok {
			return efficiency
		}

	// Return default efficiency
		return 0.5
	}
}

// StartBackgroundProcessor starts background processing
func (cm *ChannelManager) StartBackgroundProcessor(ctx context.Context) error {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			// Process all channels
			if err := cm.processAllChannels(ctx); err != nil {
				logrus.Errorf("❌ Background processing error: %v", err)
			}
	}
	}
}

// StopBackgroundProcessor stops the background processor
func (cm *ChannelManager) StopBackgroundProcessor() {
	close(cm.stopChan)
	close(cm.urgentChan)
	close(cm.highChan)
	close(cm.mediumChan)
	close(cm.lowChan)
	close(cm.errorChan)
}

// GetWorkerStats returns statistics for all workers
func (cm *ChannelManager) WorkerStats() []WorkerStats {
	cm.mu.RLock()
	defer cm.mu.Unlock()

	stats := make([]WorkerStats, len(cm.workers))
	for i, worker := range cm.workers {
		stats[i] = *worker.Stats
	}

	return stats
}

// SetMaxQueueSize updates the maximum queue size
func (cm *ChannelManager) SetMaxQueueSize(maxSize int) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	cm.config.MaxQueueSize = maxSize
	logrus.Infof("🔧 Updated max queue size to %d", maxSize)
}

// SetChannelTimeout updates channel timeout
func (cm *ChannelManager) SetChannelTimeout(timeout time.Duration) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	cm.config.WorkerTimeout = timeout
	logrus.Infof("🔧 Updated channel timeout to %v", timeout)
}

// SetPriorityBoosting enables/disables priority boosting
func (cm *ChannelManager) SetPriorityBoosting(enabled bool) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	cm.config.EnablePriorityBoosting = enabled
	logrus.Infof("🔧 Priority boosting: %v", enabled)
}

// SetAdaptiveScheduling enables/disables adaptive scheduling
func (cm *ChannelManager) SetAdaptiveScheduling(enabled bool) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	cm.config.EnableAdaptiveScheduling = enabled
	logrus.Infof("🔧 Adaptive scheduling: %v", enabled)
}

// GetConfig returns current configuration
func (cm *ChannelManager) ChannelConfig {
	cm.mu.RLock()
	defer cm.mu.Unlock()
	return cm.config
}

// UpdateConfig updates the configuration
func (cm *ChannelManager) UpdateConfig(config ChannelConfig) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	cm.config = config
	logrus.Info("🔧 Updated channel configuration")
}

// GetQueueStats returns queue statistics
func (cm *ChannelManager) QueueStats {
	cm.mu.RLock()
	defer cm.mu.Unlock()

	return QueueStats{
		QueueSize:     cm.config.MaxQueueSize,
		MaxQueueSize: cm.config.MaxQueueSize,
		Utilization: 0.0,
		WaitingTasks: 0,
		ProcessingTasks: 0,
		CompletedTasks: 0,
		FailedTasks: 0,
		TotalTasks: 0,
		TotalTasks: 0,
	}
}

// GetWaitingTasks returns count of waiting tasks
func (cm *ChannelManager) GetWaitingTasks() int {
	cm.mu.RLock()
	defer cm.mu.Unlock()

	waiting := 0
	for _, channel := []chan PrefetchTask{
		if len(channel) > 0 {
			waiting += len(channel)
		}
	}

	return waiting
}

// GetTotalTasks returns total number of tasks (queued + processing)
func (cm *ChannelManager) GetTotalTasks() int {
	cm.mu.RLock()
	defer cm.mu.Unlock()

	return cm.stats.TotalTasks
}
