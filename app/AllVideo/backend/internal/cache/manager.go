package cache

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type Manager struct {
	mu           sync.RWMutex
	cache        map[string]*CacheEntry
	maxSize      int64
	currentSize  int64
	prefetchJobs map[string]*PrefetchStatus
}

type CacheEntry struct {
	Key        string
	Data       []byte
	Size       int64
	AccessTime time.Time
	ExpireTime time.Time
	HitCount   int64
	Priority   int // 0=low, 1=medium, 2=high
}

type PrefetchStatus struct {
	VideoID      string
	TotalSegments int
	CachedSegments int
	Quality      string
	StartTime    time.Time
	LastUpdate   time.Time
	Status       string // "queued", "in_progress", "completed", "failed"
}

type CacheStats struct {
	TotalEntries    int     `json:"totalEntries"`
	TotalSize       int64   `json:"totalSize"`       // bytes
	HitRate         float64 `json:"hitRate"`         // percentage
	AverageHitCount float64 `json:"averageHitCount"`
	OldestEntry     string  `json:"oldestEntry"`
	NewestEntry     string  `json:"newestEntry"`
	PrefetchJobs    int     `json:"prefetchJobs"`
}

func NewManager() *Manager {
	return &Manager{
		cache:        make(map[string]*CacheEntry),
		maxSize:      1024 * 1024 * 1024, // 1GB default cache size
		prefetchJobs: make(map[string]*PrefetchStatus),
	}
	
	// Start cleanup goroutine
	go m.startCleanupRoutine()
}

// Get retrieves data from cache
func (m *Manager) Get(key string) ([]byte, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	entry, exists := m.cache[key]
	if !exists {
		return nil, false
	}
	
	// Check expiration
	if time.Now().After(entry.ExpireTime) {
		delete(m.cache, key)
		m.currentSize -= entry.Size
		return nil, false
	}
	
	// Update access statistics
	entry.AccessTime = time.Now()
	entry.HitCount++
	
	return entry.Data, true
}

// Set stores data in cache with LRU eviction
func (m *Manager) Set(key string, data []byte, ttl time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	size := int64(len(data))
	
	// Check if we need to evict entries
	for m.currentSize+size > m.maxSize {
		if !m.evictLRU() {
			break // Can't evict more, cache is full of high-priority items
		}
	}
	
	// Remove existing entry if present
	if existing, exists := m.cache[key]; exists {
		m.currentSize -= existing.Size
	}
	
	// Add new entry
	now := time.Now()
	m.cache[key] = &CacheEntry{
		Key:        key,
		Data:       data,
		Size:       size,
		AccessTime: now,
		ExpireTime: now.Add(ttl),
		HitCount:   0,
		Priority:   1, // Default medium priority
	}
	
	m.currentSize += size
}

// SetPriority sets priority for cache entry
func (m *Manager) SetPriority(key string, priority int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	if entry, exists := m.cache[key]; exists {
		entry.Priority = priority
	}
}

// Delete removes entry from cache
func (m *Manager) Delete(key string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	if entry, exists := m.cache[key]; exists {
		delete(m.cache, key)
		m.currentSize -= entry.Size
	}
}

// ClearCache empties the entire cache
func (m *Manager) ClearCache(c *gin.Context) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	m.cache = make(map[string]*CacheEntry)
	m.currentSize = 0
	m.prefetchJobs = make(map[string]*PrefetchStatus)
	
	c.JSON(http.StatusOK, gin.H{"message": "Cache cleared successfully"})
}

// GetStatus returns cache statistics
func (m *Manager) GetStatus(c *gin.Context) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	stats := m.calculateStats()
	c.JSON(http.StatusOK, stats)
}

// GetPrefetchStatus returns prefetch job status
func (m *Manager) GetPrefetchStatus(videoID string) map[string]interface{} {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	status, exists := m.prefetchJobs[videoID]
	if !exists {
		return map[string]interface{}{
			"status": "not_found",
			"videoId": videoID,
		}
	}
	
	// Calculate progress
	progress := 0.0
	if status.TotalSegments > 0 {
		progress = float64(status.CachedSegments) / float64(status.TotalSegments) * 100
	}
	
	return map[string]interface{}{
		"videoId":        status.VideoID,
		"quality":        status.Quality,
		"totalSegments":  status.TotalSegments,
		"cachedSegments": status.CachedSegments,
		"progress":       progress,
		"status":         status.Status,
		"startTime":      status.StartTime,
		"lastUpdate":     status.LastUpdate,
	}
}

// UpdatePrefetchStatus updates prefetch job status
func (m *Manager) UpdatePrefetchStatus(videoID, quality string, totalSegments, cachedSegments int, status string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	now := time.Now()
	m.prefetchJobs[videoID] = &PrefetchStatus{
		VideoID:       videoID,
		TotalSegments: totalSegments,
		CachedSegments: cachedSegments,
		Quality:       quality,
		StartTime:     now,
		LastUpdate:    now,
		Status:        status,
	}
}

// evictLRU removes least recently used entry
func (m *Manager) evictLRU() bool {
	if len(m.cache) == 0 {
		return false
	}
	
	// Find LRU entry with lowest priority
	var oldestKey string
	var oldestTime time.Time
	var lowestPriority int = 3 // Higher than any actual priority
	
	for key, entry := range m.cache {
		// Skip high priority entries
		if entry.Priority >= 2 {
			continue
		}
		
		if oldestKey == "" || entry.AccessTime.Before(oldestTime) || 
		   (entry.AccessTime.Equal(oldestTime) && entry.Priority < lowestPriority) {
			oldestKey = key
			oldestTime = entry.AccessTime
			lowestPriority = entry.Priority
		}
	}
	
	if oldestKey != "" {
		if entry := m.cache[oldestKey]; entry != nil {
			m.currentSize -= entry.Size
		}
		delete(m.cache, oldestKey)
		return true
	}
	
	return false
}

// calculateStats computes cache statistics
func (m *Manager) calculateStats() CacheStats {
	stats := CacheStats{
		TotalEntries: len(m.cache),
		TotalSize:    m.currentSize,
		PrefetchJobs: len(m.prefetchJobs),
	}
	
	if len(m.cache) == 0 {
		return stats
	}
	
	var totalHits int64
	var oldestTime, newestTime time.Time
	var oldestKey, newestKey string
	
	for key, entry := range m.cache {
		totalHits += entry.HitCount
		
		if oldestKey == "" || entry.AccessTime.Before(oldestTime) {
			oldestKey = key
			oldestTime = entry.AccessTime
		}
		
		if newestKey == "" || entry.AccessTime.After(newestTime) {
			newestKey = key
			newestTime = entry.AccessTime
		}
	}
	
	stats.AverageHitCount = float64(totalHits) / float64(len(m.cache))
	stats.OldestEntry = oldestKey
	stats.NewestEntry = newestKey
	
	// Calculate hit rate (simplified - would need total requests for accurate rate)
	stats.HitRate = float64(totalHits) / float64(len(m.cache)) * 100
	
	return stats
}

// startCleanupRoutine removes expired entries periodically
func (m *Manager) startCleanupRoutine() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	
	for range ticker.C {
		m.cleanupExpired()
	}
}

// cleanupExpired removes expired entries
func (m *Manager) cleanupExpired() {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	now := time.Now()
	expiredKeys := make([]string, 0)
	
	for key, entry := range m.cache {
		if now.After(entry.ExpireTime) {
			expiredKeys = append(expiredKeys, key)
		}
	}
	
	for _, key := range expiredKeys {
		if entry := m.cache[key]; entry != nil {
			m.currentSize -= entry.Size
		}
		delete(m.cache, key)
	}
	
	// Clean up old prefetch jobs (older than 1 hour)
	cutoff := now.Add(-time.Hour)
	for videoID, status := range m.prefetchJobs {
		if status.StartTime.Before(cutoff) {
			delete(m.prefetchJobs, videoID)
		}
	}
}

// GenerateCacheKey creates consistent cache key
func (m *Manager) GenerateCacheKey(videoID, quality, segment string) string {
	key := fmt.Sprintf("%s:%s:%s", videoID, quality, segment)
	hash := sha256.Sum256([]byte(key))
	return hex.EncodeToString(hash[:16]) // Use first 16 chars for shorter keys
}

// GetCachedSegments returns list of cached segments for a video
func (m *Manager) GetCachedSegments(videoID, quality string) []string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	var segments []string
	prefix := fmt.Sprintf("%s:%s:", videoID, quality)
	
	for key := range m.cache {
		if len(key) > len(prefix) && key[:len(prefix)] == prefix {
			// Extract segment name from key
			segment := key[len(prefix):]
			segments = append(segments, segment)
		}
	}
	
	sort.Strings(segments) // Return in order
	return segments
}

// PrefetchVideo initiates prefetching for entire video
func (m *Manager) PrefetchVideo(videoID, quality string, segmentCount int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	m.prefetchJobs[videoID] = &PrefetchStatus{
		VideoID:       videoID,
		TotalSegments: segmentCount,
		CachedSegments: 0,
		Quality:       quality,
		StartTime:     time.Now(),
		LastUpdate:    time.Now(),
		Status:        "queued",
	}
}

// IncrementCachedSegments increments cached segment count
func (m *Manager) IncrementCachedSegments(videoID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	if status, exists := m.prefetchJobs[videoID]; exists {
		status.CachedSegments++
		status.LastUpdate = time.Now()
		
		// Update status if completed
		if status.CachedSegments >= status.TotalSegments {
			status.Status = "completed"
		} else {
			status.Status = "in_progress"
		}
	}
}

// SetPrefetchStatus sets prefetch job status
func (m *Manager) SetPrefetchStatus(videoID, status string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	if job, exists := m.prefetchJobs[videoID]; exists {
		job.Status = status
		job.LastUpdate = time.Now()
	}
}
