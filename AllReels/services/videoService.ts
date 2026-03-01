// Video data service - Real reels data from server

import { API_ENDPOINTS, fetchWithTimeout, handleApiError } from './apiConfig';
import { generateReelUrls } from './r2Config';

export interface Reel {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  username: string;
  description: string;
  songName: string;
  stars: number;
  comments: number;
  shares: number;
  saves: number;
  isStarred: boolean;
  isSaved: boolean;
  isSupporting: boolean;
  title: string;
  duration: number;
  width: number;
  height: number;
  views: number;
  likes: number;
}

// Mock data as fallback only - NOW USING R2 URLs
const mockReels: Reel[] = [
  {
    id: '1',
    ...generateReelUrls('1'),
    username: 'creator_one',
    description: 'Amazing sunset vibes 🌅 #nature #sunset',
    songName: 'Summer Breeze - Chill Vibes',
    stars: 12500,
    comments: 234,
    shares: 89,
    saves: 456,
    isStarred: false,
    isSaved: false,
    isSupporting: false,
    title: 'Amazing Sunset Vibes',
    duration: 15000,
    width: 1080,
    height: 1920,
    views: 125000,
    likes: 12500
  },
  {
    id: '2',
    ...generateReelUrls('2'),
    username: 'creative_soul',
    description: 'Dream big, create bigger ✨ #motivation #art',
    songName: 'Epic Dreams - Motivational Mix',
    stars: 23400,
    comments: 567,
    shares: 123,
    saves: 789,
    isStarred: false,
    isSaved: false,
    isSupporting: false,
    title: 'Dream Big Create Bigger',
    duration: 12000,
    width: 1080,
    height: 1920,
    views: 234000,
    likes: 23400
  },
  {
    id: '3',
    ...generateReelUrls('3'),
    username: 'adventure_seeker',
    description: 'Life is an adventure 🔥 #travel #explore',
    songName: 'Wild Fire - Adventure Beat',
    stars: 45600,
    comments: 890,
    shares: 234,
    saves: 1234,
    isStarred: false,
    isSaved: false,
    isSupporting: false,
    title: 'Life Adventure',
    duration: 18000,
    width: 1080,
    height: 1920,
    views: 456000,
    likes: 45600
  },
  {
    id: '4',
    ...generateReelUrls('4'),
    username: 'wanderlust_diaries',
    description: 'Escape to paradise 🌴 #beach #vacation',
    songName: 'Island Escape - Tropical Waves',
    stars: 34500,
    comments: 678,
    shares: 156,
    saves: 890,
    isStarred: false,
    isSaved: false,
    isSupporting: false,
    title: 'Paradise Escape',
    duration: 14000,
    width: 1080,
    height: 1920,
    views: 345000,
    likes: 34500
  },
  {
    id: '5',
    ...generateReelUrls('5'),
    username: 'fun_times',
    description: 'Good vibes only 😎 #fun #happy',
    songName: 'Party Anthem - Feel Good Mix',
    stars: 28900,
    comments: 445,
    shares: 198,
    saves: 567,
    isStarred: false,
    isSaved: false,
    isSupporting: false,
    title: 'Good Vibes Only',
    duration: 16000,
    width: 1080,
    height: 1920,
    views: 289000,
    likes: 28900
  },
];

// Fetch real reels from server
export async function getReels(): Promise<Reel[]> {
  try {
    const response = await fetchWithTimeout(API_ENDPOINTS.REELS);

    if (!response.ok) {
      return mockReels;
    }

    const reels = await response.json();
    return reels;
  } catch (error) {
    handleApiError(error);
    return mockReels;
  }
}

// Fetch single reel by ID
export async function getReelById(id: string): Promise<Reel | null> {
  try {
    const response = await fetchWithTimeout(API_ENDPOINTS.REEL_BY_ID(id));

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return mockReels.find(reel => reel.id === id) || null;
  }
}

// Search reels
export async function searchReels(query: string): Promise<Reel[]> {
  try {
    const response = await fetchWithTimeout(API_ENDPOINTS.SEARCH_REELS(query));

    if (!response.ok) {
      return [];
    }

    return await response.json();
  } catch (error) {
    return [];
  }
}

// Get trending reels
export async function getTrendingReels(): Promise<Reel[]> {
  try {
    const response = await fetchWithTimeout(API_ENDPOINTS.TRENDING_REELS);

    if (!response.ok) {
      return mockReels.slice(0, 3); // Return first 3 mock reels as fallback
    }

    return await response.json();
  } catch (error) {
    return mockReels.slice(0, 3);
  }
}
