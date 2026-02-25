export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  imageUrl: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  timestamp: string;
  viewed: boolean;
}
