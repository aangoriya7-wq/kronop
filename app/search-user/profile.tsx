import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  Alert,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Import your report and block modals
import ReportModal from './components/ReportModal';
import BlockModal from './components/BlockModal';

const mockUserData = {
  displayName: 'Aman Angoriya',
  username: 'johndoe',
  bio: 'Passionate about creating amazing content and connecting with people around the world.',
  avatar: 'https://picsum.photos/80/80?random=profile',
  coverPhoto: 'https://picsum.photos/400/150?random=cover',
  supporters: 0,
  supporting: 0,
  posts: 0,
  badge: 'Creator'
};

// Function to fetch user data from MongoDB
const fetchUserFromMongoDB = async (username: string) => {
  // TODO: Implement actual MongoDB fetch from Mango TV
  // For now, return mock data based on username
  console.log(`Fetching user data for ${username} from MongoDB Mango TV`);
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        displayName: username.charAt(0).toUpperCase() + username.slice(1).replace('_', ' '),
        username: username,
        bio: `Profile of ${username}. Data fetched from MongoDB Mango TV.`,
        avatar: `https://picsum.photos/80/80?random=${username}`,
        coverPhoto: `https://picsum.photos/400/150?random=${username}`,
        supporters: Math.floor(Math.random() * 1000),
        supporting: Math.floor(Math.random() * 100),
        posts: Math.floor(Math.random() * 50),
        badge: 'User'
      });
    }, 1000);
  });
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username?: string }>();
  const [userData, setUserData] = useState(mockUserData);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('video');
  
  // State for modals
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [blockModalVisible, setBlockModalVisible] = useState(false);

  const tabs = [
    { id: 'video', label: 'Video' },
    { id: 'reels', label: 'Reels' },
    { id: 'photo', label: 'Photo' },
    { id: 'live', label: 'Live' },
    { id: 'songs', label: 'Songs' },
  ];

  useEffect(() => {
    if (username) {
      loadUserData(username);
    } else {
      setUserData(mockUserData);
    }
  }, [username]);

  const loadUserData = async (userUsername: string) => {
    setLoading(true);
    try {
      const data = await fetchUserFromMongoDB(userUsername);
      setUserData(data as any);
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!username) {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const result = { success: true, data: mockUserData };
        
        if (result.success && result.data) {
          setUserData(result.data);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleShareProfile = () => {
    Alert.alert('Share Profile', 'Profile share functionality coming soon!');
  };

  const handleSupport = () => {
    Alert.alert(
      'Support',
      'How can we help you?',
      [
        { text: 'Report User', onPress: () => console.log('Report user') },
        { text: 'Block User', onPress: () => console.log('Block user') },
        { text: 'Contact Support', onPress: () => console.log('Contact support') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Report and Block handlers
  const handleReportPress = () => {
    setReportModalVisible(true);
  };

  const handleBlockPress = () => {
    setBlockModalVisible(true);
  };

  const handleReportSubmitted = (reportData: any) => {
    console.log('Report submitted:', reportData);
    Alert.alert('Success', 'User has been reported successfully');
  };

  const handleBlockConfirmed = (blockData: any) => {
    console.log('User blocked:', blockData);
    // You can add additional logic here like navigating away
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
      default:
        return null;
    }
  };

  if (loading && !userData) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#8B00FF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header with Report and Block Icons */}
      <View style={styles.header}>
        <Text style={styles.username}>Your Profile</Text>
        
        <View style={styles.headerIcons}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={handleReportPress}
            activeOpacity={0.7}
          >
            <MaterialIcons name="report" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={handleBlockPress}
            activeOpacity={0.7}
          >
            <MaterialIcons name="block" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Cover Photo */}
        <View style={styles.coverPhotoContainer}>
          <Image source={{ uri: userData.coverPhoto }} style={styles.coverPhoto} />
        </View>

        {/* User Info Section */}
        <View style={styles.userInfoSection}>
          <View style={styles.userTextContainer}>
            <Text style={styles.displayName}>{userData.displayName}</Text>
            <Text style={styles.usernameText}>@{userData.username}</Text>
            <Text style={styles.bio}>{userData.bio}</Text>
          </View>
          
          <View style={styles.profilePictureContainer}>
            <Image source={{ uri: userData.avatar }} style={styles.profilePicture} />
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.statsText}>
            {userData.supporters} supporters • {userData.supporting} supporting • {userData.posts} posts
          </Text>
        </View>

        {/* Share Button Only */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={[styles.button, styles.shareButton]} onPress={handleShareProfile}>
            <Text style={styles.buttonText}>Share Profile</Text>
          </TouchableOpacity>
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

      {/* Report Modal */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        username={userData.username}
        onReportSubmitted={handleReportSubmitted}
      />

      {/* Block Modal */}
      <BlockModal
        visible={blockModalVisible}
        onClose={() => setBlockModalVisible(false)}
        username={userData.username}
        onBlockConfirmed={handleBlockConfirmed}
      />
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
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  userInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    marginTop: -30,
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
  usernameText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  bio: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
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
  },
  statsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  shareButton: {
    backgroundColor: '#1A1A1A',
    borderColor: '#8B00FF',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
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
    // Active tab style if needed
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