import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../../constants/theme';
import profileService from '../../services/profileService';

const { width: screenWidth } = Dimensions.get('window');

// Define user data type
interface UserData {
  displayName: string;
  username: string;
  avatar: string;
  bio: string;
  badge: string;
  supporters: number;
  supporting: number;
  posts: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('reels');
  const [tabIndicatorPosition, setTabIndicatorPosition] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Profile states
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');

  // Content tabs
  const contentTabs = [
    { id: 'reels', label: 'Reels' },
    { id: 'video', label: 'Video' },
    { id: 'live', label: 'Live' },
    { id: 'photo', label: 'Photo' },
    { id: 'shayari', label: 'Shayari' },
    { id: 'songs', label: 'Songs' }
  ];

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setConnectionStatus('checking');
      
      // Test MongoDB connection first
      const connectionTest = await profileService.testConnection();
      
      if (!connectionTest.success) {
        setConnectionStatus('disconnected');
        // Use mock data when disconnected
        const mockData: UserData = {
          displayName: 'John Doe',
          username: '@johndoe',
          avatar: 'https://picsum.photos/80/80?random=profile',
          bio: 'Content Creator | Photography Enthusiast | Travel Lover',
          badge: 'Photographers of Kronop',
          supporters: 15420,
          supporting: 892,
          posts: 234
        };
        setUserData(mockData);
        return;
      }

      setConnectionStatus('connected');
      
      // Try to get profile from MongoDB
      const profileResult = await profileService.getProfile();
      
      if (profileResult.success) {
        setUserData(profileResult.data);
      } else if (profileResult.createNew) {
        // Create new profile if not found
        const newProfileData: UserData = {
          displayName: 'John Doe',
          username: 'johndoe',
          avatar: 'https://picsum.photos/80/80?random=profile',
          bio: 'Content Creator | Photography Enthusiast | Travel Lover',
          badge: 'Photographers of Kronop',
          supporters: 0,
          supporting: 0,
          posts: 0
        };
        
        const createResult = await profileService.createProfile(newProfileData);
        if (createResult.success) {
          setUserData(createResult.data);
        } else {
          throw new Error(createResult.error);
        }
      } else {
        throw new Error(profileResult.error);
      }
    } catch (error) {
      console.error('Load Profile Error:', error);
      setConnectionStatus('error');
      // Fallback to mock data
      const fallbackData: UserData = {
        displayName: 'John Doe',
        username: '@johndoe',
        avatar: 'https://picsum.photos/80/80?random=profile',
        bio: 'Content Creator | Photography Enthusiast | Travel Lover',
        badge: 'Photographers of Kronop',
        supporters: 15420,
        supporting: 892,
        posts: 234
      };
      setUserData(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };

  const handleShareProfile = () => {
    Alert.alert('Share Profile', 'Profile sharing feature coming soon!');
  };

  const handleTabPress = (tabId: string, index: number) => {
    setActiveTab(tabId);
    const tabWidth = 80;
    const indicatorPosition = 16 + (index * (tabWidth + 8));
    setTabIndicatorPosition(indicatorPosition);
    
    scrollViewRef.current?.scrollTo({ x: Math.max(0, indicatorPosition - 100), animated: true });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'reels':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.emptyText}>No reels yet</Text>
          </View>
        );
      case 'video':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.emptyText}>No videos yet</Text>
          </View>
        );
      case 'live':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.emptyText}>Not live right now</Text>
          </View>
        );
      case 'photo':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.emptyText}>No photos yet</Text>
          </View>
        );
      case 'shayari':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.emptyText}>No shayari yet</Text>
          </View>
        );
      case 'songs':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.emptyText}>No songs yet</Text>
          </View>
        );
      default:
        return null;
    }
  };

  // Connection status indicator
  const renderConnectionStatus = () => {
    if (connectionStatus === 'checking') {
      return (
        <View style={styles.statusIndicator}>
          <ActivityIndicator size="small" color={theme.colors.primary.main} />
          <Text style={styles.statusText}>Checking connection...</Text>
        </View>
      );
    } else if (connectionStatus === 'disconnected') {
      return (
        <View style={styles.statusIndicator}>
          <MaterialIcons name="wifi-off" size={16} color={theme.colors.text.tertiary} />
          <Text style={styles.statusText}>Offline Mode</Text>
        </View>
      );
    } else if (connectionStatus === 'error') {
      return (
        <View style={styles.statusIndicator}>
          <MaterialIcons name="error" size={16} color={theme.colors.error} />
          <Text style={styles.statusText}>Connection Error</Text>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.leftIcon}>
          <MaterialIcons name="bar-chart" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.rightIcon} onPress={() => router.push('/settings')}>
          <MaterialIcons name="settings" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Connection Status */}
      {renderConnectionStatus()}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {userData && (
          <>
            {/* User Info Section */}
            <View style={styles.userInfoSection}>
              <View style={styles.nameSection}>
                <Text style={styles.displayName}>{userData.displayName}</Text>
                <Text style={styles.username}>{userData.username}</Text>
              </View>
              <View style={styles.photoSection}>
                <View style={styles.photoContainer}>
                  <Image source={{ uri: userData.avatar }} style={styles.profilePhoto} />
                  <TouchableOpacity style={styles.addPhotoButton}>
                    <MaterialIcons name="add" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Bio and Badge */}
            <View style={styles.bioSection}>
              <Text style={styles.bio}>{userData.bio}</Text>
              <TouchableOpacity style={styles.badgeButton}>
                <Text style={styles.badgeText}>{userData.badge}</Text>
              </TouchableOpacity>
            </View>

            {/* Supporters Section */}
            <View style={styles.supportersSection}>
              <TouchableOpacity style={styles.supporterItem}>
                <Text style={styles.supporterNumber}>{userData.supporters.toLocaleString()}</Text>
                <Text style={styles.supporterLabel}>Supporters</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.supporterItem}>
                <Text style={styles.supporterNumber}>{userData.supporting.toLocaleString()}</Text>
                <Text style={styles.supporterLabel}>Supporting</Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
                <Text style={styles.actionButtonText}>Edit profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleShareProfile}>
                <Text style={styles.actionButtonText}>Share profile</Text>
              </TouchableOpacity>
            </View>

            {/* Content Tabs */}
            <View style={styles.tabsContainer}>
              <ScrollView 
                ref={scrollViewRef}
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsScroll}
              >
                {contentTabs.map((tab, index) => (
                  <TouchableOpacity
                    key={tab.id}
                    style={[
                      styles.tab,
                      activeTab === tab.id && styles.activeTab
                    ]}
                    onPress={() => handleTabPress(tab.id, index)}
                  >
                    <Text style={[
                      styles.tabText,
                      activeTab === tab.id && styles.activeTabText
                    ]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Active Tab Indicator */}
            <View style={[styles.tabIndicator, { left: tabIndicatorPosition }]} />

            {/* Content Area */}
            {renderContent()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginTop: 12,
  },

  // Connection Status
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: theme.colors.background.secondary,
    marginHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginLeft: 6,
  },

  // Top Bar
  topBar: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  leftIcon: {
    padding: 8,
  },
  rightIcon: {
    padding: 8,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // User Info Section
  userInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 20,
    paddingHorizontal: 16,
  },
  nameSection: {
    flex: 1,
    marginRight: 20,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  username: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    fontWeight: 'normal',
  },
  photoSection: {
    alignItems: 'flex-end',
  },
  photoContainer: {
    position: 'relative',
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  addPhotoButton: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background.primary,
  },

  // Bio and Badge
  bioSection: {
    marginTop: 10,
    paddingHorizontal: 16,
  },
  bio: {
    fontSize: 14,
    color: theme.colors.text.primary,
    lineHeight: 20,
    marginBottom: 8,
  },
  badgeButton: {
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  badgeText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },

  // Supporters Section
  supportersSection: {
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  supporterItem: {
    marginRight: 30,
    alignItems: 'center',
  },
  supporterNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  supporterLabel: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    marginTop: 20,
    paddingHorizontal: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 40,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },

  // Content Tabs
  tabsContainer: {
    marginTop: 20,
    position: 'relative',
    backgroundColor: theme.colors.background.primary,
  },
  tabsScroll: {
    paddingHorizontal: 16,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 8,
  },
  activeTab: {
    // Active tab styling (can be empty if using indicator)
  },
  tabText: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.colors.text.primary,
    fontWeight: '600',
  },

  // Tab Indicator
  tabIndicator: {
    height: 2,
    backgroundColor: theme.colors.text.primary,
    width: 60,
    position: 'absolute',
    bottom: 0,
  },

  // Content Area
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
  },
});
