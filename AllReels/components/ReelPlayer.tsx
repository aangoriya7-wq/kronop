// Video player component for reels

import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import { Reel } from '../services/videoService';
import { StarButton, CommentButton, ShareButton, SaveButton, SupportButton, UserInfo, TitleDescription, ChannelLogo, SongInfo } from './ActionButtons';

interface ReelPlayerProps {
  reel: Reel;
  isActive: boolean;
  onStar: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onSupport: () => void;
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export function ReelPlayer({
  reel,
  isActive,
  onStar,
  onComment,
  onShare,
  onSave,
  onSupport,
}: ReelPlayerProps) {
  const player = useVideoPlayer(reel.videoUrl, player => {
    player.loop = true;
    player.play();
  });

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  const togglePlayPause = useCallback(() => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);



  return (
    <View style={styles.container}>
      <Pressable style={styles.videoContainer} onPress={togglePlayPause}>
        <VideoView
          style={styles.video}
          player={player}
          nativeControls={false}
          contentFit="cover"
        />
        
        {!player.playing && (
          <View style={styles.playIconContainer}>
            <MaterialIcons name="play-arrow" size={80} color="rgba(255,255,255,0.8)" />
          </View>
        )}
      </Pressable>

      {/* Right side actions */}
      <View style={styles.actionsContainer}>
        <StarButton isStarred={reel.isStarred} stars={reel.stars} onPress={onStar} />
        <CommentButton comments={reel.comments} onPress={onComment} />
        <ShareButton shares={reel.shares} onPress={onShare} />
        <SaveButton isSaved={reel.isSaved} saves={reel.saves} onPress={onSave} />
      </View>

      {/* Bottom info with logo and support */}
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
