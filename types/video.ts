export type ContentType = 'reel' | 'photo' | 'video';

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
  views: number;
  likes: number;
  dislikes: number;
  uploadDate: string;
  channelId: string;
  channelName: string;
  channelAvatar: string;
  followerCount: number;
  contentType: ContentType;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  likes: number;
  timestamp: string;
  replies?: Comment[];
  parentId?: string;
}

export interface Channel {
  id: string;
  name: string;
  avatar: string;
  subscriberCount: number;
  videoCount: number;
  description: string;
}
