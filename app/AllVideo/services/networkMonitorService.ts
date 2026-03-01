/**
 * Network Monitoring Service for React Native
 * 
 * This service provides comprehensive network monitoring with real-time speed detection,
 * quality assessment, and ABR optimization for smooth video streaming.
 */

import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NetworkConfig {
  testInterval: number; // milliseconds
  testUrl: string;
  testFileSize: number; // bytes
  timeout: number; // milliseconds
  enableSpeedTest: boolean;
  enableLatencyTest: boolean;
  enablePacketLossTest: boolean;
}

export interface NetworkState {
  isConnected: boolean;
  type: 'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'wimax' | 'none' | 'unknown';
  effectiveType: '2g' | '3g' | '4g' | 'unknown';
  strength: number; // 0-4 for cellular, 0-1 for WiFi
  isConnectionExpensive: boolean;
}

export interface NetworkQuality {
  quality: '2g' | '3g' | '4g' | 'wifi' | '4g+';
  bandwidth: number; // Mbps
  latency: number; // ms
  packetLoss: number; // percentage
  jitter: number; // ms
  stability: number; // 0-1
  lastTest: number;
}

export interface SpeedTestResult {
  downloadSpeed: number; // Mbps
  uploadSpeed: number; // Mbps
  latency: number; // ms
  jitter: number; // ms
  packetLoss: number; // percentage
  testDuration: number; // ms
  timestamp: number;
}

export interface NetworkMetrics {
  averageBandwidth: number;
  averageLatency: number;
  averagePacketLoss: number;
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  lastSpeedTest: SpeedTestResult | null;
  networkChanges: number;
  uptime: number;
}

class NetworkMonitorService {
  private config: NetworkConfig;
  private currentState: NetworkState;
  private currentQuality: NetworkQuality;
  private metrics: NetworkMetrics;
  private eventListeners: Map<string, Function[]> = new Map();
  private monitoringTimer: NodeJS.Timeout | null = null;
  private speedTestTimer: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private speedTestInProgress = false;
  private networkHistory: NetworkQuality[] = [];
  private lastNetworkChange = 0;

  constructor(config: NetworkConfig) {
    this.config = { ...config };

    this.currentState = {
      isConnected: false,
      type: 'unknown',
      effectiveType: 'unknown',
      strength: 0,
      isConnectionExpensive: false,
    };

    this.currentQuality = {
      quality: 'wifi' as '2g' | '3g' | '4g' | 'wifi' | '4g+',
      bandwidth: 0,
      latency: 0,
      packetLoss: 0,
      jitter: 0,
      stability: 0,
      lastTest: 0,
    };

    this.metrics = {
      averageBandwidth: 0,
      averageLatency: 0,
      averagePacketLoss: 0,
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      lastSpeedTest: null,
      networkChanges: 0,
      uptime: 0,
    };
  }

  /**
   * Initialize network monitoring
   */
  async initialize(): Promise<boolean> {
    try {
      // Load stored metrics
      await this.loadStoredMetrics();

      // Setup NetInfo listener
      NetInfo.addEventListener(this.handleNetworkChange.bind(this));

      // Get initial network state
      const netInfo = await NetInfo.fetch();
      this.updateNetworkState(netInfo);

      // Start monitoring
      this.startMonitoring();

      // Perform initial speed test
      if (this.config.enableSpeedTest) {
        setTimeout(() => this.performSpeedTest(), 1000);
      }

      this.emit('initialized', { config: this.config });
      return true;

    } catch (error: any) {
      console.error('Failed to initialize network monitor:', error);
      this.emit('error', { error: 'Initialization failed', details: error.message || 'Unknown error' });
      return false;
    }
  }

  /**
   * Start network monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Start periodic monitoring
    this.monitoringTimer = setInterval(() => {
      this.performNetworkCheck();
    }, this.config.testInterval) as any; // Process every testInterval

    // Start periodic speed tests
    if (this.config.enableSpeedTest) {
      this.speedTestTimer = setInterval(() => {
        if (!this.speedTestInProgress) {
          this.performSpeedTest();
        }
      }, 30000) as any; // Every 30 seconds
    }

    this.emit('monitoringStarted');
  }

  /**
   * Stop network monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    if (this.speedTestTimer) {
      clearInterval(this.speedTestTimer);
      this.speedTestTimer = null;
    }

    this.emit('monitoringStopped');
  }

  /**
   * Get current network state
   */
  getNetworkState(): NetworkState {
    return { ...this.currentState };
  }

  /**
   * Get current network quality
   */
  getNetworkQuality(): NetworkQuality {
    return { ...this.currentQuality };
  }

  /**
   * Get network metrics
   */
  getNetworkMetrics(): NetworkMetrics {
    return { ...this.metrics };
  }

  /**
   * Perform manual speed test
   */
  async performSpeedTest(): Promise<SpeedTestResult> {
    if (this.speedTestInProgress) {
      throw new Error('Speed test already in progress');
    }

    this.speedTestInProgress = true;

    try {
      const startTime = Date.now();

      // Perform download speed test
      const downloadSpeed = await this.testDownloadSpeed();

      // Perform latency test
      let latency = 0;
      let jitter = 0;
      
      if (this.config.enableLatencyTest) {
        const latencyResult = await this.testLatency();
        latency = latencyResult.average;
        jitter = latencyResult.jitter;
      }

      // Perform packet loss test
      let packetLoss = 0;
      
      if (this.config.enablePacketLossTest) {
        packetLoss = await this.testPacketLoss();
      }

      const testDuration = Date.now() - startTime;

      const result: SpeedTestResult = {
        downloadSpeed,
        uploadSpeed: 0, // Upload test not implemented yet
        latency,
        jitter,
        packetLoss,
        testDuration,
        timestamp: Date.now(),
      };

      // Update current quality
      this.updateNetworkQuality(result);

      // Update metrics
      this.updateMetrics(result);

      // Store result
      this.metrics.lastSpeedTest = result;

      // Save to storage
      await this.saveMetrics();

      this.emit('speedTestCompleted', result);
      return result;

    } catch (error: any) {
      console.error('Speed test failed:', error);
      this.metrics.failedTests++;
      
      this.emit('speedTestFailed', { error: error.message || 'Unknown error' });
      throw error;

    } finally {
      this.speedTestInProgress = false;
    }
  }

  /**
   * Get optimal video quality for current network
   */
  getOptimalVideoQuality(): string {
    const quality = this.currentQuality.quality;
    const bandwidth = this.currentQuality.bandwidth;
    const latency = this.currentQuality.latency;
    const packetLoss = this.currentQuality.packetLoss;

    // Consider packet loss and latency for quality selection
    if (packetLoss > 5 || latency > 1000) {
      return '144p'; // Poor connection, lowest quality
    }

    switch (quality) {
      case '2g':
        return '144p';
      case '3g':
        return bandwidth < 0.5 ? '144p' : '240p';
      case '4g':
        if (bandwidth < 1) return '240p';
        if (bandwidth < 2) return '360p';
        if (bandwidth < 4) return '480p';
        return '720p';
      case 'wifi':
        if (bandwidth < 2) return '480p';
        if (bandwidth < 5) return '720p';
        if (bandwidth < 10) return '1080p';
        return '4k';
      case '4g+':
        if (bandwidth < 5) return '720p';
        if (bandwidth < 10) return '1080p';
        return '4k';
      default:
        return '360p'; // Safe default
    }
  }

  /**
   * Get buffering strategy for current network
   */
  getBufferingStrategy(): {
    targetBufferTime: number;
    minBufferTime: number;
    maxBufferTime: number;
    prefetchCount: number;
    segmentDuration: number;
  } {
    const quality = this.currentQuality.quality;
    const bandwidth = this.currentQuality.bandwidth;

    switch (quality) {
      case '2g':
        return {
          targetBufferTime: 60,
          minBufferTime: 30,
          maxBufferTime: 120,
          prefetchCount: 15,
          segmentDuration: 4,
        };
      case '3g':
        return {
          targetBufferTime: 30,
          minBufferTime: 15,
          maxBufferTime: 60,
          prefetchCount: 8,
          segmentDuration: 6,
        };
      case '4g':
        return {
          targetBufferTime: 15,
          minBufferTime: 8,
          maxBufferTime: 30,
          prefetchCount: 5,
          segmentDuration: 10,
        };
      case 'wifi':
      case '4g+':
        return {
          targetBufferTime: 10,
          minBufferTime: 5,
          maxBufferTime: 20,
          prefetchCount: 3,
          segmentDuration: 10,
        };
      default:
        return {
          targetBufferTime: 20,
          minBufferTime: 10,
          maxBufferTime: 40,
          prefetchCount: 5,
          segmentDuration: 10,
        };
    }
  }

  /**
   * Check if network is suitable for 4K streaming
   */
  isSuitableFor4K(): boolean {
    return this.currentQuality.bandwidth >= 15 && 
           this.currentQuality.latency < 100 && 
           this.currentQuality.packetLoss < 2;
  }

  /**
   * Check if network is stable
   */
  isNetworkStable(): boolean {
    if (this.networkHistory.length < 5) {
      return false; // Not enough data
    }

    const recentHistory = this.networkHistory.slice(-5);
    const bandwidths = recentHistory.map(h => h.bandwidth);
    
    // Calculate coefficient of variation
    const mean = bandwidths.reduce((sum, b) => sum + b, 0) / bandwidths.length;
    const variance = bandwidths.reduce((sum, b) => sum + Math.pow(b - mean, 2), 0) / bandwidths.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / mean;

    return coefficientOfVariation < 0.3; // Less than 30% variation
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
    this.stopMonitoring();
    this.saveMetrics();
    this.emit('cleanup', { metrics: this.metrics });
  }

  // Private methods

  private async loadStoredMetrics(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('network_metrics');
      if (stored) {
        const data = JSON.parse(stored);
        this.metrics = { ...this.metrics, ...data };
      }
    } catch (error) {
      console.error('Failed to load stored metrics:', error);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem('network_metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }

  private handleNetworkChange(netInfo: any): void {
    this.updateNetworkState(netInfo);
    this.metrics.networkChanges++;
    this.lastNetworkChange = Date.now();

    // Perform speed test on network change
    if (this.config.enableSpeedTest && netInfo.isConnected) {
      setTimeout(() => this.performSpeedTest(), 2000);
    }

    this.emit('networkChanged', { state: this.currentState });
  }

  private updateNetworkState(netInfo: any): void {
    this.currentState = {
      isConnected: netInfo.isConnected || false,
      type: netInfo.type || 'unknown',
      effectiveType: netInfo.details?.effectiveType || 'unknown',
      strength: netInfo.details?.strength || 0,
      isConnectionExpensive: netInfo.details?.isConnectionExpensive || false,
    };
  }

  private updateNetworkQuality(speedTest: SpeedTestResult): void {
    const quality = this.determineNetworkQuality(speedTest);
    
    this.currentQuality = {
      ...quality,
      lastTest: Date.now(),
    };

    // Add to history
    this.networkHistory.push(this.currentQuality);
    
    // Keep only last 50 measurements
    if (this.networkHistory.length > 50) {
      this.networkHistory = this.networkHistory.slice(-50);
    }

    // Calculate stability
    this.currentQuality.stability = this.calculateStability();
  }

  private determineNetworkQuality(speedTest: SpeedTestResult): NetworkQuality {
    const bandwidth = speedTest.downloadSpeed;
    const latency = speedTest.latency;
    const packetLoss = speedTest.packetLoss;

    let quality: NetworkQuality['quality'] = 'wifi'; // Default to 'wifi' instead of 'unknown'

    // Determine quality based on bandwidth, latency, and packet loss
    if (bandwidth >= 15 && latency < 50 && packetLoss < 1) {
      quality = '4g+';
    } else if (bandwidth >= 5 && latency < 100 && packetLoss < 2) {
      quality = 'wifi';
    } else if (bandwidth >= 2 && latency < 200 && packetLoss < 3) {
      quality = '4g';
    } else if (bandwidth >= 0.5 && latency < 500 && packetLoss < 5) {
      quality = '3g';
    } else if (bandwidth >= 0.1 && latency < 1000) {
      quality = '2g';
    }

    return {
      quality,
      bandwidth,
      latency,
      packetLoss,
      jitter: speedTest.jitter,
      stability: 0, // Will be calculated separately
      lastTest: 0,
    };
  }

  private calculateStability(): number {
    if (this.networkHistory.length < 3) {
      return 0.5; // Default stability
    }

    const recentHistory = this.networkHistory.slice(-10);
    const bandwidths = recentHistory.map(h => h.bandwidth);
    
    // Calculate stability based on bandwidth variance
    const mean = bandwidths.reduce((sum, b) => sum + b, 0) / bandwidths.length;
    const variance = bandwidths.reduce((sum, b) => sum + Math.pow(b - mean, 2), 0) / bandwidths.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = higher stability
    const stability = Math.max(0, Math.min(1, 1 - (stdDev / mean)));
    
    return stability;
  }

  private updateMetrics(speedTest: SpeedTestResult): void {
    this.metrics.totalTests++;
    this.metrics.successfulTests++;

    // Update averages
    const totalSuccessful = this.metrics.successfulTests;
    
    this.metrics.averageBandwidth = 
      (this.metrics.averageBandwidth * (totalSuccessful - 1) + speedTest.downloadSpeed) / totalSuccessful;
    
    this.metrics.averageLatency = 
      (this.metrics.averageLatency * (totalSuccessful - 1) + speedTest.latency) / totalSuccessful;
    
    this.metrics.averagePacketLoss = 
      (this.metrics.averagePacketLoss * (totalSuccessful - 1) + speedTest.packetLoss) / totalSuccessful;
  }

  private async performNetworkCheck(): Promise<void> {
    if (!this.currentState.isConnected) {
      return;
    }

    // Quick connectivity check
    try {
      const response = await fetch('https://httpbin.org/status/200', {
        method: 'HEAD',
        // timeout: this.config.timeout, // timeout is not supported in fetch RequestInit
      });

      if (!response.ok) {
        this.emit('connectivityIssue', { status: response.status });
      }

    } catch (error: any) {
      this.emit('connectivityIssue', { error: error.message || 'Unknown error' });
    }
  }

  private async testDownloadSpeed(): Promise<number> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(this.config.testUrl); // Removed timeout as it's not supported in RequestInit
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const duration = (Date.now() - startTime) / 1000; // seconds
      const bits = buffer.byteLength * 8;
      const speedMbps = bits / duration / 1000000;

      return speedMbps;

    } catch (error: any) {
      throw new Error(`Download speed test failed: ${error.message || 'Unknown error'}`);
    }
  }

  private async testLatency(): Promise<{ average: number; jitter: number }> {
    const pings: number[] = [];
    const pingCount = 5;

    for (let i = 0; i < pingCount; i++) {
      try {
        const startTime = Date.now();
        
        await fetch('https://httpbin.org/status/200', {
        method: 'HEAD',
        // timeout: 2000, // timeout is not supported in fetch RequestInit
      });

        const latency = Date.now() - startTime;
        pings.push(latency);

      } catch (error: any) {
        // Skip failed pings
      }
    }

    if (pings.length === 0) {
      return { average: 0, jitter: 0 };
    }

    // Calculate average latency
    const average = pings.reduce((sum, ping) => sum + ping, 0) / pings.length;

    // Calculate jitter (standard deviation of latency)
    const variance = pings.reduce((sum, ping) => sum + Math.pow(ping - average, 2), 0) / pings.length;
    const jitter = Math.sqrt(variance);

    return { average, jitter };
  }

  private async testPacketLoss(): Promise<number> {
    const testCount = 10;
    let successCount = 0;

    for (let i = 0; i < testCount; i++) {
      try {
        const response = await fetch('https://httpbin.org/status/200', {
          method: 'HEAD',
          // timeout: 1000, // timeout is not supported in fetch RequestInit
        });

        if (response.ok) {
          successCount++;
        }

      } catch (error: any) {
        // Failed request counts as packet loss
      }
    }

    const packetLoss = ((testCount - successCount) / testCount) * 100;
    return packetLoss;
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

export default NetworkMonitorService;
