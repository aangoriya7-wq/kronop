import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system';
import ReelsUpload from '../../components/upload/ReelsUpload';

interface BridgeReelsProps {
  onClose: () => void;
}

const BridgeReels: React.FC<BridgeReelsProps> = ({ onClose }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // KRONOP BRIDGE CONTROLLER - Memory Optimized Reels Upload
  const handleReelUpload = async (fileUri: string, metadata: any) => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Bridge controls memory-optimized upload
      const result = await uploadReelsWithMemoryOptimization(fileUri, metadata, (progress) => {
        setUploadProgress(progress.percentage);
      });
      
      Alert.alert('Success', 'Reels uploaded successfully to Kronop!');
      onClose();
    } catch (error: any) {
      console.error('Bridge Reels Upload Failed:', error);
      Alert.alert('Upload Failed', error.message || 'Bridge reels upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // MEMORY OPTIMIZED BRIDGE REELS UPLOAD SYSTEM
  const uploadReelsWithMemoryOptimization = async (fileUri: string, metadata: any, onProgress?: (progress: any) => void) => {
    const BUNNY_API_KEY = process.env.EXPO_PUBLIC_BUNNY_API_KEY || '';
    const BUNNY_STORAGE_ZONE = process.env.EXPO_PUBLIC_BUNNY_STORAGE_ZONE || 'kronop';
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
    
    try {
      // Get file info without loading full file
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('Reels file not found');
      }
      
      const fileSize = fileInfo.size;
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
      const uploadId = `reels_bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`Bridge Reels Upload: ${fileSize} bytes in ${totalChunks} chunks`);
      
      // Generate unique filename
      const fileExtension = fileUri.split('.').pop() || 'mp4';
      const fileName = `kronop_reels_bridge_${uploadId}.${fileExtension}`;
      const bunnyUrl = `https://storage.bunnycdn.net/${BUNNY_STORAGE_ZONE}/${fileName}`;
      
      // Initialize upload (0% progress)
      if (onProgress) onProgress({ percentage: 0, status: 'Initializing reels upload...' });
      
      // Process chunks one by one to avoid memory issues
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const startByte = chunkIndex * CHUNK_SIZE;
        const endByte = Math.min(startByte + CHUNK_SIZE, fileSize);
        const chunkSize = endByte - startByte;
        
        try {
          // Read only this chunk (2MB max)
          let chunkData = await FileSystem.readAsStringAsync(fileUri, {
            position: startByte,
            length: chunkSize,
            encoding: 'base64'
          });
          
          // Convert base64 to blob for upload
          let blob = await fetch(`data:application/octet-stream;base64,${chunkData}`).then(r => r.blob());
          
          // Upload this chunk
          const chunkFileName = `${fileName}_chunk_${chunkIndex}`;
          const chunkUrl = `https://storage.bunnycdn.net/${BUNNY_STORAGE_ZONE}/${chunkFileName}`;
          
          const response = await fetch(chunkUrl, {
            method: 'PUT',
            headers: {
              'AccessKey': BUNNY_API_KEY,
              'Content-Type': 'application/octet-stream',
              'Content-Length': blob.size.toString()
            },
            body: blob
          });
          
          if (!response.ok) {
            throw new Error(`Reels chunk ${chunkIndex} upload failed: ${response.status}`);
          }
          
          // Update progress
          const progressPercentage = Math.round(((chunkIndex + 1) / totalChunks) * 100);
          if (onProgress) {
            onProgress({ 
              percentage: progressPercentage, 
              status: `Uploaded reels chunk ${chunkIndex + 1}/${totalChunks}`,
              chunkIndex,
              totalChunks
            });
          }
          
          // CRITICAL: Free memory immediately
          (blob as any) = undefined;
          (chunkData as any) = undefined;
          
          // Force garbage collection hint
          if (global.gc) {
            global.gc();
          }
          
          console.log(`Bridge Reels Chunk ${chunkIndex + 1}/${totalChunks} uploaded (${progressPercentage}%)`);
          
        } catch (chunkError: any) {
          console.error(`Bridge Reels Chunk ${chunkIndex} failed:`, chunkError);
          throw new Error(`Reels chunk ${chunkIndex} upload failed: ${chunkError.message}`);
        }
      }
      
      // Final assembly - create manifest
      const manifestData = {
        uploadId,
        fileName,
        totalChunks,
        fileSize,
        metadata: {
          ...metadata,
          userId: 'guest_user',
          appName: 'Kronop',
          timestamp: Date.now(),
          bridgeControlled: true,
          memoryOptimized: true,
          contentType: 'reels'
        },
        assembledAt: Date.now()
      };
      
      // Upload manifest
      const manifestUrl = `https://storage.bunnycdn.net/${BUNNY_STORAGE_ZONE}/${fileName}_manifest.json`;
      const manifestResponse = await fetch(manifestUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': BUNNY_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(manifestData)
      });
      
      if (!manifestResponse.ok) {
        throw new Error(`Reels manifest upload failed: ${manifestResponse.status}`);
      }
      
      const finalResult = {
        url: `https://${BUNNY_STORAGE_ZONE}.b-cdn.net/${fileName}`,
        id: uploadId,
        fileName,
        metadata: manifestData.metadata,
        totalChunks,
        fileSize,
        bridgeControlled: true,
        memoryOptimized: true,
        contentType: 'reels'
      };
      
      console.log('Bridge Reels Upload Completed:', finalResult);
      return finalResult;
      
    } catch (error: any) {
      console.error('Bridge Reels Upload Failed:', error);
      throw error;
    }
  };

  return (
    <View style={styles.container}>
      <ReelsUpload 
        onClose={onClose} 
        onUpload={handleReelUpload}
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

export default BridgeReels;
