/**
 * Example Usage - Kronop Cleaner AI in React Native
 * High-performance video processing demonstration
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, Image, StyleSheet, Alert, ProgressBarAndroid, Platform } from 'react-native';
import KronopCleaner, { PerformanceModes, VideoResolutions } from './KronopCleaner';

const KronopExample = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [progress, setProgress] = useState(0);
  
  const kronopRef = useRef(KronopCleaner);

  // Initialize Kronop Cleaner AI
  const initializeKronop = async () => {
    try {
      console.log('🚀 Initializing Kronop Cleaner AI...');
      
      const result = await kronopRef.current.initialize({
        width: VideoResolutions.FHD.width,
        height: VideoResolutions.FHD.height,
        enableVulkan: true,
        performanceMode: PerformanceModes.BALANCED
      });

      setIsInitialized(true);
      
      // Get initial statistics
      const initialStats = await kronopRef.current.getStatistics();
      setStats(initialStats);
      
      Alert.alert(
        '✅ Kronop Initialized',
        `Mode: ${result.performanceMode}\nVulkan: ${result.vulkanEnabled ? 'Enabled' : 'Disabled'}\nResolution: ${result.width}x${result.height}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('❌ Initialization failed:', error);
      Alert.alert('❌ Error', `Failed to initialize: ${error.message}`);
    }
  };

  // Process a single frame
  const processSingleFrame = async () => {
    if (!isInitialized) {
      Alert.alert('❌ Not Initialized', 'Please initialize Kronop first');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Generate test frame data (in real app, this would come from camera/video)
      const testFrame = generateTestFrame(VideoResolutions.FHD.width, VideoResolutions.FHD.height);
      
      console.log('🎬 Processing single frame...');
      const result = await kronopRef.current.processFrame(testFrame);
      
      console.log(`✅ Frame processed in ${result.processingTime}ms (${result.fps} FPS)`);
      
      // Update processed image (in real app, you'd display the result)
      setProcessedImage(`data:image/jpeg;base64,${result.outputData}`);
      
      // Update statistics
      const updatedStats = await kronopRef.current.getStatistics();
      setStats(updatedStats);
      
      Alert.alert(
        '✅ Frame Processed',
        `Time: ${result.processingTime}ms\nFPS: ${result.fps.toFixed(1)}\nMode: ${result.mode}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('❌ Frame processing failed:', error);
      Alert.alert('❌ Error', `Frame processing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process batch of frames
  const processBatch = async () => {
    if (!isInitialized) {
      Alert.alert('❌ Not Initialized', 'Please initialize Kronop first');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      
      // Generate test frames
      const frames = [];
      const frameCount = 10;
      
      for (let i = 0; i < frameCount; i++) {
        const frame = generateTestFrame(VideoResolutions.FHD.width, VideoResolutions.FHD.height);
        frames.push(frame);
        setProgress((i + 1) / frameCount * 50); // Update progress for frame generation
      }
      
      console.log(`🎬 Processing batch of ${frameCount} frames...`);
      
      const result = await kronopRef.current.processBatch(frames, {
        onProgress: (progress) => {
          setProgress(50 + (progress.frame / progress.total) * 50);
        }
      });
      
      console.log(`✅ Batch completed in ${result.totalProcessingTime}ms`);
      console.log(`   Average: ${result.avgTimePerFrame}ms per frame (${result.avgFps} FPS)`);
      
      // Update statistics
      const updatedStats = await kronopRef.current.getStatistics();
      setStats(updatedStats);
      
      Alert.alert(
        '✅ Batch Processed',
        `Frames: ${result.frameCount}\nAvg Time: ${result.avgTimePerFrame}ms\nAvg FPS: ${result.avgFps.toFixed(1)}\nMode: ${result.mode}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('❌ Batch processing failed:', error);
      Alert.alert('❌ Error', `Batch processing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // Real-time stream processing
  const processStream = async () => {
    if (!isInitialized) {
      Alert.alert('❌ Not Initialized', 'Please initialize Kronop first');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      
      console.log('🎥 Starting real-time stream processing...');
      
      const result = await kronopRef.current.processStream(
        // Frame provider function
        async () => {
          // In real app, this would get frames from camera/video
          return generateTestFrame(VideoResolutions.FHD.width, VideoResolutions.FHD.height);
        },
        // Frame consumer function
        async (processedFrame, result) => {
          console.log(`Stream frame processed: ${result.processingTime}ms (${result.fps} FPS)`);
        },
        // Stream options
        {
          maxFrames: 30,
          targetFPS: 30,
          onProgress: (progress) => {
            setProgress((progress.frame / progress.total) * 100);
          }
        }
      );
      
      console.log(`✅ Stream completed: ${result.totalFrames} frames`);
      console.log(`   Average FPS: ${result.avgFps.toFixed(1)}`);
      
      Alert.alert(
        '✅ Stream Completed',
        `Frames: ${result.totalFrames}\nAvg FPS: ${result.avgFps.toFixed(1)}\nAvg Time: ${result.avgProcessingTime}ms`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('❌ Stream processing failed:', error);
      Alert.alert('❌ Error', `Stream processing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // Change performance mode
  const changePerformanceMode = async (mode) => {
    if (!isInitialized) {
      Alert.alert('❌ Not Initialized', 'Please initialize Kronop first');
      return;
    }

    try {
      const modeNames = ['Quality', 'Balanced', 'Performance'];
      await kronopRef.current.setPerformanceMode(mode);
      
      Alert.alert(
        '✅ Performance Mode Changed',
        `New mode: ${modeNames[mode]}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('❌ Failed to change performance mode:', error);
      Alert.alert('❌ Error', `Failed to change mode: ${error.message}`);
    }
  };

  // Get current statistics
  const getStatistics = async () => {
    if (!isInitialized) {
      Alert.alert('❌ Not Initialized', 'Please initialize Kronop first');
      return;
    }

    try {
      const currentStats = await kronopRef.current.getStatistics();
      setStats(currentStats);
      
      Alert.alert(
        '📊 Statistics',
        `Resolution: ${currentStats.width}x${currentStats.height}\nMode: ${currentStats.mode}\nVulkan: ${currentStats.vulkanEnabled ? 'Enabled' : 'Disabled'}\n\n${currentStats.statistics}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('❌ Failed to get statistics:', error);
      Alert.alert('❌ Error', `Failed to get statistics: ${error.message}`);
    }
  };

  // Shutdown
  const shutdown = async () => {
    try {
      await kronopRef.current.shutdown();
      setIsInitialized(false);
      setStats(null);
      setProcessedImage(null);
      
      Alert.alert('🛑 Shutdown', 'Kronop Cleaner AI has been shutdown', [{ text: 'OK' }]);

    } catch (error) {
      console.error('❌ Shutdown failed:', error);
      Alert.alert('❌ Error', `Shutdown failed: ${error.message}`);
    }
  };

  // Generate test frame data (simplified)
  const generateTestFrame = (width, height) => {
    // In real app, this would be actual video frame data
    // For demo, we'll generate a simple pattern
    const size = width * height * 3;
    const frame = new Uint8Array(size);
    
    for (let i = 0; i < size; i += 3) {
      // Generate RGB pattern
      frame[i] = (i / 3) % 256;     // Red
      frame[i + 1] = (i / 3 + 85) % 256; // Green
      frame[i + 2] = (i / 3 + 170) % 256; // Blue
    }
    
    return frame;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚀 Kronop Cleaner AI</Text>
      <Text style={styles.subtitle}>High-Performance Video Processing</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: {isInitialized ? '✅ Initialized' : '❌ Not Initialized'}
        </Text>
        {stats && (
          <Text style={styles.statsText}>
            {stats.mode} | {stats.vulkanEnabled ? 'GPU' : 'CPU'} | {stats.width}x{stats.height}
          </Text>
        )}
      </View>

      {Platform.OS === 'android' && progress > 0 && (
        <ProgressBarAndroid
          styleAttr="Horizontal"
          indeterminate={false}
          progress={progress / 100}
          style={styles.progressBar}
        />
      )}

      <View style={styles.buttonContainer}>
        <Button
          title="Initialize"
          onPress={initializeKronop}
          disabled={isInitialized || isProcessing}
        />
        
        <Button
          title="Process Single Frame"
          onPress={processSingleFrame}
          disabled={!isInitialized || isProcessing}
        />
        
        <Button
          title="Process Batch (10 frames)"
          onPress={processBatch}
          disabled={!isInitialized || isProcessing}
        />
        
        <Button
          title="Process Stream (30 frames)"
          onPress={processStream}
          disabled={!isInitialized || isProcessing}
        />
        
        <Button
          title="Performance Modes"
          onPress={() => {
            Alert.alert(
              'Performance Modes',
              'Select performance mode:',
              [
                { text: 'Quality', onPress: () => changePerformanceMode(PerformanceModes.QUALITY) },
                { text: 'Balanced', onPress: () => changePerformanceMode(PerformanceModes.BALANCED) },
                { text: 'Performance', onPress: () => changePerformanceMode(PerformanceModes.PERFORMANCE) },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }}
          disabled={!isInitialized || isProcessing}
        />
        
        <Button
          title="Get Statistics"
          onPress={getStatistics}
          disabled={!isInitialized || isProcessing}
        />
        
        <Button
          title="Shutdown"
          onPress={shutdown}
          disabled={!isInitialized || isProcessing}
          color="#FF3B30"
        />
      </View>

      {processedImage && (
        <View style={styles.imageContainer}>
          <Text style={styles.imageTitle}>Processed Frame:</Text>
          <Image
            source={{ uri: processedImage }}
            style={styles.processedImage}
            resizeMode="contain"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 10,
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 10,
  },
  imageContainer: {
    marginTop: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  processedImage: {
    width: '100%',
    height: 200,
    borderRadius: 5,
  },
});

export default KronopExample;
