// ==================== BUNNYCDN CONFIGURATION ====================
// Backend-compatible BunnyCDN configuration for Node.js
// Matches the frontend Config.ts structure

const { config } = require('./koyebConfig');

// BunnyCDN Stream Configuration (Video Content)
const BUNNY_CONFIG = {
  reels: {
    libraryId: config.LIBRARY_IDS.reels,
    host: '', // Will be set by BunnyCDN
    apiKey: config.BUNNY_API_KEY,
  },
  video: {
    libraryId: config.LIBRARY_IDS.video,
    host: '', // Will be set by BunnyCDN
    apiKey: config.BUNNY_API_KEY,
  },
  live: {
    libraryId: config.LIBRARY_IDS.live,
    host: '', // Will be set by BunnyCDN
    apiKey: config.BUNNY_API_KEY,
  },
  story: {
    libraryId: '', // Not configured yet
    host: '', // Will be set by BunnyCDN
    apiKey: config.BUNNY_API_KEY,
  },
  
  // Storage API Configuration (Image/Document Content)
  photos: {
    storageZoneName: config.STORAGE_ZONES.photo.name,
    host: config.STORAGE_ZONES.photo.host,
    apiKey: config.STORAGE_ZONES.photo.accessKey,
  },
  shayari: {
    storageZoneName: config.STORAGE_ZONES.shayari.name,
    host: config.STORAGE_ZONES.shayari.host,
    apiKey: config.STORAGE_ZONES.shayari.accessKey,
  },
};

// Library ID mapping for dynamic content identification
const LIBRARY_ID_MAP = {
  [config.LIBRARY_IDS.reels]: 'Reel',
  [config.LIBRARY_IDS.video]: 'Video',
  [config.LIBRARY_IDS.live]: 'Live',
  photos: 'Photo',
  shayari: 'ShayariPhoto',
};

// Helper function to get config by content type
const getBunnyConfigByType = (type) => {
  switch (type.toLowerCase()) {
    case 'reel':
    case 'reels':
      return BUNNY_CONFIG.reels;
    case 'video':
    case 'videos':
      return BUNNY_CONFIG.video;
    case 'live':
      return BUNNY_CONFIG.live;
    case 'story':
    case 'stories':
      return BUNNY_CONFIG.story;
    case 'photo':
    case 'photos':
      return BUNNY_CONFIG.photos;
    case 'shayari':
    case 'shayari-photos':
      return BUNNY_CONFIG.shayari;
    default:
      return BUNNY_CONFIG.video; // Default fallback
  }
};

module.exports = {
  BUNNY_CONFIG,
  LIBRARY_ID_MAP,
  getBunnyConfigByType,
};
