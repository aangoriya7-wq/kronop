import { Alert } from 'react-native';

// API base URL - using environment variable or fallback
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'https://kronop-9gju.onrender.com';

// Current user ID (for now using guest user, later will be from auth)
const CURRENT_USER_ID = 'guest_user';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  supporters: number;
  supporting: number;
  posts: number;
  isSupporting: boolean;
}

export interface UserProfile extends User {
  createdAt: string;
  email?: string;
  phone?: string;
}

class UserService {
  private getApiUrl(path: string): string {
    const fullUrl = `${API_BASE_URL}/api/users${path}`;
    console.log(`API URL: ${fullUrl}`);
    return fullUrl;
  }

  private async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    try {
      console.log(`Making request to: ${url}`);
      console.log(`Request method: ${options.method || 'GET'}`);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      console.log(`Response status: ${response.status}`);
      console.log(`Response data:`, data);
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      console.error('Failed URL:', url);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack available'
      });
      throw error;
    }
  }

  // Search users
  async searchUsers(query: string, limit: number = 20, skip: number = 0): Promise<{ success: boolean; data: User[]; message?: string }> {
    try {
      if (!query || query.trim() === '') {
        console.log('Search: Empty query, returning empty results');
        return { success: true, data: [] };
      }

      const trimmedQuery = query.trim();
      console.log(`🔍 Searching for users with query: "${trimmedQuery}"`);
      console.log(`📊 Search params: limit=${limit}, skip=${skip}`);
      
      const url = this.getApiUrl(`/search?q=${encodeURIComponent(trimmedQuery)}&limit=${limit}&skip=${skip}`);
      console.log(`🌐 Search URL: ${url}`);
      
      const response = await this.makeRequest(url);
      
      if (response.success && response.data) {
        console.log(`✅ Search successful: Found ${response.data.length} users`);
        console.log(`📋 Search results:`, response.data);
        return {
          success: true,
          data: response.data,
          message: response.message
        };
      } else {
        console.log('❌ Search returned no results or failed');
        console.log('📋 Response:', response);
        return {
          success: true,
          data: [],
          message: response.message || 'No results found'
        };
      }
    } catch (error) {
      console.error('💥 Search Users Error:', error);
      console.error('🔍 Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack available'
      });
      return { 
        success: true, 
        data: [],
        message: 'No results found'
      };
    }
  }

  // Get user profile by ID
  async getUserProfile(userId: string): Promise<{ success: boolean; data: UserProfile | null }> {
    try {
      const url = this.getApiUrl(`/${userId}`);
      const response = await this.makeRequest(url);
      
      return response;
    } catch (error) {
      console.error('Get User Profile Error:', error);
      return { success: false, data: null };
    }
  }

  // Support/Unsupport user
  async supportUser(userId: string): Promise<{ success: boolean; data: { isSupporting: boolean; supporters: number } | null }> {
    try {
      const url = this.getApiUrl(`/${userId}/support`);
      const response = await this.makeRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          currentUserId: CURRENT_USER_ID,
        }),
      });
      
      return response;
    } catch (error) {
      console.error('Support User Error:', error);
      return { success: false, data: null };
    }
  }

  // Get user's supporters count
  async getSupporters(userId: string): Promise<{ success: boolean; data: User[] }> {
    try {
      const url = this.getApiUrl(`/${userId}/supporters`);
      const response = await this.makeRequest(url);
      
      return response;
    } catch (error) {
      console.error('Get Supporters Error:', error);
      return { success: false, data: [] };
    }
  }

  // Get user's supporting count
  async getSupporting(userId: string): Promise<{ success: boolean; data: User[] }> {
    try {
      const url = this.getApiUrl(`/${userId}/supporting`);
      const response = await this.makeRequest(url);
      
      return response;
    } catch (error) {
      console.error('Get Supporting Error:', error);
      return { success: false, data: [] };
    }
  }

  // Create or update user profile
  async updateProfile(userData: Partial<UserProfile>): Promise<{ success: boolean; data: UserProfile | null }> {
    try {
      const url = this.getApiUrl('/profile');
      const response = await this.makeRequest(url, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
      
      return response;
    } catch (error) {
      console.error('Update Profile Error:', error);
      return { success: false, data: null };
    }
  }

  // Get current user ID (for now returns guest, later will be from auth)
  getCurrentUserId(): string {
    return CURRENT_USER_ID;
  }
}

// Export singleton instance
export const userService = new UserService();

// Export types for use in components
export type { UserService };
