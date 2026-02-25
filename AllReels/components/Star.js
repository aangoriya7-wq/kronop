import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';

const Star = ({ stars, isStarred, onPress }) => {
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePress = () => {
    // Animate star
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Animated.View style={[styles.starContainer, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={[styles.star, isStarred && styles.starActive]}>⭐</Text>
      </Animated.View>
      <Text style={styles.starCount}>{stars}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  starContainer: {
    marginBottom: 4,
  },
  star: {
    fontSize: 32,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  starActive: {
    color: '#FFD700',
  },
  starCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default Star;
