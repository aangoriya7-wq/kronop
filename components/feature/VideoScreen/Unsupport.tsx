import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '../../../constants/theme';

interface UnsupportProps {
  onPress: () => void;
}

export default function Unsupport({ onPress }: UnsupportProps) {
  return (
    <TouchableOpacity 
      style={styles.unsupportButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.unsupportButtonText}>
        Unsupport
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  unsupportButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderWidth: 1,
    borderColor: '#FF5252',
  },
  unsupportButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#FF5252',
  },
});
