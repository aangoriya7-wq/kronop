/**
 * Kronop Native Engine - React Native Bridge
 * Connects React Native with Rust video engine
 */

import { NativeModules, Platform } from 'react-native';

const { KronopNativeEngine: NativeKronopEngine } = NativeModules;

export interface NativeVideoConfig {
  url: string;
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
  enableSharpening?: boolean;
  sharpeningStrength?: number;
  antiAliasing?: boolean;
  renderingMode?: 'ultra-sharp' | 'balanced' | 'performance';
}

export interface NativeVideoInfo {
  id: number;
  url: string;
  width: number;
  height: number;
  duration: number;
  frameRate: number;
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
}

export interface NativeFrameData {
  data: ArrayBuffer;
  width: number;
  height: number;
  timestamp: number;
  isKeyframe: boolean;
}

/**
 * Native Video Engine Bridge
 */
export class KronopNativeEngine {
  private static instance: KronopNativeEngine;
  private isInitialized: boolean = false;
  private activeVideos: Map<number, NativeVideoInfo> = new Map();

  private constructor() {}

  static getInstance(): KronopNativeEngine {
    if (!KronopNativeEngine.instance) {
      KronopNativeEngine.instance = new KronopNativeEngine();
    }
    return KronopNativeEngine.instance;
  }

  /**
   * Initialize native Rust engine
   */
  async initialize(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        // Check if NativeKronopEngine is available
        if (!NativeKronopEngine) {
          console.warn('⚠️ NativeKronopEngine not available, using fallback mode');
          this.isInitialized = false;
          return false;
        }

        // Check if initialize method exists
        if (typeof NativeKronopEngine.initialize !== 'function') {
          console.warn('⚠️ NativeKronopEngine.initialize not available, using fallback mode');
          this.isInitialized = false;
          return false;
        }

        const success = await NativeKronopEngine.initialize();
        this.isInitialized = success;
        
        if (success) {
          console.log('🔥 Kronop Native Engine initialized successfully');
        } else {
          console.error('❌ Failed to initialize Kronop Native Engine');
        }
        
        return success;
      } else {
        console.warn('⚠️ Kronop Native Engine only supports Android and iOS');
        this.isInitialized = false;
        return false;
      }
    } catch (error) {
      console.error('❌ Error initializing native engine:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Load video in native engine with ultra-sharp rendering
   */
  async loadVideo(config: NativeVideoConfig): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Native engine not initialized');
    }

    try {
      // Enable ultra-sharp rendering by default
      const enhancedConfig: NativeVideoConfig = {
        ...config,
        enableSharpening: config.enableSharpening ?? true,
        sharpeningStrength: config.sharpeningStrength ?? 0.8,
        antiAliasing: config.antiAliasing ?? true,
        renderingMode: config.renderingMode ?? 'ultra-sharp',
      };

      const videoId = await NativeKronopEngine.loadVideo(enhancedConfig);
      
      // Store video info
      const videoInfo: NativeVideoInfo = {
        id: videoId,
        url: config.url,
        width: config.width,
        height: config.height,
        duration: 0, // Will be updated by native engine
        frameRate: config.frameRate,
        isPlaying: false,
        currentFrame: 0,
        totalFrames: 0,
      };
      
      this.activeVideos.set(videoId, videoInfo);
      
      console.log('🎥 Video loaded in native engine with ultra-sharp rendering:', videoId);
      console.log('🔧 Rendering config:', {
        sharpening: enhancedConfig.enableSharpening,
        strength: enhancedConfig.sharpeningStrength,
        antiAliasing: enhancedConfig.antiAliasing,
        mode: enhancedConfig.renderingMode,
      });
      
      return videoId;
    } catch (error) {
      console.error('❌ Failed to load video:', error);
      throw error;
    }
  }

  /**
   * Start video playback
   */
  async playVideo(videoId: number): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Native engine not initialized');
    }

    try {
      const success = await NativeKronopEngine.playVideo(videoId);
      
      if (success) {
        // Update video info
        const videoInfo = this.activeVideos.get(videoId);
        if (videoInfo) {
          videoInfo.isPlaying = true;
        }
        
        console.log('▶️ Video started:', videoId);
      }
      
      return success;
    } catch (error) {
      console.error('❌ Failed to play video:', error);
      throw error;
    }
  }

  /**
   * Pause video playback
   */
  async pauseVideo(videoId: number): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Native engine not initialized');
    }

    try {
      const success = await NativeKronopEngine.pauseVideo(videoId);
      
      if (success) {
        // Update video info
        const videoInfo = this.activeVideos.get(videoId);
        if (videoInfo) {
          videoInfo.isPlaying = false;
        }
        
        console.log('⏸️ Video paused:', videoId);
      }
      
      return success;
    } catch (error) {
      console.error('❌ Failed to pause video:', error);
      throw error;
    }
  }

  /**
   * Get next decoded frame with sharpening filter applied
   */
  async getNextFrame(videoId: number): Promise<NativeFrameData | null> {
    if (!this.isInitialized) {
      throw new Error('Native engine not initialized');
    }

    try {
      const frameData = await NativeKronopEngine.getNextFrame(videoId);
      
      if (frameData) {
        // Apply real-time sharpening filter to frame
        const sharpenedFrame = await this.applySharpeningFilter(frameData);
        
        // Update video info
        const videoInfo = this.activeVideos.get(videoId);
        if (videoInfo) {
          videoInfo.currentFrame += 1;
        }
        
        console.log('🎬 Sharpened frame received for video:', videoId);
        return sharpenedFrame;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to get next frame:', error);
      return null;
    }
  }

  /**
   * Apply real-time sharpening filter to frame
   */
  private async applySharpeningFilter(frameData: NativeFrameData): Promise<NativeFrameData> {
    try {
      // Apply anti-aliasing and sharpening in native layer
      const sharpenedData = await NativeKronopEngine.applySharpeningFilter(frameData, {
        strength: 0.8,
        antiAliasing: true,
        mode: 'ultra-sharp',
      });
      
      return sharpenedData;
    } catch (error) {
      console.warn('⚠️ Sharpening filter failed, using original frame:', error);
      return frameData;
    }
  }

  /**
   * Update rendering quality dynamically
   */
  async updateRenderingQuality(videoId: number, quality: 'ultra-sharp' | 'balanced' | 'performance'): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Native engine not initialized');
    }

    try {
      const success = await NativeKronopEngine.updateRenderingQuality(videoId, quality);
      
      if (success) {
        console.log('🔧 Rendering quality updated:', quality);
      }
      
      return success;
    } catch (error) {
      console.error('❌ Failed to update rendering quality:', error);
      return false;
    }
  }

  /**
   * Enable/disable real-time sharpening
   */
  async toggleSharpening(videoId: number, enabled: boolean, strength: number = 0.8): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Native engine not initialized');
    }

    try {
      const success = await NativeKronopEngine.toggleSharpening(videoId, enabled, strength);
      
      if (success) {
        console.log(`🔧 Sharpening ${enabled ? 'enabled' : 'disabled'} with strength ${strength}`);
      }
      
      return success;
    } catch (error) {
      console.error('❌ Failed to toggle sharpening:', error);
      return false;
    }
  }

  /**
   * Seek to specific frame
   */
  async seekToFrame(videoId: number, frame: number): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Native engine not initialized');
    }

    try {
      const success = await NativeKronopEngine.seekToFrame(videoId, frame);
      
      if (success) {
        // Update video info
        const videoInfo = this.activeVideos.get(videoId);
        if (videoInfo) {
          videoInfo.currentFrame = frame;
        }
        
        console.log('⏩ Seeked to frame:', frame);
      }
      
      return success;
    } catch (error) {
      console.error('❌ Failed to seek:', error);
      throw error;
    }
  }

  /**
   * Get video information
   */
  async getVideoInfo(videoId: number): Promise<NativeVideoInfo | null> {
    if (!this.isInitialized) {
      throw new Error('Native engine not initialized');
    }

    try {
      const info = await NativeKronopEngine.getVideoInfo(videoId);
      
      if (info) {
        // Update local cache
        this.activeVideos.set(videoId, info);
      }
      
      return info;
    } catch (error) {
      console.error('❌ Failed to get video info:', error);
      return null;
    }
  }

  /**
   * Release video resources
   */
  async releaseVideo(videoId: number): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Native engine not initialized');
    }

    try {
      const success = await NativeKronopEngine.releaseVideo(videoId);
      
      if (success) {
        // Remove from active videos
        this.activeVideos.delete(videoId);
        console.log('🗑️ Video released:', videoId);
      }
      
      return success;
    } catch (error) {
      console.error('❌ Failed to release video:', error);
      throw error;
    }
  }

  /**
   * Get active video list
   */
  getActiveVideos(): NativeVideoInfo[] {
    return Array.from(this.activeVideos.values());
  }

  /**
   * Check if engine is initialized
   */
  isEngineInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    try {
      // Release all active videos
      const videoIds = Array.from(this.activeVideos.keys());
      for (const videoId of videoIds) {
        await this.releaseVideo(videoId);
      }
      
      // Cleanup native engine
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        await NativeKronopEngine.cleanup();
      }
      
      this.isInitialized = false;
      console.log('🗑️ Kronop Native Engine cleaned up');
    } catch (error) {
      console.error('❌ Failed to cleanup:', error);
    }
  }
}

/**
 * Global native engine instance
 */
export const KronopNative = KronopNativeEngine.getInstance();

/**
 * Quick start function for native video playback
 */
export async function playVideoNative(
  videoUrl: string,
  config: Partial<NativeVideoConfig> = {}
): Promise<{ videoId: number; engine: KronopNativeEngine }> {
  // Default configuration
  const defaultConfig: NativeVideoConfig = {
    url: videoUrl,
    width: 1920,
    height: 1080,
    frameRate: 30,
    bitrate: 5_000_000,
    ...config,
  };

  // Initialize engine if not already done
  if (!KronopNative.isEngineInitialized()) {
    const initialized = await KronopNative.initialize();
    if (!initialized) {
      throw new Error('Failed to initialize native engine');
    }
  }

  // Load video
  const videoId = await KronopNative.loadVideo(defaultConfig);
  
  // Start playback
  await KronopNative.playVideo(videoId);
  
  console.log('🚀 Native video playback started:', videoId);
  
  return { videoId, engine: KronopNative };
}

export default KronopNative;
