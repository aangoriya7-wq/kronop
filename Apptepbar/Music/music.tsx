import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useMusic } from './MusicProvider';

interface Song {
  _id: string;
  title: string;
  artist: string;
  url: string;
}

export default function MusicPlayer() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const { playSong, currentSong, isPlaying } = useMusic();

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      // Assuming the API endpoint for music content
      const response = await fetch('http://localhost:3000/api/content/music');
      const data = await response.json();
      if (data.success) {
        setSongs(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
      // For now, use sample data
      setSongs([
        { _id: '1', title: 'Sample Song 1', artist: 'Artist 1', url: 'https://example.com/song1.mp3' },
        { _id: '2', title: 'Sample Song 2', artist: 'Artist 2', url: 'https://example.com/song2.mp3' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = (song: Song) => {
    playSong(song.url, song.artist, song.title);
  };

  const renderSongItem = ({ item }: { item: Song }) => (
    <TouchableOpacity
      style={styles.songItem}
      onPress={() => handlePlaySong(item)}
    >
      <View style={styles.songInfo}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.artist}>{item.artist}</Text>
      </View>
      <Text style={styles.playText}>
        {currentSong?.url === item.url && isPlaying ? 'Playing' : 'Play'}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading songs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Music Player</Text>
      <FlatList
        data={songs}
        keyExtractor={(item) => item._id}
        renderItem={renderSongItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  list: {
    paddingBottom: 80, // Space for bottom bar
  },
  songItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
    borderRadius: 8,
  },
  songInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  artist: {
    fontSize: 14,
    color: '#ccc',
  },
  playText: {
    fontSize: 14,
    color: '#FFD700',
  },
});
