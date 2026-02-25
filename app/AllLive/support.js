import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Support() {
  const [supported, setSupported] = useState(false);
  const [scale] = useState(new Animated.Value(1));

  const handleSupport = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setSupported(!supported);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleSupport}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons 
          name={supported ? 'heart' : 'heart-outline'} 
          size={20} 
          color={supported ? '#ff3b5c' : '#FFFFFF'} 
        />
      </Animated.View>
      <Text style={styles.text}>{supported ? 'Supported' : 'Support'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 30,
    minWidth: 50,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});