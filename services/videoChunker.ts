// Video Chunking Service - YouTube Style Sequential Streaming
// Loads chunks in order, plays immediately when first chunk arrives

export interface VideoChunkConfig {
  chunkSize: number; // in seconds
  bufferSize: number; // total buffer size in seconds
  preloadAhead: number; // preload seconds ahead of current position
}

export interface ChunkInfo {
  index: number;
  startTime: number;
  endTime: number;
  url: string;
  isLoaded: boolean;
}

export class VideoChunker {
  private static readonly DEFAULT_CONFIG: VideoChunkConfig = {
    chunkSize: 10, // 10 seconds chunks for faster loading
    bufferSize: 60, // 1 minute total buffer
    preloadAhead: 30, // Preload 30 seconds ahead
  };

  /**
   * Get sequential chunk URLs for streaming
   */
  static getSequentialChunks(videoUrl: string, totalDuration: number): ChunkInfo[] {
    const chunks: ChunkInfo[] = [];
    const chunkSize = this.DEFAULT_CONFIG.chunkSize;
    
    for (let i = 0; i < Math.ceil(totalDuration / chunkSize); i++) {
      const startTime = i * chunkSize;
      const endTime = Math.min(startTime + chunkSize, totalDuration);
      
      chunks.push({
        index: i,
        startTime,
        endTime,
        url: `${videoUrl}#t=${startTime},${endTime}`, // Media fragment URI
        isLoaded: false,
      });
    }
    
    return chunks;
  }

  /**
   * Get expo-video buffer options for sequential streaming
   */
  static getBufferOptions(customConfig?: Partial<VideoChunkConfig>) {
    const config = { ...this.DEFAULT_CONFIG, ...customConfig };
    
    return {
      // Buffer only ahead, not random parts
      preferredForwardBufferDuration: config.preloadAhead * 1000, // 30 seconds ahead
      
      // Prevent jumping around
      preventsVideoFrameAnalysis: true,
      
      // Smooth playback
      automaticallyWaitsToMinimizeStalling: true,
    };
  }

  /**
   * Get chunk to load based on current playback position
   */
  static getNextChunkToLoad(
    chunks: ChunkInfo[], 
    currentTime: number, 
    loadedChunks: Set<number>
  ): ChunkInfo | null {
    // Find the chunk that should be loaded next
    const currentChunkIndex = Math.floor(currentTime / this.DEFAULT_CONFIG.chunkSize);
    
    // Load current chunk if not loaded
    if (!loadedChunks.has(currentChunkIndex) && chunks[currentChunkIndex]) {
      return chunks[currentChunkIndex];
    }
    
    // Load next few chunks in order
    for (let i = 1; i <= 3; i++) {
      const nextChunkIndex = currentChunkIndex + i;
      if (!loadedChunks.has(nextChunkIndex) && chunks[nextChunkIndex]) {
        return chunks[nextChunkIndex];
      }
    }
    
    return null;
  }

  /**
   * Check if we should clear old chunks from memory
   */
  static getChunksToClear(
    chunks: ChunkInfo[], 
    currentTime: number, 
    loadedChunks: Set<number>
  ): number[] {
    const chunksToClear: number[] = [];
    const currentChunkIndex = Math.floor(currentTime / this.DEFAULT_CONFIG.chunkSize);
    
    // Clear chunks that are far behind (keep last 2 chunks for seeking)
    const keepLastChunks = 2;
    loadedChunks.forEach(chunkIndex => {
      if (chunkIndex < currentChunkIndex - keepLastChunks) {
        chunksToClear.push(chunkIndex);
      }
    });
    
    return chunksToClear;
  }

  /**
   * Get initial chunk for immediate playback
   */
  static getInitialChunk(videoUrl: string): ChunkInfo {
    return {
      index: 0,
      startTime: 0,
      endTime: this.DEFAULT_CONFIG.chunkSize,
      url: `${videoUrl}#t=0,${this.DEFAULT_CONFIG.chunkSize}`,
      isLoaded: false,
    };
  }
}

export default VideoChunker;
