import React from 'react';
import { View, StyleSheet, Dimensions, FlatList, ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

interface VideoItem {
  id: string;
  uri: string;
  title: string;
  channelName: string;
  channelLogo: string;
}

interface VideoContainerProps {
  videos: VideoItem[];
  renderItem: ({ item, index }: { item: VideoItem; index: number }) => React.ReactElement;
  onViewableItemsChanged?: (info: { viewableItems: ViewToken<VideoItem>[]; changed: ViewToken<VideoItem>[] }) => void;
  viewabilityConfig?: any;
}

const VideoContainer: React.FC<VideoContainerProps> = ({ videos, renderItem, onViewableItemsChanged, viewabilityConfig }) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom + 80, 100); // Reduced to 80px minimum + safe area
  
  return (
    <View style={styles.container}>
      <FlatList
        data={videos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled={true}
        snapToInterval={screenHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(data, index) => ({
          length: screenHeight,
          offset: screenHeight * index,
          index,
        })}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={1}
        removeClippedSubviews={true}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default VideoContainer;
