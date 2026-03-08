import React from 'react';
import { Pressable, StyleSheet, Animated } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

interface StarButtonProps {
  onPress: () => void;
  size?: number;
  color?: string;
}

export default function StarButton({
  onPress,
  size = 24,
  color = 'gold'
}: StarButtonProps) {
  const scaleValue = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.button,
        {
          transform: [{ scale: scaleValue }],
        },
      ]}
    >
      <AntDesign
        name="star"
        size={size}
        color={color}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
