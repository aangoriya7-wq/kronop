// Limited Video Pre-loading Service for Performance
// Optimized for 3-video limit

interface PreloadVideo {
  id: string;
  url: string;
  isPreloaded: boolean;
  priority: number;
  loadTime?: number;
}

class VideoPreloaderService {
  private preloadedVideos: Map<string, PreloadVideo> = new Map();
  private preloadQueue: string[] = [];
  private maxPreloadCount = 3; // Preload current + next 2 videos for instant play
  private isPreloading = false;
  private aggressiveMode = false; // DISABLE aggressive pre-fetching
  private preloadingStatus: Map<string, 'preloading' | 'completed' | 'failed'> = new Map();

  // Initialize preloader with video URLs
  initializePreloader(videos: { id: string; video_url: string }[]) {
    // Clear existing preloads
    this.clearAllPreloads();
    
    // Add videos to preload queue
    videos.forEach((video, index) => {
      this.preloadedVideos.set(video.id, {
        id: video.id,
        url: video.video_url,
        isPreloaded: false,
        priority: index
      });
    });
  }

  // Ultra-fast pre-warming - load current + next 2 videos for instant play
  async preloadAroundIndex(currentIndex: number, totalVideos: { id: string; video_url: string }[]) {
    if (this.isPreloading) return;
    
    this.isPreloading = true;
    
    try {
      // Clear videos that are too far from current index
      this.clearDistantPreloads(currentIndex);
      
      // Load current + next 2 videos for instant play
      const preloadPromises: Promise<void>[] = [];
      
      for (let i = 0; i <= 2; i++) { // Include current + next 2
        const nextIndex = (currentIndex + i) % totalVideos.length;
        const video = totalVideos[nextIndex];
        
        if (video && !this.isVideoPreloaded(video.id)) {
          // Start all preloads immediately without waiting
          preloadPromises.push(this.preloadVideo(video.video_url, video.id));
        }
      }
      
      // Wait for all preloads to complete in parallel
      await Promise.allSettled(preloadPromises);
      
      console.log(`🚀 Aggressive pre-warm completed: ${preloadPromises.length} videos ready`);
      
    } finally {
      this.isPreloading = false;
    }
  }

  // Preload a single video with strict 404 check
  async preloadVideo(videoUrl: string, videoId: string): Promise<void> {
    try {
      // Safety check: ensure preloadedVideos exists
      if (!this.preloadedVideos) {
        this.preloadedVideos = new Map();
      }
      
      // Safety check: ensure preloadingStatus exists
      if (!this.preloadingStatus) {
        this.preloadingStatus = new Map();
      }
      
      // Skip if already preloading
      if (this.preloadingStatus.has(videoId)) {
        return;
      }

      this.preloadingStatus.set(videoId, 'preloading');
      console.log('🔥 LIMITED PRELOAD STARTING:', videoId);

      // Create AbortController for timeout - increased to 15s for slow networks
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      try {
        // Strict URL validation with HEAD request first
        const headResponse = await fetch(videoUrl, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'KronopApp/Preloader',
            'Range': 'bytes=0-1023'
          }
        });

        clearTimeout(timeoutId);

        // Accept 200 (OK) and 206 (Partial Content) - both are valid for Range requests
        if (!headResponse.ok && headResponse.status !== 206) {
          console.log(`⚠️ Skipping preload - URL not accessible: ${videoId} Status: ${headResponse.status}`);
          this.preloadingStatus.set(videoId, 'failed');
          return;
        }

        // Preload first 2MB immediately
        const response = await fetch(videoUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'KronopApp/Preloader',
            'Range': 'bytes=0-2097151' // 2MB
          }
        });

        // Accept 200 (OK) and 206 (Partial Content) - Status 206 is valid for Range requests
        if (!response.ok && response.status !== 206) {
          console.log(`⚠️ Preload failed - Bad response: ${videoId} Status: ${response.status}`);
          this.preloadingStatus.set(videoId, 'failed');
          return;
        }

        // Read and discard the data to cache it
        const reader = response.body?.getReader();
        if (reader) {
          let totalRead = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            totalRead += value.length;
            if (totalRead >= 2097152) break; // Stop after 2MB
          }
        }

        this.preloadingStatus.set(videoId, 'completed');
        console.log(`🔥 AGGRESSIVE PRELOAD SUCCESS: ${videoId} (${Date.now() % 1000}ms)`);
        return;

      } catch (error) {
        clearTimeout(timeoutId);
        
        // Don't log aggressive preload errors - silent fail
        if ((error as Error).name === 'AbortError') {
          console.log(`⏰ Preload timeout: ${videoId}`);
        } else {
          // Silent fail for other errors
        }
        
        this.preloadingStatus.set(videoId, 'failed');
        return;
      }

    } catch (error) {
      // Silent fail - no error logging
      this.preloadingStatus.set(videoId, 'failed');
      return;
    }
  }

  // Check if video is preloaded
  isVideoPreloaded(videoId: string): boolean {
    const video = this.preloadedVideos.get(videoId);
    return video?.isPreloaded || false;
  }

  // Get preload time for video
  getPreloadTime(videoId: string): number {
    const video = this.preloadedVideos.get(videoId);
    return video?.loadTime || 0;
  }

  // Clear videos that are too far from current index (LIMITED cleanup for 3 videos)
  private clearDistantPreloads(currentIndex: number) {
    const clearDistance = 2; // Keep only current + next 1
    
    for (const [videoId, video] of this.preloadedVideos.entries()) {
      const distance = Math.abs(video.priority - currentIndex);
      
      if (distance > clearDistance && video.isPreloaded) {
        console.log('🗑️ Clearing distant preload:', videoId);
        video.isPreloaded = false;
        video.loadTime = undefined;
      }
    }
  }

  // Clear all preloaded videos
  clearAllPreloads() {
    for (const [videoId, video] of this.preloadedVideos.entries()) {
      video.isPreloaded = false;
      video.loadTime = undefined;
    }
    
    this.preloadQueue = [];
  }

  // Get preload status for debugging
  getPreloadStatus(): {
    total: number;
    preloaded: number;
    preloading: boolean;
    queue: string[];
    averageLoadTime: number;
  } {
    const preloaded = Array.from(this.preloadedVideos.values())
      .filter(v => v.isPreloaded);
    
    const totalLoadTime = preloaded.reduce((sum, v) => sum + (v.loadTime || 0), 0);
    const averageLoadTime = preloaded.length > 0 ? totalLoadTime / preloaded.length : 0;
    
    return {
      total: this.preloadedVideos.size,
      preloaded: preloaded.length,
      preloading: this.isPreloading,
      queue: this.preloadQueue,
      averageLoadTime: Math.round(averageLoadTime)
    };
  }

  // Force immediate preload of specific video
  async forcePreload(videoId: string, videoUrl: string): Promise<boolean> {
    try {
      // Safety check: ensure cache exists
      if (!this.preloadedVideos) {
        this.preloadedVideos = new Map();
      }
      if (!this.preloadingStatus) {
        this.preloadingStatus = new Map();
      }
      
      console.log('⚡ FORCE PRELOAD:', videoId);
      await this.preloadVideo(videoUrl, videoId);
      return this.isVideoPreloaded(videoId);
    } catch (error) {
      console.error('Force preload failed:', error);
      return false;
    }
  }

  // Start aggressive pre-warming immediately when app starts
  async startAggressivePreloading(totalVideos: { id: string; video_url: string }[]) {
    if (!this.aggressiveMode) return;
    
    console.log('🔥 STARTING AGGRESSIVE PRE-WARMING MODE');
    
    // Immediately preload first 3 videos for instant start
    const initialPromises: Promise<void>[] = [];
    for (let i = 0; i < Math.min(3, totalVideos.length); i++) {
      const video = totalVideos[i];
      if (video && !this.isVideoPreloaded(video.id)) {
        initialPromises.push(this.preloadVideo(video.video_url, video.id));
      }
    }
    
    await Promise.allSettled(initialPromises);
    console.log('🔥 INITIAL AGGRESSIVE PRE-WARM COMPLETED');
  }
}

// Singleton instance
export const videoPreloaderService = new VideoPreloaderService();
