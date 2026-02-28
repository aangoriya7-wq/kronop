// Channel logo/profile picture component

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ChannelLogoProps {
  avatarUrl?: string;
}

export function ChannelLogo({ avatarUrl }: ChannelLogoProps) {
  return (
    <View style={styles.logoContainer}>
      <View style={styles.logoCircle}>
        <MaterialIcons name="person" size={28} color="#FFD700" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    width: 48,
    height: 48,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
