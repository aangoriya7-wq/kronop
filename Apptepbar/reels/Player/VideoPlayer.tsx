import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { getTurboBridge } from '../Native/TurboBridge';
import { getNPUController } from '../Native/NPUController';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

interface VideoPlayerProps {
  source: string;
  isPlaying?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  source, 
  isPlaying = true 
}) => {
  const [isEnhanced, setIsEnhanced] = useState(false);
  const turboBridgeRef = useRef(getTurboBridge());
  const npuControllerRef = useRef(getNPUController());

  const player = useVideoPlayer({
    uri: source,
    headers: {
      'User-Agent': 'KronopApp'
    }
  }, (player) => {
    player.loop = true;
    player.muted = false;
  });

  // Initialize Native Performance Enhancements
  useEffect(() => {
    const initializeNativeComponents = async () => {
      try {
        // Initialize Turbo Bridge for hardware acceleration
        if (turboBridgeRef.current && !turboBridgeRef.current.isReady()) {
          await turboBridgeRef.current.initialize();
        }

        // Initialize NPU Controller for AI enhancement
        if (npuControllerRef.current) {
          const npuReady = await npuControllerRef.current.initialize();
          if (npuReady) {
            setIsEnhanced(true);
          }
        }
      } catch (error) {
        // Silent fail
      }
    };

    initializeNativeComponents();
  }, []);

  // Enhanced video processing with NPU
  const processVideoWithNPU = async (videoData: ArrayBuffer, width: number, height: number) => {
    if (!isEnhanced || !npuControllerRef.current) return;
    try {
      await npuControllerRef.current.processFrame(videoData, width, height);
    } catch (error) {
      // Silent fail
    }
  };

  // Hardware-accelerated rendering
  const renderWithTurboBridge = async (frameData: ArrayBuffer) => {
    if (!turboBridgeRef.current?.isReady()) return;
    try {
      await turboBridgeRef.current.renderFrame(frameData, screenWidth, screenHeight);
    } catch (error) {
      // Silent fail
    }
  };

  useEffect(() => {
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying, player]);

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        nativeControls={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: screenWidth,
    height: screenHeight, // Full 9:16 vertical screen
    backgroundColor: '#000',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: screenWidth,
    height: screenHeight,
  },
});

export default VideoPlayer;
