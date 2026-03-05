import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface VideoTitleProps {
  title: string;
}

const VideoTitle: React.FC<VideoTitleProps> = ({ title }) => {
  return (
    <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
      {title}
    </Text>
  );
};

const styles = StyleSheet.create({
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    maxWidth: 280,
  },
});

export default VideoTitle;
