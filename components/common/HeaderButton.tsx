import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

interface HeaderButtonProps {
  icon: string;
  onPress: () => void;
  testID?: string;
  style?: ViewStyle;
  size?: number;
  color?: string;
}

export default function HeaderButton({
  icon,
  onPress,
  testID,
  style,
  size = 24,
  color = theme.colors.text.primary
}: HeaderButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      testID={testID}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={size}
        color={color}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
});
