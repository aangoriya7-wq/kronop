import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Share as RNShare } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Share({ title, userName }) {
  const handleShare = async () => {
    try {
      const result = await RNShare.share({
        message: `🎥 Live Now: ${title}\n👤 ${userName}\nWatch live on StreamApp!`,
        title: 'Live Stream',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share');
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleShare}>
      <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
      <Text style={styles.text}>Share</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 30,
    minWidth: 50,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});