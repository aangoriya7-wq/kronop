import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface SupportSectionProps {
  itemId: string;
  isSupported: boolean;
  onSupportChange: (id: string, isSupported: boolean) => void;
}

export default function SupportSection({ itemId, isSupported, onSupportChange }: SupportSectionProps) {
  const handleSupportPress = () => {
    onSupportChange(itemId, !isSupported);
  };

  return (
    <TouchableOpacity 
      style={[styles.supportButton, isSupported && styles.supportButtonActive]}
      onPress={handleSupportPress}
      activeOpacity={0.7}
    >
      <MaterialIcons 
        name="favorite" 
        size={16} 
        color={isSupported ? '#FF1744' : '#FFFFFF'} 
      />
      <Text style={[styles.supportText, isSupported && styles.supportTextActive]}>
        Support
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  supportButtonActive: {
    backgroundColor: 'rgba(255, 23, 68, 0.2)',
    borderColor: '#FF1744',
  },
  supportText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  supportTextActive: {
    color: '#FF1744',
  },
});
