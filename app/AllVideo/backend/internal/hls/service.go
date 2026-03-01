package hls

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"kronop-backend/internal/network"
	"kronop-backend/internal/cache"
)

type Service struct {
	networkOptimizer *network.Optimizer
	cacheManager    *cache.Manager
	prefetchQueue    chan PrefetchJob
}

type VideoQuality struct {
	Resolution string
	Bitrate    int
	Bandwidth  int
	Codec      string
}

type PrefetchJob struct {
	VideoID   string
	Quality   string
	Segments  []string
	Priority  int
	Timestamp time.Time
}

var (
	// Adaptive bitrate qualities optimized for different network conditions
	Qualities = map[string]VideoQuality{
		"auto":   {Resolution: "auto", Bitrate: 0, Bandwidth: 0, Codec: "h264"},
		"4k":     {Resolution: "3840x2160", Bitrate: 15000, Bandwidth: 20000, Codec: "h264"},
		"1080p":  {Resolution: "1920x1080", Bitrate: 5000, Bandwidth: 8000, Codec: "h264"},
		"720p":   {Resolution: "1280x720", Bitrate: 2500, Bandwidth: 4000, Codec: "h264"},
		"480p":   {Resolution: "854x480", Bitrate: 1200, Bandwidth: 2000, Codec: "h264"},
		"360p":   {Resolution: "640x360", Bitrate: 800, Bandwidth: 1200, Codec: "h264"},
		"240p":   {Resolution: "426x240", Bitrate: 400, Bandwidth: 600, Codec: "h264"},
		"144p":   {Resolution: "256x144", Bitrate: 200, Bandwidth: 300, Codec: "h264"}, // 2G optimized
	}
)

func NewService() *Service {
	s := &Service{
		networkOptimizer: network.NewOptimizer(),
		cacheManager:     cache.NewManager(),
		prefetchQueue:    make(chan PrefetchJob, 100),
	}
	
	// Start prefetch workers
	go s.startPrefetchWorkers()
	
	return s
}

// GetMasterPlaylist returns the main HLS playlist with adaptive bitrate
func (s *Service) GetMasterPlaylist(c *gin.Context) {
	videoID := c.Param("videoId")
	
	// Detect network quality
	networkQuality := s.networkOptimizer.GetCurrentQuality()
	
	// Generate master playlist with network-aware quality selection
	playlist := s.generateMasterPlaylist(videoID, networkQuality)
	
	c.Header("Content-Type", "application/vnd.apple.mpegurl")
	c.String(http.StatusOK, playlist)
}

// GetQualityPlaylist returns quality-specific playlist
func (s *Service) GetQualityPlaylist(c *gin.Context) {
	videoID := c.Param("videoId")
	quality := c.Param("quality")
	
	// Validate quality exists
	if _, exists := Qualities[quality]; !exists && quality != "auto" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid quality"})
		return
	}
	
	// Get network quality for auto selection
	if quality == "auto" {
		quality = s.selectOptimalQuality()
	}
	
	playlist := s.generateQualityPlaylist(videoID, quality)
	
	c.Header("Content-Type", "application/vnd.apple.mpegurl")
	c.String(http.StatusOK, playlist)
}

// GetSegment serves individual video segments with caching
func (s *Service) GetSegment(c *gin.Context) {
	videoID := c.Param("videoId")
	quality := c.Param("quality")
	segment := c.Param("segment")
	
	// Check cache first
	cacheKey := fmt.Sprintf("segment:%s:%s:%s", videoID, quality, segment)
	if cached, found := s.cacheManager.Get(cacheKey); found {
		c.Header("Content-Type", "video/mp4")
		c.Header("Cache-Control", "public, max-age=3600")
		c.Data(http.StatusOK, "video/mp4", cached)
		return
	}
	
	// Generate segment URL (in production, this would fetch from CDN/storage)
	segmentURL := s.generateSegmentURL(videoID, quality, segment)
	
	// Fetch segment with retry logic for poor networks
	segmentData, err := s.fetchSegmentWithRetry(segmentURL)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Segment unavailable"})
		return
	}
	
	// Cache the segment
	s.cacheManager.Set(cacheKey, segmentData, 30*time.Minute)
	
	c.Header("Content-Type", "video/mp4")
	c.Header("Cache-Control", "public, max-age=3600")
	c.Data(http.StatusOK, "video/mp4", segmentData)
}

// PrefetchSegments implements hyper-fetching for smooth playback
func (s *Service) PrefetchSegments(c *gin.Context) {
	var request struct {
		VideoID  string   `json:"videoId" binding:"required"`
		Quality  string   `json:"quality"`
		Segments []string `json:"segments" binding:"required"`
		Priority int     `json:"priority"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Auto-select quality if not specified
	if request.Quality == "" {
		request.Quality = s.selectOptimalQuality()
	}
	
	// Create prefetch job
	job := PrefetchJob{
		VideoID:   request.VideoID,
		Quality:   request.Quality,
		Segments:  request.Segments,
		Priority:  request.Priority,
		Timestamp: time.Now(),
	}
	
	// Queue for prefetching
	select {
	case s.prefetchQueue <- job:
		c.JSON(http.StatusOK, gin.H{"status": "queued", "jobId": fmt.Sprintf("%d", time.Now().UnixNano())})
	default:
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "Prefetch queue full"})
	}
}

// GetPrefetchStatus returns prefetch progress
func (s *Service) GetPrefetchStatus(c *gin.Context) {
	videoID := c.Param("videoId")
	
	status := s.cacheManager.GetPrefetchStatus(videoID)
	c.JSON(http.StatusOK, status)
}

// generateMasterPlaylist creates HLS master playlist with adaptive bitrate
func (s *Service) generateMasterPlaylist(videoID string, networkQuality string) string {
	var playlist strings.Builder
	
	playlist.WriteString("#EXTM3U\n")
	playlist.WriteString("#EXT-X-VERSION:6\n")
	playlist.WriteString(fmt.Sprintf("#EXT-X-INDEPENDENT-SEGMENTS\n"))
	
	// Add quality variants based on network conditions
	qualities := s.getQualitiesForNetwork(networkQuality)
	
	for _, quality := range qualities {
		q := Qualities[quality]
		playlist.WriteString(fmt.Sprintf("#EXT-X-STREAM-INF:BANDWIDTH=%d,AVERAGE-BANDWIDTH=%d,RESOLUTION=%s,CODECS=\"%s\",FRAME-RATE=30.000\n",
			q.Bandwidth*1000, q.Bitrate*1000, q.Resolution, q.Codec))
		playlist.WriteString(fmt.Sprintf("%s/%s/playlist.m3u8\n", videoID, quality))
	}
	
	return playlist.String()
}

// generateQualityPlaylist creates quality-specific segment playlist
func (s *Service) generateQualityPlaylist(videoID, quality string) string {
	var playlist strings.Builder
	
	playlist.WriteString("#EXTM3U\n")
	playlist.WriteString("#EXT-X-VERSION:6\n")
	playlist.WriteString("#EXT-X-TARGETDURATION:10\n")
	playlist.WriteString("#EXT-X-MEDIA-SEQUENCE:0\n")
	playlist.WriteString("#EXT-X-PLAYLIST-TYPE:VOD\n")
	
	// Generate segments (in production, this would be dynamic)
	segmentDuration := 6.0 // 6-second segments for better buffering on poor networks
	totalDuration := 600.0 // 10 minutes video
	numSegments := int(totalDuration / segmentDuration)
	
	for i := 0; i < numSegments; i++ {
		playlist.WriteString(fmt.Sprintf("#EXTINF:%.3f,\n", segmentDuration))
		playlist.WriteString(fmt.Sprintf("%s/%s/segment_%d.ts\n", videoID, quality, i))
	}
	
	playlist.WriteString("#EXT-X-ENDLIST\n")
	return playlist.String()
}

// selectOptimalQuality chooses best quality based on current network conditions
func (s *Service) selectOptimalQuality() string {
	networkQuality := s.networkOptimizer.GetCurrentQuality()
	
	switch networkQuality {
	case "2g":
		return "144p"
	case "3g":
		return "240p"
	case "4g":
		return "480p"
	case "wifi":
		return "1080p"
	case "4g+":
		return "4k"
	default:
		return "360p" // Safe default
	}
}

// getQualitiesForNetwork returns available qualities for network type
func (s *Service) getQualitiesForNetwork(networkQuality string) []string {
	switch networkQuality {
	case "2g":
		return []string{"144p", "240p"}
	case "3g":
		return []string{"240p", "360p", "480p"}
	case "4g":
		return []string{"360p", "480p", "720p", "1080p"}
	case "wifi":
		return []string{"480p", "720p", "1080p", "4k"}
	case "4g+":
		return []string{"720p", "1080p", "4k"}
	default:
		return []string{"240p", "360p", "480p", "720p"}
	}
}

// fetchSegmentWithRetry implements retry logic for poor networks
func (s *Service) fetchSegmentWithRetry(url string) ([]byte, error) {
	maxRetries := 3
	baseDelay := 100 * time.Millisecond
	
	for attempt := 0; attempt < maxRetries; attempt++ {
		// Exponential backoff
		if attempt > 0 {
			delay := baseDelay * time.Duration(1<<uint(attempt-1))
			time.Sleep(delay)
		}
		
		// In production, fetch from actual CDN/storage
		// For now, return mock segment data
		segmentData := s.generateMockSegment()
		return segmentData, nil
	}
	
	return nil, fmt.Errorf("failed to fetch segment after %d attempts", maxRetries)
}

// generateSegmentURL creates segment URL
func (s *Service) generateSegmentURL(videoID, quality, segment string) string {
	return fmt.Sprintf("https://cdn.kronop.com/videos/%s/%s/%s", videoID, quality, segment)
}

// generateMockSegment creates mock segment data (for testing)
func (s *Service) generateMockSegment() []byte {
	// Return mock MP4 segment data
	return []byte("mock-segment-data")
}

// startPrefetchWorkers runs background workers for hyper-fetching
func (s *Service) startPrefetchWorkers() {
	numWorkers := 3 // Concurrent prefetch workers
	
	for i := 0; i < numWorkers; i++ {
		go func(workerID int) {
			for job := range s.prefetchQueue {
				s.processPrefetchJob(job, workerID)
			}
		}(i)
	}
}

// processPrefetchJob handles individual prefetch jobs
func (s *Service) processPrefetchJob(job PrefetchJob, workerID int) {
	for _, segment := range job.Segments {
		cacheKey := fmt.Sprintf("segment:%s:%s:%s", job.VideoID, job.Quality, segment)
		
		// Skip if already cached
		if _, found := s.cacheManager.Get(cacheKey); found {
			continue
		}
		
		// Fetch and cache segment
		segmentURL := s.generateSegmentURL(job.VideoID, job.Quality, segment)
		if segmentData, err := s.fetchSegmentWithRetry(segmentURL); err == nil {
			s.cacheManager.Set(cacheKey, segmentData, 30*time.Minute)
		}
		
		// Small delay to prevent overwhelming network
		time.Sleep(50 * time.Millisecond)
	}
}
