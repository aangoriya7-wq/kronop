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
          const bridgeReady = await turboBridgeRef.current.initialize();
          if (bridgeReady) {
            console.log('🚀 Turbo Bridge ready for hardware acceleration');
          }
        }

        // Initialize NPU Controller for AI enhancement
        if (npuControllerRef.current) {
          const npuReady = await npuControllerRef.current.initialize();
          if (npuReady) {
            setIsEnhanced(true);
            console.log('🤖 NPU Controller ready for AI enhancement');
          }
        }
      } catch (error) {
        console.error('❌ Failed to initialize native components:', error);
      }
    };

    initializeNativeComponents();
  }, []);

  // Enhanced video processing with NPU
  const processVideoWithNPU = async (videoData: ArrayBuffer, width: number, height: number) => {
    if (!isEnhanced || !npuControllerRef.current) return;

    try {
      const result = await npuControllerRef.current.processFrame(videoData, width, height);
      if (result) {
        console.log('✨ Video enhanced with AI');
      }
    } catch (error) {
      console.error('❌ NPU processing failed:', error);
    }
  };

  // Hardware-accelerated rendering
  const renderWithTurboBridge = async (frameData: ArrayBuffer) => {
    if (!turboBridgeRef.current?.isReady()) return;

    try {
      await turboBridgeRef.current.renderFrame(frameData, screenWidth, screenHeight);
    } catch (error) {
      console.error('❌ Turbo Bridge rendering failed:', error);
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
        allowsFullscreen={true}
        allowsPictureInPicture={true}
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
