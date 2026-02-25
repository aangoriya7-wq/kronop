// ==================== CENTRALIZED CONFIGURATION ====================
// ONE SOURCE OF TRUTH - All API Keys and Configuration
// NO HARDCODED VALUES ANYWHERE IN THE PROJECT

export const API_KEYS = {
  // BunnyCDN Master API Key
  BUNNY: process.env.EXPO_PUBLIC_BUNNY_API_KEY || '',
  
  // External Search APIs
  OPENAI: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  GOOGLE_SEARCH: process.env.EXPO_PUBLIC_GOOGLE_SEARCH_KEY || '',
  GOOGLE_SEARCH_CX: process.env.EXPO_PUBLIC_GOOGLE_SEARCH_CX || '',
  UNSPLASH: process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY || '',
  PEXELS: process.env.EXPO_PUBLIC_PEXELS_API_KEY || '',
  
  // AI Supporter Key (for AI Image Generation)
  AI_SUPPORT: process.env.EXPO_PUBLIC_AI_SUPPORT_KEY || '',
  
  // Groq AI API Key (for Support Chat)
  GROQ: process.env.EXPO_PUBLIC_GROQ_API_KEY || '',
  
  // Additional API Keys
  PIXABAY: process.env.EXPO_PUBLIC_PIXABAY_KEY || '',
  FLICKR: process.env.EXPO_PUBLIC_FLICKR_KEY || '',
  GIPHY: process.env.EXPO_PUBLIC_GIPHY_KEY || '',
  BING: process.env.EXPO_PUBLIC_BING_KEY || '',
  OPENVERSE: process.env.EXPO_PUBLIC_OPENVERSE_KEY || '',
  STABLE_DIFFUSION: process.env.EXPO_PUBLIC_STABLE_DIFFUSION_KEY || '',
  
  // Supabase
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  
  // OneSignal
  ONESIGNAL_APP_ID: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '',
  ONESIGNAL_REST_API_KEY: process.env.ONESIGNAL_REST_API_KEY || '',
  
  // Google Auth
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || process.env.EXPO_PUBLIC_MONGODB_URI,
  
  // KRONOP BACKEND URL - SINGLE SOURCE OF TRUTH
  KRONOP_API_URL: process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'https://kronop-9gju.onrender.com',
};

// Type definitions for better TypeScript support
export interface BunnyConfigType {
  libraryId: string;
  host: string;
  apiKey: string;
  streamKey: string;
}

export interface BunnyPhotosConfigType {
  storageZoneName: string;
  host: string;
  apiKey: string;
}

export const BUNNY_CONFIG = {
  // Stream API Configuration (Video Content)
  reels: {
    libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || '',
    host: process.env.EXPO_PUBLIC_BUNNY_HOST_REELS || '',
    apiKey: process.env.EXPO_PUBLIC_BUNNY_API_KEY_REELS || process.env.EXPO_PUBLIC_BUNNY_API_KEY || API_KEYS.BUNNY,
    streamKey: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_REELS || '',
  },
  video: {
    libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO || '',
    host: process.env.EXPO_PUBLIC_BUNNY_HOST_VIDEO || '',
    apiKey: process.env.EXPO_PUBLIC_BUNNY_API_KEY_VIDEO || process.env.EXPO_PUBLIC_BUNNY_API_KEY || API_KEYS.BUNNY,
    streamKey: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_VIDEO || '',
  },
  live: {
    libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_LIVE || '',
    host: process.env.EXPO_PUBLIC_BUNNY_HOST_LIVE || '',
    apiKey: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ACCESS_KEY_LIVE || process.env.EXPO_PUBLIC_BUNNY_API_KEY || API_KEYS.BUNNY,
    streamKey: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_LIVE || '',
  },
  story: {
    libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_STORY || '',
    host: process.env.EXPO_PUBLIC_BUNNY_HOST_STORY || '',
    apiKey: API_KEYS.BUNNY,
    streamKey: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_STORY || '',
    storageKey: process.env.EXPO_PUBLIC_BUNNY_STORY_STORAGE_KEY || '',
  },
  
  // Storage API Configuration (Image/Document Content)
  photos: {
    storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_PHOTO || '',
    host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_PHOTO || '',
    apiKey: process.env.EXPO_PUBLIC_BUNNY_PHOTO_STORAGE_KEY || '',
  },
  shayari: {
    storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_SHAYARI || '',
    host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_SHAYARI || '',
    apiKey: process.env.EXPO_PUBLIC_BUNNY_SHAYARI_STORAGE_KEY || '',
  },
};

// Library ID mapping for dynamic content identification
// Security: do not hard-code any Bunny library IDs here.
// All mappings are driven purely from environment variables.
export const LIBRARY_ID_MAP: Record<string, string> = {
  [process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || '']: 'Reel',
  [process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO || '']: 'Video',
  [process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_LIVE || '']: 'Live',
  [process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || '']: 'Story',
  photos: 'Photo',
};

// Helper function to get config by content type
export const getBunnyConfigByType = (type: string): BunnyConfigType | BunnyPhotosConfigType => {
  switch (type.toLowerCase()) {
    case 'reel':
    case 'reels':
      return BUNNY_CONFIG.reels as BunnyConfigType;
    case 'video':
    case 'videos':
      return BUNNY_CONFIG.video as BunnyConfigType;
    case 'live':
      return BUNNY_CONFIG.live as BunnyConfigType;
    case 'story':
    case 'stories':
      return BUNNY_CONFIG.story as BunnyConfigType;
    case 'photo':
    case 'photos':
      return BUNNY_CONFIG.photos as BunnyPhotosConfigType;
    case 'shayari':
    case 'shayari-photos':
      return BUNNY_CONFIG.shayari as BunnyPhotosConfigType;
    default:
      return BUNNY_CONFIG.video as BunnyConfigType; // Default fallback
  }
};

// Helper function to get full BunnyCDN URL
export const getBunnyFullUrl = (type: string, videoId?: string, fileName?: string): string => {
  const config = getBunnyConfigByType(type);
  
  if (!config) return '';
  
  // For video content (reels, videos, live, story)
  if ('libraryId' in config && videoId) {
    return `https://${config.host}/${videoId}/playlist.m3u8`;
  }
  
  // For image content (photos, shayari)
  if ('storageZoneName' in config && fileName) {
    return `https://${config.host}/${fileName}`;
  }
  
  return '';
};

export default {
  API_KEYS,
  BUNNY_CONFIG,
  LIBRARY_ID_MAP,
  getBunnyConfigByType,
  getBunnyFullUrl,
};
