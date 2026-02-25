import { useState, useEffect } from 'react';
import { reelsApi, videosApi, photosApi, storiesApi, liveApi } from '../services/api';

// Video validation function
const validateVideoUrls = async (data, type) => {
  if (!Array.isArray(data)) return data;
  
  // Only validate video content types
  if (!['Reel', 'Video', 'Live', 'Story'].includes(type)) {
    return data;
  }
  
  try {
    const validatedData = [];
    
    for (const item of data) {
      if (item.url) {
        try {
          // Quick HEAD request to check if video URL is accessible
          const response = await fetch(item.url, { 
            method: 'HEAD',
            timeout: 5000
          });
          
          if (response.ok) {
            validatedData.push(item);
          } else {
          }
        } catch (_error) {
        }
      } else {
        validatedData.push(item);
      }
    }
    
    return validatedData;
  } catch (error) {
    console.error('Error validating video URLs:', error);
    return data; // Return original data if validation fails
  }
};

export const useContent = (contentType, initialPage = 1) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isSlowInternet, setIsSlowInternet] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const fetchContent = async (page = currentPage, type = contentType) => {
    setLoading(true);
    setError(null);
    setIsSlowInternet(false);
    
    
    // Add timeout for slow internet detection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout - Slow internet detected')), 10000);
    });
    
    try {
      let apiPromise;
      switch (type) {
        case 'Reel':
          apiPromise = reelsApi.getReels(page);
          break;
        case 'Video':
          apiPromise = videosApi.getVideos(page);
          break;
        case 'Story':
          apiPromise = storiesApi.getStories(page);
          break;
        case 'Live':
          apiPromise = liveApi.getLive(page);
          break;
        case 'Photo':
          apiPromise = photosApi.getPhotos(page);
          break;
        default:
          throw new Error(`Unknown content type: ${type}`);
      }
      
      // Race between API call and timeout
      const result = await Promise.race([apiPromise, timeoutPromise]);
      
      
      // Backend returns { success: true, data: [...] } or just [...] depending on implementation
      // server.js returns { success: true, data: [...] }
      let processedData = [];
      if (result && result.success && Array.isArray(result.data)) {
        processedData = result.data;
      } else if (Array.isArray(result)) {
        processedData = result;
      } else if (result.data && Array.isArray(result.data)) {
        processedData = result.data;
      } else {
        processedData = [];
      }
      
      // Clean URLs for video content to remove extra spaces
      const cleanedData = processedData.map(item => {
        if (item && item.url && typeof item.url === 'string') {
          const cleanedUrl = item.url.trim();
          
          // Validate URL format
          if (!cleanedUrl.startsWith('https')) {
            console.error('❌ INVALID URL FORMAT IN HOOK:', cleanedUrl);
          }
          
          return { ...item, url: cleanedUrl };
        }
        return item;
      });
      
      setData(cleanedData);
      
      // Validate video URLs for video content types
      if (['Reel', 'Video', 'Live', 'Story'].includes(type)) {
        const validatedData = await validateVideoUrls(cleanedData, type);
        setData(validatedData);
      }
      
      setRetryCount(0); // Reset retry count on success
      
      // Pagination handling if backend provides it
      if (result.pagination) {
        setPagination(result.pagination);
      }
    } catch (err) {
      console.error(`❌ [DATA FETCH] ${type} Error:`, err);
      console.error(`❌ [DATA FETCH] ${type} Error Message:`, err.message);
      console.error(`❌ [DATA FETCH] ${type} Error Stack:`, err.stack);
      
      // Handle slow internet detection
      if (err.message.includes('timeout') || err.message.includes('Slow internet')) {
        setIsSlowInternet(true);
        setError('Slow internet detected. Please check your connection.');
        
        // Auto-retry for slow internet (max 3 retries)
        if (retryCount < 3) {
          setRetryCount(retryCount + 1);
          setTimeout(() => fetchContent(page, type), 2000 * (retryCount + 1)); // Exponential backoff
          return;
        }
      } else {
        setError(err.message || 'Failed to load content');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    // Simple pagination logic, assuming backend handles page increment
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchContent(nextPage);
  };

  const refresh = () => {
    setCurrentPage(1);
    fetchContent(1);
  };

  useEffect(() => {
    fetchContent();
  }, [contentType, fetchContent]);

  return {
    data,
    loading,
    error,
    pagination,
    currentPage,
    isSlowInternet,
    retryCount,
    loadMore,
    refresh,
    fetchContent
  };
};

export const useReels = (initialPage = 1) => {
  return useContent('Reel', initialPage);
};

export const useVideos = (initialPage = 1) => {
  return useContent('Video', initialPage);
};

export const useStories = (initialPage = 1) => {
  return useContent('Story', initialPage);
};

export const useLiveStreams = (initialPage = 1) => {
  return useContent('Live', initialPage);
};

export const usePhotos = (initialPage = 1) => {
  return useContent('Photo', initialPage);
};



