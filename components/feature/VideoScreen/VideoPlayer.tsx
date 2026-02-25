import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, Animated, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';

interface VideoPlayerProps {
  videoUrl: string;
  onProgress: (progress: number, duration: number) => void;
  isFullscreen?: boolean;
}

export default function VideoPlayer({ videoUrl, onProgress, isFullscreen = false }: VideoPlayerProps) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  const [isPlaying, setIsPlaying] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  



  // Memoize progress callback to prevent re-renders
  const handleProgress = useCallback((currentProgress: number, totalDuration: number) => {
    setProgress(currentProgress);
    setDuration(totalDuration);
    onProgress(currentProgress, totalDuration);
  }, [onProgress]);

  // Memoize rotation styles to prevent re-renders
  const rotationStyles = useMemo(() => {
    if (!isFullscreen) return null;
    
    return {
      position: 'absolute' as const,
      width: screenDimensions.height,
      height: screenDimensions.width,
      left: (screenDimensions.width - screenDimensions.height) / 2,
      top: (screenDimensions.height - screenDimensions.width) / 2,
      transform: [{ rotate: '90deg' }],
      zIndex: 9999,
      backgroundColor: '#000000',
    };
  }, [isFullscreen, screenDimensions]);

  // Update screen dimensions on rotation/resize
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const player = useVideoPlayer({
    uri: videoUrl,
    headers: {
      'User-Agent': 'KronopApp',
      'Referer': 'https://kronop.app',
      'Origin': 'https://kronop.app',
      'Accept': 'video/*',
    }
  }, (player) => {
    if (!player) return;
    
    player.loop = false;
    
    // Don't auto-play - wait for user interaction
    // if (videoUrl) {
    //   player.play();
    // }
    
    // Track playing state
    const playingListener = player.addListener('playingChange', (event) => {
      setIsPlaying(event.isPlaying);
    });
    
    // Simple progress tracking without complex chunking
    const updateProgress = () => {
      try {
        if (!player) return; // Early return if player is released
        
        // Only update if currentTime is valid and not jumping
        if (player.currentTime && player.duration) {
          const currentProgress = player.currentTime;
          const totalDuration = player.duration;
          
          // Prevent jumping - only update if progress is reasonable
          if (currentProgress >= 0 && currentProgress <= totalDuration) {
            handleProgress(currentProgress, totalDuration);
          }
        }
      } catch (error) {
        console.warn('VideoPlayer: Error updating progress', error);
        // Clear interval on error to prevent loops
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      }
    };
    
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    // Update progress every 1 second (slower to prevent jumping)
    progressIntervalRef.current = setInterval(updateProgress, 1000) as unknown as NodeJS.Timeout;
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      playingListener?.remove();
    };
  });

  const handlePlayPause = useCallback(() => {
    if (!player) return;
    
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }, [player, isPlaying]);

  const progressPercentage = duration > 0 && progress >= 0 ? (progress / duration) * 100 : 0;

  // Instant cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear intervals
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // Stop video player
      if (player) {
        try {
          // @ts-ignore - expo-video player may not have stop method
          if ('stop' in player && (player as any).stop) {
            (player as any).stop();
          }
          player.replace(null);
        } catch (error) {
          console.warn('VideoPlayer: Error stopping player', error);
        }
      }
      
      // Clear all state
      setProgress(0);
      setDuration(0);
      
      console.log('VideoPlayer: Instant cleanup completed');
    };
  }, [player]);

  if (!player) {
    return (
      <View style={styles.videoContainer}>
        <View style={[styles.video, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.videoContainer, isFullscreen && styles.fullscreenVideoContainer]}>
      <View style={[
        styles.videoWrapper,
        rotationStyles // Use memoized rotation styles
      ]}>
        <VideoView
          player={player}
          style={[
            styles.video,
            isFullscreen && {
              width: '100%',
              height: '100%',
              backgroundColor: '#000000',
            }
          ]}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
          contentFit="contain"
          nativeControls={false}
        />
      </View>
      
      {/* Play/Pause Button Overlay */}
      {!isPlaying && (
        <TouchableOpacity 
          style={styles.playButton}
          onPress={handlePlayPause}
          activeOpacity={0.8}
        >
          <MaterialIcons 
            name="play-arrow" 
            size={64} 
            color="#FFFFFF" 
            style={styles.playIcon}
          />
        </TouchableOpacity>
      )}
      
      {/* Progress Line */}
      <View style={styles.progressContainer}>
        <View 
          style={[
            styles.progressBar, 
            { width: `${progressPercentage}%` }
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9, // YouTube-style aspect ratio
    backgroundColor: '#000000',
    position: 'relative',
  },
  videoWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  progressContainer: {
    height: 2, // Thin progress line
    backgroundColor: '#333333', // Dark gray background
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF0000', // Red progress bar
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -32 }, { translateY: -32 }],
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 32,
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    marginLeft: 4, // Center the play icon
  },
  // Fullscreen styles
  fullscreenVideoContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  fullscreenVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
});
