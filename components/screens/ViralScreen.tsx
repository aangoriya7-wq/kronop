import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import StatusBarOverlay from '../common/StatusBarOverlay';
import { theme } from '../../constants/theme';
import { API_BASE_URL } from '../../constants/network';

// Bunny CDN Optimization Service
class BunnyCDNOptimizer {
  private static instance: BunnyCDNOptimizer;
  private imageCache = new Map<string, string>();
  private preloadQueue: string[] = [];
  private isPreloading = false;

  static getInstance(): BunnyCDNOptimizer {
    if (!BunnyCDNOptimizer.instance) {
      BunnyCDNOptimizer.instance = new BunnyCDNOptimizer();
    }
    return BunnyCDNOptimizer.instance;
  }

  // Optimize image URL for Bunny CDN with lazy loading
  optimizeImageUrl(url: string, width: number, height: number, quality: number = 80): string {
    if (!url) return '';
    
    // Check cache first
    const cacheKey = `${url}-${width}x${height}-${quality}`;
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }

    // Bunny CDN transformation parameters
    let optimizedUrl = url;
    
    if (url.includes('b-cdn.net') || url.includes('cdn.bunny.net')) {
      // Add Bunny CDN optimization parameters
      const separator = url.includes('?') ? '&' : '?';
      optimizedUrl = `${url}${separator}width=${width}&height=${height}&quality=${quality}&format=webp&auto_optimize=true`;
    }

    // Cache the optimized URL
    this.imageCache.set(cacheKey, optimizedUrl);
    return optimizedUrl;
  }

  // Preload images for smooth scrolling
  async preloadImages(urls: string[]) {
    if (this.isPreloading) return;
    
    this.isPreloading = true;
    const batchSize = 3; // Preload 3 images at a time
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(url => 
          Image.prefetch(this.optimizeImageUrl(url, 200, 200, 60))
        )
      );
    }
    
    this.isPreloading = false;
  }

  // Clear cache to free memory
  clearCache() {
    this.imageCache.clear();
    this.preloadQueue = [];
  }
}

// Redis-like Frontend Cache Service
class FrontendCacheService {
  private static instance: FrontendCacheService;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): FrontendCacheService {
    if (!FrontendCacheService.instance) {
      FrontendCacheService.instance = new FrontendCacheService();
    }
    return FrontendCacheService.instance;
  }

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }

  // Memoization wrapper for API calls
  async memoizedCall<T>(key: string, apiCall: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached) return cached;

    try {
      const result = await apiCall();
      this.set(key, result, ttl);
      return result;
    } catch (error) {
      console.error('Memoized call failed:', error);
      throw error;
    }
  }
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ITEM_HEIGHT = SCREEN_HEIGHT * 0.7; // 70% of screen height for each item

interface ViralContentItem {
  id: string;
  title: string;
  thumbnail_url?: string;
  image_url?: string;
  likes_count: number;
  views_count: number;
  user_profiles: {
    username: string;
  };
  type: 'video' | 'photo';
}

export default function ViralScreen() {
  const router = useRouter();
  const [viralContent, setViralContent] = useState<ViralContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const bunnyOptimizer = BunnyCDNOptimizer.getInstance();
  const cacheService = FrontendCacheService.getInstance();

  // Memoized fetch function with caching
  const fetchViralContent = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    const cacheKey = `viral-content-page-${pageNum}`;
    
    if (refresh) {
      cacheService.clear();
      bunnyOptimizer.clearCache();
    }

    try {
      const response = await cacheService.memoizedCall(
        cacheKey,
        async () => {
          const res = await fetch(`${API_BASE_URL}/viral?page=${pageNum}&limit=20&sort=trending`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=300', // 5 minutes cache
            },
          });
          
          if (!res.ok) throw new Error('Failed to fetch viral content');
          return res.json();
        },
        refresh ? 0 : 5 * 60 * 1000 // No cache on refresh
      );

      const newData = response.data || [];
      
      if (pageNum === 1) {
        setViralContent(newData);
      } else {
        setViralContent(prev => [...prev, ...newData]);
      }

      // Preload next batch images
      if (newData.length > 0) {
        const imageUrls = newData.slice(0, 5).map((item: ViralContentItem) => item.thumbnail_url || item.image_url).filter(Boolean);
        bunnyOptimizer.preloadImages(imageUrls);
      }

      setHasMore(newData.length === 20);
      return newData;
    } catch (error) {
      console.error('Error fetching viral content:', error);
      // Fallback to mock data for demo
      const mockData: ViralContentItem[] = Array.from({ length: 20 }, (_, i) => ({
        id: `viral-${pageNum}-${i}`,
        title: `Viral Content ${pageNum}-${i + 1}`,
        thumbnail_url: `https://picsum.photos/400/300?random=${pageNum * 20 + i}`,
        likes_count: Math.floor(Math.random() * 100000) + 10000,
        views_count: Math.floor(Math.random() * 1000000) + 100000,
        user_profiles: { username: `user${pageNum}${i}` },
        type: Math.random() > 0.5 ? 'video' as const : 'photo' as const
      }));
      
      if (pageNum === 1) {
        setViralContent(mockData);
      } else {
        setViralContent(prev => [...prev, ...mockData]);
      }
      
      return mockData;
    }
  }, [bunnyOptimizer, cacheService]);

  // Initial load
  useEffect(() => {
    loadInitialContent();
  }, []);

  const loadInitialContent = async () => {
    setLoading(true);
    try {
      await fetchViralContent(1);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    try {
      await fetchViralContent(1, true);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || loading) return;
    
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchViralContent(nextPage);
  };

  // Memoized render item for performance
  const renderItem = useCallback(({ item, index }: { item: ViralContentItem; index: number }) => {
    const optimizedThumbnail = bunnyOptimizer.optimizeImageUrl(
      item.thumbnail_url || item.image_url || '',
      Math.floor(SCREEN_WIDTH * 0.9),
      Math.floor(ITEM_HEIGHT * 0.7),
      70
    );

    return (
      <TouchableOpacity
        style={styles.viralItem}
        activeOpacity={0.8}
        onPress={() => {
          if (item.type === 'video') {
            router.push(`/video/${item.id}`);
          } else {
            router.push(`/photos/${item.id}`);
          }
        }}
      >
        <Image
          source={{ uri: optimizedThumbnail }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
        />
        
        <View style={styles.overlay}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <MaterialIcons name="visibility" size={16} color="#fff" />
              <Text style={styles.statText}>
                {item.views_count > 1000000 
                  ? `${(item.views_count / 1000000).toFixed(1)}M`
                  : item.views_count > 1000
                  ? `${(item.views_count / 1000).toFixed(0)}K`
                  : item.views_count.toString()
                }
              </Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="favorite" size={16} color="#ff4444" />
              <Text style={styles.statText}>
                {item.likes_count > 1000000 
                  ? `${(item.likes_count / 1000000).toFixed(1)}M`
                  : item.likes_count > 1000
                  ? `${(item.likes_count / 1000).toFixed(0)}K`
                  : item.likes_count.toString()
                }
              </Text>
            </View>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.username}>{item.user_profiles?.username || 'Anonymous'}</Text>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          </View>
        </View>
        
        <View style={styles.viralBadge}>
          <MaterialIcons name="trending-up" size={12} color="#ff4444" />
          <Text style={styles.viralText}>VIRAL</Text>
        </View>
      </TouchableOpacity>
    );
  }, [bunnyOptimizer, router]);

  // Memoized list header
  const ListHeader = useMemo(() => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>🔥 Trending Now</Text>
      <Text style={styles.headerSubtitle}>Most viral content today</Text>
    </View>
  ), []);

  // Memoized list footer
  const ListFooter = useMemo(() => (
    <View style={styles.footer}>
      {hasMore && (
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
      )}
    </View>
  ), [hasMore]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <StatusBarOverlay style="light" backgroundColor="#000000" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Loading viral content...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBarOverlay style="light" backgroundColor="#000000" />
      <View style={styles.container}>
        <FlashList
          data={viralContent}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={true}
          getItemType={(item) => item.type}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.md,
  },
  header: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  viralItem: {
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    height: ITEM_HEIGHT,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: theme.colors.background.secondary,
  },
  overlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
    backgroundColor: 'transparent',
  },
  statsContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: theme.spacing.sm,
  },
  statItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.xs,
  },
  statText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  userInfo: {
    marginBottom: theme.spacing.sm,
  },
  username: {
    color: theme.colors.primary.main,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.xs,
  },
  title: {
    color: '#fff',
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  viralBadge: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.9)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
  },
  viralText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
  },
  footer: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
});
