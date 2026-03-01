/**
 * Kronop Video Engine - React Native Interface
 * World's fastest video player with Rust core and JSI bridge
 */

import { NativeModules, Platform } from 'react-native';
import type { NativeModule } from 'react-native';

const { KronopVideoEngine } = NativeModules;

export interface VideoConfig {
  bufferSize?: number;
  minBuffer?: number;
  maxBuffer?: number;
  preferForwardRendering?: boolean;
  useTunneling?: boolean;
}

export interface VideoOptions {
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  startTime?: number;
  speed?: number;
}

export interface VideoInfo {
  url: string;
  videoId: number;
  duration: number;
  currentPosition: number;
  isPlaying: boolean;
  isInitialized: boolean;
  width?: number;
  height?: number;
  frameRate?: number;
  bitrate?: number;
  mimeType?: string;
}

export interface PerformanceMetrics {
  nativeEnginePtr: number;
  activePlayers: number;
  engineVersion: string;
  hardwareAccelerationEnabled: boolean;
  renderingBackend: string;
}

/**
 * Kronop Video Engine - Main interface
 */
export class KronopVideoEngineManager {
  private static instance: KronopVideoEngineManager;
  private players: Map<string, KronopVideoPlayer> = new Map();

  private constructor() {}

  static getInstance(): KronopVideoEngineManager {
    if (!KronopVideoEngineManager.instance) {
      KronopVideoEngineManager.instance = new KronopVideoEngineManager();
    }
    return KronopVideoEngineManager.instance;
  }

  /**
   * Create new video player instance
   */
  async createPlayer(playerId: string, config?: VideoConfig): Promise<KronopVideoPlayer> {
    try {
      // Check if KronopVideoEngine is available
      if (!KronopVideoEngine) {
        console.warn('⚠️ KronopVideoEngine not available, using fallback player');
        const fallbackPlayer = new KronopVideoPlayer(playerId);
        this.players.set(playerId, fallbackPlayer);
        return fallbackPlayer;
      }

      // Check if createPlayer method exists
      if (typeof KronopVideoEngine.createPlayer !== 'function') {
        console.warn('⚠️ KronopVideoEngine.createPlayer not available, using fallback player');
        const fallbackPlayer = new KronopVideoPlayer(playerId);
        this.players.set(playerId, fallbackPlayer);
        return fallbackPlayer;
      }

      const defaultConfig: VideoConfig = {
        bufferSize: 50000,
        minBuffer: 2000,
        maxBuffer: 10000,
        preferForwardRendering: true,
        useTunneling: true,
        ...config,
      };

      await KronopVideoEngine.createPlayer(playerId, defaultConfig);
      
      const player = new KronopVideoPlayer(playerId);
      this.players.set(playerId, player);
      
      console.log(`Kronop: Player created - ${playerId}`);
      return player;
    } catch (error) {
      console.error('Kronop: Failed to create player', error);
      // Fallback to basic player
      const fallbackPlayer = new KronopVideoPlayer(playerId);
      this.players.set(playerId, fallbackPlayer);
      return fallbackPlayer;
    }
  }

  /**
   * Get existing player instance
   */
  getPlayer(playerId: string): KronopVideoPlayer | undefined {
    return this.players.get(playerId);
  }

  /**
   * Release video player
   */
  async releasePlayer(playerId: string): Promise<void> {
    try {
      await KronopVideoEngine.releasePlayer(playerId);
      this.players.delete(playerId);
      console.log(`Kronop: Player released - ${playerId}`);
    } catch (error) {
      console.error('Kronop: Failed to release player', error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      return await KronopVideoEngine.getPerformanceMetrics();
    } catch (error) {
      console.error('Kronop: Failed to get performance metrics', error);
      throw error;
    }
  }

  /**
   * Release all players
   */
  async releaseAllPlayers(): Promise<void> {
    const releasePromises = Array.from(this.players.keys()).map(playerId => 
      this.releasePlayer(playerId)
    );
    
    await Promise.all(releasePromises);
    console.log('Kronop: All players released');
  }
}

/**
 * Individual video player instance
 */
export class KronopVideoPlayer {
  private playerId: string;
  private videoId: number | null = null;
  private isInitialized = false;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(playerId: string) {
    this.playerId = playerId;
  }

  /**
   * Load video with instant start capability
   */
  async loadVideo(videoUrl: string, options?: VideoOptions): Promise<number> {
    try {
      const defaultOptions: VideoOptions = {
        autoplay: false,
        muted: false,
        loop: false,
        startTime: 0,
        speed: 1.0,
        ...options,
      };

      const result = await KronopVideoEngine.loadVideo(this.playerId, videoUrl, defaultOptions);
      this.videoId = result.videoId;
      this.isInitialized = true;

      console.log(`Kronop: Video loaded - ${videoUrl} (ID: ${this.videoId})`);
      this.emit('videoLoaded', { videoUrl, videoId: this.videoId });
      
      return this.videoId;
    } catch (error) {
      console.error('Kronop: Failed to load video', error);
      throw error;
    }
  }

  /**
   * Start instant video playback
   */
  async play(): Promise<void> {
    if (!this.videoId) {
      throw new Error('No video loaded');
    }

    try {
      await KronopVideoEngine.playVideo(this.playerId, this.videoId);
      console.log(`Kronop: Playback started - Player: ${this.playerId}`);
      this.emit('play', { playerId: this.playerId, videoId: this.videoId });
    } catch (error) {
      console.error('Kronop: Failed to play video', error);
      throw error;
    }
  }

  /**
   * Pause video playback
   */
  async pause(): Promise<void> {
    try {
      await KronopVideoEngine.pauseVideo(this.playerId);
      console.log(`Kronop: Playback paused - Player: ${this.playerId}`);
      this.emit('pause', { playerId: this.playerId });
    } catch (error) {
      console.error('Kronop: Failed to pause video', error);
      throw error;
    }
  }

  /**
   * Seek to specific position (instant seek)
   */
  async seekTo(positionMs: number): Promise<void> {
    try {
      await KronopVideoEngine.seekTo(this.playerId, positionMs);
      console.log(`Kronop: Seeked to ${positionMs}ms - Player: ${this.playerId}`);
      this.emit('seek', { playerId: this.playerId, positionMs });
    } catch (error) {
      console.error('Kronop: Failed to seek', error);
      throw error;
    }
  }

  /**
   * Set playback speed
   */
  async setPlaybackSpeed(speed: number): Promise<void> {
    try {
      await KronopVideoEngine.setPlaybackSpeed(this.playerId, speed);
      console.log(`Kronop: Speed set to ${speed}x - Player: ${this.playerId}`);
      this.emit('speedChanged', { playerId: this.playerId, speed });
    } catch (error) {
      console.error('Kronop: Failed to set playback speed', error);
      throw error;
    }
  }

  /**
   * Get video information
   */
  async getVideoInfo(): Promise<VideoInfo> {
    try {
      const info = await KronopVideoEngine.getVideoInfo(this.playerId);
      return info;
    } catch (error) {
      console.error('Kronop: Failed to get video info', error);
      throw error;
    }
  }

  /**
   * Add event listener
   */
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Kronop: Error in event listener for ${event}`, error);
        }
      });
    }
  }

  /**
   * Get player ID
   */
  getPlayerId(): string {
    return this.playerId;
  }

  /**
   * Get video ID
   */
  getVideoId(): number | null {
    return this.videoId;
  }

  /**
   * Check if player is initialized
   */
  isPlayerInitialized(): boolean {
    return this.isInitialized;
  }
}

/**
 * Global Kronop Video Engine instance
 */
export const Kronop = KronopVideoEngineManager.getInstance();

/**
 * Quick start function for instant video playback
 */
export async function playVideoInstant(videoUrl: string, options?: VideoOptions & VideoConfig): Promise<KronopVideoPlayer> {
  const playerId = `kronop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const player = await Kronop.createPlayer(playerId, options);
  await player.loadVideo(videoUrl, options);
  
  if (options?.autoplay) {
    await player.play();
  }
  
  return player;
}

/**
 * Export types and utilities
 */
export default Kronop;

// Type declarations for native module
declare module 'react-native' {
  interface NativeModulesStatic {
    KronopVideoEngine: {
      createPlayer(playerId: string, config: VideoConfig): Promise<void>;
      loadVideo(playerId: string, videoUrl: string, options: VideoOptions): Promise<{ videoId: number; url: string; success: boolean }>;
      playVideo(playerId: string, videoId: number): Promise<boolean>;
      pauseVideo(playerId: string): Promise<boolean>;
      seekTo(playerId: string, positionMs: number): Promise<boolean>;
      getVideoInfo(playerId: string): Promise<VideoInfo>;
      setPlaybackSpeed(playerId: string, speed: number): Promise<boolean>;
      releasePlayer(playerId: string): Promise<boolean>;
      getPerformanceMetrics(): Promise<PerformanceMetrics>;
    };
  }
}
