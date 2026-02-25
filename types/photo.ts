export type PhotoCategory = 'all' | 'boys' | 'girls' | 'family' | 'children' | 'flowers' | 'animals';

export interface Photo {
  id: string;
  url: string;
  category: PhotoCategory;
  title: string;
  likes: number;
  userName: string;
  userAvatar: string;
  timestamp: string;
}

export interface PhotoCategoryInfo {
  id: PhotoCategory;
  name: string;
  icon: string;
  coverImage: string;
  description: string;
}
