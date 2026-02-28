// Song/Music info component - shows audio track name

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface SongInfoProps {
  songName: string;
}

export function SongInfo({ songName }: SongInfoProps) {
  return (
    <View style={styles.container}>
      <MaterialIcons name="music-note" size={14} color="#FFF" />
      <Text style={styles.songText} numberOfLines={1} ellipsizeMode="tail">
        {songName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 0,
  },
  songText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});
