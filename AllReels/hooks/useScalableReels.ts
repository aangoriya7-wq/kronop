// Scalable reels hook for 100M+ users

import { useState, useCallback, useEffect, useRef } from 'react';
import { Reel, getReelsPaginated, getTrendingReels, clearReelCache, getCacheStats } from '../services/scalableVideoService';
import { toggleStar, toggleSave, toggleSupport, incrementComments, incrementShares, shareReel } from '../services/actions';
import { getComments, addComment } from '../services/actions/commentService';

interface Comment {
  id: string;
  username: string;
  text: string;
  timestamp: string;
  likes: number;
}

interface UseScalableReelsOptions {
  initialLoadSize?: number;
  pageSize?: number;
  enableCache?: boolean;
  preloadNextPage?: boolean;
}

export function useScalableReels(options: UseScalableReelsOptions = {}) {
  const {
    initialLoadSize = 20,
    pageSize = 20,
    enableCache = true,
    preloadNextPage = true
  } = options;

  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentReelIndex, setCurrentReelIndex] = useState(0);

  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load initial reels
  useEffect(() => {
    loadInitialReels();
  }, []);

  // Preload next page when approaching end
  useEffect(() => {
    if (preloadNextPage && reels.length > 0 && currentReelIndex >= reels.length - 5 && hasMore && !loadingRef.current) {
      loadMoreReels();
    }
  }, [currentReelIndex, reels.length, hasMore]);

  const loadInitialReels = useCallback(async () => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const result = await getReelsPaginated(1, initialLoadSize);
      setReels(result.reels);
      setHasMore(result.hasMore);
      setCurrentPage(1);
    } catch (err) {
      setError('Failed to load reels');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [initialLoadSize]);

  const loadMoreReels = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;

    loadingRef.current = true;
    const nextPage = currentPage + 1;

    try {
      const result = await getReelsPaginated(nextPage, pageSize);
      setReels(prev => [...prev, ...result.reels]);
      setHasMore(result.hasMore);
      setCurrentPage(nextPage);
    } catch (err) {
      setError('Failed to load more reels');
    } finally {
      loadingRef.current = false;
    }
  }, [currentPage, pageSize, hasMore]);

  const refreshReels = useCallback(async () => {
    if (!enableCache) {
      clearReelCache();
    }
    setCurrentPage(1);
    setReels([]);
    setHasMore(true);
    await loadInitialReels();
  }, [enableCache, loadInitialReels]);

  const handleStar = useCallback(async (reelId: string) => {
    try {
      const updatedReels = await toggleStar(reelId, reels);
      setReels(updatedReels);
    } catch (err) {
      setError('Failed to update star');
    }
  }, [reels]);

  const handleSave = useCallback(async (reelId: string) => {
    try {
      const updatedReels = await toggleSave(reelId, reels);
      setReels(updatedReels);
    } catch (err) {
      setError('Failed to update save');
    }
  }, [reels]);

  const handleSupport = useCallback(async (reelId: string) => {
    try {
      const updatedReels = await toggleSupport(reelId, reels);
      setReels(updatedReels);
    } catch (err) {
      setError('Failed to update support');
    }
  }, [reels]);

  const handleComment = useCallback(async (reelId: string) => {
    setActiveReelId(reelId);
    try {
      const commentsData = await getComments(reelId);
      setComments(commentsData);
    } catch (err) {
      setComments([]);
    }
    setCommentModalVisible(true);
  }, []);

  const handleAddComment = useCallback(async (text: string) => {
    if (!activeReelId) return;

    try {
      const newComment = await addComment(activeReelId, 'you', text);
      setComments(prev => [newComment, ...prev]);
      const updatedReels = await incrementComments(activeReelId, reels);
      setReels(updatedReels);
    } catch (err) {
      setError('Failed to add comment');
    }
  }, [activeReelId, reels]);

  const handleShare = useCallback(async (reel: Reel) => {
    try {
      await shareReel(reel);
      const updatedReels = await incrementShares(reel.id, reels);
      setReels(updatedReels);
    } catch (err) {
      setError('Failed to share reel');
    }
  }, [reels]);

  const handleCloseCommentModal = useCallback(() => {
    setCommentModalVisible(false);
    setActiveReelId(null);
    setComments([]);
  }, []);

  // Memory management
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // Data
    reels,
    currentReelIndex,
    commentModalVisible,
    comments,
    loading,
    error,
    hasMore,
    
    // Actions
    handleStar,
    handleSave,
    handleSupport,
    handleComment,
    handleAddComment,
    handleCloseCommentModal,
    handleShare,
    loadMoreReels,
    refreshReels,
    setCurrentReelIndex,
    
    // Utilities
    clearCache: clearReelCache,
    getCacheStats,
    
    // Loading states
    isLoadingInitial: loading && reels.length === 0,
    isLoadingMore: loading && reels.length > 0,
  };
}
