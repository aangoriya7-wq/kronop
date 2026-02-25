// Share button component for video player
// Native share functionality with platform detection

import React, { useState } from 'react';
import { TouchableOpacity, Text, View, Share, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const ShareButton = ({ 
  size = 24, 
  videoUrl, 
  title,
  style 
}) => {
  const [shareCount, setShareCount] = useState(0);
  
  const handleShare = async () => {
    try {
      const shareOptions = {
        message: `Check out this amazing video: ${title}`,
        url: videoUrl,
        title: title,
        
        // Platform-specific options
        ...(Platform.OS === 'ios' && {
          excludedActivityTypes: [
            'com.apple.UIKit.activity.PostToTwitter'
          ]
        }),
        ...(Platform.OS === 'android' && {
          dialogTitle: 'Share this video'
        })
      };
      
      await Share.share(shareOptions);
      
      // Increment share count
      setShareCount(prev => prev + 1);
      
      // Show success message
      Alert.alert(
        'Shared!',
        'Video shared successfully',
        [
          { text: 'OK', onPress: () => {} }
        ]
      );
      
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert(
        'Share Failed',
        'Unable to share video. Please try again.',
        [
          { text: 'OK', onPress: () => {} }
        ]
      );
    }
  };
  
  const handleShareToSpecific = async (platform) => {
    try {
      let url = videoUrl;
      
      switch (platform) {
        case 'twitter':
          url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title + ' ' + videoUrl)}`;
          break;
        case 'facebook':
          url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(videoUrl)}`;
          break;
        case 'instagram':
          // Instagram doesn't support direct video sharing
          Alert.alert('Instagram', 'Please share the video link manually in Instagram stories.');
          return;
        case 'whatsapp':
          url = `whatsapp://send?text=${encodeURIComponent(title + ' ' + videoUrl)}`;
          break;
        case 'telegram':
          url = `https://t.me/share/url?url=${encodeURIComponent(videoUrl)}&text=${encodeURIComponent(title)}`;
          break;
        default:
          await handleShare();
          return;
      }
      
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        await Share.share({
          message: `${title} ${videoUrl}`,
          url: url
        });
      }
      
      setShareCount(prev => prev + 1);
    } catch (error) {
      console.error('Specific share error:', error);
    }
  };
  
  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        onPress={handleShare}
        style={styles.shareButton}
        activeOpacity={0.8}
      >
        <Ionicons name="share-social-outline" size={size} color="#FFFFFF" />
      </TouchableOpacity>
      
      {shareCount > 0 && (
        <Text style={styles.count}>{shareCount}</Text>
      )}
      
      {/* Advanced share options */}
      <View style={styles.shareOptions}>
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => handleShareToSpecific('twitter')}
        >
          <Text style={styles.optionText}>🐦</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => handleShareToSpecific('facebook')}
        >
          <Text style={styles.optionText}>📘</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => handleShareToSpecific('whatsapp')}
        >
          <Text style={styles.optionText}>💬</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = {
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  shareButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  shareOptions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 4,
  },
  optionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 12,
  },
};

export default ShareButton;
