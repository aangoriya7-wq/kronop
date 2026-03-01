package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lucas-clemente/quic-go"
	"github.com/lucas-clemente/quic-go/http3"
	"kronop-backend/internal/hls"
	"kronop-backend/internal/network"
	"kronop-backend/internal/cache"
	"kronop-backend/internal/buffer"
	"kronop-backend/internal/streaming"
)

func main() {
	// Initialize components
	hlsService := hls.NewService()
	networkOptimizer := network.NewOptimizer()
	cacheManager := cache.NewManager()
	bufferManager := buffer.NewManager(networkOptimizer)
	streamingService := streaming.NewService(networkOptimizer, cacheManager, bufferManager)

	// Setup Gin router
	router := gin.Default()

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		
		c.Next()
	})

	// API Routes
	api := router.Group("/api/v1")
	{
		// HLS streaming endpoints
		api.GET("/stream/:videoId/playlist.m3u8", hlsService.GetMasterPlaylist)
		api.GET("/stream/:videoId/:quality/playlist.m3u8", hlsService.GetQualityPlaylist)
		api.GET("/stream/:videoId/:quality/:segment", hlsService.GetSegment)

		// Network optimization endpoints
		api.POST("/network/test", networkOptimizer.TestConnection)
		api.GET("/network/quality", networkOptimizer.GetNetworkQuality)
		api.POST("/network/optimize", networkOptimizer.OptimizeStreaming)

		// Cache management
		api.GET("/cache/status", cacheManager.GetStatus)
		api.DELETE("/cache/clear", cacheManager.ClearCache)

		// Hyper-fetching
		api.POST("/fetch/prefetch", hlsService.PrefetchSegments)
		api.GET("/fetch/status/:videoId", hlsService.GetPrefetchStatus)

		// Buffer management
		api.POST("/buffer/create", bufferManager.CreateBuffer)
		api.GET("/buffer/status/:videoId", bufferManager.GetBufferStatus)
		api.POST("/buffer/quality", bufferManager.UpdateBufferQuality)
	}

	// Advanced streaming endpoints
	streamingService.RegisterStreamingRoutes(api)

	// HTTP/3 (QUIC) Server Configuration
	quicConfig := &quic.Config{
		MaxIdleTimeout:        30 * time.Second,
		MaxIncomingStreams:    1000,
		MaxIncomingUniStreams: 1000,
		KeepAlive:             true,
	}

	// TLS Configuration for HTTP/3
	tlsConfig := &tls.Config{
		InsecureSkipVerify: true,
		NextProtos:         []string{"h3"},
	}

	// Create HTTP/3 server
	server := &http3.Server{
		Addr:      ":8443",
		Handler:   router,
		QuicConfig: quicConfig,
		TLSConfig:  tlsConfig,
	}

	// Start HTTP/3 server
	fmt.Println("🚀 Kronop Backend starting on HTTP/3 (QUIC) :8443")
	fmt.Println("📡 Optimized for 2G/3G networks with adaptive bitrate streaming")
	
	// Also start HTTP/1.1 fallback server on :8080
	go func() {
		fmt.Println("🔄 HTTP/1.1 fallback server starting on :8080")
		if err := router.Run(":8080"); err != nil {
			log.Printf("HTTP/1.1 server error: %v", err)
		}
	}()

	// Start HTTP/3 server
	if err := server.ListenAndServeTLS(); err != nil {
		log.Fatalf("HTTP/3 server failed: %v", err)
	}
}
