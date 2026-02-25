import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';

interface SongData {
  title: string;
  artist: string;
  tags: string[];
  genre: string;
}

interface SongUploadProps {
  onClose: () => void;
  onUpload?: (files: any[], metadata: any) => Promise<void>;
  uploading?: boolean;
  uploadProgress?: number;
}

export default function SongUpload({ 
  onClose, 
  onUpload, 
  uploading: bridgeUploading = false, 
  uploadProgress: bridgeProgress = 0 
}: SongUploadProps) {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [internalUploading, setInternalUploading] = useState(false);
  const [internalUploadProgress, setInternalUploadProgress] = useState(0);
  const [songData, setSongData] = useState<SongData>({
    title: '',
    artist: '',
    tags: [],
    genre: ''
  });
  const [tagInput, setTagInput] = useState('');

  const genres = [
    'Pop', 'Rock', 'Hip Hop', 'R&B', 'Country', 'Electronic', 
    'Classical', 'Jazz', 'Blues', 'Reggae', 'Folk', 'Metal', 'Other'
  ];

  const pickSongs = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'audio/*',
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/flac',
          'audio/aac',
          'audio/ogg'
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        const validFiles = result.assets.filter(file => 
          file.mimeType && file.mimeType.startsWith('audio/')
        );
        
        if (validFiles.length === 0) {
          Alert.alert('Invalid Files', 'Please select valid audio files');
          return;
        }

        if (selectedFiles.length + validFiles.length > 10) {
          Alert.alert('Limit Exceeded', 'You can upload maximum 10 songs at once');
          return;
        }

        setSelectedFiles(prev => [...prev, ...validFiles]);
      }
    } catch (error) {
      console.error('Error picking songs:', error);
      Alert.alert('Error', 'Failed to pick songs');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !songData.tags.includes(trimmedTag)) {
      setSongData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSongData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const validateAndUpload = async () => {
    if (selectedFiles.length === 0) {
      Alert.alert('No Songs', 'Please select at least one song');
      return;
    }

    if (!songData.title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your songs');
      return;
    }

    if (!songData.artist.trim()) {
      Alert.alert('Missing Artist', 'Please enter the artist name');
      return;
    }

    if (!songData.genre) {
      Alert.alert('Missing Genre', 'Please select a genre');
      return;
    }

    // UI Component - Delegate to Bridge Controller
    if (onUpload) {
      // Bridge controls the upload
      await onUpload(selectedFiles, songData);
    } else {
      // Fallback for standalone usage
      setInternalUploading(true);
      try {
        await uploadAudioWithStreaming(selectedFiles, songData, (progress) => {
          setInternalUploadProgress(progress.percentage);
        });
        Alert.alert('Success', 'Songs uploaded successfully to Kronop!');
        setSelectedFiles([]);
        setInternalUploading(false);
        setInternalUploadProgress(0);
        onClose();
        router.replace('/');
      } catch (error: any) {
        console.error('Song upload failed:', error);
        Alert.alert('Upload Failed', error.message || 'Failed to upload songs');
        setInternalUploading(false);
      }
    }
  };

  const uploadSongs = async () => {
    setInternalUploading(true);
    
    try {
      // Kronop Audio Streaming Upload System
      await uploadAudioWithStreaming(selectedFiles, songData, (progress) => {
        setInternalUploadProgress(progress.percentage);
      });
      
      Alert.alert('Success', 'Songs uploaded successfully to Kronop!');
      setSelectedFiles([]);
      setInternalUploading(false);
      setInternalUploadProgress(0);
      onClose();
      router.replace('/');
    } catch (error: any) {
      console.error('Song upload failed:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload songs');
      setInternalUploading(false);
    }
  };

  // Audio Streaming Upload Function
  const uploadAudioWithStreaming = async (files: any[], metadata: any, onProgress?: (progress: any) => void) => {
    const BUNNY_API_KEY = process.env.EXPO_PUBLIC_BUNNY_API_KEY || '';
    const BUNNY_STORAGE_ZONE = process.env.EXPO_PUBLIC_BUNNY_STORAGE_ZONE || 'kronop';
    
    const uploadResults = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Update progress
        const fileProgress = ((i + 1) / files.length) * 100;
        if (onProgress) onProgress({ percentage: Math.round(fileProgress) });
        
        // For large audio files (>10MB), use chunking
        if (file.size > 10 * 1024 * 1024) {
          const chunkResult = await uploadAudioInChunks(file, metadata, i);
          uploadResults.push(chunkResult);
        } else {
          // Direct upload for smaller files
          const fileName = `kronop_audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop() || 'mp3'}`;
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
              uploadId: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              appName: 'Kronop',
              timestamp: Date.now(),
              fileName,
              duration: 180, // Mock duration
              bitrate: 128, // Mock bitrate
              streamingUrl: `https://${BUNNY_STORAGE_ZONE}.b-cdn.net/${fileName}`
            },
            success: true
          };
          
          uploadResults.push(result);
        }
        
        console.log(`Audio ${i + 1}/${files.length} uploaded successfully`);
        
      } catch (error: any) {
        console.error(`Audio ${i + 1} upload failed:`, error);
        uploadResults.push({
          success: false,
          error: error.message,
          file: file.name
        });
      }
    }
    
    // Check if all uploads succeeded
    const failedUploads = uploadResults.filter(r => !r.success);
    if (failedUploads.length > 0) {
      throw new Error(`${failedUploads.length} songs failed to upload`);
    }
    
    console.log('Audio upload completed:', uploadResults);
    return uploadResults;
  };

  // Chunk upload for large audio files
  const uploadAudioInChunks = async (file: any, metadata: any, index: number) => {
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
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
    
    const uploadId = `audio_chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let uploadedUrl = '';
    
    // Upload each chunk
    for (let i = 0; i < chunks.length; i++) {
      const fileName = `kronop_audio_${uploadId}_chunk_${i}.bin`;
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
        throw new Error(`Audio chunk upload failed: ${chunkResponse.status}`);
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
        chunked: true
      },
      success: true
    };
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <View style={styles.placeholder} />
        <View style={styles.placeholder} />
      </View>

      {/* File Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Songs</Text>
        <TouchableOpacity style={styles.selectButton} onPress={pickSongs}>
          <MaterialIcons name="music-note" size={24} color="#6A5ACD" />
          <Text style={styles.selectButtonText}>Choose Audio Files</Text>
        </TouchableOpacity>
        
        {selectedFiles.length > 0 && (
          <View style={styles.filesList}>
            {selectedFiles.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <MaterialIcons name="audio-file" size={20} color="#6A5ACD" />
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name}
                </Text>
                <TouchableOpacity onPress={() => removeFile(index)}>
                  <MaterialIcons name="remove-circle" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Song Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Song Details</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Title *</Text>
          <TextInput
            style={styles.input}
            value={songData.title}
            onChangeText={(text) => setSongData(prev => ({ ...prev, title: text }))}
            placeholder="Enter song title"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Artist *</Text>
          <TextInput
            style={styles.input}
            value={songData.artist}
            onChangeText={(text) => setSongData(prev => ({ ...prev, artist: text }))}
            placeholder="Enter artist name"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Genre *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.genreContainer}>
              {genres.map(genre => (
                <TouchableOpacity
                  key={genre}
                  style={[
                    styles.genreChip,
                    songData.genre === genre && styles.genreChipSelected
                  ]}
                  onPress={() => setSongData(prev => ({ ...prev, genre }))}
                >
                  <Text style={[
                    styles.genreText,
                    songData.genre === genre && styles.genreTextSelected
                  ]}>
                    {genre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>


        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tags</Text>
          <View style={styles.tagInputContainer}>
            <TextInput
              style={styles.tagInput}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Add tags (press Enter)"
              placeholderTextColor="#666"
              onSubmitEditing={addTag}
            />
            <TouchableOpacity onPress={addTag} style={styles.addTagButton}>
              <MaterialIcons name="add" size={20} color="#6A5ACD" />
            </TouchableOpacity>
          </View>
          {songData.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {songData.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(tag)}>
                    <MaterialIcons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Upload Button */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={[styles.uploadButton, (bridgeUploading || internalUploading) && styles.uploadButtonDisabled]}
          onPress={validateAndUpload}
          disabled={bridgeUploading || internalUploading}
        >
          {(bridgeUploading || internalUploading) ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.uploadButtonText}>
                Uploading... {Math.round(bridgeProgress || internalUploadProgress)}%
              </Text>
            </View>
          ) : (
            <Text style={styles.uploadButtonText}>
              Upload {selectedFiles.length} Song{selectedFiles.length !== 1 ? 's' : ''}
            </Text>
          )}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 34,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#6A5ACD',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 10,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6A5ACD',
  },
  filesList: {
    marginTop: 15,
    gap: 10,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  genreContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genreChip: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  genreChipSelected: {
    backgroundColor: '#6A5ACD',
    borderColor: '#6A5ACD',
  },
  genreText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  genreTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tagInputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  addTagButton: {
    backgroundColor: '#6A5ACD',
    borderRadius: 8,
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A5ACD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  uploadButton: {
    backgroundColor: '#6A5ACD',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#444444',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
