import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';

interface VideoData {
  title: string;
  description: string;
  category: string;
  tags: string[];
  coverPhoto?: any;
}

interface VideoUploadProps {
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
    flex: 1,
    borderWidth: 2,
    borderColor: theme.colors.border.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
  },
  uploadButtonSelected: {
    borderColor: theme.colors.primary.main,
    backgroundColor: theme.colors.background.elevated,
  },
  coverPhotoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: theme.borderRadius.lg,
  },
  coverPhotoLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  coverPhotoImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.borderRadius.lg,
  },
  coverPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border.secondary,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.tertiary,
  },
  coverPhotoText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.sm,
  },
  coverPhotoSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    marginLeft: theme.spacing.sm,
  },
  uploadText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
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
  thumbnailSection: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.elevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  thumbnailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border.secondary,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.tertiary,
  },
  thumbnailButtonSelected: {
    borderColor: theme.colors.primary.main,
    backgroundColor: theme.colors.background.elevated,
  },
  thumbnailPreview: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
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
  textArea: {
    height: 100,
    paddingTop: theme.spacing.md,
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

export default function VideoUpload({ 
  onClose, 
  onUpload, 
  uploading = false, 
  uploadProgress = 0 
}: VideoUploadProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [videoData, setVideoData] = useState<VideoData>({ title: '', description: '', category: '', tags: [], coverPhoto: null });
  const [tagInput, setTagInput] = useState('');

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 MB';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const categories = [
    'Entertainment', 'Music', 'Gaming', 'Education', 'Technology', 
    'News', 'Sports', 'Business', 'Health', 'Travel', 'Comedy', 
    'Lifestyle', 'Food', 'Science', 'Documentary'
  ];

  const pickVideo = async () => {
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

        const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
        if (file.size && file.size > MAX_SIZE) {
          Alert.alert('File Too Large', 'Video files must be less than 2GB');
          return;
        }

        setSelectedFile(file);
        setVideoData(prev => ({ 
          ...prev, 
          title: prev.title || file.name.split('.')[0] 
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick video file');
    }
  };

  const pickCoverPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setVideoData(prev => ({ ...prev, coverPhoto: result.assets[0] }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick cover photo');
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !videoData.tags.includes(tagInput.trim())) {
      setVideoData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setVideoData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('No File Selected', 'Please select a video file first');
      return;
    }

    if (!videoData.title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your video');
      return;
    }

    if (!videoData.category.trim()) {
      Alert.alert('Missing Category', 'Please select a category for your video');
      return;
    }

    // Bridge Control - Send only URI and metadata
    if (onUpload) {
      await onUpload(selectedFile.uri, {
        ...videoData,
        size: selectedFile.size,
        type: selectedFile.mimeType || 'video/mp4',
        name: selectedFile.name
      });
    }
  };

  // Chunking Upload Function for Videos
  const uploadVideoWithChunking = async (file: any, metadata: any, onProgress?: (progress: any) => void) => {
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
    
    const uploadId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let uploadedUrl = '';
    
    // Upload each chunk to BunnyCDN
    for (let i = 0; i < chunks.length; i++) {
      let retries = 0;
      let success = false;
      
      while (retries < MAX_RETRIES && !success) {
        try {
          const percentage = Math.round(((i + 1) / chunks.length) * 100);
          if (onProgress) onProgress({ percentage, currentChunk: i + 1, totalChunks: chunks.length });
          
          const fileName = `kronop_video_${uploadId}_chunk_${i}.bin`;
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
          console.log(`Chunk ${i + 1}/${chunks.length} uploaded successfully`);
          
        } catch (error) {
          retries++;
          console.error(`Chunk ${i + 1} upload failed (attempt ${retries}/${MAX_RETRIES}):`, error);
          
          if (retries >= MAX_RETRIES) {
            throw new Error(`Failed to upload chunk ${i + 1} after ${MAX_RETRIES} attempts`);
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
    }
    
    // Save metadata to database (mock implementation)
    const videoMetadata = {
      ...metadata,
      userId: 'guest_user',
      uploadId,
      url: uploadedUrl,
      totalChunks: chunks.length,
      appName: 'Kronop',
      timestamp: Date.now()
    };
    
    console.log('Video upload completed:', videoMetadata);
    return videoMetadata;
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
          onPress={pickVideo}
          disabled={uploading}
        >
          {selectedFile && videoData.coverPhoto && (
            <View style={styles.coverPhotoOverlay}>
              <Image 
                source={{ uri: videoData.coverPhoto.uri }} 
                style={styles.coverPhotoImage}
                contentFit="cover"
              />
            </View>
          )}
          
          <MaterialIcons 
            name="video-library" 
            size={theme.iconSize.xl} 
            color={selectedFile ? theme.colors.primary.main : theme.colors.text.tertiary} 
          />
          <Text style={[styles.uploadText, selectedFile && styles.uploadTextSelected]}>
            {selectedFile ? 'Video Selected' : 'Choose Video'}
          </Text>
          <Text style={styles.uploadSubtext}>
            {selectedFile ? `MP4 • ${formatFileSize(selectedFile.size)} • Max 2GB` : 'MP4, MOV, AVI (Max 2GB)'}
          </Text>
        </TouchableOpacity>

        {selectedFile && !videoData.coverPhoto && (
          <TouchableOpacity 
            style={styles.coverPhotoButton}
            onPress={pickCoverPhoto}
            disabled={uploading}
          >
            <MaterialIcons 
              name="image" 
              size={theme.iconSize.lg} 
              color={theme.colors.text.tertiary} 
            />
            <Text style={styles.coverPhotoText}>
              Add Cover Photo
            </Text>
            <Text style={styles.coverPhotoSubtext}>
              JPG, PNG (16:9)
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={videoData.title}
            onChangeText={(text) => setVideoData(prev => ({ ...prev, title: text }))}
            placeholder="Enter video title..."
            placeholderTextColor="#666"
            maxLength={100}
          />
          <Text style={styles.charCount}>{videoData.title.length}/100</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={videoData.description}
            onChangeText={(text) => setVideoData(prev => ({ ...prev, description: text }))}
            placeholder="Describe your video..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{videoData.description.length}/500</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  videoData.category === category && styles.categoryChipSelected
                ]}
                onPress={() => setVideoData(prev => ({ ...prev, category }))}
              >
                <Text style={[
                  styles.categoryChipText,
                  videoData.category === category && styles.categoryChipTextSelected
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
          
          {videoData.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {videoData.tags.map((tag, index) => (
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
            <Text style={styles.uploadButtonText}>Upload Video</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
