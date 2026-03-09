import registerRootComponent from 'expo/src/launch/registerRootComponent';

import App from 'expo-router/entry';

// Register TrackPlayer service asynchronously
(async () => {
  try {
    const TrackPlayer = (await import('react-native-track-player')).default;
    TrackPlayer.registerPlaybackService(() => require('./service'));
  } catch (error) {
    console.warn('TrackPlayer registration failed:', error);
  }
})();

registerRootComponent(App);
