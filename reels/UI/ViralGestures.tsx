import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import {
  PanGestureHandler,
  TapGestureHandler,
  LongPressGestureHandler,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { State } from 'react-native-gesture-handler';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface ViralGesturesProps {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onPinch?: (scale: number) => void;
  children?: React.ReactNode;
}

const ViralGestures: React.FC<ViralGesturesProps> = ({
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
  onDoubleTap,
  onLongPress,
  onPinch,
  children,
}) => {
  // Shared values for animations
  const swipeTranslationY = useSharedValue(0);
  const swipeTranslationX = useSharedValue(0);
  const doubleTapScale = useSharedValue(1);
  const longPressScale = useSharedValue(1);
  const hapticFeedback = useSharedValue(0);

  // Refs for gesture tracking
  const lastTapTime = useRef(0);
  const tapCount = useRef(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Haptic feedback
  const triggerHaptic = useCallback(() => {
    hapticFeedback.value = withSequence(
      withTiming(1, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, []);

  // Animated styles
  const swipeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: swipeTranslationY.value },
      { translateX: swipeTranslationX.value },
    ] as any,
  }));

  const doubleTapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: doubleTapScale.value } as any],
  }));

  const longPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: longPressScale.value } as any],
    opacity: interpolate(longPressScale.value, [1, 0.95], [1, 0.8]),
  }));

  const hapticStyle = useAnimatedStyle(() => ({
    opacity: hapticFeedback.value,
    transform: [{ scale: hapticFeedback.value } as any],
  }));

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Main gesture handler */}
      <PanGestureHandler
        onGestureEvent={(event: any) => {
          'worklet';
          swipeTranslationY.value = event.translationY;
          swipeTranslationX.value = event.translationX;
        }}
        onHandlerStateChange={(event: any) => {
          'worklet';
          if (event.state === State.END) {
            const velocityY = Math.abs(event.velocityY || 0);
            const velocityX = Math.abs(event.velocityX || 0);
            
            // Determine swipe direction based on velocity and translation
            const isSwipeUp = event.translationY < -50 && velocityY > 500;
            const isSwipeDown = event.translationY > 50 && velocityY > 500;
            const isSwipeLeft = event.translationX < -50 && velocityX > 500;
            const isSwipeRight = event.translationX > 50 && velocityX > 500;
            
            // Trigger appropriate callback
            if (isSwipeUp && onSwipeUp) {
              runOnJS(onSwipeUp)();
              runOnJS(triggerHaptic)();
            } else if (isSwipeDown && onSwipeDown) {
              runOnJS(onSwipeDown)();
              runOnJS(triggerHaptic)();
            } else if (isSwipeLeft && onSwipeLeft) {
              runOnJS(onSwipeLeft)();
              runOnJS(triggerHaptic)();
            } else if (isSwipeRight && onSwipeRight) {
              runOnJS(onSwipeRight)();
              runOnJS(triggerHaptic)();
            }
            
            // Reset animation
            swipeTranslationY.value = withSpring(0, {
              damping: 20,
              stiffness: 300,
            });
            swipeTranslationX.value = withSpring(0, {
              damping: 20,
              stiffness: 300,
            });
          }
        }}
      >
        <Animated.View style={[styles.gestureArea, swipeStyle]}>
          {/* Double tap overlay */}
          <TapGestureHandler
            onHandlerStateChange={(event: any) => {
              'worklet';
              if (event.state === State.ACTIVE) {
                const currentTime = Date.now();
                
                // Check if this is a double tap
                if (currentTime - lastTapTime.current < 300) {
                  tapCount.current += 1;
                  
                  if (tapCount.current === 2) {
                    // Double tap detected
                    doubleTapScale.value = withSequence(
                      withTiming(1.2, { duration: 100, easing: Easing.out(Easing.quad) }),
                      withTiming(1, { duration: 200, easing: Easing.in(Easing.quad) })
                    );
                    
                    if (onDoubleTap) {
                      runOnJS(onDoubleTap)();
                    }
                    
                    runOnJS(triggerHaptic)();
                    
                    // Reset tap count
                    setTimeout(() => {
                      tapCount.current = 0;
                    }, 300);
                  }
                } else {
                  tapCount.current = 1;
                }
                
                lastTapTime.current = currentTime;
              }
            }}
            numberOfTaps={1}
          >
            <Animated.View style={[styles.doubleTapOverlay, doubleTapStyle]}>
              {/* Long press handler */}
              <LongPressGestureHandler
                onHandlerStateChange={(event: any) => {
                  'worklet';
                  if (event.state === State.ACTIVE) {
                    // Start long press timer
                    if (longPressTimer.current) {
                      clearTimeout(longPressTimer.current);
                    }
                    
                    longPressTimer.current = setTimeout(() => {
                      if (onLongPress) {
                        runOnJS(onLongPress)();
                      }
                      
                      // Visual feedback
                      longPressScale.value = withTiming(0.95, { duration: 100 });
                      runOnJS(triggerHaptic)();
                    }, 500) as any;
                  } else if (event.state === State.END || event.state === State.CANCELLED) {
                    // Add subtle scale effect during long press
                    longPressScale.value = withTiming(0.98, { duration: 200 });
                    
                    // Clear timer and reset scale
                    if (longPressTimer.current) {
                      clearTimeout(longPressTimer.current);
                      longPressTimer.current = null;
                    }
                    
                    longPressScale.value = withSpring(1, {
                      damping: 15,
                      stiffness: 400,
                    });
                  }
                }}
                minDurationMs={500}
              >
                <Animated.View style={[styles.longPressOverlay, longPressStyle]}>
                  {children}
                </Animated.View>
              </LongPressGestureHandler>
            </Animated.View>
          </TapGestureHandler>

          {/* Haptic feedback indicator */}
          <Animated.View style={[styles.hapticIndicator, hapticStyle]}>
            <BlurView intensity={20} style={styles.hapticBlur}>
              <View style={styles.hapticDot} />
            </BlurView>
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>

      {/* Gesture hints overlay */}
      <View style={styles.gestureHints}>
        <View style={styles.hintItem}>
          <Text style={styles.hintText}>Swipe</Text>
        </View>
        <View style={styles.hintItem}>
          <Text style={styles.hintText}>Double Tap</Text>
        </View>
        <View style={styles.hintItem}>
          <Text style={styles.hintText}>Long Press</Text>
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  gestureArea: {
    flex: 1,
    position: 'relative',
  },
  doubleTapOverlay: {
    flex: 1,
  },
  longPressOverlay: {
    flex: 1,
  },
  hapticIndicator: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2 - 30,
    left: SCREEN_WIDTH / 2 - 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 1000,
  },
  hapticBlur: {
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  hapticDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  gestureHints: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    opacity: 0.3,
  },
  hintItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  hintText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ViralGestures;
