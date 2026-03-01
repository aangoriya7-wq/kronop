import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolate } from 'react-native-reanimated';
import { useMemo } from 'react';
import { colors, spacing, typography } from '@/constants/theme';
import { VideoCard, CategoryBar } from '@/components';
import { useLongVideos } from '../../hooks/useVideos';
import { useSearchEngine } from '@/searchEngine';
import { useCategoryFilter } from '../../hooks/useCategoryFilter';
import { getAllCategories } from '@/services/categoryService';

const SEARCH_BAR_HEIGHT = 56;

export default function LongVideosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { videos, toggleLike } = useLongVideos();
  
  // Memoize scroll handler to prevent infinite re-renders
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Memoize animated styles to prevent infinite re-renders
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, 100],
      [SEARCH_BAR_HEIGHT + spacing.sm + spacing.md, 0],
      Extrapolate.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [0, 100],
      [1, 0],
      Extrapolate.CLAMP
    );
    const paddingTop = interpolate(
      scrollY.value,
      [0, 100],
      [insets.top + spacing.xs, 0],
      Extrapolate.CLAMP
    );
    const paddingBottom = interpolate(
      scrollY.value,
      [0, 100],
      [spacing.sm, 0],
      Extrapolate.CLAMP
    );
    return {
      height,
      opacity,
      paddingTop,
      paddingBottom,
    };
  });

  const categoryBarAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, 100],
      [0, -(SEARCH_BAR_HEIGHT + spacing.xs + insets.top)],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ translateY }],
    };
  });
  
  // Category Filter
  const { selectedCategory, setSelectedCategory, filteredVideos: categoryFilteredVideos } = useCategoryFilter(videos);
  const categories = useMemo(() => getAllCategories(), []);
  
  // Search Engine Integration
  const { 
    searchQuery, 
    setSearchQuery, 
    filteredResults: searchFilteredVideos,
    clearSearch,
    hasResults,
    isSearching
  } = useSearchEngine(categoryFilteredVideos);
  
  const finalVideos = searchFilteredVideos;

  const handleVideoPress = useMemo(() => (videoId: string) => {
    router.push(`/video/${videoId}?type=long`);
  }, [router]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search videos..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {isSearching && (
            <MaterialIcons 
              name="close" 
              size={20} 
              color={colors.textMuted} 
              style={styles.clearIcon}
              onPress={clearSearch}
            />
          )}
        </View>
      </Animated.View>

      <Animated.View style={[styles.categoryBarWrapper, categoryBarAnimatedStyle]}>
        <CategoryBar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </Animated.View>

      <Animated.FlatList
        data={finalVideos}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <VideoCard
            video={item}
            onPress={() => handleVideoPress(item.id)}
            onLike={() => toggleLike(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        ListEmptyComponent={
          useMemo(() => isSearching ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="search-off" size={64} color={colors.textMuted} />
              <Text style={styles.emptyText}>No videos found for "{searchQuery}"</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="videocam-off" size={64} color={colors.textMuted} />
              <Text style={styles.emptyText}>No videos available</Text>
            </View>
          ), [isSearching, searchQuery])
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Trending Videos</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    height: SEARCH_BAR_HEIGHT,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontFamily: typography.fontFamily.medium,
  },
  clearIcon: {
    marginLeft: spacing.sm,
  },
  categoryBarWrapper: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  listHeader: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: colors.text,
    fontFamily: typography.fontFamily.bold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    fontFamily: typography.fontFamily.medium,
  },
});
