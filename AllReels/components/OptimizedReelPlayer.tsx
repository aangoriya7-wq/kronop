// Optimized reel player for 100M+ users

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import { Reel } from '../services/scalableVideoService';
import { StarButton, CommentButton, ShareButton, SaveButton, SupportButton, UserInfo, TitleDescription, ChannelLogo, SongInfo } from './ActionButtons';

interface OptimizedReelPlayerProps {
  reel: Reel;
  isActive: boolean;
  onStar: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onSupport: () => void;
  preload?: boolean;
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Memoized action buttons to prevent unnecessary re-renders
const MemoizedActionButtons = React.memo<{
  reel: Reel;
  onStar: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
}>(({ reel, onStar, onComment, onShare, onSave }) => (
  <View style={styles.actionsContainer}>
    <StarButton isStarred={reel.isStarred} stars={reel.stars} onPress={onStar} />
    <CommentButton comments={reel.comments} onPress={onComment} />
    <ShareButton shares={reel.shares} onPress={onShare} />
    <SaveButton isSaved={reel.isSaved} saves={reel.saves} onPress={onSave} />
  </View>
));

// Memoized info section
const MemoizedInfoSection = React.memo<{
  reel: Reel;
  onSupport: () => void;
}>(({ reel, onSupport }) => (
  <View style={styles.infoContainer}>
    <View style={styles.userRow}>
      <ChannelLogo />
      <View style={styles.userInfoColumn}>
        <View style={styles.nameAndSupport}>
          <UserInfo username={reel.username} />
          <SupportButton isSupporting={reel.isSupporting} onPress={onSupport} />
        </View>
        <SongInfo songName={reel.songName} />
        <TitleDescription description={reel.description} />
      </View>
    </View>
  </View>
));

export function OptimizedReelPlayer({
  reel,
  isActive,
  onStar,
  onComment,
  onShare,
  onSave,
  onSupport,
  preload = false
}: OptimizedReelPlayerProps) {
  const playerRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  // Initialize player only when needed
  const player = useVideoPlayer(reel.videoUrl, (player) => {
    if (!isInitializedRef.current) {
      player.loop = true;
      player.volume = 0; // Start muted for performance
      isInitializedRef.current = true;
    }
  });

  // Optimized play/pause logic
  useEffect(() => {
    if (!player || !isInitializedRef.current) return;

    if (isActive) {
      // Delay play for better performance when scrolling
      const timeoutId = setTimeout(() => {
        player.play();
      }, 100);
      return () => clearTimeout(timeoutId);
    } else {
      // Pause but keep ready for faster resume
      player.pause();
    }
  }, [isActive, player]);

  // Memoized toggle function
  const togglePlayPause = useCallback(() => {
    if (!player) return;
    
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  // Memoized video style
  const videoStyle = useMemo(() => [
    styles.video,
    {
      opacity: isActive ? 1 : 0.7,
    }
  ], [isActive]);

  // Preload next video if enabled
  useEffect(() => {
    if (preload && !isActive && player) {
      // Preload by resetting to start
      player.replace(reel.videoUrl);
    }
  }, [preload, isActive, player, reel.videoUrl]);

  return (
    <View style={styles.container}>
      <Pressable style={styles.videoContainer} onPress={togglePlayPause}>
        <VideoView
          style={videoStyle}
          player={player}
          nativeControls={false}
          contentFit="cover"
          allowsFullscreen={false}
        />
        
        {/* Play indicator - only show when needed */}
        {isActive && player && !player.playing && (
          <View style={styles.playIconContainer}>
            <MaterialIcons name="play-arrow" size={80} color="rgba(255,255,255,0.8)" />
          </View>
        )}
      </Pressable>

      {/* Render action buttons only when active for performance */}
      {isActive && (
        <>
          <MemoizedActionButtons
            reel={reel}
            onStar={onStar}
            onComment={onComment}
            onShare={onShare}
            onSave={onSave}
          />
          <MemoizedInfoSection
            reel={reel}
            onSupport={onSupport}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playIconContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  actionsContainer: {
    position: 'absolute',
    right: 12,
    bottom: 100,
    gap: 24,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 80,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  userInfoColumn: {
    flex: 1,
    gap: 4,
  },
  nameAndSupport: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
