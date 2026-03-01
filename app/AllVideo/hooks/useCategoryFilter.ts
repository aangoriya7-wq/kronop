// Category Filter Hook - Manages category selection and filtering

import { useState, useMemo } from 'react';
import { Video } from '@/services/videoService';

export function useCategoryFilter(videos: Video[]) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredVideos = useMemo(() => {
    if (selectedCategory === 'all') {
      return videos;
    }
    return videos.filter(video => video.category === selectedCategory);
  }, [videos, selectedCategory]);

  return {
    selectedCategory,
    setSelectedCategory,
    filteredVideos,
  };
}
