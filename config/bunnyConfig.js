// ==================== BUNNYCDN CENTRALIZED CONFIGURATION ====================
// This file reads ALL configuration from environment variables only
// NO HARDCODED VALUES - Everything from .env

require('dotenv').config();

const getBunnyConfigByType = (type) => {
  // NO MASTER KEY - Only specific library keys
  console.log(`� Loading config for ${type} - NO MASTER KEY USED`);
  
  const configs = {
    reels: {
      libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || process.env.BUNNY_LIBRARY_ID_REELS || '',
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_REELS || process.env.BUNNY_HOST_REELS || '',
      apiKey: process.env.EXPO_PUBLIC_BUNNY_API_KEY_REELS || process.env.EXPO_PUBLIC_BUNNY_API_KEY || '',
      streamKey: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_REELS || process.env.BUNNY_STREAM_KEY_REELS || ''
    },
    video: {
      libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO || process.env.BUNNY_LIBRARY_ID_VIDEO || '',
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_VIDEO || process.env.BUNNY_HOST_VIDEO || '',
      apiKey: process.env.EXPO_PUBLIC_BUNNY_API_KEY_VIDEO || process.env.EXPO_PUBLIC_BUNNY_API_KEY || '',
      streamKey: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_VIDEO || process.env.BUNNY_STREAM_KEY_VIDEO || ''
    },
    live: {
      libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_LIVE || process.env.BUNNY_LIBRARY_ID_LIVE || '',
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_LIVE || process.env.BUNNY_HOST_LIVE || '',
      apiKey: process.env.EXPO_PUBLIC_BUNNY_API_KEY_LIVE || process.env.EXPO_PUBLIC_BUNNY_API_KEY || '',
      streamKey: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_LIVE || process.env.BUNNY_STREAM_KEY_LIVE || ''
    },
    photos: {
      storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_PHOTO || process.env.BUNNY_STORAGE_ZONE || '',
      storageAccessKey: process.env.EXPO_PUBLIC_BUNNY_PHOTO_STORAGE_KEY || process.env.BUNNY_PHOTO_STORAGE_KEY || '',
      host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_PHOTO || process.env.BUNNY_HOST_PHOTOS || ''
    },
    shayari: {
      storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_SHAYARI || process.env.BUNNY_STORAGE_ZONE_SHAYARI || '',
      storageAccessKey: process.env.EXPO_PUBLIC_BUNNY_SHAYARI_STORAGE_KEY || process.env.BUNNY_SHAYARI_STORAGE_KEY || '',
      host: process.env.EXPO_PUBLIC_BUNNY_STORAGE_HOST_SHAYARI || process.env.BUNNY_HOST_SHAYARI || ''
    },
    story: {
      libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_STORY || process.env.BUNNY_LIBRARY_ID_STORY || '',
      host: process.env.EXPO_PUBLIC_BUNNY_HOST_STORY || process.env.BUNNY_HOST_STORY || '',
      apiKey: process.env.EXPO_PUBLIC_BUNNY_API_KEY_STORY || process.env.EXPO_PUBLIC_BUNNY_API_KEY || '',
      streamKey: process.env.EXPO_PUBLIC_BUNNY_STREAM_KEY_STORY || process.env.BUNNY_STREAM_KEY_STORY || '',
      storageAccessKey: process.env.EXPO_PUBLIC_BUNNY_STORY_STORAGE_KEY || process.env.BUNNY_STORY_STORAGE_KEY || ''
    }
  };
  
  const config = configs[type.toLowerCase()] || configs.reels;
  console.log(`📚 ${type.toUpperCase()} Config: Library=${config.libraryId || 'N/A'}, Host=${config.host || 'N/A'}, Key=${config.apiKey ? config.apiKey.substring(0, 20) + '...' : 'MISSING'}`);
  
  return config;
};

const LIBRARY_ID_MAP = {
  reels: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || process.env.BUNNY_LIBRARY_ID_REELS || '',
  video: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO || process.env.BUNNY_LIBRARY_ID_VIDEO || '',
  live: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_LIVE || process.env.BUNNY_LIBRARY_ID_LIVE || '',
  photos: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_PHOTO || process.env.BUNNY_STORAGE_ZONE || '',
  shayari: process.env.EXPO_PUBLIC_BUNNY_STORAGE_NAME_SHAYARI || process.env.BUNNY_STORAGE_ZONE_SHAYARI || ''
};

// API Headers Factory - Uses specific API key (NO MASTER KEY)
const getApiHeaders = (section = 'master') => {
  const config = getBunnyConfigByType(section);
  const specificKey = config.apiKey || '';
  
  const headers = {
    'AccessKey': specificKey,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  console.log(`📡 API Headers for ${section}:`, {
    'AccessKey': specificKey ? `${specificKey.substring(0, 20)}...` : 'MISSING'
  });
  
  return headers;
};

// Validation function - NO MASTER KEY
const validateConfig = () => {
  const reelsConfig = getBunnyConfigByType('reels');
  const videoConfig = getBunnyConfigByType('video');
  
  if (!reelsConfig.apiKey || reelsConfig.apiKey.trim().length === 0) {
    console.error('❌ CRITICAL: Reels API key is missing');
    return false;
  }
  
  if (!videoConfig.apiKey || videoConfig.apiKey.trim().length === 0) {
    console.error('❌ CRITICAL: Video API key is missing');
    return false;
  }
  
  console.log('✅ BunnyCDN Configuration Validated - Using specific library keys');
  return true;
};

const BUNNY_CONFIG = getBunnyConfigByType;

module.exports = {
  getBunnyConfigByType,
  LIBRARY_ID_MAP,
  BUNNY_CONFIG,
  getApiHeaders,
  validateConfig,
  
  // Helper functions - NO MASTER KEY
  getMasterApiKey: () => null, // DISABLED - No master key
  getSectionConfig: (section) => getBunnyConfigByType(section)
};
