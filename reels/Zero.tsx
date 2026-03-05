import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, StatusBar, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VideoContainer from './Components/VideoContainer';
import InteractionBar from './Components/InteractionBar';
import ChannelInfo from './Components/ChannelInfo';
import VideoPlayer from './Player/VideoPlayer';
// @ts-ignore
import GhostFeedManager from './GhostFeedManager';
import { API_KEYS } from '../constants/Config';
import { initializeTurboBridge } from './Native/TurboBridge';

// API URL for Reels
const KRONOP_API_URL = 'https://kronop-9gju.onrender.com';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

interface VideoItem {
  id: string;
  uri: string;
  title: string;
  channelName: string;
  channelLogo: string;
  isVerified?: boolean;
  likes?: number;
  comments?: number;
  shares?: number;
}

// Fallback mock data for development
const mockVideos: VideoItem[] = [
  {
    id: '1',
    uri: 'https://www.w3schools.com/html/mov_bbb.mp4',
    title: 'Amazing sunset timelapse with beautiful colors',
    channelName: 'NatureChannel',
    channelLogo: 'https://picsum.photos/seed/nature/200/200.jpg',
    isVerified: true,
    likes: 1234,
    comments: 89,
    shares: 45,
  },
  {
    id: '2',
    uri: 'https://www.w3schools.com/html/mov_bbb.mp4',
    title: 'Cooking tutorial: How to make perfect pasta',
    channelName: 'ChefMaster',
    channelLogo: 'https://picsum.photos/seed/chef/200/200.jpg',
    isVerified: false,
    likes: 567,
    comments: 34,
    shares: 12,
  },
];

const Zero: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [starredVideos, setStarredVideos] = useState<Set<string>>(new Set());
  const [supportedChannels, setSupportedChannels] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Initialize Turbo Bridge and fetch videos
  useEffect(() => {
    const initializeReels = async () => {
      try {
        // Initialize Turbo Bridge for Native Performance
        await initializeTurboBridge();
        console.log('🚀 Turbo Bridge initialized for Reels');
        
        // Fetch videos from API
        await fetchVideosFromAPI();
      } catch (error) {
        console.error('❌ Failed to initialize reels:', error);
        setLoading(false);
      }
    };
    
    initializeReels();
  }, []);

  // Fetch videos from Kronop API
  const fetchVideosFromAPI = async () => {
    try {
      const response = await fetch(`${KRONOP_API_URL}/api/reels`, {
        headers: {
          'Authorization': `Bearer ${API_KEYS.BUNNY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const formattedVideos = data.map((video: any) => ({
          id: video._id || video.id,
          uri: video.videoUrl || video.url,
          title: video.title || video.description,
          channelName: video.username || video.channelName,
          channelLogo: video.channelLogo || `https://picsum.photos/seed/${video.id}/200/200.jpg`,
          isVerified: video.isVerified || false,
          likes: video.likes || 0,
          comments: video.comments || 0,
          shares: video.shares || 0,
        }));
        
        setVideos(formattedVideos);
        console.log(`✅ Loaded ${formattedVideos.length} videos from API`);
      } else {
        console.error('❌ Failed to fetch videos:', response.status);
        // Fallback to mock data
        setVideos(mockVideos);
      }
    } catch (error) {
      console.error('❌ API Error, using mock data:', error);
      setVideos(mockVideos);
    } finally {
      setLoading(false);
    }
  };

  const handleStarPress = (videoId: string) => {
    setStarredVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  const handleSupportPress = (channelName: string) => {
    setSupportedChannels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(channelName)) {
        newSet.delete(channelName);
      } else {
        newSet.add(channelName);
      }
      return newSet;
    });
  };

  const renderVideoItem = ({ item, index }: { item: VideoItem; index: number }) => {
    return (
      <View style={styles.videoContainer}>
        <VideoPlayer 
          source={item.uri}
          isPlaying={true}
        />
        {/* Gradient Overlay Top */}
        <View style={[styles.gradientOverlay, styles.topGradient]} />
        {/* Gradient Overlay Bottom */}
        <View style={[styles.gradientOverlay, styles.bottomGradient]} />
        
        <InteractionBar
          onStarPress={() => handleStarPress(item.id)}
          onCommentPress={() => console.log('Comment pressed', item.id)}
          onSharePress={() => console.log('Share pressed', item.id)}
          isStarred={starredVideos.has(item.id)}
          starCount={item.likes || Math.floor(Math.random() * 1000)}
          commentCount={item.comments || Math.floor(Math.random() * 500)}
        />
        <ChannelInfo
          channelLogo={item.channelLogo}
          channelName={item.channelName}
          videoTitle={item.title}
          isVerified={item.isVerified}
          isSupported={supportedChannels.has(item.channelName)}
          onChannelPress={() => console.log('Channel pressed', item.channelName)}
          onSupportPress={() => handleSupportPress(item.channelName)}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : (
        <VideoContainer
          videos={videos}
          renderItem={renderVideoItem}
        />
      )}
      {/* GhostFeedManager for smart caching and preloading */}
      <GhostFeedManager
        maxReels={2}
        preloadCount={1}
        onReelChange={(reel: any) => console.log('Reel changed:', reel.id)}
        onMemoryWarning={(usage: any) => console.log('Memory warning:', usage)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoContainer: {
    width: screenWidth,
    height: screenHeight,
    position: 'relative',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1, // Lower than buttons and text
  },
  topGradient: {
    top: 0,
    height: 120,
    backgroundColor: 'transparent',
    borderTopColor: 'transparent',
  },
  bottomGradient: {
    bottom: 0,
    height: 200,
    backgroundColor: 'transparent',
    borderBottomColor: 'transparent',
  },
});

export default Zero;
