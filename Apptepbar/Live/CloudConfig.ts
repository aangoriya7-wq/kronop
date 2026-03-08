// Cloudflare R2 Configuration for Video Streaming
export const R2_CONFIG = {
  endpoint: 'https://kronop-videos.r2.cloudflarestorage.com',
  bucket: 'kronop-live-videos',
  region: 'auto',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  publicReadUrl: 'https://videos.kronop.app', // Custom domain for public access
};

// S3-compatible API for video streaming
export const getVideoUrl = (videoKey: string): string => {
  return `${R2_CONFIG.publicReadUrl}/${videoKey}`;
};

// For range requests
export const getRangeUrl = (videoKey: string, start: number, end: number): string => {
  return `${R2_CONFIG.endpoint}/${R2_CONFIG.bucket}/${videoKey}?range=${start}-${end}`;
};
