import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const mockUserData = {
  displayName: 'John Doe',
  username: 'johndoe',
  bio: 'Passionate about creating amazing content and connecting with people around the world.',
  avatar: 'https://picsum.photos/80/80?random=profile',
  coverPhoto: 'https://picsum.photos/400/150?random=cover',
  supporters: 0,
  supporting: 0,
  posts: 0,
  badge: 'Creator'
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [userData, setUserData] = useState(mockUserData);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('video');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: '',
    username: '',
    bio: '',
    coverPhoto: ''
  });

  const tabs = [
    { id: 'video', label: 'Video' },
    { id: 'reels', label: 'Reels' },
    { id: 'photo', label: 'Photo' },
    { id: 'live', label: 'Live' },
    { id: 'songs', label: 'Songs' },
    { id: 'save', label: 'Save' }
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      // const result = await profileService.fetchProfile(); // Removed - using mock data
      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      const result = { success: true, data: mockUserData };
      
      if (result.success && result.data) {
        setUserData(result.data);
        setEditData({
          displayName: result.data.displayName || '',
          username: result.data.username || '',
          bio: result.data.bio || '',
          coverPhoto: result.data.coverPhoto || ''
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setEditData({
      displayName: userData.displayName,
      username: userData.username,
      bio: userData.bio,
      coverPhoto: userData.coverPhoto || ''
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      const result = { success: true };
      
      if (result.success) {
        setUserData(prev => ({
          ...prev,
          ...editData
        }));
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update profile'); // Removed result.error since mock doesn't have it
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleShareProfile = () => {
    Alert.alert('Share Profile', 'Profile share functionality coming soon!');
  };

  const handleSettingsPress = () => {
    router.push('/settings' as any);
  };

  const handleVerificationPress = () => {
    router.push('/verification' as any);
  };

  const handleSupporterPress = () => {
    // Open help center which uses GroqAIService
    router.push('/help-center' as any);
  };

  const handleMenuPress = () => {
    router.push('/menu' as any);
  };

  const pickImageFromGallery = async (isCover: boolean = false) => {
    try {
      // Request media library permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos to change your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: isCover ? [16, 9] : [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Basic validation
        const fileName = result.assets[0].fileName || '';
        const extension = fileName.split('.').pop()?.toLowerCase();
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        
        if (!extension || !allowedExtensions.includes(extension)) {
          Alert.alert('Invalid File', 'Please select a valid image file. Allowed: JPG, PNG, GIF, WebP');
          return;
        }

        // File size validation
        const MAX_SIZE = isCover ? 5 * 1024 * 1024 : 2 * 1024 * 1024; // 5MB for cover, 2MB for logo
        if (result.assets[0].fileSize && result.assets[0].fileSize > MAX_SIZE) {
          Alert.alert('File Too Large', `Image file must be less than ${isCover ? '5MB' : '2MB'}`);
          return;
        }

        // Update the appropriate image
        if (isCover) {
          setEditData(prev => ({ ...prev, coverPhoto: imageUri }));
          setUserData(prev => ({ ...prev, coverPhoto: imageUri }));
        } else {
          setUserData(prev => ({ ...prev, avatar: imageUri }));
        }

        Alert.alert('Success', `${isCover ? 'Cover photo' : 'Profile picture'} updated successfully!`);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'video':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.emptyText}>No videos yet</Text>
          </View>
        );
      case 'reels':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.emptyText}>No reels yet</Text>
          </View>
        );
      case 'photo':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.emptyText}>No photos yet</Text>
          </View>
        );
      case 'live':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.emptyText}>No live streams yet</Text>
          </View>
        );
      case 'songs':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.emptyText}>No songs yet</Text>
          </View>
        );
      case 'save':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.emptyText}>No saved items yet</Text>
          </View>
        );
      default:
        return null;
    }
  };

  if (loading && !userData) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.iconButton} onPress={handleMenuPress}>
            <Ionicons name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.username}>Your Profile</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton} onPress={handleSupporterPress}>
            <FontAwesome6 name="headset" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleVerificationPress}>
            <FontAwesome6 name="chess-queen" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleSettingsPress}>
            <Ionicons name="settings" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Cover Photo */}
        <TouchableOpacity 
          style={styles.coverPhotoContainer}
          onPress={() => isEditing && pickImageFromGallery(true)}
          disabled={!isEditing}
        >
          <Image source={{ uri: userData.coverPhoto }} style={styles.coverPhoto} />
          {isEditing && (
            <TouchableOpacity style={styles.changeCoverButton} onPress={() => pickImageFromGallery(true)}>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.changeCoverText}>Change Cover</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* User Info Section */}
        <View style={styles.userInfoSection}>
          <View style={styles.userTextContainer}>
            {isEditing ? (
              <>
                <TextInput
                  style={styles.displayNameInput}
                  value={editData.displayName}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, displayName: text }))}
                  placeholder="Display Name"
                  placeholderTextColor="#999"
                />
                <TextInput
                  style={styles.usernameInput}
                  value={editData.username}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, username: text }))}
                  placeholder="@username"
                  placeholderTextColor="#999"
                />
                <TextInput
                  style={styles.bioInput}
                  multiline
                  value={editData.bio}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, bio: text }))}
                  placeholder="Write your bio..."
                  placeholderTextColor="#999"
                  textAlignVertical="top"
                />
              </>
            ) : (
              <>
                <Text style={styles.displayName}>{userData.displayName}</Text>
                <Text style={styles.usernameText}>@{userData.username}</Text>
                <Text style={styles.bio}>{userData.bio}</Text>
              </>
            )}
          </View>
          
          <View style={styles.profilePictureContainer}>
            <TouchableOpacity onPress={() => isEditing && pickImageFromGallery(false)} disabled={!isEditing}>
              <Image source={{ uri: userData.avatar }} style={styles.profilePicture} />
            </TouchableOpacity>
            {isEditing && (
              <TouchableOpacity style={styles.changePhotoButton} onPress={() => pickImageFromGallery(false)}>
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.statsText}>{userData.supporters} supporters • {userData.supporting} supporting • {userData.posts} posts</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          {isEditing ? (
            <>
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]} 
                onPress={handleSaveProfile}
                disabled={loading}
              >
                <Text style={[styles.buttonText, styles.saveButtonText]}>
                  {loading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={[styles.button, styles.editButton]} onPress={handleEditProfile}>
                <Text style={styles.buttonText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.shareButton]} onPress={handleShareProfile}>
                <Text style={styles.buttonText}>Share Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Tabs Section */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  activeTab === tab.id && styles.activeTab
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === tab.id && styles.activeTabText
                ]}>
                  {tab.label}
                </Text>
                {activeTab === tab.id && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        {renderTabContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  iconButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  coverPhotoContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeCoverButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 0, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  changeCoverText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  userInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    marginTop: -25,
  },
  userTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  displayNameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#8B00FF',
    paddingBottom: 2,
  },
  usernameText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  usernameInput: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#8B00FF',
    paddingBottom: 2,
  },
  bio: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  bioInput: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    borderWidth: 1,
    borderColor: '#8B00FF',
    borderRadius: 8,
    padding: 8,
    minHeight: 60,
    textAlignVertical: 'top',
    backgroundColor: '#1A1A1A',
  },
  profilePictureContainer: {
    position: 'relative',
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#000000',
    backgroundColor: '#1A1A1A',
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B00FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  statsSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  statsText: {
    fontSize: 14,
    color: '#666666',
  },
  buttonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  button: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#1A1A1A',
    borderColor: '#8B00FF',
  },
  shareButton: {
    backgroundColor: '#1A1A1A',
    borderColor: '#8B00FF',
  },
  saveButton: {
    backgroundColor: '#8B00FF',
    borderColor: '#8B00FF',
  },
  cancelButton: {
    backgroundColor: '#1A1A1A',
    borderColor: '#8B00FF',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButtonText: {
    color: '#FFFFFF',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
  },
  activeTab: {
    // Active tab styling handled by indicator
  },
  tabText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: '#8B00FF',
  },
  contentContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
  },
});
