import { API_BASE_URL } from '../constants/network';

const API_URL = API_BASE_URL;

// Generic API call helper
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// ==================== USER PROFILE API ====================
export const userApi = {
  getProfile: async (userId: string) => {
    return await apiCall(`/users/${userId}`);
  },
  
  updateProfile: async (userId: string, userData: any) => {
    return await apiCall(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },
  
};

// ==================== CONTENT API ====================
export const contentApi = {
  uploadContent: async (file: any, metadata: any) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    return await apiCall('/content/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
  
  getUserContent: async (userId: string, contentType?: string, limit = 20, offset = 0) => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...(contentType && { type: contentType }),
    });
    
    return await apiCall(`/users/${userId}/content?${params}`);
  },
  
  updateMetrics: async (contentId: string, metrics: any) => {
    return await apiCall(`/content/${contentId}/metrics`, {
      method: 'POST',
      body: JSON.stringify(metrics),
    });
  },
};

// ==================== SEARCH API ====================
export const searchApi = {
  search: async (query: string, options: any = {}) => {
    const params = new URLSearchParams({
      q: query,
      ...options,
    });
    
    return await apiCall(`/search?${params}`);
  },
  
  getTrending: async (type?: string, limit = 10) => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(type && { type }),
    });
    
    return await apiCall(`/content/trending?${params}`);
  },
  
  getByCategory: async (category: string, type?: string, limit = 20) => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(type && { type }),
    });
    
    return await apiCall(`/content/category/${category}?${params}`);
  },
};

// ==================== SUPPORT API ====================
export const supportApi = {
  supportUser: async (targetUserId: string, currentUserId: string) => {
    return await apiCall('/support/support', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, currentUserId }),
    });
  },
  
  unsupportUser: async (targetUserId: string, currentUserId: string) => {
    return await apiCall('/support/unsupport', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, currentUserId }),
    });
  },
  
  checkSupportStatus: async (targetUserId: string, currentUserId: string) => {
    const params = new URLSearchParams({
      targetUserId,
      currentUserId,
    });
    
    return await apiCall(`/support/status?${params}`);
  },
  
  getSupportStats: async (userId?: string, currentUserId?: string) => {
    const params = new URLSearchParams({
      ...(userId && { userId }),
      ...(currentUserId && { currentUserId }),
    });
    
    return await apiCall(`/support/stats?${params}`);
  },
};

export default {
  userApi,
  contentApi,
  searchApi,
  supportApi,
  apiCall,
};
