import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ReelsUpload from '../upload/ReelsUpload.tsx';
import { theme } from '../../constants/theme';

interface BridgeReelsProps {
  onClose: () => void;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  content: {
    flex: 1,
  },
});

export default function BridgeReels({ onClose }: BridgeReelsProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async (fileUri: string, metadata: any) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Create FormData for the upload
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: metadata.type || 'video/mp4',
        name: metadata.name || 'reel.mp4',
      } as any);
      
      formData.append('title', metadata.title);
      formData.append('description', metadata.description || '');
      formData.append('category', metadata.category);
      formData.append('tags', JSON.stringify(metadata.tags || []));
      formData.append('contentType', metadata.contentType || 'reel');
      
      if (metadata.coverPhoto) {
        formData.append('coverPhoto', {
          uri: metadata.coverPhoto.uri,
          type: metadata.coverPhoto.type || 'image/jpeg',
          name: metadata.coverPhoto.name || 'cover.jpg',
        } as any);
      }

      // Upload to backend
      const response = await fetch('http://localhost:3000/api/reels/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const result = await response.json();
        Alert.alert('Success', 'Reel uploaded successfully!');
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        const error = await response.json();
        Alert.alert('Upload Failed', error.message || 'Failed to upload reel');
      }
    } catch (error: any) {
      console.error('Reel upload error:', error);
      Alert.alert('Upload Error', error.message || 'Failed to upload reel');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Reel</Text>
        <View style={styles.closeButton} />
      </View>
      
      <View style={styles.content}>
        <ReelsUpload
          onClose={onClose}
          onUpload={handleUpload}
          uploading={uploading}
          uploadProgress={uploadProgress}
        />
      </View>
    </View>
  );
}
