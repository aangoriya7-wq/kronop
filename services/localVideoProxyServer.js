const { Platform } = require('react-native');

class LocalVideoProxyServer {
  constructor() {
    this.isRunning = false;
    this.port = 8080;
    this.serverInstance = null;
    this.activeConnections = new Map();
    this.servedFromCache = 0;
    this.servedFromNetwork = 0;
  }

  // Start the local proxy server
  async startServer() {
    if (this.isRunning) {
      console.log('🔄 Local proxy server already running');
      return true;
    }

    try {
      console.log('🌐 Starting Local Video Proxy Server...');
      
      // For React Native, we'll use a different approach
      // Since we can't run a traditional HTTP server, we'll use file:// URIs
      // and optimize the video serving through expo-video
      
      this.isRunning = true;
      
      console.log(`✅ Local Video Proxy Server ready`);
      console.log(`📱 Serving cached videos via file:// protocol`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to start proxy server:', error);
      return false;
    }
  }

  // Get optimized video URL (cached or network)
  async getOptimizedVideoUrl(videoUrl, zeroDataCacheService) {
    try {
      // First check if video is cached
      const cachedPath = await zeroDataCacheService.getCachedVideoPath(videoUrl);
      
      if (cachedPath) {
        // Serve from cache - ZERO DATA consumption
        this.servedFromCache++;
        console.log('🎯 Serving from cache (ZERO DATA):', videoUrl.substring(0, 30) + '...');
        
        return {
          uri: cachedPath,
          isCached: true,
          headers: {
            'Cache-Control': 'public, max-age=31536000',
            'X-Cache-Status': 'HIT-ZERO-DATA'
          }
        };
      }
      
      // Not cached, serve from network but start caching
      this.servedFromNetwork++;
      console.log('🌐 Serving from network (will cache):', videoUrl.substring(0, 30) + '...');
      
      // Start background caching
      zeroDataCacheService.cacheVideo(videoUrl, 'high');
      
      return {
        uri: videoUrl,
        isCached: false,
        headers: {
          'User-Agent': 'KronopApp/ZeroDataProxy',
          'Accept': '*/*',
          'Connection': 'keep-alive',
          'X-Cache-Status': 'MISS'
        }
      };
      
    } catch (error) {
      console.error('❌ Failed to get optimized URL:', error);
      return {
        uri: videoUrl,
        isCached: false,
        headers: {}
      };
    }
  }

  // Preload video headers for faster startup
  async preloadVideoHeaders(videoUrl) {
    try {
      console.log('🚀 Preloading video headers:', videoUrl.substring(0, 50) + '...');
      
      const response = await fetch(videoUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'KronopApp/ZeroDataProxy',
          'Range': 'bytes=0-8192' // Just get first 8KB for metadata
        }
      });
      
      if (response.ok) {
        const contentLength = response.headers.get('content-length');
        const contentType = response.headers.get('content-type');
        
        console.log(`📊 Video metadata loaded: ${contentLength} bytes, ${contentType}`);
        return {
          contentLength,
          contentType,
          supportsRange: response.headers.get('accept-ranges') === 'bytes'
        };
      }
    } catch (error) {
      console.log('⚠️ Header preload failed:', error.message);
    }
    
    return null;
  }

  // Create optimized video source for expo-video
  createOptimizedVideoSource(videoUrl, zeroDataCacheService) {
    return {
      uri: videoUrl,
      headers: {
        'User-Agent': 'KronopApp/ZeroDataProxy',
        'Accept': '*/*',
        'Connection': 'keep-alive'
      },
      // Network optimizations
      networkOptions: {
        cacheEnabled: true,
        bufferConfig: {
          minBufferMs: 50,
          maxBufferMs: 500,
          bufferForPlaybackMs: 25,
          bufferForPlaybackAfterRebufferMs: 50
        }
      }
    };
  }

  // Get streaming configuration for optimal performance
  getStreamingConfig(isCached = false) {
    if (isCached) {
      // Optimized for local file playback - INSTANT mode
      return {
        bufferConfig: {
          minBufferMs: 0,      // No buffer needed for cached files
          maxBufferMs: 50,     // Minimal buffer
          bufferForPlaybackMs: 0,    // Instant playback
          bufferForPlaybackAfterRebufferMs: 0  // Instant recovery
        },
        progressUpdateIntervalMillis: 50,  // Faster updates
        positionUpdateIntervalMillis: 50,  // Faster position updates
        // Instant playback for cached files
        allowsExternalPlayback: false,
        preventsDisplaySleepDuringVideoPlayback: false
      };
    } else {
      // Optimized for network streaming - HYPER-FAST mode
      return {
        bufferConfig: {
          minBufferMs: 50,     // Ultra-low buffer: 0.05s
          maxBufferMs: 1000,   // Max 1s buffer
          bufferForPlaybackMs: 25,   // Start with just 0.025s
          bufferForPlaybackAfterRebufferMs: 50  // Quick recovery
        },
        progressUpdateIntervalMillis: 100,  // Faster updates
        positionUpdateIntervalMillis: 100,  // Faster position updates
        allowsExternalPlayback: false,
        preventsDisplaySleepDuringVideoPlayback: false
      };
    }
  }

  // Monitor connection quality
  async monitorConnectionQuality() {
    try {
      // Simple connectivity test
      const startTime = Date.now();
      const response = await fetch('https://httpbin.org/json', {
        method: 'HEAD',
        timeout: 5000
      });
      const endTime = Date.now();
      
      const latency = endTime - startTime;
      
      let quality = 'unknown';
      if (latency < 200) quality = 'excellent';
      else if (latency < 500) quality = 'good';
      else if (latency < 1000) quality = 'fair';
      else quality = 'poor';
      
      console.log(`📡 Connection quality: ${quality} (${latency}ms)`);
      
      return {
        quality,
        latency,
        online: response.ok
      };
    } catch (error) {
      console.log('📡 Connection check failed:', error.message);
      return {
        quality: 'offline',
        latency: Infinity,
        online: false
      };
    }
  }

  // Get proxy statistics
  getProxyStats() {
    const total = this.servedFromCache + this.servedFromNetwork;
    const cacheHitRate = total > 0 ? (this.servedFromCache / total * 100).toFixed(1) : 0;
    
    return {
      isRunning: this.isRunning,
      port: this.port,
      servedFromCache: this.servedFromCache,
      servedFromNetwork: this.servedFromNetwork,
      cacheHitRate: `${cacheHitRate}%`,
      activeConnections: this.activeConnections.size,
      platform: Platform.OS
    };
  }

  // Reset statistics
  resetStats() {
    this.servedFromCache = 0;
    this.servedFromNetwork = 0;
    this.activeConnections.clear();
    console.log('📊 Proxy statistics reset');
  }

  // Stop the proxy server
  async stopServer() {
    if (!this.isRunning) {
      console.log('🛑 Proxy server not running');
      return;
    }

    try {
      console.log('🛑 Stopping Local Video Proxy Server...');
      
      this.isRunning = false;
      this.serverInstance = null;
      this.activeConnections.clear();
      
      console.log('✅ Local Video Proxy Server stopped');
    } catch (error) {
      console.error('❌ Failed to stop proxy server:', error);
    }
  }

  // Health check
  async healthCheck() {
    const connectionQuality = await this.monitorConnectionQuality();
    
    return {
      serverRunning: this.isRunning,
      connectionQuality,
      stats: this.getProxyStats(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new LocalVideoProxyServer();
