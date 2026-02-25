import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

interface IconButtonProps {
  name: keyof typeof MaterialIcons.glyphMap;
  size?: number;
  color?: string;
  onPress: () => void;
  style?: ViewStyle;
}

export function IconButton({
  name,
  size = theme.iconSize.lg,
  color = theme.colors.text.primary,
  onPress,
  style,
}: IconButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      hitSlop={theme.hitSlop.md}
      activeOpacity={0.7}
    >
      <MaterialIcons name={name} size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
