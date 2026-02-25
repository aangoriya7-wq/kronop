import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LikeButton } from './LikeButton';
import { CommentButton } from './CommentButton';
import { ShareButton } from './ShareButton';
import { theme } from '../../constants/theme';

interface InteractionBarProps {
  itemId: string;
  likes?: number;
  comments?: any[];
  shares?: number;
  isLiked?: boolean;
  isSupported?: boolean;
  onLikeChange?: (itemId: string, isLiked: boolean, count: number) => void;
  onCommentPress?: (itemId: string) => void;
  onShareChange?: (itemId: string, count: number) => void;
  onSupportChange?: (itemId: string, isSupported: boolean, count: number) => void;
  size?: 'small' | 'medium' | 'large';
  showCounts?: boolean;
  layout?: 'horizontal' | 'vertical'; // TIKTOK STYLE - Default vertical
}

export const InteractionBar: React.FC<InteractionBarProps> = ({
  itemId,
  likes = 0,
  comments = [],
  shares = 0,
  isLiked = false,
  isSupported = false,
  onLikeChange,
  onCommentPress,
  onShareChange,
  size = 'medium',
  showCounts = true,
  layout = 'vertical' // TIKTOK STYLE - Default vertical
}) => {
  // Determine container style based on layout
  const containerStyle = layout === 'vertical' 
    ? [styles.container, styles.verticalContainer]
    : styles.container;

  return (
    <View style={containerStyle}>
      {/* TIKTOK STYLE VERTICAL ACTIONS */}
      <LikeButton
        itemId={itemId}
        initialCount={likes}
        isInitiallyLiked={isLiked}
        onLikeChange={onLikeChange}
        size={size}
        showCount={showCounts}
        layout="vertical" // TIKTOK STYLE
      />
      
      <CommentButton
        itemId={itemId}
        comments={comments}
        onCommentPress={onCommentPress}
        size={size}
        showCount={showCounts}
        layout="vertical" // TIKTOK STYLE
      />
      
      <ShareButton
        itemId={itemId}
        initialCount={shares}
        onShareChange={onShareChange}
        size={size}
        showCount={showCounts}
        layout="vertical" // TIKTOK STYLE
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  verticalContainer: {
    alignItems: 'center',
    flexDirection: 'column', // VERTICAL LAYOUT
    gap: 8, // Reduced space between buttons from 15 to 8
  },
});
