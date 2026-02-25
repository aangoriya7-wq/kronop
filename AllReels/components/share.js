import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Share } from 'react-native';

const ShareComponent = ({ title, url, onShare }) => {
  const [isShared, setIsShared] = useState(false);

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out this: ${title}`,
        url: url || 'https://example.com',
      });

      if (result.action === Share.sharedAction) {
        setIsShared(true);
        onShare?.();
        
        // Reset after 2 seconds
        setTimeout(() => setIsShared(false), 2000);
      }
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.shareButton, isShared && styles.sharedButton]}
      onPress={handleShare}
    >
      <Text style={[styles.shareText, isShared && styles.sharedText]}>
        {isShared ? '✓ Shared' : 'Share'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  shareButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 80,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sharedButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderColor: '#4CAF50',
  },
  shareText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sharedText: {
    color: '#4CAF50',
  },
});

export default ShareComponent;
