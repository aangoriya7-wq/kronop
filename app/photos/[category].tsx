// app/photos/category-detail.tsx
import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, AntDesign, FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeScreen } from '../../components/layout';
import { theme } from '../../constants/theme';
import { Photo } from '../../types/photo';
import { getPhotosByCategory, getRelatedPhotos, photoCategories } from '../../services/photoService';
import CustomDiamondIcon from '../../components/icons/CustomDiamondIcon';

const { width, height } = Dimensions.get('window');

export default function CategoryDetailScreen() {
  const { category, photoId } = useLocalSearchParams<{ category: string; photoId: string }>();
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const categoryInfo = photoCategories.find(c => c.id === category);

  useEffect(() => {
    const loadPhotos = async () => {
      if (category) {
        const data = await getPhotosByCategory(category as any);
        setPhotos(data);
        
        // Find initial index based on photoId
        if (photoId) {
          const index = data.findIndex(photo => photo.id === photoId);
          if (index !== -1) {
            setCurrentIndex(index);
          }
        }
      }
    };
    loadPhotos();
  }, [category, photoId]);

  const handleSwipe = (index: number) => {
    setCurrentIndex(index);
  };

  const renderPhotoItem = ({ item, index }: { item: Photo; index: number }) => (
    <View style={[styles.fullScreenPhoto, { width }]}>
      <Image source={{ uri: item.url }} style={styles.fullImage} resizeMode="contain" />
      <View style={styles.photoInfoOverlay}>
        <View style={styles.userInfo}>
          <Image source={{ uri: item.userAvatar }} style={styles.userAvatar} />
          <Text style={styles.userName}>{item.userName}</Text>
        </View>
        <View style={styles.photoActions}>
          <TouchableOpacity style={styles.actionButton}>
            <CustomDiamondIcon size={24} color="#fff" />
            <Text style={styles.actionText}>{item.likes.toLocaleString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <AntDesign name="wechat-work" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="share" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="download" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeScreen edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          hitSlop={theme.hitSlop.md}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={theme.iconSize.lg} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <MaterialIcons 
            name={categoryInfo?.icon as any} 
            size={theme.iconSize.lg} 
            color="#fff" 
          />
          <Text style={styles.headerTitle}>{categoryInfo?.name || 'Photos'}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialIcons name="more-vert" size={theme.iconSize.lg} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {photos.length > 0 && (
        <>
          <FlatList
            data={photos}
            keyExtractor={item => item.id}
            renderItem={renderPhotoItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={currentIndex}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentIndex(index);
            }}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
          />

          {/* Photo Counter */}
          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {photos.length}
            </Text>
          </View>

          {/* Thumbnail Strip */}
          <View style={styles.thumbnailStrip}>
            <FlatList
              data={photos}
              keyExtractor={item => item.id}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.thumbnailContainer,
                    index === currentIndex && styles.activeThumbnail
                  ]}
                  onPress={() => {
                    setCurrentIndex(index);
                  }}
                >
                  <Image source={{ uri: item.url }} style={styles.thumbnail} />
                </TouchableOpacity>
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailList}
            />
          </View>
        </>
      )}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 50,
    paddingBottom: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerTitle: {
    color: '#fff',
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  headerButton: {
    padding: theme.spacing.xs,
  },
  fullScreenPhoto: {
    height: height,
    backgroundColor: '#000',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  photoInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.lg,
    paddingBottom: 100,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
  },
  userName: {
    color: '#fff',
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.sm,
  },
  counterContainer: {
    position: 'absolute',
    top: 120,
    right: theme.spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  counterText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  thumbnailStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: theme.spacing.sm,
  },
  thumbnailList: {
    paddingHorizontal: theme.spacing.sm,
  },
  thumbnailContainer: {
    marginHorizontal: 4,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeThumbnail: {
    borderColor: '#fff',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
});