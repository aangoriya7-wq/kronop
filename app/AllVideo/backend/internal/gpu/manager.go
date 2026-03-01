/**
 * GPU Manager for AI Super-Resolution
 * 
 * Handles GPU acceleration for mobile devices
 * Supports CUDA, Metal, OpenCL, and Vulkan
 * 
 * Features:
 * - Multi-GPU support
 * - Memory management
 * - Workload distribution
 * - Performance monitoring
 * - Adaptive resource allocation
 */

package gpu

import (
	"context"
	"fmt"
	"log"
	"runtime"
	"sync"
	"time"
)

// GPUConfig holds GPU manager configuration
type GPUConfig struct {
	EnableCUDA      bool          `json:"enable_cuda"`
	EnableMetal     bool          `json:"enable_metal"`
	EnableOpenCL    bool          `json:"enable_opencl"`
	EnableVulkan    bool          `json:"enable_vulkan"`
	MemoryLimit     int64         `json:"memory_limit"` // MB
	MaxWorkers      int           `json:"max_workers"`
	Timeout         time.Duration `json:"timeout"`
	PreferIntegratedGPU bool       `json:"prefer_integrated_gpu"`
}

// GPUManager manages GPU resources and workloads
type GPUManager struct {
	config      GPUConfig
	gpus        []*GPUDevice
	allocator   *MemoryAllocator
	scheduler   *WorkScheduler
	monitor     *PerformanceMonitor
	
	mu          sync.RWMutex
	isRunning   bool
	ctx         context.Context
	cancel      context.CancelFunc
}

// GPUDevice represents a GPU device
type GPUDevice struct {
	ID              int           `json:"id"`
	Name            string        `json:"name"`
	Type            GPUType       `json:"type"`
	Vendor          string        `json:"vendor"`
	MemoryTotal     int64         `json:"memory_total_mb"`
	MemoryUsed      int64         `json:"memory_used_mb"`
	MemoryAvailable int64        `json:"memory_available_mb"`
	ComputeUnits    int           `json:"compute_units"`
	ClockSpeed      float64       `json:"clock_speed_ghz"`
	SupportedAPIs   []string      `json:"supported_apis"`
	IsAvailable     bool          `json:"is_available"`
	CurrentLoad     float64       `json:"current_load_percent"`
	Temperature     float64       `json:"temperature_celsius"`
	PowerUsage      float64       `json:"power_usage_watts"`
}

// GPUType represents the type of GPU
type GPUType string

const (
	GPUTypeDiscrete    GPUType = "discrete"
	GPUTypeIntegrated  GPUType = "integrated"
	GPUTypeVirtual     GPUType = "virtual"
	GPUTypeUnknown     GPUType = "unknown"
)

// MemoryAllocator manages GPU memory allocation
type MemoryAllocator struct {
	devices    map[int]*GPUDevice
	allocations map[string]*MemoryAllocation
	mu         sync.RWMutex
	totalAllocated int64
}

// MemoryAllocation represents a GPU memory allocation
type MemoryAllocation struct {
	ID          string    `json:"id"`
	DeviceID    int       `json:"device_id"`
	Size        int64     `json:"size_mb"`
	Type        MemType   `json:"type"`
	Purpose     string    `json:"purpose"`
	AllocatedAt time.Time `json:"allocated_at"`
	LastUsed    time.Time `json:"last_used"`
	RefCount    int       `json:"ref_count"`
}

// MemType represents memory type
type MemType string

const (
	MemTypeInput     MemType = "input"
	MemTypeOutput    MemType = "output"
	MemTypeTemp      MemType = "temp"
	MemTypeModel     MemType = "model"
	MemTypeCache     MemType = "cache"
)

// WorkScheduler manages GPU work scheduling
type WorkScheduler struct {
	devices     []*GPUDevice
	queue       chan *WorkItem
	workers     map[int]*GPUWorker
	loadBalancer *LoadBalancer
	mu          sync.RWMutex
}

// WorkItem represents a GPU work item
type WorkItem struct {
	ID          string        `json:"id"`
	Type        WorkType      `json:"type"`
	Priority    int           `json:"priority"`
	Data        interface{}   `json:"data"`
	Callback    func(interface{}, error)
	Timeout     time.Duration `json:"timeout"`
	CreatedAt   time.Time     `json:"created_at"`
	StartedAt   time.Time     `json:"started_at"`
	DeviceID    int           `json:"device_id"`
}

// WorkType represents the type of GPU work
type WorkType string

const (
	WorkTypeInference WorkType = "inference"
	WorkTypePreprocess WorkType = "preprocess"
	WorkTypePostprocess WorkType = "postprocess"
	WorkTypeMemoryCopy WorkType = "memory_copy"
)

// GPUWorker handles GPU work execution
type GPUWorker struct {
	ID        int
	Device    *GPUDevice
	Queue     chan *WorkItem
	Running   bool
	mu        sync.RWMutex
}

// LoadBalancer distributes work across GPUs
type LoadBalancer struct {
	devices    []*GPUDevice
	strategy   BalanceStrategy
	mu         sync.RWMutex
}

// BalanceStrategy represents load balancing strategy
type BalanceStrategy string

const (
	BalanceRoundRobin BalanceStrategy = "round_robin"
	BalanceLeastLoad   BalanceStrategy = "least_load"
	BalanceMemoryBased BalanceStrategy = "memory_based"
)

// PerformanceMonitor monitors GPU performance
type PerformanceMonitor struct {
	devices    map[int]*GPUDevice
	metrics    map[int]*GPUMetrics
	collectors map[int]*MetricCollector
	mu         sync.RWMutex
	ticker     *time.Ticker
	ctx        context.Context
	cancel     context.CancelFunc
}

// GPUMetrics holds GPU performance metrics
type GPUMetrics struct {
	DeviceID         int     `json:"device_id"`
	Utilization      float64 `json:"utilization_percent"`
	MemoryUtilization float64 `json:"memory_utilization_percent"`
	Temperature      float64 `json:"temperature_celsius"`
	PowerUsage       float64 `json:"power_usage_watts"`
	ClockSpeed       float64 `json:"clock_speed_ghz"`
	Throughput       float64 `json:"throughput_ops_per_sec"`
	ErrorRate        float64 `json:"error_rate_percent"`
	LastUpdate       time.Time `json:"last_update"`
}

// MetricCollector collects metrics from a GPU device
type MetricCollector struct {
	DeviceID int
	Interval time.Duration
	Running  bool
	mu       sync.RWMutex
}

// NewGPUManager creates a new GPU manager
func NewGPUManager(config GPUConfig) (*GPUManager, error) {
	ctx, cancel := context.WithCancel(context.Background())
	
	manager := &GPUManager{
		config:  config,
		gpus:    make([]*GPUDevice, 0),
		ctx:     ctx,
		cancel:  cancel,
	}
	
	// Discover GPU devices
	if err := manager.discoverGPUs(); err != nil {
		return nil, fmt.Errorf("failed to discover GPUs: %w", err)
	}
	
	// Initialize memory allocator
	manager.allocator = &MemoryAllocator{
		devices:     make(map[int]*GPUDevice),
		allocations: make(map[string]*MemoryAllocation),
	}
	
	for _, gpu := range manager.gpus {
		manager.allocator.devices[gpu.ID] = gpu
	}
	
	// Initialize work scheduler
	manager.scheduler = &WorkScheduler{
		devices:     manager.gpus,
		queue:       make(chan *WorkItem, config.MaxWorkers*2),
		workers:     make(map[int]*GPUWorker),
		loadBalancer: &LoadBalancer{
			devices:  manager.gpus,
			strategy: BalanceLeastLoad,
		},
	}
	
	// Initialize performance monitor
	manager.monitor = &PerformanceMonitor{
		devices:    make(map[int]*GPUDevice),
		metrics:    make(map[int]*GPUMetrics),
		collectors: make(map[int]*MetricCollector),
	}
	
	for _, gpu := range manager.gpus {
		manager.monitor.devices[gpu.ID] = gpu
		manager.monitor.metrics[gpu.ID] = &GPUMetrics{DeviceID: gpu.ID}
	}
	
	return manager, nil
}

// discoverGPUs discovers available GPU devices
func (gm *GPUManager) discoverGPUs() error {
	gm.gpus = make([]*GPUDevice, 0)
	
	// Detect CUDA GPUs
	if gm.config.EnableCUDA {
		cudaGPUs := gm.detectCUDAGPUs()
		gm.gpus = append(gm.gpus, cudaGPUs...)
	}
	
	// Detect Metal GPUs (macOS)
	if gm.config.EnableMetal && runtime.GOOS == "darwin" {
		metalGPUs := gm.detectMetalGPUs()
		gm.gpus = append(gm.gpus, metalGPUs...)
	}
	
	// Detect OpenCL GPUs
	if gm.config.EnableOpenCL {
		openclGPUs := gm.detectOpenCLGPUs()
		gm.gpus = append(gm.gpus, openclGPUs...)
	}
	
	// Detect Vulkan GPUs
	if gm.config.EnableVulkan {
		vulkanGPUs := gm.detectVulkanGPUs()
		gm.gpus = append(gm.gpus, vulkanGPUs...)
	}
	
	// If no GPUs found, create a CPU fallback device
	if len(gm.gpus) == 0 {
		log.Println("No GPUs detected, using CPU fallback")
		gm.gpus = append(gm.gpus, gm.createCPUFallback())
	}
	
	log.Printf("Discovered %d GPU devices", len(gm.gpus))
	for _, gpu := range gm.gpus {
		log.Printf("GPU %d: %s (%s) - %s", gpu.ID, gpu.Name, gpu.Type, gpu.Vendor)
	}
	
	return nil
}

// detectCUDAGPUs detects CUDA-capable GPUs
func (gm *GPUManager) detectCUDAGPUs() []*GPUDevice {
	gpus := make([]*GPUDevice, 0)
	
	// Mock CUDA GPU detection
	// In reality, this would use CUDA runtime API
	cudaGPUs := []struct {
		name     string
		memory   int64
		vendor   string
		units    int
		clock    float64
	}{
		{"NVIDIA GeForce RTX 3080", 10240, "NVIDIA", 8704, 1.71},
		{"NVIDIA GeForce RTX 3070", 8192, "NVIDIA", 5888, 1.73},
		{"NVIDIA GeForce RTX 3060", 12288, "NVIDIA", 3584, 1.78},
	}
	
	for i, gpu := range cudaGPUs {
		device := &GPUDevice{
			ID:               i,
			Name:             gpu.name,
			Type:             GPUTypeDiscrete,
			Vendor:           gpu.vendor,
			MemoryTotal:      gpu.memory,
			MemoryUsed:       0,
			MemoryAvailable:  gpu.memory,
			ComputeUnits:     gpu.units,
			ClockSpeed:       gpu.clock,
			SupportedAPIs:    []string{"CUDA", "OpenCL", "Vulkan"},
			IsAvailable:      true,
			CurrentLoad:      0.0,
			Temperature:      45.0,
			PowerUsage:       0.0,
		}
		gpus = append(gpus, device)
	}
	
	return gpus
}

// detectMetalGPUs detects Metal-capable GPUs (macOS)
func (gm *GPUManager) detectMetalGPUs() []*GPUDevice {
	gpus := make([]*GPUDevice, 0)
	
	// Mock Metal GPU detection
	// In reality, this would use Metal API
	metalGPUs := []struct {
		name     string
		memory   int64
		vendor   string
		units    int
		clock    float64
		integrated bool
	}{
		{"Apple M1 Pro GPU", 16384, "Apple", 16, 1.3, true},
		{"Apple M1 Max GPU", 32768, "Apple", 32, 1.3, true},
		{"Apple M2 GPU", 8192, "Apple", 10, 1.5, true},
	}
	
	for i, gpu := range metalGPUs {
		device := &GPUDevice{
			ID:               i,
			Name:             gpu.name,
			Type:             GPUTypeIntegrated,
			Vendor:           gpu.vendor,
			MemoryTotal:      gpu.memory,
			MemoryUsed:       0,
			MemoryAvailable:  gpu.memory,
			ComputeUnits:     gpu.units,
			ClockSpeed:       gpu.clock,
			SupportedAPIs:    []string{"Metal", "OpenCL"},
			IsAvailable:      true,
			CurrentLoad:      0.0,
			Temperature:      40.0,
			PowerUsage:       0.0,
		}
		gpus = append(gpus, device)
	}
	
	return gpus
}

// detectOpenCLGPUs detects OpenCL-capable GPUs
func (gm *GPUManager) detectOpenCLGPUs() []*GPUDevice {
	gpus := make([]*GPUDevice, 0)
	
	// Mock OpenCL GPU detection
	// In reality, this would use OpenCL API
	openclGPUs := []struct {
		name     string
		memory   int64
		vendor   string
		units    int
		clock    float64
	}{
		{"Intel Iris Xe Graphics", 4096, "Intel", 96, 1.35},
		{"AMD Radeon RX 6800", 16384, "AMD", 60, 2.1},
		{"Qualcomm Adreno 660", 2048, "Qualcomm", 64, 0.84},
	}
	
	for i, gpu := range openclGPUs {
		device := &GPUDevice{
			ID:               i,
			Name:             gpu.name,
			Type:             GPUTypeIntegrated,
			Vendor:           gpu.vendor,
			MemoryTotal:      gpu.memory,
			MemoryUsed:       0,
			MemoryAvailable:  gpu.memory,
			ComputeUnits:     gpu.units,
			ClockSpeed:       gpu.clock,
			SupportedAPIs:    []string{"OpenCL", "Vulkan"},
			IsAvailable:      true,
			CurrentLoad:      0.0,
			Temperature:      50.0,
			PowerUsage:       0.0,
		}
		gpus = append(gpus, device)
	}
	
	return gpus
}

// detectVulkanGPUs detects Vulkan-capable GPUs
func (gm *GPUManager) detectVulkanGPUs() []*GPUDevice {
	gpus := make([]*GPUDevice, 0)
	
	// Mock Vulkan GPU detection
	// In reality, this would use Vulkan API
	vulkanGPUs := []struct {
		name     string
		memory   int64
		vendor   string
		units    int
		clock    float64
	}{
		{"Mali-G78 MP20", 8192, "ARM", 20, 0.88},
		{"Adreno 730", 4096, "Qualcomm", 16, 0.95},
		{"PowerVR B-Series", 2048, "Imagination", 8, 1.0},
	}
	
	for i, gpu := range vulkanGPUs {
		device := &GPUDevice{
			ID:               i,
			Name:             gpu.name,
			Type:             GPUTypeIntegrated,
			Vendor:           gpu.vendor,
			MemoryTotal:      gpu.memory,
			MemoryUsed:       0,
			MemoryAvailable:  gpu.memory,
			ComputeUnits:     gpu.units,
			ClockSpeed:       gpu.clock,
			SupportedAPIs:    []string{"Vulkan", "OpenCL"},
			IsAvailable:      true,
			CurrentLoad:      0.0,
			Temperature:      45.0,
			PowerUsage:       0.0,
		}
		gpus = append(gpus, device)
	}
	
	return gpus
}

// createCPUFallback creates a CPU fallback device
func (gm *GPUManager) createCPUFallback() *GPUDevice {
	return &GPUDevice{
		ID:               0,
		Name:             "CPU Fallback",
		Type:             GPUTypeVirtual,
		Vendor:           "CPU",
		MemoryTotal:      runtime.NumCPU() * 1024, // Estimate
		MemoryUsed:       0,
		MemoryAvailable:  runtime.NumCPU() * 1024,
		ComputeUnits:     runtime.NumCPU(),
		ClockSpeed:       2.5, // Estimate
		SupportedAPIs:    []string{"CPU"},
		IsAvailable:      true,
		CurrentLoad:      0.0,
		Temperature:      0.0,
		PowerUsage:       0.0,
	}
}

// Start starts the GPU manager
func (gm *GPUManager) Start() error {
	gm.mu.Lock()
	defer gm.mu.Unlock()
	
	if gm.isRunning {
		return fmt.Errorf("GPU manager is already running")
	}
	
	gm.isRunning = true
	
	// Start work scheduler
	if err := gm.scheduler.Start(gm.ctx); err != nil {
		return fmt.Errorf("failed to start work scheduler: %w", err)
	}
	
	// Start performance monitor
	if err := gm.monitor.Start(gm.ctx); err != nil {
		return fmt.Errorf("failed to start performance monitor: %w", err)
	}
	
	log.Println("GPU Manager started")
	return nil
}

// Stop stops the GPU manager
func (gm *GPUManager) Stop() error {
	gm.mu.Lock()
	defer gm.mu.Unlock()
	
	if !gm.isRunning {
		return nil
	}
	
	gm.cancel()
	gm.isRunning = false
	
	// Stop performance monitor
	if gm.monitor != nil {
		gm.monitor.Stop()
	}
	
	// Stop work scheduler
	if gm.scheduler != nil {
		gm.scheduler.Stop()
	}
	
	// Cleanup memory allocations
	if gm.allocator != nil {
		gm.allocator.Cleanup()
	}
	
	log.Println("GPU Manager stopped")
	return nil
}

// GetDevices returns all available GPU devices
func (gm *GPUManager) GetDevices() []*GPUDevice {
	gm.mu.RLock()
	defer gm.mu.RUnlock()
	
	devices := make([]*GPUDevice, len(gm.gpus))
	copy(devices, gm.gpus)
	return devices
}

// GetBestDevice returns the best GPU device for the given workload
func (gm *GPUManager) GetBestDevice(workload WorkType) *GPUDevice {
	gm.mu.RLock()
	defer gm.mu.RUnlock()
	
	if len(gm.gpus) == 0 {
		return nil
	}
	
	// Find device with lowest load and sufficient memory
	bestDevice := gm.gpus[0]
	bestScore := gm.calculateDeviceScore(bestDevice, workload)
	
	for _, device := range gm.gpus[1:] {
		if !device.IsAvailable {
			continue
		}
		
		score := gm.calculateDeviceScore(device, workload)
		if score > bestScore {
			bestDevice = device
			bestScore = score
		}
	}
	
	return bestDevice
}

// calculateDeviceScore calculates a score for device selection
func (gm *GPUManager) calculateDeviceScore(device *GPUDevice, workload WorkType) float64 {
	score := 0.0
	
	// Memory availability (40% weight)
	memoryScore := float64(device.MemoryAvailable) / float64(device.MemoryTotal)
	score += memoryScore * 0.4
	
	// Load factor (30% weight)
	loadScore := 1.0 - (device.CurrentLoad / 100.0)
	score += loadScore * 0.3
	
	// Performance (20% weight)
	perfScore := (device.ComputeUnits * device.ClockSpeed) / 1000.0
	score += perfScore * 0.2
	
	// Type preference (10% weight)
	typeScore := 0.0
	switch device.Type {
	case GPUTypeDiscrete:
		typeScore = 1.0
	case GPUTypeIntegrated:
		typeScore = 0.7
	case GPUTypeVirtual:
		typeScore = 0.3
	}
	score += typeScore * 0.1
	
	return score
}

// AllocateMemory allocates GPU memory
func (gm *GPUManager) AllocateMemory(deviceID int, size int64, memType MemType, purpose string) (*MemoryAllocation, error) {
	if gm.allocator == nil {
		return nil, fmt.Errorf("memory allocator not initialized")
	}
	
	return gm.allocator.Allocate(deviceID, size, memType, purpose)
}

// FreeMemory frees GPU memory
func (gm *GPUManager) FreeMemory(allocationID string) error {
	if gm.allocator == nil {
		return fmt.Errorf("memory allocator not initialized")
	}
	
	return gm.allocator.Free(allocationID)
}

// SubmitWork submits work to be executed on GPU
func (gm *GPUManager) SubmitWork(work *WorkItem) error {
	if gm.scheduler == nil {
		return fmt.Errorf("work scheduler not initialized")
	}
	
	return gm.scheduler.Submit(work)
}

// GetUtilization returns current GPU utilization
func (gm *GPUManager) GetUtilization() float64 {
	gm.mu.RLock()
	defer gm.mu.RUnlock()
	
	if len(gm.gpus) == 0 {
		return 0.0
	}
	
	totalLoad := 0.0
	for _, gpu := range gm.gpus {
		totalLoad += gpu.CurrentLoad
	}
	
	return totalLoad / float64(len(gm.gpus))
}

// GetMemoryUsage returns current memory usage
func (gm *GPUManager) GetMemoryUsage() int64 {
	gm.mu.RLock()
	defer gm.mu.RUnlock()
	
	totalUsed := int64(0)
	for _, gpu := range gm.gpus {
		totalUsed += gpu.MemoryUsed
	}
	
	return totalUsed
}

// Cleanup releases all resources
func (gm *GPUManager) Cleanup() error {
	return gm.Stop()
}

// MemoryAllocator methods

// Allocate allocates memory on a GPU device
func (ma *MemoryAllocator) Allocate(deviceID int, size int64, memType MemType, purpose string) (*MemoryAllocation, error) {
	ma.mu.Lock()
	defer ma.mu.Unlock()
	
	device, exists := ma.devices[deviceID]
	if !exists {
		return nil, fmt.Errorf("device %d not found", deviceID)
	}
	
	if device.MemoryAvailable < size {
		return nil, fmt.Errorf("insufficient memory on device %d", deviceID)
	}
	
	allocation := &MemoryAllocation{
		ID:          fmt.Sprintf("alloc_%d_%d", deviceID, time.Now().UnixNano()),
		DeviceID:    deviceID,
		Size:        size,
		Type:        memType,
		Purpose:     purpose,
		AllocatedAt: time.Now(),
		LastUsed:    time.Now(),
		RefCount:    1,
	}
	
	ma.allocations[allocation.ID] = allocation
	device.MemoryUsed += size
	device.MemoryAvailable -= size
	ma.totalAllocated += size
	
	return allocation, nil
}

// Free frees a memory allocation
func (ma *MemoryAllocator) Free(allocationID string) error {
	ma.mu.Lock()
	defer ma.mu.Unlock()
	
	allocation, exists := ma.allocations[allocationID]
	if !exists {
		return fmt.Errorf("allocation %s not found", allocationID)
	}
	
	allocation.RefCount--
	if allocation.RefCount <= 0 {
		delete(ma.allocations, allocationID)
		
		device := ma.devices[allocation.DeviceID]
		device.MemoryUsed -= allocation.Size
		device.MemoryAvailable += allocation.Size
		ma.totalAllocated -= allocation.Size
	}
	
	return nil
}

// Cleanup releases all memory allocations
func (ma *MemoryAllocator) Cleanup() {
	ma.mu.Lock()
	defer ma.mu.Unlock()
	
	for id := range ma.allocations {
		delete(ma.allocations, id)
	}
	
	for _, device := range ma.devices {
		device.MemoryUsed = 0
		device.MemoryAvailable = device.MemoryTotal
	}
	
	ma.totalAllocated = 0
}

// WorkScheduler methods

// Start starts the work scheduler
func (ws *WorkScheduler) Start(ctx context.Context) error {
	// Create workers for each device
	for _, device := range ws.devices {
		worker := &GPUWorker{
			ID:     device.ID,
			Device: device,
			Queue:  make(chan *WorkItem, 10),
		}
		ws.workers[device.ID] = worker
		go worker.Start(ctx)
	}
	
	// Start work distribution
	go ws.distributeWork(ctx)
	
	return nil
}

// Stop stops the work scheduler
func (ws *WorkScheduler) Stop() {
	for _, worker := range ws.workers {
		worker.Stop()
	}
}

// Submit submits work to be executed
func (ws *WorkScheduler) Submit(work *WorkItem) error {
	select {
	case ws.queue <- work:
		return nil
	default:
		return fmt.Errorf("work queue is full")
	}
}

// distributeWork distributes work to workers
func (ws *WorkScheduler) distributeWork(ctx context.Context) {
	for {
		select {
		case work := <-ws.queue:
			device := ws.loadBalancer.SelectDevice(ws.devices)
			work.DeviceID = device.ID
			
			worker := ws.workers[device.ID]
			select {
			case worker.Queue <- work:
			case <-ctx.Done():
				return
			default:
				// Worker queue full, try next device
				nextDevice := ws.loadBalancer.SelectNextDevice(ws.devices, device.ID)
				if nextDevice != nil {
					nextWorker := ws.workers[nextDevice.ID]
					select {
					case nextWorker.Queue <- work:
					case <-ctx.Done():
						return
					default:
						// All queues full, drop work
						log.Printf("All worker queues full, dropping work %s", work.ID)
					}
				}
			}
			
		case <-ctx.Done():
			return
		}
	}
}

// GPUWorker methods

// Start starts the GPU worker
func (gw *GPUWorker) Start(ctx context.Context) {
	gw.mu.Lock()
	gw.Running = true
	gw.mu.Unlock()
	
	for {
		select {
		case work := <-gw.Queue:
			gw.processWork(work)
			
		case <-ctx.Done():
			gw.mu.Lock()
			gw.Running = false
			gw.mu.Unlock()
			return
		}
	}
}

// Stop stops the GPU worker
func (gw *GPUWorker) Stop() {
	gw.mu.Lock()
	defer gw.mu.Unlock()
	gw.Running = false
}

// processWork processes a single work item
func (gw *GPUWorker) processWork(work *WorkItem) {
	startTime := time.Now()
	work.StartedAt = startTime
	
	// Mock GPU processing
	// In reality, this would execute the actual GPU computation
	time.Sleep(10 * time.Millisecond)
	
	// Update device load
	gw.Device.CurrentLoad = 80.0 // Mock load
	
	// Execute callback
	if work.Callback != nil {
		work.Callback("mock_result", nil)
	}
	
	// Reset device load
	gw.Device.CurrentLoad = 0.0
}

// LoadBalancer methods

// SelectDevice selects the best device for work
func (lb *LoadBalancer) SelectDevice(devices []*GPUDevice) *GPUDevice {
	lb.mu.RLock()
	defer lb.mu.RUnlock()
	
	if len(devices) == 0 {
		return nil
	}
	
	switch lb.strategy {
	case BalanceRoundRobin:
		return lb.roundRobinSelect(devices)
	case BalanceLeastLoad:
		return lb.leastLoadSelect(devices)
	case BalanceMemoryBased:
		return lb.memoryBasedSelect(devices)
	default:
		return devices[0]
	}
}

// SelectNextDevice selects the next best device
func (lb *LoadBalancer) SelectNextDevice(devices []*GPUDevice, excludeID int) *GPUDevice {
	lb.mu.RLock()
	defer lb.mu.RUnlock()
	
	for _, device := range devices {
		if device.ID != excludeID && device.IsAvailable {
			return device
		}
	}
	
	return nil
}

// roundRobinSelect implements round-robin selection
func (lb *LoadBalancer) roundRobinSelect(devices []*GPUDevice) *GPUDevice {
	// Simple round-robin (mock implementation)
	return devices[0]
}

// leastLoadSelect implements least-load selection
func (lb *LoadBalancer) leastLoadSelect(devices []*GPUDevice) *GPUDevice {
	bestDevice := devices[0]
	minLoad := bestDevice.CurrentLoad
	
	for _, device := range devices[1:] {
		if device.IsAvailable && device.CurrentLoad < minLoad {
			bestDevice = device
			minLoad = device.CurrentLoad
		}
	}
	
	return bestDevice
}

// memoryBasedSelect implements memory-based selection
func (lb *LoadBalancer) memoryBasedSelect(devices []*GPUDevice) *GPUDevice {
	bestDevice := devices[0]
	maxMemory := bestDevice.MemoryAvailable
	
	for _, device := range devices[1:] {
		if device.IsAvailable && device.MemoryAvailable > maxMemory {
			bestDevice = device
			maxMemory = device.MemoryAvailable
		}
	}
	
	return bestDevice
}

// PerformanceMonitor methods

// Start starts the performance monitor
func (pm *PerformanceMonitor) Start(ctx context.Context) error {
	pm.ctx, pm.cancel = context.WithCancel(ctx)
	pm.ticker = time.NewTicker(1 * time.Second)
	
	// Start metric collectors for each device
	for deviceID := range pm.devices {
		collector := &MetricCollector{
			DeviceID: deviceID,
			Interval: 1 * time.Second,
			Running:  true,
		}
		pm.collectors[deviceID] = collector
		go collector.Start(pm.ctx, pm.metrics[deviceID])
	}
	
	// Aggregate metrics
	go pm.aggregateMetrics()
	
	return nil
}

// Stop stops the performance monitor
func (pm *PerformanceMonitor) Stop() {
	if pm.cancel != nil {
		pm.cancel()
	}
	
	if pm.ticker != nil {
		pm.ticker.Stop()
	}
	
	for _, collector := range pm.collectors {
		collector.Stop()
	}
}

// aggregateMetrics aggregates metrics from all devices
func (pm *PerformanceMonitor) aggregateMetrics() {
	for {
		select {
		case <-pm.ticker.C:
			pm.mu.RLock()
			
			// Update device metrics
			for deviceID, device := range pm.devices {
				metrics := pm.metrics[deviceID]
				
				// Mock metric updates
				// In reality, this would read actual GPU metrics
				metrics.Utilization = device.CurrentLoad
				metrics.MemoryUtilization = float64(device.MemoryUsed) / float64(device.MemoryTotal) * 100
				metrics.Temperature = device.Temperature
				metrics.PowerUsage = device.PowerUsage
				metrics.ClockSpeed = device.ClockSpeed
				metrics.Throughput = 1000.0 // Mock throughput
				metrics.ErrorRate = 0.1      // Mock error rate
				metrics.LastUpdate = time.Now()
			}
			
			pm.mu.RUnlock()
			
		case <-pm.ctx.Done():
			return
		}
	}
}

// MetricCollector methods

// Start starts the metric collector
func (mc *MetricCollector) Start(ctx context.Context, metrics *GPUMetrics) {
	mc.mu.Lock()
	mc.Running = true
	mc.mu.Unlock()
	
	ticker := time.NewTicker(mc.Interval)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			mc.mu.RLock()
			if !mc.Running {
				mc.mu.RUnlock()
				return
			}
			mc.mu.RUnlock()
			
			// Collect metrics (mock implementation)
			// In reality, this would query GPU APIs
			metrics.Utilization = float64(50 + (mc.DeviceID*10)) % 100
			metrics.MemoryUtilization = float64(30 + (mc.DeviceID*15)) % 100
			metrics.Temperature = 40.0 + float64(mc.DeviceID*5)
			metrics.PowerUsage = 10.0 + float64(mc.DeviceID*2)
			metrics.ClockSpeed = 1.5 + float64(mc.DeviceID*0.1)
			metrics.Throughput = 800.0 + float64(mc.DeviceID*100)
			metrics.ErrorRate = 0.05
			metrics.LastUpdate = time.Now()
			
		case <-ctx.Done():
			return
		}
	}
}

// Stop stops the metric collector
func (mc *MetricCollector) Stop() {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	mc.Running = false
}
