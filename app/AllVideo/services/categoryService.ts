// Category Service - Category data and operations

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export const categories: Category[] = [
  { id: 'all', name: 'All', icon: 'apps' },
  { id: 'music', name: 'Music', icon: 'music-note' },
  { id: 'gaming', name: 'Gaming', icon: 'sports-esports' },
  { id: 'sports', name: 'Sports', icon: 'sports-soccer' },
  { id: 'education', name: 'Education', icon: 'school' },
  { id: 'entertainment', name: 'Entertainment', icon: 'movie' },
  { id: 'news', name: 'News', icon: 'article' },
  { id: 'tech', name: 'Technology', icon: 'computer' },
];

export const getCategoryById = (id: string): Category | undefined => {
  return categories.find(cat => cat.id === id);
};

export const getAllCategories = (): Category[] => {
  return categories;
};
