// Ads Banner Component - Advertisement poster section

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/constants/theme';

export function AdsBanner() {
  return (
    <Pressable style={styles.container}>
      <View style={styles.adContent}>
        <MaterialIcons name="campaign" size={20} color={colors.textMuted} />
        <Text style={styles.adText}>Advertisement</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 60,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  adContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  adText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
