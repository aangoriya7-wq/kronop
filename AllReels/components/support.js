import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const Support = ({ onSupport }) => {
  const [isSupported, setIsSupported] = useState(false);

  const handleSupport = () => {
    setIsSupported(!isSupported);
    onSupport?.();
  };

  return (
    <TouchableOpacity 
      style={[styles.supportButton, isSupported && styles.supportedButton]}
      onPress={handleSupport}
    >
      <Text style={[styles.supportText, isSupported && styles.supportedText]}>
        {isSupported ? '✓ Supported' : 'Support'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  supportButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  supportedButton: {
    backgroundColor: 'rgba(106, 90, 205, 0.3)',
    borderColor: '#6A5ACD',
  },
  supportText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  supportedText: {
    color: '#6A5ACD',
  },
});

export default Support;
