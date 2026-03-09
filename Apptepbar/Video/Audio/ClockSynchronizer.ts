import { NativeModules, Platform } from 'react-native';

// Clock Synchronizer for Perfect Audio-Video Sync
export interface ClockSynchronizerInterface {
  initialize(): Promise<boolean>;
  synchronizeFrame(audioTimestamp: number, videoTimestamp: number): Promise<SyncResult>;
  adjustForVideoDelay(delayMs: number): Promise<void>;
  getSyncMetrics(): Promise<SyncMetrics>;
  setAudioSampleRate(sampleRate: number): Promise<void>;
  setVideoFrameRate(frameRate: number): Promise<void>;
  cleanup(): Promise<void>;
}

export interface SyncResult {
  audioAdjusted: boolean;
  videoAdjusted: boolean;
  masterClockTime: number;
  driftCompensation: number;
  latencyMs: number;
}

export interface SyncMetrics {
  masterClockTime: number;
  audioClockTime: number;
  videoClockTime: number;
  driftCompensation: number;
  jitterBufferLevel: number;
  targetLatencyMs: number;
  hardwareLatencyMs: number;
  audioSampleRate: number;
  videoFrameRate: number;
  syncAccuracyMs: number;
}

export interface AudioDeviceInfo {
  type: 'wired' | 'bluetooth' | 'usb' | 'builtin';
  latencyMs: number;
  sampleRate: number;
  channels: number;
  bufferSize: number;
}

export interface ClockConfig {
  masterClockMode: 'audio' | 'video' | 'external';
  targetLatencyMs: number;
  maxDriftThresholdMs: number;
  jitterBufferSize: number;
  enableBluetoothOptimization: boolean;
  enableAutoLatencyDetection: boolean;
}

// Master Clock Synchronizer Implementation
class ClockSynchronizer {
  private nativeSync: any;
  private isInitialized = false;
  private config: ClockConfig;
  private metrics: SyncMetrics;
  private audioDeviceInfo: AudioDeviceInfo | null = null;
  private syncHistory: number[] = [];
  private lastSyncTime = 0;
  private frameCount = 0;

  constructor(config: Partial<ClockConfig> = {}) {
    this.config = {
      masterClockMode: 'audio',
      targetLatencyMs: 20,
      maxDriftThresholdMs: 1,
      jitterBufferSize: 100,
      enableBluetoothOptimization: true,
      enableAutoLatencyDetection: true,
      ...config,
    };

    this.metrics = {
      masterClockTime: 0,
      audioClockTime: 0,
      videoClockTime: 0,
      driftCompensation: 0,
      jitterBufferLevel: 0,
      targetLatencyMs: this.config.targetLatencyMs,
      hardwareLatencyMs: 0,
      audioSampleRate: 48000,
      videoFrameRate: 60,
      syncAccuracyMs: 0,
    };

    this.nativeSync = NativeModules.KronopAtomicSync;
  }

  /**
   * Initialize Clock Synchronizer
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('⏰ Initializing Clock Synchronizer');
      console.log(`🎯 Master Clock Mode: ${this.config.masterClockMode}`);
      console.log(`🎧 Target Latency: ${this.config.targetLatencyMs}ms`);

      // Detect audio device
      await this.detectAudioDevice();

      // Initialize native sync system
      const success = await this.nativeSync.initialize();
      if (!success) {
        console.error('❌ Native sync initialization failed');
        return false;
      }

      // Configure master clock
      await this.configureMasterClock();

      // Start sync monitoring
      this.startSyncMonitoring();

      this.isInitialized = true;
      console.log('✅ Clock Synchronizer initialized successfully');
      console.log(`🎵 Audio Device: ${this.audioDeviceInfo?.type || 'unknown'}`);
      console.log(`📡 Hardware Latency: ${this.metrics.hardwareLatencyMs}ms`);

      return true;

    } catch (error) {
      console.error('❌ Clock Synchronizer initialization failed:', error);
      return false;
    }
  }

  /**
   * Detect and configure audio device
   */
  private async detectAudioDevice(): Promise<void> {
    try {
      console.log('🔍 Detecting audio device...');

      // Get audio device info from native layer
      const deviceInfo = await this.nativeSync.getAudioDeviceInfo();
      
      if (deviceInfo) {
        this.audioDeviceInfo = {
          type: deviceInfo.type || 'builtin',
          latencyMs: deviceInfo.latencyMs || 10,
          sampleRate: deviceInfo.sampleRate || 48000,
          channels: deviceInfo.channels || 2,
          bufferSize: deviceInfo.bufferSize || 1024,
        };

        // Apply Bluetooth optimization if enabled
        if (this.config.enableBluetoothOptimization && this.audioDeviceInfo.type === 'bluetooth') {
          this.config.targetLatencyMs += 40; // Add 40ms for Bluetooth
          console.log('📡 Bluetooth device detected, optimizing latency');
        }

        this.metrics.hardwareLatencyMs = this.audioDeviceInfo.latencyMs;
        this.metrics.audioSampleRate = this.audioDeviceInfo.sampleRate;

        console.log(`✅ Audio device detected: ${this.audioDeviceInfo.type}`);
        console.log(`🎧 Latency: ${this.audioDeviceInfo.latencyMs}ms`);
        console.log(`🎵 Sample Rate: ${this.audioDeviceInfo.sampleRate}Hz`);
      }

    } catch (error) {
      console.error('❌ Audio device detection failed:', error);
      // Use default values
      this.audioDeviceInfo = {
        type: 'builtin',
        latencyMs: 10,
        sampleRate: 48000,
        channels: 2,
        bufferSize: 1024,
      };
    }
  }

  /**
   * Configure master clock based on mode
   */
  private async configureMasterClock(): Promise<void> {
    try {
      console.log(`⚙️ Configuring master clock: ${this.config.masterClockMode}`);

      switch (this.config.masterClockMode) {
        case 'audio':
          await this.nativeSync.setAudioMasterMode();
          break;
        case 'video':
          await this.nativeSync.setVideoMasterMode();
          break;
        case 'external':
          await this.nativeSync.setExternalMasterMode();
          break;
      }

      // Set timing parameters
      await this.nativeSync.setTargetLatency(this.config.targetLatencyMs);
      await this.nativeSync.setMaxDriftThreshold(this.config.maxDriftThresholdMs);
      await this.nativeSync.setJitterBufferSize(this.config.jitterBufferSize);

      console.log('✅ Master clock configured successfully');

    } catch (error) {
      console.error('❌ Master clock configuration failed:', error);
    }
  }

  /**
   * Synchronize audio and video frames
   */
  async synchronizeFrame(audioTimestamp: number, videoTimestamp: number): Promise<SyncResult> {
    if (!this.isInitialized) {
      throw new Error('Clock Synchronizer not initialized');
    }

    try {
      const currentTime = Date.now() * 1000; // Convert to microseconds

      // Call native synchronization
      const syncResult = await this.nativeSync.synchronizeFrame(
        audioTimestamp,
        videoTimestamp,
        currentTime
      );

      // Update metrics
      await this.updateMetrics();

      // Track sync accuracy
      this.trackSyncAccuracy(syncResult.driftCompensation);

      // Log sync status every 60 frames
      this.frameCount++;
      if (this.frameCount % 60 === 0) {
        console.log(`🔄 Sync Status: Drift=${syncResult.driftCompensation.toFixed(2)}us, Latency=${syncResult.latencyMs.toFixed(2)}ms`);
      }

      return {
        audioAdjusted: syncResult.audioAdjusted,
        videoAdjusted: syncResult.videoAdjusted,
        masterClockTime: syncResult.masterClockTime,
        driftCompensation: syncResult.driftCompensation,
        latencyMs: syncResult.latencyMs,
      };

    } catch (error) {
      console.error('❌ Frame synchronization failed:', error);
      return {
        audioAdjusted: false,
        videoAdjusted: false,
        masterClockTime: 0,
        driftCompensation: 0,
        latencyMs: 0,
      };
    }
  }

  /**
   * Adjust for video processing delay
   */
  async adjustForVideoDelay(delayMs: number): Promise<void> {
    if (!this.isInitialized) {
      console.warn('⚠️ Clock Synchronizer not initialized');
      return;
    }

    try {
      const delayUs = delayMs * 1000; // Convert to microseconds
      await this.nativeSync.adjustAudioForVideoDelay(delayUs);
      
      console.log(`🔄 Audio adjusted for video delay: ${delayMs}ms`);

    } catch (error) {
      console.error('❌ Video delay adjustment failed:', error);
    }
  }

  /**
   * Set audio sample rate
   */
  async setAudioSampleRate(sampleRate: number): Promise<void> {
    if (!this.isInitialized) {
      console.warn('⚠️ Clock Synchronizer not initialized');
      return;
    }

    try {
      await this.nativeSync.setAudioSampleRate(sampleRate);
      this.metrics.audioSampleRate = sampleRate;
      
      console.log(`🎵 Audio sample rate set: ${sampleRate}Hz`);

    } catch (error) {
      console.error('❌ Audio sample rate setting failed:', error);
    }
  }

  /**
   * Set video frame rate
   */
  async setVideoFrameRate(frameRate: number): Promise<void> {
    if (!this.isInitialized) {
      console.warn('⚠️ Clock Synchronizer not initialized');
      return;
    }

    try {
      await this.nativeSync.setVideoFrameRate(frameRate);
      this.metrics.videoFrameRate = frameRate;
      
      console.log(`🎬 Video frame rate set: ${frameRate}fps`);

    } catch (error) {
      console.error('❌ Video frame rate setting failed:', error);
    }
  }

  /**
   * Get current synchronization metrics
   */
  async getSyncMetrics(): Promise<SyncMetrics> {
    if (!this.isInitialized) {
      return this.metrics;
    }

    try {
      const nativeMetrics = await this.nativeSync.getSyncMetrics();
      
      this.metrics = {
        masterClockTime: nativeMetrics.masterClockTime,
        audioClockTime: nativeMetrics.audioClockTime,
        videoClockTime: nativeMetrics.videoClockTime,
        driftCompensation: nativeMetrics.driftCompensation,
        jitterBufferLevel: nativeMetrics.jitterBufferLevel,
        targetLatencyMs: nativeMetrics.targetLatencyMs,
        hardwareLatencyMs: nativeMetrics.hardwareLatencyMs,
        audioSampleRate: nativeMetrics.audioSampleRate,
        videoFrameRate: nativeMetrics.videoFrameRate,
        syncAccuracyMs: this.calculateSyncAccuracy(),
      };

      return this.metrics;

    } catch (error) {
      console.error('❌ Failed to get sync metrics:', error);
      return this.metrics;
    }
  }

  /**
   * Update metrics from native layer
   */
  private async updateMetrics(): Promise<void> {
    try {
      const nativeMetrics = await this.nativeSync.getSyncMetrics();
      
      this.metrics.masterClockTime = nativeMetrics.masterClockTime;
      this.metrics.audioClockTime = nativeMetrics.audioClockTime;
      this.metrics.videoClockTime = nativeMetrics.videoClockTime;
      this.metrics.driftCompensation = nativeMetrics.driftCompensation;
      this.metrics.jitterBufferLevel = nativeMetrics.jitterBufferLevel;

    } catch (error) {
      console.error('❌ Metrics update failed:', error);
    }
  }

  /**
   * Track sync accuracy over time
   */
  private trackSyncAccuracy(driftCompensation: number): void {
    const driftMs = Math.abs(driftCompensation) / 1000; // Convert to milliseconds
    
    this.syncHistory.push(driftMs);
    if (this.syncHistory.length > 300) { // Keep last 5 seconds at 60fps
      this.syncHistory.shift();
    }

    this.lastSyncTime = Date.now();
  }

  /**
   * Calculate sync accuracy
   */
  private calculateSyncAccuracy(): number {
    if (this.syncHistory.length === 0) return 0;

    const sum = this.syncHistory.reduce((a, b) => a + b, 0);
    return sum / this.syncHistory.length;
  }

  /**
   * Start sync monitoring
   */
  private startSyncMonitoring(): void {
    console.log('📊 Starting sync monitoring');

    // Monitor sync health every second
    setInterval(async () => {
      if (!this.isInitialized) return;

      try {
        const metrics = await this.getSyncMetrics();
        
        // Check for sync issues
        if (Math.abs(metrics.driftCompensation) > this.config.maxDriftThresholdMs * 1000) {
          console.warn(`⚠️ High drift detected: ${metrics.driftCompensation}us`);
        }

        if (metrics.jitterBufferLevel > this.config.jitterBufferSize * 0.8) {
          console.warn(`⚠️ Jitter buffer nearly full: ${metrics.jitterBufferLevel}/${this.config.jitterBufferSize}`);
        }

        // Log performance metrics every 10 seconds
        if (this.frameCount % 600 === 0) {
          console.log(`📊 Sync Performance: Accuracy=${metrics.syncAccuracyMs.toFixed(2)}ms, Drift=${(metrics.driftCompensation/1000).toFixed(2)}ms`);
        }

      } catch (error) {
        console.error('❌ Sync monitoring failed:', error);
      }
    }, 1000);
  }

  /**
   * Get audio device information
   */
  getAudioDeviceInfo(): AudioDeviceInfo | null {
    return this.audioDeviceInfo;
  }

  /**
   * Check if synchronizer is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current configuration
   */
  getConfig(): ClockConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ClockConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Configuration updated');
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Clock Synchronizer');

    try {
      if (this.nativeSync) {
        await this.nativeSync.cleanup();
      }

      this.isInitialized = false;
      this.syncHistory = [];
      this.frameCount = 0;

      console.log('✅ Clock Synchronizer cleanup completed');

    } catch (error) {
      console.error('❌ Clock Synchronizer cleanup failed:', error);
    }
  }
}

// Singleton instance for global access
let clockSynchronizerInstance: ClockSynchronizer | null = null;

/**
 * Get Clock Synchronizer instance
 */
export function getClockSynchronizer(config?: Partial<ClockConfig>): ClockSynchronizer {
  if (!clockSynchronizerInstance) {
    clockSynchronizerInstance = new ClockSynchronizer(config);
  }
  return clockSynchronizerInstance;
}

/**
 * Initialize Clock Synchronizer (call once at app start)
 */
export async function initializeClockSynchronizer(config?: Partial<ClockConfig>): Promise<boolean> {
  const synchronizer = getClockSynchronizer(config);
  return await synchronizer.initialize();
}

/**
 * Cleanup Clock Synchronizer (call once at app exit)
 */
export async function cleanupClockSynchronizer(): Promise<void> {
  if (clockSynchronizerInstance) {
    await clockSynchronizerInstance.cleanup();
    clockSynchronizerInstance = null;
  }
}

// Export for React Native
export default {
  getClockSynchronizer,
  initializeClockSynchronizer,
  cleanupClockSynchronizer,
};
