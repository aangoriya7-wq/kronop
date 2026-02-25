// ==================== BACKEND CONFIGURATION ====================
// Node.js compatible configuration for production deployment
// All environment variables centralized here

// ==================== BUNNY CDN CONFIGURATION ====================
const LIBRARY_ID_MAP = {
  reels: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS,
  video: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO, 
  live: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_LIVE
};

// ==================== STORAGE ZONES ====================
const STORAGE_ZONES = {
  photo: {
    name: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_PHOTO,
    accessKey: process.env.EXPO_PUBLIC_BUNNY_STORAGE_KEY_PHOTO,
    host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_PHOTO
  },
  shayari: {
    name: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_SHAYARI,
    accessKey: process.env.EXPO_PUBLIC_BUNNY_STORAGE_KEY_SHAYARI,
    host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_SHAYARI
  },
  story: {
    name: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_STORY,
    accessKey: process.env.EXPO_PUBLIC_BUNNY_STORAGE_KEY_STORY,
    host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_STORY
  }
};

// ==================== API KEYS ====================
const API_KEYS = {
  BUNNY: process.env.EXPO_PUBLIC_BUNNY_API_KEY,
  BUNNY_ACCESS_KEY: process.env.EXPO_PUBLIC_BUNNY_ACCESS_KEY,
  BUNNY_ACCESS_KEY_REELS: process.env.EXPO_PUBLIC_BUNNY_ACCESS_KEY_REELS,
  BUNNY_ACCESS_KEY_VIDEO: process.env.EXPO_PUBLIC_BUNNY_ACCESS_KEY_VIDEO,
  BUNNY_ACCESS_KEY_LIVE: process.env.EXPO_PUBLIC_BUNNY_ACCESS_KEY_LIVE,
  BUNNY_ACCESS_KEY_STORY: process.env.EXPO_PUBLIC_BUNNY_ACCESS_KEY_STORY,
  
  // AI Supporter
  AI_SUPPORT: process.env.EXPO_PUBLIC_AI_SUPPORT_KEY,
  STABLE_DIFFUSION: process.env.EXPO_PUBLIC_STABLE_DIFFUSION_KEY,
  
  // External APIs
  OPENAI: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  GOOGLE_SEARCH: process.env.EXPO_PUBLIC_GOOGLE_SEARCH_KEY,
  GOOGLE_SEARCH_CX: process.env.EXPO_PUBLIC_GOOGLE_SEARCH_CX,
  UNSPLASH: process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY,
  PEXELS: process.env.EXPO_PUBLIC_PEXELS_API_KEY,
  PIXABAY: process.env.EXPO_PUBLIC_PIXABAY_KEY,
  FLICKR: process.env.EXPO_PUBLIC_FLICKR_KEY,
  GIPHY: process.env.EXPO_PUBLIC_GIPHY_KEY,
  BING: process.env.EXPO_PUBLIC_BING_KEY,
  OPENVERSE: process.env.EXPO_PUBLIC_OPENVERSE_KEY,
  
  // Auth & Services
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ONESIGNAL_APP_ID: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
  ONESIGNAL_REST_API_KEY: process.env.ONESIGNAL_REST_API_KEY,
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
};

// ==================== DATABASE CONFIGURATION ====================
const DATABASE_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || process.env.EXPO_PUBLIC_MONGODB_URI,
  REDIS_TTL_SECONDS: parseInt(process.env.REDIS_TTL_SECONDS || '30', 10)
};

// ==================== SERVER CONFIGURATION ====================
const SERVER_CONFIG = {
  PORT: Number(process.env.PORT) || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'https://kronop-9gju.onrender.com'
};

// ==================== HELPER FUNCTIONS ====================
const getBunnyConfigByType = (type) => {
  const configs = {
    reels: {
      libraryId: LIBRARY_ID_MAP.reels,
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_REELS,
      apiKey: API_KEYS.BUNNY_ACCESS_KEY_REELS || API_KEYS.BUNNY
    },
    video: {
      libraryId: LIBRARY_ID_MAP.video,
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_VIDEO, 
      apiKey: API_KEYS.BUNNY_ACCESS_KEY_VIDEO || API_KEYS.BUNNY
    },
    live: {
      libraryId: LIBRARY_ID_MAP.live,
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_LIVE,
      apiKey: API_KEYS.BUNNY_ACCESS_KEY_LIVE || API_KEYS.BUNNY
    }
  };
  
  return configs[type] || configs.reels;
};

const getStorageConfigByType = (type) => {
  return STORAGE_ZONES[type] || STORAGE_ZONES.photo;
};

module.exports = {
  LIBRARY_ID_MAP,
  STORAGE_ZONES,
  API_KEYS,
  DATABASE_CONFIG,
  SERVER_CONFIG,
  getBunnyConfigByType,
  getStorageConfigByType
};
