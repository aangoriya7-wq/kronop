import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VideoContainer from './Components/VideoContainer';
import InteractionBar from './Components/InteractionBar';
import ChannelInfo from './Components/ChannelInfo';
import VideoPlayer from './Player/VideoPlayer';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

interface VideoItem {
  id: string;
  uri: string;
  title: string;
  channelName: string;
  channelLogo: string;
  isVerified?: boolean;
}

const mockVideos: VideoItem[] = [
  {
    id: '1',
    uri: 'https://www.w3schools.com/html/mov_bbb.mp4',
    title: 'Amazing sunset timelapse with beautiful colors',
    channelName: 'NatureChannel',
    channelLogo: 'https://picsum.photos/seed/nature/200/200.jpg',
    isVerified: true,
  },
  {
    id: '2',
    uri: 'https://www.w3schools.com/html/mov_bbb.mp4',
    title: 'Cooking tutorial: How to make perfect pasta',
    channelName: 'ChefMaster',
    channelLogo: 'https://picsum.photos/seed/chef/200/200.jpg',
    isVerified: false,
  },
];

const Zero: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [starredVideos, setStarredVideos] = useState<Set<string>>(new Set());
  const [supportedChannels, setSupportedChannels] = useState<Set<string>>(new Set());

  const handleStarPress = (videoId: string) => {
    setStarredVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  const handleSupportPress = (channelName: string) => {
    setSupportedChannels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(channelName)) {
        newSet.delete(channelName);
      } else {
        newSet.add(channelName);
      }
      return newSet;
    });
  };

  const renderVideoItem = ({ item, index }: { item: VideoItem; index: number }) => {
    return (
      <View style={styles.videoContainer}>
        <VideoPlayer 
          source={item.uri}
          isPlaying={true}
        />
        {/* Gradient Overlay Top */}
        <View style={[styles.gradientOverlay, styles.topGradient]} />
        {/* Gradient Overlay Bottom */}
        <View style={[styles.gradientOverlay, styles.bottomGradient]} />
        
        <InteractionBar
          onStarPress={() => handleStarPress(item.id)}
          onCommentPress={() => console.log('Comment pressed', item.id)}
          onSharePress={() => console.log('Share pressed', item.id)}
          isStarred={starredVideos.has(item.id)}
          starCount={Math.floor(Math.random() * 1000)}
          commentCount={Math.floor(Math.random() * 500)}
        />
        <ChannelInfo
          channelLogo={item.channelLogo}
          channelName={item.channelName}
          videoTitle={item.title}
          isVerified={item.isVerified}
          isSupported={supportedChannels.has(item.channelName)}
          onChannelPress={() => console.log('Channel pressed', item.channelName)}
          onSupportPress={() => handleSupportPress(item.channelName)}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <VideoContainer
        videos={mockVideos}
        renderItem={renderVideoItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    width: screenWidth,
    height: screenHeight,
    position: 'relative',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1, // Lower than buttons and text
  },
  topGradient: {
    top: 0,
    height: 120,
    backgroundColor: 'transparent',
    borderTopColor: 'transparent',
  },
  bottomGradient: {
    bottom: 0,
    height: 200,
    backgroundColor: 'transparent',
    borderBottomColor: 'transparent',
  },
});

export default Zero;
