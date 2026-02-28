package prefetcher

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/patrickmn/go-cache"
	"github.com/sirupsen/logrus"
	"golang.org/x/time/rate"
)

// Engine represents the main prefetching engine
type Engine struct {
	config       *Config
	analyzer     BehaviorAnalyzer
	cache        *cache.Cache
	rateLimiter  *rate.Limiter
	activeUsers  *sync.Map
	metrics      *Metrics
	httpServer   *http.Server
	wsUpgrader   websocket.Upgrader
}

// Config holds the engine configuration
type Config struct {
	MaxConcurrentPrefetches int           `yaml:"max_concurrent_prefetches"`
	Strategy               string        `yaml:"strategy"`
	DefaultPrefetchCount   int           `yaml:"default_prefetch_count"`
	MaxPrefetchCount       int           `yaml:"max_prefetch_count"`
	PrefetchTimeout        time.Duration `yaml:"prefetch_timeout"`
	RetryAttempts          int           `yaml:"retry_attempts"`
	RetryDelay             time.Duration `yaml:"retry_delay"`
	CacheSizeMB            int           `yaml:"cache_size_mb"`
	CacheTTL               time.Duration `yaml:"cache_ttl"`
	BackgroundProcessing   bool          `yaml:"background_processing"`
	ProcessingInterval     time.Duration `yaml:"processing_interval"`
}

// UserSession represents an active user session
type UserSession struct {
	ID              string
	CurrentReel     int
	ScrollSpeed     float
	WatchTime       time.Duration
	LastActivity    time.Time
	PrefetchQueue    chan PrefetchTask
	BehaviorProfile *BehaviorProfile
	mu              sync.RWMutex
}

// PrefetchTask represents a prefetching task
type PrefetchTask struct {
	ReelID     int
	Priority   Priority
	URL        string
	Timeout    time.Duration
	RetryCount int
	CreatedAt  time.Time
}

// Priority represents task priority
type Priority int

const (
	PriorityLow Priority = iota
	PriorityMedium
	PriorityHigh
	PriorityUrgent
)

// BehaviorProfile represents user behavior analysis
type BehaviorProfile struct {
	UserType         string    `json:"user_type"`
	ScrollSpeed      float64   `json:"scroll_speed"`
	AvgWatchTime     float64   `json:"avg_watch_time"`
	PrefetchCount    int       `json:"prefetch_count"`
	Confidence       float64   `json:"confidence"`
	LastUpdated      time.Time `json:"last_updated"`
}

// Metrics holds engine metrics
type Metrics struct {
	TotalPrefetches     int64     `json:"total_prefetches"`
	SuccessfulPrefetches int64   `json:"successful_prefetches"`
	FailedPrefetches    int64     `json:"failed_prefetches"`
	CacheHits           int64     `json:"cache_hits"`
	CacheMisses         int64     `json:"cache_misses"`
	AvgResponseTime     time.Duration `json:"avg_response_time"`
	ActiveUsers         int       `json:"active_users"`
	mu                  sync.RWMutex
}

// NewEngine creates a new prefetching engine
func NewEngine(config Config, analyzer BehaviorAnalyzer) *Engine {
	cache := cache.New(config.CacheTTL, config.CacheSizeMB*1024*1024)
	
	// Create rate limiter (100 requests per second)
	rateLimiter := rate.NewLimiter(rate.Limit(100), 10)

	return &Engine{
		config:      &config,
		analyzer:    analyzer,
		cache:       cache,
		rateLimiter: rateLimiter,
		activeUsers: &sync.Map{},
		metrics:     &Metrics{},
		wsUpgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		},
	}
}

// Start starts the prefetching engine
func (e *Engine) Start(ctx context.Context) error {
	logrus.Info("🚀 Starting Kronop Prefetcher Engine")

	// Start background processing
	if e.config.BackgroundProcessing {
		go e.backgroundProcessor(ctx)
	}

	// Start metrics collection
	go e.metricsCollector(ctx)

	// Start cleanup routine
	go e.cleanupRoutine(ctx)

	logrus.Info("✅ Prefetcher engine started successfully")
	return nil
}

// StartHTTPServer starts the HTTP API server
func (e *Engine) StartHTTPServer(ctx context.Context, port int) error {
	mux := http.NewServeMux()
	
	// API endpoints
	mux.HandleFunc("/api/v1/prefetch", e.handlePrefetch)
	mux.HandleFunc("/api/v1/user", e.handleUser)
	mux.HandleFunc("/api/v1/metrics", e.handleMetrics)
	mux.HandleFunc("/api/v1/health", e.handleHealth)
	
	// WebSocket endpoint for real-time communication
	mux.HandleFunc("/ws", e.handleWebSocket)

	e.httpServer = &http.Server{
		Addr:         fmt.Sprintf(":%d", port),
		Handler:      mux,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	logrus.Infof("🌐 Starting HTTP server on port %d", port)
	
	go func() {
		if err := e.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logrus.Errorf("❌ HTTP server error: %v", err)
		}
	}()

	<-ctx.Done()
	logrus.Info("🛑 Shutting down HTTP server")
	
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	return e.httpServer.Shutdown(shutdownCtx)
}

// backgroundProcessor handles background prefetching tasks
func (e *Engine) backgroundProcessor(ctx context.Context) {
	ticker := time.NewTicker(e.config.ProcessingInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			e.processBackgroundTasks(ctx)
		}
	}
}

// processBackgroundTasks processes all active user prefetching tasks
func (e *Engine) processBackgroundTasks(ctx context.Context) {
	e.activeUsers.Range(func(key, value interface{}) bool {
		userID := key.(string)
		session := value.(*UserSession)

		// Check if user is still active
		if time.Since(session.LastActivity) > 5*time.Minute {
			e.activeUsers.Delete(userID)
			logrus.Infof("👋 User %s session expired", userID)
			return true
		}

		// Process prefetch queue
		e.processPrefetchQueue(ctx, session)
		return true
	})
}

// processPrefetchQueue processes the prefetch queue for a user session
func (e *Engine) processPrefetchQueue(ctx context.Context, session *UserSession) {
	session.mu.Lock()
	defer session.mu.Unlock()

	// Process up to MaxConcurrentPrefetches tasks
	for i := 0; i < e.config.MaxConcurrentPrefetches && len(session.PrefetchQueue) > 0; i++ {
		select {
		case task := <-session.PrefetchQueue:
			go e.executePrefetchTask(ctx, session, task)
		default:
			return
		}
	}
}

// executePrefetchTask executes a single prefetching task
func (e *Engine) executePrefetchTask(ctx context.Context, session *UserSession, task PrefetchTask) {
	startTime := time.Now()
	
	logrus.Debugf("🎯 Executing prefetch task: reel=%d, priority=%d", task.ReelID, task.Priority)

	// Check rate limiter
	if !e.rateLimiter.Allow() {
		logrus.Warn("🚫 Rate limit exceeded, delaying prefetch")
		time.Sleep(100 * time.Millisecond)
	}

	// Check cache first
	cacheKey := fmt.Sprintf("reel_%d", task.ReelID)
	if cached, found := e.cache.Get(cacheKey); found {
		logrus.Debugf("💾 Cache hit for reel %d", task.ReelID)
		e.metrics.mu.Lock()
		e.metrics.CacheHits++
		e.metrics.mu.Unlock()
		return
	}

	// Fetch from source
	data, err := e.fetchVideoData(ctx, task.URL)
	if err != nil {
		logrus.Errorf("❌ Failed to fetch reel %d: %v", task.ReelID, err)
		
		// Retry logic
		if task.RetryCount < e.config.RetryAttempts {
			task.RetryCount++
			task.CreatedAt = time.Now().Add(e.config.RetryDelay)
			
			// Re-queue with delay
			go func() {
				time.Sleep(e.config.RetryDelay)
				session.mu.Lock()
				select {
				case session.PrefetchQueue <- task:
				default:
					logrus.Warn("📦 Prefetch queue full, dropping task")
				}
				session.mu.Unlock()
			}()
		}

		e.metrics.mu.Lock()
		e.metrics.FailedPrefetches++
		e.metrics.mu.Unlock()
		return
	}

	// Store in cache
	e.cache.Set(cacheKey, data, e.config.CacheTTL)
	
	// Update metrics
	responseTime := time.Since(startTime)
	e.metrics.mu.Lock()
	e.metrics.SuccessfulPrefetches++
	e.metrics.TotalPrefetches++
	// Update average response time
	if e.metrics.AvgResponseTime == 0 {
		e.metrics.AvgResponseTime = responseTime
	} else {
		e.metrics.AvgResponseTime = (e.metrics.AvgResponseTime + responseTime) / 2
	}
	e.metrics.CacheMisses++
	e.metrics.mu.Unlock()

	logrus.Debugf("✅ Successfully prefetched reel %d in %v", task.ReelID, responseTime)
}

// fetchVideoData fetches video data from the source
func (e *Engine) fetchVideoData(ctx context.Context, url string) ([]byte, error) {
	// Create HTTP request with timeout
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	// Set headers
	req.Header.Set("User-Agent", "Kronop-Prefetcher/1.0")
	req.Header.Set("Accept", "application/octet-stream")

	// Make request
	client := &http.Client{
		Timeout: e.config.PrefetchTimeout,
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	// Read response body
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	return data, nil
}

// AddUser adds a new user session
func (e *Engine) AddUser(userID string) *UserSession {
	session := &UserSession{
		ID:              userID,
		CurrentReel:     0,
		ScrollSpeed:     0.0,
		WatchTime:       0,
		LastActivity:    time.Now(),
		PrefetchQueue:    make(chan PrefetchTask, 100),
		BehaviorProfile: &BehaviorProfile{
			UserType:    "unknown",
			ScrollSpeed: 0.0,
			AvgWatchTime: 0.0,
			PrefetchCount: e.config.DefaultPrefetchCount,
			Confidence: 0.0,
			LastUpdated: time.Now(),
		},
	}

	e.activeUsers.Store(userID, session)
	
	// Update metrics
	e.metrics.mu.Lock()
	e.metrics.ActiveUsers++
	e.metrics.mu.Unlock()

	logrus.Infof("👤 Added user session: %s", userID)
	return session
}

// GetUserSession retrieves a user session
func (e *Engine) GetUserSession(userID string) (*UserSession, bool) {
	if value, ok := e.activeUsers.Load(userID); ok {
		return value.(*UserSession), true
	}
	return nil, false
}

// UpdateUserBehavior updates user behavior and adjusts prefetching strategy
func (e *Engine) UpdateUserBehavior(userID string, scrollSpeed float, watchTime time.Duration) {
	session, exists := e.GetUserSession(userID)
	if !exists {
		session = e.AddUser(userID)
	}

	session.mu.Lock()
	defer session.mu.Unlock()

	// Update behavior data
	session.ScrollSpeed = scrollSpeed
	session.WatchTime = watchTime
	session.LastActivity = time.Now()

	// Analyze behavior and update profile
	newProfile := e.analyzer.AnalyzeBehavior(session.BehaviorProfile, scrollSpeed, watchTime)
	session.BehaviorProfile = newProfile

	// Adjust prefetching strategy based on behavior
	e.adjustPrefetchingStrategy(session)

	logrus.Debugf("📊 Updated user behavior: %s -> %s (scroll: %.2f, watch: %v)", 
		userID, newProfile.UserType, scrollSpeed, watchTime)
}

// adjustPrefetchingStrategy adjusts prefetching based on user behavior
func (e *Engine) adjustPrefetchingStrategy(session *UserSession) {
	profile := session.BehaviorProfile
	
	// Clear existing queue and repopulate based on new strategy
	for len(session.PrefetchQueue) > 0 {
		<-session.PrefetchQueue
	}

	// Add prefetch tasks based on user type
	switch profile.UserType {
	case "fast_scroller":
		e.addPrefetchTasks(session, profile.PrefetchCount, PriorityHigh)
	case "normal_viewer":
		e.addPrefetchTasks(session, profile.PrefetchCount, PriorityMedium)
	case "slow_viewer":
		e.addPrefetchTasks(session, profile.PrefetchCount, PriorityLow)
	case "binge_watcher":
		e.addPrefetchTasks(session, profile.PrefetchCount, PriorityUrgent)
	default:
		e.addPrefetchTasks(session, e.config.DefaultPrefetchCount, PriorityMedium)
	}
}

// addPrefetchTasks adds prefetching tasks to the user's queue
func (e *Engine) addPrefetchTasks(session *UserSession, count int, priority Priority) {
	currentReel := session.CurrentReel
	
	for i := 1; i <= count && (currentReel+i) <= e.config.MaxPrefetchCount; i++ {
		task := PrefetchTask{
			ReelID:    currentReel + i,
			Priority:  priority,
			URL:       fmt.Sprintf("https://cdn.kronop.com/reels/%d", currentReel+i),
			Timeout:   e.config.PrefetchTimeout,
			RetryCount: 0,
			CreatedAt: time.Now(),
		}

		select {
		case session.PrefetchQueue <- task:
			logrus.Debugf("📦 Added prefetch task: reel=%d, priority=%d", task.ReelID, task.Priority)
		default:
			logrus.Warn("📦 Prefetch queue full, dropping task")
			break
		}
	}
}

// metricsCollector collects and reports metrics
func (e *Engine) metricsCollector(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			e.reportMetrics()
		}
	}
}

// reportMetrics reports current metrics
func (e *Engine) reportMetrics() {
	e.metrics.mu.RLock()
	metrics := *e.metrics
	e.metrics.mu.RUnlock()

	logrus.Infof("📊 Metrics: Total=%d, Success=%d, Failed=%d, CacheHits=%d, CacheMisses=%d, ActiveUsers=%d, AvgResponseTime=%v",
		metrics.TotalPrefetches,
		metrics.SuccessfulPrefetches,
		metrics.FailedPrefetches,
		metrics.CacheHits,
		metrics.CacheMisses,
		metrics.ActiveUsers,
		metrics.AvgResponseTime,
	)
}

// cleanupRoutine performs periodic cleanup
func (e *Engine) cleanupRoutine(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			e.performCleanup()
		}
	}
}

// performCleanup performs cleanup of expired sessions and cache
func (e *Engine) performCleanup() {
	logrus.Info("🧹 Performing cleanup")

	// Clean up inactive users
	inactiveUsers := []string{}
	e.activeUsers.Range(func(key, value interface{}) bool {
		userID := key.(string)
		session := value.(*UserSession)
		
		if time.Since(session.LastActivity) > 30*time.Minute {
			inactiveUsers = append(inactiveUsers, userID)
		}
		return true
	})

	for _, userID := range inactiveUsers {
		e.activeUsers.Delete(userID)
		logrus.Infof("🗑️ Cleaned up inactive user: %s", userID)
	}

	// Update active user count
	e.metrics.mu.Lock()
	e.metrics.ActiveUsers = 0
	e.activeUsers.Range(func(key, value interface{}) bool {
		e.metrics.ActiveUsers++
		return true
	})
	e.metrics.mu.Unlock()

	logrus.Info("✅ Cleanup completed")
}

// Shutdown gracefully shuts down the engine
func (e *Engine) Shutdown(ctx context.Context) error {
	logrus.Info("🛑 Shutting down prefetcher engine")

	// Close all user sessions
	e.activeUsers.Range(func(key, value interface{}) bool {
		userID := key.(string)
		session := value.(*UserSession)
		close(session.PrefetchQueue)
		e.activeUsers.Delete(userID)
		return true
	})

	// Clear cache
	e.cache.Flush()

	logrus.Info("✅ Prefetcher engine shutdown completed")
	return nil
}

// HTTP Handlers
func (e *Engine) handlePrefetch(w http.ResponseWriter, r *http.Request) {
	// Handle prefetch requests
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (e *Engine) handleUser(w http.ResponseWriter, r *http.Request) {
	// Handle user requests
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (e *Engine) handleMetrics(w http.ResponseWriter, r *http.Request) {
	e.metrics.mu.RLock()
	metrics := *e.metrics
	e.metrics.mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}

func (e *Engine) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now(),
		"version":   "1.0.0",
	})
}

func (e *Engine) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Handle WebSocket connections for real-time updates
	conn, err := e.wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		logrus.Errorf("❌ WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	logrus.Info("🔗 WebSocket connection established")

	// Handle WebSocket messages
	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			logrus.Errorf("❌ WebSocket read error: %v", err)
			break
		}

		if messageType == websocket.TextMessage {
			logrus.Debugf("📨 Received WebSocket message: %s", string(p))
			
			// Process message and send response
			response := fmt.Sprintf("Echo: %s", string(p))
			if err := conn.WriteMessage(websocket.TextMessage, []byte(response)); err != nil {
				logrus.Errorf("❌ WebSocket write error: %v", err)
				break
			}
		}
	}
}
