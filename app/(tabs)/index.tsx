import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Platform, Modal, Dimensions, TextInput, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { StoryViewer, StorySection } from '../../Apptepbar/Story';
import { theme } from '../../constants/theme';
import { useAlert } from '../../template';
// import { Story } from '../../types/story'; // Removed - types folder deleted
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import StatusBarOverlay from '../../components/common/StatusBarOverlay';
import AppLogo from '../../components/common/AppLogo';
import HeaderButton from '../../components/common/HeaderButton';
import StoryUpload from '../../components/upload/StoryUpload';
import PhotoUpload from '../../components/upload/PhotoUpload';
import VideoUpload from '../../components/upload/VideoUpload';
import ReelsUpload from '../../components/upload/ReelsUpload';
import LiveUpload from '../../components/upload/LiveUpload';
import SongUpload from '../../components/upload/SongUpload';

// Bridge imports
import BridgeStory from '../../components/uploadBridge/bridge-story';
import BridgePhoto from '../../components/uploadBridge/bridge-photo';
import BridgeReels from '../../components/uploadBridge/bridge-reels';
import BridgeVideo from '../../components/uploadBridge/bridge-video';
import BridgeLive from '../../components/uploadBridge/bridge-live';
import BridgeSongs from '../../components/uploadBridge/bridge-music';

// Photo categories - TEXT ONLY, HORIZONTAL SCROLL WITH PROPER FILTERING
const PHOTO_CATEGORIES = [
  { id: 'all', name: 'All', keywords: [] },
  { id: 'girls', name: 'Girls', keywords: ['girl', 'girls', 'woman', 'women', 'female', 'lady'] },
  { id: 'boys', name: 'Boys', keywords: ['boy', 'boys', 'man', 'men', 'male', 'guy'] },
  { id: 'children', name: 'Children', keywords: ['child', 'children', 'kid', 'kids', 'baby', 'toddler'] },
  { id: 'family', name: 'Family', keywords: ['family', 'families', 'parents', 'relatives', 'together'] },
  { id: 'house', name: 'House', keywords: ['house', 'home', 'building', 'architecture', 'interior'] },
  { id: 'nature', name: 'Nature', keywords: ['nature', 'forest', 'tree', 'trees', 'landscape', 'outdoor'] },
  { id: 'animals', name: 'Animals', keywords: ['animal', 'animals', 'dog', 'cat', 'bird', 'pet', 'wildlife'] },
  { id: 'flowers', name: 'Flowers', keywords: ['flower', 'flowers', 'rose', 'bloom', 'garden', 'floral'] },
  { id: 'mountains', name: 'Mountains', keywords: ['mountain', 'mountains', 'hill', 'peak', 'summit'] },
  { id: 'food', name: 'Food', keywords: ['food', 'meal', 'dish', 'cuisine', 'cooking', 'restaurant'] },
  { id: 'travel', name: 'Travel', keywords: ['travel', 'vacation', 'trip', 'journey', 'destination'] },
  { id: 'sports', name: 'Sports', keywords: ['sport', 'sports', 'game', 'fitness', 'exercise', 'athlete'] },
  { id: 'fashion', name: 'Fashion', keywords: ['fashion', 'style', 'clothing', 'outfit', 'dress', 'designer'] },
  { id: 'cars', name: 'Cars', keywords: ['car', 'cars', 'vehicle', 'automobile', 'auto', 'driving'] },
  { id: 'technology', name: 'Technology', keywords: ['tech', 'technology', 'computer', 'phone', 'gadget', 'device'] },
];

// Grouped stories by user
interface GroupedStory {
  userId: string;
  userName: string;
  userAvatar: string;
  stories: any[];
  latestTimestamp: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets(); // Get safe area insets
  
  // Bottom sheet modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedUploadScreen, setSelectedUploadScreen] = useState<string | null>(null);
  

  // Stories state - Grouped by user
  const [groupedStories, setGroupedStories] = useState<GroupedStory[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [storyViewerVisible, setStoryViewerVisible] = useState(false);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<any[]>([]);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

  // Photo categories state - Vertical with infinite scroll
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryPhotos, setCategoryPhotos] = useState<any[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosLoadingMore, setPhotosLoadingMore] = useState(false);
  const [photosPage, setPhotosPage] = useState(1);
  const [hasMorePhotos, setHasMorePhotos] = useState(false);
  
  // Story upload loading state
  const [uploadingStory, setUploadingStory] = useState(false);

  // Load and group stories by user
  const loadStories = async () => {
    setStoriesLoading(true);
    try {
      // Use the new story service for grouped stories
      const result = await fetch('http://localhost:3000/api/stories');
      const data = await result.json();
      if (data.success) {
        setGroupedStories(data.data as any);
      } else {
        // Fallback to mock data if API fails
        const mockStories = [
          {
            userId: 'user1',
            userName: 'John Doe',
            userAvatar: 'https://via.placeholder.com/100',
            stories: [
              {
                id: 's1',
                userId: 'user1',
                userName: 'John Doe',
                userAvatar: 'https://via.placeholder.com/100',
                imageUrl: 'https://picsum.photos/1080x1920?random=1',
                timestamp: new Date().toISOString(),
                viewed: false
              }
            ],
            latestTimestamp: new Date().toISOString()
          },
          {
            userId: 'user2',
            userName: 'Jane Smith',
            userAvatar: 'https://via.placeholder.com/100',
            stories: [
              {
                id: 's2',
                userId: 'user2',
                userName: 'Jane Smith',
                userAvatar: 'https://via.placeholder.com/100',
                imageUrl: 'https://picsum.photos/1080x1920?random=2',
                timestamp: new Date().toISOString(),
                viewed: true
              }
            ],
            latestTimestamp: new Date().toISOString()
          },
          {
            userId: 'user3',
            userName: 'Mike Johnson',
            userAvatar: 'https://via.placeholder.com/100',
            stories: [
              {
                id: 's3',
                userId: 'user3',
                userName: 'Mike Johnson',
                userAvatar: 'https://via.placeholder.com/100',
                imageUrl: 'https://picsum.photos/1080x1920?random=3',
                timestamp: new Date().toISOString(),
                viewed: false
              }
            ],
            latestTimestamp: new Date().toISOString()
          },
          {
            userId: 'user4',
            userName: 'Sarah Williams',
            userAvatar: 'https://via.placeholder.com/100',
            stories: [
              {
                id: 's4',
                userId: 'user4',
                userName: 'Sarah Williams',
                userAvatar: 'https://via.placeholder.com/100',
                imageUrl: 'https://picsum.photos/1080x1920?random=4',
                timestamp: new Date().toISOString(),
                viewed: true
              }
            ],
            latestTimestamp: new Date().toISOString()
          },
          {
            userId: 'user5',
            userName: 'David Brown',
            userAvatar: 'https://via.placeholder.com/100',
            stories: [
              {
                id: 's5',
                userId: 'user5',
                userName: 'David Brown',
                userAvatar: 'https://via.placeholder.com/100',
                imageUrl: 'https://picsum.photos/1080x1920?random=5',
                timestamp: new Date().toISOString(),
                viewed: false
              }
            ],
            latestTimestamp: new Date().toISOString()
          },
          {
            userId: 'user6',
            userName: 'Emily Davis',
            userAvatar: 'https://via.placeholder.com/100',
            stories: [
              {
                id: 's6',
                userId: 'user6',
                userName: 'Emily Davis',
                userAvatar: 'https://via.placeholder.com/100',
                imageUrl: 'https://picsum.photos/1080x1920?random=6',
                timestamp: new Date().toISOString(),
                viewed: true
              }
            ],
            latestTimestamp: new Date().toISOString()
          }
        ];
        setGroupedStories(mockStories);
      }
    } catch (error) {
      console.error('HomeScreen: Failed to load stories:', error);
      // Silent fail with empty array
      setGroupedStories([]);
    } finally {
      setStoriesLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
    // Load initial photos for "All" category
    loadInitialPhotos();
  }, []);

  // Load initial photos
  const loadInitialPhotos = async () => {
    setPhotosLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/photos');
      const result = await response.json();
      const photos = result?.data || [];
      if (result && result.length > 0) {
        setCategoryPhotos(result);
        setHasMorePhotos(result.length > 20);
        setSelectedCategory('all'); // Default to "All" category
      }
    } catch (error) {
      console.error('Failed to load initial photos:', error);
      setCategoryPhotos([]);
    } finally {
      setPhotosLoading(false);
    }
  };

  const handleStoryPress = async (storyGroup: GroupedStory, storyIndex: number = 0) => {
    if (storyGroup.stories[0]?.id === 'add-story') {
      // Add new story
      await handleAddStory();
    } else {
      // View user's stories
      setSelectedStoryGroup(storyGroup.stories);
      setSelectedStoryIndex(storyIndex);
      setStoryViewerVisible(true);
    }
  };

  // Compressed header button handlers
  const handleNotificationPress = () => router.push('/notifications' as any);
  const handleSearchPress = () => router.push('/search-user' as any);
  const handleChatPress = () => router.push('/chat' as any);
  const handleUploadPress = () => setShowUploadModal(true);

  const handleUploadOptionPress = (option: string) => {
    setShowUploadModal(false);
    setSelectedUploadScreen(option);
  };

  // Add Story Handler
  const handleAddStory = async () => {
    if (uploadingStory) return;
    
    try {
      setUploadingStory(true);
      
      // Request media library permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        showAlert('Permission Required', 'Media library permission is needed to upload stories');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        aspect: [9, 16], // Story aspect ratio
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // TODO: Upload to backend when ready
        showAlert('Success', 'Story selected! Upload functionality will be available when backend is ready.');
      }
      
    } catch (error: any) {
      console.error('Story upload error:', error);
      showAlert('Error', error.message || 'Failed to upload story');
    } finally {
      setUploadingStory(false);
    }
  };

  const handleCategoryPress = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    setPhotosPage(1);
    setPhotosLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/photos');
      const result = await response.json();
      const photos = result?.data || [];
      if (result) {
        if (categoryId === 'all') {
          setCategoryPhotos(result);
          setHasMorePhotos(result.length > 20);
        } else {
          // Get keywords for selected category
          const category = PHOTO_CATEGORIES.find(cat => cat.id === categoryId);
          const keywords = category?.keywords || [categoryId];
          
          // Filter by category with keyword matching
          const filtered = result.filter((photo: any) => {
            const categoryMatch = photo.category?.toLowerCase() === categoryId.toLowerCase();
            const tagMatch = photo.tags?.some((tag: string) => 
              keywords.some(keyword => tag.toLowerCase().includes(keyword.toLowerCase()))
            );
            const titleMatch = keywords.some(keyword => 
              photo.title?.toLowerCase().includes(keyword.toLowerCase())
            );
            const descMatch = keywords.some(keyword => 
              photo.description?.toLowerCase().includes(keyword.toLowerCase())
            );
            
            return categoryMatch || tagMatch || titleMatch || descMatch;
          });
          
          setCategoryPhotos(filtered);
          setHasMorePhotos(filtered.length > 20);
        }
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setPhotosLoading(false);
    }
  };

  const loadMorePhotos = async () => {
    if (!hasMorePhotos || photosLoading || !selectedCategory) return;
    
    // Simulated pagination - in real app, would fetch from backend
    setPhotosPage(prev => prev + 1);
  };

  // Memoized photo item renderer
  const PhotoItem = memo(({ item }: { item: any }) => (
    <TouchableOpacity style={styles.photoItem} activeOpacity={0.8}>
      <Image 
        source={{ uri: item.photo_url }} 
        style={styles.photoImage}
        contentFit="cover"
      />
      <View style={styles.photoOverlay}>
        <Text style={styles.photoTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.photoMeta}>
          <View style={styles.photoStat}>
            <MaterialIcons name="favorite" size={14} color="#fff" />
            <Text style={styles.photoStatText}>{item.likes_count || 0}</Text>
          </View>
          <Text style={styles.photoUser}>{item.user_profiles?.username || 'Unknown'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  ));

  return (
    <View style={styles.container}>
      <StatusBarOverlay style="light" backgroundColor="#000000" />
      <View style={[styles.header, { paddingTop: 40 }]}>
        <Text style={styles.appTitle}>Kronop</Text>
        <View style={styles.headerActions}>
          <HeaderButton icon="notifications" onPress={handleNotificationPress} testID="notification-btn" />
          <HeaderButton icon="person-search" onPress={handleSearchPress} testID="search-btn" />
          <HeaderButton icon="chat-bubble" onPress={handleChatPress} testID="chat-btn" />
        </View>
      </View>

      <FlatList
        data={[]}
        keyExtractor={() => ''}
        renderItem={() => null}
        ListHeaderComponent={
          <>
            {/* Stories Section - Simple Horizontal Boxes */}
            <StorySection
              stories={groupedStories}
              loading={storiesLoading}
              onStoryPress={handleStoryPress}
            />

            {/* Photo Categories Section - HORIZONTAL SCROLL, TEXT ONLY */}
            <View style={styles.photoCategoriesContainer}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={PHOTO_CATEGORIES}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      selectedCategory === item.id && styles.categoryButtonActive
                    ]}
                    onPress={() => handleCategoryPress(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedCategory === item.id && styles.categoryButtonTextActive
                    ]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.categoriesScrollContainer}
              />
            </View>

            {/* Photos Section - Only Photos */}
            <View style={styles.photosSectionContainer}>
              <FlatList
                data={categoryPhotos}
                keyExtractor={(item, index) => `photo-${item.id || index}`}
                renderItem={({ item }) => <PhotoItem item={item} />}
                numColumns={3}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.photosGridContainer}
                onEndReached={loadMorePhotos}
                onEndReachedThreshold={0.5}
                ListFooterComponent={photosLoadingMore ? <ActivityIndicator color="#fff" style={{ marginTop: 20 }} /> : null}
                ListEmptyComponent={
                  !photosLoading ? (
                    <View style={styles.emptyPhotosContainer}>
                      <MaterialIcons name="photo-library" size={48} color="#666" />
                      <Text style={styles.emptyPhotosText}>No photos found</Text>
                    </View>
                  ) : null
                }
              />
            </View>
          </>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      {/* Story Viewer Modal */}
      <StoryViewer
        visible={storyViewerVisible}
        stories={selectedStoryGroup}
        initialIndex={selectedStoryIndex}
        onClose={() => setStoryViewerVisible(false)}
        onRefresh={loadStories}
      />

      {/* Upload Bottom Sheet Modal */}
      <Modal
        visible={showUploadModal}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUploadModal(false)}
        >
          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>Create</Text>
            
            <View style={styles.uploadOptions}>
              <TouchableOpacity 
                style={styles.uploadOption}
                onPress={() => handleUploadOptionPress('Story')}
              >
                <Ionicons name="book" size={24} color="#6A5ACD" />
                <Text style={styles.uploadOptionText}>Story</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.uploadOption}
                onPress={() => handleUploadOptionPress('Photo')}
              >
                <Ionicons name="image" size={24} color="#6A5ACD" />
                <Text style={styles.uploadOptionText}>Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.uploadOption}
                onPress={() => handleUploadOptionPress('Reels')}
              >
                <Ionicons name="film" size={24} color="#6A5ACD" />
                <Text style={styles.uploadOptionText}>Reels</Text>
              </TouchableOpacity>
              
                            <TouchableOpacity 
                style={styles.uploadOption}
                onPress={() => handleUploadOptionPress('Video')}
              >
                <Ionicons name="videocam" size={24} color="#6A5ACD" />
                <Text style={styles.uploadOptionText}>Video</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.uploadOption}
                onPress={() => handleUploadOptionPress('Live')}
              >
                <Ionicons name="radio" size={24} color="#6A5ACD" />
                <Text style={styles.uploadOptionText}>Live</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.uploadOption}
                onPress={() => handleUploadOptionPress('Song')}
              >
                <Ionicons name="musical-notes" size={24} color="#6A5ACD" />
                <Text style={styles.uploadOptionText}>Song</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>


      {/* Upload Screens Modal */}
      <Modal
        visible={!!selectedUploadScreen}
        animationType="none"
        onRequestClose={() => setSelectedUploadScreen(null)}
      >
        <View style={styles.fullScreenUploadContainer}>
          {/* Header with Close Button */}
          <View style={styles.uploadModalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSelectedUploadScreen(null)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            
            <Text style={styles.uploadModalTitle}>
              {selectedUploadScreen === 'Story' && 'Story Upload'}
              {selectedUploadScreen === 'Photo' && 'Photo Upload'}
              {selectedUploadScreen === 'Reels' && 'Reels Upload'}
              {selectedUploadScreen === 'Video' && 'Video Upload'}
              {selectedUploadScreen === 'Live' && 'Live Upload'}
              {selectedUploadScreen === 'Song' && 'Song Upload'}
            </Text>
            
            <View style={styles.placeholder} />
          </View>
          
          {/* Upload Screen Content */}
          <View style={styles.uploadScreenContainer}>
            {selectedUploadScreen === 'Story' && <BridgeStory onClose={() => setSelectedUploadScreen(null)} />}
            {selectedUploadScreen === 'Photo' && <BridgePhoto onClose={() => setSelectedUploadScreen(null)} />}
            {selectedUploadScreen === 'Reels' && <BridgeReels onClose={() => setSelectedUploadScreen(null)} />}
            {selectedUploadScreen === 'Video' && <BridgeVideo onClose={() => setSelectedUploadScreen(null)} />}
            {selectedUploadScreen === 'Live' && <BridgeLive onClose={() => setSelectedUploadScreen(null)} />}
            {selectedUploadScreen === 'Song' && <BridgeSongs onClose={() => setSelectedUploadScreen(null)} />}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2, // Reduced from theme.spacing.xs (4px) to 2px for tighter spacing
  },
  // Photo Categories - HORIZONTAL SCROLL, TEXT ONLY
  photoCategoriesContainer: {
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  sectionTitle: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  categoriesScrollContainer: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  categoryButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  categoryButtonActive: {
    // No background, only text color will change
  },
  categoryButtonText: {
    fontSize: theme.typography.fontSize.md, // Increased from sm to md
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  categoryButtonTextActive: {
    color: '#8B00FF', // Purple color for selected category
    fontWeight: theme.typography.fontWeight.bold,
  },

  inlinePhotosContainer: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  photosLoadingContainer: {
    paddingVertical: theme.spacing.xl * 2,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  emptyPhotosContainer: {
    paddingVertical: theme.spacing.xl * 2,
    alignItems: 'center',
  },
  emptyPhotosText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  photosGrid: {
    paddingBottom: theme.spacing.md,
  },
  photoRow: {
    gap: theme.spacing.sm,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  listContent: {
    paddingBottom: 90,
  },
  // Bottom Sheet Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#666666',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
  },
  uploadOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  uploadOption: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 15,
  },
  uploadOptionText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  // Photos Section Styles
  photosSectionContainer: {
    flex: 1,
    backgroundColor: '#000',
    minHeight: 400, // Increased height
  },
  photosGridContainer: {
    paddingVertical: theme.spacing.md, // Increased padding
    paddingHorizontal: theme.spacing.sm,
  },
  photoItem: {
    flex: 1,
    margin: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    aspectRatio: 1,
    position: 'relative',
    minHeight: 120, // Increased minimum height
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.xs,
    backgroundColor: 'transparent',
  },
  photoTitle: {
    color: '#fff',
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: 2,
  },
  photoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoStatText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.xs,
    marginLeft: 4,
  },
  photoUser: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: theme.typography.fontSize.xs,
  },
  // Upload Modal Styles
  fullScreenUploadContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  uploadModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 0,
    paddingTop: 20, // Minimum space - just for status bar
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadModalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  uploadScreenContainer: {
    flex: 1,
  },
});
