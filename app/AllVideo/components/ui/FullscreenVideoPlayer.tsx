// Fullscreen Video Player Component - Shows video in fullscreen without rotating the app

import React from 'react';
import { View, StyleSheet, Modal, Pressable, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { VideoView } from 'expo-video';
import { colors, spacing } from '@/constants/theme';

interface FullscreenVideoPlayerProps {
  visible: boolean;
  onClose: () => void;
  player: any;
}

export function FullscreenVideoPlayer({ visible, onClose, player }: FullscreenVideoPlayerProps) {
  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={handleClose}
      transparent={false}
    >
      <StatusBar hidden />
      <View style={styles.container}>
        <VideoView 
          style={styles.video}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
        />
        
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <MaterialIcons name="close" size={32} color={colors.text} />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: spacing.sm,
    zIndex: 10,
  },
});
