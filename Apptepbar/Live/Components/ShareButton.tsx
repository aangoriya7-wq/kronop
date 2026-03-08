import React, { useState, useCallback } from 'react';
import { TouchableOpacity, StyleSheet, Share as RNShare, Platform } from 'react-native';
import { Share2 } from 'lucide-react-native';
import { shareReel } from '../ZeroLogic';

interface ShareButtonProps {
  videoId: string;
  title?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ videoId, title = 'Check out this reel!' }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    const webUrl = `https://kronop.app/live/${videoId}`;
    
    try {
      if (Platform.OS === 'web') {
        // Web: use Web Share API or copy to clipboard
        const success = await shareReel(videoId, title);
        if (!success) {
          // Fallback: copy to clipboard
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(webUrl);
          }
        }
      } else {
        // Native: use React Native Share
        await RNShare.share({
          message: `${title}\n\n${webUrl}`,
          url: webUrl,
          title: title,
        });
      }
    } catch (error) {
      // Share cancelled or failed
    }
    
    setIsLoading(false);
  }, [videoId, title, isLoading]);

  return (
    <TouchableOpacity 
      style={[styles.container, isLoading && styles.disabled]} 
      onPress={handlePress}
      disabled={isLoading}
    >
      <Share2 size={24} color="#FFFFFF" strokeWidth={1.5} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  disabled: {
    opacity: 0.6,
  },
});

export default ShareButton;
