import React, { createContext, useContext, useState, useEffect } from 'react';
import { View } from 'react-native';
import MusicBar from './layout/MusicBar';
import { setupPlayer, addTrack, play, pause, getState } from './player/MusicEngine';

interface CurrentSong {
  artist: string;
  title: string;
  url: string;
}

interface MusicContextType {
  currentSong: CurrentSong | null;
  isPlaying: boolean;
  playSong: (url: string, artist: string, title: string) => void;
  togglePlayPause: () => void;
  starSong: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusic must be used within MusicProvider');
  return context;
};

interface MusicProviderProps {
  children: React.ReactNode;
}

export const MusicProvider: React.FC<MusicProviderProps> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<CurrentSong | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const initializePlayer = async () => {
      await setupPlayer();
    };
    initializePlayer();
  }, []);

  const playSong = async (url: string, artist: string, title: string) => {
    await addTrack(url, title, artist);
    await play();
    setCurrentSong({ artist, title, url });
    setIsPlaying(true);
  };

  const togglePlayPause = async () => {
    if (isPlaying) {
      await pause();
      setIsPlaying(false);
    } else {
      await play();
      setIsPlaying(true);
    }
  };

  const starSong = () => {
    // TODO: Implement star functionality
    console.log('Star song:', currentSong?.title);
  };

  return (
    <MusicContext.Provider value={{ currentSong, isPlaying, playSong, togglePlayPause, starSong }}>
      {children}
      {currentSong && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000 }}>
          <MusicBar
            artist={currentSong.artist}
            song={currentSong.title}
            isPlaying={isPlaying}
            onPlayPause={togglePlayPause}
            onStar={starSong}
          />
        </View>
      )}
    </MusicContext.Provider>
  );
};
