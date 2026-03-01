// Video Quality Selector Component - Select video quality

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/constants/theme';

type VideoQuality = '360p' | '480p' | '720p' | '1080p' | 'Auto';

interface VideoQualitySelectorProps {
  visible: boolean;
  onClose: () => void;
  currentQuality: VideoQuality;
  onQualityChange: (quality: VideoQuality) => void;
}

const QUALITY_OPTIONS: { value: VideoQuality; label: string; description: string }[] = [
  { value: 'Auto', label: 'Auto', description: 'Adjust based on connection' },
  { value: '1080p', label: '1080p', description: 'Full HD' },
  { value: '720p', label: '720p', description: 'HD' },
  { value: '480p', label: '480p', description: 'Standard' },
  { value: '360p', label: '360p', description: 'Data saver' },
];

export function VideoQualitySelector({ visible, onClose, currentQuality, onQualityChange }: VideoQualitySelectorProps) {
  const handleSelect = (quality: VideoQuality) => {
    onQualityChange(quality);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <MaterialIcons name="hd" size={24} color={colors.primary} />
            <Text style={styles.title}>Video Quality</Text>
          </View>
          
          <View style={styles.optionsList}>
            {QUALITY_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.optionItem,
                  currentQuality === option.value && styles.selectedOption
                ]}
                onPress={() => handleSelect(option.value)}
              >
                <View style={styles.optionInfo}>
                  <Text style={[
                    styles.optionLabel,
                    currentQuality === option.value && styles.selectedText
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                
                {currentQuality === option.value && (
                  <MaterialIcons name="check-circle" size={24} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
          
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  optionsList: {
    gap: spacing.xs,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  selectedOption: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectedText: {
    color: colors.primary,
  },
  optionDescription: {
    fontSize: 12,
    color: colors.textMuted,
  },
  closeButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
});
