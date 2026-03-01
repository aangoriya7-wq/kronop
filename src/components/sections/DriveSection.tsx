import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DriveFile {
  id: string;
  name: string;
  content: string;
  createdAt: string;
}

interface DriveSectionProps {
  onFileCreated?: (file: DriveFile) => void;
}

const DriveSection: React.FC<DriveSectionProps> = ({ onFileCreated }) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');

  const openGoogleDrive = () => {
    // Open Google Drive directly
    Linking.openURL('https://drive.google.com');
  };

  const openDriveApp = () => {
    // Alternative: Try to open drive app
    Alert.alert(
      'Open Drive',
      'Google Drive will open directly. Create files and they will be available here.',
      [
        {
          text: 'Open Drive',
          onPress: openGoogleDrive,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const createNewFile = async () => {
    if (!newFileName.trim()) {
      Alert.alert('Error', 'Please enter a file name');
      return;
    }

    const newFile: DriveFile = {
      id: Date.now().toString(),
      name: newFileName,
      content: newFileContent,
      createdAt: new Date().toLocaleString(),
    };

    setFiles(prev => [newFile, ...prev]);
    onFileCreated?.(newFile);
    
    // Reset form
    setNewFileName('');
    setNewFileContent('');
    setShowCreateForm(false);

    Alert.alert('Success', 'File created successfully!');
  };

  const deleteFile = (id: string) => {
    Alert.alert(
      'Delete File',
      'Are you sure you want to delete this file?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: () => {
            setFiles(prev => prev.filter(file => file.id !== id));
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderFile = (file: DriveFile) => (
    <View key={file.id} style={styles.fileCard}>
      <View style={styles.fileHeader}>
        <View style={styles.fileTitleContainer}>
          <Ionicons name="document-text" size={20} color="#4A2C5F" />
          <Text style={styles.fileName}>{file.name}</Text>
        </View>
        <TouchableOpacity onPress={() => deleteFile(file.id)}>
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      
      {file.content ? (
        <Text style={styles.fileContent} numberOfLines={3}>
          {file.content}
        </Text>
      ) : (
        <Text style={styles.emptyContent}>No content</Text>
      )}
      
      <Text style={styles.fileDate}>Created: {file.createdAt}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="cloud" size={24} color="#4A2C5F" />
        <Text style={styles.title}>Drive</Text>
      </View>

      <TouchableOpacity 
        style={styles.createButton}
        onPress={openDriveApp}
      >
        <Ionicons name="cloud-outline" size={24} color="#4A2C5F" />
        <Text style={styles.createButtonText}>
          Open Google Drive
        </Text>
      </TouchableOpacity>

      {showCreateForm && (
        <View style={styles.createForm}>
          <TextInput
            style={styles.input}
            placeholder="File name (e.g., notes.txt)"
            value={newFileName}
            onChangeText={setNewFileName}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="File content..."
            value={newFileContent}
            onChangeText={setNewFileContent}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity style={styles.saveButton} onPress={createNewFile}>
            <Text style={styles.saveButtonText}>Save to Drive</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.filesList}>
        {files.length > 0 ? (
          files.map(renderFile)
        ) : (
          <Text style={styles.emptyText}>No files in Drive. Create one!</Text>
        )}
      </ScrollView>
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
    maxHeight: 500,
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  createButtonText: {
    marginLeft: 8,
    color: '#4A2C5F',
    fontSize: 14,
    fontWeight: '500',
  },
  createForm: {
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: '#FFF',
  },
  textArea: {
    minHeight: 100,
  },
  saveButton: {
    backgroundColor: '#4A2C5F',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filesList: {
    maxHeight: 300,
  },
  fileCard: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fileTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  fileContent: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  emptyContent: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  fileDate: {
    fontSize: 11,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 20,
  },
});

export default DriveSection;
