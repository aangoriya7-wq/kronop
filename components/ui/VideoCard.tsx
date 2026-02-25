import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { theme } from '../../constants/theme';
import { LongVideo } from '../../services/longVideoService';

interface VideoCardProps {
  video: LongVideo;
  onPress: () => void;
}

export function VideoCard({ video, onPress }: VideoCardProps) {
  return (
    <Pressable 
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}
    >
      {/* YouTube-style thumbnail - Full width, no gaps */}
      <View style={styles.thumbnailContainer}>
        <Image 
          source={{ uri: video.thumbnail }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.durationBadge}>
          <Text style={styles.duration}>{video.duration}</Text>
        </View>
      </View>
      
      {/* Title only - Clean YouTube style */}
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {video.title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.background.primary,
  },
  pressed: {
    opacity: 0.8,
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: theme.colors.background.tertiary,
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
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  duration: {
    color: theme.colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  titleContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
});
