import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface GlassButtonProps {
  icon: string;
  count?: number;
  isLiked?: boolean;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

const GlassButton: React.FC<GlassButtonProps> = ({
  icon,
  count,
  isLiked = false,
  onPress,
  size = 'medium',
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePress = () => {
    // Animate button press
    scale.value = withSpring(0.9, {
      damping: 15,
      stiffness: 400,
    });
    
    opacity.value = withSpring(0.7, {
      damping: 15,
      stiffness: 400,
    });

    // Reset animation
    setTimeout(() => {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 400,
      });
      opacity.value = withSpring(1, {
        damping: 15,
        stiffness: 400,
      });
    }, 100);

    if (onPress) {
      onPress();
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value } as any],
    opacity: opacity.value,
  }));

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return {
          width: 40,
          height: 40,
          borderRadius: 20,
          iconSize: 18,
          fontSize: 10,
        };
      case 'large':
        return {
          width: 60,
          height: 60,
          borderRadius: 30,
          iconSize: 24,
          fontSize: 12,
        };
      default:
        return {
          width: 50,
          height: 50,
          borderRadius: 25,
          iconSize: 20,
          fontSize: 11,
        };
    }
  };

  const sizeStyle = getSizeStyle();

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.button,
          {
            width: sizeStyle.width,
            height: sizeStyle.height,
            borderRadius: sizeStyle.borderRadius,
          },
        ]}
        activeOpacity={0.8}
      >
        <BlurView
          intensity={15}
          style={[
            styles.glassEffect,
            {
              borderRadius: sizeStyle.borderRadius,
            },
          ]}
        >
          <View style={styles.content}>
            <Text
              style={[
                styles.icon,
                {
                  fontSize: sizeStyle.iconSize,
                  color: isLiked ? '#ff4458' : '#fff',
                },
              ]}
            >
              {icon}
            </Text>
            
            {count !== undefined && (
              <Text
                style={[
                  styles.count,
                  {
                    fontSize: sizeStyle.fontSize,
                  },
                ]}
              >
                {formatCount(count)}
              </Text>
            )}
          </View>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
};

const formatCount = (count: number): string => {
  if (count < 1000) {
    return count.toString();
  } else if (count < 1000000) {
    return (count / 1000).toFixed(1) + 'K';
  } else {
    return (count / 1000000).toFixed(1) + 'M';
  }
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  glassEffect: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  icon: {
    textAlign: 'center',
    includeFontPadding: false,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  count: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default GlassButton;
