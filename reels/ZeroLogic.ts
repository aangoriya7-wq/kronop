import { API_KEYS } from '../constants/Config';

const KRONOP_API_URL = 'https://kronop-9gju.onrender.com';

// Like/Unlike API
export const toggleLike = async (videoId: string, isCurrentlyLiked: boolean): Promise<boolean> => {
  try {
    const response = await fetch(`${KRONOP_API_URL}/api/reels/${videoId}/like`, {
      method: isCurrentlyLiked ? 'DELETE' : 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEYS.BUNNY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Get likes count
export const getLikesCount = async (videoId: string): Promise<number> => {
  try {
    const response = await fetch(`${KRONOP_API_URL}/api/reels/${videoId}/likes`, {
      headers: {
        'Authorization': `Bearer ${API_KEYS.BUNNY}`,
      }
    });
    if (response.ok) {
      const data = await response.json();
      return data.count || 0;
    }
    return 0;
  } catch (error) {
    return 0;
  }
};

// Get comments count
export const getCommentsCount = async (videoId: string): Promise<number> => {
  try {
    const response = await fetch(`${KRONOP_API_URL}/api/reels/${videoId}/comments`, {
      headers: {
        'Authorization': `Bearer ${API_KEYS.BUNNY}`,
      }
    });
    if (response.ok) {
      const data = await response.json();
      return data.count || data.comments?.length || 0;
    }
    return 0;
  } catch (error) {
    return 0;
  }
};

// Post comment
export const postComment = async (videoId: string, text: string): Promise<boolean> => {
  try {
    const response = await fetch(`${KRONOP_API_URL}/api/reels/${videoId}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEYS.BUNNY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Toggle support/follow channel
export const toggleSupport = async (channelName: string, isCurrentlySupported: boolean): Promise<boolean> => {
  try {
    const response = await fetch(`${KRONOP_API_URL}/api/channels/${channelName}/support`, {
      method: isCurrentlySupported ? 'DELETE' : 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEYS.BUNNY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Share reel
export const shareReel = async (videoId: string, title: string): Promise<boolean> => {
  try {
    const shareUrl = `kronop://reels/${videoId}`;
    const webUrl = `https://kronop.app/reels/${videoId}`;
    
    // Try native share first
    if (navigator.share) {
      await navigator.share({
        title: title,
        url: webUrl,
      });
      return true;
    }
    
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(webUrl);
    return true;
  } catch (error) {
    return false;
  }
};

// Check if user liked video
export const checkUserLiked = async (videoId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${KRONOP_API_URL}/api/reels/${videoId}/like/status`, {
      headers: {
        'Authorization': `Bearer ${API_KEYS.BUNNY}`,
      }
    });
    if (response.ok) {
      const data = await response.json();
      return data.liked || false;
    }
    return false;
  } catch (error) {
    return false;
  }
};

// Check if user supports channel
export const checkUserSupports = async (channelName: string): Promise<boolean> => {
  try {
    const response = await fetch(`${KRONOP_API_URL}/api/channels/${channelName}/support/status`, {
      headers: {
        'Authorization': `Bearer ${API_KEYS.BUNNY}`,
      }
    });
    if (response.ok) {
      const data = await response.json();
      return data.supported || false;
    }
    return false;
  } catch (error) {
    return false;
  }
};
