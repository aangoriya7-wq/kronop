// fetcher.go - High-speed networking with parallel chunk downloads
// Downloads video chunks from 10 different paths simultaneously

package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
	"bytes"
	"encoding/binary"
	"crypto/md5"
	"encoding/hex"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// VideoChunk represents a piece of video data
type VideoChunk struct {
	Index      int
	Data       []byte
	Size       int
	StartByte  int64
	EndByte    int64
	Checksum   string
	Downloaded bool
}

// VideoFetcher handles parallel video downloads
type VideoFetcher struct {
	urls              []string
	chunkSize         int64
	maxConcurrent     int
	progressChan      chan DownloadProgress
	chunkResults      chan ChunkResult
	ctx               context.Context
	cancel            context.CancelFunc
	downloadedChunks  map[int]*VideoChunk
	chunkMutex        sync.RWMutex
	totalSize         int64
	downloadedSize    int64
	progressMutex     sync.RWMutex
	httpClient        *http.Client
	bandwidth         int64
	bandwidthMutex    sync.RWMutex
	retryCount        int
	retryDelay        time.Duration
	mongoClient       *mongo.Client
	mongoDB           *mongo.Database
}

// DownloadProgress tracks download status
type DownloadProgress struct {
	TotalChunks      int
	CompletedChunks  int
	DownloadedBytes  int64
	TotalBytes       int64
	Speed            int64 // bytes per second
	EstimatedTime    time.Duration
	ActiveDownloads  int
}

// ChunkResult represents a downloaded chunk
type ChunkResult struct {
	Index   int
	Data    []byte
	Error   error
	Source  string
}

// NewVideoFetcher creates a new fetcher with multiple source URLs
func NewVideoFetcher(urls []string, chunkSize int64, maxConcurrent int) *VideoFetcher {
	ctx, cancel := context.WithCancel(context.Background())
	
	// Initialize MongoDB connection
	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	var mongoDB *mongo.Database
	if err == nil {
		mongoDB = mongoClient.Database("kronop")
	}
	
	return &VideoFetcher{
		urls:             urls,
		chunkSize:        chunkSize,
		maxConcurrent:    maxConcurrent,
		progressChan:     make(chan DownloadProgress, 10),
		chunkResults:     make(chan ChunkResult, 100),
		ctx:              ctx,
		cancel:           cancel,
		downloadedChunks: make(map[int]*VideoChunk),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 10,
				IdleConnTimeout:     90 * time.Second,
			},
		},
		retryCount: 3,
		retryDelay: 2 * time.Second,
		mongoClient: mongoClient,
		mongoDB: mongoDB,
	}
}

// GetVideoURLFromMongoDB fetches video URL from MongoDB database
func (f *VideoFetcher) GetVideoURLFromMongoDB(videoID string) (string, error) {
	if f.mongoDB == nil {
		return "", fmt.Errorf("MongoDB not connected")
	}
	
	collection := f.mongoDB.Collection("videos")
	var result struct {
		URL string `bson:"url"`
	}
	
	err := collection.FindOne(f.ctx, bson.M{"_id": videoID}).Decode(&result)
	if err != nil {
		return "", fmt.Errorf("video not found in MongoDB: %v", err)
	}
	
	return result.URL, nil
}

// GetVideoInfo retrieves video metadata
func (f *VideoFetcher) GetVideoInfo(videoURL string) (size int64, err error) {
	resp, err := f.httpClient.Head(videoURL)
	if err != nil {
		return 0, fmt.Errorf("failed to get video info: %v", err)
	}
	defer resp.Body.Close()
	
	return resp.ContentLength, nil
}

// StartDownload begins parallel chunk downloading
func (f *VideoFetcher) StartDownload(videoURL string, totalSize int64) error {
	f.totalSize = totalSize
	
	// Calculate number of chunks
	numChunks := int((totalSize + f.chunkSize - 1) / f.chunkSize)
	
	// Initialize chunk metadata
	for i := 0; i < numChunks; i++ {
		startByte := int64(i) * f.chunkSize
		endByte := startByte + f.chunkSize - 1
		if endByte >= totalSize {
			endByte = totalSize - 1
		}
		
		f.chunkMutex.Lock()
		f.downloadedChunks[i] = &VideoChunk{
			Index:     i,
			StartByte: startByte,
			EndByte:   endByte,
			Size:      int(endByte - startByte + 1),
		}
		f.chunkMutex.Unlock()
	}
	
	// Start workers
	var wg sync.WaitGroup
	chunkChan := make(chan int, numChunks)
	
	// Feed chunk indices
	for i := 0; i < numChunks; i++ {
		chunkChan <- i
	}
	close(chunkChan)
	
	// Track active downloads
	activeDownloads := 0
	downloadMutex := sync.Mutex{}
	progressTicker := time.NewTicker(1 * time.Second)
	
	// Progress reporting goroutine
	go func() {
		var lastBytes int64
		for range progressTicker.C {
			f.progressMutex.RLock()
			currentBytes := f.downloadedSize
			f.progressMutex.RUnlock()
			
			speed := currentBytes - lastBytes
			f.bandwidthMutex.Lock()
			f.bandwidth = speed
			f.bandwidthMutex.Unlock()
			
			var eta time.Duration
			if speed > 0 {
				remainingBytes := totalSize - currentBytes
				eta = time.Duration(remainingBytes/speed) * time.Second
			}
			
			f.chunkMutex.RLock()
			completed := 0
			for _, chunk := range f.downloadedChunks {
				if chunk.Downloaded {
					completed++
				}
			}
			f.chunkMutex.RUnlock()
			
			f.progressChan <- DownloadProgress{
				TotalChunks:      numChunks,
				CompletedChunks:  completed,
				DownloadedBytes:  currentBytes,
				TotalBytes:       totalSize,
				Speed:            speed,
				EstimatedTime:    eta,
				ActiveDownloads:  activeDownloads,
			}
			
			lastBytes = currentBytes
		}
	}()
	
	// Launch workers (10 concurrent downloads)
	for i := 0; i < f.maxConcurrent; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			
			for chunkIndex := range chunkChan {
				select {
				case <-f.ctx.Done():
					return
				default:
					downloadMutex.Lock()
					activeDownloads++
					downloadMutex.Unlock()
					
					// Download this chunk from multiple sources
					chunkData := f.downloadChunkWithRetry(videoURL, chunkIndex)
					
					downloadMutex.Lock()
					activeDownloads--
					downloadMutex.Unlock()
					
					if chunkData != nil {
						f.chunkResults <- ChunkResult{
							Index: chunkIndex,
							Data:  chunkData,
						}
					}
				}
			}
		}(i)
	}
	
	// Collect results
	go func() {
		for result := range f.chunkResults {
			if result.Error == nil && result.Data != nil {
				checksum := calculateMD5(result.Data)
				
				f.chunkMutex.Lock()
				if chunk, exists := f.downloadedChunks[result.Index]; exists {
					chunk.Data = result.Data
					chunk.Downloaded = true
					chunk.Checksum = checksum
					
					f.progressMutex.Lock()
					f.downloadedSize += int64(len(result.Data))
					f.progressMutex.Unlock()
				}
				f.chunkMutex.Unlock()
			}
		}
	}()
	
	wg.Wait()
	progressTicker.Stop()
	close(f.chunkResults)
	
	return nil
}

// downloadChunkWithRetry attempts to download a chunk with retries
func (f *VideoFetcher) downloadChunkWithRetry(videoURL string, chunkIndex int) []byte {
	for attempt := 0; attempt < f.retryCount; attempt++ {
		chunkData := f.downloadChunk(videoURL, chunkIndex)
		if chunkData != nil {
			return chunkData
		}
		
		time.Sleep(f.retryDelay)
	}
	return nil
}

// downloadChunk downloads a single chunk with byte range
func (f *VideoFetcher) downloadChunk(videoURL string, chunkIndex int) []byte {
	f.chunkMutex.RLock()
	chunk := f.downloadedChunks[chunkIndex]
	f.chunkMutex.RUnlock()
	
	if chunk == nil {
		return nil
	}
	
	// Try all available source URLs
	for _, sourceURL := range f.urls {
		req, err := http.NewRequestWithContext(f.ctx, "GET", sourceURL+videoURL, nil)
		if err != nil {
			continue
		}
		
		// Set range header for partial content
		rangeHeader := fmt.Sprintf("bytes=%d-%d", chunk.StartByte, chunk.EndByte)
		req.Header.Set("Range", rangeHeader)
		
		resp, err := f.httpClient.Do(req)
		if err != nil {
			continue
		}
		
		if resp.StatusCode != http.StatusPartialContent && 
		   resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			continue
		}
		
		// Read chunk data
		data, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		
		if err == nil && len(data) == chunk.Size {
			return data
		}
	}
	
	return nil
}

// GetNextChunk returns next available chunk for streaming
func (f *VideoFetcher) GetNextChunk() (*VideoChunk, error) {
	f.chunkMutex.RLock()
	defer f.chunkMutex.RUnlock()
	
	// Find first undownloaded chunk
	for i := 0; i < len(f.downloadedChunks); i++ {
		if chunk, exists := f.downloadedChunks[i]; exists && chunk.Downloaded {
			return chunk, nil
		}
	}
	
	return nil, fmt.Errorf("no chunks available")
}

// GetProgressChan returns progress channel
func (f *VideoFetcher) GetProgressChan() <-chan DownloadProgress {
	return f.progressChan
}

// Cancel cancels all ongoing downloads
func (f *VideoFetcher) Cancel() {
	f.cancel()
}

// GetBandwidth returns current bandwidth in bytes/sec
func (f *VideoFetcher) GetBandwidth() int64 {
	f.bandwidthMutex.RLock()
	defer f.bandwidthMutex.RUnlock()
	return f.bandwidth
}

// AdaptiveBitrate calculates optimal bitrate based on bandwidth
func (f *VideoFetcher) AdaptiveBitrate() string {
	bandwidth := f.GetBandwidth()
	
	switch {
	case bandwidth > 10*1024*1024: // > 10 MB/s
		return "4K"
	case bandwidth > 5*1024*1024: // > 5 MB/s
		return "1080p"
	case bandwidth > 2*1024*1024: // > 2 MB/s
		return "720p"
	case bandwidth > 1*1024*1024: // > 1 MB/s
		return "480p"
	case bandwidth > 500*1024: // > 500 KB/s
		return "360p"
	default:
		return "240p"
	}
}

// calculateMD5 calculates MD5 checksum of data
func calculateMD5(data []byte) string {
	hash := md5.Sum(data)
	return hex.EncodeToString(hash[:])
}

// Main fetcher interface for CGO
type Fetcher interface {
	FetchVideo(url string) error
	GetProgress() DownloadProgress
	Cancel()
}

/*
#include <stdlib.h>

typedef struct {
	void* go_fetcher;
} GoFetcher;

extern GoFetcher* CreateFetcher(char** urls, int urlCount, long chunkSize, int maxConcurrent);
extern int StartFetch(GoFetcher* fetcher, char* url, long totalSize);
extern DownloadProgress* GetFetcherProgress(GoFetcher* fetcher);
*/
