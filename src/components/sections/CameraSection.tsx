import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CameraSectionProps {
  onMediaSelected?: (uri: string, type: 'camera') => void;
}

const CameraSection: React.FC<CameraSectionProps> = ({ onMediaSelected }) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const openNativeCamera = () => {
    // Open native camera directly
    Linking.openURL('camera://');
  };

  const openCameraApp = () => {
    // Alternative: Try to open camera app
    Alert.alert(
      'Open Camera',
      'Camera will open directly. Take a photo and it will be available here.',
      [
        {
          text: 'Open Camera',
          onPress: openNativeCamera,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="camera" size={24} color="#4A2C5F" />
        <Text style={styles.title}>Camera</Text>
      </View>

      <TouchableOpacity style={styles.cameraButton} onPress={openCameraApp}>
        <Ionicons name="camera-outline" size={40} color="#4A2C5F" />
        <Text style={styles.buttonText}>Open Camera</Text>
      </TouchableOpacity>

      {capturedImage && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>Last Captured:</Text>
          <Image source={{ uri: capturedImage }} style={styles.previewImage} />
          <TouchableOpacity 
            style={styles.useButton}
            onPress={() => onMediaSelected?.(capturedImage, 'camera')}
          >
            <Text style={styles.useButtonText}>Use This Photo</Text>
          </TouchableOpacity>
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
  cameraButton: {
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
  previewContainer: {
    marginTop: 16,
  },
  previewTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 8,
  },
  useButton: {
    backgroundColor: '#4A2C5F',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  useButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CameraSection;
