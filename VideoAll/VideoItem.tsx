import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, Share } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import StarButton from './assets/StarButton';
import CommentButton from './assets/CommentButton';
import ShareButton from './assets/ShareButton';
import ReportButton from './assets/ReportButton';

interface VideoItemProps {
  video: {
    id: string;
    title: string;
    thumbnail: string;
    channelName: string;
    views: string;
    timestamp: string;
    duration: string;
    likes?: number;
    comments?: number;
  };
  onPress: () => void;
  onStarPress?: (videoId: string) => void;
  onCommentPress?: (videoId: string) => void;
  onSharePress?: (videoId: string, title: string) => void;
  onReportPress?: (videoId: string) => void;
}

export default function VideoItem({ 
  video, 
  onPress, 
  onStarPress, 
  onCommentPress, 
  onSharePress, 
  onReportPress 
}: VideoItemProps) {
  const [isStarred, setIsStarred] = useState(false);
  const [starCount, setStarCount] = useState(video.likes || 0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const handleStarPress = () => {
    const newStarredState = !isStarred;
    setIsStarred(newStarredState);
    setStarCount(prev => newStarredState ? prev + 1 : prev - 1);
    
    if (onStarPress) {
      onStarPress(video.id);
    }
    
    // Update MongoDB star count
    updateStarCount(video.id, newStarredState);
  };

  const handleCommentPress = () => {
    if (onCommentPress) {
      onCommentPress(video.id);
    }
    // Load real-time comments section
    loadComments(video.id);
  };

  const handleSharePress = async () => {
    try {
      await Share.share({
        message: `Check out this video: ${video.title}`,
        url: `https://kronop.com/video/${video.id}`,
        title: video.title,
      });
      
      if (onSharePress) {
        onSharePress(video.id, video.title);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleReportPress = () => {
    Alert.alert(
      'Report Video',
      'Why are you reporting this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Inappropriate Content', onPress: () => submitReport('inappropriate') },
        { text: 'Spam', onPress: () => submitReport('spam') },
        { text: 'Copyright', onPress: () => submitReport('copyright') },
      ]
    );
    
    if (onReportPress) {
      onReportPress(video.id);
    }
  };

  const updateStarCount = async (videoId: string, increment: boolean) => {
    try {
      // MongoDB update call
      const response = await fetch(`/api/videos/${videoId}/star`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update star count');
      }
    } catch (error) {
      console.error('Star update error:', error);
    }
  };

  const loadComments = (videoId: string) => {
    // Real-time comments loading logic
    console.log('Loading comments for video:', videoId);
  };

  const submitReport = async (reason: string) => {
    try {
      const response = await fetch(`/api/videos/${video.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      
      if (response.ok) {
        Alert.alert('Report Submitted', 'Thank you for your report');
      }
    } catch (error) {
      console.error('Report submission error:', error);
    }
  };
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {/* Large Thumbnail - 16:9 ratio */}
      <View style={styles.thumbnailContainer}>
        <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{video.duration}</Text>
        </View>
      </View>
      
      {/* Video Info - Title only */}
      <View style={styles.videoInfo}>
        <Text style={styles.title} numberOfLines={1}>
          {video.title}
        </Text>
      </View>
      
      {/* Action Buttons - Only show when video is playing */}
      {isVideoPlaying && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleStarPress}>
            <MaterialIcons 
              name={isStarred ? "star" : "star-border"} 
              size={20} 
              color={isStarred ? theme.colors.primary.main : theme.colors.text.secondary} 
            />
            <Text style={styles.actionText}>{starCount}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleCommentPress}>
            <MaterialIcons name="comment" size={20} color={theme.colors.text.secondary} />
            <Text style={styles.actionText}>{video.comments || 0}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleSharePress}>
            <MaterialIcons name="share" size={20} color={theme.colors.text.secondary} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleReportPress}>
            <MaterialIcons name="flag" size={20} color={theme.colors.text.secondary} />
            <Text style={styles.actionText}>Report</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <MaterialIcons name="more-vert" size={20} color={theme.colors.text.tertiary} style={styles.moreButton} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    width: '100%',
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
    justifyContent: 'space-between',
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16/9,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background.elevated,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  videoInfo: {
    padding: theme.spacing.md,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  moreButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  actionText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    marginLeft: 4,
  },
});