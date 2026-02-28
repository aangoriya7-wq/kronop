import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, Image } from 'react-native';
import { useKronopVideoEngine } from '@/hooks/useKronopVideoEngine';

const { width, height } = Dimensions.get('window');

interface KronopVideoPlayerProps {
  videoUrl?: string;
  onFrameReady?: (frameData: ArrayBuffer) => void;
  onError?: (error: string) => void;
  showStats?: boolean;
}

export default function KronopVideoPlayer({ 
  videoUrl, 
  onFrameReady, 
  onError, 
  showStats = false 
}: KronopVideoPlayerProps) {
  const {
    isInitialized,
    isRunning,
    isLoading,
    error,
    currentFrame,
    stats,
    performanceMetrics,
    fpsFormatted,
    decodingSpeedFormatted,
    memoryUsageFormatted,
    bufferUtilizationPercent,
    predecodedFramesCount,
    batteryEfficiencyPercent,
    isHighPerformance,
    isMemoryEfficient,
    isThermalOptimal,
    hasSufficientPredecodedFrames,
    setVideoSource,
    setFrameCallback,
    setErrorCallback,
  } = useKronopVideoEngine(true);

  const canvasRef = useRef<View>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1080, height: 1920 });
  const [frameImageData, setFrameImageData] = useState<string | null>(null);

  // Set video source when URL changes
  useEffect(() => {
    if (videoUrl && isInitialized) {
      setVideoSource(videoUrl);
    }
  }, [videoUrl, isInitialized, setVideoSource]);

  // Set up callbacks
  useEffect(() => {
    if (onFrameReady) {
      setFrameCallback(onFrameReady);
    }
    if (onError) {
      setErrorCallback(onError);
    }
  }, [onFrameReady, onError, setFrameCallback, setErrorCallback]);

  // Process frame data and convert to displayable format
  useEffect(() => {
    if (currentFrame && canvasRef.current) {
      // Convert ArrayBuffer to displayable image data
      processFrameData(currentFrame);
    }
  }, [currentFrame]);

  const processFrameData = (frameData: ArrayBuffer) => {
    // For now, we'll create a visual representation of the frame data
    // In a real implementation, this would render the frame data to a native canvas
    const frameSize = frameData.byteLength;
    const timestamp = Date.now();
    
    // Create a simple gradient pattern to represent the frame
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Create animated gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const time = timestamp / 1000;
      
      gradient.addColorStop(0, `hsl(${(time * 50) % 360}, 70%, 50%)`);
      gradient.addColorStop(0.5, `hsl(${(time * 50 + 180) % 360}, 70%, 50%)`);
      gradient.addColorStop(1, `hsl(${(time * 50 + 90) % 360}, 70%, 50%)`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add some visual elements
      ctx.fillStyle = 'white';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🎬 Kronop Engine', canvas.width / 2, canvas.height / 2 - 100);
      
      ctx.font = '32px Arial';
      ctx.fillText(`Frame: ${frameSize} bytes`, canvas.width / 2, canvas.height / 2);
      ctx.fillText(`FPS: ${fpsFormatted}`, canvas.width / 2, canvas.height / 2 + 50);
      
      // Convert to data URL for display
      const dataUrl = canvas.toDataURL();
      setFrameImageData(dataUrl);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>🚀 Initializing Kronop Engine...</Text>
          <Text style={styles.loadingSubtext}>Rust + FFmpeg Video Decoder</Text>
          <Text style={styles.loadingSubtext}>Hardware Acceleration: VideoToolbox</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ Engine Error</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Video Canvas */}
      <View style={styles.videoContainer}>
        <View 
          ref={canvasRef}
          style={[
            styles.videoCanvas,
            { 
              width: canvasSize.width, 
              height: canvasSize.height,
              backgroundColor: isRunning ? '#000' : '#1a1a1a'
            }
          ]}
        >
          {/* Display frame data as image */}
          {frameImageData && isRunning ? (
            <Image 
              source={{ uri: frameImageData }} 
              style={styles.frameImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.waitingIndicator}>
              <Text style={styles.waitingText}>⏸️ Engine Ready</Text>
              <Text style={styles.waitingSubtext}>
                {hasSufficientPredecodedFrames ? '🟢 Pre-decoded frames ready' : '🟡 Buffering...'}
              </Text>
              <Text style={styles.waitingSubtext}>
                Pre-decoded: {predecodedFramesCount}/10 frames
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Performance Stats Overlay */}
      {showStats && stats && (
        <View style={styles.statsOverlay}>
          <Text style={styles.statsTitle}>🦀 Kronop Engine Stats</Text>
          
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Status:</Text>
            <Text style={[
              styles.statsValue,
              { color: isRunning ? '#34c759' : '#ff9500' }
            ]}>
              {isRunning ? '🟢 Running' : '🟡 Ready'}
            </Text>
          </View>
          
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Performance:</Text>
            <Text style={[
              styles.statsValue,
              { color: isHighPerformance ? '#34c759' : '#ff9500' }
            ]}>
              {isHighPerformance ? '🚀 High' : '⚡ Medium'}
            </Text>
          </View>
          
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>FPS:</Text>
            <Text style={styles.statsValue}>{fpsFormatted}</Text>
          </View>
          
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Decoding:</Text>
            <Text style={styles.statsValue}>{decodingSpeedFormatted}</Text>
          </View>
          
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Memory:</Text>
            <Text style={[
              styles.statsValue,
              { color: isMemoryEfficient ? '#34c759' : '#ff9500' }
            ]}>
              {memoryUsageFormatted}
            </Text>
          </View>
          
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Buffer:</Text>
            <Text style={styles.statsValue}>{bufferUtilizationPercent}%</Text>
          </View>
          
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Pre-decoded:</Text>
            <Text style={[
              styles.statsValue,
              { color: hasSufficientPredecodedFrames ? '#34c759' : '#ff9500' }
            ]}>
              {predecodedFramesCount}/10
            </Text>
          </View>
          
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Battery:</Text>
            <Text style={[
              styles.statsValue,
              { color: batteryEfficiencyPercent >= '80' ? '#34c759' : '#ff9500' }
            ]}>
              {batteryEfficiencyPercent}%
            </Text>
          </View>
          
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Thermal:</Text>
            <Text style={[
              styles.statsValue,
              { color: isThermalOptimal ? '#34c759' : '#ff9500' }
            ]}>
              {isThermalOptimal ? '🟢 Normal' : '🟡 Warm'}
            </Text>
          </View>
          
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Hardware:</Text>
            <Text style={styles.statsValue}>VideoToolbox</Text>
          </View>
          
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Format:</Text>
            <Text style={styles.statsValue}>RGB24</Text>
          </View>
          
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Resolution:</Text>
            <Text style={styles.statsValue}>1080x1920</Text>
          </View>
        </View>
      )}

      {/* Engine Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          🦀 Kronop Engine {isRunning ? '🟢' : '🟡'}
        </Text>
        <Text style={styles.statusText}>
          {isHighPerformance ? '🚀' : '⚡'} {fpsFormatted} FPS
        </Text>
        <Text style={styles.statusText}>
          {hasSufficientPredecodedFrames ? '🟢' : '🟡'} {predecodedFramesCount}/10
        </Text>
      </View>

      {/* Frame Info */}
      {currentFrame && (
        <View style={styles.frameInfo}>
          <Text style={styles.frameInfoText}>
            🎬 Frame: {currentFrame.byteLength.toLocaleString()} bytes
          </Text>
          <Text style={styles.frameInfoText}>
            ⚡ Real-time decoding
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff3b30',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#ff9500',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCanvas: {
    backgroundColor: '#000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  waitingIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 12,
  },
  waitingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  waitingSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 2,
  },
  statsOverlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  statsLabel: {
    fontSize: 12,
    color: '#ccc',
    flex: 1,
  },
  statsValue: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  statusBar: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  frameInfo: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 12,
  },
  frameInfoText: {
    fontSize: 12,
    color: '#fff',
    marginVertical: 2,
  },
});
