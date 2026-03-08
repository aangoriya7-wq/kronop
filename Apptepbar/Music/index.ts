// Export all music-related components and utilities
export { default as MusicPlayer } from './music.tsx';
export { MusicProvider, useMusic } from './MusicProvider';
export { default as MusicBar } from './layout/MusicBar';

// Export from components
export { default as PlayPauseButton } from './components/PlayPauseButton';
export { default as StarButton } from './components/StarButton';

// Export from player
export * from './player/MusicEngine';
