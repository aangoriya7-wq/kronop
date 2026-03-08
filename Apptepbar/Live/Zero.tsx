import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  ViewToken,
  TouchableWithoutFeedback,
  Animated,
  TextInput,
  Text as RNText,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VideoContainer from './Components/VideoContainer';
import InteractionBar from './Components/InteractionBar';
import ChannelInfo from './Components/ChannelInfo';
import VideoPlayer from './Player/VideoPlayer';
// @ts-ignore
import GhostFeedManager from './GhostFeedManager';
import ViewerCount from './Components/ViewerCount';
import { API_KEYS } from '@/constants/Config';
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

// Fallback mock data for development - 3 working demo videos
const mockVideos: VideoItem[] = [
  {
    id: '1',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    title: 'Big Buck Bunny - Animated Short Film',
    channelName: 'NatureChannel',
    channelLogo: 'https://picsum.photos/seed/nature/200/200.jpg',
    isVerified: true,
    likes: 15420,
    comments: 892,
    shares: 4521,
  },
  {
    id: '2',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    title: 'Elephants Dream - Sci-Fi Animation',
    channelName: 'SciFiMovies',
    channelLogo: 'https://picsum.photos/seed/scifi/200/200.jpg',
    isVerified: true,
    likes: 8934,
    comments: 567,
    shares: 2341,
  },
  {
    id: '3',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    title: 'Tears of Steel - Action Short Film',
    channelName: 'ActionFilms',
    channelLogo: 'https://picsum.photos/seed/action/200/200.jpg',
    isVerified: false,
    likes: 6789,
    comments: 423,
    shares: 1876,
  },
];

const Zero: React.FC = () => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentVisibleIndex, setCurrentVisibleIndex] = useState<number>(0);
  const [pausedVideos, setPausedVideos] = useState<Set<string>>(new Set());
  const [showPlayPauseMap, setShowPlayPauseMap] = useState<Map<string, boolean>>(new Map());
  const [liveDots, setLiveDots] = useState(1);
  const fadeAnimMap = useRef<Map<string, Animated.Value>>(new Map()).current;
  const hideTimeoutMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map()).current;

  const insets = useSafeAreaInsets();

  // Initialize Turbo Bridge and fetch videos
  useEffect(() => {
    const initializeReels = async () => {
      try {
        // await initializeTurboBridge(); // Disabled to prevent crashes
        await fetchVideosFromAPI();
      } catch (error) {
        setLoading(false);
      }
    };
    
    initializeReels();
  }, []);

  // Animate LIVE dots
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveDots(prev => prev === 5 ? 1 : prev + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Fetch videos from Kronop API
  const fetchVideosFromAPI = async () => {
    try {
      const response = await fetch(`${KRONOP_API_URL}/api/live`, {
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
      } else {
        setVideos(mockVideos);
      }
    } catch (error) {
      setVideos(mockVideos);
    } finally {
      setLoading(false);
    }
  };

  const onViewableItemsChanged = React.useCallback(({ viewableItems }: { viewableItems: ViewToken<VideoItem>[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== undefined && viewableItems[0].index !== null) {
      setCurrentVisibleIndex(viewableItems[0].index);
      // Hide all play/pause controls when scrolling
      setShowPlayPauseMap(new Map());
    }
  }, []);

  const viewabilityConfig = React.useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const handleVideoTap = useCallback((videoId: string) => {
    // Toggle play/pause state
    setPausedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });

    // Show play/pause button temporarily
    setShowPlayPauseMap(prev => {
      const newMap = new Map(prev);
      newMap.set(videoId, true);
      return newMap;
    });

    // Initialize fade animation if not exists
    if (!fadeAnimMap.has(videoId)) {
      fadeAnimMap.set(videoId, new Animated.Value(1));
    }

    const fadeAnim = fadeAnimMap.get(videoId);
    if (fadeAnim) {
      // Reset to fully visible
      fadeAnim.setValue(1);

      // Clear existing timeout
      if (hideTimeoutMap.has(videoId)) {
        clearTimeout(hideTimeoutMap.get(videoId));
      }

      // Set new timeout to fade out after 1 second
      const timeout = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowPlayPauseMap(prev => {
            const newMap = new Map(prev);
            newMap.delete(videoId);
            return newMap;
          });
        });
      }, 1000);

      hideTimeoutMap.set(videoId, timeout);
    }
  }, [fadeAnimMap]);

  const isVideoPlaying = useCallback((videoId: string, index: number) => {
    const isVisible = index === currentVisibleIndex;
    const isPaused = pausedVideos.has(videoId);
    return isVisible && !isPaused;
  }, [currentVisibleIndex, pausedVideos]);

  const renderVideoItem = ({ item, index }: { item: VideoItem; index: number }) => {
    const isPlaying = isVideoPlaying(item.id, index);
    const showPlayPause = showPlayPauseMap.get(item.id) || false;
    const fadeAnim = fadeAnimMap.get(item.id);
    const isPaused = pausedVideos.has(item.id);

    return (
      <View style={styles.videoContainer}>
        {/* Status Bar Overlay */}
        <View style={[styles.statusBarOverlay, { height: insets.top }]} />
        
        {/* LIVE Indicator */}
        <View style={[styles.liveIndicatorContainer, { top: insets.top + 10 }]}>
          <RNText style={styles.liveText}>{`LIVE${".".repeat(liveDots)}`}</RNText>
        </View>
        
        <TouchableWithoutFeedback onPress={() => handleVideoTap(item.id)}>
          <View style={styles.videoWrapper}>
            <VideoPlayer
              source={item.uri}
              isPlaying={isPlaying}
            />

            {/* Play/Pause Overlay - Center of Screen */}
            {showPlayPause && fadeAnim && (
              <Animated.View style={[styles.playPauseOverlay, { opacity: fadeAnim }]}>
                <View style={styles.playPauseButton}>
                  {isPaused ? (
                    <View style={styles.playIcon}>
                      <View style={[styles.playTriangle, { borderLeftWidth: 20, borderTopWidth: 12, borderBottomWidth: 12 }]} />
                    </View>
                  ) : (
                    <View style={styles.pauseIcon}>
                      <View style={styles.pauseBar} />
                      <View style={styles.pauseBar} />
                    </View>
                  )}
                </View>
              </Animated.View>
            )}
          </View>
        </TouchableWithoutFeedback>
        {/* Gradient Overlay Top */}
        <View style={[styles.gradientOverlay, styles.topGradient]} />
        
        {/* Viewer Count */}
        <View style={styles.viewerCountContainer}>
          <ViewerCount videoId={item.id} />
        </View>
        {/* Gradient Overlay Bottom */}
        <View style={[styles.gradientOverlay, styles.bottomGradient]} />
        
        {/* Interaction Bar - Self-contained buttons */}
        <InteractionBar
          videoId={item.id}
          title={item.title}
          initialLikes={item.likes || 0}
          initialComments={item.comments || 0}
          initiallyLiked={false}
        />
        
        {/* Channel Info - Self-contained */}
        <ChannelInfo
          videoId={item.id}
          channelLogo={item.channelLogo}
          channelName={item.channelName}
          videoTitle={item.title}
          isVerified={item.isVerified}
          initiallySupported={false}
        />

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <TextInput
            placeholder="Add a comment..."
            placeholderTextColor="#999"
            style={styles.commentInput}
          />
        </View>
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
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      )}
      {/* GhostFeedManager for smart caching and preloading */}
      <GhostFeedManager
        maxReels={2}
        preloadCount={1}
        onReelChange={() => {}}
        onMemoryWarning={() => {}}
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
  videoWrapper: {
    width: screenWidth,
    height: screenHeight,
    position: 'relative',
  },
  playPauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 5,
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  playTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftColor: '#fff',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightWidth: 0,
  },
  pauseIcon: {
    width: 24,
    height: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  pauseBar: {
    width: 6,
    height: 20,
    backgroundColor: '#fff',
    borderRadius: 2,
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
  viewerCountContainer: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
  },
  statusBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 10,
  },
  liveIndicatorContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  liveText: {
    color: '#FF0000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  commentInputContainer: {
    position: 'absolute',
    bottom: 70,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  commentInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 5,
    color: '#fff',
    fontSize: 14,
  },
});

export default Zero;
