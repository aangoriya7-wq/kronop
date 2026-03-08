export interface CloudflareR2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
  endpoint: string;
  publicUrl: string;
}

export interface VideoMetadata {
  id: string;
  title: string;
  duration: number;
  size: number;
  resolution: string;
  codec: string;
  bitrate: number;
  thumbnailUrl?: string;
  chunks: VideoChunk[];
}

export interface VideoChunk {
  id: number;
  startByte: number;
  endByte: number;
  url: string;
  size: number;
  checksum?: string;
}

export interface ParallelDownloadConfig {
  maxConcurrentStreams: number;
  chunkSize: number;
  bufferSize: number;
  retryAttempts: number;
  timeoutMs: number;
  useHttp3: boolean;
}

export class CloudflareR2Service {
  private config: CloudflareR2Config;
  private downloadConfig: ParallelDownloadConfig;

  constructor(config: CloudflareR2Config) {
    this.config = config;
    this.downloadConfig = {
      maxConcurrentStreams: 10, // 10 parallel HTTP/3 streams
      chunkSize: 1024 * 1024, // 1MB chunks
      bufferSize: 20, // Buffer 20 chunks
      retryAttempts: 3,
      timeoutMs: 30000,
      useHttp3: true,
    };
  }

  /**
   * Get video metadata from Cloudflare R2
   */
  async getVideoMetadata(videoId: string): Promise<VideoMetadata> {
    const metadataUrl = `${this.config.endpoint}/${this.config.bucketName}/metadata/${videoId}.json`;
    
    try {
      const response = await fetch(metadataUrl, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'User-Agent': 'Kronop-Live/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.status}`);
      }

      const metadata: VideoMetadata = await response.json();
      return metadata;
    } catch (error) {
      console.error('Error fetching video metadata:', error);
      throw error;
    }
  }

  /**
   * Download video using parallel chunk fetching with 10 HTTP/3 streams
   */
  async downloadVideoParallel(videoId: string, onProgress?: (progress: DownloadProgress) => void): Promise<ArrayBuffer> {
    const metadata = await this.getVideoMetadata(videoId);
    const chunks = metadata.chunks;
    
    console.log(`Starting parallel download: ${chunks.length} chunks, ${this.downloadConfig.maxConcurrentStreams} streams`);

    const downloadPromises: Promise<ChunkResult>[] = [];
    const semaphore = new Semaphore(this.downloadConfig.maxConcurrentStreams);
    const completedChunks = new Map<number, Uint8Array>();
    let downloadedBytes = 0;

    // Start parallel downloads
    for (const chunk of chunks) {
      const promise = this.downloadChunkWithRetry(chunk, semaphore, onProgress);
      downloadPromises.push(promise);
    }

    // Wait for all chunks to complete
    const results = await Promise.allSettled(downloadPromises);
    
    // Process results
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        completedChunks.set(i, result.value.data);
        downloadedBytes += result.value.data.length;
      } else if (result.status === 'rejected') {
        console.error(`Chunk ${i} failed:`, result.reason);
        throw new Error(`Failed to download chunk ${i}`);
      }
    }

    // Assemble video data in correct order
    const totalSize = metadata.size;
    const videoData = new Uint8Array(totalSize);
    let offset = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunkData = completedChunks.get(i);
      if (chunkData) {
        videoData.set(chunkData, offset);
        offset += chunkData.length;
      }
    }

    console.log(`Download completed: ${totalSize} bytes`);
    return videoData.buffer;
  }

  /**
   * Download individual chunk with retry logic
   */
  private async downloadChunkWithRetry(
    chunk: VideoChunk, 
    semaphore: Semaphore, 
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<ChunkResult> {
    await semaphore.acquire();
    
    try {
      const startTime = Date.now();
      const response = await fetch(chunk.url, {
        method: 'GET',
        headers: {
          'Range': `bytes=${chunk.startByte}-${chunk.endByte}`,
          'Authorization': this.getAuthHeader(),
          'User-Agent': 'Kronop-Live/1.0',
          'Accept': '*/*',
          'Connection': this.downloadConfig.useHttp3 ? 'upgrade' : 'keep-alive',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const downloadTime = Date.now() - startTime;
      const speed = (chunk.size / 1024 / 1024) / (downloadTime / 1000); // MB/s

      semaphore.release();

      return {
        chunkId: chunk.id,
        data: new Uint8Array(arrayBuffer),
        size: chunk.size,
        speed,
        downloadTime,
      };
    } catch (error) {
      semaphore.release();
      throw error;
    }
  }

  /**
   * Generate signed URL for video chunk
   */
  private generateSignedUrl(objectKey: string, expiresIn: number = 3600): string {
    // This would implement AWS S3 compatible signature generation
    // For Cloudflare R2, we can use presigned URLs
    const timestamp = Math.floor(Date.now() / 1000) + expiresIn;
    const canonicalRequest = `GET\n\n\n\n${timestamp}\n/${this.config.bucketName}/${objectKey}`;
    
    // Note: In production, implement proper AWS signature V4
    return `${this.config.publicUrl}/${objectKey}?expires=${timestamp}`;
  }

  /**
   * Get authorization header for Cloudflare R2
   */
  private getAuthHeader(): string {
    // Implement AWS Signature V4 for Cloudflare R2
    const credentials = `${this.config.accessKeyId}:${this.config.secretAccessKey}`;
    return `Basic ${btoa(credentials)}`;
  }

  /**
   * Initialize video streaming with buffering
   */
  async initializeStreaming(videoId: string): Promise<VideoStream> {
    const metadata = await this.getVideoMetadata(videoId);
    
    return {
      metadata,
      downloadConfig: this.downloadConfig,
      buffer: new VideoBuffer(this.downloadConfig.bufferSize),
      download: () => this.downloadVideoParallel(videoId),
      getChunkUrl: (chunkId: number) => metadata.chunks[chunkId]?.url || '',
    };
  }
}

// Utility classes
class Semaphore {
  private permits: number;
  private waitQueue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      this.permits--;
      resolve();
    }
  }
}

export interface DownloadProgress {
  totalChunks: number;
  completedChunks: number;
  downloadedBytes: number;
  totalBytes: number;
  speed: number; // bytes per second
  percentage: number;
}

export interface ChunkResult {
  chunkId: number;
  data: Uint8Array;
  size: number;
  speed: number; // MB/s
  downloadTime: number; // ms
}

export interface VideoStream {
  metadata: VideoMetadata;
  downloadConfig: ParallelDownloadConfig;
  buffer: VideoBuffer;
  download: () => Promise<ArrayBuffer>;
  getChunkUrl: (chunkId: number) => string;
}

export class VideoBuffer {
  private chunks: Map<number, Uint8Array> = new Map();
  private nextChunkId: number = 0;
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  addChunk(chunkId: number, data: Uint8Array): void {
    this.chunks.set(chunkId, data);
    
    // Clean old chunks if buffer is full
    if (this.chunks.size > this.maxSize) {
      const oldChunkId = this.nextChunkId;
      this.chunks.delete(oldChunkId);
      this.nextChunkId++;
      console.log(`Buffer cleanup: removed chunk ${oldChunkId}`);
    }
  }

  getNextChunk(): Uint8Array | null {
    const chunk = this.chunks.get(this.nextChunkId);
    if (chunk) {
      this.chunks.delete(this.nextChunkId);
      this.nextChunkId++;
      return chunk;
    }
    return null;
  }

  hasChunk(chunkId: number): boolean {
    return this.chunks.has(chunkId);
  }

  getBufferedChunks(): number[] {
    return Array.from(this.chunks.keys()).sort((a, b) => a - b);
  }
}
