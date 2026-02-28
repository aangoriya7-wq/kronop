// Share service logic - Integrated with Elixir backend

import { Share } from 'react-native';
import { Reel } from '../videoService';

// Elixir connection
const ELIXIR_BASE_URL = 'http://localhost:4000/api/v1';

export async function incrementShares(reelId: string, reels: Reel[]): Promise<Reel[]> {
  try {
    // Call Elixir backend
    const response = await fetch(`${ELIXIR_BASE_URL}/interactions/increment_share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reel_id: parseInt(reelId),
        platform: 'mobile', // Default platform
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
          shares: reel.shares + 1,
        };
      }
      return reel;
    });

    return updatedReels;
  } catch (error) {
    console.error('Failed to increment shares:', error);
    
    // Fallback to local state
    return reels.map(reel => {
      if (reel.id === reelId) {
        return {
          ...reel,
          shares: reel.shares + 1,
        };
      }
      return reel;
    });
  }
}

export async function shareReel(reel: Reel): Promise<boolean> {
  try {
    // Call Elixir backend to increment share count
    await incrementShares(reel.id, [reel]);
    
    // Use React Native Share API
    await Share.share({
      message: `Check out this reel by @${reel.username}: ${reel.description}`,
    });
    return true;
  } catch (error) {
    console.error('Share error:', error);
    return false;
  }
}

export async function getShareCount(reelId: string): Promise<number> {
  try {
    const response = await fetch(`${ELIXIR_BASE_URL}/interactions/get_share_count`, {
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
    return result.share_count;
  } catch (error) {
    console.error('Failed to get share count:', error);
    
    // Fallback to local state
    return 0;
  }
}

export async function getUserSharedReels(userId: string): Promise<Record<string, any>> {
  try {
    const response = await fetch(`${ELIXIR_BASE_URL}/interactions/get_user_shared_reels`, {
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
    return result.shared_reels;
  } catch (error) {
    console.error('Failed to get user shared reels:', error);
    
    // Fallback to empty state
    return {};
  }
}
