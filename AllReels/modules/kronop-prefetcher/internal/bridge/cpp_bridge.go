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

// CppBridge handles communication with C++ JSI engine
type CppBridge struct {
	cppEngineURL string
	httpClient  *http.Client
	mu          sync.RWMutex
	connected   bool
}

// CppEngineRequest represents a request to C++ engine
type CppEngineRequest struct {
	Type      string      `json:"type"`
	ReelID    int         `json:"reel_id"`
	FrameData []byte      `json:"frame_data,omitempty"`
	Timestamp int64       `json:"timestamp"`
}

// CppEngineResponse represents a response from C++ engine
type CppEngineResponse struct {
	Status    string      `json:"status"`
	Data      []byte      `json:"data,omitempty"`
	Error     string      `json:"error,omitempty"`
	Timestamp int64       `json:"timestamp"`
	FrameInfo *FrameInfo  `json:"frame_info,omitempty"`
}

// FrameInfo contains frame metadata from C++ engine
type FrameInfo struct {
	Width      int    `json:"width"`
	Height     int    `json:"height"`
	Format     string `json:"format"`
	Timestamp  int64  `json:"timestamp"`
	IsKeyFrame bool   `json:"is_key_frame"`
}

// NewCppBridge creates a new C++ bridge
func NewCppBridge(cppEngineURL string) *CppBridge {
	return &CppBridge{
		cppEngineURL: cppEngineURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		connected: false,
	}
}

// Connect establishes connection with C++ engine
func (cb *CppBridge) Connect() error {
	logrus.Infof("🔗 Connecting to C++ engine at %s", cb.cppEngineURL)

	// Test connection
	resp, err := cb.httpClient.Get(cb.cppEngineURL + "/health")
	if err != nil {
		return fmt.Errorf("failed to connect to C++ engine: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("C++ engine health check failed: %s", resp.Status)
	}

	cb.mu.Lock()
	cb.connected = true
	cb.mu.Unlock()

	logrus.Info("✅ Connected to C++ engine successfully")
	return nil
}

// IsConnected checks if C++ bridge is connected
func (cb *CppBridge) IsConnected() bool {
	cb.mu.RLock()
	defer cb.mu.RUnlock()
	return cb.connected
}

// PushFrameToDisplay pushes a frame to the C++ display system
func (cb *CppBridge) PushFrameToDisplay(reelID int, frameData []byte) error {
	if !cb.IsConnected() {
		return fmt.Errorf("not connected to C++ engine")
	}

	request := CppEngineRequest{
		Type:      "push_frame",
		ReelID:    reelID,
		FrameData: frameData,
		Timestamp: time.Now().Unix(),
	}

	response, err := cb.sendRequest(request)
	if err != nil {
		return fmt.Errorf("failed to push frame: %v", err)
	}

	if response.Status != "success" {
		return fmt.Errorf("frame push failed: %s", response.Error)
	}

	logrus.Debugf("🎬 Pushed frame to display: reel=%d, size=%d", reelID, len(frameData))
	return nil
}

// GetCurrentFrame gets the current frame from C++ engine
func (cb *CppBridge) GetCurrentFrame(reelID int) ([]byte, error) {
	if !cb.IsConnected() {
		return nil, fmt.Errorf("not connected to C++ engine")
	}

	request := CppEngineRequest{
		Type:      "get_current_frame",
		ReelID:    reelID,
		Timestamp: time.Now().Unix(),
	}

	response, err := cb.sendRequest(request)
	if err != nil {
		return nil, fmt.Errorf("failed to get current frame: %v", err)
	}

	if response.Status != "success" {
		return nil, fmt.Errorf("failed to get frame: %s", response.Error)
	}

	logrus.Debugf("🎬 Got current frame from C++: reel=%d, size=%d", reelID, len(response.Data))
	return response.Data, nil
}

// GetFrameInfo gets frame information from C++ engine
func (cb *CppBridge) GetFrameInfo(reelID int) (*FrameInfo, error) {
	if !cb.IsConnected() {
		return nil, fmt.Errorf("not connected to C++ engine")
	}

	request := CppEngineRequest{
		Type:      "get_frame_info",
		ReelID:    reelID,
		Timestamp: time.Now().Unix(),
	}

	response, err := cb.sendRequest(request)
	if err != nil {
		return nil, fmt.Errorf("failed to get frame info: %v", err)
	}

	if response.Status != "success" {
		return nil, fmt.Errorf("frame info request failed: %s", response.Error)
	}

	// Parse frame info
	var frameInfo FrameInfo
	if err := json.Unmarshal(response.Data, &frameInfo); err != nil {
		return nil, fmt.Errorf("failed to parse frame info: %v", err)
	}

	return &frameInfo, nil
}

// SetDisplayMode sets the display mode for C++ engine
func (cb *CppBridge) SetDisplayMode(mode string) error {
	if !cb.IsConnected() {
		return fmt.Errorf("not connected to C++ engine")
	}

	request := CppEngineRequest{
		Type:      "set_display_mode",
		Timestamp: time.Now().Unix(),
	}

	// Add mode to request data
	modeData, err := json.Marshal(map[string]string{"mode": mode})
	if err != nil {
		return fmt.Errorf("failed to marshal mode: %v", err)
	}
	request.FrameData = modeData

	response, err := cb.sendRequest(request)
	if err != nil {
		return fmt.Errorf("failed to set display mode: %v", err)
	}

	if response.Status != "success" {
		return fmt.Errorf("display mode setting failed: %s", response.Error)
	}

	logrus.Infof("🖥️ Set display mode: %s", mode)
	return nil
}

// StartDisplay starts the display system
func (cb *CppBridge) StartDisplay() error {
	return cb.SetDisplayMode("active")
}

// StopDisplay stops the display system
func (cb *CppBridge) StopDisplay() error {
	return cb.SetDisplayMode("inactive")
}

// IsDisplayActive checks if display is active
func (cb *CppBridge) IsDisplayActive() (bool, error) {
	if !cb.IsConnected() {
		return false, fmt.Errorf("not connected to C++ engine")
	}

	request := CppEngineRequest{
		Type:      "get_display_status",
		Timestamp: time.Now().Unix(),
	}

	response, err := cb.sendRequest(request)
	if err != nil {
		return false, fmt.Errorf("failed to get display status: %v", err)
	}

	if response.Status != "success" {
		return false, fmt.Errorf("display status check failed: %s", response.Error)
	}

	// Parse display status
	var status struct {
		Active bool `json:"active"`
	}
	if err := json.Unmarshal(response.Data, &status); err != nil {
		return false, fmt.Errorf("failed to parse display status: %v", err)
	}

	return status.Active, nil
}

// GetDisplayStats gets display statistics from C++ engine
func (cb *CppBridge) GetDisplayStats() (map[string]interface{}, error) {
	if !cb.IsConnected() {
		return nil, fmt.Errorf("not connected to C++ engine")
	}

	request := CppEngineRequest{
		Type:      "get_display_stats",
		Timestamp: time.Now().Unix(),
	}

	response, err := cb.sendRequest(request)
	if err != nil {
		return nil, fmt.Errorf("failed to get display stats: %v", err)
	}

	if response.Status != "success" {
		return nil, fmt.Errorf("display stats request failed: %s", response.Error)
	}

	var stats map[string]interface{}
	if err := json.Unmarshal(response.Data, &stats); err != nil {
		return nil, fmt.Errorf("failed to parse display stats: %v", err)
	}

	return stats, nil
}

// sendRequest sends a request to C++ engine
func (cb *CppBridge) sendRequest(request CppEngineRequest) (*CppEngineResponse, error) {
	// Marshal request
	reqData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %v", err)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", cb.cppEngineURL+"/api/v1/jsi", bytes.NewBuffer(reqData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Kronop-Prefetcher/1.0")

	// Send request
	resp, err := cb.httpClient.Do(req)
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
	var response CppEngineResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("failed to parse response: %v", err)
	}

	return &response, nil
}

// PushMultipleFrames pushes multiple frames concurrently
func (cb *CppBridge) PushMultipleFrames(reelID int, frames [][]byte) error {
	if !cb.IsConnected() {
		return fmt.Errorf("not connected to C++ engine")
	}

	var wg sync.WaitGroup
	errors := make(chan error, len(frames))

	// Push frames concurrently
	for i, frameData := range frames {
		wg.Add(1)
		go func(idx int, data []byte) {
			defer wg.Done()
			if err := cb.PushFrameToDisplay(reelID, data); err != nil {
				errors <- fmt.Errorf("frame %d: %v", idx, err)
			}
		}(i, frameData)
	}

	// Wait for all pushes to complete
	wg.Wait()
	close(errors)

	// Check for errors
	var pushErrors []error
	for err := range errors {
		pushErrors = append(pushErrors, err)
	}

	if len(pushErrors) > 0 {
		logrus.Warnf("⚠️ %d frame push errors occurred", len(pushErrors))
		return pushErrors[0]
	}

	logrus.Infof("✅ Successfully pushed %d frames for reel %d", len(frames), reelID)
	return nil
}

// StreamFrames starts streaming frames to C++ engine
func (cb *CppBridge) StreamFrames(reelID int, frameChan <-chan []byte, stopChan <-chan struct{}) error {
	if !cb.IsConnected() {
		return fmt.Errorf("not connected to C++ engine")
	}

	logrus.Infof("🌊 Starting frame streaming for reel %d", reelID)

	for {
		select {
		case <-stopChan:
			logrus.Info("🛑 Stopped frame streaming")
			return nil
		case frameData, ok := <-frameChan:
			if !ok {
				logrus.Info("📦 Frame channel closed")
				return nil
			}

			if err := cb.PushFrameToDisplay(reelID, frameData); err != nil {
				logrus.Errorf("❌ Failed to stream frame: %v", err)
				return err
			}
		}
	}
}

// Disconnect closes the connection to C++ engine
func (cb *CppBridge) Disconnect() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	if cb.connected {
		cb.connected = false
		logrus.Info("🔌 Disconnected from C++ engine")
	}
}

// HealthCheck performs a health check on the C++ engine
func (cb *CppBridge) HealthCheck() error {
	if !cb.IsConnected() {
		return fmt.Errorf("not connected to C++ engine")
	}

	stats, err := cb.GetDisplayStats()
	if err != nil {
		return fmt.Errorf("health check failed: %v", err)
	}

	// Check if display system is active
	if active, ok := stats["display_active"].(bool); !ok || !active {
		return fmt.Errorf("C++ display system is not active")
	}

	logrus.Debug("✅ C++ engine health check passed")
	return nil
}

// MonitorConnection monitors the connection to C++ engine
func (cb *CppBridge) MonitorConnection(interval time.Duration, stopChan <-chan struct{}) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-stopChan:
			logrus.Info("🛑 Stopping connection monitoring")
			return
		case <-ticker.C:
			if err := cb.HealthCheck(); err != nil {
				logrus.Warnf("⚠️ Health check failed: %v", err)
				
				// Try to reconnect
				if connectErr := cb.Connect(); connectErr != nil {
					logrus.Errorf("❌ Reconnection failed: %v", connectErr)
				}
			}
		}
	}
}

// GetEngineCapabilities gets capabilities of C++ engine
func (cb *CppBridge) GetEngineCapabilities() (map[string]interface{}, error) {
	if !cb.IsConnected() {
		return nil, fmt.Errorf("not connected to C++ engine")
	}

	request := CppEngineRequest{
		Type:      "get_capabilities",
		Timestamp: time.Now().Unix(),
	}

	response, err := cb.sendRequest(request)
	if err != nil {
		return nil, fmt.Errorf("failed to get capabilities: %v", err)
	}

	if response.Status != "success" {
		return nil, fmt.Errorf("capabilities request failed: %s", response.Error)
	}

	var capabilities map[string]interface{}
	if err := json.Unmarshal(response.Data, &capabilities); err != nil {
		return nil, fmt.Errorf("failed to parse capabilities: %v", err)
	}

	return capabilities, nil
}

// SetFrameRate sets the frame rate for the display system
func (cb *CppBridge) SetFrameRate(fps int) error {
	if !cb.IsConnected() {
		return fmt.Errorf("not connected to C++ engine")
	}

	request := CppEngineRequest{
		Type:      "set_frame_rate",
		Timestamp: time.Now().Unix(),
	}

	// Add frame rate to request data
	frameRateData, err := json.Marshal(map[string]int{"fps": fps})
	if err != nil {
		return fmt.Errorf("failed to marshal frame rate: %v", err)
	}
	request.FrameData = frameRateData

	response, err := cb.sendRequest(request)
	if err != nil {
		return fmt.Errorf("failed to set frame rate: %v", err)
	}

	if response.Status != "success" {
		return fmt.Errorf("frame rate setting failed: %s", response.Error)
	}

	logrus.Infof("🎬 Set frame rate: %d FPS", fps)
	return nil
}

// EnableZeroCopy enables zero-copy mode if supported
func (cb *CppBridge) EnableZeroCopy() error {
	if !cb.IsConnected() {
		return fmt.Errorf("not connected to C++ engine")
	}

	request := CppEngineRequest{
		Type:      "enable_zero_copy",
		Timestamp: time.Now().Unix(),
	}

	response, err := cb.sendRequest(request)
	if err != nil {
		return fmt.Errorf("failed to enable zero-copy: %v", err)
	}

	if response.Status != "success" {
		return fmt.Errorf("zero-copy enable failed: %s", response.Error)
	}

	logrus.Info("🚀 Zero-copy mode enabled")
	return nil
}
