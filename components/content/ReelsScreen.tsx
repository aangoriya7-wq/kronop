import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReels } from '../../hooks/useContent';
import ReelPlayer from '../feature/ReelPlayer.js';

const ZeroDataVideoCacheService = require('../../services/zeroDataVideoCacheService');
const LocalVideoProxyServer = require('../../services/localVideoProxyServer');

export default function ReelsScreen() {
  const { data, loading, error, refresh } = useReels();
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [showMetrics, setShowMetrics] = useState(false);
  const insets = useSafeAreaInsets();

  // Initialize Zero Data Re-watch system
  useEffect(() => {
    const initializeZeroDataSystem = async () => {
      try {
        
        // Initialize cache service
        await ZeroDataVideoCacheService.initializeCache();
        
        // Start local proxy server
        await LocalVideoProxyServer.startServer();
        
      } catch (error) {
        console.error('❌ ReelsScreen: Failed to initialize Zero Data system:', error);
      }
    };
    
    initializeZeroDataSystem();
  }, []);

  const handleIndexChange = (index: number) => {
    setCurrentReelIndex(index);
  };

  const handleVideoEnd = () => {
  };

  const toggleMetrics = () => {
    if (!showMetrics) {
      const metrics = ZeroDataVideoCacheService.getPerformanceMetrics();
    }
    setShowMetrics(!showMetrics);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading amazing reels...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={48} color="#f44336" />
        <Text style={styles.errorText}>Error: {error}</Text>
        <MaterialIcons 
          name="refresh" 
          size={32} 
          color="#4CAF50" 
          style={styles.retryButton}
          onPress={refresh}
        />
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="video-library" size={64} color="#ccc" />
        <Text style={styles.emptyText}>No reels found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Reel Player */}
      <ReelPlayer 
        reels={data}
        initialIndex={currentReelIndex}
        onIndexChange={handleIndexChange}
        onVideoEnd={handleVideoEnd}
      />
      
      {/* Debug Metrics Toggle */}
      <View style={styles.metricsContainer}>
        <MaterialIcons 
          name="analytics" 
          size={24} 
          color="#fff" 
          style={styles.metricsButton}
          onPress={toggleMetrics}
        />
        {showMetrics && (
          <View style={styles.metricsPanel}>
            <Text style={styles.metricsText}>
              🎯 Index: {currentReelIndex + 1}/{data.length}
            </Text>
            <Text style={styles.metricsText}>
              📦 Cached: {ZeroDataVideoCacheService.getPerformanceMetrics().cachedVideos}/{ZeroDataVideoCacheService.getPerformanceMetrics().maxVideos}
            </Text>
            <Text style={styles.metricsText}>
              💾 Size: {ZeroDataVideoCacheService.getPerformanceMetrics().cacheSizeMB}MB
            </Text>
            <Text style={styles.metricsText}>
              🎯 Hit Rate: {ZeroDataVideoCacheService.getPerformanceMetrics().cacheHitRate}
            </Text>
            <Text style={styles.metricsText}>
              🔄 Zero Data: {ZeroDataVideoCacheService.getPerformanceMetrics().zeroDataRewatches}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    padding: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  emptyText: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 16,
  },
  metricsContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 100,
  },
  metricsButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  metricsPanel: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    minWidth: 150,
  },
  metricsText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 4,
  },
  // Legacy styles for compatibility
  listContainer: {
    padding: 8,
  },
  reelItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 4,
    flex: 1,
    maxWidth: '48%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  thumbnailContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  reelInfo: {
    padding: 12,
  },
  reelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  reelStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: 12,
    color: '#6c757d',
  },
  loader: {
    marginVertical: 20,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
