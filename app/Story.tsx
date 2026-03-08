import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StoryFile {
  id: string;
  name: string;
  uri: string;
  size: number;
  type: 'image' | 'video';
  timestamp: string;
}

export default function StoryScreen() {
  const [selectedFiles, setSelectedFiles] = useState<StoryFile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStoredFiles();
  }, []);

  const loadStoredFiles = async () => {
    try {
      const stored = await AsyncStorage.getItem('storyFiles');
      if (stored) {
        setSelectedFiles(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading stored files:', error);
    }
  };

  const storeFiles = async (files: StoryFile[]) => {
    try {
      await AsyncStorage.setItem('storyFiles', JSON.stringify(files));
    } catch (error) {
      console.error('Error storing files:', error);
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'video/*'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles: StoryFile[] = result.assets.map((asset, index) => ({
          id: `story_${Date.now()}_${index}`,
          name: asset.name,
          uri: asset.uri,
          size: asset.size || 0,
          type: asset.mimeType?.startsWith('video/') ? 'video' : 'image',
          timestamp: new Date().toISOString(),
        }));

        const updatedFiles = [...selectedFiles, ...newFiles];
        setSelectedFiles(updatedFiles);
        storeFiles(updatedFiles);
        Alert.alert('Success', `${newFiles.length} file(s) added successfully!`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick files');
      console.error(error);
    }
  };

  const removeFile = async (fileId: string) => {
    const updatedFiles = selectedFiles.filter(file => file.id !== fileId);
    setSelectedFiles(updatedFiles);
    storeFiles(updatedFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Story Files</Text>
        <TouchableOpacity style={styles.addButton} onPress={pickFile}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {selectedFiles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="photo-library" size={64} color="#8B00FF" />
          <Text style={styles.emptyTitle}>No Stories Yet</Text>
          <Text style={styles.emptySubtitle}>Add photos and videos to create stories</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={pickFile}>
            <Text style={styles.emptyButtonText}>Add First Story</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.filesContainer} showsVerticalScrollIndicator={false}>
          {selectedFiles.map((file) => (
            <View key={file.id} style={styles.fileCard}>
              <View style={styles.filePreview}>
                {file.type === 'video' ? (
                  <View style={styles.videoPlaceholder}>
                    <MaterialIcons name="videocam" size={32} color="#fff" />
                  </View>
                ) : (
                  <Image source={{ uri: file.uri }} style={styles.imagePreview} contentFit="cover" />
                )}
              </View>
              
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                <Text style={styles.fileMeta}>
                  {formatFileSize(file.size)} • {formatTime(file.timestamp)}
                </Text>
                <View style={[styles.typeBadge, file.type === 'video' ? styles.videoBadge : styles.imageBadge]}>
                  <Text style={styles.typeText}>{file.type.toUpperCase()}</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.removeButton} 
                onPress={() => removeFile(file.id)}
              >
                <MaterialIcons name="delete" size={20} color="#FF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.floatingButton} onPress={pickFile}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B00FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#8B00FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  filesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  filePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  fileMeta: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  videoBadge: {
    backgroundColor: '#FF4444',
  },
  imageBadge: {
    backgroundColor: '#4CAF50',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B00FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
