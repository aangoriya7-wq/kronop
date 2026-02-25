import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

interface CommentButtonProps {
  itemId: string;
  comments?: any[];
  onCommentPress?: (itemId: string) => void;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
  layout?: 'horizontal' | 'vertical'; // TIKTOK STYLE
}

export const CommentButton: React.FC<CommentButtonProps> = ({
  itemId,
  comments = [],
  onCommentPress,
  size = 'medium',
  showCount = true,
  layout = 'vertical' // TIKTOK STYLE
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleComment = () => {
    if (isLoading) return;
    
    setIsLoading(true);
    onCommentPress?.(itemId);
    
    // Reset loading after a short delay to show interaction
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return { iconSize: 20, fontSize: 10, spacing: 2 };
      case 'large':
        return { iconSize: 28, fontSize: 14, spacing: 4 };
      default:
        return { iconSize: 24, fontSize: 12, spacing: 3 };
    }
  };

  const { iconSize, fontSize, spacing } = getSizeConfig();
  const commentCount = comments.length;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isLoading && styles.disabled]}
        onPress={handleComment}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="chat-bubble-outline"
          size={iconSize}
          color={theme.colors.text.primary}
        />
      </TouchableOpacity>
      
      {showCount && (
        <Text style={[styles.count, { fontSize, marginTop: spacing }]}>
          {formatCount(commentCount)}
        </Text>
      )}
    </View>
  );
};

const formatCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  disabled: {
    opacity: 0.6,
  },
  count: {
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
