import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
// import { useSWRContent } from '../../hooks/swr'; // Removed - hooks folder deleted
// import PhotoPlayer from './photo'; // Removed - PhotoPlayer component doesn't exist

const { width: SCREEN_WIDTH } = require('react-native').Dimensions.get('window');

interface ContentItem {
  id: string;
  user_id: string;
  title: string;
  description: string;
  image_url?: string;
  text?: string;
  thumbnail_url?: string;
  created_at: string;
  likes_count: number;
  tags: string[];
  is_public: boolean;
  user?: {
    username: string;
    avatar_url: string;
  };
}

type ContentType = 'Photo' | 'ShayariPhoto';

function PhotoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [contentType, setContentType] = useState<ContentType>('Photo');
  
  // const { data: photos, loading, error, refresh } = useSWRContent('Photo', 1, 50); // Removed - using mock data
  // const { data: shayariData, loading: shayariLoading, error: shayariError, refresh: refreshShayari } = useSWRContent('ShayariPhoto', 1, 50); // Removed - using mock data
  
  // Mock data
  const [photos, setPhotos] = useState([]);
  const [shayariData, setShayariData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shayariLoading, setShayariLoading] = useState(false);
  const [shayariError, setShayariError] = useState(null);
  
  const refresh = () => {
    setLoading(true);
    setTimeout(() => {
      setPhotos([]);
      setLoading(false);
    }, 500);
  };
  
  const refreshShayari = () => {
    setShayariLoading(true);
    setTimeout(() => {
      setShayariData([]);
      setShayariLoading(false);
    }, 500);
  };

  const handleContentPress = (content: ContentItem) => {
    setSelectedContent(content);
    setIsViewerVisible(true);
    setCurrentZoom(1);
    if (content.text) {
      setContentType('ShayariPhoto');
    } else {
      setContentType('Photo');
    }
  };

  const handleCloseViewer = () => {
    setIsViewerVisible(false);
    setSelectedContent(null);
    setCurrentZoom(1);
  };

  const handleZoomIn = () => {
    setCurrentZoom(prev => Math.min(prev + 0.5, 5));
  };

  const handleZoomOut = () => {
    setCurrentZoom(prev => Math.max(prev - 0.5, 1));
  };

  const toggleContentType = () => {
    setContentType(prev => prev === 'Photo' ? 'ShayariPhoto' : 'Photo');
  };

  const allContent = contentType === 'Photo' ? photos : shayariData;

  if (loading || shayariLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      </View>
    );
  }

  if (error || shayariError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={theme.colors.error} />
          <Text style={styles.errorText}>{error || shayariError}</Text>
          <Text style={styles.errorSubtext}>Check your connection</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gallery</Text>
        
        {/* Content Type Toggle */}
        <View style={styles.contentTypeToggle}>
          <TouchableOpacity 
            style={[styles.toggleButton, contentType === 'Photo' && styles.toggleButtonActive]}
            onPress={toggleContentType}
          >
            <MaterialIcons name="photo-camera" size={20} color={contentType === 'Photo' ? theme.colors.primary.main : theme.colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, contentType === 'ShayariPhoto' && styles.toggleButtonActive]}
            onPress={toggleContentType}
          >
            <MaterialIcons name="menu-book" size={20} color={contentType === 'ShayariPhoto' ? theme.colors.primary.main : theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.placeholder} />
      </View>

      {/* Content Grid */}
      <ScrollView style={styles.contentGrid}>
        {allContent?.map((content: ContentItem, index: number) => (
          <TouchableOpacity 
            key={content.id}
            style={styles.contentItem}
            onPress={() => handleContentPress(content)}
          >
            {contentType === 'Photo' ? (
              <Image 
                source={{ uri: content.image_url }}
                style={styles.photoThumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.shayariThumbnail}>
                <MaterialIcons name="menu-book" size={32} color={theme.colors.text.secondary} />
                <Text style={styles.shayariTitle} numberOfLines={2}>
                  {content.title || 'Untitled'}
                </Text>
              </View>
            )}
            
            <View style={styles.contentOverlay}>
              <View style={styles.contentInfo}>
                <Text style={styles.contentTitle} numberOfLines={2}>
                  {content.title || 'Untitled'}
                </Text>
                
                <View style={styles.contentMeta}>
                  <View style={styles.metaItem}>
                    <MaterialIcons name="favorite-border" size={14} color="#fff" />
                    <Text style={styles.metaText}>
                      {content.likes_count?.toLocaleString('en-US') || 0}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.channelName}>
                  {content.user?.username || 'Unknown'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content Viewer Modal */}
      {isViewerVisible && selectedContent && (
        <View style={styles.viewerModal}>
          <View style={styles.viewerOverlay}>
            <TouchableOpacity style={styles.closeViewerButton} onPress={handleCloseViewer}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.viewerContainer}>
              <Image 
                source={{ uri: selectedContent.image_url }}
                style={[styles.viewerImage, { transform: [{ scale: currentZoom }] }]}
                resizeMode="contain"
              />
            </View>
            
            <View style={styles.viewerControls}>
              <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
                <MaterialIcons name="zoom-out" size={24} color="#fff" />
              </TouchableOpacity>
              
              <Text style={styles.zoomText}>
                {Math.round(currentZoom * 100)}%
              </Text>
              
              <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
                <MaterialIcons name="zoom-in" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 18,
    color: theme.colors.error,
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  contentTypeToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.elevated,
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 8,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary.main,
  },
  placeholder: {
    width: 40,
  },
  contentGrid: {
    flex: 1,
    padding: 16,
  },
  contentItem: {
    width: (SCREEN_WIDTH - 32) / 3,
    height: (SCREEN_WIDTH - 32) / 3,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: theme.colors.background.elevated,
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  shayariThumbnail: {
    width: '100%',
    height: 100,
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shayariTitle: {
    color: theme.colors.text.primary,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
  },
  contentInfo: {
    alignItems: 'flex-end',
  },
  contentTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  contentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: '#fff',
    fontSize: 11,
    marginLeft: 4,
  },
  channelName: {
    color: '#ccc',
    fontSize: 10,
  },
  viewerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  closeViewerButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  viewerContainer: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 0.9,
    backgroundColor: '#000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerControls: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  zoomText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PhotoScreen;
