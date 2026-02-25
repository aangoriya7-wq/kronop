import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Video } from '../../../types/video';
import { theme } from '../../../constants/theme';

interface VideoCardProps {
  video: Video;
  onPress: () => void;
  onPrefetchNext?: () => void;
}

export default function VideoCard({ video, onPress, onPrefetchNext }: VideoCardProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M views`;
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K views`;
    }
    return `${views} views`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  useEffect(() => {
    if (onPrefetchNext) {
      onPrefetchNext();
    }
  }, [onPrefetchNext]);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.thumbnailContainer}>
        <Image 
          source={{ uri: video.thumbnailUrl }} 
          style={styles.thumbnail} 
          contentFit="cover"
          onLoad={() => console.log('[VIDEO_CARD]: Thumbnail loaded successfully:', video.thumbnailUrl)}
          onError={(error) => console.error('[VIDEO_CARD]: Thumbnail failed to load:', error)}
        />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Image 
          source={{ uri: video.channelAvatar }} 
          style={styles.avatar} 
          contentFit="cover"
          onLoad={() => console.log('[VIDEO_CARD]: Channel avatar loaded successfully:', video.channelAvatar)}
          onError={(error) => console.error('[VIDEO_CARD]: Channel avatar failed to load:', error)}
        />

        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {video.title}
          </Text>
          <Text style={styles.channelName}>{video.channelName}</Text>
          <View style={styles.metaContainer}>
            <Text style={styles.metaText}>
              {formatViews(video.views)} • {formatDate(video.uploadDate)}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.menuButton} hitSlop={theme.hitSlop.md}>
          <MaterialIcons name="more-vert" size={theme.iconSize.lg} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background.primary,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: theme.colors.background.secondary,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.overlay,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  durationText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  infoContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.secondary,
  },
  textContainer: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: 20,
    marginBottom: theme.spacing.xs,
  },
  channelName: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    marginBottom: 2,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
  },
  menuButton: {
    padding: theme.spacing.xs,
  },
});
