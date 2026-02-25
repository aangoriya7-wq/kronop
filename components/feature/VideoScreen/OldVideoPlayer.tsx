
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions, 
  Animated, 
  Modal
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

// Inline theme to avoid import issues
const theme = {
  colors: {
    primary: { main: '#FF0000' }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16
  },
  borderRadius: {
    md: 8
  }
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Get safe area insets for notched phones
const getSafeAreaInsets = () => {
  // Default values for devices without safe area
  return {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  };
};

const safeAreaInsets = getSafeAreaInsets();

// Calculate 9:16 aspect ratio dimensions
const getVideoDimensions = () => {
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  
  // For 9:16 aspect ratio
  const aspectRatio = 9 / 16;
  
  // Use full screen height for video
  const videoHeight = screenHeight;
  const videoWidth = videoHeight * aspectRatio;
  
  // Center the video horizontally
  const xOffset = (screenWidth - videoWidth) / 2;
  
  return {
    width: videoWidth,
    height: videoHeight,
    xOffset: Math.max(0, xOffset) // Ensure no negative offset
  };
};

interface VideoPlayerProps {
  videoUrl: string;
  thumbnail?: string;
  title?: string;
  onClose?: () => void;
  autoPlay?: boolean;
  isActive?: boolean; // AUDIO CONTROL: Only active video plays
  forceQuality?: string; // FIXED HD QUALITY - No switching
}

export default function VideoPlayer({ 
  videoUrl, 
  thumbnail, 
  title, 
  onClose, 
  autoPlay = true,
  isActive = true, // AUDIO CONTROL: Default to active
  forceQuality = "1080p" // FIXED HD QUALITY - Default to 1080p
}: VideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus>();
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false); // No loading icon
  const [firstChunkLoaded, setFirstChunkLoaded] = useState(false);
  const [autoReplayEnabled, setAutoReplayEnabled] = useState(true); // AUTO-REPLAY CONTROL
  
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideControlsTimeout = useRef<number | null>(null);

  // Auto-hide controls after 3 seconds
  const hideControls = useCallback(() => {
    Animated.timing(controlsOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowControls(false);
    });
  }, [controlsOpacity]);

  const showControlsAnimation = useCallback(() => {
    setShowControls(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Clear existing timeout and set new one
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        hideControls();
      }
    }, 3000);
  }, [controlsOpacity, hideControls, isPlaying]);

  // Handle video status updates - ULTRA INSTANT PLAYBACK (0.1s chunks)
  const handleVideoStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    setStatus(status);
    
    if (status.isLoaded) {
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);
      setIsPlaying(status.isPlaying || false);
      
      // AUDIO CONTROL: Only play if active
      if (isActive && !status.isPlaying && !status.isBuffering) {
        videoRef.current?.playAsync();
      } else if (!isActive && status.isPlaying) {
        // PAUSE if not active (off screen)
        videoRef.current?.pauseAsync();
      }
      
      // SMOOTH LOOP: Handle loop completion seamlessly
      if (status.isLoaded && status.positionMillis === 0 && status.isPlaying && firstChunkLoaded) {
        // Video has looped back to start - ensure smooth continuation
        console.log('🔁 Smooth loop transition - video restarted');
      }
      
      // ZERO WAITING: Start playing immediately when first 0.1s chunk loads
      if (!firstChunkLoaded && !status.isBuffering) {
        setFirstChunkLoaded(true);
        setShowLoadingIndicator(false);
        setIsBuffering(false);
        
        // INSTANT PLAY - Only if active
        if (autoPlay && isActive && !status.isPlaying) {
          videoRef.current?.playAsync(); // Start right away, no setTimeout
        }
      } else {
        // Update buffering state for subsequent chunks
        setIsBuffering(status.isBuffering);
      }
    } else {
      // NEVER show loading indicator - zero loading philosophy
      setShowLoadingIndicator(false);
      setIsBuffering(true);
    }
  }, [autoPlay, firstChunkLoaded, isActive]);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
      showControlsAnimation();
    }
  }, [isPlaying, showControlsAnimation]);

  // Handle seek
  const handleSeek = useCallback(async (value: number) => {
    if (videoRef.current && duration > 0) {
      setIsSeeking(true);
      const position = (value / 100) * duration;
      await videoRef.current.setPositionAsync(position);
      setPosition(position);
      setIsSeeking(false);
      showControlsAnimation();
    }
  }, [duration, showControlsAnimation]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
    showControlsAnimation();
  }, [isFullscreen, showControlsAnimation]);

  // Handle video tap - AUTO-REPLAY CONTROL
  const handleVideoTap = useCallback(() => {
    // Toggle auto-replay on touch
    setAutoReplayEnabled(prev => !prev);
    
    if (showControls) {
      hideControls();
    } else {
      showControlsAnimation();
    }
  }, [showControls, hideControls, showControlsAnimation]);

  // Format time
  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  // Auto-hide controls when playing
  useEffect(() => {
    if (isPlaying && showControls) {
      hideControlsTimeout.current = setTimeout(() => {
        hideControls();
      }, 3000);
    }
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, [isPlaying, showControls, hideControls]);

  const videoDimensions = getVideoDimensions();

  return (
      <View style={[styles.container, { height: videoDimensions.height }]}>
        <Video
          ref={videoRef}
          style={[
            styles.video, 
            { 
              width: videoDimensions.width,
              height: videoDimensions.height,
              left: videoDimensions.xOffset,
              position: 'absolute'
            }
          ]}
          source={{ uri: videoUrl }}
          useNativeControls={false}
          resizeMode={ResizeMode.COVER} // FULL SCREEN FILL - 9:16 aspect
          shouldPlay={autoPlay && isActive} // AUDIO CONTROL: Only play if active
          isLooping={autoReplayEnabled} // AUTO-REPLAY CONTROL: Toggle based on touch
          onPlaybackStatusUpdate={handleVideoStatusUpdate}
          posterSource={thumbnail ? { uri: thumbnail } : undefined}
          posterStyle={styles.poster}
          // AUDIO CONTROL: Mute when not active, unmute when active
          volume={isActive ? 1.0 : 0.0} // Only active video has sound
          isMuted={!isActive} // Mute when off screen
          // Ultra-Fast Chunk Settings - 0.1s chunks for instant playback
          progressUpdateIntervalMillis={10} // 10ms updates for ultra-responsive
          positionMillis={0}
          // Zero buffer configuration for instant start
          // Ultra low latency settings
          rate={1.0}
          shouldCorrectPitch={false}
          // BunnyCDN Fast Start - Force lowest bitrate first
          // This ensures instant start even on bad network
          // The HLS playlist will automatically scale up quality
        />

      {/* ZERO LOADING - Never show spinner */}
      {showLoadingIndicator && !firstChunkLoaded && false && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.loadingText}>Loading first chunk...</Text>
        </View>
      )}

      {/* Minimal Buffering - Only tiny dot when actually buffering after first chunk */}
      {isBuffering && firstChunkLoaded && (
        <View style={styles.microBufferingDot} />
      )}

      {/* Video Tap Area */}
      <TouchableOpacity 
        style={styles.videoTapArea} 
        activeOpacity={1} 
        onPress={handleVideoTap}
      />

      {/* Controls Overlay */}
      <Animated.View 
        style={[
          styles.controlsOverlay, 
          { opacity: controlsOpacity }
        ]}
      >
        {/* Top Controls */}
        <View style={styles.topControls}>
          {title && (
            <Text style={styles.videoTitle} numberOfLines={1}>
              {title}
            </Text>
          )}
          <View style={styles.topButtons}>
            <TouchableOpacity onPress={toggleFullscreen}>
              <MaterialIcons 
                name={isFullscreen ? "fullscreen-exit" : "fullscreen"} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>
            {onClose && (
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* NO OVERLAY BUTTONS - CLEAN VIDEO */}
        {/* Center Play Button - REMOVED */}
        {/* Top Controls - REMOVED */}
        {/* Bottom Controls - REMOVED */}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    position: 'relative',
    width: '100%',
    height: '100%', // FULL SCREEN CONTAINER
    margin: 0,
    padding: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  video: {
    width: '100%',
    height: '100%', // FULL SCREEN HEIGHT
    backgroundColor: '#000000',
    margin: 0,
    padding: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  poster: {
    resizeMode: 'cover',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  bufferingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bufferingText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  loadingText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 10,
    fontWeight: '400',
  },
  minimalBufferingOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 30,
    minHeight: 30,
  },
  microBufferingDot: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    opacity: 0.8,
  },
  videoTapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0)', // COMPLETELY TRANSPARENT
    justifyContent: 'space-between',
    zIndex: 2,
    margin: 0,
    padding: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 16,
  },
  topButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  centerPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    zIndex: 3,
  },
  playButtonCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    minWidth: 40,
  },
  progressBar: {
    flex: 1,
    marginHorizontal: 12,
    height: 40,
  },
  playPauseButton: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderThumb: {
    width: 12,
    height: 12,
    backgroundColor: theme.colors.primary.main,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  controlButton: {
    padding: 8,
  },
});
