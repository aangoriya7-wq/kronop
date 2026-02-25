import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../constants/theme';
import profileService from '../services/profileService';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Form states
  const [displayName, setDisplayName] = useState('John Doe');
  const [username, setUsername] = useState('johndoe');
  const [bio, setBio] = useState('Content Creator | Photography Enthusiast | Travel Lover');
  const [badge, setBadge] = useState('Photographers of Kronop');
  const [avatar, setAvatar] = useState('https://picsum.photos/80/80?random=profile');
  const [loading, setLoading] = useState(false);

  // Validation
  const validateForm = () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name is required');
      return false;
    }
    if (!username.trim()) {
      Alert.alert('Error', 'Username is required');
      return false;
    }
    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return false;
    }
    if (bio.length > 150) {
      Alert.alert('Error', 'Bio must be less than 150 characters');
      return false;
    }
    return true;
  };

  // Image picker
  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please grant photo library access to upload profile picture');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Save profile
  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Test connection first
      const connectionTest = await profileService.testConnection();
      
      if (!connectionTest.success) {
        Alert.alert('Connection Error', 'Unable to connect to server. Please check your internet connection and try again.');
        return;
      }

      // Prepare profile data
      const profileData = {
        displayName,
        username,
        bio,
        badge,
        avatar
      };

      // Update profile using service
      const result = await profileService.updateProfile(profileData);

      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully!');
        router.back();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel
  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerButton} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary.main} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <TouchableOpacity onPress={handlePickImage} style={styles.photoContainer}>
            <Image source={{ uri: avatar }} style={styles.profilePhoto} />
            <View style={styles.editPhotoOverlay}>
              <MaterialIcons name="camera-alt" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Change Profile Photo</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Display Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your display name"
              placeholderTextColor={theme.colors.text.tertiary}
              maxLength={50}
            />
            <Text style={styles.charCount}>{displayName.length}/50</Text>
          </View>

          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.usernameContainer}>
              <Text style={styles.atSymbol}>@</Text>
              <TextInput
                style={[styles.input, styles.usernameInput]}
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                placeholderTextColor={theme.colors.text.tertiary}
                maxLength={30}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Text style={styles.charCount}>{username.length}/30</Text>
          </View>

          {/* Bio */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor={theme.colors.text.tertiary}
              multiline
              maxLength={150}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{bio.length}/150</Text>
          </View>

          {/* Badge */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Badge</Text>
            <TextInput
              style={styles.input}
              value={badge}
              onChangeText={setBadge}
              placeholder="Your professional badge"
              placeholderTextColor={theme.colors.text.tertiary}
              maxLength={50}
            />
            <Text style={styles.charCount}>{badge.length}/50</Text>
          </View>
        </View>

        {/* Additional Options */}
        <View style={styles.optionsSection}>
          <TouchableOpacity style={styles.optionItem}>
            <MaterialIcons name="link" size={24} color={theme.colors.text.secondary} />
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Add Links</Text>
              <Text style={styles.optionDescription}>Add external links to your profile</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <MaterialIcons name="verified" size={24} color={theme.colors.text.secondary} />
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Verification</Text>
              <Text style={styles.optionDescription}>Get verified badge</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.text.tertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  saveText: {
    fontSize: 16,
    color: theme.colors.primary.main,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Photo Section
  photoSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  photoContainer: {
    position: 'relative',
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background.primary,
  },
  changePhotoText: {
    fontSize: 14,
    color: theme.colors.primary.main,
    fontWeight: '500',
    marginTop: 12,
  },

  // Form Section
  formSection: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.secondary,
  },
  charCount: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    textAlign: 'right',
    marginTop: 4,
  },

  // Username Input
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: 12,
    backgroundColor: theme.colors.background.secondary,
  },
  atSymbol: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    paddingHorizontal: 16,
  },
  usernameInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },

  // Bio Input
  bioInput: {
    height: 100,
    paddingTop: 16,
  },

  // Options Section
  optionsSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  optionContent: {
    flex: 1,
    marginLeft: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
});
