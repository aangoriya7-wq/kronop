import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import LiveUpload from '../../components/upload/LiveUpload';

interface BridgeLiveProps {
  onClose: () => void;
}

interface StreamStatus {
  isLive: boolean;
  viewerCount: number;
  connectionStrength: 'strong' | 'medium' | 'weak' | 'disconnected';
  streamKey: string;
  serverUrl: string;
  startTime?: number;
  duration?: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
}

const BridgeLive: React.FC<BridgeLiveProps> = ({ onClose }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>({
    isLive: false,
    viewerCount: 0,
    connectionStrength: 'disconnected',
    streamKey: '',
    serverUrl: ''
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [socket, setSocket] = useState<any>(null);
  const statusIntervalRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // KRONOP BRIDGE CONTROLLER - Live Stream Management
  const handleLiveStream = async (metadata: any) => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Bridge controls live stream initialization
      const result = await initializeLiveStreamWithBridge(metadata, (progress) => {
        setUploadProgress(progress.percentage);
      });
      
      // Set stream status
      setStreamStatus({
        isLive: true,
        viewerCount: 0,
        connectionStrength: 'strong',
        streamKey: result.streamKey,
        serverUrl: result.serverUrl,
        startTime: Date.now(),
        duration: 0
      });
      
      // Initialize socket connection
      await initializeSocketConnection(result.streamId);
      
      // Start status monitoring
      startStreamStatusMonitoring(result.streamId);
      
      Alert.alert('Live Started!', `Your live stream "${metadata.title}" has started!\nRTMP: ${result.rtmpUrl}\nStream Key: ${result.streamKey}`);
      
    } catch (error: any) {
      console.error('Bridge Live Stream Failed:', error);
      Alert.alert('Stream Failed', error.message || 'Bridge live stream failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // BRIDGE LIVE STREAM INITIALIZATION
  const initializeLiveStreamWithBridge = async (metadata: any, onProgress?: (progress: any) => void) => {
    const BUNNY_API_KEY = process.env.EXPO_PUBLIC_BUNNY_API_KEY || '';
    const BUNNY_STORAGE_ZONE = process.env.EXPO_PUBLIC_BUNNY_STORAGE_ZONE || 'kronop';
    
    try {
      // Generate unique stream ID and keys
      const streamId = `live_bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const streamKey = `sk_${Math.random().toString(36).substr(2, 16)}`;
      const serverUrl = `rtmp://live.bunnycdn.com/kronop`;
      const rtmpUrl = `${serverUrl}/${streamKey}`;
      
      if (onProgress) onProgress({ percentage: 25 });
      
      // Create live stream configuration
      const liveConfig = {
        streamId,
        streamKey,
        serverUrl,
        rtmpUrl,
        playbackUrl: `https://live.bunnycdn.com/kronop/${streamKey}.m3u8`,
        thumbnailUrl: `https://live.bunnycdn.com/kronop/${streamKey}/thumbnail.jpg`,
        userId: 'guest_user',
        title: metadata.title,
        category: metadata.category,
        audienceType: metadata.audienceType,
        startTime: Date.now(),
        appName: 'Kronop',
        isActive: true,
        chatEnabled: true,
        recordingEnabled: true,
        bridgeControlled: true
      };
      
      if (onProgress) onProgress({ percentage: 50 });
      
      // Save stream configuration to BunnyCDN
      const configUrl = `https://storage.bunnycdn.net/${BUNNY_STORAGE_ZONE}/live_streams/${streamId}_config.json`;
      const configResponse = await fetch(configUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': BUNNY_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(liveConfig)
      });
      
      if (!configResponse.ok) {
        throw new Error(`Stream config upload failed: ${configResponse.status}`);
      }
      
      if (onProgress) onProgress({ percentage: 75 });
      
      // Initialize stream on BunnyCDN
      await initializeBunnyStream(streamKey, metadata);
      
      if (onProgress) onProgress({ percentage: 100 });
      
      console.log('Bridge Live Stream Initialized:', liveConfig);
      return {
        ...liveConfig,
        streamKey,
        serverUrl,
        rtmpUrl
      };
      
    } catch (error: any) {
      console.error('Bridge Live stream initialization failed:', error);
      throw error;
    }
  };

  // Initialize BunnyCDN Stream
  const initializeBunnyStream = async (streamKey: string, metadata: any) => {
    // Mock BunnyCDN stream initialization
    // In real implementation, this would call BunnyCDN API
    console.log(`Initializing BunnyCDN stream with key: ${streamKey}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      streamKey,
      status: 'ready'
    };
  };

  // BRIDGE SOCKET CONNECTION
  const initializeSocketConnection = async (streamId: string) => {
    try {
      // Create WebSocket connection for real-time features
      const wsUrl = `wss://api.kronop.app/live/${streamId}`;
      const mockSocket = createMockWebSocket(streamId);
      
      setSocket(mockSocket);
      
      // Setup socket event handlers
      mockSocket.on('viewer-join', (data: any) => {
        setStreamStatus(prev => ({
          ...prev,
          viewerCount: prev.viewerCount + 1
        }));
        
        // Add system message
        const systemMessage: ChatMessage = {
          id: `system_${Date.now()}`,
          userId: 'system',
          username: 'System',
          message: `${data.username || 'Viewer'} joined the stream`,
          timestamp: Date.now()
        };
        setChatMessages(prev => [...prev, systemMessage]);
      });
      
      mockSocket.on('viewer-leave', (data: any) => {
        setStreamStatus(prev => ({
          ...prev,
          viewerCount: Math.max(0, prev.viewerCount - 1)
        }));
        
        // Add system message
        const systemMessage: ChatMessage = {
          id: `system_${Date.now()}`,
          userId: 'system',
          username: 'System',
          message: `${data.username || 'Viewer'} left the stream`,
          timestamp: Date.now()
        };
        setChatMessages(prev => [...prev, systemMessage]);
      });
      
      mockSocket.on('chat-message', (message: ChatMessage) => {
        setChatMessages(prev => [...prev, message]);
      });
      
      mockSocket.on('connection-status', (status: any) => {
        setStreamStatus(prev => ({
          ...prev,
          connectionStrength: status.strength
        }));
      });
      
      console.log(`Bridge Socket connected for stream: ${streamId}`);
      
    } catch (error: any) {
      console.error('Bridge Socket connection failed:', error);
      throw error;
    }
  };

  // Create Mock WebSocket (for development)
  const createMockWebSocket = (streamId: string) => {
    const listeners: { [key: string]: Function[] } = {};
    
    // Simulate viewer activity
    setTimeout(() => {
      emit('viewer-join', { username: 'User1', userId: 'user123' });
    }, 2000);
    
    setTimeout(() => {
      emit('chat-message', {
        id: 'msg1',
        userId: 'user123',
        username: 'User1',
        message: 'Great stream!',
        timestamp: Date.now()
      });
    }, 3000);
    
    setTimeout(() => {
      emit('connection-status', { strength: 'strong' });
    }, 1000);
    
    const emit = (event: string, data: any) => {
      if (listeners[event]) {
        listeners[event].forEach(callback => callback(data));
      }
    };
    
    return {
      on: (event: string, callback: Function) => {
        if (!listeners[event]) {
          listeners[event] = [];
        }
        listeners[event].push(callback);
      },
      
      emit: (event: string, data: any) => {
        emit(event, data);
      },
      
      disconnect: () => {
        console.log('Bridge WebSocket disconnected');
        Object.keys(listeners).forEach(event => {
          listeners[event] = [];
        });
      }
    };
  };

  // STREAM STATUS MONITORING
  const startStreamStatusMonitoring = (streamId: string) => {
    statusIntervalRef.current = setInterval(() => {
      updateStreamStatus(streamId);
    }, 5000); // Check every 5 seconds
  };

  const updateStreamStatus = async (streamId: string) => {
    try {
      // Mock stream status check
      const mockStatus = {
        isLive: true,
        viewerCount: Math.floor(Math.random() * 100) + 1,
        connectionStrength: ['strong', 'medium', 'weak'][Math.floor(Math.random() * 3)] as 'strong' | 'medium' | 'weak',
        duration: Date.now() - (streamStatus.startTime || Date.now())
      };
      
      setStreamStatus(prev => ({
        ...prev,
        ...mockStatus,
        duration: mockStatus.duration
      }));
      
    } catch (error) {
      console.error('Stream status update failed:', error);
      setStreamStatus(prev => ({
        ...prev,
        connectionStrength: 'weak'
      }));
    }
  };

  // END STREAM
  const endLiveStream = async () => {
    try {
      // Clear monitoring
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
      
      // Disconnect socket
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      
      // Update status
      setStreamStatus(prev => ({
        ...prev,
        isLive: false,
        connectionStrength: 'disconnected'
      }));
      
      // Save stream recording info
      await saveStreamRecording();
      
      Alert.alert('Stream Ended', 'Your live stream has been ended successfully!');
      
    } catch (error: any) {
      console.error('Failed to end stream:', error);
      Alert.alert('Error', 'Failed to end stream properly');
    }
  };

  const saveStreamRecording = async () => {
    // Mock saving stream recording
    console.log('Saving stream recording...');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return (
    <View style={styles.container}>
      <LiveUpload 
        onClose={onClose} 
        onUpload={handleLiveStream}
        uploading={uploading}
        uploadProgress={uploadProgress}
        streamStatus={streamStatus}
        chatMessages={chatMessages}
        onEndStream={endLiveStream}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default BridgeLive;
