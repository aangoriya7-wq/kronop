// R2 Cloudflare Configuration - Real video URLs

// R2 Configuration from environment
export const R2_CONFIG = {
  ACCOUNT_ID: process.env.R2_ACCOUNT_ID || '',
  ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || '',
  SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || '',
  BUCKET_NAME: process.env.R2_BUCKET_NAME || 'kronop',
  ENDPOINT: process.env.R2_ENDPOINT || 'https://ab231e594f76bc74e6500445f50ca30b.r2.cloudflarestorage.com',
  FOLDERS: {
    REELS: process.env.FOLDER_REELS || 'reels',
    VIDEOS: process.env.FOLDER_VIDEOS || 'videos',
    LIVE: process.env.FOLDER_LIVE || 'live',
    STORIES: process.env.FOLDER_STORIES || 'stories',
    PHOTOS: process.env.FOLDER_PHOTOS || 'photos',
    SONGS: process.env.FOLDER_SONGS || 'songs',
  }
} as const;

// Generate R2 URLs for different content types
export const R2_URLS = {
  // Reel URLs
  REEL: (filename: string) => `${R2_CONFIG.ENDPOINT}/${R2_CONFIG.BUCKET_NAME}/${R2_CONFIG.FOLDERS.REELS}/${filename}`,
  REEL_THUMBNAIL: (filename: string) => `${R2_CONFIG.ENDPOINT}/${R2_CONFIG.BUCKET_NAME}/${R2_CONFIG.FOLDERS.REELS}/thumbnails/${filename}`,
  
  // Video URLs
  VIDEO: (filename: string) => `${R2_CONFIG.ENDPOINT}/${R2_CONFIG.BUCKET_NAME}/${R2_CONFIG.FOLDERS.VIDEOS}/${filename}`,
  VIDEO_THUMBNAIL: (filename: string) => `${R2_CONFIG.ENDPOINT}/${R2_CONFIG.BUCKET_NAME}/${R2_CONFIG.FOLDERS.VIDEOS}/thumbnails/${filename}`,
  
  // Live URLs
  LIVE: (filename: string) => `${R2_CONFIG.ENDPOINT}/${R2_CONFIG.BUCKET_NAME}/${R2_CONFIG.FOLDERS.LIVE}/${filename}`,
  LIVE_THUMBNAIL: (filename: string) => `${R2_CONFIG.ENDPOINT}/${R2_CONFIG.BUCKET_NAME}/${R2_CONFIG.FOLDERS.LIVE}/thumbnails/${filename}`,
  
  // Story URLs
  STORY: (filename: string) => `${R2_CONFIG.ENDPOINT}/${R2_CONFIG.BUCKET_NAME}/${R2_CONFIG.FOLDERS.STORIES}/${filename}`,
  STORY_THUMBNAIL: (filename: string) => `${R2_CONFIG.ENDPOINT}/${R2_CONFIG.BUCKET_NAME}/${R2_CONFIG.FOLDERS.STORIES}/thumbnails/${filename}`,
  
  // Photo URLs
  PHOTO: (filename: string) => `${R2_CONFIG.ENDPOINT}/${R2_CONFIG.BUCKET_NAME}/${R2_CONFIG.FOLDERS.PHOTOS}/${filename}`,
  
  // Song URLs
  SONG: (filename: string) => `${R2_CONFIG.ENDPOINT}/${R2_CONFIG.BUCKET_NAME}/${R2_CONFIG.FOLDERS.SONGS}/${filename}`,
} as const;

// Helper function to generate reel URLs
export function generateReelUrls(reelId: string, extension = 'mp4') {
  const filename = `reel${reelId}.${extension}`;
  const thumbnailFilename = `reel${reelId}.jpg`;
  
  return {
    videoUrl: R2_URLS.REEL(filename),
    thumbnailUrl: R2_URLS.REEL_THUMBNAIL(thumbnailFilename),
  };
}

// Helper function to generate video URLs
export function generateVideoUrls(videoId: string, extension = 'mp4') {
  const filename = `video${videoId}.${extension}`;
  const thumbnailFilename = `video${videoId}.jpg`;
  
  return {
    videoUrl: R2_URLS.VIDEO(filename),
    thumbnailUrl: R2_URLS.VIDEO_THUMBNAIL(thumbnailFilename),
  };
}

// Helper function to generate live URLs
export function generateLiveUrls(liveId: string, extension = 'mp4') {
  const filename = `live${liveId}.${extension}`;
  const thumbnailFilename = `live${liveId}.jpg`;
  
  return {
    videoUrl: R2_URLS.LIVE(filename),
    thumbnailUrl: R2_URLS.LIVE_THUMBNAIL(thumbnailFilename),
  };
}

// Log R2 configuration
console.log('🔧 R2 Configuration:', {
  ENDPOINT: R2_CONFIG.ENDPOINT,
  BUCKET: R2_CONFIG.BUCKET_NAME,
  FOLDERS: R2_CONFIG.FOLDERS,
});
