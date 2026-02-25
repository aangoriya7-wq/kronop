import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from '../constants/network';

const API_URL = API_BASE_URL;

type ContentType = 'Reel' | 'Video' | 'Story' | 'Photo' | 'ShayariPhoto';
 
type CacheEntry = {
  data: any[];
  timestamp: number;
};
 
const CACHE: Record<string, CacheEntry> = {};
const TTL_MS = 60 * 1000;
 
const makeKey = (type: ContentType, page: number, limit: number) => `${type}:${page}:${limit}`;
 
const fetchContent = async (type: ContentType, page: number, limit: number): Promise<any[]> => {
  const slug = type === 'Reel' ? 'reels' : type === 'ShayariPhoto' ? 'shayari-photos' : type.toLowerCase();
  const params = new URLSearchParams({ page: String(page), limit: String(limit) }).toString();
  const urlPrimary = `${API_URL}/content/frontend/${type}?${params}`;
  const urlFallback = `${API_URL}/content/${slug}?${params}`;
 
  const tryFetch = async (url: string) => {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const json = await res.json();
    if (Array.isArray(json)) return json;
    if (json && Array.isArray(json.data)) return json.data;
    return [];
  };
 
  try {
    const raw = await tryFetch(urlPrimary);
    return raw.map((item: any) => {
      if (type === 'Reel' || type === 'Video' || type === 'Story') {
        // Prioritize 'url' as it now contains the direct BunnyCDN link
        const videoUrl = item.url || item.video_url || item.signedUrl || item.playbackUrl;
        const thumbnailUrl = item.thumbnail || item.thumbnail_url || item.thumbnailUrl;
        return {
          ...item,
          id: item._id || item.id,
          video_url: videoUrl,
          imageUrl: videoUrl, // Ensure story viewer gets the correct URL
          thumbnail_url: thumbnailUrl,
          views_count: item.views_count || item.views,
          likes_count: item.likes_count || item.likes,
        };
      }
      if (type === 'Photo') {
        const photoUrl = item.photo_url || item.url || item.signedUrl || item.playbackUrl;
        return {
          ...item,
          photo_url: photoUrl,
        };
      }
      if (type === 'ShayariPhoto') {
        const photoUrl = item.photo_url || item.url || item.signedUrl || item.playbackUrl;
        return {
          ...item,
          photo_url: photoUrl,
          shayari_text: item.shayari_text || '',
          shayari_author: item.shayari_author || '',
        };
      }
      return item;
    });
  } catch {
    try {
      return await tryFetch(urlFallback);
    } catch {
      return [];
    }
  }
};
 
export const useSWRContent = (type: ContentType, page = 1, limit = 50) => {
  const key = makeKey(type, page, limit);
  const [data, setData] = useState<any[]>(() => {
    const entry = CACHE[key];
    if (entry && Date.now() - entry.timestamp < TTL_MS) return entry.data;
    return [];
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
 
  const revalidate = useCallback(async () => {
    if (controllerRef.current) controllerRef.current.abort();
    controllerRef.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const fresh = await fetchContent(type, page, limit);
      CACHE[key] = { data: fresh, timestamp: Date.now() };
      setData(fresh);
    } catch (e: any) {
      setError(e?.message || 'error');
    } finally {
      setLoading(false);
    }
  }, [type, page, limit, key]);
 
  useEffect(() => {
    const entry = CACHE[key];
    if (!entry || Date.now() - entry.timestamp >= TTL_MS) {
      revalidate();
    }
  }, [key, revalidate]);
 
  useFocusEffect(
    useCallback(() => {
      revalidate();
    }, [revalidate])
  );
 
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        revalidate();
      }
    });
    return () => {
      sub.remove();
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, [key, revalidate]);
 
  return { data, loading, error, refresh: revalidate };
};
