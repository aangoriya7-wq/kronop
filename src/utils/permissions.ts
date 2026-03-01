import { Platform, Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

// Camera Permission
export const requestCameraPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Camera access is needed to take photos. Please enable it in settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    );
    return false;
  }
  return true;
};

// Gallery/Media Library Permission
export const requestGalleryPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Photo library access is needed to select images.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return false;
    }
  } else {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Storage access is needed to select files.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return false;
    }
  }
  return true;
};

// Files/Storage Permission
export const requestFilesPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    // For Android 13+, we use different permissions
    if (Platform.Version >= 33) {
      // Android 13+ uses READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, etc.
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Storage access is needed to select files.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return false;
      }
    } else {
      // For older Android
      // Document picker doesn't need permission, it uses system picker
      return true;
    }
  }
  return true;
};

// Pick Image from Camera
export const pickImageFromCamera = async (): Promise<string | null> => {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
  } catch (error) {
    console.error('Camera error:', error);
    Alert.alert('Error', 'Failed to open camera');
  }
  return null;
};

// Pick Image from Gallery
export const pickImageFromGallery = async (): Promise<string | null> => {
  const hasPermission = await requestGalleryPermission();
  if (!hasPermission) return null;

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
  } catch (error) {
    console.error('Gallery error:', error);
    Alert.alert('Error', 'Failed to open gallery');
  }
  return null;
};

// Pick Document from Files
export const pickDocument = async (): Promise<any | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (!result.canceled && result.assets[0]) {
      return {
        uri: result.assets[0].uri,
        name: result.assets[0].name,
        size: result.assets[0].size,
        mimeType: result.assets[0].mimeType,
      };
    }
  } catch (error) {
    console.error('Document picker error:', error);
    Alert.alert('Error', 'Failed to pick document');
  }
  return null;
};

// Read file content (for Drive simulation)
export const readFileContent = async (uri: string): Promise<string> => {
  try {
    const content = await FileSystem.readAsStringAsync(uri);
    return content;
  } catch (error) {
    console.error('File read error:', error);
    return '';
  }
};
