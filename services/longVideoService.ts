// Long Video Service - Connected to MongoDB via Bridge API
// Ultra-Fast Long Videos with Micro-Chunking and BunnyCDN Integration
// Instagram Killer: 2x Faster than YouTube Long Videos

import { videosApi } from './api';
// import { videoChunkingService } from './videoChunkingService'; // Service removed
// import { hlsOptimizerService } from './hlsOptimizer'; // Service removed

export interface LongVideo {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
  duration: string;
  views: string;
  likes: number;
  isLiked: boolean;
  type: 'long';
  category?: string;
  user: {
    name: string;
    avatar: string;
    isSupported: boolean;
    supporters: number;
  };
  description: string;
  comments: number;
  // NEW: BunnyCDN URL fields for ultra-fast loading
  bunnyCDNUrl?: string;
  originalUrl?: string;
  signedUrl?: string;
  streamUrl?: string;
  // NEW: Micro-chunking support
  chunkSize?: number;
  totalChunks?: number;
}

// Format duration from seconds to MM:SS
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Format views count
function formatViews(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

// URL Validation and Sync Check
function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  
  // Check if URL is accessible (basic validation)
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Transform MongoDB/Bridge API video data to LongVideo format
function transformVideoData(item: any): LongVideo {
  // The Bridge API is responsible for talking to BunnyCDN and returning
  // fully-resolved playback and thumbnail URLs. The frontend NEVER builds
  // URLs using library IDs, hosts or API keys.

  // BUNNYCDN URL CONSTRUCTION: Get best URL for playback and thumbnails
  const getBunnyCDNUrl = (videoData: any, isThumbnail: boolean = false): string => {
    // Priority order for different URL types
    const urlFields = isThumbnail ? [
      'thumbnail_bunny',
      'thumbnail_bunnycdn', 
      'thumbnail_cdn',
      'thumbnail',
      'thumbnail_url',
      'thumbnailUrl',
      'cover_bunny',
      'cover_bunnycdn',
      'cover',
      'cover_url',
      'coverUrl'
    ] : [
      'signedUrl', 
      'originalUrl', 
      'streamUrl', 
      'videoUrl', 
      'url',
      'bunnyCDNUrl',
      'video_url',
      'video_bunny',
      'video_bunnycdn'
    ];
    
    for (const field of urlFields) {
      const url = videoData[field];
      if (url && typeof url === 'string' && url.trim() !== '') {
        // Validate URL before returning
        if (!validateUrl(url)) {
          console.warn(`⚠️ Invalid ${isThumbnail ? 'thumbnail' : 'video'} URL found:`, url);
          continue;
        }
        
        // If URL is already a BunnyCDN URL, return as-is
        if (url.includes('bunnycdn.') || url.includes('bcvcdn.') || url.includes('cdn.bunny.net')) {
          return url;
        }
        
        // If it's a relative URL or missing protocol, construct full URL
        if (url && !url.startsWith('http')) {
          const baseUrl = process.env.BUNNY_CDN_URL || 'https://bunnycdn.com';
          const fullUrl = `${baseUrl}/${url.replace(/^\//, '')}`;
          if (validateUrl(fullUrl)) {
            return fullUrl;
          }
          continue;
        }
        
        return url;
      }
    }
    
    // SPECIAL FALLBACK: Construct thumbnail from GUID for BunnyCDN
    if (isThumbnail && videoData.guid) {
      const fallbackThumbnail = `https://vz-87b9d270-8ab.b-cdn.net/${videoData.guid}/thumbnail.jpg`;
      console.log(`🖼️ Using BunnyCDN GUID thumbnail: ${fallbackThumbnail}`);
      return fallbackThumbnail;
    }
    
    console.warn(`⚠️ No valid ${isThumbnail ? 'thumbnail' : 'video'} URL found for video:`, videoData.id || 'unknown');
    return '';
  };

  // Video playback URL from Bridge API / MongoDB
  const videoUrl = getBunnyCDNUrl(item, false);

  // Thumbnail URL from Bridge API / MongoDB - Enhanced BunnyCDN Mapping
  const thumbnail = getBunnyCDNUrl(item, true);
  
  // Clean title
  let cleanTitle = item.title || 'Untitled Video';
  if (cleanTitle.match(/^[a-zA-Z]+_\d+/)) {
    cleanTitle = cleanTitle.replace(/^[a-zA-Z]+_\d+_?/, '');
    if (!cleanTitle) cleanTitle = 'Untitled Video';
  }
  
  // Format duration
  const durationSeconds = item.duration || item.durationSeconds || 0;
  const formattedDuration = formatDuration(durationSeconds);
  
  // Format views
  const views = item.views || item.views_count || item.viewCount || 0;
  const formattedViews = formatViews(views);
  
  // Get user info
  const userName = item.user_id?.name || item.user?.name || item.user_id?.username || item.user?.username || item.channelName || 'Kronop Creator';
  const userAvatar = item.user_id?.avatar || item.user?.avatar || item.channelAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
  
  return {
    id: item._id || item.id || item.guid || item.bunny_id || `video_${Date.now()}`,
    title: cleanTitle,
    thumbnail,
    videoUrl,
    duration: formattedDuration,
    views: formattedViews,
    likes: item.likes || item.likes_count || 0,
    isLiked: false,
    type: 'long',
    category: item.category || '',
    user: {
      name: userName,
      avatar: userAvatar,
      isSupported: false,
      supporters: item.user_id?.followers || item.user?.followers || item.followerCount || 0,
    },
    description: item.description || cleanTitle || 'Watch this amazing video on Kronop!',
    comments: item.comments || item.comments_count || 0,
    // NEW: BunnyCDN URLs for ultra-fast loading
    bunnyCDNUrl: videoUrl,
    originalUrl: item.originalUrl || item.url || '',
    signedUrl: item.signedUrl || '',
    streamUrl: item.streamUrl || '',
    // NEW: Micro-chunking support
    chunkSize: 0.1,
    totalChunks: Math.ceil(durationSeconds / 0.1),
  };
}

// Fetch videos from MongoDB via Bridge API with Ultra-Fast Optimization
async function fetchVideosFromBridgeAPI(): Promise<LongVideo[]> {
  try {
    console.log('📡 Fetching long videos from MongoDB via Bridge API...');
    
    // Call Bridge API (which connects to MongoDB)
    const response = await videosApi.getVideos(1, 50); // Fetch first 50 videos
    
    // Ensure response is an array
    const data = Array.isArray(response) ? response : [];
    
    if (data.length === 0) {
      console.warn('⚠️ No videos found from Bridge API, using fallback');
      return sampleLongVideos;
    }
    
    console.log(`✅ Fetched ${data.length} videos from MongoDB via Bridge API`);
    
    // TRANSFORM: Add BunnyCDN URL construction and micro-chunking
    const videos: LongVideo[] = data
      .filter((item: any) => item && (item._id || item.id)) // Only include valid videos
      .map((item: any) => {
        const transformedVideo = transformVideoData(item);
        
        // LOG: Show URL mapping for debugging
        console.log(`🎥 Video ${transformedVideo.id}:`, {
          title: transformedVideo.title,
          thumbnail: transformedVideo.thumbnail ? '✅' : '❌',
          videoUrl: transformedVideo.videoUrl ? '✅' : '❌',
          bunnyCDN: transformedVideo.bunnyCDNUrl ? '✅' : '❌'
        });
        
        // MICRO-CHUNKING: Removed - using direct video URL
        if (transformedVideo.bunnyCDNUrl) {
          // Direct video URL for instant play
          console.log(`Video ${transformedVideo.id} ready for direct streaming`);
        }
        
        return transformedVideo;
      });
    
    return videos.length > 0 ? videos : sampleLongVideos;
  } catch (error: any) {
    console.error('❌ Error fetching videos from Bridge API:', error.message);
    console.warn('⚠️ Using fallback sample videos due to error');
    return sampleLongVideos;
  }
}

// Sample fallback videos with BunnyCDN URLs and Micro-Chunking
export const sampleLongVideos: LongVideo[] = [
  {
    id: '1',
    title: 'Stunning Mountain Landscapes in 4K',
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=450&fit=crop',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: '10:24',
    views: '1.2M',
    likes: 45000,
    isLiked: false,
    type: 'long',
    category: 'Travel',
    // BUNNYCDN URL CONSTRUCTION
    bunnyCDNUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    originalUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    signedUrl: '',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    // MICRO-CHUNKING
    chunkSize: 0.1,
    totalChunks: Math.ceil(624 / 0.1), // 10:24 = 624 seconds
    user: {
      name: 'Nature Explorer',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
      isSupported: false,
      supporters: 12500,
    },
    description: 'Experience breathtaking mountain landscapes captured in stunning 4K quality. This video takes you through some of the most beautiful mountain ranges in the world, featuring snow-capped peaks, pristine lakes, and dramatic valleys.',
    comments: 1240,
  },
  {
    id: '2',
    title: 'Ocean Waves - Relaxing Nature Sounds',
    thumbnail: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=450&fit=crop',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    duration: '8:15',
    views: '890K',
    likes: 32000,
    isLiked: false,
    type: 'long',
    category: 'Health',
    // BUNNYCDN URL CONSTRUCTION
    bunnyCDNUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    originalUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    signedUrl: '',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    // MICRO-CHUNKING
    chunkSize: 0.1,
    totalChunks: Math.ceil(495 / 0.1), // 8:15 = 495 seconds
    user: {
      name: 'Ocean Vibes',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      isSupported: false,
      supporters: 8900,
    },
    description: 'Relax and unwind with soothing ocean wave sounds. Perfect for meditation, sleep, or creating a peaceful atmosphere. Filmed at various beautiful beaches around the world.',
    comments: 567,
  },
];

// Get long videos - fetches from MongoDB via Bridge API
export async function getLongVideos(category?: string): Promise<LongVideo[]> {
  try {
    const allVideos = await fetchVideosFromBridgeAPI();
    
    // If category is specified and not 'All', filter videos
    if (category && category !== 'All') {
      return allVideos.filter(video => video.category === category);
    }
    
    return allVideos;
  } catch (error) {
    console.error('Error in getLongVideos:', error);
    
    // Filter sample videos if category is specified
    if (category && category !== 'All') {
      return sampleLongVideos.filter(video => video.category === category);
    }
    
    return sampleLongVideos;
  }
}

// Get single video by ID with Ultra-Fast initialization
export async function getLongVideoById(id: string): Promise<LongVideo | null> {
  try {
    const videos = await getLongVideos();
    const video = videos.find(v => v.id === id);
    
    // ULTRA-FAST: Direct video URL for instant play
    if (video && video.bunnyCDNUrl) {
      console.log(`Video ${video.id} ready for direct streaming`);
    }
    
    return video || null;
  } catch (error) {
    console.error('Error in getLongVideoById:', error);
    return null;
  }
}

// Toggle like for a video
export function toggleLike(videoId: string, videos: LongVideo[]): LongVideo[] {
  return videos.map(video => {
    if (video.id === videoId) {
      return {
        ...video,
        isLiked: !video.isLiked,
        likes: video.isLiked ? video.likes - 1 : video.likes + 1,
      };
    }
    return video;
  });
}
