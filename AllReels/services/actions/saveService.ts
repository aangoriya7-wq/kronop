// Save service logic - Integrated with Elixir backend

import { Reel } from '../videoService';

// Elixir connection
const ELIXIR_BASE_URL = 'http://localhost:4000/api/v1';

export async function toggleSave(reelId: string, reels: Reel[]): Promise<Reel[]> {
  try {
    // Call Elixir backend
    const response = await fetch(`${ELIXIR_BASE_URL}/interactions/toggle_save`, {
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
          isSaved: result.is_saved,
          saves: result.is_saved ? reel.saves + 1 : reel.saves - 1,
        };
      }
      return reel;
    });

    return updatedReels;
  } catch (error) {
    console.error('Failed to toggle save:', error);
    
    // Fallback to local state
    return reels.map(reel => {
      if (reel.id === reelId) {
        return {
          ...reel,
          isSaved: !reel.isSaved,
          saves: reel.isSaved ? reel.saves - 1 : reel.saves + 1,
        };
      }
      return reel;
    });
  }
}

export async function getSaveCount(reelId: string): Promise<number> {
  try {
    const response = await fetch(`${ELIXIR_BASE_URL}/interactions/get_save_count`, {
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
    return result.save_count;
  } catch (error) {
    console.error('Failed to get save count:', error);
    
    // Fallback to local state
    return 0;
  }
}

export async function getUserSavedReels(userId: string): Promise<Record<string, any>> {
  try {
    const response = await fetch(`${ELIXIR_BASE_URL}/interactions/get_user_saved_reels`, {
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
    return result.saved_reels;
  } catch (error) {
    console.error('Failed to get user saved reels:', error);
    
    // Fallback to empty state
    return {};
  }
}

export async function isSaved(reelId: string, userId: string): Promise<boolean> {
  try {
    const savedReels = await getUserSavedReels(userId);
    return savedReels.hasOwnProperty(reelId);
  } catch (error) {
    console.error('Failed to check if saved:', error);
    return false;
  }
}
