// Minimal SWR hook stubs to prevent import errors

import { useState, useEffect } from 'react';

export function useSWRContent(url: string) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Minimal mock implementation
    setIsLoading(false);
    setData(null);
  }, [url]);

  return {
    data,
    error,
    isLoading,
    mutate: () => {}
  };
}
