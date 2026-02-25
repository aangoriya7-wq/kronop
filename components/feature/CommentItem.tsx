import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Comment } from '../../types/video';
import { theme } from '../../constants/theme';

interface CommentItemProps {
  comment: Comment;
  onLike?: (commentId: string) => void;
  onReply?: (comment: Comment) => void;
  level?: number;
}

export function CommentItem({ comment, onLike, onReply, level = 0 }: CommentItemProps) {
  const [liked, setLiked] = React.useState(false);

  const handleLike = () => {
    setLiked(!liked);
    onLike?.(comment.id);
  };

  const handleReply = () => {
    onReply?.(comment);
  };
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  return (
    <View style={[styles.container, level > 0 && { marginLeft: 40 }]}>
      <Image 
        source={{ uri: comment.userAvatar }} 
        style={styles.avatar} 
        contentFit="cover"
        onLoad={() => console.log('[COMMENT_ITEM]: User avatar loaded successfully:', comment.userAvatar)}
        onError={(error) => console.error('[COMMENT_ITEM]: User avatar failed to load:', error)}
      />
      
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.userName}>{comment.userName}</Text>
          <Text style={styles.timestamp}>{formatTimestamp(comment.timestamp)}</Text>
        </View>

        <Text style={styles.text}>{comment.text}</Text>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleLike}
            hitSlop={theme.hitSlop.sm}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={liked ? 'thumb-up' : 'thumb-up-off-alt'} 
              size={theme.iconSize.sm} 
              color={liked ? theme.colors.primary.main : theme.colors.text.secondary} 
            />
            <Text style={[styles.actionText, liked && { color: theme.colors.primary.main }]}>
              {comment.likes + (liked ? 1 : 0) > 0 ? comment.likes + (liked ? 1 : 0) : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            hitSlop={theme.hitSlop.sm}
            activeOpacity={0.7}
          >
            <MaterialIcons name="thumb-down-off-alt" size={theme.iconSize.sm} color={theme.colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.replyButton} 
            onPress={handleReply}
            hitSlop={theme.hitSlop.sm}
            activeOpacity={0.7}
          >
            <Text style={styles.replyText}>Reply</Text>
          </TouchableOpacity>
        </View>

        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onLike={onLike}
                onReply={onReply}
                level={level + 1}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.secondary,
  },
  contentContainer: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  userName: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    marginRight: theme.spacing.sm,
  },
  timestamp: {
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.xs,
  },
  text: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  actionText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.xs,
    marginLeft: theme.spacing.xs,
  },
  replyButton: {
    paddingVertical: theme.spacing.xs,
  },
  replyText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  repliesContainer: {
    marginTop: theme.spacing.sm,
  },
});
