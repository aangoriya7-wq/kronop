import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import StoryUpload from '../../components/upload/StoryUpload';

interface BridgeStoryProps {
  onClose: () => void;
}

const BridgeStory: React.FC<BridgeStoryProps> = ({ onClose }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // KRONOP BRIDGE CONTROLLER - Story Direct Upload
  const handleStoryUpload = async (file: any, metadata: any) => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Bridge controls story direct upload
      const result = await uploadStoryWithBridgeControl(file, metadata, (progress) => {
        setUploadProgress(progress.percentage);
      });
      
      Alert.alert('Success', 'Story uploaded successfully to Kronop!');
      onClose();
    } catch (error: any) {
      console.error('Bridge Story Upload Failed:', error);
      Alert.alert('Upload Failed', error.message || 'Bridge story upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // BRIDGE STORY DIRECT UPLOAD SYSTEM
  const uploadStoryWithBridgeControl = async (file: any, metadata: any, onProgress?: (progress: any) => void) => {
    const BUNNY_API_KEY = process.env.EXPO_PUBLIC_BUNNY_API_KEY || '';
    const BUNNY_STORAGE_ZONE = process.env.EXPO_PUBLIC_BUNNY_STORAGE_ZONE || 'kronop';
    
    try {
      // Bridge uploads directly to BunnyCDN
      const fileName = `kronop_story_bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop() || 'jpg'}`;
      const bunnyUrl = `https://storage.bunnycdn.net/${BUNNY_STORAGE_ZONE}/${fileName}`;
      
      if (onProgress) onProgress({ percentage: 50 });
      
      const response = await fetch(bunnyUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': BUNNY_API_KEY,
          'Content-Type': file.mimeType || 'image/jpeg'
        },
        body: file
      });
      
      if (!response.ok) {
        throw new Error(`BunnyCDN upload failed: ${response.status}`);
      }
      
      if (onProgress) onProgress({ percentage: 100 });
      
      // Bridge saves story metadata
      const storyMetadata = {
        ...metadata,
        userId: 'guest_user',
        uploadId: `story_bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: `https://${BUNNY_STORAGE_ZONE}.b-cdn.net/${fileName}`,
        appName: 'Kronop',
        timestamp: Date.now(),
        fileName,
        bridgeControlled: true
      };
      
      console.log('Bridge Story Upload Completed:', storyMetadata);
      return storyMetadata;
      
    } catch (error: any) {
      console.error('Bridge Story upload failed:', error);
      throw error;
    }
  };

  return (
    <View style={styles.container}>
      <StoryUpload 
        onClose={onClose} 
        onUpload={handleStoryUpload}
        uploading={uploading}
        uploadProgress={uploadProgress}
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

export default BridgeStory;
