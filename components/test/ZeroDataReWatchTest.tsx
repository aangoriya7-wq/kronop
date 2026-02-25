import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const ZeroDataVideoCacheService = require('../../services/zeroDataVideoCacheService');
const LocalVideoProxyServer = require('../../services/localVideoProxyServer');

export default function ZeroDataReWatchTest() {
  const [metrics, setMetrics] = useState<any>(null);
  const [cachedVideos, setCachedVideos] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  // Initialize and get current state
  const initializeTest = async () => {
    try {
      addTestResult('🚀 Initializing Zero Data Re-watch Test...');
      
      // Initialize services
      await ZeroDataVideoCacheService.initializeCache();
      await LocalVideoProxyServer.startServer();
      
      setIsInitialized(true);
      addTestResult('✅ Services initialized successfully');
      
      // Get initial metrics
      await updateMetrics();
      addTestResult('📊 Initial metrics loaded');
      
    } catch (error) {
      addTestResult(`❌ Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Update metrics display
  const updateMetrics = async () => {
    try {
      const currentMetrics = ZeroDataVideoCacheService.getPerformanceMetrics();
      setMetrics(currentMetrics);
      
      const cachedList = ZeroDataVideoCacheService.getCachedVideosList();
      setCachedVideos(cachedList);
    } catch (error) {
      addTestResult(`❌ Failed to update metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Add test result to log
  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  // Test caching a video
  const testCacheVideo = async () => {
    try {
      addTestResult('🎬 Testing video cache...');
      
      // Test video URL (replace with actual video URL)
      const testVideoUrl = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4';
      
      const cachedPath = await ZeroDataVideoCacheService.cacheVideo(testVideoUrl, 'high');
      
      if (cachedPath) {
        addTestResult(`✅ Video cached successfully: ${cachedPath}`);
        await updateMetrics();
      } else {
        addTestResult('❌ Video cache failed');
      }
    } catch (error) {
      addTestResult(`❌ Cache test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Test zero data re-watch
  const testZeroDataReWatch = async () => {
    try {
      addTestResult('🔄 Testing Zero Data Re-watch...');
      
      const testVideoUrl = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4';
      
      // Check if video is cached
      const isCached = await ZeroDataVideoCacheService.isVideoCached(testVideoUrl);
      
      if (isCached) {
        const cachedPath = await ZeroDataVideoCacheService.getCachedVideoPath(testVideoUrl);
        addTestResult(`🎯 ZERO DATA RE-WATCH! No data consumed: ${cachedPath}`);
      } else {
        addTestResult('⚠️ Video not cached, cannot test zero data re-watch');
      }
      
      await updateMetrics();
    } catch (error) {
      addTestResult(`❌ Zero Data test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Test LRU replacement
  const testLRUReplacement = async () => {
    try {
      addTestResult('🗑️ Testing LRU replacement...');
      
      // Cache multiple videos to test LRU
      const testUrls = [
        'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
        'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_2MB.mp4',
        'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_3MB.mp4'
      ];
      
      for (const url of testUrls) {
        await ZeroDataVideoCacheService.cacheVideo(url, 'normal');
      }
      
      await updateMetrics();
      addTestResult('✅ LRU replacement test completed');
    } catch (error) {
      addTestResult(`❌ LRU test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Test proxy server
  const testProxyServer = async () => {
    try {
      addTestResult('🌐 Testing proxy server...');
      
      const testVideoUrl = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4';
      
      const optimizedUrl = await LocalVideoProxyServer.getOptimizedVideoUrl(testVideoUrl, ZeroDataVideoCacheService);
      
      addTestResult(`✅ Proxy server response: ${optimizedUrl.isCached ? 'CACHED' : 'NETWORK'}`);
      
      const proxyStats = LocalVideoProxyServer.getProxyStats();
      addTestResult(`📊 Proxy stats: ${JSON.stringify(proxyStats, null, 2)}`);
    } catch (error) {
      addTestResult(`❌ Proxy test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Test cache persistence
  const testCachePersistence = async () => {
    try {
      addTestResult('💾 Testing cache persistence...');
      
      // Save current cache state
      await ZeroDataVideoCacheService.saveCacheToDisk();
      addTestResult('✅ Cache saved to disk');
      
      // Clear cache from memory
      await ZeroDataVideoCacheService.clearCache();
      addTestResult('🧹 Cache cleared from memory');
      
      // Reload from disk
      await ZeroDataVideoCacheService.loadCacheFromDisk();
      addTestResult('📂 Cache reloaded from disk');
      
      await updateMetrics();
      addTestResult('✅ Cache persistence test completed');
    } catch (error) {
      addTestResult(`❌ Persistence test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Clear all test data
  const clearTestData = async () => {
    try {
      addTestResult('🧹 Clearing test data...');
      
      await ZeroDataVideoCacheService.clearCache();
      setTestResults([]);
      setCachedVideos([]);
      
      await updateMetrics();
      addTestResult('✅ Test data cleared');
    } catch (error) {
      addTestResult(`❌ Clear test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  useEffect(() => {
    initializeTest();
  }, []);

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Zero Data Re-watch Test</Text>
        <Text style={styles.loadingText}>Initializing test environment...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Zero Data Re-watch Test Suite</Text>
      
      {/* Metrics Display */}
      {metrics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Current Metrics</Text>
          <View style={styles.metricsContainer}>
            <Text style={styles.metricText}>📦 Cached Videos: {metrics.cachedVideos}/{metrics.maxVideos}</Text>
            <Text style={styles.metricText}>🎯 Cache Hit Rate: {metrics.cacheHitRate}</Text>
            <Text style={styles.metricText}>💾 Cache Size: {metrics.cacheSizeMB}MB</Text>
            <Text style={styles.metricText}>🔄 Zero Data Re-watches: {metrics.zeroDataRewatches}</Text>
            <Text style={styles.metricText}>📡 Proxy Server: {metrics.proxyServerRunning ? 'Running' : 'Stopped'}</Text>
            <Text style={styles.metricText}>📈 Cache Utilization: {metrics.cacheUtilization}</Text>
          </View>
        </View>
      )}

      {/* Cached Videos List */}
      {cachedVideos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Cached Videos</Text>
          {cachedVideos.map((video, index) => (
            <View key={index} style={styles.cachedVideoItem}>
              <Text style={styles.cachedVideoText}>
                🎬 Video {index + 1}: {(video.size / 1024 / 1024).toFixed(2)}MB
              </Text>
              <Text style={styles.cachedVideoSubtext}>
                Accessed {video.accessCount} times
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Test Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Test Controls</Text>
        
        <TouchableOpacity style={styles.testButton} onPress={testCacheVideo}>
          <MaterialIcons name="download" size={20} color="#fff" />
          <Text style={styles.testButtonText}>Test Video Cache</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={testZeroDataReWatch}>
          <MaterialIcons name="replay" size={20} color="#fff" />
          <Text style={styles.testButtonText}>Test Zero Data Re-watch</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={testLRUReplacement}>
          <MaterialIcons name="swap-horiz" size={20} color="#fff" />
          <Text style={styles.testButtonText}>Test LRU Replacement</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={testProxyServer}>
          <MaterialIcons name="router" size={20} color="#fff" />
          <Text style={styles.testButtonText}>Test Proxy Server</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={testCachePersistence}>
          <MaterialIcons name="save" size={20} color="#fff" />
          <Text style={styles.testButtonText}>Test Cache Persistence</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.testButton, styles.clearButton]} onPress={clearTestData}>
          <MaterialIcons name="delete" size={20} color="#fff" />
          <Text style={styles.testButtonText}>Clear Test Data</Text>
        </TouchableOpacity>
      </View>

      {/* Test Results Log */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Test Results</Text>
        <ScrollView style={styles.logContainer} nestedScrollEnabled={true}>
          {testResults.map((result, index) => (
            <Text key={index} style={styles.logText}>{result}</Text>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  metricsContainer: {
    gap: 8,
  },
  metricText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  cachedVideoItem: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  cachedVideoText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  cachedVideoSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  logContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    padding: 8,
    maxHeight: 200,
  },
  logText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 2,
    fontFamily: 'monospace',
  },
});
