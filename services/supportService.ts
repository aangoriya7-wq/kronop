// ==================== SUPPORT SERVICE ====================
// Handle support/unsupport functionality for reels
// Sync with server for persistent support data

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SupportData {
  reelId: string;
  userId: string;
  isSupported: boolean;
  timestamp: number;
}

class SupportService {
  private readonly STORAGE_KEY = 'support_data';
  private readonly API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'https://kronop-9gju.onrender.com';

  /**
   * Toggle support for a reel
   */
  async toggleSupport(reelId: string): Promise<{ success: boolean; isSupported: boolean; error?: string }> {
    try {
      const userId = await AsyncStorage.getItem('user_id') || 'guest_user';
      const timestamp = Date.now();
      
      // Check current support status
      const currentSupport = await this.getSupportStatus(reelId, userId);
      const newSupportStatus = !currentSupport;
      
      // Update local storage first
      await this.updateLocalSupport(reelId, userId, newSupportStatus, timestamp);
      
      // Try to sync with server API (with fallback)
      try {
        const response = await fetch(`${this.API_BASE}/api/support`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reelId,
            userId,
            isSupported: newSupportStatus,
            timestamp
          })
        });
        
        if (!response.ok) {
          throw new Error(`API sync failed: ${response.status}`);
        }
        
        console.log(`🎯 Support ${newSupportStatus ? 'added' : 'removed'} for reel ${reelId} (API success)`);
      } catch (apiError) {
        console.warn(`⚠️ API sync failed, using local storage only:`, apiError);
        // Continue with local storage only - app still works
      }
      
      return {
        success: true,
        isSupported: newSupportStatus
      };
      
    } catch (error) {
      console.error('❌ Support toggle failed:', error);
      return {
        success: false,
        isSupported: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get support status for a specific reel
   */
  async getSupportStatus(reelId: string, userId?: string): Promise<boolean> {
    try {
      const currentUserId = userId || await AsyncStorage.getItem('user_id') || 'guest_user';
      const supportData = await this.getAllSupportData();
      
      const support = supportData.find(s => 
        s.reelId === reelId && s.userId === currentUserId
      );
      
      return support?.isSupported || false;
    } catch (error) {
      console.error('❌ Get support status failed:', error);
      return false;
    }
  }

  /**
   * Get all support data from local storage
   */
  async getAllSupportData(): Promise<SupportData[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Get all support data failed:', error);
      return [];
    }
  }

  /**
   * Update local support data
   */
  private async updateLocalSupport(reelId: string, userId: string, isSupported: boolean, timestamp: number): Promise<void> {
    try {
      const supportData = await this.getAllSupportData();
      
      // Remove existing support for this reel/user combination
      const filteredData = supportData.filter(s => 
        !(s.reelId === reelId && s.userId === userId)
      );
      
      // Add new support data
      filteredData.push({
        reelId,
        userId,
        isSupported,
        timestamp
      });
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredData));
    } catch (error) {
      console.error('❌ Update local support failed:', error);
    }
  }

  /**
   * Sync all local support data with server
   */
  async syncWithServer(): Promise<{ success: boolean; synced: number; error?: string }> {
    try {
      const supportData = await this.getAllSupportData();
      
      if (supportData.length === 0) {
        return { success: true, synced: 0 };
      }
      
      const response = await fetch(`${this.API_BASE}/api/support/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supportData
        })
      });
      
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`🔄 Synced ${supportData.length} support records to server`);
      
      return {
        success: true,
        synced: supportData.length
      };
      
    } catch (error) {
      console.error('❌ Server sync failed:', error);
      return {
        success: false,
        synced: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get support count for a reel
   */
  async getSupportCount(reelId: string): Promise<number> {
    try {
      const response = await fetch(`${this.API_BASE}/api/support/count/${reelId}`);
      
      if (!response.ok) {
        return 0;
      }
      
      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error('❌ Get support count failed:', error);
      return 0;
    }
  }

  /**
   * Clear all local support data
   */
  async clearSupportData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('🧹 Support data cleared');
    } catch (error) {
      console.error('❌ Clear support data failed:', error);
    }
  }
}

// Export singleton instance
export const supportService = new SupportService();
export default supportService;
