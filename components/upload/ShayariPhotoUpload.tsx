import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

interface ShayariPhotoData {
  shayari_text: string;
  shayari_author: string;
  tags: string[];
  category: string;
}

interface ShayariPhotoUploadProps {
  onClose: () => void;
  onUpload?: (imageUri: string, shayariText: string, metadata: any) => Promise<void>;
  uploading?: boolean;
  uploadProgress?: number;
}

export default function ShayariPhotoUpload({ 
  onClose, 
  onUpload, 
  uploading: bridgeUploading = false, 
  uploadProgress: bridgeProgress = 0 
}: ShayariPhotoUploadProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [internalUploading, setInternalUploading] = useState(false);
  const [internalUploadProgress, setInternalUploadProgress] = useState(0);
  const [shayariData, setShayariData] = useState<ShayariPhotoData>({
    shayari_text: '',
    shayari_author: '',
    tags: [],
    category: ''
  });
  const [tagInput, setTagInput] = useState('');

  const categories = [
    'Love', 'Sad', 'Romantic', 'Friendship', 'Motivation', 
    'Life', 'Nature', 'Birthday', 'Inspirational', 'Funny'
  ];

  const pickPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        // Basic file type validation
        const fileName = file.fileName || '';
        const extension = fileName.split('.').pop()?.toLowerCase();
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        
        if (!extension || !allowedExtensions.includes(extension)) {
          Alert.alert('Invalid File', `Please select a valid image file. Allowed: ${allowedExtensions.join(', ')}`);
          return;
        }

        // Basic file size validation
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.fileSize && file.fileSize > MAX_SIZE) {
          Alert.alert('File Too Large', 'Image files must be less than 10MB');
          return;
        }

        setSelectedFile(file);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your camera.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        // Basic file type validation
        const fileName = file.fileName || '';
        const extension = fileName.split('.').pop()?.toLowerCase();
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        
        if (!extension || !allowedExtensions.includes(extension)) {
          Alert.alert('Invalid File', `Please select a valid image file. Allowed: ${allowedExtensions.join(', ')}`);
          return;
        }

        // Basic file size validation
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.fileSize && file.fileSize > MAX_SIZE) {
          Alert.alert('File Too Large', 'Image files must be less than 10MB');
          return;
        }

        setSelectedFile(file);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !shayariData.tags.includes(tagInput.trim())) {
      setShayariData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setShayariData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('No Photo Selected', 'Please select a photo for your shayari');
      return;
    }

    if (!shayariData.shayari_text.trim()) {
      Alert.alert('Missing Shayari', 'Please write your shayari text');
      return;
    }

    if (!shayariData.category.trim()) {
      Alert.alert('Missing Category', 'Please select a category for your shayari');
      return;
    }

    // UI Component - Delegate to Bridge Controller
    if (onUpload) {
      // Bridge controls the upload - Send imageUri, shayariText, and metadata
      await onUpload(selectedFile.uri, shayariData.shayari_text, {
        ...shayariData,
        size: selectedFile.size,
        type: selectedFile.mimeType || 'image/jpeg',
        name: selectedFile.name
      });
    } else {
      // Fallback for standalone usage
      setInternalUploading(true);
      try {
        await uploadShayariHybrid(selectedFile, shayariData, (progress) => {
          setInternalUploadProgress(progress.percentage);
        });
        Alert.alert('Success', 'Shayari uploaded successfully to Kronop!');
        setSelectedFile(null);
        setInternalUploadProgress(0);
        setInternalUploading(false);
        onClose();
        router.replace('/');
      } catch (error: any) {
        console.error('Shayari upload failed:', error);
        Alert.alert('Upload Failed', error.message || 'Failed to upload shayari');
        setInternalUploading(false);
      }
    }
  };

  // Text + Image Hybrid Upload Function
  const uploadShayariHybrid = async (image: any, metadata: any, onProgress?: (progress: any) => void) => {
    const BUNNY_API_KEY = process.env.EXPO_PUBLIC_BUNNY_API_KEY || '';
    const BUNNY_STORAGE_ZONE = process.env.EXPO_PUBLIC_BUNNY_STORAGE_ZONE || 'kronop';
    
    try {
      // Step 1: Upload image first (50% progress)
      if (onProgress) onProgress({ percentage: 25 });
      
      const imageFileName = `kronop_shayari_img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${image.name.split('.').pop() || 'jpg'}`;
      const imageBunnyUrl = `https://storage.bunnycdn.net/${BUNNY_STORAGE_ZONE}/${imageFileName}`;
      
      const imageResponse = await fetch(imageBunnyUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': BUNNY_API_KEY,
          'Content-Type': image.mimeType || 'image/jpeg'
        },
        body: image
      });
      
      if (!imageResponse.ok) {
        throw new Error(`BunnyCDN image upload failed: ${imageResponse.status}`);
      }
      
      const imageUrl = `https://${BUNNY_STORAGE_ZONE}.b-cdn.net/${imageFileName}`;
      
      // Step 2: Save text data (75% progress)
      if (onProgress) onProgress({ percentage: 75 });
      
      const shayariTextData = {
        text: metadata.shayari_text,
        category: metadata.category,
        tags: metadata.tags,
        userId: 'guest_user',
        uploadId: `shayari_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        appName: 'Kronop',
        timestamp: Date.now(),
        imageUrl,
        imageFileName,
        type: 'hybrid'
      };
      
      // Mock text data save (in production, this would save to database)
      const textResult = {
        id: shayariTextData.uploadId,
        ...shayariTextData,
        saved: true
      };
      
      // Step 3: Complete (100% progress)
      if (onProgress) onProgress({ percentage: 100 });
      
      const hybridResult = {
        imageUrl,
        imageId: imageFileName,
        textId: textResult.id,
        textData: textResult,
        type: 'hybrid',
        metadata: shayariTextData
      };
      
      console.log('Shayari hybrid upload completed:', hybridResult);
      return hybridResult;
      
    } catch (error: any) {
      console.error('Shayari hybrid upload failed:', error);
      throw error;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <View style={styles.placeholder} />
        <View style={styles.placeholder} />
      </View>

      <View style={styles.uploadArea}>
        <View style={styles.photoWithButtonContainer}>
          <TouchableOpacity 
            style={styles.uploadButton}
            onPress={pickPhoto}
            disabled={bridgeUploading || internalUploading}
          >
            <MaterialIcons name="photo-library" size={24} color="#6A5ACD" />
            <Text style={styles.uploadButtonText}>Choose Photo</Text>
            <Text style={styles.uploadButtonSubtext}>From gallery</Text>
          </TouchableOpacity>

          {selectedFile && (
            <View style={styles.photoBesideButton}>
              <Image 
                source={{ uri: selectedFile.uri }} 
                style={styles.selectedFileImage} 
                onLoad={() => console.log('[SHAYARI_UPLOAD]: Image loaded successfully:', selectedFile.uri)}
                onError={(error) => console.error('[SHAYARI_UPLOAD]: Image failed to load:', error)}
              />
              {shayariData.shayari_text.trim() && (
                <View style={styles.shayariTextOverlay}>
                  <Text style={styles.shayariTextOnPhoto}>
                    {shayariData.shayari_text}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Shayari Text *</Text>
          <TextInput
            style={[styles.input, styles.shayariInput]}
            value={shayariData.shayari_text}
            onChangeText={(text) => setShayariData(prev => ({ ...prev, shayari_text: text }))}
            placeholder="Write your beautiful shayari here..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{shayariData.shayari_text.length}/500</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Shayari Author</Text>
          <TextInput
            style={styles.input}
            value={shayariData.shayari_author}
            onChangeText={(text) => setShayariData(prev => ({ ...prev, shayari_author: text }))}
            placeholder="Author name (optional)"
            placeholderTextColor="#666"
            maxLength={100}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  shayariData.category === category && styles.categoryChipSelected
                ]}
                onPress={() => setShayariData(prev => ({ ...prev, category }))}
              >
                <Text style={[
                  styles.categoryChipText,
                  shayariData.category === category && styles.categoryChipTextSelected
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
              <MaterialIcons name="add" size={20} color="#6A5ACD" />
            </TouchableOpacity>
          </View>
          
          {shayariData.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {shayariData.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(tag)}>
                    <MaterialIcons name="close" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.uploadButtonMain, (bridgeUploading || internalUploading) && styles.uploadButtonDisabled]}
        onPress={handleUpload}
        disabled={(bridgeUploading || internalUploading) || !selectedFile}
      >
        {(bridgeUploading || internalUploading) ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.uploadButtonText}>
              Uploading Shayari Photo...
            </Text>
          </>
        ) : (
          <>
            <MaterialIcons name="cloud-upload" size={20} color="#fff" />
            <Text style={styles.uploadButtonText}>
              Upload Shayari Photo
            </Text>
          </>
        )}
      </TouchableOpacity>

      {(bridgeUploading || internalUploading) && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { width: `${bridgeProgress || internalUploadProgress}%` }]} 
            />
          </View>
          <Text style={styles.progressText}>{bridgeProgress || internalUploadProgress}%</Text>
        </View>
      )}
    </ScrollView>
  );
};

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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  uploadArea: {
    padding: 16,
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#6A5ACD',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  galleryButton: {
    borderColor: '#6A5ACD',
  },
  cameraButton: {
    borderColor: '#6A5ACD',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
  },
  uploadButtonSubtext: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  photoWithButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  photoBesideButton: {
    position: 'relative',
  },
  selectedFileTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  selectedFileImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    resizeMode: 'cover',
  },
  photoWithTextContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  shayariTextOverlay: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    padding: 4,
  },
  shayariTextOnPhoto: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  removeFileButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#6A5ACD',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSection: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  shayariInput: {
    height: 120,
    paddingTop: 12,
    fontFamily: 'System', // Use system font for better shayari display
  },
  charCount: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'right',
    marginTop: 4,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#6A5ACD',
    borderColor: '#6A5ACD',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  tagInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  addTagButton: {
    backgroundColor: '#6A5ACD',
    borderRadius: 8,
    padding: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  uploadButtonMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6A5ACD',
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#444444',
  },
  progressContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6A5ACD',
  },
  progressText: {
    fontSize: 12,
    color: '#CCCCCC',
    textAlign: 'center',
    marginTop: 8,
  },
});
