import { Photo, PhotoCategory, PhotoCategoryInfo } from '../types/photo';
import { photosApi } from './api';

export const photoCategories: PhotoCategoryInfo[] = [
  {
    id: 'all',
    name: 'All',
    icon: 'grid-view',
    coverImage: 'https://picsum.photos/seed/all-cover/400/500',
    description: 'All photos',
  },
  {
    id: 'boys',
    name: 'Boys',
    icon: 'man',
    coverImage: 'https://picsum.photos/seed/boys-cover/400/500',
    description: 'Photos of boys and men',
  },
  {
    id: 'girls',
    name: 'Girls',
    icon: 'woman',
    coverImage: 'https://picsum.photos/seed/girls-cover/400/500',
    description: 'Photos of girls and women',
  },
  {
    id: 'family',
    name: 'Family',
    icon: 'family-restroom',
    coverImage: 'https://picsum.photos/seed/family-cover/400/500',
    description: 'Family moments and gatherings',
  },
  {
    id: 'children',
    name: 'Children',
    icon: 'child-care',
    coverImage: 'https://picsum.photos/seed/children-cover/400/500',
    description: 'Cute kids and children',
  },
  {
    id: 'flowers',
    name: 'Flowers',
    icon: 'local-florist',
    coverImage: 'https://picsum.photos/seed/flowers-cover/400/500',
    description: 'Beautiful flowers and plants',
  },
  {
    id: 'animals',
    name: 'Animals',
    icon: 'pets',
    coverImage: 'https://picsum.photos/seed/animals-cover/400/500',
    description: 'Cute animals and wildlife',
  },
];

export async function getPhotosByCategory(category: PhotoCategory): Promise<Photo[]> {
  try {
    const response = await photosApi.getPhotos(1, 30, category);
    
    // Check data structure from api.ts wrapper/backend
    // server.js returns { success: true, data: [...] }
    if (response && response.success && Array.isArray(response.data)) {
      return response.data;
    } else if (Array.isArray(response)) {
      return response;
    } else if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching photos for category ${category}:`, error);
    return [];
  }
}

export async function getRelatedPhotos(photoId: string): Promise<Photo[]> {
  // For now, just return random photos from "all" category as we don't have related endpoint yet
  // Or fetch more photos
  return getPhotosByCategory('all');
}
