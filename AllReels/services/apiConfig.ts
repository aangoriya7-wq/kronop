// API Configuration - Centralized API endpoints

// Get API base URL from environment or use default
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://kronop-9gju.onrender.com';

// API Endpoints
export const API_ENDPOINTS = {
  // Reels
  REELS: `${API_BASE_URL}/api/v1/reels`,
  REEL_BY_ID: (id: string) => `${API_BASE_URL}/api/v1/reels/${id}`,
  TRENDING_REELS: `${API_BASE_URL}/api/v1/reels/trending`,
  SEARCH_REELS: (query: string) => `${API_BASE_URL}/api/v1/reels/search?q=${encodeURIComponent(query)}`,
  
  // Interactions
  TOGGLE_LIKE: `${API_BASE_URL}/api/v1/interactions/toggle_like`,
  TOGGLE_SAVE: `${API_BASE_URL}/api/v1/interactions/toggle_save`,
  TOGGLE_SUPPORT: `${API_BASE_URL}/api/v1/interactions/toggle_support`,
  INCREMENT_SHARE: `${API_BASE_URL}/api/v1/interactions/increment_share`,
  INCREMENT_COMMENT: `${API_BASE_URL}/api/v1/interactions/increment_comment`,
  
  // Comments
  GET_COMMENTS: `${API_BASE_URL}/api/v1/interactions/get_comments`,
  ADD_COMMENT: `${API_BASE_URL}/api/v1/interactions/add_comment`,
  LIKE_COMMENT: `${API_BASE_URL}/api/v1/interactions/like_comment`,
  
  // Counts
  GET_LIKE_COUNT: `${API_BASE_URL}/api/v1/interactions/get_like_count`,
  GET_COMMENT_COUNT: `${API_BASE_URL}/api/v1/interactions/get_comment_count`,
  GET_SHARE_COUNT: `${API_BASE_URL}/api/v1/interactions/get_share_count`,
  GET_SUPPORT_COUNT: `${API_BASE_URL}/api/v1/interactions/get_support_count`,
  
  // User data
  GET_USER_LIKED_REELS: `${API_BASE_URL}/api/v1/interactions/get_user_liked_reels`,
  GET_USER_SAVED_REELS: `${API_BASE_URL}/api/v1/interactions/get_user_saved_reels`,
  GET_USER_SHARED_REELS: `${API_BASE_URL}/api/v1/interactions/get_user_shared_reels`,
  GET_USER_SUPPORTING: `${API_BASE_URL}/api/v1/interactions/get_user_supporting`,
  GET_USER_SUPPORTERS: `${API_BASE_URL}/api/v1/interactions/get_user_supporters`,
  
  // Health check
  HEALTH: `${API_BASE_URL}/api/v1/health`,
  METRICS: `${API_BASE_URL}/api/v1/metrics`,
} as const;

// Default request options
export const DEFAULT_REQUEST_OPTIONS = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// POST request options
export const POST_REQUEST_OPTIONS = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// Timeout configuration
export const REQUEST_TIMEOUT = 10000; // 10 seconds

// Helper function to create fetch with timeout
export function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeoutId);
  });
}

// Helper function to handle API errors
export function handleApiError(error: any): never {
  if (error.name === 'AbortError') {
    throw new Error('Request timeout. Please check your connection.');
  }
  
  if (error.response) {
    throw new Error(`Server error: ${error.response.status} ${error.response.statusText}`);
  }
  
  if (error.request) {
    throw new Error('Network error. Please check your connection.');
  }
  
  throw new Error('An unexpected error occurred.');
}

// Log API configuration
console.log('🔧 API Configuration:', {
  BASE_URL: API_BASE_URL,
  ENDPOINTS_COUNT: Object.keys(API_ENDPOINTS).length,
  TIMEOUT: REQUEST_TIMEOUT,
});
