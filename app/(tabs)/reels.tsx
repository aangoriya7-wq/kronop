import React, { useState, useRef } from 'react';
import { View, StyleSheet, FlatList, Dimensions } from 'react-native';
import { ReelPlayer } from '../../AllReels/components/ReelPlayer';
import { useReels } from '../../AllReels/hooks/useReels';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ReelsScreen() {
  const {
    reels,
    currentReelIndex,
    handleStar,
    handleSave,
    handleSupport,
    handleComment,
    handleShare,
    setCurrentReelIndex,
  } = useReels();
  
  const flatListRef = useRef<FlatList>(null);

  const renderReel = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.reelContainer}>
      <ReelPlayer
        reel={item}
        isActive={index === currentReelIndex}
        onStar={() => handleStar(item.id)}
        onComment={() => handleComment(item.id)}
        onShare={() => handleShare(item)}
        onSave={() => handleSave(item.id)}
        onSupport={() => handleSupport(item.id)}
      />
    </View>
  );

  const onViewableItemsChanged = useRef(({ changed }: any) => {
    if (changed.length > 0) {
      const visibleItem = changed[0];
      if (visibleItem.isViewable) {
        setCurrentReelIndex(visibleItem.index);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
    minimumViewTime: 300,
  }).current;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={reels}
        renderItem={renderReel}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(data, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  reelContainer: {
    height: SCREEN_HEIGHT,
    width: '100%',
  },
});
