import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface LiveData {
  title: string;
  category: string;
  audienceType: string;
}

interface LiveUploadProps {
  onClose: () => void;
  onUpload?: (metadata: any) => Promise<void>;
  uploading?: boolean;
  uploadProgress?: number;
  streamStatus?: {
    isLive: boolean;
    viewerCount: number;
    connectionStrength: 'strong' | 'medium' | 'weak' | 'disconnected';
    streamKey: string;
    serverUrl: string;
    startTime?: number;
    duration?: number;
  };
  chatMessages?: Array<{
    id: string;
    userId: string;
    username: string;
    message: string;
    timestamp: number;
  }>;
  onEndStream?: () => void;
}

export default function LiveUpload({ 
  onClose, 
  onUpload, 
  uploading = false, 
  uploadProgress = 0,
  streamStatus,
  chatMessages = [],
  onEndStream
}: LiveUploadProps) {
  const router = useRouter();
  const [liveData, setLiveData] = useState<LiveData>({
    title: '',
    category: '',
    audienceType: ''
  });
  const [isSetup, setIsSetup] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const categories = [
    'Gaming', 'Music', 'Talk Show', 'Education', 'Entertainment',
    'Sports', 'News', 'Cooking', 'Travel', 'Lifestyle', 'Other'
  ];

  const startLiveStream = async () => {
    if (!liveData.title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your live stream');
      return;
    }

    if (!liveData.category.trim()) {
      Alert.alert('Missing Category', 'Please select a category for your live stream');
      return;
    }

    if (!liveData.audienceType.trim()) {
      Alert.alert('Missing Audience', 'Please select audience type for your live stream');
      return;
    }

    // UI Component - Delegate to Bridge Controller
    if (onUpload) {
      // Bridge controls the live stream
      await onUpload(liveData);
    } else {
      // Fallback for standalone usage
      try {
        setIsLive(true);
        const liveStreamConfig = await initializeLiveStreamWithSocket(liveData);
        Alert.alert('Live Started!', `Your live stream "${liveData.title}" has started successfully!\nRTMP: ${liveStreamConfig.rtmpUrl}`);
        console.log('Live Stream Started:', liveStreamConfig);
      } catch (error: any) {
        console.error('Failed to start live stream:', error);
        Alert.alert('Error', error.message || 'Failed to start live stream');
        setIsLive(false);
      }
    }
  };

  const endLiveStream = async () => {
    try {
      setIsLive(false);
      
      // End live stream and save recording
      await endLiveStreamWithSocket();
      
      Alert.alert('Live Ended', 'Your live stream has ended successfully and is being processed.');
      
      // Reset form
      setLiveData({ title: '', category: '', audienceType: '' });
      setIsSetup(true);
      
      onClose();
      router.replace('/');
      
    } catch (error: any) {
      console.error('Failed to end live stream:', error);
      Alert.alert('Error', error.message || 'Failed to end live stream');
    }
  };

  // Real-time Socket Live Stream Initialization
  const initializeLiveStreamWithSocket = async (metadata: any) => {
    const BUNNY_API_KEY = process.env.EXPO_PUBLIC_BUNNY_API_KEY || '';
    const BUNNY_STORAGE_ZONE = process.env.EXPO_PUBLIC_BUNNY_STORAGE_ZONE || 'kronop';
    
    try {
      // Generate unique stream ID
      const streamId = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create live stream configuration
      const liveConfig = {
        streamId,
        userId: 'guest_user',
        title: metadata.title,
        category: metadata.category,
        audienceType: metadata.audienceType,
        startTime: Date.now(),
        rtmpUrl: `rtmp://live.bunnycdn.com/kronop/${streamId}`,
        playbackUrl: `https://live.bunnycdn.com/kronop/${streamId}.m3u8`,
        thumbnailUrl: `https://live.bunnycdn.com/kronop/${streamId}/thumbnail.jpg`,
        appName: 'Kronop',
        isActive: true,
        viewerCount: 0,
        chatEnabled: true,
        recordingEnabled: true
      };
      
      // Save live stream metadata to database (mock implementation)
      const streamMetadata = {
        ...liveConfig,
        uploadId: streamId,
        timestamp: Date.now(),
        endpoint: 'kronop'
      };
      
      // Initialize WebSocket connection for real-time updates
      await initializeWebSocketConnection(streamId, liveConfig);
      
      console.log('Live stream initialized:', liveConfig);
      return liveConfig;
      
    } catch (error: any) {
      console.error('Live stream initialization failed:', error);
      throw error;
    }
  };

  // Initialize WebSocket for real-time features
  const initializeWebSocketConnection = async (streamId: string, config: any) => {
    try {
      // Mock WebSocket initialization (in production, connect to actual WebSocket server)
      console.log(`WebSocket connected for stream: ${streamId}`);
      
      // Mock real-time events
      const mockWebSocket = {
        on: (event: string, callback: Function) => {
          console.log(`WebSocket event listener registered: ${event}`);
          
          if (event === 'viewer-join') {
            // Simulate viewer joining
            setTimeout(() => callback({ viewerId: 'user123', count: 1 }), 2000);
          }
          
          if (event === 'viewer-leave') {
            // Simulate viewer leaving
            setTimeout(() => callback({ viewerId: 'user123', count: 0 }), 10000);
          }
          
          if (event === 'chat-message') {
            // Simulate chat messages
            setTimeout(() => callback({
              userId: 'viewer1',
              username: 'User1',
              message: 'Great stream!',
              timestamp: Date.now()
            }), 3000);
          }
        },
        
        emit: (event: string, data: any) => {
          console.log(`WebSocket emit: ${event}`, data);
        },
        
        disconnect: () => {
          console.log('WebSocket disconnected');
        }
      };
      
      // Store WebSocket reference for cleanup
      (global as any).currentWebSocket = mockWebSocket;
      
      return mockWebSocket;
      
    } catch (error: any) {
      console.error('WebSocket connection failed:', error);
      throw error;
    }
  };

  // End live stream and save recording
  const endLiveStreamWithSocket = async () => {
    try {
      const streamId = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Disconnect WebSocket
      if ((global as any).currentWebSocket) {
        (global as any).currentWebSocket.disconnect();
        delete (global as any).currentWebSocket;
      }
      
      // Save stream recording and metadata
      const recordingData = {
        streamId,
        endTime: Date.now(),
        duration: 1800, // Mock 30 minutes
        maxViewers: 45, // Mock viewer count
        totalViews: 125,
        recordingUrl: `https://${process.env.EXPO_PUBLIC_BUNNY_STORAGE_ZONE || 'kronop'}.b-cdn.net/recordings/${streamId}.mp4`,
        thumbnailUrl: `https://${process.env.EXPO_PUBLIC_BUNNY_STORAGE_ZONE || 'kronop'}.b-cdn.net/thumbnails/${streamId}.jpg`,
        userId: 'guest_user',
        appName: 'Kronop',
        processed: false
      };
      
      console.log('Live stream ended and saved:', recordingData);
      return recordingData;
      
    } catch (error: any) {
      console.error('Failed to end live stream:', error);
      throw error;
    }
  };

    if (isSetup) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <View style={styles.placeholder} />
          <View style={styles.placeholder} />
        </View>

        <View style={styles.setupArea}>
          <Text style={styles.setupTitle}>Setup Your Live Stream</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stream Title *</Text>
            <TextInput
              style={styles.input}
              value={liveData.title}
              onChangeText={(text) => setLiveData(prev => ({ ...prev, title: text }))}
              placeholder="Enter your live stream title..."
              placeholderTextColor="#666"
              maxLength={100}
            />
            <Text style={styles.charCount}>{liveData.title.length}/100</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    liveData.category === category && styles.categoryChipSelected
                  ]}
                  onPress={() => setLiveData(prev => ({ ...prev, category }))}
                >
                  <Text style={[
                    styles.categoryChipText,
                    liveData.category === category && styles.categoryChipTextSelected
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.audienceSection}>
            <Text style={styles.label}>Who can join? *</Text>
            <View style={styles.audienceButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.audienceButton,
                  liveData.audienceType === 'invite' && styles.audienceButtonSelected
                ]}
                onPress={() => setLiveData(prev => ({ ...prev, audienceType: 'invite' }))}
              >
                <MaterialIcons name="person-add" size={24} color="#6A5ACD" />
                <Text style={styles.audienceButtonText}>Invite</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.audienceButton,
                  liveData.audienceType === 'friends' && styles.audienceButtonSelected
                ]}
                onPress={() => setLiveData(prev => ({ ...prev, audienceType: 'friends' }))}
              >
                <MaterialIcons name="people" size={24} color="#6A5ACD" />
                <Text style={styles.audienceButtonText}>Friends</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.audienceButton,
                  liveData.audienceType === 'country' && styles.audienceButtonSelected
                ]}
                onPress={() => setLiveData(prev => ({ ...prev, audienceType: 'country' }))}
              >
                <MaterialIcons name="public" size={24} color="#6A5ACD" />
                <Text style={styles.audienceButtonText}>Country</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[
              styles.goLiveButton,
              (!liveData.title.trim() || !liveData.category.trim() || !liveData.audienceType.trim()) && styles.goLiveButtonDisabled
            ]}
            onPress={startLiveStream}
          >
            <MaterialIcons name="live-tv" size={24} color="#fff" />
            <Text style={styles.goLiveButtonText}>Go Live</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Live Streaming View
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <View style={styles.placeholder} />
        <View style={styles.placeholder} />
      </View>

      <View style={styles.liveArea}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        
        <View style={styles.streamInfo}>
          <Text style={styles.streamTitle}>{liveData.title}</Text>
          <Text style={styles.streamCategory}>{liveData.category}</Text>
          <Text style={styles.streamAudience}>
            {liveData.audienceType === 'invite' && 'Invite Only'}
            {liveData.audienceType === 'friends' && 'Friends Only'}
            {liveData.audienceType === 'country' && 'Public'}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.endButton}
          onPress={endLiveStream}
        >
          <Text style={styles.endButtonText}>END STREAM</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  placeholder: {
    width: 34,
  },
  setupArea: {
    padding: 20,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  charCount: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'right',
    marginTop: 4,
  },
  categoryScroll: {
    marginTop: 10,
  },
  categoryChip: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#6A5ACD',
    borderColor: '#6A5ACD',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  audienceSection: {
    marginBottom: 30,
  },
  audienceButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  audienceButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333333',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  audienceButtonSelected: {
    borderColor: '#6A5ACD',
    backgroundColor: 'rgba(106, 90, 205, 0.1)',
  },
  audienceButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
  },
  goLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6A5ACD',
    marginHorizontal: 20,
    marginBottom: 30,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  goLiveButtonDisabled: {
    backgroundColor: '#444444',
  },
  goLiveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  liveArea: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  liveIndicator: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0000',
    marginRight: 6,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  streamInfo: {
    marginTop: 100,
    alignItems: 'center',
  },
  streamTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  streamCategory: {
    fontSize: 16,
    color: '#6A5ACD',
    marginBottom: 4,
  },
  streamAudience: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  endButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 40,
  },
  endButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
