import React from 'react';
import { View, StyleSheet } from 'react-native';
import StarButton from './StarButton';
import CommentButton from './CommentButton';
import ShareButton from './ShareButton';

interface InteractionBarProps {
  videoId: string;
  title?: string;
  initialLikes?: number;
  initialComments?: number;
  initiallyLiked?: boolean;
}

const InteractionBar: React.FC<InteractionBarProps> = ({
  videoId,
  title = '',
  initialLikes = 0,
  initialComments = 0,
  initiallyLiked = false,
}) => {
  return (
    <View style={styles.container}>
      <StarButton 
        videoId={videoId}
        initialCount={initialLikes}
        initiallyLiked={initiallyLiked}
      />
      <CommentButton 
        videoId={videoId}
        initialCount={initialComments}
      />
      <ShareButton 
        videoId={videoId}
        title={title}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    alignItems: 'center',
    zIndex: 10,
  },
});

export default InteractionBar;
