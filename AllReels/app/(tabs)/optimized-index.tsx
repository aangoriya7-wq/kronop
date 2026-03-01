// Optimized reels screen for 100M+ users

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, Dimensions, ActivityIndicator, Text } from 'react-native';
import { OptimizedReelPlayer } from '@/components/OptimizedReelPlayer';
import { useScalableReels } from '@/hooks/useScalableReels';
import { loadManager } from '@/services/loadManager';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Memoized item component for performance
const MemoizedReelItem = React.memo<{
  item: any;
  index: number;
  isActive: boolean;
  onStar: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onSupport: () => void;
  qualitySettings: any;
}>(({ item, index, isActive, onStar, onComment, onShare, onSave, onSupport, qualitySettings }) => (
  <View style={styles.reelContainer}>
    <OptimizedReelPlayer
      reel={item}
      isActive={isActive}
      onStar={onStar}
      onComment={onComment}
      onShare={onShare}
      onSave={onSave}
      onSupport={onSupport}
      preload={qualitySettings.preloadEnabled}
    />
  </View>
));

export default function OptimizedReelsScreen() {
  const {
    reels,
    currentReelIndex,
    handleStar,
    handleSave,
    handleSupport,
    handleComment,
    handleShare,
    loadMoreReels,
    isLoadingMore,
    error,
    hasMore,
    setCurrentReelIndex,
  } = useScalableReels({
    initialLoadSize: 10,
    pageSize: 10,
    enableCache: true,
    preloadNextPage: true
  });

  const flatListRef = useRef<FlatList>(null);
  const [userSession] = useState(() => loadManager.addUser());

  // Get quality settings based on current load
  const qualitySettings = useMemo(() => {
    return loadManager.getQualitySettings();
  }, []);

  // Optimized viewable items changed handler
  const onViewableItemsChanged = useRef(({ changed }: any) => {
    if (changed.length > 0) {
      const visibleItem = changed[0];
      if (visibleItem.isViewable) {
        setCurrentReelIndex(visibleItem.index);
      }
    }
  }).current;

  // Optimized viewability config
  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 70,
    minimumViewTime: 200,
    itemVisibilityPercentThreshold: 70,
  }).current;

  // Memoized render item
  const renderReel = useCallback(({ item, index }: { item: any; index: number }) => (
    <MemoizedReelItem
      item={item}
      index={index}
      isActive={index === currentReelIndex}
      onStar={() => handleStar(item.id)}
      onComment={() => handleComment(item.id)}
      onShare={() => handleShare(item)}
      onSave={() => handleSave(item.id)}
      onSupport={() => handleSupport(item.id)}
      qualitySettings={qualitySettings}
    />
  ), [currentReelIndex, handleStar, handleComment, handleShare, handleSave, handleSupport, qualitySettings]);

  // Optimized key extractor
  const keyExtractor = useCallback((item: any) => `reel_${item.id}`, []);

  // Optimized getItemLayout
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: SCREEN_HEIGHT,
    offset: SCREEN_HEIGHT * index,
    index,
  }), []);

  // Load more handler with throttling
  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadMoreReels();
    }
  }, [hasMore, isLoadingMore, loadMoreReels]);

  // Error boundary fallback
  const renderError = useMemo(() => {
    if (!error) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>⚠️ Loading Error</Text>
        <Text style={styles.errorSubtext}>Please check your connection</Text>
      </View>
    );
  }, [error]);

  // Loading indicator
  const renderFooter = useMemo(() => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#FFD700" />
        <Text style={styles.loadingText}>Loading more reels...</Text>
      </View>
    );
  }, [isLoadingMore]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      loadManager.removeUser();
    };
  }, []);

  if (reels.length === 0 && !isLoadingMore) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>🎬 No reels available</Text>
          <Text style={styles.emptySubtext}>Pull to refresh</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={reels}
        renderItem={renderReel}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        maxToRenderPerBatch={3}
        initialNumToRender={1}
        windowSize={5}
        removeClippedSubviews={true}
        ListFooterComponent={renderFooter}
        ListHeaderComponent={renderError}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 1000,
        }}
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
  errorContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff3b30',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#ff9500',
    textAlign: 'center',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
  },
  loadingFooter: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
});
