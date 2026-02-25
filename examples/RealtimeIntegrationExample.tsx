import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Text } from 'react-native';
import RealtimeSyncIndicator from '../components/feature/RealtimeSyncIndicator';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

// Example of how to integrate real-time sync in your app
export const RealtimeIntegrationExample: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [content, setContent] = useState({
    photos: [],
    videos: [],
    reels: [],
    live: [],
    stories: []
  });

  // Get real-time sync status and functions
  const { isConnected, hasNewContent } = useRealtimeSync();

  // Load content function
  const loadContent = async () => {
    try {
      
      // Your existing content loading logic
      const API_URL = process.env.KOYEB_API_URL || process.env.EXPO_PUBLIC_API_URL;
      const [photosRes, videosRes, reelsRes, liveRes, storiesRes] = await Promise.all([
        fetch(`${API_URL}/photos?page=1&limit=20`),
        fetch(`${API_URL}/videos?page=1&limit=20`),
        fetch(`${API_URL}/reels?page=1&limit=20`),
        fetch(`${API_URL}/live?page=1&limit=20`),
        fetch(`${API_URL}/stories?page=1&limit=20`)
      ]);

      const [photos, videos, reels, live, stories] = await Promise.all([
        photosRes.json(),
        videosRes.json(),
        reelsRes.json(),
        liveRes.json(),
        storiesRes.json()
      ]);

      setContent({
        photos: photos.data || [],
        videos: videos.data || [],
        reels: reels.data || [],
        live: live.data || [],
        stories: stories.data || []
      });

    } catch (error) {
      console.error('❌ Error loading content:', error);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadContent();
    setRefreshing(false);
  };

  // Load initial content
  useEffect(() => {
    loadContent();
  }, []);

  // Auto-refresh when new content is detected
  useEffect(() => {
    if (hasNewContent) {
      onRefresh();
    }
  }, [hasNewContent]);

  return (
    <View style={styles.container}>
      {/* Real-time sync indicator */}
      <RealtimeSyncIndicator onRefresh={onRefresh} />
      
      {/* Connection status banner */}
      <View style={[
        styles.connectionBanner, 
        { backgroundColor: isConnected ? '#d4edda' : '#f8d7da' }
      ]}>
        <Text style={[
          styles.connectionText,
          { color: isConnected ? '#155724' : '#721c24' }
        ]}>
          {isConnected ? '🟢 Live Sync Active' : '🔴 Offline Mode'}
        </Text>
      </View>

      {/* Content area */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>📸 Photos ({content.photos.length})</Text>
          {/* Your photo grid component */}
        </View>

        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>🎬 Videos ({content.videos.length})</Text>
          {/* Your video list component */}
        </View>

        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>🎵 Reels ({content.reels.length})</Text>
          {/* Your reels component */}
        </View>

        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>🔴 Live ({content.live.length})</Text>
          {/* Your live component */}
        </View>

        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>📖 Stories ({content.stories.length})</Text>
          {/* Your stories component */}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  connectionBanner: {
    padding: 8,
    alignItems: 'center',
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  contentSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333333',
  },
});

export default RealtimeIntegrationExample;
