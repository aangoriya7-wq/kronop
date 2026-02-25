// Using React Native's built-in fetch instead of axios for React Native compatibility
import { API_KEYS, BUNNY_CONFIG, getBunnyConfigByType, BunnyConfigType } from '../constants/Config';
import { reelsService } from './reelsService';
import { videosService } from './videosService';
import { authService } from './authService';

// Get base URL from environment - SINGLE SOURCE OF TRUTH
const getBaseUrl = () => {
  // Use only KRONOP_API_URL - single source of truth
  const url = API_KEYS.KRONOP_API_URL;
  return url;
};

const base = getBaseUrl();
const cleanBase = base.replace(/\/+$/, ''); 
export const API_URL = cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;

// Create a simple fetch-based API client to replace axios
const createApiClient = () => {
  const request = async (url: string, options: RequestInit = {}) => {
    const fullUrl = `${API_URL}${url}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };
    
    const config: RequestInit = {
      headers: defaultHeaders,
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };
    
    // Handle body serialization
    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }
    
    // Remove Content-Type for FormData
    if (config.body instanceof FormData) {
      const { 'Content-Type': _, ...headersWithoutContentType } = config.headers as Record<string, string>;
      config.headers = headersWithoutContentType;
    }
    
    const response = await fetch(fullUrl, config);
    
    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorText = await response.text();
        errorDetails = errorText;
      } catch (e) {
        // Could not read error response
      }
      
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorDetails}`);
    }
    
    return response.json();
  };
  
  return {
    get: (url: string, options?: RequestInit) => request(url, { ...options, method: 'GET' }),
    post: (url: string, data?: any, options?: RequestInit) => request(url, { ...options, method: 'POST', body: data }),
    put: (url: string, data?: any, options?: RequestInit) => request(url, { ...options, method: 'PUT', body: data }),
    delete: (url: string, options?: RequestInit) => request(url, { ...options, method: 'DELETE' }),
  };
};

const API_CLIENT = createApiClient();

export const fetchUnifiedData = async (endpoint: string) => {
  try {
    const response = await API_CLIENT.get(endpoint);
    // Return response directly since our fetch client doesn't wrap in .data
    if (response && response.data) {
      return response.data;
    }
    return response;
  } catch (error) {
    console.error('Unified Fetch Error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

// const CACHE_KEYS = { // Unused - keeping for future use
//   PROFILE: 'user_profile',
//   IMAGES: 'cached_images'
// };
// const imageCache: Record<string, string> = {}; // Unused - keeping for future use
let profileCache: any | null = null;
let profileCacheTime = 0;
const PROFILE_TTL_MS = 60 * 1000;

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const fullUrl = `${API_URL}${endpoint}`;
    
    // BYPASS LOGIN FOR TESTING: Use dummy headers instead of auth
    // const headers = await authService.createAuthHeaders();
    
    // Ensure we have proper headers even without token
    let finalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      // BYPASS LOGIN: No authentication required for testing
      // 'Authorization': 'Bearer dummy_token_for_testing'
    };
    
    // Handle body serialization
    let finalBody = options.body;
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      finalBody = JSON.stringify(options.body);
    }
    
    // Remove Content-Type for FormData or no body
    if (finalBody instanceof FormData || !finalBody) {
      const { 'Content-Type': _, ...headersWithoutContentType } = finalHeaders;
      finalHeaders = headersWithoutContentType;
    }
    
    const response = await fetch(fullUrl, {
      headers: finalHeaders,
      body: finalBody,
      ...options,
    });

    if (!response.ok) {
      // Try to get error response body
      let errorDetails = '';
      try {
        const errorText = await response.text();
        errorDetails = errorText;
      } catch (e) {
        // Could not read error response
      }
      
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorDetails}`);
    }

    const result = await response.json();
    
    // Auto-unwrap data if it exists to fix "filter is not a function" errors
    if (result && result.success && Array.isArray(result.data)) {
      return result.data;
    }
    
    return result;
  } catch (error) {
    throw error;
  }
};

// ==================== CONTENT MANAGEMENT API ====================
// Upload system completely removed - no upload functionality
export const photosApi = {
  getPhotos: async (page = 1, limit = 20, category?: string) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (category && category !== 'all') {
        params.append('category', category);
      }
      
      const result = await apiCall(`/photos?${params}`);
      
      // Handle empty data gracefully
      if (!result || (Array.isArray(result) && result.length === 0)) {
        return [];
      }
      
      return result;
    } catch (error) {
      // Return empty array on error to prevent crashes
      return [];
    }
  },

  getUserPhotos: async () => {
    return await apiCall('/photos/user');
  },

  // Upload functionality removed
  // uploadPhoto: REMOVED

  updatePhoto: async (photoId: string, updates: any) => {
    return await apiCall(`/photos/${photoId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deletePhoto: async (photoId: string) => {
    return await apiCall(`/photos/${photoId}`, {
      method: 'DELETE',
    });
  },

  getPhotoStats: async () => {
    return await apiCall('/photos/stats');
  }
};

export const shayariPhotosApi = {
  getShayariPhotos: async (page = 1, limit = 20, category?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (category && category !== 'all') {
      params.append('category', category);
    }
    
    return await apiCall(`/content/shayari-photo?${params}`);
  },

  getUserShayariPhotos: async () => {
    console.log('📝 Calling getUserShayariPhotos API...');
    return await apiCall('/content/shayari-photo');
  },

  // Upload functionality removed
  // uploadShayariPhoto: REMOVED

  updateShayariPhoto: async (photoId: string, updates: any) => {
    return await apiCall(`/shayari-photos/${photoId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteShayariPhoto: async (photoId: string) => {
    return await apiCall(`/shayari-photos/${photoId}`, {
      method: 'DELETE',
    });
  },

  getShayariPhotoStats: async () => {
    return await apiCall('/shayari-photos/stats');
  }
};

export const reelsApi = {
  getReels: async (page = 1, limit = 20) => {
    try {
      console.log('🎬 Calling reelsService.getPublicReels...');
      return await reelsService.getPublicReels(page, limit);
    } catch (error) {
      console.error('🎬 reelsApi.getReels error:', error);
      return [];
    }
  },

  getAllReels: async (page = 1, limit = 20) => {
    try {
      console.log('🎬 Calling reelsService.getPublicReels...');
      return await reelsService.getPublicReels(page, limit);
    } catch (error) {
      console.error('🎬 reelsApi.getAllReels error:', error);
      return [];
    }
  },

  getUserReels: async () => {
    try {
      console.log('🎬 Calling reelsService.getUserReels...');
      return await reelsService.getUserReels();
    } catch (error) {
      console.error('🎬 reelsApi.getUserReels error:', error);
      return [];
    }
  },

  // Upload functionality removed
  // uploadReel: REMOVED

  updateReel: async (reelId: string, updates: any) => {
    try {
      console.log('🎬 Calling reelsService.updateReel...');
      return await reelsService.updateReel(reelId, updates);
    } catch (error) {
      console.error('🎬 reelsApi.updateReel error:', error);
      return null;
    }
  },

  deleteReel: async (reelId: string) => {
    try {
      console.log('🎬 Calling reelsService.deleteReel...');
      return await reelsService.deleteReel(reelId);
    } catch (error) {
      console.error('🎬 reelsApi.deleteReel error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  toggleLike: async (reelId: string) => {
    try {
      console.log('🎬 Calling reelsService.toggleReelLike...');
      return await reelsService.toggleReelLike(reelId);
    } catch (error) {
      console.error('🎬 reelsApi.toggleLike error:', error);
      throw error;
    }
  },

  getReelStats: async () => {
    return await apiCall('/reels/stats');
  }
};

export const videosApi = {
  getVideos: async (page = 1, limit = 20) => {
    try {
      console.log('🎥 Calling videosService.getPublicVideos...');
      return await videosService.getPublicVideos(page, limit);
    } catch (error) {
      console.error('🎥 videosApi.getVideos error:', error);
      return [];
    }
  },

  getAllVideos: async (page = 1, limit = 20) => {
    try {
      console.log('🎥 Calling videosService.getPublicVideos...');
      return await videosService.getPublicVideos(page, limit);
    } catch (error) {
      console.error('🎥 videosApi.getAllVideos error:', error);
      return [];
    }
  },

  getUserVideos: async () => {
    try {
      console.log('🎥 Calling videosService.getUserVideos...');
      return await videosService.getUserVideos();
    } catch (error) {
      console.error('🎥 videosApi.getUserVideos error:', error);
      return [];
    }
  },

  // Upload functionality removed
  // uploadVideo: REMOVED

  updateVideo: async (videoId: string, updates: any) => {
    try {
      console.log('🎥 Calling videosService.updateVideo...');
      return await videosService.updateVideo(videoId, updates);
    } catch (error) {
      console.error('🎥 videosApi.updateVideo error:', error);
      return null;
    }
  },

  deleteVideo: async (videoId: string) => {
    try {
      console.log('🎥 Calling videosService.deleteVideo...');
      return await videosService.deleteVideo(videoId);
    } catch (error) {
      console.error('🎥 videosApi.deleteVideo error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  toggleLike: async (videoId: string) => {
    try {
      console.log('🎥 Calling videosService.toggleVideoLike...');
      return await videosService.toggleVideoLike(videoId);
    } catch (error) {
      console.error('🎥 videosApi.toggleLike error:', error);
      throw error;
    }
  },

  getVideoStats: async () => {
    return await apiCall('/videos/stats');
  }
};

export const storiesApi = {
  getStories: async (page = 1, limit = 20) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return await apiCall(`/stories?${params}`);
  },

  // Upload functionality removed
  // uploadStory: REMOVED
  
  // Add other methods as needed to match pattern
};

export const liveApi = {
  getLive: async (page = 1, limit = 20) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return await apiCall(`/live?${params}`);
  },

  // Upload functionality removed
  // uploadLive: REMOVED
};


export const savedApi = {
  getSaved: async (contentType?: string, page = 1, limit = 20) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      // Add content type filter if provided
      if (contentType) {
        params.append('content_type', contentType);
      }
      
      const endpoint = `/content/saved?${params}`;
      console.log('🔍 Calling savedApi.getSaved with endpoint:', endpoint);
      
      const result = await apiCall(endpoint);
      
      // Handle different response formats
      if (result && result.data && Array.isArray(result.data)) {
        return result.data;
      } else if (result && Array.isArray(result)) {
        return result;
      } else if (result && result.success && result.data) {
        return Array.isArray(result.data) ? result.data : [];
      } else {
        console.warn('🔍 savedApi: Unexpected response format:', result);
        return [];
      }
    } catch (error) {
      console.error('🔍 savedApi.getSaved error:', error);
      // Return empty array on error to prevent app crashes
      return [];
    }
  },
  
  saveItem: async (itemId: string, itemType: string) => {
    console.log('[UPLOADING START] Saving item:', { itemId, itemType });
    console.log('[FILE DETAILS] Item ID:', itemId, 'Type:', itemType);
    
    try {
      const response = await apiCall('/content/save', {
        method: 'POST',
        body: JSON.stringify({ itemId, itemType })
      });
      
      console.log('[UPLOADING SUCCESS] Save successful:', response);
      return response;
    } catch (error) {
      console.error('[UPLOADING ERROR] Save failed:', error);
      throw error;
    }
  },
  
  unsaveItem: async (itemId: string) => {
    return await apiCall(`/content/saved/${itemId}`, {
      method: 'DELETE'
    });
  }
};


// ==================== USER PROFILE API ====================
export const userProfileApi = {
  getCurrentProfile: async () => {
    const now = Date.now();
    if (profileCache && now - profileCacheTime < PROFILE_TTL_MS) {
      return profileCache;
    }
    const result = await apiCall('/users/profile');
    profileCache = result;
    profileCacheTime = now;
    return result;
  },

  getProfile: async (userId: string) => {
    return await apiCall(`/users/${userId}`);
  },

  updateProfile: async (updates: any) => {
    return await apiCall('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  uploadProfileImage: async (formData: FormData, type: 'profile' | 'cover') => {
    console.log('[UPLOADING START] Uploading profile image:', { type });
    console.log('[FILE DETAILS] FormData entries count:', formData.getAll.length);
    
    try {
      const response = await apiCall('/users/upload-image', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      console.log('[SERVER RESPONSE] Profile image upload successful:', response);
      return response;
    } catch (error) {
      console.error('[SERVER RESPONSE] Profile image upload failed:', error);
      throw error;
    }
  },

  getSupporters: async () => {
    return await apiCall('/users/supporters');
  },

  getSupporting: async () => {
    return await apiCall('/users/supporting');
  },

};

// ==================== CHUNK UPLOAD HELPER ====================
// For large video files - upload in chunks

const uploadInChunks = async (
  file: any, 
  videoConfig: BunnyConfigType, 
  videoGuid: string,
  metadata?: any
) => {
  const CHUNK_SIZE = 2 * 1024 * 1024;
  const totalSize = file.size || file.fileSize || 0;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
  
  console.log(`Starting chunk upload: ${totalSize} bytes in ${totalChunks} chunks of ${CHUNK_SIZE} bytes`);
  
  try {
    // Step 1: Initialize upload session
    const initResponse = await fetch(`https://video.bunnycdn.com/library/${videoConfig.libraryId}/videos/${videoGuid}/uploads`, {
      method: 'POST',
      headers: {
        'AccessKey': videoConfig.streamKey || videoConfig.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uploadType: 'chunked'
      })
    });
    
    if (!initResponse.ok) {
      throw new Error(`Failed to initialize chunk upload: ${initResponse.status}`);
    }
    
    const { uploadSessionId } = await initResponse.json();
    
    // Step 2: Upload chunks with retry logic
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalSize);
      const chunk = file.slice ? file.slice(start, end) : file;
      
      console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks} (${start}-${end})`);
      
      // Retry logic for each chunk
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const formData = new FormData();
          formData.append('chunk', chunk);
          formData.append('index', chunkIndex.toString());
          formData.append('totalChunks', totalChunks.toString());
          
          const chunkResponse = await fetch(
            `https://video.bunnycdn.com/library/${videoConfig.libraryId}/videos/${videoGuid}/uploads/${uploadSessionId}`,
            {
              method: 'POST',
              headers: {
                'AccessKey': videoConfig.streamKey || videoConfig.apiKey,
              },
              body: formData
            }
          );
          
          if (chunkResponse.ok) {
            break; // Success, move to next chunk
          } else {
            retryCount++;
            if (retryCount >= maxRetries) {
              throw new Error(`Chunk ${chunkIndex} upload failed after ${maxRetries} retries: ${chunkResponse.status}`);
            }
            console.log(`Chunk ${chunkIndex} failed, retrying... (${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          }
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error;
          }
          console.log(`Chunk ${chunkIndex} error, retrying... (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      // Progress callback could be added here
      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
      console.log(`Upload progress: ${progress}%`);
    }
    
    // Step 3: Finalize upload
    const finalizeResponse = await fetch(`https://video.bunnycdn.com/library/${videoConfig.libraryId}/videos/${videoGuid}/uploads/${uploadSessionId}/complete`, {
      method: 'POST',
      headers: {
        'AccessKey': videoConfig.streamKey || videoConfig.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        totalChunks: totalChunks
      })
    });
    
    if (!finalizeResponse.ok) {
      throw new Error(`Failed to finalize chunk upload: ${finalizeResponse.status}`);
    }
    
    console.log('Chunk upload completed successfully');
    return true;
    
  } catch (error) {
    console.error('Chunk upload error:', error);
    throw error;
  }
};

// Removed unused uploadToBunny function - Using direct Bridge uploads

// ==================== VALIDATION FUNCTIONS ====================
// File type and size validation for different content types

export const validateFileType = (file: any, type: string) => {
  // Simply check if file exists - no strict validation
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  // Always return true for any file type
  // Let BunnyCDN handle the actual validation
  return { valid: true, error: null };
};

export const validateFileSize = (file: any, type: string) => {
  // No file size limits - unlimited uploads allowed
  // Let BunnyCDN handle the actual size limits
  return { valid: true, error: null };
};

export default {
  validateFileType,
  validateFileSize,
  apiCall,
};

// Also export apiCall separately for direct imports
export { apiCall };
