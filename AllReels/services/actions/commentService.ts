// Comment service - handles comment operations - Integrated with Elixir backend

interface Comment {
  id: string;
  username: string;
  text: string;
  timestamp: string;
  likes: number;
}

// Elixir connection
const ELIXIR_BASE_URL = 'http://localhost:4000/api/v1';

// Mock comments data (fallback)
const mockComments: Record<string, Comment[]> = {
  '1': [
    {
      id: 'c1',
      username: 'music_lover',
      text: 'This is amazing! Love the vibes 🔥',
      timestamp: '2h ago',
      likes: 24,
    },
    {
      id: 'c2',
      username: 'dj_beats',
      text: 'Incredible mix! Keep it up',
      timestamp: '5h ago',
      likes: 12,
    },
  ],
  '2': [
    {
      id: 'c3',
      username: 'nature_fan',
      text: 'Beautiful scenery! Where is this?',
      timestamp: '1h ago',
      likes: 18,
    },
  ],
};

export async function getComments(reelId: string): Promise<Comment[]> {
  try {
    const response = await fetch(`${ELIXIR_BASE_URL}/interactions/get_comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reel_id: parseInt(reelId),
        limit: 50,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const result = await response.json();
    return result.comments;
  } catch (error) {
    console.error('Failed to get comments:', error);
    
    // Fallback to mock data
    return mockComments[reelId] || [];
  }
}

export async function addComment(reelId: string, username: string, text: string): Promise<Comment> {
  try {
    const response = await fetch(`${ELIXIR_BASE_URL}/interactions/add_comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reel_id: parseInt(reelId),
        text: text,
        username: username,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const result = await response.json();
    return result.comment;
  } catch (error) {
    console.error('Failed to add comment:', error);
    
    // Fallback to local mock
    const newComment: Comment = {
      id: `c${Date.now()}`,
      username,
      text,
      timestamp: 'Just now',
      likes: 0,
    };

    if (!mockComments[reelId]) {
      mockComments[reelId] = [];
    }
    mockComments[reelId].unshift(newComment);

    return newComment;
  }
}

export async function getCommentCount(reelId: string): Promise<number> {
  try {
    const response = await fetch(`${ELIXIR_BASE_URL}/interactions/get_comment_count`, {
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
    return result.comment_count;
  } catch (error) {
    console.error('Failed to get comment count:', error);
    
    // Fallback to mock data
    return mockComments[reelId]?.length || 0;
  }
}

export async function incrementComments(reelId: string, reels: any[]): Promise<any[]> {
  try {
    const response = await fetch(`${ELIXIR_BASE_URL}/interactions/add_comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reel_id: parseInt(reelId),
        text: '', // Empty comment for increment
        username: 'system',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    // Update local state
    return reels.map(reel =>
      reel.id === reelId
        ? { ...reel, comments: reel.comments + 1 }
        : reel
    );
  } catch (error) {
    console.error('Failed to increment comments:', error);
    
    // Fallback to local state
    return reels.map(reel =>
      reel.id === reelId
        ? { ...reel, comments: reel.comments + 1 }
        : reel
    );
  }
}

export async function likeComment(commentId: string): Promise<Comment> {
  try {
    const response = await fetch(`${ELIXIR_BASE_URL}/interactions/like_comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment_id: commentId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const result = await response.json();
    return result.comment;
  } catch (error) {
    console.error('Failed to like comment:', error);
    
    // Fallback to local mock
    // Find comment in mock data and increment likes
    for (const reelId in mockComments) {
      const commentIndex = mockComments[reelId].findIndex(c => c.id === commentId);
      if (commentIndex !== -1) {
        mockComments[reelId][commentIndex].likes += 1;
        return mockComments[reelId][commentIndex];
      }
    }
    
    throw new Error('Comment not found');
  }
}
