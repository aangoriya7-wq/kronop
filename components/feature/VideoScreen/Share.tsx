import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Text, Alert, Share as RNShare } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';

interface ShareProps {
  onPress: () => void;
  videoUrl?: string;
  videoTitle?: string;
}

export default function Share({ onPress, videoUrl = '', videoTitle = 'Check out this video!' }: ShareProps) {
  const [shareCount, setShareCount] = useState(0);

  const handleShare = async () => {
    try {
      const shareOptions = {
        message: `${videoTitle}\n\n${videoUrl}\n\nShared from Kronop App`,
        url: videoUrl,
        title: videoTitle,
      };

      const result = await RNShare.share(shareOptions, {
        // Android options
        dialogTitle: 'Share this video',
        // iOS options
        excludedActivityTypes: [
          'com.apple.UIKit.activity.PostToTwitter',
        ],
      });

      if (result.action === RNShare.sharedAction) {
        setShareCount(shareCount + 1);
        Alert.alert('Success', 'Video shared successfully!');
      } else if (result.action === RNShare.dismissedAction) {
        // User dismissed the share dialog
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share video. Please try again.');
      console.error('Share error:', error);
    }

    onPress();
  };

  return (
    <TouchableOpacity 
      style={styles.actionButton}
      onPress={handleShare}
      activeOpacity={0.7}
    >
      <MaterialIcons name="share" size={24} color="#FFFFFF" />
      <Text style={styles.shareCount}>{shareCount}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  shareCount: {
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: 2,
  },
});
