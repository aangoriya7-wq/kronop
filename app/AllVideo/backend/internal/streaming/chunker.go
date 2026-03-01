package streaming

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Chunker struct {
	mu            sync.RWMutex
	inputPath     string
	outputPath    string
	chunkDuration time.Duration
	qualities     []VideoQuality
	activeJobs    map[string]*TranscodeJob
}

type VideoQuality struct {
	Name       string
	Resolution string
	Bitrate    string // kbps
	AudioBitrate string // kbps
	Codec      string
	AudioCodec string
	Framerate  int
}

type TranscodeJob struct {
	VideoID     string
	InputPath   string
	Quality     VideoQuality
	Status      string // "queued", "processing", "completed", "failed"
	Progress    float64 // 0-100
	StartTime   time.Time
	EndTime     time.Time
	ChunkCount  int
	Chunks      []ChunkInfo
	Error       error
}

type ChunkInfo struct {
	Index      int
	Quality    string
	FileName   string
	FilePath   string
	Duration   float64
	Size       int64
	CreatedAt  time.Time
	Checksum   string
}

type ChunkManifest struct {
	VideoID      string
	Quality      string
	TotalChunks  int
	TotalDuration float64
	Chunks       []ChunkInfo
	CreatedAt    time.Time
	Version      string
	PlaylistPath string
}

// Video quality configurations for adaptive streaming
var (
	QualityProfiles = []VideoQuality{
		{
			Name:        "144p",
			Resolution:  "256x144",
			Bitrate:     "200k",
			AudioBitrate: "64k",
			Codec:       "libx264",
			AudioCodec:  "aac",
			Framerate:   15,
		},
		{
			Name:        "240p",
			Resolution:  "426x240",
			Bitrate:     "400k",
			AudioBitrate: "64k",
			Codec:       "libx264",
			AudioCodec:  "aac",
			Framerate:   24,
		},
		{
			Name:        "360p",
			Resolution:  "640x360",
			Bitrate:     "800k",
			AudioBitrate: "96k",
			Codec:       "libx264",
			AudioCodec:  "aac",
			Framerate:   30,
		},
		{
			Name:        "480p",
			Resolution:  "854x480",
			Bitrate:     "1200k",
			AudioBitrate: "128k",
			Codec:       "libx264",
			AudioCodec:  "aac",
			Framerate:   30,
		},
		{
			Name:        "720p",
			Resolution:  "1280x720",
			Bitrate:     "2500k",
			AudioBitrate: "192k",
			Codec:       "libx264",
			AudioCodec:  "aac",
			Framerate:   30,
		},
		{
			Name:        "1080p",
			Resolution:  "1920x1080",
			Bitrate:     "5000k",
			AudioBitrate: "192k",
			Codec:       "libx264",
			AudioCodec:  "aac",
			Framerate:   30,
		},
		{
			Name:        "4k",
			Resolution:  "3840x2160",
			Bitrate:     "15000k",
			AudioBitrate: "256k",
			Codec:       "libx264",
			AudioCodec:  "aac",
			Framerate:   30,
		},
	}
)

func NewChunker(inputPath, outputPath string) *Chunker {
	return &Chunker{
		inputPath:     inputPath,
		outputPath:    outputPath,
		chunkDuration: 1 * time.Second, // 1-second chunks
		qualities:     QualityProfiles,
		activeJobs:    make(map[string]*TranscodeJob),
	}
}

// TranscodeVideo creates HLS chunks for all quality levels
func (c *Chunker) TranscodeVideo(ctx context.Context, videoID string, inputVideoPath string) error {
	log.Printf("Starting transcoding for video %s", videoID)
	
	// Create output directory for this video
	videoOutputPath := filepath.Join(c.outputPath, videoID)
	if err := os.MkdirAll(videoOutputPath, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %v", err)
	}
	
	// Transcode for each quality
	var wg sync.WaitGroup
	errChan := make(chan error, len(c.qualities))
	
	for _, quality := range c.qualities {
		wg.Add(1)
		go func(q VideoQuality) {
			defer wg.Done()
			
			if err := c.transcodeQuality(ctx, videoID, inputVideoPath, q); err != nil {
				errChan <- fmt.Errorf("failed to transcode %s: %v", q.Name, err)
			}
		}(quality)
	}
	
	// Wait for all transcodes to complete
	go func() {
		wg.Wait()
		close(errChan)
	}()
	
	// Check for errors
	for err := range errChan {
		if err != nil {
			return err
		}
	}
	
	// Generate master playlist
	if err := c.generateMasterPlaylist(videoID); err != nil {
		return fmt.Errorf("failed to generate master playlist: %v", err)
	}
	
	log.Printf("Transcoding completed for video %s", videoID)
	return nil
}

// transcodeQuality handles transcoding for a specific quality
func (c *Chunker) transcodeQuality(ctx context.Context, videoID, inputPath string, quality VideoQuality) error {
	qualityPath := filepath.Join(c.outputPath, videoID, quality.Name)
	if err := os.MkdirAll(qualityPath, 0755); err != nil {
		return err
	}
	
	// Generate HLS playlist and chunks using FFmpeg
	playlistPath := filepath.Join(qualityPath, "playlist.m3u8")
	
	ffmpegCmd := exec.CommandContext(ctx, "ffmpeg",
		"-i", inputPath,
		"-c:v", quality.Codec,
		"-c:a", quality.AudioCodec,
		"-b:v", quality.Bitrate,
		"-b:a", quality.AudioBitrate,
		"-vf", fmt.Sprintf("scale=%s", quality.Resolution),
		"-r", strconv.Itoa(quality.Framerate),
		"-g", strconv.Itoa(quality.Framerate*2), // Keyframe interval
		"-keyint_min", strconv.Itoa(quality.Framerate),
		"-sc_threshold", "0",
		"-f", "hls",
		"-hls_time", "1", // 1-second segments
		"-hls_list_size", "0",
		"-hls_segment_type", "mpegts",
		"-hls_segment_filename", fmt.Sprintf("segment_%%03d.ts"),
		"-hls_flags", "independent_segments",
		playlistPath,
	)
	
	// Capture output for progress tracking
	stdout, err := ffmpegCmd.StdoutPipe()
	if err != nil {
		return err
	}
	
	stderr, err := ffmpegCmd.StderrPipe()
	if err != nil {
		return err
	}
	
	// Start the command
	if err := ffmpegCmd.Start(); err != nil {
		return err
	}
	
	// Monitor progress
	go c.monitorProgress(ffmpegCmd, stdout, stderr)
	
	// Wait for completion
	if err := ffmpegCmd.Wait(); err != nil {
		return fmt.Errorf("ffmpeg failed: %v", err)
	}
	
	// Parse generated chunks and create manifest
	chunks, err := c.parseGeneratedChunks(qualityPath, quality.Name)
	if err != nil {
		return err
	}
	
	// Create chunk manifest
	manifest := ChunkManifest{
		VideoID:      videoID,
		Quality:      quality.Name,
		TotalChunks:  len(chunks),
		Chunks:       chunks,
		CreatedAt:    time.Now(),
		Version:      "1.0",
		PlaylistPath: playlistPath,
	}
	
	// Calculate total duration
	if len(chunks) > 0 {
		manifest.TotalDuration = chunks[len(chunks)-1].Duration
	}
	
	// Save manifest
	if err := c.saveChunkManifest(videoID, quality.Name, manifest); err != nil {
		return err
	}
	
	return nil
}

// monitorProgress tracks FFmpeg transcoding progress
func (c *Chunker) monitorProgress(cmd *exec.Cmd, stdout, stderr io.Reader) {
	// Read stderr for FFmpeg progress information
	scanner := bufio.NewScanner(stderr)
	
	for scanner.Scan() {
		line := scanner.Text()
		
		// Parse FFmpeg progress output
		if strings.Contains(line, "time=") {
			// Extract time information for progress calculation
			timeStr := extractTimeFromFFmpegOutput(line)
			if timeStr != "" {
				// Update progress (implementation depends on total video duration)
				log.Printf("Transcoding progress: %s", timeStr)
			}
		}
	}
}

// parseGeneratedChunks scans the output directory for generated chunks
func (c *Chunker) parseGeneratedChunks(qualityPath, qualityName string) ([]ChunkInfo, error) {
	var chunks []ChunkInfo
	
	files, err := os.ReadDir(qualityPath)
	if err != nil {
		return nil, err
	}
	
	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".ts") {
			// Extract segment index from filename
			index := extractSegmentIndex(file.Name())
			if index == -1 {
				continue
			}
			
			// Get file info
			info, err := file.Info()
			if err != nil {
				continue
			}
			
			// Get chunk duration (simplified - would need media info for accurate duration)
			duration := 1.0 // 1-second chunks
			
			chunk := ChunkInfo{
				Index:     index,
				Quality:   qualityName,
				FileName:  file.Name(),
				FilePath:  filepath.Join(qualityPath, file.Name()),
				Duration:  duration,
				Size:      info.Size(),
				CreatedAt: info.ModTime(),
				Checksum:  generateChecksum(filepath.Join(qualityPath, file.Name())),
			}
			
			chunks = append(chunks, chunk)
		}
	}
	
	// Sort chunks by index
	sortChunksByIndex(chunks)
	
	return chunks, nil
}

// generateMasterPlaylist creates the main HLS playlist with all quality variants
func (c *Chunker) generateMasterPlaylist(videoID string) error {
	playlistPath := filepath.Join(c.outputPath, videoID, "master.m3u8")
	
	var playlist strings.Builder
	playlist.WriteString("#EXTM3U\n")
	playlist.WriteString("#EXT-X-VERSION:6\n")
	playlist.WriteString("#EXT-X-INDEPENDENT-SEGMENTS\n")
	
	// Add each quality variant
	for _, quality := range c.qualities {
		// Calculate bandwidth (video + audio)
		videoBitrate, _ := strconv.Atoi(strings.TrimSuffix(quality.Bitrate, "k"))
		audioBitrate, _ := strconv.Atoi(strings.TrimSuffix(quality.AudioBitrate, "k"))
		totalBitrate := (videoBitrate + audioBitrate) * 1000 // Convert to bps
		
		playlist.WriteString(fmt.Sprintf("#EXT-X-STREAM-INF:BANDWIDTH=%d,AVERAGE-BANDWIDTH=%d,RESOLUTION=%s,CODECS=\"avc1.42E01E,mp4a.40.2\",FRAME-RATE=%.3f\n",
			totalBitrate, totalBitrate, quality.Resolution, float64(quality.Framerate)))
		playlist.WriteString(fmt.Sprintf("%s/playlist.m3u8\n", quality.Name))
	}
	
	// Write playlist to file
	if err := os.WriteFile(playlistPath, []byte(playlist.String()), 0644); err != nil {
		return err
	}
	
	return nil
}

// GetChunkStream serves individual chunks
func (c *Chunker) GetChunkStream(videoID, quality, chunkName string) (string, error) {
	chunkPath := filepath.Join(c.outputPath, videoID, quality, chunkName)
	
	// Check if chunk exists
	if _, err := os.Stat(chunkPath); os.IsNotExist(err) {
		return "", fmt.Errorf("chunk not found: %s", chunkName)
	}
	
	return chunkPath, nil
}

// GetPlaylist returns the HLS playlist for a specific quality
func (c *Chunker) GetPlaylist(videoID, quality string) (string, error) {
	playlistPath := filepath.Join(c.outputPath, videoID, quality, "playlist.m3u8")
	
	// Check if playlist exists
	if _, err := os.Stat(playlistPath); os.IsNotExist(err) {
		return "", fmt.Errorf("playlist not found: %s", playlistPath)
	}
	
	return playlistPath, nil
}

// GetMasterPlaylist returns the master playlist
func (c *Chunker) GetMasterPlaylist(videoID string) (string, error) {
	playlistPath := filepath.Join(c.outputPath, videoID, "master.m3u8")
	
	// Check if playlist exists
	if _, err := os.Stat(playlistPath); os.IsNotExist(err) {
		return "", fmt.Errorf("master playlist not found: %s", playlistPath)
	}
	
	return playlistPath, nil
}

// saveChunkManifest saves chunk metadata for tracking
func (c *Chunker) saveChunkManifest(videoID, quality string, manifest ChunkManifest) error {
	manifestPath := filepath.Join(c.outputPath, videoID, fmt.Sprintf("%s_manifest.json", quality))
	
	// Convert to JSON and save
	data, err := json.Marshal(manifest)
	if err != nil {
		return err
	}
	
	return os.WriteFile(manifestPath, data, 0644)
}

// Helper functions

func extractTimeFromFFmpegOutput(line string) string {
	// Parse time=00:01:23.45 format
	parts := strings.Split(line, "time=")
	if len(parts) < 2 {
		return ""
	}
	
	timePart := strings.Split(parts[1], " ")[0]
	return timePart
}

func extractSegmentIndex(filename string) int {
	// Extract index from segment_XXX.ts format
	parts := strings.Split(filename, "_")
	if len(parts) < 2 {
		return -1
	}
	
	indexStr := strings.TrimSuffix(parts[1], ".ts")
	index, err := strconv.Atoi(indexStr)
	if err != nil {
		return -1
	}
	
	return index
}

func sortChunksByIndex(chunks []ChunkInfo) {
	sort.Slice(chunks, func(i, j int) bool {
		return chunks[i].Index < chunks[j].Index
	})
}

func generateChecksum(filePath string) string {
	// Generate SHA256 checksum for file integrity
	file, err := os.Open(filePath)
	if err != nil {
		return ""
	}
	defer file.Close()
	
	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return ""
	}
	
	return hex.EncodeToString(hash.Sum(nil))
}

// GetVideoInfo extracts video metadata
func (c *Chunker) GetVideoInfo(inputPath string) (*VideoInfo, error) {
	cmd := exec.Command("ffprobe",
		"-v", "quiet",
		"-print_format", "json",
		"-show_format",
		"-show_streams",
		inputPath,
	)
	
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	
	var probeData FFProbeData
	if err := json.Unmarshal(output, &probeData); err != nil {
		return nil, err
	}
	
	return extractVideoInfo(&probeData), nil
}

type VideoInfo struct {
	Duration  float64
	Width     int
	Height    int
	Bitrate   int
	Framerate float64
	Codec     string
}

type FFProbeData struct {
	Format  map[string]interface{} `json:"format"`
	Streams []map[string]interface{} `json:"streams"`
}

func extractVideoInfo(data *FFProbeData) *VideoInfo {
	info := &VideoInfo{}
	
	// Extract format info
	if format, ok := data["format"].(map[string]interface{}); ok {
		if duration, ok := format["duration"].(string); ok {
			if d, err := strconv.ParseFloat(duration, 64); err == nil {
				info.Duration = d
			}
		}
		if bitrate, ok := format["bit_rate"].(string); ok {
			if b, err := strconv.Atoi(bitrate); err == nil {
				info.Bitrate = b
			}
		}
	}
	
	// Extract video stream info
	for _, stream := range data.Streams {
		if codecType, ok := stream["codec_type"].(string); ok && codecType == "video" {
			if width, ok := stream["width"].(float64); ok {
				info.Width = int(width)
			}
			if height, ok := stream["height"].(float64); ok {
				info.Height = int(height)
			}
			if codec, ok := stream["codec_name"].(string); ok {
				info.Codec = codec
			}
			
			// Extract framerate
			if rFrameRate, ok := stream["r_frame_rate"].(string); ok {
				if parts := strings.Split(rFrameRate, "/"); len(parts) == 2 {
					if num, err1 := strconv.Atoi(parts[0]); err1 == nil {
						if den, err2 := strconv.Atoi(parts[1]); err2 == nil && den > 0 {
							info.Framerate = float64(num) / float64(den)
						}
					}
				}
			}
			break
		}
	}
	
	return info
}
