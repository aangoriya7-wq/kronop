import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, AppState } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

const { width, height } = Dimensions.get('window');

// High-quality vertical video sources from shaka-player
const VERTICAL_VIDEO_SOURCES = [
  'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash/angel-one.mpd',
  'https://storage.googleapis.com/shaka-demo-assets/bravo-six/dash/bravo-six.mpd',
  'https://storage.googleapis.com/shaka-demo-assets/charlie-two/dash/charlie-two.mpd',
  'https://storage.googleapis.com/shaka-demo-assets/delta-three/dash/delta-three.mpd',
  'https://storage.googleapis.com/shaka-demo-assets/echo-four/dash/echo-four.mpd',
  'https://storage.googleapis.com/shaka-demo-assets/foxtrot-five/dash/foxtrot-five.mpd'
];

const VideoPlayer = ({ videoUrl, isActive, isMuted, onEnd }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  // Monitor app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
    });

    return () => subscription?.remove();
  }, []);

  const isAppActive = appState === 'active';
  const shouldPlay = isActive && isAppActive;

  useEffect(() => {
    if (videoRef.current) {
      if (shouldPlay) {
        // Only try to play when app is active and video is active
        videoRef.current.playAsync().then(() => {
          setIsPlaying(true);
          console.log('🔥 Video Playing:', videoUrl || 'Default Source');
        }).catch(error => {
          // Handle audio focus and other errors gracefully
          console.log('❌ Play Error:', error.message || error);
          setIsPlaying(false);
          // Don't throw the error, just log it
          if (error.message && error.message.includes('AudioFocusNotAcquired')) {
            console.log('🔇 Audio focus not available (app likely in background)');
          }
        });
      } else {
        // Pause when not active or app is in background
        videoRef.current.pauseAsync().catch(() => {
          // Ignore pause errors
        });
        setIsPlaying(false);
      }
    }
  }, [shouldPlay, videoUrl]);

  const handleVideoEnd = () => {
    setIsPlaying(false);
    onEnd?.();
  };

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri: videoUrl || VERTICAL_VIDEO_SOURCES[0] }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay={shouldPlay}
        isLooping={true}
        onPlaybackStatusUpdate={(status) => {
          if (status.isLoaded && !status.isPlaying && shouldPlay) {
            // Only try to play if app is active and video should be playing
            videoRef.current.playAsync().catch(error => {
              if (error.message && error.message.includes('AudioFocusNotAcquired')) {
                console.log('🔇 Audio focus not available during playback update');
              }
            });
            setIsPlaying(true);
          }
        }}
        onPlaybackFinish={handleVideoEnd}
        volume={1.0}
        isMuted={isMuted}
        useNativeControls={false}
        // Crystal clear settings
        rate={1.0}
        shouldCorrectPitch={true}
        progressUpdateIntervalMillis={16}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
});

export default VideoPlayer;
