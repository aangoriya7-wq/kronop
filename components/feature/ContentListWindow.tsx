import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Image
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
// import { reelsApi, photosApi, videosApi } from '../../services/api'; // Removed - services folder deleted

const { width, height } = Dimensions.get('window');

interface ContentItem {
  id: string;
  title: string;
  type: 'reel' | 'photo' | 'video' | 'shayari';
  thumbnail?: string;
  url?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  created_at: string;
  user?: any;
}

interface ContentListWindowProps {
  visible: boolean;
  onClose: () => void;
  contentType?: 'all' | 'reels' | 'photos' | 'videos' | 'shayari';
}

export default function ContentListWindow({ visible, onClose, contentType = 'all' }: ContentListWindowProps) {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState(contentType);

  const tabs = [
    { id: 'all', name: 'All', icon: 'apps' },
    { id: 'reels', name: 'Reels', icon: 'theaters' },
    { id: 'photos', name: 'Photos', icon: 'photo' },
    { id: 'videos', name: 'Videos', icon: 'videocam' },
    { id: 'shayari', name: 'Shayari', icon: 'format-quote' }
  ];

  useEffect(() => {
    if (visible) {
      loadContent(selectedTab);
    }
  }, [visible, selectedTab]);

  const loadContent = async (type: string) => {
    setLoading(true);
    try {
      let data: any[] = [];
      
      switch (type) {
        case 'reels':
          // const reelsData = await reelsApi.getUserReels(); // Removed - using AllReels
          data = []; // Temporarily empty - will use AllReels system
          break;
        case 'photos':
          const photosResponse = await fetch('http://localhost:3000/api/photos');
          const photosResult = await photosResponse.json();
          data = photosResult?.data || [];
          break;
        case 'videos':
          const videosResponse = await fetch('http://localhost:3000/api/videos');
          const videosResult = await videosResponse.json();
          data = videosResult?.data || [];
          break;
        case 'shayari':
          data = [];
          break;
        case 'all':
          // Load all content types
          const [photos, videos] = await Promise.all([
            // reelsApi.getUserReels().catch(() => []), // Removed - using AllReels
            fetch('http://localhost:3000/api/photos').then(res => res.json()).then(res => res?.data || []).catch(() => []),
            fetch('http://localhost:3000/api/videos').then(res => res.json()).then(res => res?.data || []).catch(() => []),
            Promise.resolve([])
          ]);
          data = [
            // Reels removed - now using AllReels system
            ...(Array.isArray(photos) ? photos.map((item: any) => ({ ...item, type: 'photo' })) : []),
            ...(Array.isArray(videos) ? videos.map((item: any) => ({ ...item, type: 'video' })) : [])
          ];
          break;
      }

      // Normalize data structure
      const normalizedData = data.map(item => ({
        id: item.id || item._id,
        title: item.title || 'Untitled',
        type: item.type || type.slice(0, -1), // Remove 's' from plural
        thumbnail: item.thumbnail || item.url || item.photo_url,
        url: item.url || item.videoUrl || item.photo_url,
        views: item.views || 0,
        likes: item.likes || 0,
        comments: item.comments || 0,
        shares: item.shares || 0,
        created_at: item.created_at || item.createdAt || new Date().toISOString(),
        user: item.user || item.user_profiles
      }));

      setContent(normalizedData);
    } catch (error) {
      console.error('Error loading content:', error);
      setContent([]);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1d ago';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const getTypeIcon = (type: string): keyof typeof MaterialIcons.glyphMap => {
    switch (type) {
      case 'reel': return 'theaters';
      case 'photo': return 'photo';
      case 'video': return 'videocam';
      case 'shayari': return 'format-quote';
      default: return 'video-library';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'reel': return '#9C27B0';
      case 'photo': return '#2196F3';
      case 'video': return '#FF9800';
      case 'shayari': return '#E91E63';
      default: return '#666';
    }
  };

  const renderContentItem = ({ item }: { item: ContentItem }) => (
    <View style={styles.contentItem}>
      <View style={styles.thumbnailContainer}>
        {item.thumbnail ? (
          <Image 
            source={{ uri: item.thumbnail }} 
            style={styles.thumbnail} 
            onLoad={() => console.log('[CONTENT_LIST]: Thumbnail loaded successfully:', item.thumbnail)}
            onError={(error) => console.error('[CONTENT_LIST]: Thumbnail failed to load:', error)}
          />
        ) : (
          <View style={[styles.placeholderThumbnail, { backgroundColor: getTypeColor(item.type) }]}>
            <MaterialIcons name={getTypeIcon(item.type)} size={40} color="#fff" />
          </View>
        )}
        
        {/* Type Badge */}
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) }]}>
          <MaterialIcons name={getTypeIcon(item.type)} size={12} color="#fff" />
        </View>
      </View>

      <View style={styles.contentInfo}>
        <Text style={styles.contentTitle} numberOfLines={2}>
          {item.title}
        </Text>
        
        <View style={styles.contentMeta}>
          <Text style={styles.contentDate}>{formatDate(item.created_at)}</Text>
          {item.user?.username && (
            <Text style={styles.contentUser}>@{item.user.username}</Text>
          )}
        </View>

        {/* Data Counts */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialIcons name="star" size={14} color="#FFD700" />
            <Text style={styles.statText}>{formatNumber(item.likes)}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="visibility" size={14} color="#4CAF50" />
            <Text style={styles.statText}>{formatNumber(item.views)}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="comment" size={14} color="#2196F3" />
            <Text style={styles.statText}>{formatNumber(item.comments)}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="share" size={14} color="#FF9800" />
            <Text style={styles.statText}>{formatNumber(item.shares)}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Content</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <FlatList
            horizontal
            data={tabs}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.tab,
                  selectedTab === item.id && styles.activeTab
                ]}
                onPress={() => setSelectedTab(item.id as 'all' | 'reels' | 'photos' | 'videos' | 'shayari')}
              >
                <MaterialIcons
                  name={item.icon as keyof typeof MaterialIcons.glyphMap}
                  size={16}
                  color={selectedTab === item.id ? "#fff" : "#999"}
                />
                <Text style={[
                  styles.tabText,
                  selectedTab === item.id && styles.activeTabText
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.tabsScrollContainer}
          />
        </View>

        {/* Content List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading content...</Text>
          </View>
        ) : content.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="video-library" size={64} color="#666" />
            <Text style={styles.emptyText}>No content found</Text>
            <Text style={styles.emptySubText}>Upload some content to see it here</Text>
          </View>
        ) : (
          <FlatList
            data={content}
            keyExtractor={(item) => item.id}
            renderItem={renderContentItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 34,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tabsScrollContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#222',
  },
  activeTab: {
    backgroundColor: '#FF4444',
  },
  tabText: {
    color: '#999',
    fontSize: 12,
    marginLeft: 6,
  },
  activeTabText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    marginTop: 10,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#999',
    fontSize: 18,
    marginTop: 20,
    fontWeight: '500',
  },
  emptySubText: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  listContainer: {
    padding: 20,
  },
  contentItem: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  contentTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  contentMeta: {
    marginBottom: 8,
  },
  contentDate: {
    color: '#999',
    fontSize: 12,
  },
  contentUser: {
    color: '#666',
    fontSize: 12,
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: '#ccc',
    fontSize: 11,
    marginLeft: 4,
  },
});
