package streaming

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"kronop-backend/internal/network"
	"kronop-backend/internal/cache"
	"kronop-backend/internal/buffer"
)

type Service struct {
	chunker           *Chunker
	abrManager        *ABRManager
	predictiveManager *PredictiveManager
	networkOptimizer  *network.Optimizer
	cacheManager      *cache.Manager
	bufferManager     *buffer.Manager
}

func NewService(networkOptimizer *network.Optimizer, cacheManager *cache.Manager, bufferManager *buffer.Manager) *Service {
	return &Service{
		chunker:           NewChunker("/input", "/output"),
		abrManager:        NewABRManager(networkOptimizer),
		predictiveManager: NewPredictiveManager(networkOptimizer, cacheManager),
		networkOptimizer:  networkOptimizer,
		cacheManager:      cacheManager,
		bufferManager:     bufferManager,
	}
}

// RegisterStreamingRoutes registers all streaming endpoints
func (s *Service) RegisterStreamingRoutes(router *gin.RouterGroup) {
	streaming := router.Group("/streaming")
	{
		// HLS Streaming endpoints
		streaming.GET("/:videoId/master.m3u8", s.GetMasterPlaylist)
		streaming.GET("/:videoId/:quality/playlist.m3u8", s.GetQualityPlaylist)
		streaming.GET("/:videoId/:quality/segment_:segment.ts", s.GetVideoSegment)
		
		// Video transcoding endpoints
		streaming.POST("/transcode", s.TranscodeVideo)
		streaming.GET("/transcode/:jobId/status", s.GetTranscodeStatus)
		
		// Adaptive Bitrate endpoints
		streaming.POST("/abr/session", s.CreateABRSession)
		streaming.GET("/abr/session/:sessionId/decision", s.GetABRDecision)
		streaming.POST("/abr/session/:sessionId/buffer", s.UpdateBufferHealth)
		streaming.GET("/abr/session/:sessionId/stats", s.GetSessionStats)
		
		// Predictive prefetching endpoints
		streaming.POST("/predictive/start", s.StartPredictivePrefetching)
		streaming.GET("/predictive/status/:userId", s.GetPrefetchStatus)
		streaming.POST("/predictive/progress", s.UpdateWatchProgress)
		
		// Chunk management endpoints
		streaming.GET("/chunks/:videoId/:quality/manifest", s.GetChunkManifest)
		streaming.GET("/chunks/:videoId/quality", s.GetAvailableQualities)
		streaming.POST("/chunks/:videoId/verify", s.VerifyChunkIntegrity)
	}
}

// GetMasterPlaylist serves the HLS master playlist
func (s *Service) GetMasterPlaylist(c *gin.Context) {
	videoID := c.Param("videoId")
	
	playlistPath, err := s.chunker.GetMasterPlaylist(videoID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Master playlist not found"})
		return
	}
	
	// Read and serve playlist
	c.File(playlistPath)
}

// GetQualityPlaylist serves quality-specific HLS playlist
func (s *Service) GetQualityPlaylist(c *gin.Context) {
	videoID := c.Param("videoId")
	quality := c.Param("quality")
	
	// Validate quality
	if !s.isValidQuality(quality) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid quality"})
		return
	}
	
	playlistPath, err := s.chunker.GetPlaylist(videoID, quality)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quality playlist not found"})
		return
	}
	
	c.File(playlistPath)
}

// GetVideoSegment serves individual video segments
func (s *Service) GetVideoSegment(c *gin.Context) {
	videoID := c.Param("videoId")
	quality := c.Param("quality")
	segment := c.Param("segment")
	
	// Check cache first
	cacheKey := fmt.Sprintf("segment:%s:%s:%s", videoID, quality, segment)
	if cached, found := s.cacheManager.Get(cacheKey); found {
		c.Header("Content-Type", "video/mp2t")
		c.Header("Cache-Control", "public, max-age=3600")
		c.Data(http.StatusOK, "video/mp2t", cached)
		return
	}
	
	// Get chunk from storage
	chunkPath, err := s.chunker.GetChunkStream(videoID, quality, segment)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Segment not found"})
		return
	}
	
	// Serve chunk with caching
	c.Header("Content-Type", "video/mp2t")
	c.Header("Cache-Control", "public, max-age=3600")
	c.File(chunkPath)
}

// TranscodeVideo starts video transcoding process
func (s *Service) TranscodeVideo(c *gin.Context) {
	var request struct {
		VideoID   string `json:"videoId" binding:"required"`
		InputPath string `json:"inputPath" binding:"required"`
		Qualities []string `json:"qualities"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Use default qualities if not specified
	if len(request.Qualities) == 0 {
		request.Qualities = []string{"144p", "240p", "360p", "480p", "720p", "1080p", "4k"}
	}
	
	// Start transcoding in background
	go func() {
		err := s.chunker.TranscodeVideo(c.Request.Context(), request.VideoID, request.InputPath)
		if err != nil {
			fmt.Printf("Transcoding failed for video %s: %v", request.VideoID, err)
		}
	}()
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Transcoding started",
		"videoId": request.VideoID,
		"qualities": request.Qualities,
	})
}

// GetTranscodeStatus returns transcoding progress
func (s *Service) GetTranscodeStatus(c *gin.Context) {
	jobID := c.Param("jobId")
	
	// Mock status (would track actual transcoding jobs)
	status := map[string]interface{}{
		"jobId":    jobID,
		"status":   "completed",
		"progress": 100.0,
		"qualities": []string{"144p", "240p", "360p", "480p", "720p", "1080p", "4k"},
	}
	
	c.JSON(http.StatusOK, status)
}

// CreateABRSession creates adaptive bitrate session
func (s *Service) CreateABRSession(c *gin.Context) {
	s.abrManager.CreateABRSession(c)
}

// GetABRDecision returns current ABR decision
func (s *Service) GetABRDecision(c *gin.Context) {
	s.abrManager.GetABRDecision(c)
}

// UpdateBufferHealth updates buffer health for ABR
func (s *Service) UpdateBufferHealth(c *gin.Context) {
	s.abrManager.UpdateBufferHealth(c)
}

// GetSessionStats returns ABR session statistics
func (s *Service) GetSessionStats(c *gin.Context) {
	s.abrManager.GetSessionStats(c)
}

// StartPredictivePrefetching initiates predictive pre-fetching
func (s *Service) StartPredictivePrefetching(c *gin.Context) {
	s.predictiveManager.StartPredictivePrefetching(c)
}

// GetPrefetchStatus returns prefetch status
func (s *Service) GetPrefetchStatus(c *gin.Context) {
	s.predictiveManager.GetPrefetchStatus(c)
}

// UpdateWatchProgress updates viewing progress
func (s *Service) UpdateWatchProgress(c *gin.Context) {
	s.predictiveManager.UpdateWatchProgress(c)
}

// GetChunkManifest returns chunk manifest for a video
func (s *Service) GetChunkManifest(c *gin.Context) {
	videoID := c.Param("videoId")
	quality := c.Query("quality")
	
	if quality == "" {
		quality = "720p" // Default quality
	}
	
	// Read manifest file
	manifestPath := filepath.Join("/output", videoID, fmt.Sprintf("%s_manifest.json", quality))
	c.File(manifestPath)
}

// GetAvailableQualities returns available qualities for a video
func (s *Service) GetAvailableQualities(c *gin.Context) {
	videoID := c.Param("videoId")
	
	// Check which qualities are available
	var availableQualities []string
	for _, quality := range QualityProfiles {
		playlistPath := filepath.Join("/output", videoID, quality.Name, "playlist.m3u8")
		if s.fileExists(playlistPath) {
			availableQualities = append(availableQualities, quality.Name)
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"videoId": videoID,
		"qualities": availableQualities,
	})
}

// VerifyChunkIntegrity verifies chunk checksums
func (s *Service) VerifyChunkIntegrity(c *gin.Context) {
	var request struct {
		VideoID  string            `json:"videoId" binding:"required"`
		Quality  string            `json:"quality" binding:"required"`
		Chunks   map[string]string `json:"chunks"` // chunkName -> expectedChecksum
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	results := make(map[string]bool)
	for chunkName, expectedChecksum := range request.Chunks {
		chunkPath := filepath.Join("/output", request.VideoID, request.Quality, chunkName)
		actualChecksum := generateChecksum(chunkPath)
		results[chunkName] = (actualChecksum == expectedChecksum)
	}
	
	c.JSON(http.StatusOK, gin.H{
		"videoId": request.VideoID,
		"quality": request.Quality,
		"results": results,
	})
}

// Helper functions

func (s *Service) isValidQuality(quality string) bool {
	for _, profile := range QualityProfiles {
		if profile.Name == quality {
			return true
		}
	}
	return false
}

func (s *Service) fileExists(path string) bool {
	// Mock file existence check
	return true
}

func generateChecksum(filePath string) string {
	// Mock checksum generation
	return "mock-checksum"
}
