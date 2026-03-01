import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FileItem {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
  content?: string;
}

interface FilesSectionProps {
  onFileSelected?: (file: FileItem) => void;
}

const FilesSection: React.FC<FilesSectionProps> = ({ onFileSelected }) => {
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);

  const openNativeFileManager = () => {
    // Open native file manager directly
    Linking.openURL('content://com.android.externalstorage.documents');
  };

  const openFileManager = () => {
    // Alternative: Try to open file manager
    Alert.alert(
      'Open Files',
      'File Manager will open directly. Select files and they will be available here.',
      [
        {
          text: 'Open Files',
          onPress: openNativeFileManager,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const removeFile = (index: number) => {
    Alert.alert(
      'Remove File',
      'Are you sure you want to remove this file?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          onPress: () => {
            setSelectedFiles(prev => prev.filter((_, i) => i !== index));
          },
          style: 'destructive',
        },
      ]
    );
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimeType?: string): string => {
    if (!mimeType) return 'document';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'videocam';
    if (mimeType.startsWith('audio/')) return 'musical-note';
    if (mimeType.includes('pdf')) return 'document-text';
    return 'document';
  };

  const renderFile = ({ item, index }: { item: FileItem; index: number }) => (
    <View style={styles.fileItem}>
      <View style={styles.fileInfo}>
        <Ionicons name={getFileIcon(item.mimeType) as any} size={24} color="#4A2C5F" />
        <View style={styles.fileDetails}>
          <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.fileSize}>{formatFileSize(item.size)}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => removeFile(index)}>
        <Ionicons name="close-circle" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="folder" size={24} color="#4A2C5F" />
        <Text style={styles.title}>Files</Text>
      </View>

      <TouchableOpacity style={styles.filesButton} onPress={openFileManager}>
        <Ionicons name="folder-open-outline" size={40} color="#4A2C5F" />
        <Text style={styles.buttonText}>Browse Files</Text>
      </TouchableOpacity>

      {selectedFiles.length > 0 && (
        <View style={styles.filesList}>
          <Text style={styles.sectionTitle}>Selected Files ({selectedFiles.length})</Text>
          <FlatList
            data={selectedFiles}
            renderItem={renderFile}
            keyExtractor={(_, index) => index.toString()}
            scrollEnabled={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A2C5F',
    marginLeft: 8,
  },
  filesButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderStyle: 'dashed',
  },
  buttonText: {
    marginTop: 8,
    color: '#4A2C5F',
    fontSize: 14,
    fontWeight: '500',
  },
  filesList: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default FilesSection;
