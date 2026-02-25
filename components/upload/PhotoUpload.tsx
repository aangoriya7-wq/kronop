import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, ScrollView, ActivityIndicator, FlatList, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

interface PhotoData {
  title: string;
  description: string;
  tags: string[];
  category: string;
}

interface PhotoUploadProps {
  onClose: () => void;
  isShayari?: boolean;
  onUpload?: (fileUri: string, metadata: any) => Promise<void>;
  uploading?: boolean;
  uploadProgress?: number;
}

export default function PhotoUpload({ 
  onClose, 
  isShayari = false, 
  onUpload, 
  uploading = false, 
  uploadProgress = 0 
}: PhotoUploadProps) {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [internalUploading, setInternalUploading] = useState(false);
  const [photoData, setPhotoData] = useState<PhotoData>({ title: '', description: '', tags: [], category: '' });
  const [tagInput, setTagInput] = useState('');

  const categories = [
    'Nature', 'Portrait', 'Street', 'Architecture', 'Food', 
    'Travel', 'Fashion', 'Art', 'Animals', 'Sports', 'Other'
  ];

  const pickPhotos = async () => {
    try {
      // Request both media library and camera permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // All media types
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
        selectionLimit: 0, // No limit - user can select unlimited
      });

      if (!result.canceled && result.assets) {
        const validFiles: any[] = [];
        
        for (const asset of result.assets) {
          // Basic file type validation
          const fileName = asset.fileName || '';
          const extension = fileName.split('.').pop()?.toLowerCase();
          const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
          
          if (!extension || !allowedExtensions.includes(extension)) {
            Alert.alert('Invalid File', `${asset.fileName} - Please select a valid image file. Allowed: ${allowedExtensions.join(', ')}`);
            continue;
          }

          // Basic file size validation
          const MAX_SIZE = 10 * 1024 * 1024; // 10MB
          if (asset.fileSize && asset.fileSize > MAX_SIZE) {
            Alert.alert('File Too Large', `${asset.fileName} - Image files must be less than 10MB`);
            continue;
          }

          validFiles.push(asset);
        }

        if (validFiles.length > 0) {
          setSelectedFiles(prev => [...prev, ...validFiles]);
          if (validFiles.length === 1 && !photoData.title) {
            setPhotoData(prev => ({
              ...prev,
              title: prev.title || validFiles[0].fileName.split('.')[0]
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error picking photos:', error);
      Alert.alert('Error', 'Failed to pick photos');
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

        setSelectedFiles(prev => [...prev, file]);
        if (!photoData.title) {
          setPhotoData(prev => ({
            ...prev,
            title: prev.title || `Photo - ${new Date().toLocaleTimeString()}`
          }));
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (tagInput.trim() && !photoData.tags.includes(tagInput.trim())) {
      setPhotoData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setPhotoData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      Alert.alert('No Files Selected', `Please select at least one ${isShayari ? 'photo for shayari' : 'photo'}`);
      return;
    }

    if (!photoData.title.trim()) {
      Alert.alert('Missing Content', `Please enter ${isShayari ? 'shayari text' : 'a title'} for your ${isShayari ? 'shayari' : 'photos'}`);
      return;
    }

    // UI Component - Delegate to Bridge Controller
    if (onUpload) {
      // Bridge controls the upload - Send first file URI and metadata
      await onUpload(selectedFiles[0]?.uri || '', {
        ...photoData,
        size: selectedFiles[0].size,
        type: selectedFiles[0].mimeType || 'image/jpeg',
        name: selectedFiles[0].name
      });
    } else {
      // Fallback for standalone usage
      setInternalUploading(true);
      try {
        await uploadPhotosDirectly(selectedFiles, photoData, isShayari);
        Alert.alert('Success', `${isShayari ? 'Shayari' : 'Photo'} uploaded successfully to Kronop!`);
        onClose();
        router.replace('/');
      } catch (error: any) {
        console.error('Photo upload failed:', error);
        Alert.alert('Upload Failed', error.message || 'Failed to upload photos');
      } finally {
        setInternalUploading(false);
      }
    }
  };

  // Direct Upload Function for Photos
  const uploadPhotosDirectly = async (files: any[], metadata: any, isShayari: boolean = false) => {
    const BUNNY_API_KEY = process.env.EXPO_PUBLIC_BUNNY_API_KEY || '';
    const BUNNY_STORAGE_ZONE = process.env.EXPO_PUBLIC_BUNNY_STORAGE_ZONE || 'kronop';
    
    const uploadResults = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Create FormData for direct upload
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          type: file.mimeType || 'image/jpeg',
          name: file.fileName || `photo_${Date.now()}.jpg`
        } as any);
        
        // Add metadata
        const uploadMetadata = {
          ...metadata,
          userId: 'guest_user',
          uploadId: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          appName: 'Kronop',
          timestamp: Date.now(),
          isShayari,
          index: i
        };
        
        Object.keys(uploadMetadata).forEach(key => {
          formData.append(key, uploadMetadata[key]);
        });
        
        // Upload directly to BunnyCDN
        const fileName = `kronop_photo_${uploadMetadata.uploadId}_${file.fileName || 'image.jpg'}`;
        const bunnyUrl = `https://storage.bunnycdn.net/${BUNNY_STORAGE_ZONE}/${fileName}`;
        
        const response = await fetch(bunnyUrl, {
          method: 'PUT',
          headers: {
            'AccessKey': BUNNY_API_KEY,
            'Content-Type': 'image/jpeg'
          },
          body: file
        });
        
        if (!response.ok) {
          throw new Error(`BunnyCDN upload failed: ${response.status}`);
        }
        
        const result = {
          url: `https://${BUNNY_STORAGE_ZONE}.b-cdn.net/${fileName}`,
          id: fileName,
          metadata: uploadMetadata,
          success: true
        };
        
        uploadResults.push(result);
        console.log(`Photo ${i + 1}/${files.length} uploaded successfully`);
        
      } catch (error: any) {
        console.error(`Photo ${i + 1} upload failed:`, error);
        uploadResults.push({
          success: false,
          error: error.message,
          file: file.fileName
        });
      }
    }
    
    // Check if all uploads succeeded
    const failedUploads = uploadResults.filter(r => !r.success);
    if (failedUploads.length > 0) {
      throw new Error(`${failedUploads.length} photos failed to upload`);
    }
    
    console.log('Photo upload completed:', uploadResults);
    return uploadResults;
  };

  const renderSelectedFile = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.selectedFileItem}>
      <Image 
        source={{ uri: item.uri }} 
        style={styles.selectedFileImage} 
        onLoad={() => console.log('[PHOTO_UPLOAD]: Image loaded successfully:', item.uri)}
        onError={(error) => console.error('[PHOTO_UPLOAD]: Image failed to load:', error)}
      />
      <TouchableOpacity
        style={styles.removeFileButton}
        onPress={() => removeFile(index)}
      >
        <MaterialIcons name="close" size={20} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.selectedFileName} numberOfLines={1}>
        {item.fileName}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <View style={styles.placeholder} />
        <View style={styles.placeholder} />
      </View>

      <View style={styles.uploadArea}>
        <View style={styles.uploadButtonsRow}>
          <TouchableOpacity 
            style={[styles.uploadButton, styles.galleryButton]}
            onPress={pickPhotos}
            disabled={uploading}
          >
            <MaterialIcons name="photo-library" size={24} color="#6A5ACD" />
            <Text style={styles.uploadButtonText}>Gallery</Text>
            <Text style={styles.uploadButtonSubtext}>Choose multiple</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.uploadButton, styles.cameraButton]}
            onPress={takePhoto}
            disabled={uploading}
          >
            <MaterialIcons name="photo-camera" size={24} color="#6A5ACD" />
            <Text style={styles.uploadButtonText}>Camera</Text>
            <Text style={styles.uploadButtonSubtext}>Take photo</Text>
          </TouchableOpacity>
        </View>

        {selectedFiles.length > 0 && (
          <View style={styles.selectedFilesContainer}>
            <Text style={styles.selectedFilesTitle}>
              Selected {isShayari ? 'Photo' : 'Photos'} ({selectedFiles.length})
            </Text>
            <FlatList
              data={selectedFiles}
              renderItem={renderSelectedFile}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.selectedFilesList}
            />
          </View>
        )}
      </View>

      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isShayari ? 'Shayari Text *' : 'Title *'}</Text>
          <TextInput
            style={[styles.input, isShayari && styles.textArea]}
            value={photoData.title}
            onChangeText={(text) => setPhotoData(prev => ({ ...prev, title: text }))}
            placeholder={isShayari ? 'Write your beautiful shayari here...' : 'Enter photo title...'}
            placeholderTextColor="#666"
            maxLength={isShayari ? 500 : 100}
            multiline={isShayari}
            numberOfLines={isShayari ? 6 : 1}
            textAlignVertical={isShayari ? 'top' : 'auto'}
          />
          <Text style={styles.charCount}>{photoData.title.length}/{isShayari ? 500 : 100}</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  photoData.category === category && styles.categoryChipSelected
                ]}
                onPress={() => setPhotoData(prev => ({ ...prev, category }))}
              >
                <Text style={[
                  styles.categoryChipText,
                  photoData.category === category && styles.categoryChipTextSelected
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
          
          {photoData.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {photoData.tags.map((tag, index) => (
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
        style={[styles.uploadButtonMain, (uploading || internalUploading) && styles.uploadButtonDisabled]}
        onPress={handleUpload}
        disabled={(uploading || internalUploading) || selectedFiles.length === 0}
      >
        {(uploading || internalUploading) ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.uploadButtonText}>
              {uploading ? `Uploading... ${uploadProgress}%` : 'Uploading...'}
            </Text>
          </>
        ) : (
          <>
            <MaterialIcons name="upload" size={24} color="#FFFFFF" />
            <Text style={styles.uploadButtonText}>Upload {isShayari ? 'Shayari' : 'Photos'}</Text>
          </>
        )}
      </TouchableOpacity>
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
    borderColor: '#333333',
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
  selectedFilesContainer: {
    marginTop: 16,
  },
  selectedFilesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  selectedFilesList: {
    marginTop: 8,
  },
  selectedFileItem: {
    alignItems: 'center',
    marginRight: 12,
    width: 80,
  },
  selectedFileImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
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
  selectedFileName: {
    fontSize: 10,
    color: '#CCCCCC',
    marginTop: 4,
    textAlign: 'center',
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
  textArea: {
    height: 100,
    paddingTop: 12,
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
    fontSize: 12,
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
