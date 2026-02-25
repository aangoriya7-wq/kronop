import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const Save = ({ onSave, isSaved = false }) => {
  const [saved, setSaved] = useState(isSaved);

  const handleSave = () => {
    setSaved(!saved);
    onSave?.(!saved);
  };

  return (
    <TouchableOpacity 
      style={[styles.saveButton, saved && styles.savedButton]}
      onPress={handleSave}
    >
      <Text style={[styles.saveText, saved && styles.savedText]}>
        {saved ? '✓ Saved' : 'Save'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  saveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 80,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  savedButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
    borderColor: '#FF6B6B',
  },
  saveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  savedText: {
    color: '#FF6B6B',
  },
});

export default Save;
