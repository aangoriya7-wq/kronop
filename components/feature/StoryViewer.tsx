import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { Story } from '../../types/story';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StoryViewerProps {
  visible: boolean;
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onRefresh?: () => void;
}

const STORY_DURATION = 5000; // 5 seconds per story

// Separate component for video stories to ensure hooks are always called in the same order
function VideoStory({ videoUrl, isPlaying, style }: { videoUrl: string; isPlaying: boolean; style: any }) {
  const player = useVideoPlayer({
    uri: videoUrl,
    headers: {
      'User-Agent': 'KronopApp'
    }
  }, (player) => {
    player.loop = false;
    player.muted = true;
  });

  useEffect(() => {
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying]);

  return (
    <VideoView 
      player={player} 
      style={[style, { zIndex: 1, flex: 1, width: '100%', height: '100%' }]}
      contentFit="cover"
      nativeControls={false}
      fullscreenOptions={{
        enable: false
      }}
      allowsPictureInPicture={false}
    />
  );
}

export function StoryViewer({ visible, stories, initialIndex, onClose, onRefresh }: StoryViewerProps) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false); // Start playing immediately
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filter out "add-story" from stories array for viewing
  const viewableStories = stories.filter(story => story.id !== 'add-story');
  const currentStory = viewableStories[currentStoryIndex];

  // Determine if current story is a video
  const isVideo = currentStory?.videoUrl || currentStory?.imageUrl?.includes('.mp4') || currentStory?.imageUrl?.includes('video');

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsPaused(true);
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsPaused(false);
        
        // Swipe left (next story)
        if (gestureState.dx < -50) {
          goToNext();
        }
        // Swipe right (previous story)
        else if (gestureState.dx > 50) {
          goToPrevious();
        }
        // Swipe down (close)
        else if (gestureState.dy > 100) {
          onClose();
        }
        // Tap left side (previous)
        else if (gestureState.dx < 0 && Math.abs(gestureState.dx) < 50) {
          goToPrevious();
        }
        // Tap right side (next)
        else if (gestureState.dx > 0 && Math.abs(gestureState.dx) < 50) {
          goToNext();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible && !isPaused) {
      startProgress();
    } else {
      stopProgress();
    }

    return () => stopProgress();
  }, [visible, currentStoryIndex, isPaused]);

  // Auto-play effect: Start playing immediately when modal opens
  useEffect(() => {
    if (visible) {
      setIsPaused(false); // Ensure playing starts when modal opens
    }
  }, [visible]);

  const startProgress = () => {
    progressAnim.setValue(0);
    setProgress(0);
    
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        goToNext();
      }
    });

    let elapsed = 0;
    progressInterval.current = setInterval(() => {
      elapsed += 100;
      setProgress(elapsed / STORY_DURATION);
      
      if (elapsed >= STORY_DURATION) {
        stopProgress();
      }
    }, 100);
  };

  const stopProgress = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    progressAnim.stopAnimation();
  };

  const goToNext = () => {
    if (currentStoryIndex < viewableStories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else {
      onClose();
    }
  };

  const goToPrevious = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    }
  };

  if (!currentStory) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container} {...panResponder.panHandlers}>
        {/* Story Background - Image or Video */}
        {isVideo ? (
          <VideoStory 
            videoUrl={currentStory.videoUrl || currentStory.imageUrl}
            isPlaying={visible && !isPaused}
            style={styles.storyMedia}
          />
        ) : (
          <Image
            source={{ uri: currentStory.imageUrl }}
            style={styles.storyMedia}
            contentFit="cover"
          />
        )}

        {/* Gradient Overlay */}
        <View style={styles.topGradient} />
        <View style={styles.bottomGradient} />

        {/* Progress Bars */}
        <View style={styles.progressContainer}>
          {viewableStories.map((_, index) => (
            <View key={index} style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width:
                      index < currentStoryIndex
                        ? '100%'
                        : index === currentStoryIndex
                        ? `${progress * 100}%`
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Image
              source={{ uri: currentStory.userAvatar }}
              style={styles.userAvatar}
              contentFit="cover"
            />
            <Text style={styles.userName}>{currentStory.userName}</Text>
            <Text style={styles.timestamp}>
              {new Date(currentStory.timestamp).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>
          
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Navigation Areas (Tap left/right) */}
        <View style={styles.tapAreas}>
          <TouchableOpacity
            style={styles.tapLeft}
            onPress={goToPrevious}
            activeOpacity={1}
          />
          <TouchableOpacity
            style={styles.tapRight}
            onPress={goToNext}
            activeOpacity={1}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyMedia: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    zIndex: 1,
    flex: 1,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  progressContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 50,
    left: 8,
    right: 8,
    gap: 4,
    zIndex: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    zIndex: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    color: '#fff',
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
  },
  timestamp: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: theme.typography.fontSize.sm,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapAreas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  tapLeft: {
    flex: 1,
  },
  tapRight: {
    flex: 1,
  },
});
