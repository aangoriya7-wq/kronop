import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';

interface HorizontalProps {
  isFullscreen: boolean;
  onPress: (isFullscreen: boolean) => void;
}

export default function Horizontal({ isFullscreen, onPress }: HorizontalProps) {
  const handlePress = () => {
    // Simple toggle - no orientation change
    onPress(!isFullscreen);
  };

  return (
    <TouchableOpacity 
      style={styles.bottomButton}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <MaterialIcons 
        name={isFullscreen ? "fullscreen-exit" : "fullscreen"} 
        size={18} 
        color="#FFFFFF" 
      />
      <Text style={styles.bottomButtonText}>
        {isFullscreen ? 'Exit Full' : 'Full Screen'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bottomButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.borderRadius.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: theme.spacing.sm,
  },
  bottomButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
});
