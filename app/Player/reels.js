import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';

import { MaterialIcons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const REEL_HEIGHT = SCREEN_HEIGHT;

const ReelPlayer = ({ 
  reels, 
  initialIndex = 0, 
  onIndexChange,
  onVideoEnd 
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuffering, setShowBuffering] = useState({});
  const [videoStatus, setVideoStatus] = useState({});
  const [cachedPaths, setCachedPaths] = useState({});
  const [zeroDataMetrics, setZeroDataMetrics] = useState(null);
  const [savedVideos, setSavedVideos] = useState(new Set()); // Save button state
  
  const videoRefs = useRef({});
  const translateY = useRef(0);
  
  // FIX 3: Memory cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up all video instances on unmount
      Object.values(videoRefs.current).forEach(async (videoRef) => {
        try {
          if (videoRef && typeof videoRef.unloadAsync === 'function') {
            await videoRef.unloadAsync();
          }
        } catch (error) {
          console.warn('Error cleaning up video ref:', error);
        }
      });
      videoRefs.current = {};
      
    };
  }, []);
  
  // Initialize Zero Data Re-watch system
  useEffect(() => {
    const initializeZeroDataSystem = async () => {
      try {
        
        // Initialize cache service
        await ZeroDataVideoCacheService.initializeCache();
        
        // Start local proxy server
        await LocalVideoProxyServer.startServer();
        
        // Get initial metrics
        const metrics = ZeroDataVideoCacheService.getPerformanceMetrics();
        setZeroDataMetrics(metrics);
        
        
      } catch (error) {
        console.error('❌ Failed to initialize Zero Data system:', error);
      }
    };
    
    initializeZeroDataSystem();
  }, []);

  // FIX 3: Start aggressive pre-warming immediately when reels are available
  useEffect(() => {
    if (reels.length > 0) {
      import('../../services/videoPreloader').then(({ videoPreloaderService }) => {
        videoPreloaderService.startAggressivePreloading(reels);
      });
    }
  }, [reels]);

  // Save video functionality
  const handleSaveVideo = useCallback(async (reel) => {
    try {
      const newSavedVideos = new Set(savedVideos);
      
      if (newSavedVideos.has(reel.id)) {
        newSavedVideos.delete(reel.id);
      } else {
        newSavedVideos.add(reel.id);
        
        // You can add actual save logic here (API call, local storage, etc.)
        console.log('[REEL_SAVE_SUCCESS]:', `"${reel.title}" has been saved to collection.`);
        newSavedVideos.add(reel.id);
      }
      
      setSavedVideos(newSavedVideos);
    } catch (error) {
      console.error('[REEL_SAVE_FAIL]:', error);
    }
  }, [savedVideos]);
  const preFetchNextVideos = useCallback(async (index) => {
    await ZeroDataVideoCacheService.preCacheNextVideos(reels, index);
    
    // Update metrics
    const metrics = ZeroDataVideoCacheService.getPerformanceMetrics();
    setZeroDataMetrics(metrics);
  }, [reels]);

  // Get cached video path with Zero Data Re-watch
  const getCachedVideoPath = useCallback(async (videoUrl) => {
    try {
      // Check Zero Data cache first
      const cachedPath = await ZeroDataVideoCacheService.getCachedVideoPath(videoUrl);
      if (cachedPath) {
        return cachedPath;
      }

      const optimizedUrl = await LocalVideoProxyServer.getOptimizedVideoUrl(videoUrl, ZeroDataVideoCacheService);
      
      return optimizedUrl.uri;
    } catch (error) {
      console.error('❌ Get cached path failed:', error);
      return videoUrl; // Fallback to original
    }
  }, []);

  // FIX 1: Parallel Processing - URL check and play simultaneously
  const loadVideoWithCache = useCallback(async (reel) => {
    try {
      setShowBuffering(prev => ({ ...prev, [reel.id]: true }));
      
      // MAP DATA CORRECTLY: Use signedUrl from backend, fallback to videoUrl
      const videoUrl = reel.signedUrl || reel.videoUrl || reel.url;
      
      // Start video playback immediately in parallel with caching
      const videoPathPromise = getCachedVideoPath(videoUrl);
      
      // Don't wait for caching - start playing immediately
      videoPathPromise.then(videoPath => {
        setCachedPaths(prev => ({ ...prev, [reel.id]: videoPath }));
        
        // Check if this is a zero data re-watch
        ZeroDataVideoCacheService.isVideoCached(videoUrl).then(isZeroData => {
          if (isZeroData) {
          }
        });
      }).catch(error => {
        console.error('❌ Video load failed:', error);
        // Fallback to original URL
        setCachedPaths(prev => ({ ...prev, [reel.id]: videoUrl }));
      });
      
      setShowBuffering(prev => ({ ...prev, [reel.id]: false }));
    } catch (error) {
      console.error('❌ Video load failed:', error);
      setShowBuffering(prev => ({ ...prev, [reel.id]: false }));
    }
  }, [getCachedVideoPath]);

  // Initialize videos and start pre-fetching with ZERO LATENCY
  useEffect(() => {
    if (reels.length === 0) return;

    // Load current video immediately
    const currentReel = reels[currentIndex];
    if (currentReel) {
      loadVideoWithCache(currentReel);
      
      // FIX 3: Force Rapid Play - No delay, no timeout
      controlAudioForActiveVideo(currentReel.id);
      
      // FIX 3: Trigger play immediately when index becomes active
      setTimeout(() => {
        if (videoRefs.current[currentReel.id]) {
          videoRefs.current[currentReel.id].playAsync().catch(err => {
          });
        }
      }, 0); // ZERO delay
    }

    // FIX 3: Aggressive pre-warming - keep next 2 videos ready
    preFetchNextVideos(currentIndex);
    
    setIsLoading(false);
  }, [currentIndex, reels, loadVideoWithCache, preFetchNextVideos, controlAudioForActiveVideo]);

  // FIX 1: Stop background videos when index changes
  useEffect(() => {
    const currentReel = reels[currentIndex];
    if (currentReel) {
      stopAllBackgroundVideos(currentReel.id);
      controlAudioForActiveVideo(currentReel.id);
    }
  }, [currentIndex, reels, stopAllBackgroundVideos, controlAudioForActiveVideo]);

  // Handle video playback status with Zero Data metrics and player release check
  const handleVideoStatusUpdate = useCallback(async (status, reelId) => {
    setVideoStatus(prev => ({ ...prev, [reelId]: status }));
    
    if (status.isLoaded) {
      setShowBuffering(prev => ({ ...prev, [reelId]: false }));
      
      // Update Zero Data metrics
      const metrics = ZeroDataVideoCacheService.getPerformanceMetrics();
      setZeroDataMetrics(metrics);
      
      // Log performance metrics
      if (status.isLoaded && status.durationMillis) {
      }
    }
  }, []);

  // FIX 2: Safe video play function with release check
  const safePlayVideo = useCallback(async (videoRef, reelId) => {
    try {
      // Check if player exists and is not released
      if (videoRef && typeof videoRef.getStatusAsync === 'function') {
        const status = await videoRef.getStatusAsync();
        
        // FIX 2: Check if player is released before playing
        if (status && !status.isReleased && videoRef.playAsync) {
          await videoRef.playAsync();
        } else {
          console.warn('⚠️ Cannot play - player is released or unavailable:', reelId);
        }
      }
    } catch (error) {
      console.error('❌ Safe video play failed:', reelId, error);
    }
  }, []);

  // FIX 1: Stop all background videos when index changes
  const stopAllBackgroundVideos = useCallback(async (exceptIndex = null) => {
    
    for (const [reelId, videoRef] of Object.entries(videoRefs.current)) {
      try {
        if (videoRef && typeof videoRef.getStatusAsync === 'function') {
          const status = await videoRef.getStatusAsync();
          
          // Stop all videos except the active one
          if (status && !status.isReleased && reelId !== exceptIndex) {
            await videoRef.stopAsync();
          }
        }
      } catch (error) {
        console.warn('Error stopping background video:', reelId, error);
      }
    }
  }, []);

  // FIX 3: Control audio for single instance
  const controlAudioForActiveVideo = useCallback(async (activeReelId) => {
    
    for (const [reelId, videoRef] of Object.entries(videoRefs.current)) {
      try {
        if (videoRef && typeof videoRef.getStatusAsync === 'function') {
          const status = await videoRef.getStatusAsync();
          
          if (status && !status.isReleased) {
            if (reelId === activeReelId) {
              // Active video: unmute and set normal volume
              await videoRef.setIsMutedAsync(false);
              await videoRef.setVolumeAsync(1.0);
            } else {
              // Background videos: mute completely
              await videoRef.setIsMutedAsync(true);
              await videoRef.setVolumeAsync(0.0);
            }
          }
        }
      } catch (error) {
        console.warn('Error controlling audio for video:', reelId, error);
      }
    }
  }, []);

  // Handle video end
  const handleVideoEnd = useCallback(() => {
    if (onVideoEnd) {
      onVideoEnd();
    }
    
    // Auto-play next video
    if (currentIndex < reels.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      translateY.value = withSpring(-nextIndex * SCREEN_HEIGHT);
      
      // FIX 1: Stop current video and control audio for next
      const currentReel = reels[currentIndex];
      const nextReel = reels[nextIndex];
      
      if (currentReel && nextReel) {
        stopAllBackgroundVideos(nextReel.id);
        controlAudioForActiveVideo(nextReel.id);
      }
    }
  }, [currentIndex, reels.length, onVideoEnd, translateY, stopAllBackgroundVideos, controlAudioForActiveVideo]);

  // Gesture handler for swipe with ZERO LATENCY audio control
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context) => {
      context.startY = translateY.value;
    },
    onActive: (event, context) => {
      translateY.value = context.startY + event.translationY;
    },
    onEnd: (event) => {
      const shouldSnapNext = event.translationY < -30 && currentIndex < reels.length - 1; // Reduced threshold
      const shouldSnapPrev = event.translationY > 30 && currentIndex > 0; // Reduced threshold
      
      if (shouldSnapNext) {
        const nextIndex = currentIndex + 1;
        runOnJS(setCurrentIndex)(nextIndex);
        
        // FIX 1: Parallel Processing - Stop previous and start next immediately
        const nextReel = reels[nextIndex];
        if (nextReel) {
          runOnJS(stopAllBackgroundVideos)(nextReel.id);
          runOnJS(controlAudioForActiveVideo)(nextReel.id);
          
          // FIX 3: Force play immediately - no delay
          setTimeout(() => {
            if (videoRefs.current[nextReel.id]) {
              videoRefs.current[nextReel.id].playAsync().catch(() => {});
            }
          }, 0);
        }
        
        translateY.value = withSpring(-nextIndex * SCREEN_HEIGHT, { damping: 20, stiffness: 300 }); // Faster spring
      } else if (shouldSnapPrev) {
        const prevIndex = currentIndex - 1;
        runOnJS(setCurrentIndex)(prevIndex);
        
        // FIX 1: Parallel Processing - Stop previous and start previous immediately
        const prevReel = reels[prevIndex];
        if (prevReel) {
          runOnJS(stopAllBackgroundVideos)(prevReel.id);
          runOnJS(controlAudioForActiveVideo)(prevReel.id);
          
          // FIX 3: Force play immediately - no delay
          setTimeout(() => {
            if (videoRefs.current[prevReel.id]) {
              videoRefs.current[prevReel.id].playAsync().catch(() => {});
            }
          }, 0);
        }
        
        translateY.value = withSpring(-prevIndex * SCREEN_HEIGHT, { damping: 20, stiffness: 300 }); // Faster spring
      } else {
        translateY.value = withSpring(-currentIndex * SCREEN_HEIGHT, { damping: 20, stiffness: 300 });
      }
    },
  });

  // Animated style for container
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Render individual reel with Zero Data indicators
  const renderReel = useCallback(({ item: reel, index }) => {
    const isActive = index === currentIndex;
    // MAP DATA CORRECTLY: Use signedUrl from backend, fallback to videoUrl
    const videoPath = cachedPaths[reel.id] || reel.signedUrl || reel.videoUrl || reel.url;
    const isBuffering = showBuffering[reel.id] || false;
    
    // Check if this is a Zero Data re-watch
    const isZeroDataReWatch = cachedPaths[reel.id] && cachedPaths[reel.id] !== (reel.signedUrl || reel.videoUrl || reel.url);
    
    // EMERGENCY CHECK: Log video URL and data structure
    console.log('🎥 Reel video data:', {
      id: reel.id,
      hasSignedUrl: !!reel.signedUrl,
      hasVideoUrl: !!reel.videoUrl,
      hasUrl: !!reel.url,
      title: reel.title
    });
    
    return (
      <View key={reel.id} style={[styles.reelContainer, { height: SCREEN_HEIGHT }]}>
        {/* FIX 4: Wrap Video in ErrorBoundary */}
        <VideoErrorBoundary>
          <Video
            ref={(ref) => {
              if (ref) {
                videoRefs.current[reel.id] = ref;
              }
            }}
            style={styles.video}
            source={{ 
              uri: videoPath,
              headers: {
                'User-Agent': 'KronopApp/InstantPlay',
                'Accept': '*/*',
                'Connection': 'keep-alive'
              }
            }}
            useNativeControls={false}
            shouldPlay={isActive} // FIX 3: Force Rapid Play - Always true when active
            isMuted={!isActive} // Auto-mute background videos
            volume={isActive ? 1.0 : 0.0} // Single audio instance control
            resizeMode={ResizeMode.COVER}
            isLooping={false}
            staysActiveInBackground={true} // FIX 4: Keep active for instant buffer
            bufferConfig={{
              ...LocalVideoProxyServer.getStreamingConfig(isZeroDataReWatch).bufferConfig,
              minBufferMs: 10,      // FIX 2: Ultra-low buffer: 0.01s
              maxBufferMs: 500,     // Max 0.5s buffer for instant start
              bufferForPlaybackMs: 5,    // Start with just 0.005s
              bufferForPlaybackAfterRebufferMs: 10, // Instant recovery
              preferredForwardBufferDuration: 0 // FIX 2: Zero forward buffer for instant play
            }}
            progressUpdateIntervalMillis={16} // FIX 2: 60fps updates (16ms)
            positionUpdateIntervalMillis={16} // FIX 2: 60fps position tracking
            allowsExternalPlayback={false}
            preventsDisplaySleepDuringVideoPlayback={false}
            onPlaybackStatusUpdate={(status) => handleVideoStatusUpdate(status, reel.id)}
            onError={(error) => {
              console.error('❌ Video playback error:', error);
              console.log('🎥 Video URLs available:', {
                signedUrl: reel.signedUrl,
                videoUrl: reel.videoUrl,
                url: reel.url
              });
              // Try fallback URLs
              if (videoPath !== reel.videoUrl && reel.videoUrl) {
                setCachedPaths(prev => ({ ...prev, [reel.id]: reel.videoUrl }));
              } else if (videoPath !== reel.url && reel.url) {
                setCachedPaths(prev => ({ ...prev, [reel.id]: reel.url }));
              }
            }}
            onLoadStart={() => {
              setShowBuffering(prev => ({ ...prev, [reel.id]: true }));
              
              // FIX 3: Force play immediately on load start
              if (isActive && videoRefs.current[reel.id]) {
                videoRefs.current[reel.id].playAsync().catch(() => {});
              }
            }}
            onLoad={() => {
              setShowBuffering(prev => ({ ...prev, [reel.id]: false }));
              
              // FIX 3: Force play immediately on load - no conditions
              if (videoRefs.current[reel.id]) {
                videoRefs.current[reel.id].playAsync().catch(() => {});
              }
            }}
            onReadyForDisplay={() => {
              setShowBuffering(prev => ({ ...prev, [reel.id]: false }));
              
              // FIX 3: Force play on display - guaranteed play
              if (videoRefs.current[reel.id]) {
                videoRefs.current[reel.id].playAsync().catch(() => {});
              }
            }}
          />
        </VideoErrorBoundary>

        {isBuffering && (!videoStatus[reel.id]?.isLoaded) && (
          <View style={styles.bufferingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.bufferingText}>
              {isZeroDataReWatch ? 'Loading from cache...' : 'Loading...'}
            </Text>
          </View>
        )}

        {/* Zero Data Re-watch Indicator */}
        {isZeroDataReWatch && isActive && (
          <View style={styles.zeroDataIndicator}>
            <MaterialIcons name="offline-bolt" size={16} color="#00ff00" />
            <Text style={styles.zeroDataText}>ZERO DATA</Text>
          </View>
        )}

        {isActive && (
          <View style={styles.overlay}>
            <View style={styles.topControls}>
              {/* Zero Data Metrics Display */}
              {zeroDataMetrics && (
                <View style={styles.metricsDisplay}>
                  <Text style={styles.metricsText}>
                    📦 {zeroDataMetrics.cachedVideos}/{zeroDataMetrics.maxVideos}
                  </Text>
                  <Text style={styles.metricsText}>
                    🎯 {zeroDataMetrics.cacheHitRate}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.bottomControls}>
              <View style={styles.userInfo}>
                <Text style={styles.username}>{reel.user?.username || 'Unknown'}</Text>
                <Text style={styles.views}>{reel.views.toLocaleString()} views</Text>
              </View>
              
              {/* Video Title from MongoDB - Below channel name */}
              <View style={styles.titleContainer}>
                <Text style={styles.videoTitle}>{reel.title}</Text>
                {isZeroDataReWatch && (
                  <Text style={styles.zeroDataBadge}>🔄 Re-watching (No Data)</Text>
                )}
              </View>
              
              {/* Scrolling Music Text with 🎵 Icon */}
              <MarqueeText 
                text={reel.music || 'Original Audio'} 
                icon={true}
                speed={40}
                style={styles.marqueeContainer}
              />
              
              {/* Action Buttons with Save - Save Button below Share button */}
              <View style={styles.actions}>
                <View style={styles.action}>
                  <MaterialIcons name="favorite-border" size={32} color="#fff" />
                  <Text style={styles.actionText}>{reel.likes.toLocaleString()}</Text>
                </View>
                
                <View style={styles.action}>
                  <MaterialIcons name="chat-bubble-outline" size={32} color="#fff" />
                  <Text style={styles.actionText}>...</Text>
                </View>
                
                <View style={styles.action}>
                  <MaterialIcons name="share" size={32} color="#fff" />
                  <Text style={styles.actionText}>Share</Text>
                </View>
                
                {/* Save Button - Below Share button */}
                <TouchableOpacity 
                  style={styles.action}
                  onPress={() => handleSaveVideo(reel)}
                >
                  <MaterialIcons 
                    name={savedVideos.has(reel.id) ? "bookmark" : "bookmark-border"} 
                    size={32} 
                    color={savedVideos.has(reel.id) ? "#ff6b6b" : "#fff"} 
                  />
                  <Text style={styles.actionText}>
                    {savedVideos.has(reel.id) ? "Saved" : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }, [currentIndex, cachedPaths, showBuffering, handleVideoStatusUpdate, zeroDataMetrics, safePlayVideo, stopAllBackgroundVideos, controlAudioForActiveVideo]);

  // Memoized reels data
  const memoizedReels = useMemo(() => reels, [reels]);

  if (isLoading || reels.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading reels...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.container, containerStyle]}>
          {memoizedReels.map((reel, index) => renderReel({ item: reel, index, key: reel.id || index }))}
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
};

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
  reelContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
    flex: 1,
  },
  bufferingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 10,
  },
  bufferingText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 14,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 16,
  },
  topControls: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 40,
  },
  bottomControls: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 140, // LAYOUT FIX: Increased margin for mobile navigation bar (40 + 100)
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  titleContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  videoTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  marqueeContainer: {
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  fallbackMarquee: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  fallbackMarqueeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  marqueeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  username: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  views: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20, // LAYOUT FIX: Bottom margin to prevent border collision
    paddingHorizontal: 8, // Added padding for better spacing
  },
  action: {
    alignItems: 'center',
    marginHorizontal: 16, // Increased from 12 to 16 for better spacing
    paddingVertical: 8, // Added vertical padding for increased height
    paddingHorizontal: 4, // Added horizontal padding
    minHeight: 60, // Set minimum height for buttons
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  // Zero Data Re-watch styles
  zeroDataIndicator: {
    position: 'absolute',
    top: 60,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  zeroDataText: {
    color: '#00ff00',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  zeroDataBadge: {
    color: '#00ff00',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  metricsDisplay: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  metricsText: {
    color: '#fff',
    fontSize: 10,
    marginBottom: 2,
  },
});

export default ReelPlayer;
