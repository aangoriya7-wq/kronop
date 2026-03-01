// Video Stats Overlay Component - Shows video duration and views on player

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '@/constants/theme';

interface VideoStatsOverlayProps {
  duration: string;
  views: number;
  visible: boolean;
}

export function VideoStatsOverlay({ duration, views, visible }: VideoStatsOverlayProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.statBadge}>
        <MaterialIcons name="schedule" size={14} color={colors.text} />
        <Text style={styles.statText}>{duration}</Text>
      </View>
      
      <View style={styles.statBadge}>
        <MaterialIcons name="visibility" size={14} color={colors.text} />
        <Text style={styles.statText}>{formatViews(views)}</Text>
      </View>
    </View>
  );
}

function formatViews(views: number): string {
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1) + 'M';
  }
  if (views >= 1000) {
    return (views / 1000).toFixed(1) + 'K';
  }
  return views.toString();
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    zIndex: 10,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
});
