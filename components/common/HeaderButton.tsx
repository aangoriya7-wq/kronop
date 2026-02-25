import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

interface HeaderButtonProps {
  icon: any; // Keep it simple for now
  onPress: () => void;
  testID?: string;
}

export default function HeaderButton({ icon, onPress, testID }: HeaderButtonProps) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      hitSlop={theme.hitSlop.md}
      activeOpacity={0.7}
      style={styles.headerButton}
      testID={testID}
    >
      <MaterialIcons name={icon} size={24} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    padding: 8, // Reduced from 12 to make buttons closer
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
