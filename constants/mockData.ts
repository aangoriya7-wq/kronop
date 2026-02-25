export const MOCK_USER = {
  id: 'user_default',
  username: 'Guest User',
  name: 'Guest',
  avatar_url: 'https://via.placeholder.com/150/000000/FFFFFF?text=Guest',
  cover_image: 'https://via.placeholder.com/800x400/000000/FFFFFF?text=Cover',
  bio: 'Welcome to Kronop! Server is currently unreachable, showing offline mode.',
  location: 'Offline Mode',
  followers: 0,
  following: 0,
  posts: 0,
};

export const MOCK_STORIES = [
  {
    id: 'story_1',
    user_id: 'user_1',
    user_name: 'Kronop Team',
    user_avatar: 'https://via.placeholder.com/100/000000/FFFFFF?text=K',
    media_url: 'https://via.placeholder.com/1080x1920/000000/FFFFFF?text=Story',
    media_type: 'image',
    created_at: new Date().toISOString(),
  }
];

export const MOCK_PHOTOS = Array(10).fill(null).map((_, i) => ({
  id: `photo_${i}`,
  url: `https://via.placeholder.com/400/000000/FFFFFF?text=Photo+${i+1}`,
  title: `Photo ${i+1}`,
  user: {
    username: 'Demo User',
    avatar: 'https://via.placeholder.com/50'
  }
}));

export const MOCK_VIDEOS = Array(10).fill(null).map((_, i) => ({
  id: `video_${i}`,
  thumbnail: `https://via.placeholder.com/400x225/000000/FFFFFF?text=Video+${i+1}`,
  title: `Video ${i+1}`,
  views: 1000,
  duration: '10:00',
  user: {
    username: 'Demo User',
    avatar: 'https://via.placeholder.com/50'
  }
}));

export const MOCK_REELS = Array(10).fill(null).map((_, i) => ({
  id: `reel_${i}`,
  thumbnail: `https://via.placeholder.com/400x700/000000/FFFFFF?text=Reel+${i+1}`,
  title: `Reel ${i+1}`,
  likes: 500,
  user: {
    username: 'Demo User',
    avatar: 'https://via.placeholder.com/50'
  }
}));
