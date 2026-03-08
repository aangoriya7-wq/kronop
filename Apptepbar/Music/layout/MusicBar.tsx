import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PlayPauseButton from '../components/PlayPauseButton';
import StarButton from '../components/StarButton';

interface MusicBarProps {
  artist: string;
  song: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  onStar: () => void;
}

export default function MusicBar({
  artist,
  song,
  isPlaying,
  onPlayPause,
  onStar,
}: MusicBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Text style={styles.text}>
          {artist} - {song}
        </Text>
      </View>
      <View style={styles.rightSection}>
        <PlayPauseButton
          isPlaying={isPlaying}
          onPress={onPlayPause}
          size={30}
        />
        <StarButton
          onPress={onStar}
          size={24}
          color="gold"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 65,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
  },
  leftSection: {
    flex: 1,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rightSection: {
    flexDirection: 'row',
    gap: 16,
  },
});
