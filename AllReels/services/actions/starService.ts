// Star service logic - Integrated with Elixir backend

import { Reel } from '../videoService';

// Elixir connection
const ELIXIR_BASE_URL = 'http://localhost:4000/api/v1';

export async function toggleStar(reelId: string, reels: Reel[]): Promise<Reel[]> {
  try {
    // Call Elixir backend
    const response = await fetch(`${ELIXIR_BASE_URL}/interactions/toggle_like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reel_id: parseInt(reelId),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const result = await response.json();
    
    // Update local state
    const updatedReels = reels.map(reel => {
      if (reel.id === reelId) {
        return {
          ...reel,
          isStarred: result.is_liked,
          stars: result.is_liked ? reel.stars + 1 : reel.stars - 1,
        };
      }
      return reel;
    });

    return updatedReels;
  } catch (error) {
    console.error('Failed to toggle star:', error);
    
    // Fallback to local state
    return reels.map(reel => {
      if (reel.id === reelId) {
        return {
          ...reel,
          isStarred: !reel.isStarred,
          stars: reel.isStarred ? reel.stars - 1 : reel.stars + 1,
        };
      }
      return reel;
    });
  }
}

export async function getStarCount(reelId: string): Promise<number> {
  try {
    const response = await fetch(`${ELIXIR_BASE_URL}/interactions/get_like_count`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reel_id: parseInt(reelId),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const result = await response.json();
    return result.like_count;
  } catch (error) {
    console.error('Failed to get star count:', error);
    
    // Fallback to local state
    return 0;
  }
}

export async function getUserStarredReels(userId: string): Promise<Record<string, any>> {
  try {
    const response = await fetch(`${ELIXIR_BASE_URL}/interactions/get_user_liked_reels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const result = await response.json();
    return result.liked_reels;
  } catch (error) {
    console.error('Failed to get user starred reels:', error);
    
    // Fallback to empty state
    return {};
  }
}
