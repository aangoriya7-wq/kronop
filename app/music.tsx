import React from 'react';
import MusicPlayer from '../Apptepbar/Music/music';
import { MusicProvider } from '../Apptepbar/Music/MusicProvider';

export default function Music() {
  return (
    <MusicProvider>
      <MusicPlayer />
    </MusicProvider>
  );
}
