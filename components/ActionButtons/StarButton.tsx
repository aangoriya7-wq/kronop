// Star/Like button component

import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarButtonProps {
  isStarred: boolean;
  stars: number;
  onPress: () => void;
}

export function StarButton({ isStarred, stars, onPress }: StarButtonProps) {
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <Pressable style={styles.actionButton} onPress={onPress}>
      <Ionicons
        name={isStarred ? 'star' : 'star-outline'}
        size={26}
        color={isStarred ? '#FFD700' : '#FFF'}
      />
      <Text style={styles.actionText}>{formatCount(stars)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
