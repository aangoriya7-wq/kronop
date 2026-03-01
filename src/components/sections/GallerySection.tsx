import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GallerySectionProps {
  onImageSelected?: (uri: string) => void;
}

const GallerySection: React.FC<GallerySectionProps> = ({ onImageSelected }) => {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const openNativeGallery = () => {
    // Open native gallery directly
    Linking.openURL('content://media/external/images');
  };

  const openGalleryApp = () => {
    // Alternative: Try to open gallery app
    Alert.alert(
      'Open Gallery',
      'Gallery will open directly. Select photos and they will be available here.',
      [
        {
          text: 'Open Gallery',
          onPress: openNativeGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const removeImage = (index: number) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          onPress: () => {
            setSelectedImages(prev => prev.filter((_, i) => i !== index));
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderImage = ({ item, index }: { item: string; index: number }) => (
    <View style={styles.imageContainer}>
      <Image source={{ uri: item }} style={styles.image} />
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => removeImage(index)}
      >
        <Ionicons name="close-circle" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="images" size={24} color="#4A2C5F" />
        <Text style={styles.title}>Gallery</Text>
      </View>

      <TouchableOpacity style={styles.galleryButton} onPress={openGalleryApp}>
        <Ionicons name="image-outline" size={40} color="#4A2C5F" />
        <Text style={styles.buttonText}>Open Gallery</Text>
      </TouchableOpacity>

      {selectedImages.length > 0 && (
        <View style={styles.imagesList}>
          <Text style={styles.sectionTitle}>Selected Images ({selectedImages.length})</Text>
          <FlatList
            data={selectedImages}
            renderItem={renderImage}
            keyExtractor={(_, index) => index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imagesContainer}
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
  galleryButton: {
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
  imagesList: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  imagesContainer: {
    paddingRight: 16,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 10,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
});

export default GallerySection;
