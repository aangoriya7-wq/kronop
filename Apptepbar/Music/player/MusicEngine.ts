import type { Track } from 'react-native-track-player';

export const setupPlayer = async () => {
  try {
    const { default: TrackPlayer, Capability, AppKilledPlaybackBehavior } = await import('react-native-track-player');
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.Stop,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
      ],
    });
  } catch (error) {
    console.error('Error setting up player:', error);
  }
};

export const addTrack = async (url: string, title: string, artist?: string) => {
  try {
    const { default: TrackPlayer } = await import('react-native-track-player');
    const track: Track = {
      id: url, // Use URL as unique ID
      url,
      title,
      artist: artist || 'Unknown',
    };
    await TrackPlayer.add(track);
  } catch (error) {
    console.error('Error adding track:', error);
  }
};

export const play = async () => {
  try {
    const { default: TrackPlayer } = await import('react-native-track-player');
    await TrackPlayer.play();
  } catch (error) {
    console.error('Error playing:', error);
  }
};

export const pause = async () => {
  try {
    const { default: TrackPlayer } = await import('react-native-track-player');
    await TrackPlayer.pause();
  } catch (error) {
    console.error('Error pausing:', error);
  }
};

export const skipToNext = async () => {
  try {
    const { default: TrackPlayer } = await import('react-native-track-player');
    await TrackPlayer.skipToNext();
  } catch (error) {
    console.error('Error skipping to next:', error);
  }
};

export const skipToPrevious = async () => {
  try {
    const { default: TrackPlayer } = await import('react-native-track-player');
    await TrackPlayer.skipToPrevious();
  } catch (error) {
    console.error('Error skipping to previous:', error);
  }
};

export const getCurrentTrack = async () => {
  try {
    const { default: TrackPlayer } = await import('react-native-track-player');
    return await TrackPlayer.getCurrentTrack();
  } catch (error) {
    console.error('Error getting current track:', error);
    return null;
  }
};

export const getState = async () => {
  try {
    const { default: TrackPlayer } = await import('react-native-track-player');
    return await TrackPlayer.getState();
  } catch (error) {
    console.error('Error getting state:', error);
    return null;
  }
};
