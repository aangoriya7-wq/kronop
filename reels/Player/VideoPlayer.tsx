import React from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

interface VideoPlayerProps {
  source: string;
  isPlaying?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  source, 
  isPlaying = true 
}) => {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: source }}
        style={styles.video}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: screenWidth,
    height: screenHeight, // Full 9:16 vertical screen
    backgroundColor: '#000',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: screenWidth,
    height: screenHeight,
  },
});

export default VideoPlayer;
