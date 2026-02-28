package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/kronop/prefetcher/internal/prefetcher"
	"github.com/kronop/prefetcher/internal/analyzer"
)

func main() {
	// Command line flags
	port := flag.Int("port", 8080, "Port for HTTP server")
	configPath := flag.String("config", "config.yaml", "Configuration file path")
	logLevel := flag.String("log-level", "info", "Log level (debug, info, warn, error)")
	flag.Parse()

	// Setup logging
	setupLogging(*logLevel)

	log.Printf("🚀 Starting Kronop Prefetcher Engine v1.0.0")
	log.Printf("📁 Config: %s", *configPath)
	log.Printf("🌐 Port: %d", *port)

	// Load configuration
	config, err := prefetcher.LoadConfig(*configPath)
	if err != nil {
		log.Fatalf("❌ Failed to load config: %v", err)
	}

	// Initialize components
	analyzer := analyzer.NewUserBehaviorAnalyzer(config.Analyzer)
	prefetcherEngine := prefetcher.NewEngine(config.Prefetcher, analyzer)

	// Start the engine
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start HTTP server for API
	go func() {
		if err := prefetcherEngine.StartHTTPServer(ctx, *port); err != nil {
			log.Printf("❌ HTTP server error: %v", err)
		}
	}()

	// Start prefetching engine
	go func() {
		if err := prefetcherEngine.Start(ctx); err != nil {
			log.Printf("❌ Prefetcher engine error: %v", err)
		}
	}()

	log.Printf("✅ Kronop Prefetcher Engine started successfully")
	log.Printf("🎯 AI-based smart prefetching active")
	log.Printf("📊 User behavior analysis enabled")

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Printf("🛑 Shutting down Kronop Prefetcher Engine...")
	cancel()

	// Graceful shutdown
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := prefetcherEngine.Shutdown(shutdownCtx); err != nil {
		log.Printf("⚠️ Shutdown error: %v", err)
	}

	log.Printf("👋 Kronop Prefetcher Engine stopped")
}

func setupLogging(level string) {
	log.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
		TimestampFormat: "2006-01-02 15:04:05",
	})

	logLevel, err := logrus.ParseLevel(level)
	if err != nil {
		logLevel = logrus.InfoLevel
	}

	log.SetLevel(logLevel)
}
