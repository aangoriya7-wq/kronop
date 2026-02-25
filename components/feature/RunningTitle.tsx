import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface RunningTitleProps {
  title: string;
}

export default function RunningTitle({ title }: RunningTitleProps) {
  return (
    <Text style={styles.title} numberOfLines={2}>
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
