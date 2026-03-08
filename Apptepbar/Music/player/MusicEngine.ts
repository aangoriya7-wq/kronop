import TrackPlayer, { State, Track, Capability, AppKilledPlaybackBehavior } from 'react-native-track-player';

export const setupPlayer = async () => {
  try {
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
  const track: Track = {
    id: url, // Use URL as unique ID
    url,
    title,
    artist: artist || 'Unknown',
  };
  await TrackPlayer.add(track);
};

export const play = async () => {
  await TrackPlayer.play();
};

export const pause = async () => {
  await TrackPlayer.pause();
};

export const skipToNext = async () => {
  await TrackPlayer.skipToNext();
};

export const skipToPrevious = async () => {
  await TrackPlayer.skipToPrevious();
};

export const getCurrentTrack = async () => {
  return await TrackPlayer.getCurrentTrack();
};

export const getState = async () => {
  return await TrackPlayer.getState();
};
