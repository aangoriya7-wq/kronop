// Horizontal Video List Component - Scrollable related videos

import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '@/constants/theme';
import { Video } from '@/services/videoService';

interface HorizontalVideoListProps {
  videos: Video[];
  currentVideoId?: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.45;

export function HorizontalVideoList({ videos, currentVideoId }: HorizontalVideoListProps) {
  const router = useRouter();

  const filteredVideos = videos.filter(v => v.id !== currentVideoId);

  const handleVideoPress = (videoId: string) => {
    router.push(`/video/${videoId}?type=long`);
  };

  const renderItem = ({ item }: { item: Video }) => (
    <Pressable 
      style={styles.videoCard}
      onPress={() => handleVideoPress(item.id)}
    >
      <View style={styles.thumbnailContainer}>
        <Image 
          source={{ uri: item.thumbnail }}
          style={styles.thumbnail}
          contentFit="cover"
        />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{item.duration}</Text>
        </View>
      </View>
      
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2} ellipsizeMode="tail">
          {item.title}
        </Text>
        
        <View style={styles.videoMeta}>
          <Image 
            source={{ uri: item.user.avatar }}
            style={styles.avatarTiny}
            contentFit="cover"
          />
          <Text style={styles.uploaderName} numberOfLines={1}>
            {item.user.name}
          </Text>
        </View>
        
        <View style={styles.statsRow}>
          <MaterialIcons name="visibility" size={12} color={colors.textMuted} />
          <Text style={styles.viewsText}>{formatViews(item.views)}</Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="play-circle-filled" size={20} color={colors.primary} />
        <Text style={styles.headerTitle}>Related Videos</Text>
      </View>
      
      <FlatList
        data={filteredVideos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
      />
    </View>
  );
}

function formatViews(views: number): string {
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1) + 'M views';
  }
  if (views >= 1000) {
    return (views / 1000).toFixed(1) + 'K views';
  }
  return views + ' views';
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  videoCard: {
    width: CARD_WIDTH,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLight,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 10,
    color: colors.text,
    fontWeight: '600',
  },
  videoInfo: {
    marginTop: spacing.sm,
  },
  videoTitle: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 4,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  avatarTiny: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
  },
  uploaderName: {
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewsText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
