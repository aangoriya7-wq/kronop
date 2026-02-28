// Support button component - positioned next to username

import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';

interface SupportButtonProps {
  isSupporting: boolean;
  onPress: () => void;
}

export function SupportButton({ isSupporting, onPress }: SupportButtonProps) {
  return (
    <Pressable 
      style={[styles.supportButton, isSupporting && styles.supporting]} 
      onPress={onPress}
    >
      <Text style={styles.supportText}>
        {isSupporting ? '✓ Supporting' : '+ Support'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  supportButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#FFF',
    backgroundColor: 'transparent',
  },
  supporting: {
    backgroundColor: '#FF0050',
    borderColor: '#FF0050',
  },
  supportText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
