import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';

interface ReelData {
  title: string;
  category: string;
  tags: string[];
}

interface ReelsUploadProps {
  onClose: () => void;
  onUpload?: (fileUri: string, metadata: any) => Promise<void>;
  uploading?: boolean;
  uploadProgress?: number;
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
  placeholder: {
    width: 34,
  },
  uploadArea: {
    padding: theme.spacing.lg,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: theme.colors.border.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xxl,
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
  },
  uploadButtonSelected: {
    borderColor: theme.colors.primary.main,
    backgroundColor: theme.colors.background.elevated,
  },
  uploadText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  uploadTextSelected: {
    color: theme.colors.primary.main,
  },
  uploadSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
  },
  fileInfo: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.elevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  fileInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  fileInfoLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  fileInfoValue: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  formSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  inputGroup: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.elevated,
  },
  charCount: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
  categoryScroll: {
    marginTop: theme.spacing.sm,
  },
  categoryChip: {
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  categoryChipSelected: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  categoryChipText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
  },
  tagInput: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
  },
  addTagButton: {
    padding: theme.spacing.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  tagText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  uploadButtonMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary.main,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    ...theme.elevation.md,
  },
  uploadButtonDisabled: {
    backgroundColor: theme.colors.border.primary,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

export default function ReelsUpload({ 
  onClose, 
  onUpload, 
  uploading = false, 
  uploadProgress = 0 
}: ReelsUploadProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [reelData, setReelData] = useState<ReelData>({ title: '', category: '', tags: [] });
  const [tagInput, setTagInput] = useState('');

  const categories = [
    'Entertainment', 'Music', 'Dance', 'Comedy', 'Education',
    'Sports', 'Gaming', 'Travel', 'Food', 'Fashion', 'Other'
  ];

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        const fileName = file.name || '';
        const extension = fileName.split('.').pop()?.toLowerCase();
        const allowedExtensions = ['mp4', 'mov', 'avi', 'webm', '3gp', 'mkv'];
        
        if (!extension || !allowedExtensions.includes(extension)) {
          Alert.alert('Invalid File', `Please select a valid video file. Allowed: ${allowedExtensions.join(', ')}`);
          return;
        }

        const MAX_SIZE = 500 * 1024 * 1024;
        if (file.size && file.size > MAX_SIZE) {
          Alert.alert('File Too Large', 'Reel files must be less than 500MB');
          return;
        }

        setSelectedFile(file);
        setReelData(prev => ({ ...prev, title: prev.title || file.name.split('.')[0] }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !reelData.tags.includes(tagInput.trim())) {
      setReelData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setReelData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('No File Selected', 'Please select a video file first');
      return;
    }

    if (!reelData.title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your reel');
      return;
    }

    if (!reelData.category.trim()) {
      Alert.alert('Missing Category', 'Please select a category for your reel');
      return;
    }

    // Bridge Control - Send only URI and metadata
    if (onUpload) {
      await onUpload(selectedFile.uri, {
        ...reelData,
        size: selectedFile.size,
        type: selectedFile.mimeType || 'video/mp4',
        name: selectedFile.name
      });
    }
  };

  // Chunking Upload Function for Reels
  const uploadReelWithChunking = async (file: any, metadata: any, onProgress?: (progress: any) => void) => {
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
    const MAX_RETRIES = 3;
    const BUNNY_API_KEY = process.env.EXPO_PUBLIC_BUNNY_API_KEY || '';
    const BUNNY_STORAGE_ZONE = process.env.EXPO_PUBLIC_BUNNY_STORAGE_ZONE || 'kronop';
    
    // Get file as ArrayBuffer
    const response = await fetch(file.uri);
    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer]);
    
    // Create chunks
    const chunks: Blob[] = [];
    let start = 0;
    while (start < blob.size) {
      const end = Math.min(start + CHUNK_SIZE, blob.size);
      chunks.push(blob.slice(start, end));
      start = end;
    }
    
    const uploadId = `reel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let uploadedUrl = '';
    
    // Upload each chunk to BunnyCDN
    for (let i = 0; i < chunks.length; i++) {
      let retries = 0;
      let success = false;
      
      while (retries < MAX_RETRIES && !success) {
        try {
          const percentage = Math.round(((i + 1) / chunks.length) * 100);
          if (onProgress) onProgress({ percentage, currentChunk: i + 1, totalChunks: chunks.length });
          
          const fileName = `kronop_reel_${uploadId}_chunk_${i}.bin`;
          const bunnyUrl = `https://storage.bunnycdn.net/${BUNNY_STORAGE_ZONE}/${fileName}`;
          
          const uploadResponse = await fetch(bunnyUrl, {
            method: 'PUT',
            headers: {
              'AccessKey': BUNNY_API_KEY,
              'Content-Type': 'application/octet-stream'
            },
            body: chunks[i]
          });
          
          if (!uploadResponse.ok) {
            throw new Error(`BunnyCDN upload failed: ${uploadResponse.status}`);
          }
          
          if (i === 0) {
            uploadedUrl = `https://${BUNNY_STORAGE_ZONE}.b-cdn.net/${fileName}`;
          }
          
          success = true;
          console.log(`Reel Chunk ${i + 1}/${chunks.length} uploaded successfully`);
          
        } catch (error) {
          retries++;
          console.error(`Reel Chunk ${i + 1} upload failed (attempt ${retries}/${MAX_RETRIES}):`, error);
          
          if (retries >= MAX_RETRIES) {
            throw new Error(`Failed to upload reel chunk ${i + 1} after ${MAX_RETRIES} attempts`);
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
    }
    
    // Save metadata to database (mock implementation)
    const reelMetadata = {
      ...metadata,
      userId: 'guest_user',
      uploadId,
      url: uploadedUrl,
      totalChunks: chunks.length,
      appName: 'Kronop',
      timestamp: Date.now(),
      reelType: 'shorts' // For 9:16 vertical videos
    };
    
    console.log('Reel upload completed:', reelMetadata);
    return reelMetadata;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <View style={styles.placeholder} />
        <View style={styles.placeholder} />
      </View>

      <View style={styles.uploadArea}>
        <TouchableOpacity 
          style={[styles.uploadButton, selectedFile && styles.uploadButtonSelected]}
          onPress={pickFile}
          disabled={uploading}
        >
          <MaterialIcons 
            name="video-library" 
            size={48} 
            color={selectedFile ? theme.colors.primary.main : theme.colors.text.tertiary} 
          />
          <Text style={[styles.uploadText, selectedFile && styles.uploadTextSelected]}>
            {selectedFile ? selectedFile.name : 'Choose Video File'}
          </Text>
          <Text style={styles.uploadSubtext}>
            MP4, MOV, AVI (Max 100MB)
          </Text>
        </TouchableOpacity>

        {selectedFile && (
          <View style={styles.fileInfo}>
            <View style={styles.fileInfoItem}>
              <Text style={styles.fileInfoLabel}>Size:</Text>
              <Text style={styles.fileInfoValue}>
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </Text>
            </View>
            <View style={styles.fileInfoItem}>
              <Text style={styles.fileInfoLabel}>Type:</Text>
              <Text style={styles.fileInfoValue}>{selectedFile.mimeType}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={reelData.title}
            onChangeText={(text) => setReelData(prev => ({ ...prev, title: text }))}
            placeholder="Enter reel title..."
            placeholderTextColor="#666"
            maxLength={100}
          />
          <Text style={styles.charCount}>{reelData.title.length}/100</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  reelData.category === category && styles.categoryChipSelected
                ]}
                onPress={() => setReelData(prev => ({ ...prev, category }))}
              >
                <Text style={[
                  styles.categoryChipText,
                  reelData.category === category && styles.categoryChipTextSelected
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tags</Text>
          <View style={styles.tagInputContainer}>
            <TextInput
              style={styles.tagInput}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Add tags..."
              placeholderTextColor="#666"
              onSubmitEditing={addTag}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addTagButton} onPress={addTag}>
              <MaterialIcons name="add" size={theme.iconSize.md} color={theme.colors.primary.main} />
            </TouchableOpacity>
          </View>
          
          {reelData.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {reelData.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(tag)}>
                    <MaterialIcons name="close" size={theme.iconSize.sm} color={theme.colors.text.tertiary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.uploadButtonMain, uploading && styles.uploadButtonDisabled]}
        onPress={handleUpload}
        disabled={uploading || !selectedFile}
      >
        {uploading ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.uploadButtonText}>Uploading...</Text>
          </>
        ) : (
          <>
            <MaterialIcons name="upload" size={theme.iconSize.md} color="#FFFFFF" />
            <Text style={styles.uploadButtonText}>Upload Reel</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
