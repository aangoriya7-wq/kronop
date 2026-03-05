import React from 'react';
import { View, StyleSheet } from 'react-native';
import StarButton from './StarButton';
import CommentButton from './CommentButton';
import ShareButton from './ShareButton';

interface InteractionBarProps {
  onStarPress: () => void;
  onCommentPress: () => void;
  onSharePress: () => void;
  isStarred?: boolean;
  starCount?: number;
  commentCount?: number;
}

const InteractionBar: React.FC<InteractionBarProps> = ({
  onStarPress,
  onCommentPress,
  onSharePress,
  isStarred = false,
  starCount = 0,
  commentCount = 0,
}) => {
  return (
    <View style={styles.container}>
      <StarButton 
        onPress={onStarPress} 
        isActive={isStarred} 
        count={starCount}
      />
      <CommentButton 
        onPress={onCommentPress} 
        count={commentCount}
      />
      <ShareButton onPress={onSharePress} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 80, // Moved down from 120px to 80px
    alignItems: 'center',
    zIndex: 10, // Ensure buttons appear above video
  },
});

export default InteractionBar;
