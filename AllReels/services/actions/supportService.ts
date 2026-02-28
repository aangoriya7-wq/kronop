// Support service logic - Integrated with Elixir backend

import { Reel } from '../videoService';

// Elixir connection
const ELIXIR_BASE_URL = 'http://localhost:4000/api/v1';

export async function toggleSupport(reelId: string, reels: Reel[]): Promise<Reel[]> {
  try {
    // Get user ID from authentication
    const userId = 'user_' + Math.random().toString(36).substr(2, 9);
    
    // Call Elixir backend for support (follow) - using reel creator's ID
    const reel = reels.find(r => r.id === reelId);
    if (!reel) {
      throw new Error('Reel not found');
    }
    
    const response = await fetch(`${ELIXIR_BASE_URL}/interactions/toggle_support`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_user_id: reel.username, // Using username as user_id for now
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const result = await response.json();
    
    // Update local state
    const updatedReels = reels.map(r => {
      if (r.id === reelId) {
        return {
          ...r,
          isSupporting: result.is_supporting,
        };
      }
      return r;
    });

    return updatedReels;
  } catch (error) {
    console.error('Failed to toggle support:', error);
    
    // Fallback to local state
    return reels.map(reel => {
      if (reel.id === reelId) {
        return {
          ...reel,
          isSupporting: !reel.isSupporting,
        };
      }
      return reel;
    });
  }
}

export async function getSupportCount(userId: string): Promise<number> {
  try {
    const response = await fetch(`${ELIXIR_BASE_URL}/interactions/get_support_count`, {
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
    return result.support_count;
  } catch (error) {
    console.error('Failed to get support count:', error);
    
    // Fallback to local state
    return 0;
  }
}

export async function getUserSupporting(userId: string): Promise<Record<string, any>> {
  try {
    const response = await fetch(`${ELIXIR_BASE_URL}/interactions/get_user_supporting`, {
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
    return result.supporting;
  } catch (error) {
    console.error('Failed to get user supporting:', error);
    
    // Fallback to empty state
    return {};
  }
}

export async function getUserSupporters(userId: string): Promise<Record<string, any>> {
  try {
    const response = await fetch(`${ELIXIR_BASE_URL}/interactions/get_user_supporters`, {
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
    return result.supporters;
  } catch (error) {
    console.error('Failed to get user supporters:', error);
    
    // Fallback to empty state
    return {};
  }
}
