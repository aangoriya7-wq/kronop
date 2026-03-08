import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import SongUpload from '../../components/upload/SongUpload';

interface BridgeSongsProps {
  onClose: () => void;
}

const BridgeSongs: React.FC<BridgeSongsProps> = ({ onClose }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // KRONOP BRIDGE CONTROLLER - Audio Streaming Upload
  const handleSongsUpload = async (files: any[], metadata: any) => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Bridge controls audio streaming upload
      const result = await uploadSongsWithBridgeControl(files, metadata, (progress) => {
        setUploadProgress(progress.percentage);
      });
      
      Alert.alert('Success', 'Songs uploaded successfully to Kronop!');
      onClose();
    } catch (error: any) {
      console.error('Bridge Songs Upload Failed:', error);
      Alert.alert('Upload Failed', error.message || 'Bridge songs upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // BRIDGE AUDIO STREAMING UPLOAD SYSTEM
  const uploadSongsWithBridgeControl = async (files: any[], metadata: any, onProgress?: (progress: any) => void) => {
    const BUNNY_API_KEY = process.env.EXPO_PUBLIC_BUNNY_API_KEY || '';
    const BUNNY_STORAGE_ZONE = process.env.EXPO_PUBLIC_BUNNY_STORAGE_ZONE || 'kronop';
    
    const uploadResults = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const fileProgress = ((i + 1) / files.length) * 100;
        if (onProgress) onProgress({ percentage: Math.round(fileProgress) });
        
        // Bridge decides: large files (>10MB) use chunking
        if (file.size > 10 * 1024 * 1024) {
          const chunkResult = await uploadAudioInChunks(file, metadata, i);
          uploadResults.push(chunkResult);
        } else {
          // Direct upload for smaller files
          const fileName = `kronop_audio_bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop() || 'mp3'}`;
          const bunnyUrl = `https://storage.bunnycdn.net/${BUNNY_STORAGE_ZONE}/${fileName}`;
          
          const response = await fetch(bunnyUrl, {
            method: 'PUT',
            headers: {
              'AccessKey': BUNNY_API_KEY,
              'Content-Type': file.mimeType || 'audio/mpeg'
            },
            body: file
          });
          
          if (!response.ok) {
            throw new Error(`BunnyCDN upload failed: ${response.status}`);
          }
          
          const result = {
            url: `https://${BUNNY_STORAGE_ZONE}.b-cdn.net/${fileName}`,
            id: fileName,
            metadata: {
              ...metadata,
              userId: 'guest_user',
              uploadId: `audio_bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              appName: 'Kronop',
              timestamp: Date.now(),
              fileName,
              duration: 180,
              bitrate: 128,
              streamingUrl: `https://${BUNNY_STORAGE_ZONE}.b-cdn.net/${fileName}`,
              bridgeControlled: true
            },
            success: true
          };
          
          uploadResults.push(result);
        }
        
        console.log(`Bridge Audio ${i + 1}/${files.length} uploaded successfully`);
        
      } catch (error: any) {
        console.error(`Bridge Audio ${i + 1} upload failed:`, error);
        uploadResults.push({
          success: false,
          error: error.message,
          file: file.name
        });
      }
    }
    
    const failedUploads = uploadResults.filter(r => !r.success);
    if (failedUploads.length > 0) {
      throw new Error(`${failedUploads.length} songs failed to upload`);
    }
    
    console.log('Bridge Audio Upload Completed:', uploadResults);
    return uploadResults;
  };

  // Bridge chunk upload for large audio files
  const uploadAudioInChunks = async (file: any, metadata: any, index: number) => {
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
    const BUNNY_API_KEY = process.env.EXPO_PUBLIC_BUNNY_API_KEY || '';
    const BUNNY_STORAGE_ZONE = process.env.EXPO_PUBLIC_BUNNY_STORAGE_ZONE || 'kronop';
    
    const response = await fetch(file.uri);
    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer]);
    
    const chunks: Blob[] = [];
    let start = 0;
    while (start < blob.size) {
      const end = Math.min(start + CHUNK_SIZE, blob.size);
      chunks.push(blob.slice(start, end));
      start = end;
    }
    
    const uploadId = `audio_chunk_bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let uploadedUrl = '';
    
    for (let i = 0; i < chunks.length; i++) {
      const fileName = `kronop_audio_chunk_${uploadId}_${i}.bin`;
      const bunnyUrl = `https://storage.bunnycdn.net/${BUNNY_STORAGE_ZONE}/${fileName}`;
      
      const chunkResponse = await fetch(bunnyUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': BUNNY_API_KEY,
          'Content-Type': 'application/octet-stream'
        },
        body: chunks[i]
      });
      
      if (!chunkResponse.ok) {
        throw new Error(`Bridge audio chunk upload failed: ${chunkResponse.status}`);
      }
      
      if (i === 0) {
        uploadedUrl = `https://${BUNNY_STORAGE_ZONE}.b-cdn.net/${fileName}`;
      }
    }
    
    return {
      url: uploadedUrl,
      id: uploadId,
      metadata: {
        ...metadata,
        userId: 'guest_user',
        uploadId,
        appName: 'Kronop',
        timestamp: Date.now(),
        totalChunks: chunks.length,
        bridgeControlled: true,
        chunked: true
      },
      success: true
    };
  };

  return (
    <View style={styles.container}>
      <SongUpload 
        onClose={onClose} 
        onUpload={handleSongsUpload}
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

export default BridgeSongs;
