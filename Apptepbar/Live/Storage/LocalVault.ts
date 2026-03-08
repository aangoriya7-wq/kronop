import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ReelData {
  id: string;
  videoUrl: string;
  username: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  timestamp: number;
}

interface NativeBufferData {
  [key: string]: {
    data: any;
    timestamp: number;
    accessCount: number;
  };
}

class LocalVault {
  private nativeBuffer: Map<string, any> = new Map();
  private maxNativeBuffer = 10; // Max items in native buffer
  private maxStorageAge = 24 * 60 * 60 * 1000; // 24 hours in ms

  constructor() {
    // Initialize native buffer
    this.loadNativeBuffer();
  }

  // Load native buffer from storage
  private async loadNativeBuffer(): Promise<void> {
    try {
      const bufferData = await AsyncStorage.getItem('native_buffer');
      if (bufferData) {
        const parsed = JSON.parse(bufferData);
        this.nativeBuffer = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.warn('Failed to load native buffer:', error);
    }
  }

  // Save native buffer to storage
  private async saveNativeBuffer(): Promise<void> {
    try {
      const bufferObj = Object.fromEntries(this.nativeBuffer);
      await AsyncStorage.setItem('native_buffer', JSON.stringify(bufferObj));
    } catch (error) {
      console.warn('Failed to save native buffer:', error);
    }
  }

  // Get from Native Buffer (fastest access)
  async getFromNativeBuffer(key: string): Promise<any> {
    const item = this.nativeBuffer.get(key);
    
    if (item) {
      // Update access count and timestamp
      item.accessCount++;
      item.timestamp = Date.now();
      
      // Move to front of buffer (LRU)
      this.nativeBuffer.delete(key);
      this.nativeBuffer.set(key, item);
      
      // Save buffer state
      this.saveNativeBuffer();
      
      console.log('⚡ Native Buffer hit:', key);
      return item.data;
    }
    
    return null;
  }

  // Save to Native Buffer
  async saveToNativeBuffer(key: string, data: any): Promise<void> {
    // Remove oldest item if buffer is full
    if (this.nativeBuffer.size >= this.maxNativeBuffer) {
      const oldestKey = this.nativeBuffer.keys().next().value;
      if (oldestKey) {
        this.nativeBuffer.delete(oldestKey);
      }
    }
    
    // Add new item
    this.nativeBuffer.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 0,
    });
    
    await this.saveNativeBuffer();
    console.log('⚡ Saved to Native Buffer:', key);
  }

  // Get reel from storage (fallback)
  async getReel(reelId: string): Promise<ReelData | null> {
    try {
      const reelData = await AsyncStorage.getItem(`reel_${reelId}`);
      return reelData ? JSON.parse(reelData) : null;
    } catch (error) {
      console.error('Failed to get reel:', error);
      return null;
    }
  }

  // Save reel to storage
  async saveReel(reel: ReelData): Promise<void> {
    try {
      await AsyncStorage.setItem(`reel_${reel.id}`, JSON.stringify(reel));
    } catch (error) {
      console.error('Failed to save reel:', error);
    }
  }

  // Get all live from storage
  async getAllReels(): Promise<ReelData[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const reelKeys = keys.filter(key => key.startsWith('reel_'));
      
      const live = await AsyncStorage.multiGet(reelKeys);
      return live
        .filter(item => item[1] !== null)
        .map(item => JSON.parse(item[1]!));
    } catch (error) {
      console.error('Failed to get all live:', error);
      return [];
    }
  }

  // Purge old live to free memory
  async purgeOldReels(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const reelKeys = keys.filter(key => key.startsWith('reel_'));
      
      for (const key of reelKeys) {
        const reelData = await AsyncStorage.getItem(key);
        if (reelData) {
          const reel: ReelData = JSON.parse(reelData);
          const age = Date.now() - reel.timestamp;
          
          // Remove live older than 24 hours
          if (age > this.maxStorageAge) {
            await AsyncStorage.removeItem(key);
            console.log('🗑️ Purged old reel:', reel.id);
          }
        }
      }
      
      // Also clean native buffer
      const now = Date.now();
      for (const [key, item] of this.nativeBuffer.entries()) {
        if (now - item.timestamp > this.maxStorageAge) {
          this.nativeBuffer.delete(key);
        }
      }
      
      await this.saveNativeBuffer();
    } catch (error) {
      console.error('Failed to purge old live:', error);
    }
  }

  // Get memory usage estimate
  async getMemoryUsage(): Promise<number> {
    try {
      // Estimate memory usage based on stored data
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      
      for (const key of keys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += data.length * 2; // Rough estimate (UTF-16)
        }
      }
      
      // Add native buffer size
      totalSize += this.nativeBuffer.size * 1000; // Estimate per item
      
      return totalSize / (1024 * 1024); // Convert to MB
    } catch (error) {
      console.error('Failed to get memory usage:', error);
      return 0;
    }
  }

  // Clear all data
  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
      this.nativeBuffer.clear();
      console.log('🧹 LocalVault cleared');
    } catch (error) {
      console.error('Failed to clear vault:', error);
    }
  }
}

export default LocalVault;
