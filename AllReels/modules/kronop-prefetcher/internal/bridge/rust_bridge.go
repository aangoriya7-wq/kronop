package bridge

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

// RustBridge handles communication with Rust video engine
type RustBridge struct {
	rustEngineURL string
	httpClient   *http.Client
	mu           sync.RWMutex
	connected    bool
}

// RustEngineRequest represents a request to Rust engine
type RustEngineRequest struct {
	Type      string      `json:"type"`
	ReelID    int         `json:"reel_id"`
	ChunkID   string      `json:"chunk_id"`
	Data      []byte      `json:"data,omitempty"`
	Timestamp int64       `json:"timestamp"`
}

// RustEngineResponse represents a response from Rust engine
type RustEngineResponse struct {
	Status    string      `json:"status"`
	Data      []byte      `json:"data,omitempty"`
	Error     string      `json:"error,omitempty"`
	Timestamp int64       `json:"timestamp"`
	ReelID    int         `json:"reel_id"`
	Ready     bool        `json:"ready"`
}

// VideoChunk represents a video chunk from Rust engine
type VideoChunk struct {
	ID          string    `json:"id"`
	ReelID      int       `json:"reel_id"`
	Data        []byte    `json:"data"`
	Size        int       `json:"size"`
	Timestamp   int64     `json:"timestamp"`
	IsKeyFrame  bool      `json:"is_key_frame"`
	Sequence    int       `json:"sequence"`
	Compressed  bool      `json:"compressed"`
}

// NewRustBridge creates a new Rust bridge
func NewRustBridge(rustEngineURL string) *RustBridge {
	return &RustBridge{
		rustEngineURL: rustEngineURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		connected: false,
	}
}

// Connect establishes connection with Rust engine
func (rb *RustBridge) Connect() error {
	logrus.Infof("🔗 Connecting to Rust engine at %s", rb.rustEngineURL)

	// Test connection
	resp, err := rb.httpClient.Get(rb.rustEngineURL + "/health")
	if err != nil {
		return fmt.Errorf("failed to connect to Rust engine: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("Rust engine health check failed: %s", resp.Status)
	}

	rb.mu.Lock()
	rb.connected = true
	rb.mu.Unlock()

	logrus.Info("✅ Connected to Rust engine successfully")
	return nil
}

// IsConnected checks if Rust bridge is connected
func (rb *RustBridge) IsConnected() bool {
	rb.mu.RLock()
	defer rb.mu.RUnlock()
	return rb.connected
}

// RequestChunk requests a video chunk from Rust engine
func (rb *RustBridge) RequestChunk(reelID int, chunkID string) (*VideoChunk, error) {
	if !rb.IsConnected() {
		return nil, fmt.Errorf("not connected to Rust engine")
	}

	request := RustEngineRequest{
		Type:      "get_chunk",
		ReelID:    reelID,
		ChunkID:   chunkID,
		Timestamp: time.Now().Unix(),
	}

	response, err := rb.sendRequest(request)
	if err != nil {
		return nil, fmt.Errorf("failed to request chunk: %v", err)
	}

	if response.Status != "success" {
		return nil, fmt.Errorf("Rust engine error: %s", response.Error)
	}

	// Parse video chunk
	var chunk VideoChunk
	if err := json.Unmarshal(response.Data, &chunk); err != nil {
		return nil, fmt.Errorf("failed to parse chunk: %v", err)
	}

	logrus.Debugf("📦 Received chunk: reel=%d, chunk=%s, size=%d", reelID, chunkID, chunk.Size)
	return &chunk, nil
}

// PrefetchChunk prefetches a video chunk
func (rb *RustBridge) PrefetchChunk(reelID int, chunkID string) error {
	if !rb.IsConnected() {
		return fmt.Errorf("not connected to Rust engine")
	}

	request := RustEngineRequest{
		Type:      "prefetch_chunk",
		ReelID:    reelID,
		ChunkID:   chunkID,
		Timestamp: time.Now().Unix(),
	}

	response, err := rb.sendRequest(request)
	if err != nil {
		return fmt.Errorf("failed to prefetch chunk: %v", err)
	}

	if response.Status != "success" {
		return fmt.Errorf("prefetch failed: %s", response.Error)
	}

	logrus.Debugf("⚡ Prefetched chunk: reel=%d, chunk=%s", reelID, chunkID)
	return nil
}

// IsChunkReady checks if a chunk is ready for playback
func (rb *RustBridge) IsChunkReady(reelID int, chunkID string) (bool, error) {
	if !rb.IsConnected() {
		return false, fmt.Errorf("not connected to Rust engine")
	}

	request := RustEngineRequest{
		Type:      "is_ready",
		ReelID:    reelID,
		ChunkID:   chunkID,
		Timestamp: time.Now().Unix(),
	}

	response, err := rb.sendRequest(request)
	if err != nil {
		return false, fmt.Errorf("failed to check chunk readiness: %v", err)
	}

	if response.Status != "success" {
		return false, fmt.Errorf("readiness check failed: %s", response.Error)
	}

	// Parse readiness response
	var readyResponse struct {
		Ready bool `json:"ready"`
	}
	if err := json.Unmarshal(response.Data, &readyResponse); err != nil {
		return false, fmt.Errorf("failed to parse readiness response: %v", err)
	}

	return readyResponse.Ready, nil
}

// GetCurrentFrame gets the current frame from Rust engine
func (rb *RustBridge) GetCurrentFrame(reelID int) ([]byte, error) {
	if !rb.IsConnected() {
		return nil, fmt.Errorf("not connected to Rust engine")
	}

	request := RustEngineRequest{
		Type:      "get_current_frame",
		ReelID:    reelID,
		Timestamp: time.Now().Unix(),
	}

	response, err := rb.sendRequest(request)
	if err != nil {
		return nil, fmt.Errorf("failed to get current frame: %v", err)
	}

	if response.Status != "success" {
		return nil, fmt.Errorf("failed to get frame: %s", response.Error)
	}

	logrus.Debugf("🎬 Got current frame: reel=%d, size=%d", reelID, len(response.Data))
	return response.Data, nil
}

// GetEngineStats gets statistics from Rust engine
func (rb *RustBridge) GetEngineStats() (map[string]interface{}, error) {
	if !rb.IsConnected() {
		return nil, fmt.Errorf("not connected to Rust engine")
	}

	request := RustEngineRequest{
		Type:      "get_stats",
		Timestamp: time.Now().Unix(),
	}

	response, err := rb.sendRequest(request)
	if err != nil {
		return nil, fmt.Errorf("failed to get stats: %v", err)
	}

	if response.Status != "success" {
		return nil, fmt.Errorf("stats request failed: %s", response.Error)
	}

	var stats map[string]interface{}
	if err := json.Unmarshal(response.Data, &stats); err != nil {
		return nil, fmt.Errorf("failed to parse stats: %v", err)
	}

	return stats, nil
}

// sendRequest sends a request to Rust engine
func (rb *RustBridge) sendRequest(request RustEngineRequest) (*RustEngineResponse, error) {
	// Marshal request
	reqData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %v", err)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", rb.rustEngineURL+"/api/v1/request", bytes.NewBuffer(reqData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Kronop-Prefetcher/1.0")

	// Send request
	resp, err := rb.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %v", err)
	}

	// Parse response
	var response RustEngineResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("failed to parse response: %v", err)
	}

	return &response, nil
}

// PrefetchMultiple prefetches multiple chunks concurrently
func (rb *RustBridge) PrefetchMultiple(reelID int, chunkIDs []string) error {
	if !rb.IsConnected() {
		return fmt.Errorf("not connected to Rust engine")
	}

	var wg sync.WaitGroup
	errors := make(chan error, len(chunkIDs))

	// Prefetch chunks concurrently
	for _, chunkID := range chunkIDs {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			if err := rb.PrefetchChunk(reelID, id); err != nil {
				errors <- err
			}
		}(chunkID)
	}

	// Wait for all prefetches to complete
	wg.Wait()
	close(errors)

	// Check for errors
	var prefetchErrors []error
	for err := range errors {
		prefetchErrors = append(prefetchErrors, err)
	}

	if len(prefetchErrors) > 0 {
		logrus.Warnf("⚠️ %d prefetch errors occurred", len(prefetchErrors))
		// Return first error for simplicity
		return prefetchErrors[0]
	}

	logrus.Infof("✅ Successfully prefetched %d chunks for reel %d", len(chunkIDs), reelID)
	return nil
}

// GetCacheStatus gets cache status from Rust engine
func (rb *RustBridge) GetCacheStatus() (map[string]interface{}, error) {
	if !rb.IsConnected() {
		return nil, fmt.Errorf("not connected to Rust engine")
	}

	request := RustEngineRequest{
		Type:      "get_cache_status",
		Timestamp: time.Now().Unix(),
	}

	response, err := rb.sendRequest(request)
	if err != nil {
		return nil, fmt.Errorf("failed to get cache status: %v", err)
	}

	if response.Status != "success" {
		return nil, fmt.Errorf("cache status request failed: %s", response.Error)
	}

	var status map[string]interface{}
	if err := json.Unmarshal(response.Data, &status); err != nil {
		return nil, fmt.Errorf("failed to parse cache status: %v", err)
	}

	return status, nil
}

// WarmupCache warms up the cache with initial chunks
func (rb *RustBridge) WarmupCache(reelID int, numChunks int) error {
	if !rb.IsConnected() {
		return fmt.Errorf("not connected to Rust engine")
	}

	logrus.Infof("🔥 Warming up cache for reel %d with %d chunks", reelID, numChunks)

	// Generate chunk IDs
	var chunkIDs []string
	for i := 0; i < numChunks; i++ {
		chunkIDs = append(chunkIDs, fmt.Sprintf("chunk_%d", i))
	}

	// Prefetch chunks
	if err := rb.PrefetchMultiple(reelID, chunkIDs); err != nil {
		return fmt.Errorf("cache warmup failed: %v", err)
	}

	logrus.Infof("✅ Cache warmup completed for reel %d", reelID)
	return nil
}

// Disconnect closes the connection to Rust engine
func (rb *RustBridge) Disconnect() {
	rb.mu.Lock()
	defer rb.mu.Unlock()

	if rb.connected {
		rb.connected = false
		logrus.Info("🔌 Disconnected from Rust engine")
	}
}

// HealthCheck performs a health check on the Rust engine
func (rb *RustBridge) HealthCheck() error {
	if !rb.IsConnected() {
		return fmt.Errorf("not connected to Rust engine")
	}

	stats, err := rb.GetEngineStats()
	if err != nil {
		return fmt.Errorf("health check failed: %v", err)
	}

	// Check if engine is running
	if running, ok := stats["is_running"].(bool); !ok || !running {
		return fmt.Errorf("Rust engine is not running")
	}

	logrus.Debug("✅ Rust engine health check passed")
	return nil
}

// MonitorConnection monitors the connection to Rust engine
func (rb *RustBridge) MonitorConnection(interval time.Duration, stopChan <-chan struct{}) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-stopChan:
			logrus.Info("🛑 Stopping connection monitoring")
			return
		case <-ticker.C:
			if err := rb.HealthCheck(); err != nil {
				logrus.Warnf("⚠️ Health check failed: %v", err)
				
				// Try to reconnect
				if connectErr := rb.Connect(); connectErr != nil {
					logrus.Errorf("❌ Reconnection failed: %v", connectErr)
				}
			}
		}
	}
}
