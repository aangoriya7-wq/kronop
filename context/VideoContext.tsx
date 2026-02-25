import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { Video, Comment } from '../types/video';
import { videosService } from '../services/videosService';

export interface VideoContextType {
  videos: Video[];
  loading: boolean;
  fetchVideos: () => Promise<void>;
  likeVideo: (videoId: string) => Promise<void>;
  dislikeVideo: (videoId: string) => Promise<void>;
  shareVideo: (videoId: string) => Promise<string>;
  downloadVideo: (videoId: string) => Promise<void>;
  getVideoById: (id: string) => Promise<Video | null>;
  getComments: (videoId: string) => Promise<Comment[]>;
  addComment: (videoId: string, text: string, parentId?: string) => Promise<Comment>;
  likeComment: (commentId: string) => Promise<void>;
  searchVideos: (query: string) => Promise<Video[]>;
}

export const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: ReactNode }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await videosService.getPublicVideos();
      // Convert VideoData to Video format
      const convertedVideos = data.map(v => ({
        id: v.id || '',
        title: v.title,
        description: v.description || '',
        thumbnailUrl: v.thumbnail_url || '',
        videoUrl: v.video_url || '',
        duration: v.duration || 0,
        views: v.views_count || 0,
        likes: v.likes_count || 0,
        dislikes: 0,
        uploadDate: v.created_at || new Date().toISOString(),
        channelId: v.user_id || 'guest_user',
        channelName: 'Guest User',
        channelAvatar: 'https://picsum.photos/40/40',
        followerCount: 0,
        contentType: 'video' as const
      }));
      setVideos(convertedVideos);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const likeVideo = useCallback(async (videoId: string) => {
    try {
      await videosService.toggleVideoLike(videoId);
      setVideos(prev =>
        prev.map(v =>
          v.id === videoId ? { ...v, likes: v.likes + 1 } : v
        )
      );
    } catch (error) {
      console.error('Failed to like video:', error);
    }
  }, []);

  const getVideoById = useCallback(async (id: string) => {
    // videosService doesn't have getVideoById, return from state
    return videos.find(v => v.id === id) || null;
  }, [videos]);

  const getComments = useCallback(async (videoId: string) => {
    // videosService doesn't have comments, return empty array
    return [];
  }, []);

  const addComment = useCallback(async (videoId: string, text: string, parentId?: string) => {
    // videosService doesn't have comments, return mock Comment
    return {
      id: `comment_${Date.now()}`,
      videoId,
      userId: 'guest_user',
      userName: 'Guest User',
      userAvatar: 'https://picsum.photos/40/40',
      text,
      likes: 0,
      timestamp: new Date().toISOString(),
      parentId
    };
  }, []);

  const likeComment = useCallback(async (commentId: string) => {
    // videosService doesn't have comment likes, mock implementation
    console.log('Like comment:', commentId);
  }, []);

  const dislikeVideo = useCallback(async (videoId: string) => {
    try {
      await videosService.toggleVideoLike(videoId);
      setVideos(prev =>
        prev.map(v =>
          v.id === videoId ? { ...v, dislikes: v.dislikes + 1 } : v
        )
      );
    } catch (error) {
      console.error('Failed to dislike video:', error);
    }
  }, []);

  const shareVideo = useCallback(async (videoId: string) => {
    return `https://kronop.app/video/${videoId}`;
  }, []);

  const downloadVideo = useCallback(async (videoId: string) => {
    // Mock download
    console.log('Download video:', videoId);
  }, []);

  const searchVideos = useCallback(async (query: string) => {
    // videosService doesn't have search, filter from state
    return videos.filter(v => 
      v.title.toLowerCase().includes(query.toLowerCase()) ||
      v.description.toLowerCase().includes(query.toLowerCase())
    );
  }, [videos]);

  return (
    <VideoContext.Provider
      value={{
        videos,
        loading,
        fetchVideos,
        likeVideo,
        dislikeVideo,
        shareVideo,
        downloadVideo,
        getVideoById,
        getComments,
        addComment,
        likeComment,
        searchVideos,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
}

