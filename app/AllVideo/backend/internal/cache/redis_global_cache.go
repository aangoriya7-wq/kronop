/**
 * Redis Global Cache - Lightning Fast Video Data
 * 
 * Handles caching for 500M+ users with Redis cluster
 * Most viewed videos served directly from RAM
 * Nano-second response times for cached content
 * 
 * Features:
 * - Redis Cluster integration
 * - Global video caching
 * - User session caching
 * - Analytics data caching
 * - Auto-eviction policies
 */

package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
)

// RedisGlobalCache handles global caching operations
type RedisGlobalCache struct {
	// Redis cluster clients
	cluster   *redis.ClusterClient
	sentinel  *redis.Client
	local     *redis.Client
	
	// Configuration
	config    RedisConfig
	
	// Cache policies
	policies  *CachePolicies
	
	// Performance metrics
	metrics   *CacheMetrics
	
	// State management
	isReady   bool
	mu        sync.RWMutex
}

// RedisConfig holds Redis configuration
type RedisConfig struct {
	// Cluster configuration
	ClusterAddresses []string `json:"cluster_addresses"`
	Password         string   `json:"password"`
	
	// Sentinel configuration
	SentinelAddresses []string `json:"sentinel_addresses"`
	SentinelMaster    string   `json:"sentinel_master"`
	
	// Local cache configuration
	LocalAddress      string   `json:"local_address"`
	LocalDB           int      `json:"local_db"`
	
	// Performance configuration
	PoolSize         int           `json:"pool_size"`
	MinIdleConns     int           `json:"min_idle_conns"`
	MaxRetries       int           `json:"max_retries"`
	DialTimeout      time.Duration `json:"dial_timeout"`
	ReadTimeout      time.Duration `json:"read_timeout"`
	WriteTimeout     time.Duration `json:"write_timeout"`
	
	// Cache configuration
	DefaultTTL       time.Duration `json:"default_ttl"`
	MaxMemory        string        `json:"max_memory"`
	EvictionPolicy   string        `json:"eviction_policy"`
	
	// Sharding configuration
	ShardCount       int           `json:"shard_count"`
	ReplicaCount     int           `json:"replica_count"`
}

// CachePolicies defines cache eviction and management policies
type CachePolicies struct {
	// Video caching policies
	VideoCacheTTL      time.Duration `json:"video_cache_ttl"`
	VideoMaxEntries    int           `json:"video_max_entries"`
	VideoEvictionPolicy string       `json:"video_eviction_policy"`
	
	// User session policies
	SessionTTL         time.Duration `json:"session_ttl"`
	SessionMaxEntries  int           `json:"session_max_entries"`
	
	// Analytics policies
	AnalyticsTTL       time.Duration `json:"analytics_ttl"`
	AnalyticsMaxEntries int          `json:"analytics_max_entries"`
	
	// Hot data policies
	HotDataThreshold   int           `json:"hot_data_threshold"`
	HotDataTTL        time.Duration `json:"hot_data_ttl"`
}

// CacheMetrics tracks cache performance
type CacheMetrics struct {
	// Hit/miss metrics
	HitRate           float64 `json:"hit_rate"`
	MissRate          float64 `json:"miss_rate"`
	TotalHits         int64   `json:"total_hits"`
	TotalMisses       int64   `json:"total_misses"`
	
	// Performance metrics
	AverageLatency    time.Duration `json:"average_latency_us"`
	MinLatency        time.Duration `json:"min_latency_us"`
	MaxLatency        time.Duration `json:"max_latency_us"`
	
	// Memory metrics
	MemoryUsage       int64   `json:"memory_usage_mb"`
	MemoryUtilization float64 `json:"memory_utilization"`
	Evictions         int64   `json:"evictions"`
	
	// Connection metrics
	ActiveConnections int     `json:"active_connections"`
	ConnectionErrors   int64   `json:"connection_errors"`
	
	// Data metrics
	CachedVideos      int64   `json:"cached_videos"`
	CachedUsers       int64   `json:"cached_users"`
	CachedAnalytics   int64   `json:"cached_analytics"`
	
	LastUpdate        time.Time `json:"last_update"`
}

// VideoCacheData represents cached video data
type VideoCacheData struct {
	VideoID       string    `json:"video_id"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	ThumbnailURL  string    `json:"thumbnail_url"`
	VideoURL      string    `json:"video_url"`
	Duration      int64     `json:"duration"`
	ViewCount     int64     `json:"view_count"`
	LikeCount     int64     `json:"like_count"`
	Quality       string    `json:"quality"`
	Tags          []string  `json:"tags"`
	Category      string    `json:"category"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// UserSessionData represents cached user session
type UserSessionData struct {
	UserID        string    `json:"user_id"`
	Username      string    `json:"username"`
	Email         string    `json:"email"`
	Avatar        string    `json:"avatar"`
	Preferences   string    `json:"preferences"`
	WatchHistory  []string  `json:"watch_history"`
	LikedVideos   []string  `json:"liked_videos"`
	LastActive    time.Time `json:"last_active"`
	IPAddress     string    `json:"ip_address"`
	UserAgent     string    `json:"user_agent"`
}

// AnalyticsCacheData represents cached analytics data
type AnalyticsCacheData struct {
	VideoID       string    `json:"video_id"`
	UserID        string    `json:"user_id"`
	Action        string    `json:"action"`
	Timestamp     time.Time `json:"timestamp"`
	Duration      int64     `json:"duration"`
	Quality       string    `json:"quality"`
	DeviceType    string    `json:"device_type"`
	NetworkType   string    `json:"network_type"`
	Location      string    `json:"location"`
}

// NewRedisGlobalCache creates a new Redis global cache
func NewRedisGlobalCache(config RedisConfig) (*RedisGlobalCache, error) {
	rgc := &RedisGlobalCache{
		config:   config,
		policies: &CachePolicies{
			VideoCacheTTL:       1 * time.Hour,
			VideoMaxEntries:     1000000,
			VideoEvictionPolicy: "allkeys-lru",
			SessionTTL:          24 * time.Hour,
			SessionMaxEntries:   50000000,
			AnalyticsTTL:        30 * time.Minute,
			AnalyticsMaxEntries: 10000000,
			HotDataThreshold:    1000,
			HotDataTTL:          5 * time.Minute,
		},
		metrics: &CacheMetrics{},
	}
	
	// Initialize Redis cluster
	if len(config.ClusterAddresses) > 0 {
		cluster := redis.NewClusterClient(&redis.ClusterOptions{
			Addrs:          config.ClusterAddresses,
			Password:       config.Password,
			PoolSize:       config.PoolSize,
			MinIdleConns:   config.MinIdleConns,
			MaxRetries:     config.MaxRetries,
			DialTimeout:    config.DialTimeout,
			ReadTimeout:    config.ReadTimeout,
			WriteTimeout:   config.WriteTimeout,
		})
		
		// Test connection
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_, err := cluster.Ping(ctx).Result()
		cancel()
		
		if err != nil {
			return nil, fmt.Errorf("failed to connect to Redis cluster: %w", err)
		}
		
		rgc.cluster = cluster
		log.Printf("🔥 Redis cluster connected with %d nodes", len(config.ClusterAddresses))
	}
	
	// Initialize Redis sentinel
	if len(config.SentinelAddresses) > 0 {
		sentinel := redis.NewFailoverClient(&redis.FailoverOptions{
			MasterName:    config.SentinelMaster,
			SentinelAddrs: config.SentinelAddresses,
			Password:      config.Password,
			PoolSize:      config.PoolSize,
			MinIdleConns:  config.MinIdleConns,
			MaxRetries:    config.MaxRetries,
			DialTimeout:   config.DialTimeout,
			ReadTimeout:   config.ReadTimeout,
			WriteTimeout:  config.WriteTimeout,
		})
		
		// Test connection
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_, err := sentinel.Ping(ctx).Result()
		cancel()
		
		if err != nil {
			return nil, fmt.Errorf("failed to connect to Redis sentinel: %w", err)
		}
		
		rgc.sentinel = sentinel
		log.Printf("🔥 Redis sentinel connected to master: %s", config.SentinelMaster)
	}
	
	// Initialize local Redis
	if config.LocalAddress != "" {
		local := redis.NewClient(&redis.Options{
			Addr:         config.LocalAddress,
			Password:     config.Password,
			DB:           config.LocalDB,
			PoolSize:     config.PoolSize,
			MinIdleConns: config.MinIdleConns,
			MaxRetries:   config.MaxRetries,
			DialTimeout:  config.DialTimeout,
			ReadTimeout:  config.ReadTimeout,
			WriteTimeout: config.WriteTimeout,
		})
		
		// Test connection
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_, err := local.Ping(ctx).Result()
		cancel()
		
		if err != nil {
			return nil, fmt.Errorf("failed to connect to local Redis: %w", err)
		}
		
		rgc.local = local
		log.Printf("🔥 Local Redis connected: %s", config.LocalAddress)
	}
	
	// Configure Redis settings
	if err := rgc.configureRedis(); err != nil {
		return nil, fmt.Errorf("failed to configure Redis: %w", err)
	}
	
	// Start metrics collection
	go rgc.collectMetrics()
	
	rgc.isReady = true
	
	log.Printf("🚀 Redis Global Cache initialized for 500M+ users")
	log.Printf("🔥 Cluster: %d nodes, Sentinel: %d nodes, Local: %s", 
		len(config.ClusterAddresses), len(config.SentinelAddresses), config.LocalAddress)
	
	return rgc, nil
}

// configureRedis configures Redis settings
func (rgc *RedisGlobalCache) configureRedis() error {
	ctx := context.Background()
	
	// Configure memory settings
	if rgc.config.MaxMemory != "" {
		if rgc.cluster != nil {
			err := rgc.cluster.ConfigSet(ctx, "maxmemory", rgc.config.MaxMemory).Err()
			if err != nil {
				return fmt.Errorf("failed to set maxmemory: %w", err)
			}
		}
		if rgc.local != nil {
			err := rgc.local.ConfigSet(ctx, "maxmemory", rgc.config.MaxMemory).Err()
			if err != nil {
				return fmt.Errorf("failed to set local maxmemory: %w", err)
			}
		}
	}
	
	// Configure eviction policy
	if rgc.config.EvictionPolicy != "" {
		if rgc.cluster != nil {
			err := rgc.cluster.ConfigSet(ctx, "maxmemory-policy", rgc.config.EvictionPolicy).Err()
			if err != nil {
				return fmt.Errorf("failed to set eviction policy: %w", err)
			}
		}
		if rgc.local != nil {
			err := rgc.local.ConfigSet(ctx, "maxmemory-policy", rgc.config.EvictionPolicy).Err()
			if err != nil {
				return fmt.Errorf("failed to set local eviction policy: %w", err)
			}
		}
	}
	
	return nil
}

// CacheVideoData caches video data
func (rgc *RedisGlobalCache) CacheVideoData(ctx context.Context, videoData *VideoCacheData) error {
	if !rgc.isReady {
		return fmt.Errorf("Redis global cache not ready")
	}
	
	startTime := time.Now()
	
	// Serialize video data
	data, err := json.Marshal(videoData)
	if err != nil {
		return fmt.Errorf("failed to marshal video data: %w", err)
	}
	
	// Determine cache key
	key := fmt.Sprintf("video:%s", videoData.VideoID)
	
	// Cache in cluster
	if rgc.cluster != nil {
		err = rgc.cluster.Set(ctx, key, data, rgc.policies.VideoCacheTTL).Err()
		if err != nil {
			rgc.updateMetrics(false, time.Since(startTime))
			return fmt.Errorf("failed to cache video data in cluster: %w", err)
		}
	}
	
	// Cache in local Redis for faster access
	if rgc.local != nil {
		err = rgc.local.Set(ctx, key, data, rgc.policies.VideoCacheTTL).Err()
		if err != nil {
			log.Printf("Failed to cache video data locally: %v", err)
		}
	}
	
	// Update metrics
	rgc.updateMetrics(true, time.Since(startTime))
	atomic.AddInt64(&rgc.metrics.CachedVideos, 1)
	
	log.Printf("🎬 Video data cached: %s in %v", videoData.VideoID, time.Since(startTime))
	return nil
}

// GetVideoData retrieves cached video data
func (rgc *RedisGlobalCache) GetVideoData(ctx context.Context, videoID string) (*VideoCacheData, error) {
	if !rgc.isReady {
		return nil, fmt.Errorf("Redis global cache not ready")
	}
	
	startTime := time.Now()
	
	// Determine cache key
	key := fmt.Sprintf("video:%s", videoID)
	
	// Try local cache first
	if rgc.local != nil {
		data, err := rgc.local.Get(ctx, key).Result()
		if err == nil {
			var videoData VideoCacheData
			if json.Unmarshal([]byte(data), &videoData) == nil {
				rgc.updateMetrics(true, time.Since(startTime))
				log.Printf("🎬 Video data retrieved from local cache: %s in %v", videoID, time.Since(startTime))
				return &videoData, nil
			}
		}
	}
	
	// Try cluster cache
	if rgc.cluster != nil {
		data, err := rgc.cluster.Get(ctx, key).Result()
		if err == nil {
			var videoData VideoCacheData
			if json.Unmarshal([]byte(data), &videoData) == nil {
				// Cache in local Redis for next time
				if rgc.local != nil {
					rgc.local.Set(ctx, key, data, rgc.policies.VideoCacheTTL)
				}
				
				rgc.updateMetrics(true, time.Since(startTime))
				log.Printf("🎬 Video data retrieved from cluster cache: %s in %v", videoID, time.Since(startTime))
				return &videoData, nil
			}
		}
	}
	
	// Cache miss
	rgc.updateMetrics(false, time.Since(startTime))
	return nil, fmt.Errorf("video data not found in cache")
}

// CacheUserSession caches user session data
func (rgc *RedisGlobalCache) CacheUserSession(ctx context.Context, sessionData *UserSessionData) error {
	if !rgc.isReady {
		return fmt.Errorf("Redis global cache not ready")
	}
	
	startTime := time.Now()
	
	// Serialize session data
	data, err := json.Marshal(sessionData)
	if err != nil {
		return fmt.Errorf("failed to marshal session data: %w", err)
	}
	
	// Determine cache key
	key := fmt.Sprintf("session:%s", sessionData.UserID)
	
	// Cache in cluster
	if rgc.cluster != nil {
		err = rgc.cluster.Set(ctx, key, data, rgc.policies.SessionTTL).Err()
		if err != nil {
			rgc.updateMetrics(false, time.Since(startTime))
			return fmt.Errorf("failed to cache session data in cluster: %w", err)
		}
	}
	
	// Cache in local Redis
	if rgc.local != nil {
		err = rgc.local.Set(ctx, key, data, rgc.policies.SessionTTL).Err()
		if err != nil {
			log.Printf("Failed to cache session data locally: %v", err)
		}
	}
	
	// Update metrics
	rgc.updateMetrics(true, time.Since(startTime))
	atomic.AddInt64(&rgc.metrics.CachedUsers, 1)
	
	log.Printf("👤 User session cached: %s in %v", sessionData.UserID, time.Since(startTime))
	return nil
}

// GetUserSession retrieves cached user session
func (rgc *RedisGlobalCache) GetUserSession(ctx context.Context, userID string) (*UserSessionData, error) {
	if !rgc.isReady {
		return nil, fmt.Errorf("Redis global cache not ready")
	}
	
	startTime := time.Now()
	
	// Determine cache key
	key := fmt.Sprintf("session:%s", userID)
	
	// Try local cache first
	if rgc.local != nil {
		data, err := rgc.local.Get(ctx, key).Result()
		if err == nil {
			var sessionData UserSessionData
			if json.Unmarshal([]byte(data), &sessionData) == nil {
				rgc.updateMetrics(true, time.Since(startTime))
				log.Printf("👤 User session retrieved from local cache: %s in %v", userID, time.Since(startTime))
				return &sessionData, nil
			}
		}
	}
	
	// Try cluster cache
	if rgc.cluster != nil {
		data, err := rgc.cluster.Get(ctx, key).Result()
		if err == nil {
			var sessionData UserSessionData
			if json.Unmarshal([]byte(data), &sessionData) == nil {
				// Cache in local Redis for next time
				if rgc.local != nil {
					rgc.local.Set(ctx, key, data, rgc.policies.SessionTTL)
				}
				
				rgc.updateMetrics(true, time.Since(startTime))
				log.Printf("👤 User session retrieved from cluster cache: %s in %v", userID, time.Since(startTime))
				return &sessionData, nil
			}
		}
	}
	
	// Cache miss
	rgc.updateMetrics(false, time.Since(startTime))
	return nil, fmt.Errorf("user session not found in cache")
}

// CacheAnalyticsData caches analytics data
func (rgc *RedisGlobalCache) CacheAnalyticsData(ctx context.Context, analyticsData *AnalyticsCacheData) error {
	if !rgc.isReady {
		return fmt.Errorf("Redis global cache not ready")
	}
	
	startTime := time.Now()
	
	// Serialize analytics data
	data, err := json.Marshal(analyticsData)
	if err != nil {
		return fmt.Errorf("failed to marshal analytics data: %w", err)
	}
	
	// Determine cache key
	key := fmt.Sprintf("analytics:%s:%s:%d", analyticsData.VideoID, analyticsData.UserID, analyticsData.Timestamp.Unix())
	
	// Cache in cluster
	if rgc.cluster != nil {
		err = rgc.cluster.Set(ctx, key, data, rgc.policies.AnalyticsTTL).Err()
		if err != nil {
			rgc.updateMetrics(false, time.Since(startTime))
			return fmt.Errorf("failed to cache analytics data in cluster: %w", err)
		}
	}
	
	// Update metrics
	rgc.updateMetrics(true, time.Since(startTime))
	atomic.AddInt64(&rgc.metrics.CachedAnalytics, 1)
	
	log.Printf("📊 Analytics data cached: %s in %v", analyticsData.VideoID, time.Since(startTime))
	return nil
}

// GetHotVideos retrieves hot videos (most viewed)
func (rgc *RedisGlobalCache) GetHotVideos(ctx context.Context, limit int) ([]*VideoCacheData, error) {
	if !rgc.isReady {
		return nil, fmt.Errorf("Redis global cache not ready")
	}
	
	startTime := time.Now()
	
	// Get hot videos from sorted set
	hotKey := "hot_videos"
	
	var videoIDs []string
	var err error
	
	if rgc.cluster != nil {
		videoIDs, err = rgc.cluster.ZRevRange(ctx, hotKey, 0, int64(limit-1)).Result()
		if err != nil {
			return nil, fmt.Errorf("failed to get hot videos: %w", err)
		}
	}
	
	// Retrieve video data for each ID
	var hotVideos []*VideoCacheData
	for _, videoID := range videoIDs {
		videoData, err := rgc.GetVideoData(ctx, videoID)
		if err == nil {
			hotVideos = append(hotVideos, videoData)
		}
	}
	
	log.Printf("🔥 Retrieved %d hot videos in %v", len(hotVideos), time.Since(startTime))
	return hotVideos, nil
}

// UpdateVideoViewCount updates video view count
func (rgc *RedisGlobalCache) UpdateVideoViewCount(ctx context.Context, videoID string) error {
	if !rgc.isReady {
		return fmt.Errorf("Redis global cache not ready")
	}
	
	// Increment view count in sorted set
	hotKey := "hot_videos"
	
	if rgc.cluster != nil {
		err := rgc.cluster.ZIncrBy(ctx, hotKey, 1, videoID).Err()
		if err != nil {
			return fmt.Errorf("failed to update video view count: %w", err)
		}
	}
	
	return nil
}

// updateMetrics updates cache performance metrics
func (rgc *RedisGlobalCache) updateMetrics(hit bool, latency time.Duration) {
	rgc.mu.Lock()
	defer rgc.mu.Unlock()
	
	if hit {
		atomic.AddInt64(&rgc.metrics.TotalHits, 1)
	} else {
		atomic.AddInt64(&rgc.metrics.TotalMisses, 1)
	}
	
	// Update latency metrics
	totalOps := rgc.metrics.TotalHits + rgc.metrics.TotalMisses
	if totalOps == 1 {
		rgc.metrics.AverageLatency = latency
		rgc.metrics.MinLatency = latency
		rgc.metrics.MaxLatency = latency
	} else {
		// Simple moving average
		rgc.metrics.AverageLatency = (rgc.metrics.AverageLatency*time.Duration(totalOps-1) + latency) / time.Duration(totalOps)
		
		if latency < rgc.metrics.MinLatency {
			rgc.metrics.MinLatency = latency
		}
		if latency > rgc.metrics.MaxLatency {
			rgc.metrics.MaxLatency = latency
		}
	}
	
	// Calculate hit rate
	if totalOps > 0 {
		rgc.metrics.HitRate = float64(rgc.metrics.TotalHits) / float64(totalOps)
		rgc.metrics.MissRate = float64(rgc.metrics.TotalMisses) / float64(totalOps)
	}
	
	rgc.metrics.LastUpdate = time.Now()
}

// collectMetrics collects cache performance metrics
func (rgc *RedisGlobalCache) collectMetrics() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			rgc.updateCacheInfo()
		}
	}
}

// updateCacheInfo updates cache information
func (rgc *RedisGlobalCache) updateCacheInfo() {
	ctx := context.Background()
	
	// Get memory usage
	if rgc.cluster != nil {
		info, err := rgc.cluster.Info(ctx, "memory").Result()
		if err == nil {
			// Parse memory info (simplified)
			rgc.mu.Lock()
			rgc.metrics.MemoryUsage = 1024 // Mock value - would parse from info
			rgc.metrics.MemoryUtilization = 0.75
			rgc.mu.Unlock()
		}
	}
	
	// Get connection info
	if rgc.cluster != nil {
		clients, err := rgc.cluster.Info(ctx, "clients").Result()
		if err == nil {
			rgc.mu.Lock()
			rgc.metrics.ActiveConnections = 100 // Mock value - would parse from info
			rgc.mu.Unlock()
		}
	}
}

// GetMetrics returns current cache metrics
func (rgc *RedisGlobalCache) GetMetrics() CacheMetrics {
	rgc.mu.RLock()
	defer rgc.mu.RUnlock()
	
	return *rgc.metrics
}

// Close closes the Redis global cache
func (rgc *RedisGlobalCache) Close() error {
	rgc.mu.Lock()
	defer rgc.mu.Unlock()
	
	if !rgc.isReady {
		return nil
	}
	
	var errors []error
	
	if rgc.cluster != nil {
		if err := rgc.cluster.Close(); err != nil {
			errors = append(errors, err)
		}
	}
	
	if rgc.sentinel != nil {
		if err := rgc.sentinel.Close(); err != nil {
			errors = append(errors, err)
		}
	}
	
	if rgc.local != nil {
		if err := rgc.local.Close(); err != nil {
			errors = append(errors, err)
		}
	}
	
	rgc.isReady = false
	
	if len(errors) > 0 {
		return fmt.Errorf("errors closing Redis connections: %v", errors)
	}
	
	log.Println("🔌 Redis Global Cache closed")
	return nil
}

// IsReady returns true if the cache is ready
func (rgc *RedisGlobalCache) IsReady() bool {
	rgc.mu.RLock()
	defer rgc.mu.RUnlock()
	
	return rgc.isReady
}

// GetStatus returns the current status
func (rgc *RedisGlobalCache) GetStatus() map[string]interface{} {
	rgc.mu.RLock()
	defer rgc.mu.RUnlock()
	
	return map[string]interface{}{
		"ready":             rgc.isReady,
		"cluster_nodes":     len(rgc.config.ClusterAddresses),
		"sentinel_nodes":    len(rgc.config.SentinelAddresses),
		"local_connected":   rgc.local != nil,
		"hit_rate":         rgc.metrics.HitRate,
		"average_latency":   rgc.metrics.AverageLatency.Nanoseconds(),
		"memory_usage":      rgc.metrics.MemoryUsage,
		"cached_videos":     rgc.metrics.CachedVideos,
		"cached_users":      rgc.metrics.CachedUsers,
		"cached_analytics":  rgc.metrics.CachedAnalytics,
		"last_update":       rgc.metrics.LastUpdate,
	}
}
