// ==================== URL VALIDATION SERVICE ====================
// Validates and fixes URLs in MongoDB data flow

import { getBunnyFullUrl } from '../constants/Config';

export interface ContentData {
  id: string;
  bunny_id?: string;
  url?: string;
  thumbnail_url?: string;
  type: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
  user_profiles?: {
    username?: string;
    avatar_url?: string;
  };
  photo_url?: string;
  shayari_text?: string;
  shayari_author?: string;
}

/**
 * Validates and fixes URLs in content data
 */
export class UrlValidationService {
  
  /**
   * Fix URLs in content data from MongoDB
   */
  static fixContentUrls(content: ContentData): ContentData {
    const fixedContent = { ...content };
    
    // Fix main URL if missing or invalid
    if (!fixedContent.url || fixedContent.url === '') {
      if (fixedContent.bunny_id) {
        fixedContent.url = getBunnyFullUrl(fixedContent.type, fixedContent.bunny_id);
        console.log(`[URL_VALIDATION]: Fixed URL for ${fixedContent.type}:${fixedContent.id} - ${fixedContent.url}`);
      }
    }
    
    // Fix thumbnail URL if missing or invalid
    if (!fixedContent.thumbnail_url || fixedContent.thumbnail_url === '') {
      if (fixedContent.bunny_id) {
        fixedContent.thumbnail_url = getBunnyFullUrl(fixedContent.type, fixedContent.bunny_id);
        console.log(`[URL_VALIDATION]: Fixed thumbnail for ${fixedContent.type}:${fixedContent.id} - ${fixedContent.thumbnail_url}`);
      }
    }
    
    return fixedContent;
  }
  
  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    if (!url || url === '') return false;
    
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Batch fix URLs in content array
   */
  static fixContentUrlsBatch(contents: ContentData[]): ContentData[] {
    return contents.map(content => this.fixContentUrls(content));
  }
}

export default UrlValidationService;
