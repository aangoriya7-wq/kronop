/**
 * Terminal Multiplexing - Memory Stitching System
 * 
 * Fetches small byte ranges from multiple terminals
 * Stitches data together in mobile memory instantly
 * Provides ultra-fast data assembly
 * 
 * Features:
 * - Byte range fetching from multiple terminals
 * - Memory stitching in mobile device
 * - Instant data assembly
 * - Zero-copy memory management
 */

package streaming

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"sort"
	"sync"
	"sync/atomic"
	"time"
)

// TerminalMultiplexer manages terminal multiplexing
type TerminalMultiplexer struct {
	config               TerminalMultiplexingConfig
	terminals             []*Terminal
	memoryStitcher        *MemoryStitcher
	byteRangeManager      *ByteRangeManager
	assemblyOptimizer     *AssemblyOptimizer
	metrics              *TerminalMultiplexingMetrics
	mu                   sync.RWMutex
}

// TerminalMultiplexingConfig holds terminal multiplexing configuration
type TerminalMultiplexingConfig struct {
	// Terminal settings
	MaxConcurrentTerminals int           `json:"max_concurrent_terminals"`
	MinTerminalsRequired   int           `json:"min_terminals_required"`
	Timeout                time.Duration `json:"timeout"`
	RetryDelay             time.Duration `json:"retry_delay"`
	MaxRetries             int           `json:"max_retries"`
	
	// Byte range settings
	ChunkSize              int64         `json:"chunk_size"`              // 64KB chunks
	MaxRangeSize           int64         `json:"max_range_size"`          // 1MB max range
	MinRangeSize           int64         `json:"min_range_size"`          // 1KB min range
	RangeOverlap           int64         `json:"range_overlap"`            // 1KB overlap
	RangeAlignment         int64         `json:"range_alignment"`          // 4KB alignment
	
	// Memory stitching settings
	StitchingStrategy      string        `json:"stitching_strategy"`       // "sequential", "parallel", "adaptive"
	MemoryPoolSize         int64         `json:"memory_pool_size"`         // 100MB pool
	MaxConcurrentStitches  int           `json:"max_concurrent_stitches"`
	ZeroCopyEnabled        bool          `json:"zero_copy_enabled"`
	PrefetchEnabled        bool          `json:"prefetch_enabled"`
	
	// Assembly optimization settings
	OptimizationLevel      string        `json:"optimization_level"`       // "fast", "balanced", "optimal"
	AssemblyTimeout        time.Duration `json:"assembly_timeout"`
	MaxAssemblyTime        time.Duration `json:"max_assembly_time"`
	MemoryThreshold        float64       `json:"memory_threshold"`          // 80% memory usage
}

// Terminal represents a data fetching terminal
type Terminal struct {
	TerminalID            string        `json:"terminal_id"`
	Name                  string        `json:"name"`
	Endpoint              string        `json:"endpoint"`
	Region                string        `json:"region"`
	Capacity              int64         `json:"capacity"`                // Mbps
	IsActive              bool          `json:"is_active"`
	HealthStatus          string        `json:"health_status"`           // "healthy", "degraded", "unhealthy"
	ResponseTime          time.Duration `json:"response_time"`
	LastHealthCheck       time.Time     `json:"last_health_check"`
	ActiveConnections     int64         `json:"active_connections"`
	SuccessRate           float64       `json:"success_rate"`
	TotalBytesTransferred int64         `json:"total_bytes_transferred"`
	AverageTransferRate   float64       `json:"average_transfer_rate"`    // MB/s
	mu                    sync.RWMutex
}

// MemoryStitcher stitches data in memory
type MemoryStitcher struct {
	strategy              string
	memoryPool            *MemoryPool
	assemblyBuffer        *AssemblyBuffer
	zeroCopyEnabled       bool
	prefetchEnabled       bool
	maxConcurrentStitches int
	metrics              *MemoryStitcherMetrics
	mu                    sync.RWMutex
}

// MemoryPool manages memory for stitching
type MemoryPool struct {
	poolSize              int64
	allocatedBlocks       map[string]*MemoryBlock
	freeBlocks            chan *MemoryBlock
	blockSize             int64
	maxBlocks             int
	allocatedBytes        int64
	usedBytes             int64
	metrics              *MemoryPoolMetrics
	mu                    sync.RWMutex
}

// MemoryBlock represents a memory block
type MemoryBlock struct {
	BlockID               string        `json:"block_id"`
	Data                  []byte        `json:"data"`
	Size                  int64         `json:"size"`
	Offset                int64         `json:"offset"`
	IsFree                bool          `json:"is_free"`
	AllocatedAt           time.Time     `json:"allocated_at"`
	LastUsedAt            time.Time     `json:"last_used_at"`
	UseCount              int64         `json:"use_count"`
	mu                    sync.RWMutex
}

// AssemblyBuffer manages data assembly
type AssemblyBuffer struct {
	buffer                map[int64][]byte     // offset -> data
	totalSize             int64
	assemblySize          int64
	completedRanges       []Range
	pendingRanges         []Range
	assemblyStrategy      string
	assemblyTimeout       time.Duration
	maxAssemblyTime       time.Duration
	metrics              *AssemblyBufferMetrics
	mu                    sync.RWMutex
}

// Range represents a byte range
type Range struct {
	Start                 int64         `json:"start"`
	End                   int64         `json:"end"`
	Size                  int64         `json:"size"`
	TerminalID            string        `json:"terminal_id"`
	Status                string        `json:"status"`                // "pending", "fetching", "completed", "failed"
	FetchedAt             time.Time     `json:"fetched_at"`
	TransferRate          float64       `json:"transfer_rate"`
	RetryCount            int           `json:"retry_count"`
}

// ByteRangeManager manages byte ranges
type ByteRangeManager struct {
	chunkSize             int64
	maxRangeSize          int64
	minRangeSize          int64
	rangeOverlap          int64
	rangeAlignment        int64
	totalSize             int64
	completedRanges       map[int64]*Range
	pendingRanges         []Range
	activeRanges          map[int64]*Range
	metrics              *ByteRangeManagerMetrics
	mu                    sync.RWMutex
}

// AssemblyOptimizer optimizes data assembly
type AssemblyOptimizer struct {
	optimizationLevel     string
	assemblyTimeout       time.Duration
	maxAssemblyTime       time.Duration
	memoryThreshold       float64
	optimizationStrategies map[string]OptimizationStrategy
	metrics              *AssemblyOptimizerMetrics
	mu                    sync.RWMutex
}

// OptimizationStrategy represents an optimization strategy
type OptimizationStrategy struct {
	Name                  string        `json:"name"`
	Description           string        `json:"description"`
	MaxConcurrentRanges  int           `json:"max_concurrent_ranges"`
	RangeSize            int64         `json:"range_size"`
	AssemblyOrder         string        `json:"assembly_order"`         // "sequential", "random", "adaptive"
	PrefetchEnabled       bool          `json:"prefetch_enabled"`
	MemoryOptimization    bool          `json:"memory_optimization"`
}

// TerminalMultiplexingMetrics tracks terminal multiplexing performance
type TerminalMultiplexingMetrics struct {
	TotalRequests         int64         `json:"total_requests"`
	SuccessfulRequests    int64         `json:"successful_requests"`
	FailedRequests        int64         `json:"failed_requests"`
	AverageResponseTime   time.Duration `json:"average_response_time"`
	TotalBytesStitched    int64         `json:"total_bytes_stitched"`
	TerminalsUtilized     int64         `json:"terminals_utilized"`
	StitchingTime         time.Duration `json:"stitching_time"`
	AssemblyTime          time.Duration `json:"assembly_time"`
	MemoryEfficiency      float64       `json:"memory_efficiency"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// MemoryStitcherMetrics tracks memory stitching performance
type MemoryStitcherMetrics struct {
	TotalStitches         int64         `json:"total_stitches"`
	SuccessfulStitches    int64        `json:"successful_stitches"`
	FailedStitches        int64         `json:"failed_stitches"`
	AverageStitchTime     time.Duration `json:"average_stitch_time"`
	MemoryUtilization     float64       `json:"memory_utilization"`
	ZeroCopyEfficiency    float64       `json:"zero_copy_efficiency"`
	PrefetchHitRate       float64       `json:"prefetch_hit_rate"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// MemoryPoolMetrics tracks memory pool performance
type MemoryPoolMetrics struct {
	TotalAllocations      int64         `json:"total_allocations"`
	TotalDeallocations    int64         `json:"total_deallocations"`
	PoolUtilization      float64       `json:"pool_utilization"`
	AverageBlockSize      int64         `json:"average_block_size"`
	MemoryFragmentation   float64       `json:"memory_fragmentation"`
	AllocationTime        time.Duration `json:"allocation_time"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// AssemblyBufferMetrics tracks assembly buffer performance
type AssemblyBufferMetrics struct {
	TotalAssemblies       int64         `json:"total_assemblies"`
	SuccessfulAssemblies  int64        `json:"successful_assemblies"`
	FailedAssemblies      int64         `json:"failed_assemblies"`
	AverageAssemblyTime   time.Duration `json:"average_assembly_time"`
	BufferUtilization     float64       `json:"buffer_utilization"`
	RangeCompletionRate    float64       `json:"range_completion_rate"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// ByteRangeManagerMetrics tracks byte range management performance
type ByteRangeManagerMetrics struct {
	TotalRanges           int64         `json:"total_ranges"`
	CompletedRanges       int64         `json:"completed_ranges"`
	FailedRanges          int64         `json:"failed_ranges"`
	AverageRangeSize      int64         `json:"average_range_size"`
	RangeCompletionRate   float64       `json:"range_completion_rate"`
	OverlapUtilization    float64       `json:"overlap_utilization"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// AssemblyOptimizerMetrics tracks assembly optimization performance
type AssemblyOptimizerMetrics struct {
	TotalOptimizations    int64         `json:"total_optimizations"`
	SuccessfulOptimizations int64        `json:"successful_optimizations"`
	OptimizationAccuracy  float64       `json:"optimization_accuracy"`
	AssemblyImprovement   float64       `json:"assembly_improvement"`
	MemorySavings         float64       `json:"memory_savings"`
	LastUpdated           time.Time     `json:"last_updated"`
	CreatedAt             time.Time     `json:"created_at"`
	
	mu                    sync.RWMutex
}

// StitchedData represents stitched data
type StitchedData struct {
	Data                  []byte        `json:"data"`
	Size                  int64         `json:"size"`
	SourceRanges          []Range       `json:"source_ranges"`
	TerminalsUsed         []string      `json:"terminals_used"`
	StitchingTime         time.Duration `json:"stitching_time"`
	AssemblyTime          time.Duration `json:"assembly_time"`
	MemoryEfficiency      float64       `json:"memory_efficiency"`
	ZeroCopyUsed          bool          `json:"zero_copy_used"`
	PrefetchHits          int64         `json:"prefetch_hits"`
	StitchedAt            time.Time     `json:"stitched_at"`
}

// RangeRequest represents a byte range request
type RangeRequest struct {
	VideoURL              string        `json:"video_url"`
	Start                 int64         `json:"start"`
	End                   int64         `json:"end"`
	PreferredTerminals    []string      `json:"preferred_terminals"`
	MaxConcurrentRanges   int           `json:"max_concurrent_ranges"`
	Timeout               time.Duration `json:"timeout"`
	EnableZeroCopy        bool          `json:"enable_zero_copy"`
	EnablePrefetch        bool          `json:"enable_prefetch"`
}

// NewTerminalMultiplexer creates a new terminal multiplexer
func NewTerminalMultiplexer(config TerminalMultiplexingConfig) *TerminalMultiplexer {
	tm := &TerminalMultiplexer{
		config:            config,
		terminals:         make([]*Terminal, 0),
		memoryStitcher:    NewMemoryStitcher(config.StitchingStrategy, config.MemoryPoolSize, config.MaxConcurrentStitches, config.ZeroCopyEnabled, config.PrefetchEnabled),
		byteRangeManager:  NewByteRangeManager(config.ChunkSize, config.MaxRangeSize, config.MinRangeSize, config.RangeOverlap, config.RangeAlignment),
		assemblyOptimizer: NewAssemblyOptimizer(config.OptimizationLevel, config.AssemblyTimeout, config.MaxAssemblyTime, config.MemoryThreshold),
		metrics:           NewTerminalMultiplexingMetrics(),
	}

	// Initialize terminals
	tm.initializeTerminals()

	// Start background processes
	go tm.updateMetrics()

	return tm
}

// initializeTerminals initializes data fetching terminals
func (tm *TerminalMultiplexer) initializeTerminals() {
	// Create terminals (example configuration)
	terminals := []*Terminal{
		{
			TerminalID: "terminal-1",
			Name:       "High-Speed Terminal 1",
			Endpoint:   "https://api.example.com/terminal1",
			Region:     "us-east-1",
			Capacity:   1000, // 1Gbps
			IsActive:   true,
		},
		{
			TerminalID: "terminal-2",
			Name:       "High-Speed Terminal 2",
			Endpoint:   "https://api.example.com/terminal2",
			Region:     "us-west-1",
			Capacity:   1000, // 1Gbps
			IsActive:   true,
		},
		{
			TerminalID: "terminal-3",
			Name:       "High-Speed Terminal 3",
			Endpoint:   "https://api.example.com/terminal3",
			Region:     "eu-west-1",
			Capacity:   1000, // 1Gbps
			IsActive:   true,
		},
		{
			TerminalID: "terminal-4",
			Name:       "High-Speed Terminal 4",
			Endpoint:   "https://api.example.com/terminal4",
			Region:     "ap-south-1",
			Capacity:   1000, // 1Gbps
			IsActive:   true,
		},
		{
			TerminalID: "terminal-5",
			Name:       "High-Speed Terminal 5",
			Endpoint:   "https://api.example.com/terminal5",
			Region:     "ap-southeast-1",
			Capacity:   1000, // 1Gbps
			IsActive:   true,
		},
	}

	tm.terminals = terminals

	log.Printf("📱 Initialized %d terminals for multiplexing", len(terminals))
}

// StitchData stitches data from multiple terminals
func (tm *TerminalMultiplexer) StitchData(ctx context.Context, req *RangeRequest) (*StitchedData, error) {
	startTime := time.Now()

	log.Printf("📱 Starting terminal multiplexing for range %d-%d", req.Start, req.End)

	// Calculate optimal ranges
	ranges := tm.byteRangeManager.CalculateRanges(req.Start, req.End)
	log.Printf("🎯 Calculated %d byte ranges", len(ranges))

	// Select optimal terminals
	selectedTerminals := tm.selectOptimalTerminals(req.PreferredTerminals)
	if len(selectedTerminals) < tm.config.MinTerminalsRequired {
		return nil, fmt.Errorf("insufficient terminals: got %d, required %d", len(selectedTerminals), tm.config.MinTerminalsRequired)
	}

	log.Printf("🎯 Selected %d terminals: %v", len(selectedTerminals), tm.getTerminalIDs(selectedTerminals))

	// Fetch ranges from terminals
	rangeDataChan := make(chan *RangeData, len(ranges))
	var wg sync.WaitGroup

	for _, range := range ranges {
		wg.Add(1)
		go func(r Range) {
			defer wg.Done()
			rangeData := tm.fetchRangeFromTerminal(ctx, r, selectedTerminals, req)
			rangeDataChan <- rangeData
		}(range)
	}

	// Wait for all range fetches to complete
	go func() {
		wg.Wait()
		close(rangeDataChan)
	}()

	// Collect range data
	var rangeDataList []*RangeData
	for rangeData := range rangeDataChan {
		rangeDataList = append(rangeDataList, rangeData)
	}

	// Stitch data in memory
	stitchedData, err := tm.memoryStitcher.StitchData(rangeDataList, req)
	if err != nil {
		return nil, fmt.Errorf("memory stitching failed: %w", err)
	}

	// Optimize assembly
	if tm.assemblyOptimizer != nil {
		optimizedData, err := tm.assemblyOptimizer.OptimizeAssembly(stitchedData, req)
		if err != nil {
			log.Printf("⚠️ Assembly optimization failed: %v", err)
		} else {
			stitchedData = optimizedData
		}
	}

	processingTime := time.Since(startTime)
	stitchedData.StitchingTime = processingTime
	stitchedData.StitchedAt = time.Now()

	// Update metrics
	tm.updateTerminalMultiplexingMetrics(len(selectedTerminals), processingTime, stitchedData.Size, true)

	log.Printf("🔥 Terminal multiplexing completed: %v, %d bytes, %d ranges, %.2f MB/s", 
		processingTime, stitchedData.Size, len(rangeDataList), float64(stitchedData.Size)/processingTime.Seconds()/(1024*1024))

	return stitchedData, nil
}

// RangeData represents data from a range
type RangeData struct {
	Range                 Range         `json:"range"`
	Data                  []byte        `json:"data"`
	TerminalID            string        `json:"terminal_id"`
	FetchTime             time.Duration `json:"fetch_time"`
	TransferRate          float64       `json:"transfer_rate"`
	Success               bool          `json:"success"`
	ErrorMessage         string        `json:"error_message"`
	Retries               int           `json:"retries"`
	ReceivedAt            time.Time     `json:"received_at"`
}

// selectOptimalTerminals selects optimal terminals for range fetching
func (tm *TerminalMultiplexer) selectOptimalTerminals(preferredTerminals []string) []*Terminal {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	// Filter active terminals
	var activeTerminals []*Terminal
	for _, terminal := range tm.terminals {
		if terminal.IsActive && terminal.HealthStatus == "healthy" {
			activeTerminals = append(activeTerminals, terminal)
		}
	}

	// If preferred terminals specified, prioritize them
	if len(preferredTerminals) > 0 {
		var preferred []*Terminal
		var others []*Terminal

		for _, terminal := range activeTerminals {
			isPreferred := false
			for _, prefID := range preferredTerminals {
				if terminal.TerminalID == prefID {
					isPreferred = true
					break
				}
			}

			if isPreferred {
				preferred = append(preferred, terminal)
			} else {
				others = append(others, terminal)
			}
		}

		// Combine preferred and others
		selected := append(preferred, others...)
		return selected[:min(tm.config.MaxConcurrentTerminals, len(selected))]
	}

	// Sort by capacity (highest first)
	sort.Slice(activeTerminals, func(i, j int) bool {
		return activeTerminals[i].Capacity > activeTerminals[j].Capacity
	})

	// Return top terminals
	return activeTerminals[:min(tm.config.MaxConcurrentTerminals, len(activeTerminals))]
}

// fetchRangeFromTerminal fetches a range from a terminal
func (tm *TerminalMultiplexer) fetchRangeFromTerminal(ctx context.Context, range Range, terminals []*Terminal, req *RangeRequest) *RangeData {
	startTime := time.Now()

	// Select terminal for this range
	terminal := tm.selectTerminalForRange(range, terminals)
	if terminal == nil {
		return &RangeData{
			Range:        range,
			Success:      false,
			ErrorMessage: "No terminal available",
			ReceivedAt:   time.Now(),
		}
	}

	rangeData := &RangeData{
		Range:        range,
		TerminalID:   terminal.TerminalID,
		Success:      false,
		ReceivedAt:   time.Now(),
	}

	// Create HTTP request with range header
	url := fmt.Sprintf("%s/range", terminal.Endpoint)
	httpReq, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		rangeData.ErrorMessage = fmt.Sprintf("failed to create request: %v", err)
		return rangeData
	}

	// Set range header
	rangeHeader := fmt.Sprintf("bytes=%d-%d", range.Start, range.End)
	httpReq.Header.Set("Range", rangeHeader)
	httpReq.Header.Set("User-Agent", "Kronop-TerminalMultiplexer/1.0")

	// Make request with retries
	var resp *http.Response
	var lastError error

	for attempt := 0; attempt <= tm.config.MaxRetries; attempt++ {
		if attempt > 0 {
			time.Sleep(tm.config.RetryDelay * time.Duration(attempt))
		}

		client := &http.Client{
			Timeout: tm.config.Timeout,
		}

		resp, lastError = client.Do(httpReq)
		if lastError == nil && resp.StatusCode == http.StatusPartialContent {
			break
		}

		rangeData.Retries = attempt + 1
	}

	if lastError != nil {
		rangeData.ErrorMessage = fmt.Sprintf("request failed after %d attempts: %v", rangeData.Retries, lastError)
		return rangeData
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusPartialContent {
		rangeData.ErrorMessage = fmt.Sprintf("HTTP error: %s", resp.Status)
		return rangeData
	}

	// Read range data
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		rangeData.ErrorMessage = fmt.Sprintf("failed to read response: %v", err)
		return rangeData
	}

	// Validate range data
	expectedSize := range.End - range.Start + 1
	if int64(len(data)) != expectedSize {
		rangeData.ErrorMessage = fmt.Sprintf("range size mismatch: expected %d, got %d", expectedSize, len(data))
		return rangeData
	}

	fetchTime := time.Since(startTime)
	rangeData.Data = data
	rangeData.FetchTime = fetchTime
	rangeData.TransferRate = float64(len(data)) / fetchTime.Seconds() / (1024 * 1024) // MB/s
	rangeData.Success = true

	// Update terminal metrics
	terminal.mu.Lock()
	terminal.ActiveConnections++
	terminal.TotalBytesTransferred += int64(len(data))
	terminal.AverageTransferRate = float64(terminal.TotalBytesTransferred) / time.Since(time.Now()).Seconds() / (1024 * 1024)
	terminal.mu.Unlock()

	log.Printf("📦 Terminal %s fetched range %d-%d: %d bytes in %v (%.2f MB/s)", 
		terminal.TerminalID, range.Start, range.End, len(data), fetchTime, rangeData.TransferRate)

	return rangeData
}

// selectTerminalForRange selects terminal for a specific range
func (tm *TerminalMultiplexer) selectTerminalForRange(range Range, terminals []*Terminal) *Terminal {
	if len(terminals) == 0 {
		return nil
	}

	// Simple round-robin selection (in production, use load balancing)
	terminalIndex := int(range.Start) % len(terminals)
	return terminals[terminalIndex]
}

// getTerminalIDs gets terminal IDs from terminal list
func (tm *TerminalMultiplexer) getTerminalIDs(terminals []*Terminal) []string {
	ids := make([]string, len(terminals))
	for i, terminal := range terminals {
		ids[i] = terminal.TerminalID
	}
	return ids
}

// updateTerminalMultiplexingMetrics updates terminal multiplexing metrics
func (tm *TerminalMultiplexer) updateTerminalMultiplexingMetrics(terminalsUsed int, processingTime time.Duration, dataSize int64, success bool) {
	tm.metrics.mu.Lock()
	defer tm.metrics.mu.Unlock()

	tm.metrics.TotalRequests++
	
	if success {
		tm.metrics.SuccessfulRequests++
	} else {
		tm.metrics.FailedRequests++
	}

	// Update average response time
	if tm.metrics.AverageResponseTime == 0 {
		tm.metrics.AverageResponseTime = processingTime
	} else {
		tm.metrics.AverageResponseTime = (tm.metrics.AverageResponseTime + processingTime) / 2
	}

	// Update total bytes stitched
	tm.metrics.TotalBytesStitched += dataSize

	// Update terminals utilized
	tm.metrics.TerminalsUtilized += int64(terminalsUsed)

	tm.metrics.LastUpdated = time.Now()
}

// updateMetrics updates metrics periodically
func (tm *TerminalMultiplexer) updateMetrics() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			tm.calculateMetrics()
		}
	}
}

// calculateMetrics calculates aggregated metrics
func (tm *TerminalMultiplexer) calculateMetrics() {
	// Update metrics from all components
	memoryStitcherMetrics := tm.memoryStitcher.GetMetrics()
	byteRangeMetrics := tm.byteRangeManager.GetMetrics()

	tm.metrics.mu.Lock()
	defer tm.metrics.mu.Unlock()

	// Update stitching time
	tm.metrics.StitchingTime = memoryStitcherMetrics.AverageStitchTime

	// Update memory efficiency
	tm.metrics.MemoryEfficiency = memoryStitcherMetrics.MemoryUtilization

	tm.metrics.LastUpdated = time.Now()
}

// GetMetrics returns terminal multiplexing metrics
func (tm *TerminalMultiplexer) GetMetrics() *TerminalMultiplexingMetrics {
	tm.metrics.mu.RLock()
	defer tm.metrics.mu.RUnlock()
	
	metrics := *tm.metrics
	return &metrics
}

// GetTerminals returns terminal information
func (tm *TerminalMultiplexer) GetTerminals() []*Terminal {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	terminals := make([]*Terminal, len(tm.terminals))
	for i, terminal := range tm.terminals {
		terminal.mu.RLock()
		terminals[i] = &Terminal{
			TerminalID:            terminal.TerminalID,
			Name:                  terminal.Name,
			Endpoint:              terminal.Endpoint,
			Region:                terminal.Region,
			Capacity:              terminal.Capacity,
			IsActive:              terminal.IsActive,
			HealthStatus:          terminal.HealthStatus,
			ResponseTime:          terminal.ResponseTime,
			LastHealthCheck:       terminal.LastHealthCheck,
			ActiveConnections:     terminal.ActiveConnections,
			SuccessRate:           terminal.SuccessRate,
			TotalBytesTransferred: terminal.TotalBytesTransferred,
			AverageTransferRate:   terminal.AverageTransferRate,
		}
		terminal.mu.RUnlock()
	}

	return terminals
}

// Close closes the terminal multiplexer
func (tm *TerminalMultiplexer) Close() error {
	log.Println("🔌 Terminal multiplexer closed")
	return nil
}

// Helper functions

func NewTerminalMultiplexingMetrics() *TerminalMultiplexingMetrics {
	return &TerminalMultiplexingMetrics{
		CreatedAt: time.Now(),
	}
}

func NewMemoryStitcher(strategy string, poolSize int64, maxConcurrentStitches int, zeroCopyEnabled, prefetchEnabled bool) *MemoryStitcher {
	return &MemoryStitcher{
		strategy:              strategy,
		memoryPool:            NewMemoryPool(poolSize),
		assemblyBuffer:        NewAssemblyBuffer(strategy),
		zeroCopyEnabled:       zeroCopyEnabled,
		prefetchEnabled:       prefetchEnabled,
		maxConcurrentStitches: maxConcurrentStitches,
		metrics:              &MemoryStitcherMetrics{CreatedAt: time.Now()},
	}
}

func NewByteRangeManager(chunkSize, maxRangeSize, minRangeSize, rangeOverlap, rangeAlignment int64) *ByteRangeManager {
	return &ByteRangeManager{
		chunkSize:       chunkSize,
		maxRangeSize:    maxRangeSize,
		minRangeSize:    minRangeSize,
		rangeOverlap:    rangeOverlap,
		rangeAlignment:  rangeAlignment,
		completedRanges: make(map[int64]*Range),
		activeRanges:    make(map[int64]*Range),
		metrics:         &ByteRangeManagerMetrics{CreatedAt: time.Now()},
	}
}

func NewAssemblyOptimizer(level string, timeout, maxTime time.Duration, memoryThreshold float64) *AssemblyOptimizer {
	return &AssemblyOptimizer{
		optimizationLevel:  level,
		assemblyTimeout:    timeout,
		maxAssemblyTime:    maxTime,
		memoryThreshold:    memoryThreshold,
		optimizationStrategies: map[string]OptimizationStrategy{
			"fast": {
				Name:                 "Fast",
				Description:          "Fast assembly with minimal optimization",
				MaxConcurrentRanges:  10,
				RangeSize:            64 * 1024, // 64KB
				AssemblyOrder:        "sequential",
				PrefetchEnabled:      false,
				MemoryOptimization:   false,
			},
			"balanced": {
				Name:                 "Balanced",
				Description:          "Balanced performance and memory usage",
				MaxConcurrentRanges:  20,
				RangeSize:            128 * 1024, // 128KB
				AssemblyOrder:        "adaptive",
				PrefetchEnabled:      true,
				MemoryOptimization:   true,
			},
			"optimal": {
				Name:                 "Optimal",
				Description:          "Maximum performance with full optimization",
				MaxConcurrentRanges:  50,
				RangeSize:            256 * 1024, // 256KB
				AssemblyOrder:        "adaptive",
				PrefetchEnabled:      true,
				MemoryOptimization:   true,
			},
		},
		metrics: &AssemblyOptimizerMetrics{CreatedAt: time.Now()},
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
