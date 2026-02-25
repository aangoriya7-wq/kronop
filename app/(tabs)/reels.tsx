import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Dimensions, 
  FlatList, 
  TouchableOpacity, 
  Text, 
  ViewToken, 
  SafeAreaView,
  StatusBar,
  Platform,
  AppState 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Import Video Player
import VideoPlayer from '../../AllReels/components/VideoPlayer';

// Types
interface ReelStats {
  likes: number;
  comments: number;
  shares: number;
  views: number;
}

interface Creator {
  name: string;
  avatar: string;
  category: string;
}

interface Reel {
  id: number;
  videoUrl: string;
  title: string;
  creator: Creator;
  stats: ReelStats;
}

// Import AllReels components
import { ReelProvider } from '../../AllReels/core/ReelContext';
import { useReelPreload } from '../../AllReels/hooks/useReelPreload';
import { use120FPS } from '../../AllReels/hooks/use120FPS';
import AudioController from '../../services/AudioController';
import { fetchBunnyCDNVideo } from '../../services/bunnyVideoFetch';

const { height, width } = Dimensions.get('window');

const Reels = () => {
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [reels, setReels] = useState<Reel[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [likedReels, setLikedReels] = useState<Set<number>>(new Set());
  const [supportedCreators, setSupportedCreators] = useState<Set<number>>(new Set());
  const flatListRef = useRef<FlatList>(null);

  // Fetch real reels data from API
  useEffect(() => {
    const fetchReels = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/content/reels');
        const result = await response.json();
        
        if (result.success && result.data) {
          // Transform API data to match our interface
          const formattedReels = await Promise.all(result.data.map(async (reel: any, index: number) => {
            let videoUrl = reel.url;
            
            // If no direct URL, fetch from BunnyCDN
            if (!videoUrl && reel.bunny_id) {
              videoUrl = await fetchBunnyCDNVideo(reel.bunny_id);
              console.log(`📹 BunnyCDN URL for ${reel.bunny_id}:`, videoUrl);
            }
            
            // Fallback to direct CDN URL
            if (!videoUrl) {
              videoUrl = `https://${process.env.EXPO_PUBLIC_REELS_PULL_ZONE}/${reel.bunny_id}`;
            }
            
            return {
              id: reel._id || index + 1,
              videoUrl: videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4',
              title: reel.title || 'Amazing Reel',
              creator: {
                name: reel.user_id || 'Anonymous Creator',
                avatar: 'https://i.pravatar.cc/150?img=' + (index + 1),
                category: reel.category || 'Entertainment'
              },
              stats: {
                likes: reel.likes || Math.floor(Math.random() * 100000),
                comments: reel.comments || Math.floor(Math.random() * 5000),
                shares: reel.shares || Math.floor(Math.random() * 2000),
                views: reel.views || Math.floor(Math.random() * 500000)
              }
            };
          }));
          
          setReels(formattedReels);
          console.log('✅ Reels loaded from API:', formattedReels.length);
        }
      } catch (error) {
        console.error('❌ Error fetching reels:', error);
        // Fallback to mock data if API fails
        setReels([]);
      }
    };

    fetchReels();
  }, []);

  // Initialize AudioController and monitor app state
  useEffect(() => {
    AudioController.initialize();
    
    const subscription = AppState.addEventListener('change', nextAppState => {
      AudioController.setAppState(nextAppState);
      console.log(' App state changed:', nextAppState);
    });

    return () => subscription?.remove();
  }, []);

  // Use AllReels hooks
  useReelPreload(reels[currentReelIndex]?.id, reels);
  
  use120FPS((time: number) => {
    // 120fps animation callback
  });

  const handleLike = useCallback((reelId: number) => {
    setLikedReels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reelId)) {
        newSet.delete(reelId);
      } else {
        newSet.add(reelId);
      }
      return newSet;
    });
  }, []);

  const handleSupport = useCallback((creatorId: number) => {
    setSupportedCreators(prev => {
      const newSet = new Set(prev);
      if (newSet.has(creatorId)) {
        newSet.delete(creatorId);
      } else {
        newSet.add(creatorId);
      }
      return newSet;
    });
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const renderReel = ({ item, index }: { item: Reel; index: number }) => {
    const isActive = index === currentReelIndex;
    const isLiked = likedReels.has(item.id);
    const isSupported = supportedCreators.has(item.id);
    
    return (
      <View style={[styles.reelContainer, { height }]}>
        {/* Video Player */}
        <VideoPlayer 
          videoUrl={item.videoUrl} 
          isActive={isActive}
          isMuted={isMuted}
          onEnd={() => {
            if (index < reels.length - 1) {
              flatListRef.current?.scrollToIndex({ index: index + 1, animated: true });
            } else {
              flatListRef.current?.scrollToIndex({ index: 0, animated: true });
            }
          }}
        />
        
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradientOverlay}
          pointerEvents="none"
        />
        
        {/* Top Bar - Empty */}
        <SafeAreaView style={styles.topBar} />
        
        {/* RIGHT SIDE - AUR NICHE KARA */}
        <View style={styles.rightActionButtons}>
          {/* Like Button */}
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
          >
            <Ionicons 
              name={isLiked ? 'heart' : 'heart-outline'} 
              size={32} 
              color={isLiked ? '#FF3B5C' : '#FFFFFF'} 
            />
            <Text style={styles.actionText}>{formatNumber(item.stats.likes)}</Text>
          </TouchableOpacity>
          
          {/* Comment Button */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>{formatNumber(item.stats.comments)}</Text>
          </TouchableOpacity>
          
          {/* Share Button */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-social-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>{formatNumber(item.stats.shares)}</Text>
          </TouchableOpacity>
          
          {/* Save Button */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="bookmark-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>Save</Text>
          </TouchableOpacity>
        </View>
        
        {/* LEFT SIDE - AUR NICHE KARA */}
        <View style={styles.leftContent}>
          {/* Creator Row - SIRF Avatar, Name, Support Button */}
          <View style={styles.creatorRow}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarBorder} />
            </View>
            
            {/* Creator Name */}
            <Text style={styles.creatorName}>{item.creator.name}</Text>
            
            {/* Support Button */}
            <TouchableOpacity 
              style={[
                styles.supportButton,
                isSupported && styles.supportedButton
              ]}
              onPress={() => handleSupport(item.id)}
            >
              <Ionicons 
                name={isSupported ? 'heart' : 'heart-outline'} 
                size={14} 
                color={isSupported ? '#000000' : '#FFD700'} 
              />
              <Text style={[
                styles.supportButtonText,
                isSupported && styles.supportedButtonText
              ]}>
                {isSupported ? 'Supporting' : 'Support'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Title - Channel name ke niche */}
          <Text style={styles.reelTitle} numberOfLines={2}>{item.title}</Text>
        </View>
        
        {/* View Counter - SABSE NICHE */}
        <View style={styles.viewCounter}>
          <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
          <Text style={styles.viewText}>{formatNumber(item.stats.views)} views</Text>
        </View>
      </View>
    );
  };

  const onViewableItemsChanged = useCallback(({ viewableItems, changed }: { viewableItems: ViewToken<any>[]; changed: ViewToken<any>[] }) => {
    changed.forEach(({ item, index, isViewable }) => {
      if (isViewable && index !== null) {
        setCurrentReelIndex(index);
      }
    });
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 300,
  };

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged }
  ]);

  return (
    <ReelProvider>
      <StatusBar hidden={true} />
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={reels}
          renderItem={renderReel}
          keyExtractor={(item) => item.id.toString()}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
          decelerationRate="fast"
          snapToInterval={height}
          snapToAlignment="start"
          removeClippedSubviews={true}
          maxToRenderPerBatch={3}
          windowSize={5}
          initialNumToRender={2}
        />
      </View>
    </ReelProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  reelContainer: {
    width,
    backgroundColor: '#000',
    position: 'relative',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.3, // Chhota gradient
    zIndex: 5,
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 20 : 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  
  // RIGHT SIDE - AUR NICHE (80 se 60 kiya)
  rightActionButtons: {
    position: 'absolute',
    right: 16,
    bottom: 60, // AUR NICHE
    alignItems: 'center',
    gap: 16,
    zIndex: 25,
  },
  actionButton: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 60,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // LEFT SIDE - AUR NICHE (80 se 60 kiya)
  leftContent: {
    position: 'absolute',
    left: 16,
    bottom: 60, // RIGHT BUTTONS KE SATH SATH
    right: 100,
    zIndex: 25,
  },
  
  // CREATOR ROW
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarBorder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255,215,0,0.1)',
  },
  creatorName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FFD700',
    gap: 4,
  },
  supportedButton: {
    backgroundColor: '#FFD700',
  },
  supportButtonText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '600',
  },
  supportedButtonText: {
    color: '#000000',
  },
  
  // TITLE
  reelTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // VIEW COUNTER
  viewCounter: {
    position: 'absolute',
    bottom: 20, // SABSE NICHE (60 se 20)
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 20,
  },
  viewText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
});

export default Reels;