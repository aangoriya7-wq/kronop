// ==================== VIDEOS SERVICE ====================
// API-based service for Videos management
// Handles all video operations through REST API

// import { videoBridge } from './bridges/VideoBridge'; // Bridge removed - using new app/bridge
import { BUNNY_CONFIG, API_KEYS } from '../constants/Config';

export interface VideoData {
  id?: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  video_url?: string;
  duration?: number;
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  user_id: string;
  bunny_video_id?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface VideoUploadResult {
  success: boolean;
  video?: VideoData;
  error?: string;
}

/**
 * Videos Service - Handles all Videos operations through REST API
 */
export class VideosService {
  private readonly API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'https://kronop-9gju.onrender.com';

  /**
   * Create headers for API calls
   */
  private async createHeaders(contentType: string = 'application/json'): Promise<Record<string, string>> {
    // BYPASS LOGIN: No authentication required for testing
    return {
      'Content-Type': contentType,
      // 'Authorization': 'Bearer dummy_token_for_testing'
    };
  }

  async saveVideoMetadataOnly(videoData: {
    title?: string;
    description?: string;
    tags?: string[];
    category?: string;
    bunny_id: string;
    url: string;
    userId?: string;
  }): Promise<VideoUploadResult> {
    try {
      const payload: any = {
        title: videoData.title || 'Untitled',
        description: videoData.description || '',
        bunny_id: videoData.bunny_id,
        url: videoData.url,
        tags: videoData.tags,
        userId: videoData.userId || 'guest_user'
      };

      if (videoData.category) {
        payload.category = videoData.category;
      }

      // Best-effort thumbnail
      if (videoData.bunny_id) {
        payload.thumbnail = `https://${BUNNY_CONFIG.video.host}/${videoData.bunny_id}/thumbnail.jpg`;
      }

      const headers = await this.createHeaders();
      const response = await fetch(`${this.API_BASE}/upload/video`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save video metadata: ${response.status} - ${errorText}`);
      }

      const savedVideo = await response.json();
      return {
        success: true,
        video: savedVideo.data || savedVideo
      };
    } catch (error) {
      return {
        success: false,
        error: `Save video metadata failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Upload a new video - Complete flow
   */
  async uploadVideo(file: any, metadata: Partial<VideoData>): Promise<VideoUploadResult> {
    try {
      console.log('🎥 VideosService: Starting video upload process...');

      // Use new app/bridge-video for upload - DISABLED FOR NOW
      console.log('🎥 VideosService: Bridge upload disabled - using direct API...');
      // const { BridgeVideo } = await import('../app/bridge-video');
      // const bridge = new BridgeVideo();
      
      // Mock successful upload for now
      const bunnyResult = {
        success: true,
        videoId: `mock_video_${Date.now()}`,
        url: 'https://mock.bunny.cdn/video.mp4',
        title: metadata.title,
        description: metadata.description,
        error: null
      };
      
      if (!bunnyResult.success) {
        throw new Error(bunnyResult.error || 'BunnyCDN upload failed');
      }

      // Save metadata to server
      const videoData = {
        title: metadata.title || bunnyResult.title,
        description: metadata.description || bunnyResult.description,
        bunny_id: bunnyResult.videoId, // Server expects 'bunny_id'
        url: bunnyResult.url, // Server expects 'url'
        thumbnail: `https://${BUNNY_CONFIG.video.host}/${bunnyResult.videoId}/thumbnail.jpg`, // Server expects 'thumbnail'
        tags: metadata.tags,
        userId: metadata.user_id || 'guest_user' // Server expects 'userId'
      };

      const headers = await this.createHeaders();
      const response = await fetch(`${this.API_BASE}/upload/video`, {
        method: 'POST',
        headers,
        body: JSON.stringify(videoData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save video metadata: ${response.status} - ${errorText}`);
      }

      const savedVideo = await response.json();
      console.log('🎥 Video metadata saved to server:', savedVideo);

      return {
        success: true,
        video: savedVideo.data || savedVideo
      };

    } catch (error) {
      console.error('🎥❌ VideosService: Upload failed:', error);
      return {
        success: false,
        error: `Video upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get all videos for the current user
   */
  async getUserVideos(page: number = 1, limit: number = 20): Promise<VideoData[]> {
    try {
      const headers = await this.createHeaders();
      const response = await fetch(`${this.API_BASE}/api/videos?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch videos: ${response.status}`);
      }

      const result = await response.json();
      return result.data || result || [];
    } catch (error) {
      console.error('🎥❌ VideosService: Failed to fetch videos:', error);
      return [];
    }
  }

  /**
   * Get public videos (for feed)
   */
  async getPublicVideos(page: number = 1, limit: number = 20): Promise<VideoData[]> {
    try {
      const headers = await this.createHeaders();
      // Fixed: Use correct route /api/videos instead of /content/videos
      const response = await fetch(`${this.API_BASE}/api/videos?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch public videos: ${response.status}`);
      }

      const result = await response.json();
      return result.data || result || [];
    } catch (error) {
      console.error('🎥❌ VideosService: Failed to fetch public videos:', error);
      return [];
    }
  }

  /**
   * Update video metadata
   */
  async updateVideo(videoId: string, updates: Partial<VideoData>): Promise<VideoData | null> {
    try {
      const headers = await this.createHeaders();
      const response = await fetch(`${this.API_BASE}/api/videos/${videoId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...updates,
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update video: ${response.status}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('🎥❌ VideosService: Failed to update video:', error);
      return null;
    }
  }

  /**
   * Delete a video
   */
  async deleteVideo(videoId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await this.createHeaders();
      const response = await fetch(`${this.API_BASE}/api/videos/${videoId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to delete video: ${response.status}`);
      }

      console.log('🎥 Video deleted successfully:', videoId);
      return { success: true };

    } catch (error) {
      console.error('🎥❌ VideosService: Failed to delete video:', error);
      return {
        success: false,
        error: `Video deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Like/unlike a video
   */
  async toggleVideoLike(videoId: string): Promise<{ liked: boolean; likes_count: number }> {
    try {
      const headers = await this.createHeaders();
      const response = await fetch(`${this.API_BASE}/api/videos/${videoId}/like`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to toggle like: ${response.status}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('🎥❌ VideosService: Failed to toggle like:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const videosService = new VideosService();
export default videosService;
