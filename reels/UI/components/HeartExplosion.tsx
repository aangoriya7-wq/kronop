import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSharedValue, useAnimatedStyle, withSequence, withTiming, runOnJS } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HeartParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  opacity: number;
  rotation: number;
  emoji: string;
}

interface HeartExplosionProps {
  onComplete?: () => void;
}

const HeartExplosionComponent: React.FC<HeartExplosionProps> = ({ onComplete }) => {
  const particles = useSharedValue<HeartParticle[]>([]);
  const animationProgress = useSharedValue(0);
  const isAnimating = useSharedValue(false);

  // Heart emojis for explosion
  const heartEmojis = ['❤️', '💕', '💖', '💗', '💝', '💓', '💞', '💘'];

  // Initialize explosion
  const startExplosion = () => {
    const newParticles: HeartParticle[] = [];
    const particleCount = 12;
    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT / 2;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = 8 + Math.random() * 4;
      const emoji = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];

      newParticles.push({
        id: i,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 5, // Upward bias
        scale: 0.8 + Math.random() * 0.4,
        opacity: 1,
        rotation: Math.random() * 360,
        emoji,
      });
    }

    particles.value = newParticles;
    isAnimating.value = true;
    animationProgress.value = 0;

    // Start animation
    animationProgress.value = withSequence(
      withTiming(1, { duration: 1500 }),
      withTiming(0, { duration: 300 })
    );

    // Clean up after animation
    setTimeout(() => {
      particles.value = [];
      isAnimating.value = false;
      if (onComplete) {
        onComplete();
      }
    }, 1800);
  };

  // Auto-start explosion
  useEffect(() => {
    startExplosion();
  }, []);

  // Update particle positions
  useEffect(() => {
    if (!isAnimating.value) return;

    const interval = setInterval(() => {
      const currentParticles = particles.value;
      const updatedParticles = currentParticles.map(particle => ({
        ...particle,
        x: particle.x + particle.vx,
        y: particle.y + particle.vy,
        vy: particle.vy + 0.5, // Gravity
        opacity: particle.opacity - 0.02,
        scale: particle.scale * 0.98,
        rotation: particle.rotation + 5,
      }));

      particles.value = updatedParticles.filter(p => p.opacity > 0);
    }, 16); // 60 FPS

    return () => clearInterval(interval);
  }, [isAnimating.value]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: isAnimating.value ? 1 : 0,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {particles.value.map((particle) => (
        <Animated.View
          key={particle.id}
          style={[
            styles.particle,
            {
              left: particle.x - 15,
              top: particle.y - 15,
              transform: [
                { rotate: `${particle.rotation}deg` },
                { scale: particle.scale },
              ],
              opacity: particle.opacity,
            },
          ]}
        >
          <Text style={styles.heartEmoji}>{particle.emoji}</Text>
        </Animated.View>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 9999,
  },
  particle: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
  },
  heartEmoji: {
    fontSize: 20,
    textAlign: 'center',
    includeFontPadding: false,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});

export default HeartExplosionComponent;
