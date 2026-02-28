import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
// import { Story } from '../../types/story'; // Removed - types folder deleted

// Define Story interface since types folder was deleted
interface Story {
  id: string;
  imageUrl: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  type: 'image' | 'video';
  timestamp: Date;
  viewed?: boolean;
}
import AsyncStorage from '@react-native-async-storage/async-storage';
// import demoUserService from '../../services/demoUserService'; // Removed - services folder deleted

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STORY_BOX_WIDTH = 78;
const STORY_BOX_HEIGHT = 110;

interface GroupedStory {
  userId: string;
  userName: string;
  userAvatar: string;
  stories: Story[];
  latestTimestamp: string;
}

interface StorySectionProps {
  stories: GroupedStory[];
  loading?: boolean;
  onStoryPress: (storyGroup: GroupedStory, storyIndex?: number) => void;
}

export function StorySection({ 
  stories, 
  loading = false, 
  onStoryPress
}: StorySectionProps) {
  
  // Smart sorting: unseen stories first, then viewed stories
  const sortedStories = [...stories].sort((a, b) => {
    const aHasUnviewed = a.stories.some(story => !story.viewed);
    const bHasUnviewed = b.stories.some(story => !story.viewed);
    
    if (aHasUnviewed && !bHasUnviewed) return -1;
    if (!aHasUnviewed && bHasUnviewed) return 1;
    return new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime();
  });

  const markStoryAsViewed = async (storyId: string) => {
    try {
      const viewedStories = await AsyncStorage.getItem('viewedStories');
      const viewed = viewedStories ? JSON.parse(viewedStories) : [];
      if (!viewed.includes(storyId)) {
        viewed.push(storyId);
        await AsyncStorage.setItem('viewedStories', JSON.stringify(viewed));
      }
    } catch (error) {
      console.error('Error marking story as viewed:', error);
    }
  };

  const renderStoryItem = ({ item, index }: { item: GroupedStory; index: number }) => {
    const hasUnviewedStories = item.stories.some(story => !story.viewed);
    const latestStory = item.stories[item.stories.length - 1];

    const handleStoryPress = async () => {
      // Mark all stories in this group as viewed
      for (const story of item.stories) {
        if (!story.viewed) {
          await markStoryAsViewed(story.id);
        }
      }
      onStoryPress(item);
    };

    return (
      <TouchableOpacity
        style={[
          styles.storyBox,
          hasUnviewedStories && styles.unviewedBox
        ]}
        onPress={handleStoryPress}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: latestStory?.thumbnailUrl || latestStory?.imageUrl || item.userAvatar }}
          style={styles.storyImage}
          contentFit="cover"
        />
        {hasUnviewedStories && (
          <View style={styles.unviewedIndicator} />
        )}
      </TouchableOpacity>
    );
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary.main} />
        </View>
      </View>
    );
  }

  if (stories.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="photo-library" size={40} color={theme.colors.text.tertiary} />
          <Text style={styles.emptyTitle}>Stories Coming Soon!</Text>
          <Text style={styles.emptySubtitle}>Share your moments with friends</Text>
        </View>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesContainer}
      >
        {sortedStories.map((item, index) => (
          <View key={item.userId} style={styles.storyWrapper}>
            {renderStoryItem({ item, index })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  storiesContainer: {
    paddingHorizontal: theme.spacing.sm,
    gap: 1,
  },
  storyWrapper: {
    marginRight: 1,
  },
  storyBox: {
    width: STORY_BOX_WIDTH,
    height: STORY_BOX_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e9ecef',
    borderWidth: 1,
    borderColor: '#8B00FF',
    position: 'relative',
    padding: 1,
  },
  unviewedBox: {
    borderWidth: 1.5,
    borderColor: '#8B00FF',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  unviewedIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary.main,
    borderWidth: 2,
    borderColor: '#fff',
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
});
