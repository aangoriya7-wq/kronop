// StoryComponent.tsx - Auto-next story with timer
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../constants/theme';

// Types
interface Story {
  id: string;
  imageUrl: string;
  userAvatar: string;
  userName: string;
  viewed: boolean;
  duration?: number; // seconds for each story
  timestamp?: Date;
  likes?: number;
}

interface StoryComment {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
}

interface StoryItemProps {
  story: Story;
  isAddStory?: boolean;
  onPress?: () => void;
  allStories?: Story[];
}

interface StoryViewScreenProps {
  route: {
    params: {
      story: Story;
      stories?: Story[];
      startIndex?: number;
    };
  };
}

const { width, height } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds per story

// StoryItem Component
export function StoryItem({ 
  story, 
  isAddStory = false, 
  onPress,
  allStories = [] 
}: StoryItemProps) {
  const navigation = useNavigation();

  const handlePress = () => {
    if (isAddStory && onPress) {
      onPress();
    } else {
      // Find current story index in allStories
      const storyIndex = allStories.findIndex(s => s.id === story.id);
      
      if (navigation && navigation.navigate) {
        (navigation.navigate as any)('StoryView', { 
          story, 
          stories: allStories,
          startIndex: storyIndex
        });
      }
    }
  };

  if (isAddStory) {
    return (
      <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
        <View style={styles.addStoryContainer}>
          <Image 
            source={{ uri: story.userAvatar }} 
            style={styles.image} 
            contentFit="cover"
            onLoad={() => console.log('[STORY_ITEM]: User avatar loaded successfully:', story.userAvatar)}
            onError={(error) => console.error('[STORY_ITEM]: User avatar failed to load:', error)}
          />
          <View style={styles.addIcon}>
            <MaterialIcons name="add" size={20} color={theme.colors.text.primary} />
          </View>
        </View>
        <Text style={styles.name} numberOfLines={1}>Create</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <View style={[styles.imageContainer, story.viewed && styles.viewedBorder]}>
        <Image 
          source={{ uri: story.imageUrl }} 
          style={styles.image} 
          contentFit="cover"
          onLoad={() => console.log('[STORY_ITEM]: Story image loaded successfully:', story.imageUrl)}
          onError={(error) => console.error('[STORY_ITEM]: Story image failed to load:', error)}
        />
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: story.userAvatar }} 
            style={styles.avatar} 
            contentFit="cover"
            onLoad={() => console.log('[STORY_ITEM]: User avatar loaded successfully:', story.userAvatar)}
            onError={(error) => console.error('[STORY_ITEM]: User avatar failed to load:', error)}
          />
        </View>
      </View>
      <Text style={styles.name} numberOfLines={1}>{story.userName}</Text>
    </TouchableOpacity>
  );
}

// StoryViewScreen Component with Auto-Next
export function StoryViewScreen({ route }: StoryViewScreenProps) {
  const { story, stories = [], startIndex = 0 } = route.params;
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [liked, setLiked] = useState(false);
  const [comment, setComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([
    { id: '1', user: 'User1', text: 'Nice story!', time: '2h ago' },
    { id: '2', user: 'User2', text: 'Amazing!', time: '1h ago' },
  ]);
  const [paused, setPaused] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStory = stories[currentIndex] || story;
  const storyDuration = currentStory.duration || STORY_DURATION;

  // Auto-next story function
  const nextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setLiked(false); // Reset like for new story
      setShowComments(false); // Close comments for new story
    } else {
      // All stories completed, go back
      navigation.goBack();
    }
  };

  // Previous story function
  const prevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setLiked(false);
      setShowComments(false);
    }
  };

  // Start progress animation
  const startProgress = () => {
    if (paused) return;
    
    progressAnim.setValue(0);
    
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: storyDuration,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !paused) {
        nextStory();
      }
    });
  };

  // Pause/Resume story
  const togglePause = () => {
    setPaused(!paused);
    if (!paused) {
      progressAnim.stopAnimation();
    } else {
      startProgress();
    }
  };

  // Handle like
  const handleLike = () => {
    setLiked(!liked);
  };

  // Handle comment send
  const handleSendComment = () => {
    if (comment.trim()) {
      const newComment = {
        id: Date.now().toString(),
        user: 'You',
        text: comment,
        time: 'Just now',
      };
      setComments([newComment, ...comments]);
      setComment('');
    }
  };

  // Handle close
  const handleClose = () => {
    navigation.goBack();
  };

  // Handle swipe
  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      prevStory();
    } else if (direction === 'left') {
      nextStory();
    }
  };

  // Effect for auto-next
  useEffect(() => {
    if (!paused) {
      startProgress();
    }

    return () => {
      progressAnim.stopAnimation();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentIndex, paused]);

  // Reset when story changes
  useEffect(() => {
    progressAnim.setValue(0);
    if (!paused) {
      startProgress();
    }
  }, [currentStory.id]);

  // Calculate progress bar width
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.storyViewContainer}>
      {/* Progress Bars */}
      <View style={styles.progressBarsContainer}>
        {stories.map((_, index) => (
          <View key={index} style={styles.progressBarBackground}>
            {index === currentIndex ? (
              <Animated.View 
                style={[
                  styles.progressBarFill,
                  { width: progressWidth }
                ]} 
              />
            ) : (
              <View style={[
                styles.progressBarStatic,
                index < currentIndex && styles.progressBarCompleted
              ]} />
            )}
          </View>
        ))}
      </View>

      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <Ionicons name="close" size={28} color="white" />
      </TouchableOpacity>

      {/* Pause Button */}
      <TouchableOpacity style={styles.pauseButton} onPress={togglePause}>
        <Ionicons 
          name={paused ? 'play' : 'pause'} 
          size={24} 
          color="white" 
        />
      </TouchableOpacity>

      {/* Story Image */}
      <Image
        source={{ uri: currentStory.imageUrl }}
        style={styles.storyImage}
        contentFit="cover"
      />

      <View style={styles.overlay}>
        {/* User Info */}
        <View style={styles.userInfo}>
          <Image
            source={{ uri: currentStory.userAvatar }}
            style={styles.userAvatar}
            contentFit="cover"
          />
          <View>
            <Text style={styles.userName}>{currentStory.userName}</Text>
            <Text style={styles.time}>{Math.floor(storyDuration/1000)}s</Text>
          </View>
        </View>

        {/* Interaction Buttons */}
        <View style={styles.interactionContainer}>
          <TouchableOpacity style={styles.interactionButton} onPress={handleLike}>
            <MaterialIcons
              name={liked ? 'favorite' : 'favorite-border'}
              size={28}
              color={liked ? theme.colors.error : 'white'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.interactionButton}
            onPress={() => setShowComments(!showComments)}
          >
            <MaterialIcons name="comment" size={26} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.interactionButton}>
            <MaterialIcons name="send" size={26} color="white" />
          </TouchableOpacity>
        </View>

        {/* Comments Section */}
        {showComments && (
          <View style={styles.commentsContainer}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setShowComments(false)}>
                <Ionicons name="chevron-down" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <Text style={styles.commentUser}>{item.user}</Text>
                  <Text style={styles.commentText}>{item.text}</Text>
                  <Text style={styles.commentTime}>{item.time}</Text>
                </View>
              )}
              style={styles.commentsList}
            />

            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={comment}
                onChangeText={setComment}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
              />
              <TouchableOpacity onPress={handleSendComment}>
                <MaterialIcons
                  name="send"
                  size={24}
                  color={theme.colors.primary.main}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Swipe Areas */}
      <TouchableOpacity
        style={[styles.swipeArea, styles.leftSwipeArea]}
        onPress={() => handleSwipe('right')}
      />
      <TouchableOpacity
        style={[styles.swipeArea, styles.rightSwipeArea]}
        onPress={() => handleSwipe('left')}
      />
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  // StoryItem Styles
  container: {
    width: 80,
    marginRight: theme.spacing.sm,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    borderWidth: 3,
    borderColor: theme.colors.primary.main,
    padding: 2,
    position: 'relative',
  },
  viewedBorder: {
    borderColor: theme.colors.border.primary,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.secondary,
  },
  avatarContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderWidth: 2,
    borderColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.full,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.full,
  },
  addStoryContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    position: 'relative',
  },
  addIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background.primary,
  },
  name: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.xs,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },

  // StoryViewScreen Styles
  storyViewContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  progressBarsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 10,
    gap: 4,
    zIndex: 10,
  },
  progressBarBackground: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary.main,
    borderRadius: 1.5,
  },
  progressBarStatic: {
    height: '100%',
    width: '0%',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBarCompleted: {
    width: '100%',
    backgroundColor: theme.colors.primary.main,
  },
  storyImage: {
    width: width,
    height: height,
    position: 'absolute',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 15,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 15,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButton: {
    position: 'absolute',
    top: 50,
    right: 15,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  time: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  interactionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    marginBottom: 20,
  },
  interactionButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 15,
    padding: 15,
    maxHeight: height * 0.4,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  commentsTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  commentsList: {
    marginBottom: 15,
  },
  commentItem: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  commentUser: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  commentText: {
    color: 'white',
    fontSize: 14,
    marginVertical: 5,
  },
  commentTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  commentInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    paddingVertical: 5,
  },
  swipeArea: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: width * 0.3,
    zIndex: 5,
  },
  leftSwipeArea: {
    left: 0,
  },
  rightSwipeArea: {
    right: 0,
  },
});

// Usage Example:
/*
// HomeScreen mein
const stories = [
  {
    id: '1',
    imageUrl: 'url1',
    userAvatar: 'avatar1',
    userName: 'User 1',
    viewed: false,
    duration: 5000,
  },
  {
    id: '2',
    imageUrl: 'url2',
    userAvatar: 'avatar2',
    userName: 'User 2',
    viewed: false,
    duration: 5000,
  },
  // ... more stories
];

<FlatList
  horizontal
  data={stories}
  renderItem={({ item }) => (
    <StoryItem 
      story={item} 
      allStories={stories}
    />
  )}
/>
*/
