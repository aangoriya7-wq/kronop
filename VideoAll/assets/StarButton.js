// Star button component for video player
// Interactive like button with animations and states

import React, { useState } from 'react';
import { TouchableOpacity, Text, Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const StarButton = ({ 
  size = 24, 
  isLiked = false, 
  count = 0, 
  onPress,
  style 
}) => {
  const [scaleAnim] = useState(new Animated.Value(1));
  
  const handlePress = () => {
    // Animate on press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    onPress?.();
  };
  
  return (
    <TouchableOpacity 
      onPress={handlePress}
      style={[styles.container, style]}
      activeOpacity={0.8}
    >
      <Animated.View 
        style={[
          styles.starContainer,
          {
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <Ionicons 
          name={isLiked ? 'heart' : 'heart-outline'} 
          size={size} 
          color={isLiked ? '#FF3B5C' : '#FFFFFF'} 
        />
        
        {count > 0 && (
          <Text style={styles.count}>{count}</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = {
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  starContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  count: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
};

export default StarButton;
