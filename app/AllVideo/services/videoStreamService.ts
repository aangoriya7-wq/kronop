// WebTransport types (commented out as WebTransport is not yet available in React Native)
// type WebTransport = any;
// type WebTransportBidirectionalStream = any;

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types for video streaming
export interface VideoStreamConfig {
  serverUrl: string;
  userId: string;
  sessionId: string;
  preferredQuality?: string;
  enablePredictivePrefetch?: boolean;
  enableABR?: boolean;
}

export interface StreamSession {
  sessionId: string;
  videoId: string;
  quality: string;
  status: 'idle' | 'connecting' | 'playing' | 'paused' | 'buffering' | 'error';
  bufferHealth: number;
  networkQuality: string;
  currentBitrate: number;
  totalDuration: number;
  currentPosition: number;
}

export interface NetworkQuality {
  quality: '2g' | '3g' | '4g' | 'wifi' | '4g+';
  bandwidth: number; // Mbps
  latency: number; // ms
  packetLoss: number; // percentage
  effectiveType: string;
}

export interface ABRDecision {
  currentQuality: string;
  targetQuality: string;
  reason: string;
  confidence: number;
  estimatedTime: number;
  networkQuality: string;
}

export interface PrefetchStatus {
  videoId: string;
  progress: number; // 0-100
  status: 'queued' | 'downloading' | 'completed' | 'failed';
  segmentsDownloaded: number;
  totalSegments: number;
  reason: string;
}

export interface StreamingStats {
  totalBytesDownloaded: number;
  averageBitrate: number;
  bufferEvents: number;
  qualityChanges: number;
  uptime: number;
  errorCount: number;
}

class VideoStreamService {
  private webTransport: any = null; // WebTransport | null = null;
  private stream: any = null; // WebTransportBidirectionalStream | null = null;
  private config: VideoStreamConfig | null = null;
  private currentSession: StreamSession | null = null;
  private networkMonitor: NetworkMonitor | null = null;
  private abrManager: ABRManager | null = null;
  private prefetchManager: PrefetchManager | null = null;
  private stats: StreamingStats;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.stats = {
      totalBytesDownloaded: 0,
      averageBitrate: 0,
      bufferEvents: 0,
      qualityChanges: 0,
      uptime: 0,
      errorCount: 0,
    };
  }

  /**
   * Initialize video streaming service with WebTransport
   */
  async initialize(config: VideoStreamConfig): Promise<boolean> {
    try {
      this.config = config;
      
      // Check if WebTransport is available
      if (typeof (globalThis as any).WebTransport === 'undefined') {
        // Fallback to HTTP/HTTPS for React Native
        console.log('WebTransport not available, using HTTP fallback');
        return true; // Continue with HTTP fallback
      }

      const transportUrl = `${config.serverUrl.replace('http', 'https')}/streaming`;
      this.webTransport = new (globalThis as any).WebTransport(transportUrl, {
        requireUnreliable: false,
        serverCertificateHashes: [], // Add certificate hashes if needed
      });
      
      // Wait for connection to be ready
      await this.webTransport.ready;
      
      // Create bidirectional stream
      this.stream = await this.webTransport.createBidirectionalStream();
      
      // Initialize managers
      this.networkMonitor = new NetworkMonitor();
      this.abrManager = new ABRManager(this.networkMonitor);
      this.prefetchManager = new PrefetchManager(config, this.webTransport);
      
      // Start monitoring
      this.startNetworkMonitoring();
      this.startStatsCollection();
      
      // Setup message handlers
      this.setupMessageHandlers();
      
      this.emit('initialized', { config });
      return true;

    } catch (error: any) {
      console.error('Failed to initialize video streaming service:', error);
      this.emit('error', { error: 'Initialization failed', details: error.message || 'Unknown error' });
      return false;
    }
  }

  /**
   * Start streaming a video
   */
  async startVideoStream(videoId: string, quality?: string): Promise<StreamSession> {
    if (!this.webTransport || !this.stream) {
      // Use HTTP fallback if WebTransport is not available
      console.log('Using HTTP fallback for streaming');
    }

    try {
      // Create streaming session
      const session: StreamSession = {
        sessionId: this.config!.sessionId,
        videoId,
        quality: quality || this.config!.preferredQuality || 'auto',
        status: 'connecting',
        bufferHealth: 0,
        networkQuality: 'unknown',
        currentBitrate: 0,
        totalDuration: 0,
        currentPosition: 0,
      };

      this.currentSession = session;

      // Start ABR session
      if (this.config!.enableABR) {
        await this.abrManager!.createSession(session.sessionId, videoId, session.quality);
      }

      // Send start stream request
      const request = {
        type: 'START_STREAM',
        data: {
          sessionId: session.sessionId,
          videoId,
          quality: session.quality,
          userId: this.config!.userId,
        },
      };

      await this.sendMessage(request);

      // Start predictive prefetching
      if (this.config!.enablePredictivePrefetch) {
        await this.prefetchManager!.startPredictivePrefetching(videoId, session.quality);
      }

      session.status = 'playing';
      this.emit('streamStarted', session);

      return session;

    } catch (error: any) {
      console.error('Failed to start video stream:', error);
      if (this.currentSession) {
        this.currentSession.status = 'error';
      }
      this.emit('error', { error: 'Failed to start stream', details: error.message || 'Unknown error' });
      throw error;
    }
  }

  /**
   * Get HLS playlist for video
   */
  async getHLSPlaylist(videoId: string, quality: string): Promise<string> {
    try {
      const response = await fetch(`${this.config!.serverUrl}/api/v1/streaming/${videoId}/${quality}/playlist.m3u8`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch playlist: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error('Failed to get HLS playlist:', error);
      throw error;
    }
  }

  /**
   * Get master playlist with all qualities
   */
  async getMasterPlaylist(videoId: string): Promise<string> {
    try {
      const response = await fetch(`${this.config!.serverUrl}/api/v1/streaming/${videoId}/master.m3u8`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch master playlist: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error('Failed to get master playlist:', error);
      throw error;
    }
  }

  /**
   * Get video segment with caching
   */
  async getVideoSegment(videoId: string, quality: string, segmentName: string): Promise<ArrayBuffer> {
    try {
      // Check cache first
      const cacheKey = `segment_${videoId}_${quality}_${segmentName}`;
      const cached = await this.getCachedSegment(cacheKey);
      
      if (cached) {
        this.emit('segmentFromCache', { videoId, quality, segmentName });
        return cached;
      }

      // Fetch from server
      const response = await fetch(
        `${this.config!.serverUrl}/api/v1/streaming/${videoId}/${quality}/${segmentName}`,
        {
          headers: {
            'Cache-Control': 'public, max-age=3600',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch segment: ${response.status}`);
      }

      const segmentData = await response.arrayBuffer();
      
      // Cache the segment
      await this.cacheSegment(cacheKey, segmentData);
      
      // Update stats
      this.stats.totalBytesDownloaded += segmentData.byteLength;
      
      this.emit('segmentDownloaded', { 
        videoId, 
        quality, 
        segmentName, 
        size: segmentData.byteLength 
      });

      return segmentData;

    } catch (error) {
      console.error('Failed to get video segment:', error);
      this.stats.errorCount++;
      throw error;
    }
  }

  /**
   * Update playback progress
   */
  async updatePlaybackProgress(currentPosition: number, totalDuration: number): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.currentPosition = currentPosition;
    this.currentSession.totalDuration = totalDuration;

    // Send progress update to server
    const request = {
      type: 'PROGRESS_UPDATE',
      data: {
        sessionId: this.currentSession.sessionId,
        currentPosition,
        totalDuration,
        quality: this.currentSession.quality,
      },
    };

    await this.sendMessage(request);

    // Update prefetching based on progress
    if (this.config!.enablePredictivePrefetch) {
      await this.prefetchManager!.updateProgress(currentPosition, totalDuration);
    }

    this.emit('progressUpdated', { currentPosition, totalDuration });
  }

  /**
   * Update buffer health
   */
  async updateBufferHealth(bufferHealth: number): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.bufferHealth = bufferHealth;

    // Send buffer health to ABR manager
    if (this.config!.enableABR) {
      await this.abrManager!.updateBufferHealth(this.currentSession.sessionId, bufferHealth);
    }

    this.emit('bufferHealthUpdated', { bufferHealth });
  }

  /**
   * Get current ABR decision
   */
  async getABRDecision(): Promise<ABRDecision | null> {
    if (!this.config!.enableABR || !this.currentSession) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.config!.serverUrl}/api/v1/streaming/abr/session/${this.currentSession.sessionId}/decision`
      );

      if (!response.ok) {
        throw new Error(`Failed to get ABR decision: ${response.status}`);
      }

      const decision = await response.json();
      
      // Apply quality change if needed
      if (decision.targetQuality !== this.currentSession.quality) {
        await this.changeQuality(decision.targetQuality, decision.reason);
      }

      return decision;

    } catch (error) {
      console.error('Failed to get ABR decision:', error);
      return null;
    }
  }

  /**
   * Change video quality
   */
  async changeQuality(newQuality: string, reason?: string): Promise<void> {
    if (!this.currentSession || this.currentSession.quality === newQuality) {
      return;
    }

    const oldQuality = this.currentSession.quality;
    this.currentSession.quality = newQuality;
    this.stats.qualityChanges++;

    // Send quality change request
    const request = {
      type: 'QUALITY_CHANGE',
      data: {
        sessionId: this.currentSession.sessionId,
        oldQuality,
        newQuality,
        reason: reason || 'Manual change',
      },
    };

    await this.sendMessage(request);

    this.emit('qualityChanged', { 
      oldQuality, 
      newQuality, 
      reason: reason || 'Manual change' 
    });
  }

  /**
   * Get prefetch status
   */
  async getPrefetchStatus(videoId?: string): Promise<PrefetchStatus[]> {
    if (!this.config!.enablePredictivePrefetch) {
      return [];
    }

    try {
      const userId = this.config!.userId;
      const url = videoId 
        ? `${this.config!.serverUrl}/api/v1/streaming/predictive/status/${userId}?videoId=${videoId}`
        : `${this.config!.serverUrl}/api/v1/streaming/predictive/status/${userId}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to get prefetch status: ${response.status}`);
      }

      const data = await response.json();
      return data.jobs || [];

    } catch (error) {
      console.error('Failed to get prefetch status:', error);
      return [];
    }
  }

  /**
   * Get streaming statistics
   */
  getStreamingStats(): StreamingStats {
    return { ...this.stats };
  }

  /**
   * Get current session
   */
  getCurrentSession(): StreamSession | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  /**
   * Test network connection
   */
  async testNetworkConnection(): Promise<NetworkQuality> {
    try {
      const response = await fetch(`${this.config!.serverUrl}/api/v1/network/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: `${this.config!.serverUrl}/api/v1/network/test-file`,
          testDuration: 5000,
          downloadSize: 1048576, // 1MB
        }),
      });

      if (!response.ok) {
        throw new Error(`Network test failed: ${response.status}`);
      }

      const result = await response.json();
      
      const networkQuality: NetworkQuality = {
        quality: result.quality,
        bandwidth: result.bandwidth,
        latency: parseFloat(result.latency),
        packetLoss: result.packetLoss,
        effectiveType: result.effectiveType || 'unknown',
      };

      this.emit('networkTested', networkQuality);
      return networkQuality;

    } catch (error) {
      console.error('Network test failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    try {
      // Send disconnect message
      if (this.stream) {
        const request = {
          type: 'DISCONNECT',
          data: {
            sessionId: this.currentSession?.sessionId,
            userId: this.config?.userId,
          },
        };

        await this.sendMessage(request);
      }

      // Close WebTransport
      if (this.webTransport) {
        this.webTransport.close();
      }

      // Cleanup managers
      this.networkMonitor?.stop();
      this.abrManager?.cleanup();
      this.prefetchManager?.cleanup();

      // Reset state
      this.webTransport = null;
      this.stream = null;
      this.currentSession = null;
      this.networkMonitor = null;
      this.abrManager = null;
      this.prefetchManager = null;

      this.emit('disconnected');

    } catch (error) {
      console.error('Error during disconnect:', error);
    }
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

  // Private methods

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

  private async sendMessage(message: any): Promise<void> {
    if (!this.stream) {
      throw new Error('No active stream');
    }

    const writer = this.stream.writable.getWriter();
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(JSON.stringify(message)));
    writer.releaseLock();
  }

  private setupMessageHandlers(): void {
    if (!this.stream) return;

    const reader = this.stream.readable.getReader();
    const decoder = new TextDecoder();

    const processMessages = async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          try {
            const message = JSON.parse(decoder.decode(value));
            this.handleServerMessage(message);
          } catch (error) {
            console.error('Failed to parse server message:', error);
          }
        }
      } catch (error) {
        console.error('Error reading from stream:', error);
        this.emit('connectionError', { error });
      }
    };

    processMessages();
  }

  private handleServerMessage(message: any): void {
    switch (message.type) {
      case 'QUALITY_RECOMMENDATION':
        this.emit('qualityRecommended', message.data);
        break;
      
      case 'BUFFER_UPDATE':
        if (this.currentSession) {
          this.currentSession.bufferHealth = message.data.bufferHealth;
        }
        this.emit('bufferUpdate', message.data);
        break;
      
      case 'NETWORK_QUALITY_UPDATE':
        if (this.currentSession) {
          this.currentSession.networkQuality = message.data.quality;
        }
        this.emit('networkQualityUpdate', message.data);
        break;
      
      case 'PREFETCH_STATUS':
        this.emit('prefetchStatus', message.data);
        break;
      
      case 'ERROR':
        this.emit('serverError', message.data);
        break;
      
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private startNetworkMonitoring(): void {
    if (!this.networkMonitor) return;

    this.networkMonitor.on('qualityChanged', (quality: NetworkQuality) => {
      if (this.currentSession) {
        this.currentSession.networkQuality = quality.quality;
      }
      this.emit('networkQualityChanged', quality);
    });

    this.networkMonitor.start();
  }

  private startStatsCollection(): void {
    setInterval(() => {
      this.stats.uptime += 1;
      
      // Calculate average bitrate
      if (this.stats.uptime > 0) {
        this.stats.averageBitrate = (this.stats.totalBytesDownloaded * 8) / (this.stats.uptime * 1000); // Mbps
      }
      
      this.emit('statsUpdated', this.stats);
    }, 1000);
  }

  private async getCachedSegment(key: string): Promise<ArrayBuffer | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const data = JSON.parse(cached);
        return this.base64ToArrayBuffer(data.data);
      }
    } catch (error) {
      console.error('Failed to get cached segment:', error);
    }
    return null;
  }

  private async cacheSegment(key: string, data: ArrayBuffer): Promise<void> {
    try {
      const base64Data = this.arrayBufferToBase64(data);
      await AsyncStorage.setItem(key, JSON.stringify({
        data: base64Data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to cache segment:', error);
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Network Monitor Class
class NetworkMonitor {
  private listeners: Map<string, Function[]> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private currentQuality: NetworkQuality = {
    quality: 'wifi' as '2g' | '3g' | '4g' | 'wifi' | '4g+',
    bandwidth: 0,
    latency: 0,
    packetLoss: 0,
    effectiveType: 'unknown',
  };

  start(): void {
    this.monitoringInterval = setInterval(() => {
      this.measureNetworkQuality();
    }, 5000) as any; // Measure every 5 seconds
  }

  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  private async measureNetworkQuality(): Promise<void> {
    try {
      // Use NetInfo for basic network info (commented out as NetInfo is not imported)
      // const netInfo = await NetInfo.fetch();
      
      // Estimate quality based on connection type
      let quality: '2g' | '3g' | '4g' | 'wifi' | '4g+' = 'wifi';
      let bandwidth = 0;

      // Mock network detection (would use actual NetInfo in production)
      quality = 'wifi';
      bandwidth = 10; // Estimate 10 Mbps for WiFi

      const newQuality: NetworkQuality = {
        quality,
        bandwidth,
        latency: this.currentQuality.latency, // Would need actual ping test
        packetLoss: this.currentQuality.packetLoss, // Would need actual measurement
        effectiveType: 'unknown',
      };

      if (newQuality.quality !== this.currentQuality.quality) {
        this.currentQuality = newQuality;
        this.emit('qualityChanged', newQuality);
      }

    } catch (error: any) {
      console.error('Failed to measure network quality:', error);
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  getCurrentQuality(): NetworkQuality {
    return { ...this.currentQuality };
  }
}

// ABR Manager Class
class ABRManager {
  private networkMonitor: NetworkMonitor;
  private sessions: Map<string, any> = new Map();

  constructor(networkMonitor: NetworkMonitor) {
    this.networkMonitor = networkMonitor;
  }

  async createSession(sessionId: string, videoId: string, quality: string): Promise<void> {
    // Session creation logic
    this.sessions.set(sessionId, {
      sessionId,
      videoId,
      currentQuality: quality,
      targetQuality: quality,
      lastSwitch: Date.now(),
      switchCount: 0,
    });
  }

  async updateBufferHealth(sessionId: string, bufferHealth: number): Promise<void> {
    // Buffer health update logic
    const session = this.sessions.get(sessionId);
    if (session) {
      session.bufferHealth = bufferHealth;
    }
  }

  cleanup(): void {
    this.sessions.clear();
  }
}

// Prefetch Manager Class
class PrefetchManager {
  private config: VideoStreamConfig;
  private webTransport: WebTransport;
  private prefetchJobs: Map<string, any> = new Map();

  constructor(config: VideoStreamConfig, webTransport: WebTransport) {
    this.config = config;
    this.webTransport = webTransport;
  }

  async startPredictivePrefetching(videoId: string, quality: string): Promise<void> {
    // Predictive prefetching logic
    const request = {
      type: 'START_PREDICTIVE_PREFETCHING',
      data: {
        userId: this.config.userId,
        videoId,
        sessionId: this.config.sessionId,
        quality,
      },
    };

    // Send via WebTransport
    const stream = await this.webTransport.createBidirectionalStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(JSON.stringify(request)));
    writer.releaseLock();
  }

  async updateProgress(currentPosition: number, totalDuration: number): Promise<void> {
    // Progress update logic
    const progress = (currentPosition / totalDuration) * 100;
    
    // Trigger new predictions at 70% progress
    if (progress >= 70) {
      await this.triggerNewPrediction();
    }
  }

  private async triggerNewPrediction(): Promise<void> {
    // New prediction trigger logic
  }

  cleanup(): void {
    this.prefetchJobs.clear();
  }
}

export default VideoStreamService;
export { 
  VideoStreamService, 
  NetworkMonitor, 
  ABRManager, 
  PrefetchManager 
};
