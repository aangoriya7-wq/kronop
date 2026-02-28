import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Image } from 'expo-image';
import { theme } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Song {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverImage: string;
}

// Demo voice songs with actual audio URLs
const demoSongs: Song[] = [
  {
    id: '1',
    title: 'Demo Voice 1',
    artist: 'Test Artist',
    audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Demo bell sound
    coverImage: 'https://picsum.photos/300/300?random=101'
  },
  {
    id: '2', 
    title: 'Demo Voice 2',
    artist: 'Test Artist',
    audioUrl: 'https://www.soundjay.com/misc/sounds/button-3.wav', // Demo button sound
    coverImage: 'https://picsum.photos/300/300?random=102'
  },
  {
    id: '3',
    title: 'Demo Voice 3', 
    artist: 'Test Artist',
    audioUrl: 'https://www.soundjay.com/misc/sounds/beep-07a.wav', // Demo beep sound
    coverImage: 'https://picsum.photos/300/300?random=103'
  }
];

interface MusicPlayerProps {
  visible: boolean;
  onClose: () => void;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ visible, onClose }) => {
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentSong = demoSongs[currentSongIndex];

  // Load and play audio
  const loadSound = async (song: Song) => {
    try {
      setIsLoading(true);
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: song.audioUrl },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading sound:', error);
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);
      setIsPlaying(status.isPlaying || false);

      // Auto play next song when current ends
      if (status.didJustFinish) {
        handleNext();
      }
    }
  };

  const handlePlayPause = async () => {
    if (!sound || isLoading) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Error playing/pausing:', error);
    }
  };

  const handleNext = () => {
    const nextIndex = (currentSongIndex + 1) % demoSongs.length;
    setCurrentSongIndex(nextIndex);
  };

  const handlePrevious = () => {
    const prevIndex = currentSongIndex === 0 ? demoSongs.length - 1 : currentSongIndex - 1;
    setCurrentSongIndex(prevIndex);
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Load sound when song changes
  useEffect(() => {
    if (visible) {
      loadSound(currentSong);
    }
  }, [currentSongIndex, visible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Album Art */}
      <View style={styles.albumArtContainer}>
        <Image 
          source={{ uri: currentSong.coverImage }} 
          style={styles.albumArt}
          contentFit="cover"
        />
      </View>

      {/* Song Info */}
      <View style={styles.songInfoContainer}>
        <Text style={styles.songTitle}>{currentSong.title}</Text>
        <Text style={styles.artistName}>{currentSong.artist}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Text style={styles.timeText}>{formatTime(position)}</Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${duration > 0 ? (position / duration) * 100 : 0}%` }
            ]}
          />
        </View>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity onPress={handlePrevious} style={styles.controlButton}>
          <MaterialIcons name="skip-previous" size={32} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handlePlayPause} 
          style={[styles.playButton, isLoading && styles.playButtonDisabled]}
          disabled={isLoading}
        >
          <MaterialIcons 
            name={isLoading ? "hourglass-empty" : (isPlaying ? "pause" : "play-arrow")} 
            size={40} 
            color="#000" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleNext} style={styles.controlButton}>
          <MaterialIcons name="skip-next" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Song List */}
      <View style={styles.songListContainer}>
        <Text style={styles.songListTitle}>Demo Songs</Text>
        {demoSongs.map((song, index) => (
          <TouchableOpacity
            key={song.id}
            style={[
              styles.songListItem,
              index === currentSongIndex && styles.currentSongItem
            ]}
            onPress={() => setCurrentSongIndex(index)}
          >
            <Image source={{ uri: song.coverImage }} style={styles.songItemImage} />
            <View style={styles.songItemInfo}>
              <Text style={[
                styles.songItemTitle,
                index === currentSongIndex && styles.currentSongText
              ]}>
                {song.title}
              </Text>
              <Text style={styles.songItemArtist}>{song.artist}</Text>
            </View>
            {index === currentSongIndex && isPlaying && (
              <MaterialIcons name="volume-up" size={20} color="#8B00FF" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  albumArtContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  albumArt: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: 20,
    shadowColor: '#8B00FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  songInfoContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  songTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  artistName: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  timeText: {
    fontSize: 12,
    color: '#888',
    width: 40,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginHorizontal: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B00FF',
    borderRadius: 2,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B00FF',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  playButtonDisabled: {
    opacity: 0.6,
  },
  songListContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  songListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  songListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  currentSongItem: {
    backgroundColor: 'rgba(139, 0, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 0, 255, 0.5)',
  },
  songItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  songItemInfo: {
    flex: 1,
    marginLeft: 15,
  },
  songItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  currentSongText: {
    color: '#8B00FF',
  },
  songItemArtist: {
    fontSize: 14,
    color: '#888',
  },
});

const SongPlayer = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.currentSongText}>Music Player</Text>
      <Text style={styles.songItemArtist}>Coming Soon!</Text>
    </View>
  );
};

export default SongPlayer;
