import { useState, useCallback } from 'react';
import { Video, getLongVideos, toggleLike } from '../services/videoService';

export function useLongVideos() {
  const [videos, setVideos] = useState<Video[]>(getLongVideos());

  const handleToggleLike = useCallback((videoId: string) => {
    setVideos(prevVideos => toggleLike(videoId, prevVideos));
  }, []);

  return { videos, toggleLike: handleToggleLike };
}
