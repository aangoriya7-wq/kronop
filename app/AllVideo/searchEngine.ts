import { useState, useMemo } from 'react';
import { Video } from './services/videoService';

/**
 * Search Engine Logic
 * Complete search functionality for video filtering
 */

export interface SearchEngine {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredResults: Video[];
  clearSearch: () => void;
  hasResults: boolean;
  isSearching: boolean;
}

/**
 * Main Search Hook
 * @param videos - Array of videos to search through
 * @returns Search engine with query state and filtered results
 */
export function useSearchEngine(videos: Video[]): SearchEngine {
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered results based on search query
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return videos;
    }

    const query = searchQuery.toLowerCase().trim();
    
    return videos.filter(video => {
      // Search in title
      const matchesTitle = video.title.toLowerCase().includes(query);
      
      // Search in user name
      const matchesUser = video.user.name.toLowerCase().includes(query);
      
      // Search in description
      const matchesDescription = video.description.toLowerCase().includes(query);
      
      return matchesTitle || matchesUser || matchesDescription;
    });
  }, [videos, searchQuery]);

  // Clear search query
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Helper flags
  const hasResults = filteredResults.length > 0;
  const isSearching = searchQuery.trim().length > 0;

  return {
    searchQuery,
    setSearchQuery,
    filteredResults,
    clearSearch,
    hasResults,
    isSearching,
  };
}
