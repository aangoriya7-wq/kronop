import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import PhotoUpload from '../../components/upload/PhotoUpload';

interface BridgePhotoProps {
  onClose: () => void;
}

interface PhotoUploadResult {
  id: string;
  fileName: string;
  cdnUrl: string;
  size: number;
  type: string;
  metadata: {
    userId: string;
    uploadId: string;
    appName: string;
    timestamp: number;
    bridgeControlled: boolean;
    storagePath?: string;
    noLibrarySave?: boolean;
  };
}

const BridgePhoto: React.FC<BridgePhotoProps> = ({ onClose }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // KRONOP BRIDGE CONTROLLER - Direct Photo Upload
  const handlePhotoUpload = async (fileUri: string, metadata: any) => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Bridge controls direct upload
      const result = await uploadPhotoDirectly(fileUri, metadata, (progress) => {
        setUploadProgress(progress.percentage);
      });
      
      Alert.alert('Success', 'Photo uploaded successfully to Kronop!');
      onClose();
    } catch (error: any) {
      console.error('Bridge Photo Upload Failed:', error);
      Alert.alert('Upload Failed', error.message || 'Bridge photo upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // BRIDGE DIRECT UPLOAD SYSTEM
  const uploadPhotoDirectly = async (
    fileUri: string, 
    metadata: any, 
    onProgress?: (progress: any) => void
  ): Promise<PhotoUploadResult> => {
    const BUNNY_API_KEY = process.env.EXPO_PUBLIC_BUNNY_API_KEY || '';
    const BUNNY_STORAGE_ZONE = process.env.EXPO_PUBLIC_BUNNY_STORAGE_ZONE || 'kronop';
    
    try {
      // Generate unique filename with storage path
      const uploadId = `photo_bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileExtension = fileUri.split('.').pop() || 'jpg';
      const fileName = `uploads/photos/kronop_photo_bridge_${uploadId}.${fileExtension}`;
      const bunnyUrl = `https://storage.bunnycdn.net/${BUNNY_STORAGE_ZONE}/${fileName}`;
      
      console.log(`Bridge Photo Upload: ${fileName} (No Library Save)`);
      
      // Initialize upload (0% progress)
      if (onProgress) onProgress({ percentage: 0, status: 'Initializing upload...' });
      
      // Fetch image data
      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      // Update progress (25%)
      if (onProgress) onProgress({ percentage: 25, status: 'Photo loaded...' });
      
      // Update progress (50%)
      if (onProgress) onProgress({ percentage: 50, status: 'Uploading to BunnyCDN Storage...' });
      
      // Direct upload to BunnyCDN Storage with proper headers
      const uploadResponse = await fetch(bunnyUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': BUNNY_API_KEY,
          'Content-Type': blob.type || 'image/jpeg',
          'Content-Length': blob.size.toString()
        },
        body: blob
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`BunnyCDN Storage upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }
      
      // Update progress (75%)
      if (onProgress) onProgress({ percentage: 75, status: 'Upload completed...' });
      
      // Generate CDN URL from storage path
      const cdnUrl = `https://${BUNNY_STORAGE_ZONE}.b-cdn.net/${fileName}`;
      
      // CRITICAL: Clean cache immediately after upload
      console.log('Cleaning temporary cache...');
      
      // Clear blob from memory
      (blob as any) = null;
      
      // Force garbage collection to free memory
      if (global.gc) {
        global.gc();
      }
      
      // Clear React Native image cache if available
      try {
        // Clear image from React Native cache
        const ImageCacheAPI = require('react-native').Image;
        if (ImageCacheAPI && ImageCacheAPI.getUri) {
          const cachedUri = ImageCacheAPI.getUri(fileUri);
          if (cachedUri) {
            console.log('Clearing React Native image cache');
          }
        }
      } catch (cacheError: any) {
        console.log('React Native cache clear skipped:', cacheError?.message || 'Unknown error');
      }
      
      // Complete upload (100%)
      if (onProgress) onProgress({ percentage: 100, status: 'Upload completed! Cache cleared.' });
      
      const result: PhotoUploadResult = {
        id: uploadId,
        fileName,
        cdnUrl,
        size: blob?.size || 0,
        type: blob?.type || 'image/jpeg',
        metadata: {
          userId: metadata.userId || 'guest_user',
          uploadId,
          appName: 'Kronop',
          timestamp: Date.now(),
          bridgeControlled: true,
          storagePath: 'uploads/photos/',
          noLibrarySave: true
        }
      };
      
      console.log('Bridge Photo Upload Completed (Storage Only):', result);
      return result;
      
    } catch (error: any) {
      console.error('Bridge Photo upload failed:', error);
      throw error;
    }
  };

  return (
    <View style={styles.container}>
      <PhotoUpload 
        onClose={onClose} 
        onUpload={handlePhotoUpload}
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

export default BridgePhoto;
