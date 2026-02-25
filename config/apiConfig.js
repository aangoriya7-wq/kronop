// Global API Configuration for Kronop App
// Updated for Render Deployment

// Get base URL from environment
const getBaseUrl = () => {
  // Check for Render URL first (priority)
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  
  // Check for secondary API URL
  if (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Fallback to Render URL
  return 'https://kronop-9gju.onrender.com';
};

export const BASE_URL = getBaseUrl();

// API Endpoints (remove /api since BASE_URL already includes it)
export const API_ENDPOINTS = {
  // Content endpoints
  PHOTOS: `${BASE_URL}/photos`,
  VIDEOS: `${BASE_URL}/videos`,
  REELS: `${BASE_URL}/reels`,
  STORIES: `${BASE_URL}/stories`,
  LIVE: `${BASE_URL}/live`,
  
  // User endpoints
  USER_PROFILE: `${BASE_URL}/user/profile`,
  
  // Auth endpoints
  LOGIN: `${BASE_URL}/auth/login`,
  REGISTER: `${BASE_URL}/auth/register`,
  
  // Interaction endpoints
  LIKE: `${BASE_URL}/like`,
  COMMENT: `${BASE_URL}/comment`,
  SHARE: `${BASE_URL}/share`
};

export default BASE_URL;
