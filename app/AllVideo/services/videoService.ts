export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
  duration: string;
  views: string;
  likes: number;
  isLiked: boolean;
  type: 'long' | 'reel';
  category: string;
  user: {
    name: string;
    avatar: string;
    isSupported: boolean;
    supporters: number;
  };
  description: string;
  comments: number;
}

// Sample video data (mocked)
export const sampleLongVideos: Video[] = [
  {
    id: '1',
    title: 'Stunning Mountain Landscapes in 4K',
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=450&fit=crop',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: '10:24',
    views: '1.2M',
    likes: 45000,
    isLiked: false,
    type: 'long',
    category: 'entertainment',
    user: {
      name: 'Nature Explorer',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
      isSupported: false,
      supporters: 12500,
    },
    description: 'Experience breathtaking mountain landscapes captured in stunning 4K quality. This video takes you through some of the most beautiful mountain ranges in the world, featuring snow-capped peaks, pristine lakes, and dramatic valleys.',
    comments: 1240,
  },
  {
    id: '2',
    title: 'Ocean Waves - Relaxing Nature Sounds',
    thumbnail: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=450&fit=crop',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    duration: '8:15',
    views: '890K',
    likes: 32000,
    isLiked: false,
    type: 'long',
    category: 'music',
    user: {
      name: 'Ocean Vibes',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      isSupported: false,
      supporters: 8900,
    },
    description: 'Relax and unwind with soothing ocean wave sounds. Perfect for meditation, sleep, or creating a peaceful atmosphere. Filmed at various beautiful beaches around the world.',
    comments: 567,
  },
  {
    id: '3',
    title: 'Northern Lights Time Lapse',
    thumbnail: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&h=450&fit=crop',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: '12:30',
    views: '2.1M',
    likes: 67000,
    isLiked: false,
    type: 'long',
    category: 'education',
    user: {
      name: 'Aurora Films',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      isSupported: true,
      supporters: 25000,
    },
    description: 'Witness the magical dance of Northern Lights (Aurora Borealis) in this mesmerizing time-lapse video. Captured over several nights in Iceland and Norway, showcasing nature\'s most spectacular light show.',
    comments: 2100,
  },
  {
    id: '4',
    title: 'Wildlife Documentary - African Safari',
    thumbnail: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=450&fit=crop',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    duration: '15:45',
    views: '3.4M',
    likes: 89000,
    isLiked: false,
    type: 'long',
    category: 'sports',
    user: {
      name: 'Wild Life Pro',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      isSupported: false,
      supporters: 34000,
    },
    description: 'Join us on an unforgettable African safari adventure! This documentary showcases the incredible wildlife of the African savanna, including lions, elephants, giraffes, and many other magnificent creatures in their natural habitat.',
    comments: 3400,
  },
];

// Sample reel videos (short videos)
export const sampleReels: Video[] = [
  {
    id: 'r1',
    title: 'Quick Sunset Timelapse',
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=700&fit=crop',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    duration: '0:30',
    views: '450K',
    likes: 12000,
    isLiked: false,
    type: 'reel',
    category: 'entertainment',
    user: {
      name: 'Quick Clips',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
      isSupported: false,
      supporters: 3400,
    },
    description: 'Beautiful sunset timelapse compressed into 30 seconds.',
    comments: 234,
  },
  {
    id: 'r2',
    title: 'City Lights at Night',
    thumbnail: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=400&h=700&fit=crop',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    duration: '0:45',
    views: '680K',
    likes: 28000,
    isLiked: false,
    type: 'reel',
    category: 'travel',
    user: {
      name: 'Urban Explorer',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      isSupported: true,
      supporters: 12000,
    },
    description: 'Mesmerizing city lights captured in stunning night photography.',
    comments: 567,
  },
];

export function getLongVideos(): Video[] {
  return sampleLongVideos;
}

export function getReels(): Video[] {
  return sampleReels;
}

export function toggleLike(videoId: string, videos: Video[]): Video[] {
  return videos.map(video => {
    if (video.id === videoId) {
      return {
        ...video,
        isLiked: !video.isLiked,
        likes: video.isLiked ? video.likes - 1 : video.likes + 1,
      };
    }
    return video;
  });
}
