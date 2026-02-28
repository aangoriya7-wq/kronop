// Minimal useLongVideos hook stub to prevent import errors

import { useState, useEffect } from 'react';

export function useLongVideos() {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadVideos = async () => {
    setIsLoading(true);
    try {
      // Minimal mock implementation
      setVideos([]);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  return {
    videos,
    isLoading,
    error,
    refetch: loadVideos
  };
}
