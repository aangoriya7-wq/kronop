import AsyncStorage from '@react-native-async-storage/async-storage';

interface ReportData {
  reelId: string;
  userId: string;
  reason: string;
  timestamp: number;
}

class ReportService {
  private API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'https://kronop-9gju.onrender.com';
  private STORAGE_KEY = 'report_data';

  /**
   * Report a video
   */
  async reportVideo(reelId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userId = await AsyncStorage.getItem('user_id') || 'guest_user';
      const timestamp = Date.now();
      
      // Update local storage first
      await this.updateLocalReport(reelId, userId, reason, timestamp);
      
      // Try to sync with MongoDB API (with fallback)
      try {
        const response = await fetch(`${this.API_BASE}/api/reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reelId,
            userId,
            reason,
            timestamp
          })
        });
        
        if (!response.ok) {
          throw new Error(`API sync failed: ${response.status}`);
        }
        
        console.log(`🚨 Video ${reelId} reported successfully (API success)`);
      } catch (apiError) {
        console.warn(`⚠️ Report API sync failed, using local storage only:`, apiError);
        // Continue with local storage only - app still works
      }
      
      return {
        success: true
      };
      
    } catch (error) {
      console.error('❌ Report failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update local report data
   */
  private async updateLocalReport(reelId: string, userId: string, reason: string, timestamp: number): Promise<void> {
    try {
      const existingData = await AsyncStorage.getItem(this.STORAGE_KEY);
      const reports: ReportData[] = existingData ? JSON.parse(existingData) : [];
      
      // Add new report
      reports.push({
        reelId,
        userId,
        reason,
        timestamp
      });
      
      // Keep only last 100 reports
      const limitedReports = reports.slice(-100);
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(limitedReports));
    } catch (error) {
      console.error('❌ Failed to update local report data:', error);
    }
  }

  /**
   * Get all local reports
   */
  async getLocalReports(): Promise<ReportData[]> {
    try {
      const existingData = await AsyncStorage.getItem(this.STORAGE_KEY);
      return existingData ? JSON.parse(existingData) : [];
    } catch (error) {
      console.error('❌ Failed to get local reports:', error);
      return [];
    }
  }

  /**
   * Clear all report data
   */
  async clearReportData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('🧹 Report data cleared');
    } catch (error) {
      console.error('❌ Clear report data failed:', error);
    }
  }
}

// Export singleton instance
export const reportService = new ReportService();
export default reportService;
