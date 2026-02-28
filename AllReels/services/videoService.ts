// Video data service - Mock reels data

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

// Mock video URLs (using free video hosting)
const mockReels: Reel[] = [
  {
    id: '1',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/reel1/400/700.jpg',
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
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/reel2/400/700.jpg',
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
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/reel3/400/700.jpg',
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
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/reel4/400/700.jpg',
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
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/reel5/400/700.jpg',
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

export function getReels(): Reel[] {
  return mockReels;
}
