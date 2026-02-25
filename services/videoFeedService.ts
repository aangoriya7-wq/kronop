// Smart Video Feed Service for Reels
// Tracks watched videos and manages smooth playback

interface WatchedVideo {
  id: string;
  watchedAt: number;
  completed: boolean;
}

class VideoFeedService {
  private watchedVideos: Map<string, WatchedVideo> = new Map();
  private currentVideoIndex: number = 0;
  private videoPool: string[] = [];
  private callbacks: Set<() => void> = new Set();

  // Initialize video pool
  initializeVideoPool(videoIds: string[]) {
    this.videoPool = [...videoIds];
    this.resetToUnwatched();
  }

  // Mark video as watched
  markVideoWatched(videoId: string, completed: boolean = false) {
    this.watchedVideos.set(videoId, {
      id: videoId,
      watchedAt: Date.now(),
      completed
    });
    
    // Notify listeners
    this.notifyCallbacks();
  }

  // Check if video is watched
  isVideoWatched(videoId: string): boolean {
    return this.watchedVideos.has(videoId);
  }

  // Get next unwatched video
  getNextUnwatchedVideo(currentIndex: number): number {
    const totalVideos = this.videoPool.length;
    
    // Find next unwatched video
    for (let i = 1; i <= totalVideos; i++) {
      const nextIndex = (currentIndex + i) % totalVideos;
      const nextVideoId = this.videoPool[nextIndex];
      
      if (!this.isVideoWatched(nextVideoId)) {
        return nextIndex;
      }
    }
    
    // All videos watched, reset and start from beginning
    this.resetWatchedVideos();
    return 0;
  }

  // Get current video index based on watched status
  getOptimalStartingIndex(): number {
    // Find first unwatched video
    for (let i = 0; i < this.videoPool.length; i++) {
      if (!this.isVideoWatched(this.videoPool[i])) {
        return i;
      }
    }
    
    // All watched, start from beginning
    this.resetWatchedVideos();
    return 0;
  }

  // Reset watched videos (for new session)
  resetWatchedVideos() {
    this.watchedVideos.clear();
    this.notifyCallbacks();
  }

  // Reset to first unwatched video
  resetToUnwatched() {
    this.currentVideoIndex = this.getOptimalStartingIndex();
    this.notifyCallbacks();
  }

  // Get watched videos count
  getWatchedCount(): number {
    return this.watchedVideos.size;
  }

  // Get remaining unwatched count
  getUnwatchedCount(): number {
    return this.videoPool.length - this.watchedVideos.size;
  }

  // Subscribe to changes
  subscribe(callback: () => void): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  // Notify all subscribers
  private notifyCallbacks() {
    this.callbacks.forEach(callback => callback());
  }

  // Clear old watched videos (older than 24 hours)
  clearOldWatchedVideos() {
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    for (const [id, video] of this.watchedVideos.entries()) {
      if (now - video.watchedAt > twentyFourHours) {
        this.watchedVideos.delete(id);
      }
    }
    
    this.notifyCallbacks();
  }

  // Get video progress for user
  getVideoProgress(): {
    watched: number;
    total: number;
    percentage: number;
  } {
    const watched = this.watchedVideos.size;
    const total = this.videoPool.length;
    const percentage = total > 0 ? (watched / total) * 100 : 0;
    
    return { watched, total, percentage };
  }
}

// Singleton instance
export const videoFeedService = new VideoFeedService();

// Auto cleanup old videos every hour
setInterval(() => {
  videoFeedService.clearOldWatchedVideos();
}, 60 * 60 * 1000);
