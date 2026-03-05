import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, TapGestureHandler } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { State } from 'react-native-gesture-handler';

import GlassButton from './components/GlassButton';
import HeartExplosionComponent from './components/HeartExplosion.tsx';
import ViralGestures from './ViralGestures.tsx';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface Reel {
  id: string;
  videoUrl: string;
  username: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
}

const MainFeed: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reels, setReels] = useState<Reel[]>([
    {
      id: '1',
      videoUrl: 'https://example.com/reel1.mp4',
      username: '@creator1',
      description: 'Amazing content! 🎬',
      likes: 1234,
      comments: 89,
      shares: 45,
      isLiked: false,
    },
    {
      id: '2',
      videoUrl: 'https://example.com/reel2.mp4',
      username: '@creator2',
      description: 'Incredible moment! ✨',
      likes: 5678,
      comments: 234,
      shares: 123,
      isLiked: false,
    },
    {
      id: '3',
      videoUrl: 'https://example.com/reel3.mp4',
      username: '@creator3',
      description: 'Pure magic! 🪄',
      likes: 9876,
      comments: 456,
      shares: 234,
      isLiked: false,
    },
  ]);

  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const heartScale = useSharedValue(0);
  const showHeartExplosion = useSharedValue(0);

  // Pre-render next reel UI
  const nextReelRef = useRef<View>(null);
  const [nextReelReady, setNextReelReady] = useState(false);

  // Gesture handlers
  const panGesture = (event: any) => {
    'worklet';
    translateY.value = event.translationY;
    
    // Add resistance at edges
    if (currentIndex === 0 && event.translationY > 0) {
      translateY.value = event.translationY * 0.3;
    }
    if (currentIndex === reels.length - 1 && event.translationY < 0) {
      translateY.value = event.translationY * 0.3;
    }
  };

  const panGestureStateChange = (event: any) => {
    'worklet';
    if (event.state === State.END) {
      const shouldDismiss = Math.abs(event.translationY) > SCREEN_HEIGHT * 0.25;
      
      if (shouldDismiss) {
        if (event.translationY > 0 && currentIndex > 0) {
          // Swipe up to previous
          runOnJS(setCurrentIndex)(currentIndex - 1);
          translateY.value = withSpring(SCREEN_HEIGHT);
        } else if (event.translationY < 0 && currentIndex < reels.length - 1) {
          // Swipe down to next
          runOnJS(setCurrentIndex)(currentIndex + 1);
          translateY.value = withSpring(-SCREEN_HEIGHT);
        } else {
          translateY.value = withSpring(0);
        }
      } else {
        translateY.value = withSpring(0);
      }
    }
  };

  // Double tap gesture handler
  const doubleTapGesture = (event: any) => {
    'worklet';
    if (event.state === State.ACTIVE) {
      // Heart animation
      heartScale.value = withSpring(1, {
        damping: 15,
        stiffness: 400,
      });
      
      // Show explosion
      showHeartExplosion.value = withTiming(1, { duration: 100 });
      
      // Reset after animation
      setTimeout(() => {
        heartScale.value = withSpring(0);
        showHeartExplosion.value = withTiming(0, { duration: 300 });
      }, 1000);
    }
  };

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ] as any,
    opacity: opacity.value,
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value } as any],
    opacity: interpolate(heartScale.value, [0, 1], [0, 1]),
  }));

  const explosionStyle = useAnimatedStyle(() => ({
    opacity: showHeartExplosion.value,
  }));

  // Pre-render next reel
  useEffect(() => {
    if (currentIndex < reels.length - 1) {
      // Simulate pre-rendering next reel UI
      setTimeout(() => {
        setNextReelReady(true);
      }, 100);
    }
  }, [currentIndex]);

  const currentReel = reels[currentIndex];

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" />
      
      {/* Main Reel Container */}
      <View style={styles.reelContainer}>
        <PanGestureHandler
          onGestureEvent={panGesture}
          onHandlerStateChange={panGestureStateChange}
        >
          <Animated.View style={[styles.reel, animatedStyle]}>
            {/* Video Background */}
            <View style={styles.videoBackground}>
              <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)']}
                style={styles.gradient}
              />
            </View>

            {/* Double Tap Area */}
            <TapGestureHandler
              onHandlerStateChange={doubleTapGesture}
              numberOfTaps={2}
            >
              <Animated.View style={styles.tapArea}>
                {/* Heart Animation */}
                <Animated.View style={[styles.heartContainer, heartStyle]}>
                  <Text style={styles.heartIcon}>❤️</Text>
                </Animated.View>

                {/* Heart Explosion */}
                <Animated.View style={[styles.explosionContainer, explosionStyle] as any}>
                  <HeartExplosionComponent />
                </Animated.View>
              </Animated.View>
            </TapGestureHandler>

            {/* Glass UI Overlay */}
            <View style={styles.uiOverlay}>
              {/* User Info */}
              <View style={styles.userInfo}>
                <BlurView intensity={20} style={styles.glassContainer}>
                  <Text style={styles.username}>{currentReel.username}</Text>
                  <Text style={styles.description}>{currentReel.description}</Text>
                </BlurView>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <BlurView intensity={15} style={styles.glassButton}>
                  <GlassButton
                    icon="❤️"
                    count={currentReel.likes}
                    isLiked={currentReel.isLiked}
                    onPress={() => console.log('Like pressed')}
                  />
                </BlurView>
                
                <BlurView intensity={15} style={styles.glassButton}>
                  <GlassButton
                    icon="💬"
                    count={currentReel.comments}
                    onPress={() => console.log('Comment pressed')}
                  />
                </BlurView>
                
                <BlurView intensity={15} style={styles.glassButton}>
                  <GlassButton
                    icon="📤"
                    count={currentReel.shares}
                    onPress={() => console.log('Share pressed')}
                  />
                </BlurView>
              </View>
            </View>

            {/* Swipe Indicator */}
            <View style={styles.swipeIndicator}>
              <Animated.View
                style={[
                  styles.swipeDot,
                  currentIndex === 0 && styles.activeDot,
                  currentIndex === 1 && styles.activeDot,
                  currentIndex === 2 && styles.activeDot,
                ]}
              />
              <Animated.View
                style={[
                  styles.swipeDot,
                  currentIndex === 1 && styles.activeDot,
                  currentIndex === 2 && styles.activeDot,
                ]}
              />
              <Animated.View
                style={[
                  styles.swipeDot,
                  currentIndex === 2 && styles.activeDot,
                ]}
              />
            </View>
          </Animated.View>
        </PanGestureHandler>

        {/* Pre-rendered Next Reel (Invisible) */}
        {nextReelReady && currentIndex < reels.length - 1 && (
          <View
            ref={nextReelRef}
            style={[styles.preRenderedReel, { opacity: 0 }]}
            pointerEvents="none"
          >
            {/* Pre-render next reel UI components */}
            <BlurView intensity={20} style={styles.glassContainer}>
              <Text style={styles.username}>{reels[currentIndex + 1].username}</Text>
              <Text style={styles.description}>{reels[currentIndex + 1].description}</Text>
            </BlurView>
          </View>
        )}
      </View>

      {/* Viral Gestures Handler */}
      <ViralGestures
        onSwipeUp={() => console.log('Swipe up detected')}
        onDoubleTap={() => console.log('Double tap detected')}
        onLongPress={() => console.log('Long press detected')}
      />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  reelContainer: {
    flex: 1,
    position: 'relative',
  },
  reel: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative',
  },
  videoBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
  },
  gradient: {
    flex: 1,
  },
  tapArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartIcon: {
    fontSize: 80,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  explosionContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  uiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  userInfo: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 100,
  },
  glassContainer: {
    borderRadius: 15,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    gap: 20,
  },
  glassButton: {
    borderRadius: 25,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 15,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  swipeIndicator: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  swipeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  activeDot: {
    backgroundColor: '#fff',
    transform: [{ scale: 1.2 }],
  },
  preRenderedReel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default MainFeed;
