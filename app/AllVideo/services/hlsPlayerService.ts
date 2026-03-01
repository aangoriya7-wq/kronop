/**
 * HLS Player Service with Adaptive Bitrate Integration
 * 
 * This service provides a complete HLS player with adaptive bitrate,
 * buffer management, and seamless quality switching for React Native.
 */

import { Platform } from 'react-native';
// import { Video, VideoRef } from 'react-native-video'; // Commented out as react-native-video may not be installed
import VideoStreamService from './videoStreamService';

export interface HLSPlayerConfig {
  videoId: string;
  initialQuality?: string;
  enableABR?: boolean;
  enablePredictivePrefetch?: boolean;
  bufferStrategy?: 'conservative' | 'balanced' | 'aggressive';
  maxBufferTime?: number; // seconds
  minBufferTime?: number; // seconds
}

export interface PlaybackState {
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  bufferHealth: number;
  currentQuality: string;
  targetQuality: string;
  playbackRate: number;
  volume: number;
}

export interface BufferMetrics {
  bufferSize: number; // seconds
  bufferHealth: number; // percentage 0-100
  bufferEvents: number;
  rebufferCount: number;
  averageRebufferDuration: number;
  lastRebufferTime: number | null;
}

export interface QualityMetrics {
  currentQuality: string;
  availableQualities: string[];
  qualityChanges: number;
  averageBitrate: number;
  totalBytesDownloaded: number;
  downloadSpeed: number; // Mbps
}

// VideoRef type definition (as react-native-video may not be installed)
type VideoRef = any;

class HLSPlayerService {
  private videoStreamService: VideoStreamService;
  private videoRef: VideoRef | null = null;
  private config: HLSPlayerConfig;
  private playbackState: PlaybackState;
  private bufferMetrics: BufferMetrics;
  private qualityMetrics: QualityMetrics;
  private eventListeners: Map<string, Function[]> = new Map();
  private abrTimer: NodeJS.Timeout | null = null;
  private bufferTimer: NodeJS.Timeout | null = null;
  private qualityChangeTimer: NodeJS.Timeout | null = null;
  private lastBufferCheck = 0;
  private rebufferEvents: Array<{ timestamp: number; duration: number }> = [];

  constructor(videoStreamService: VideoStreamService, config: HLSPlayerConfig) {
    this.videoStreamService = videoStreamService;
    this.config = {
      initialQuality: 'auto',
      enableABR: true,
      enablePredictivePrefetch: true,
      bufferStrategy: 'balanced',
      maxBufferTime: 30,
      minBufferTime: 5,
      ...config,
    };

    this.playbackState = {
      isPlaying: false,
      isBuffering: false,
      currentTime: 0,
      duration: 0,
      bufferHealth: 0,
      currentQuality: this.config.initialQuality!,
      targetQuality: this.config.initialQuality!,
      playbackRate: 1.0,
      volume: 1.0,
    };

    this.bufferMetrics = {
      bufferSize: 0,
      bufferHealth: 0,
      bufferEvents: 0,
      rebufferCount: 0,
      averageRebufferDuration: 0,
      lastRebufferTime: null,
    };

    this.qualityMetrics = {
      currentQuality: this.config.initialQuality!,
      availableQualities: [],
      qualityChanges: 0,
      averageBitrate: 0,
      totalBytesDownloaded: 0,
      downloadSpeed: 0,
    };

    this.setupEventListeners();
  }

  /**
   * Initialize HLS player
   */
  async initialize(): Promise<boolean> {
    try {
      // Get available qualities
      await this.loadAvailableQualities();

      // Start ABR if enabled
      if (this.config.enableABR) {
        this.startABRMonitoring();
      }

      // Start buffer monitoring
      this.startBufferMonitoring();

      // Setup predictive prefetching
      if (this.config.enablePredictivePrefetch) {
        await this.setupPredictivePrefetching();
      }

      this.emit('initialized', { config: this.config });
      return true;

    } catch (error) {
      console.error('Failed to initialize HLS player:', error);
      this.emit('error', { error: 'Initialization failed', details: error });
      return false;
    }
  }

  /**
   * Load video and start playback
   */
  async loadAndPlay(): Promise<boolean> {
    try {
      // Start video stream
      const session = await this.videoStreamService.startVideoStream(
        this.config.videoId,
        this.config.initialQuality
      );

      // Update playback state
      this.playbackState.currentQuality = session.quality;
      this.playbackState.targetQuality = session.quality;
      this.playbackState.isPlaying = true;
      this.playbackState.isBuffering = true;

      // Get HLS playlist URL
      const playlistUrl = await this.getHLSPlaylistUrl(session.quality);

      // Update video source
      if (this.videoRef) {
        this.videoRef.seek(0);
      }

      this.emit('videoLoaded', { 
        videoId: this.config.videoId,
        quality: session.quality,
        playlistUrl,
      });

      return true;

    } catch (error) {
      console.error('Failed to load and play video:', error);
      this.emit('error', { error: 'Failed to load video', details: error });
      return false;
    }
  }

  /**
   * Get HLS playlist URL for specific quality
   */
  async getHLSPlaylistUrl(quality: string): Promise<string> {
    try {
      const playlist = await this.videoStreamService.getHLSPlaylist(
        this.config.videoId,
        quality
      );
      
      // Convert playlist to URL (in production, this would be actual CDN URL)
      return `${this.videoStreamService.getCurrentSession()?.sessionId ? 'https://your-server.com' : 'https://kronop-server.com'}/api/v1/streaming/${this.config.videoId}/${quality}/playlist.m3u8`;
      
    } catch (error) {
      console.error('Failed to get HLS playlist URL:', error);
      throw error;
    }
  }

  /**
   * Set video reference
   */
  setVideoRef(videoRef: VideoRef): void {
    this.videoRef = videoRef;
  }

  /**
   * Play video
   */
  play(): void {
    if (this.videoRef) {
      this.videoRef.presentFullscreenPlayer();
    }
    
    this.playbackState.isPlaying = true;
    this.emit('play', { state: this.playbackState });
  }

  /**
   * Pause video
   */
  pause(): void {
    if (this.videoRef) {
      this.videoRef.dismissFullscreenPlayer();
    }
    
    this.playbackState.isPlaying = false;
    this.emit('pause', { state: this.playbackState });
  }

  /**
   * Seek to specific time
   */
  seek(time: number): void {
    if (this.videoRef) {
      this.videoRef.seek(time);
    }
    
    this.playbackState.currentTime = time;
    this.emit('seek', { time, state: this.playbackState });
  }

  /**
   * Change video quality
   */
  async changeQuality(newQuality: string, reason?: string): Promise<boolean> {
    if (newQuality === this.playbackState.currentQuality) {
      return true;
    }

    try {
      const oldQuality = this.playbackState.currentQuality;
      
      // Update target quality
      this.playbackState.targetQuality = newQuality;
      
      // Get new playlist URL
      const playlistUrl = await this.getHLSPlaylistUrl(newQuality);
      
      // Change quality via stream service
      await this.videoStreamService.changeQuality(newQuality, reason);
      
      // Update metrics
      this.qualityMetrics.qualityChanges++;
      this.playbackState.currentQuality = newQuality;
      
      this.emit('qualityChanged', { 
        oldQuality, 
        newQuality, 
        reason: reason || 'Manual change',
        playlistUrl,
      });
      
      return true;
      
    } catch (error) {
      console.error('Failed to change quality:', error);
      this.emit('error', { error: 'Quality change failed', details: error });
      return false;
    }
  }

  /**
   * Set playback rate
   */
  setPlaybackRate(rate: number): void {
    this.playbackState.playbackRate = Math.max(0.25, Math.min(2.0, rate));
    this.emit('playbackRateChanged', { rate: this.playbackState.playbackRate });
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    this.playbackState.volume = Math.max(0, Math.min(1.0, volume));
    this.emit('volumeChanged', { volume: this.playbackState.volume });
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  /**
   * Get buffer metrics
   */
  getBufferMetrics(): BufferMetrics {
    return { ...this.bufferMetrics };
  }

  /**
   * Get quality metrics
   */
  getQualityMetrics(): QualityMetrics {
    return { ...this.qualityMetrics };
  }

  /**
   * Handle video progress update
   */
  onProgress(data: { currentTime: number; playableDuration: number; seekableDuration: number }): void {
    this.playbackState.currentTime = data.currentTime;
    
    // Calculate buffer health
    const bufferedDuration = data.playableDuration - data.currentTime;
    const bufferHealth = Math.min(100, (bufferedDuration / this.config.maxBufferTime!) * 100);
    
    this.playbackState.bufferHealth = bufferHealth;
    this.bufferMetrics.bufferSize = bufferedDuration;
    this.bufferMetrics.bufferHealth = bufferHealth;
    
    // Update stream service
    this.videoStreamService.updatePlaybackProgress(data.currentTime, data.seekableDuration);
    this.videoStreamService.updateBufferHealth(bufferHealth);
    
    // Detect rebuffering events
    this.detectRebuffering(data.currentTime, bufferedDuration);
    
    this.emit('progress', { 
      currentTime: data.currentTime,
      bufferedDuration,
      bufferHealth,
      state: this.playbackState,
    });
  }

  /**
   * Handle video load start
   */
  onLoadStart(): void {
    this.playbackState.isBuffering = true;
    this.emit('loadStart', { state: this.playbackState });
  }

  /**
   * Handle video load
   */
  onLoad(data: { duration: number; naturalSize: { width: number; height: number } }): void {
    this.playbackState.duration = data.duration;
    this.playbackState.isBuffering = false;
    
    this.emit('load', { 
      duration: data.duration,
      naturalSize: data.naturalSize,
      state: this.playbackState,
    });
  }

  /**
   * Handle video error
   */
  onError(error: any): void {
    this.playbackState.isBuffering = false;
    this.playbackState.isPlaying = false;
    
    this.emit('error', { 
      error: error.errorString || 'Unknown video error',
      code: error.errorCode,
      state: this.playbackState,
    });
  }

  /**
   * Handle video end
   */
  onEnd(): void {
    this.playbackState.isPlaying = false;
    this.playbackState.currentTime = this.playbackState.duration;
    
    this.emit('end', { state: this.playbackState });
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear timers
    if (this.abrTimer) {
      clearInterval(this.abrTimer);
      this.abrTimer = null;
    }
    if (this.bufferTimer) {
      clearInterval(this.bufferTimer);
      this.bufferTimer = null;
    }
    if (this.qualityChangeTimer) {
      clearTimeout(this.qualityChangeTimer);
      this.qualityChangeTimer = null;
    }

    // Reset state
    this.playbackState.isPlaying = false;
    this.playbackState.isBuffering = false;

    this.emit('cleanup', { state: this.playbackState });
  }

  // Private methods

  private setupEventListeners(): void {
    // Listen to stream service events
    this.videoStreamService.on('qualityRecommended', (data: any) => {
      if (this.config.enableABR) {
        this.handleQualityRecommendation(data);
      }
    });

    this.videoStreamService.on('networkQualityChanged', (data: any) => {
      this.handleNetworkQualityChange(data);
    });

    this.videoStreamService.on('bufferHealthUpdated', (data: any) => {
      this.handleBufferHealthUpdate(data);
    });

    this.videoStreamService.on('prefetchStatus', (data: any) => {
      this.handlePrefetchStatus(data);
    });
  }

  private async loadAvailableQualities(): Promise<void> {
    try {
      const masterPlaylist = await this.videoStreamService.getMasterPlaylist(this.config.videoId);
      
      // Parse master playlist to extract available qualities
      const qualities = this.parseQualitiesFromPlaylist(masterPlaylist);
      this.qualityMetrics.availableQualities = qualities;
      
      this.emit('qualitiesLoaded', { qualities });
      
    } catch (error) {
      console.error('Failed to load available qualities:', error);
      // Fallback to default qualities
      this.qualityMetrics.availableQualities = ['144p', '240p', '360p', '480p', '720p', '1080p', '4k'];
    }
  }

  private parseQualitiesFromPlaylist(playlist: string): string[] {
    const qualities: string[] = [];
    const lines = playlist.split('\n');
    
    for (const line of lines) {
      if (line.includes('RESOLUTION=')) {
        // Extract resolution and map to quality name
        const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
        if (resolutionMatch) {
          const resolution = resolutionMatch[1];
          const quality = this.mapResolutionToQuality(resolution);
          if (quality && !qualities.includes(quality)) {
            qualities.push(quality);
          }
        }
      }
    }
    
    return qualities.length > 0 ? qualities : ['360p']; // Fallback
  }

  private mapResolutionToQuality(resolution: string): string | null {
    const qualityMap: { [key: string]: string } = {
      '256x144': '144p',
      '426x240': '240p',
      '640x360': '360p',
      '854x480': '480p',
      '1280x720': '720p',
      '1920x1080': '1080p',
      '3840x2160': '4k',
    };
    
    return qualityMap[resolution] || null;
  }

  private startABRMonitoring(): void {
    if (this.abrTimer) {
      clearInterval(this.abrTimer);
    }

    this.abrTimer = setInterval(async () => {
      if (this.playbackState.isPlaying && !this.playbackState.isBuffering) {
        try {
          const decision = await this.videoStreamService.getABRDecision();
          if (decision && decision.targetQuality !== this.playbackState.currentQuality) {
            await this.changeQuality(decision.targetQuality, decision.reason);
          }
        } catch (error) {
          console.error('ABR decision failed:', error);
        }
      }
    }, 2000) as any; // Check every 2 seconds
  }

  private startBufferMonitoring(): void {
    if (this.bufferTimer) {
      clearInterval(this.bufferTimer);
    }

    this.bufferTimer = setInterval(() => {
      this.updateBufferMetrics();
    }, 1000) as any; // Update every second
  }

  private updateBufferMetrics(): void {
    const currentTime = Date.now();
    
    // Update buffer health based on strategy
    const targetBuffer = this.getTargetBufferSize();
    const currentBuffer = this.bufferMetrics.bufferSize;
    
    if (currentBuffer < targetBuffer * 0.3) {
      // Buffer is critically low
      this.bufferMetrics.bufferEvents++;
      this.emit('bufferLow', { 
        currentBuffer,
        targetBuffer,
        health: this.bufferMetrics.bufferHealth,
      });
    }
    
    this.lastBufferCheck = currentTime;
  }

  private getTargetBufferSize(): number {
    switch (this.config.bufferStrategy) {
      case 'conservative':
        return this.config.maxBufferTime!;
      case 'aggressive':
        return this.config.minBufferTime!;
      case 'balanced':
      default:
        return (this.config.maxBufferTime! + this.config.minBufferTime!) / 2;
    }
  }

  private detectRebuffering(currentTime: number, bufferedDuration: number): void {
    if (bufferedDuration <= 0.5 && this.playbackState.isPlaying) {
      // Rebuffering detected
      const now = Date.now();
      
      if (!this.bufferMetrics.lastRebufferTime || 
          now - this.bufferMetrics.lastRebufferTime > 2000) {
        
        this.bufferMetrics.rebufferCount++;
        this.bufferMetrics.lastRebufferTime = now;
        
        this.rebufferEvents.push({
          timestamp: now,
          duration: 0, // Will be updated when buffering ends
        });
        
        this.playbackState.isBuffering = true;
        
        this.emit('rebuffering', {
          currentTime,
          bufferedDuration,
          rebufferCount: this.bufferMetrics.rebufferCount,
        });
      }
    } else if (bufferedDuration > 2 && this.playbackState.isBuffering) {
      // Buffering ended
      this.playbackState.isBuffering = false;
      
      // Update rebuffer duration
      if (this.rebufferEvents.length > 0) {
        const lastEvent = this.rebufferEvents[this.rebufferEvents.length - 1];
        lastEvent.duration = Date.now() - lastEvent.timestamp;
        
        // Update average
        const totalDuration = this.rebufferEvents.reduce((sum, event) => sum + event.duration, 0);
        this.bufferMetrics.averageRebufferDuration = totalDuration / this.rebufferEvents.length;
      }
      
      this.emit('rebufferingEnded', {
        currentTime,
        bufferedDuration,
        averageDuration: this.bufferMetrics.averageRebufferDuration,
      });
    }
  }

  private handleQualityRecommendation(data: any): void {
    if (data.quality !== this.playbackState.currentQuality) {
      this.changeQuality(data.quality, 'ABR recommendation');
    }
  }

  private handleNetworkQualityChange(data: any): void {
    this.emit('networkQualityChanged', data);
    
    // Trigger ABR check if network quality changed significantly
    if (this.config.enableABR) {
      setTimeout(() => {
        this.videoStreamService.getABRDecision();
      }, 1000);
    }
  }

  private handleBufferHealthUpdate(data: any): void {
    this.bufferMetrics.bufferHealth = data.bufferHealth;
    this.emit('bufferHealthUpdate', data);
  }

  private handlePrefetchStatus(data: any): void {
    this.emit('prefetchStatus', data);
  }

  private async setupPredictivePrefetching(): Promise<void> {
    // Predictive prefetching is handled by the stream service
    // This method can be used for client-side prefetching optimizations
    this.emit('predictivePrefetchSetup', { enabled: true });
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}

export default HLSPlayerService;
