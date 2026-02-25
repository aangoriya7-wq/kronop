import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '../../../constants/theme';

interface SupportProps {
  isSupported: boolean;
  onPress: () => void;
}

export default function Support({ isSupported, onPress }: SupportProps) {
  return (
    <TouchableOpacity 
      style={[styles.supportButton, isSupported && styles.supportButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.supportButtonText, isSupported && styles.supportButtonTextActive]}>
        {isSupported ? 'Unsupport' : 'Support'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  supportButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  supportButtonActive: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  supportButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  supportButtonTextActive: {
    color: theme.colors.text.primary,
  },
});
