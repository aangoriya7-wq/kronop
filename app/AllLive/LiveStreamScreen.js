import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import Player from './Player';
import UserInfo from './userinfo';
import Title from './Title';
import UserCounting from './usercounting';
import Star from './star';
import Comment from './comment';
import Share from './share';
import Support from './support';

const { width, height } = Dimensions.get('window');

// Mock Data
const LIVE_STREAMS = [
  {
    id: '1',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    userName: 'Rahul Sharma',
    userId: '@rahul_gaming',
    userAvatar: 'https://i.pravatar.cc/150?img=1',
    title: 'PUBG Mobile Live | 10 Kill Challenge 🔥',
    viewers: 15420,
    stars: 23400,
    isStarred: false,
  },
  {
    id: '2',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    userName: 'Priya Singh',
    userId: '@priya_music',
    userAvatar: 'https://i.pravatar.cc/150?img=2',
    title: 'Live Singing | Bollywood Hits 🎤',
    viewers: 8230,
    stars: 15200,
    isStarred: true,
  },
  {
    id: '3',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    userName: 'Amit Kumar',
    userId: '@amit_cooking',
    userAvatar: 'https://i.pravatar.cc/150?img=3',
    title: 'Cooking Live: Paneer Butter Masala 👨‍🍳',
    viewers: 5670,
    stars: 8900,
    isStarred: false,
  },
];

export default function LiveStreamScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [streams, setStreams] = useState(LIVE_STREAMS);
  const flatListRef = useRef(null);

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / height);
    setCurrentIndex(index);
  };

  const handleStarPress = (streamId) => {
    setStreams(prev =>
      prev.map(stream =>
        stream.id === streamId
          ? {
              ...stream,
              isStarred: !stream.isStarred,
              stars: stream.isStarred ? stream.stars - 1 : stream.stars + 1,
            }
          : stream
      )
    );
  };

  const renderItem = ({ item, index }) => {
    const isActive = index === currentIndex;

    return (
      <View style={styles.streamContainer}>
        {/* Background Player */}
        <Player 
          videoUrl={item.videoUrl} 
          shouldPlay={isActive}
        />

        {/* Overlay Content */}
        <SafeAreaView style={styles.overlay}>
          {/* Left Side Content */}
          <View style={styles.leftContent}>
            <View style={styles.bottomLeftContent}>
              <View style={styles.userInfoRow}>
                <UserInfo 
                  userName={item.userName}
                  userId={item.userId}
                  userAvatar={item.userAvatar}
                />
                <Support />
              </View>
              <Title title={item.title} />
              <UserCounting viewers={item.viewers} />
            </View>
          </View>

          {/* Right Side Content */}
          <View style={styles.rightContent}>
            <Star 
              stars={item.stars}
              isStarred={item.isStarred}
              onPress={() => handleStarPress(item.id)}
            />
            <Comment streamId={item.id} />
            <Share 
              title={item.title}
              userName={item.userName}
            />
          </View>
        </SafeAreaView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={streams}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        decelerationRate="fast"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  streamContainer: {
    width,
    height,
    backgroundColor: '#000',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  leftContent: {
    flex: 1,
    justifyContent: 'flex-end',
    marginRight: 16,
  },
  bottomLeftContent: {
    marginBottom: 20,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rightContent: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 20,
    marginRight: 8,
  },
});