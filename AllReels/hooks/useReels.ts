// Reels state management hook

import { useState, useCallback } from 'react';
import { Reel, getReels } from '../services/videoService';
import { toggleStar, toggleSave, toggleSupport, incrementComments, incrementShares, shareReel } from '../services/actions';
import { getComments, addComment } from '../services/actions/commentService';

interface Comment {
  id: string;
  username: string;
  text: string;
  timestamp: string;
  likes: number;
}

export function useReels() {
  const [reels, setReels] = useState<Reel[]>(getReels());
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleStar = useCallback(async (reelId: string) => {
    setIsLoading(true);
    try {
      const updatedReels = await toggleStar(reelId, reels);
      setReels(updatedReels);
    } catch (error) {
      console.error('Error toggling star:', error);
    } finally {
      setIsLoading(false);
    }
  }, [reels]);

  const handleSave = useCallback(async (reelId: string) => {
    setIsLoading(true);
    try {
      const updatedReels = await toggleSave(reelId, reels);
      setReels(updatedReels);
    } catch (error) {
      console.error('Error toggling save:', error);
    } finally {
      setIsLoading(false);
    }
  }, [reels]);

  const handleSupport = useCallback(async (reelId: string) => {
    setIsLoading(true);
    try {
      const updatedReels = await toggleSupport(reelId, reels);
      setReels(updatedReels);
    } catch (error) {
      console.error('Error toggling support:', error);
    } finally {
      setIsLoading(false);
    }
  }, [reels]);

  const handleComment = useCallback(async (reelId: string) => {
    setActiveReelId(reelId);
    try {
      const commentsData = await getComments(reelId);
      setComments(commentsData);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    }
    setCommentModalVisible(true);
  }, []);

  const handleAddComment = useCallback(async (text: string) => {
    if (activeReelId) {
      try {
        const newComment = await addComment(activeReelId, 'you', text);
        setComments(prev => [newComment, ...prev]);
        const updatedReels = await incrementComments(activeReelId, reels);
        setReels(updatedReels);
      } catch (error) {
        console.error('Error adding comment:', error);
      }
    }
  }, [activeReelId, reels]);

  const nextReel = useCallback(() => {
    setCurrentReelIndex(prev => (prev + 1) % reels.length);
  }, [reels.length]);

  const previousReel = useCallback(() => {
    setCurrentReelIndex(prev => (prev - 1 + reels.length) % reels.length);
  }, [reels.length]);

  const likeReel = useCallback((reelId: string) => {
    handleStar(reelId);
  }, [handleStar]);

  const shareReelAction = useCallback(async (reelId: string) => {
    const reel = reels.find(r => r.id === reelId);
    if (reel) {
      try {
        await shareReel(reel);
        const updatedReels = await incrementShares(reelId, reels);
        setReels(updatedReels);
      } catch (error) {
        console.error('Error sharing reel:', error);
      }
    }
  }, [reels]);

  const commentReel = useCallback((reelId: string) => {
    handleComment(reelId);
  }, [handleComment]);

  const handleCloseCommentModal = useCallback(() => {
    setCommentModalVisible(false);
    setActiveReelId(null);
  }, []);

  const handleShare = useCallback(async (reel: Reel) => {
    try {
      const success = await shareReel(reel);
      if (success) {
        const updatedReels = await incrementShares(reel.id, reels);
        setReels(updatedReels);
      }
    } catch (error) {
      console.error('Error sharing reel:', error);
    }
  }, [reels]);

  return {
    reels,
    currentReelIndex,
    commentModalVisible,
    comments,
    handleStar,
    handleSave,
    handleSupport,
    handleComment,
    handleAddComment,
    handleCloseCommentModal,
    handleShare,
    nextReel,
    previousReel,
    likeReel,
    shareReel: shareReelAction,
    commentReel,
    isLoading,
    setCurrentReelIndex,
  };
}
