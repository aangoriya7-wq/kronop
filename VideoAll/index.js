import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, StatusBar, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import VideoItem from './VideoItem';
import SearchEngine from './SearchEngine';
import { videoAllSystem } from './VideoAllSystem'; // VideoAll system background service

export default function LongVideosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState([]);
  const [systemReady, setSystemReady] = useState(false);

  // Sample search data for SearchEngine
  const searchData = [
    { id: '1', title: 'Funny Cat Video', type: 'video' },
    { id: '2', title: 'Nature Photo', type: 'photo' },
    { id: '3', title: 'John Doe', type: 'user' },
    { id: '4', title: 'Music Channel', type: 'channel' },
  ];

  const handleSearch = (query) => {
    console.log('Searching for:', query);
  };

  const handleSearchItemPress = (item) => {
    console.log('Selected:', item);
  };

  // Load videos and initialize VideoAll System
  useEffect(() => {
    const initVideoAll = async () => {
      try {
        // Load videos from API
        const response = await fetch('http://localhost:3000/api/videos');
        const result = await response.json();
        if (result.success && result.data) {
          setVideos(result.data);
        }

        // VideoAll system background mein chalta rahega
        await videoAllSystem.initialize({
          languages: ['hindi', 'english', 'tamil', 'telugu', 'bengali', 'marathi', 'gujarati', 'punjabi', 'urdu'],
          features: {
            instantSeek: true,
            adaptiveStitching: true,
            batteryOptimization: true
          }
        });
        setSystemReady(true);
        console.log('✅ VideoAll System background mein chal raha hai');
      } catch (error) {
        console.error('❌ VideoAll System error:', error);
      }
    };

    initVideoAll();

    // Cleanup on unmount
    return () => {
      videoAllSystem.cleanup();
    };
  }, []);

  const handleVideoPress = (videoId) => {
    // VideoAll system ke through video kholo
    videoAllSystem.playVideo(videoId, {
      quality: 'auto',
      language: 'hindi',
      startFromBeginning: true
    });
    router.push(`/video/${videoId}?type=long`);
  };

  // Agar system ready nahi hai to loading dikhao
  if (!systemReady) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>VideoAll System loading...</Text>
          <Text style={styles.loadingSubtext}>9 language system getting ready</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Translucent Status Bar */}
      <StatusBar 
        barStyle="light-content" 
        translucent={true}
        backgroundColor="transparent"
      />
      
      {/* SearchEngine Component */}
      <SearchEngine 
        data={searchData}
        onSearch={handleSearch}
        onItemPress={handleSearchItemPress}
        placeholder="Search videos, photos, users..."
      />

      {/* Video List - Home Screen Size */}
      <FlatList
        data={videos}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <VideoItem
            video={item}
            onPress={() => handleVideoPress(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        numColumns={2}  
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search-off" size={64} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyText}>No videos available</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  list: {
    paddingBottom: 90,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl * 2,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl * 2,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  loadingSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  errorText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.error,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});