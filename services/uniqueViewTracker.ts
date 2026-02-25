// Frontend Unique View Tracker for Reels
// Tracks user interactions and sends to backend

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/network';

interface ViewTrackingData {
  userId: string;
  reelId: string;
  viewDuration: number;
  totalDuration: number;
  timestamp: number;
}

class UniqueViewTracker {
  private static instance: UniqueViewTracker;
  private pendingViews: Map<string, ViewTrackingData> = new Map();
  private userId: string | null = null;
  private currentView: {
    reelId: string;
    startTime: number;
    totalDuration: number;
  } | null = null;

  static getInstance(): UniqueViewTracker {
    if (!UniqueViewTracker.instance) {
      UniqueViewTracker.instance = new UniqueViewTracker();
    }
    return UniqueViewTracker.instance;
  }

  // Initialize with user ID
  async initialize(userId: string) {
    this.userId = userId;
    await this.loadPendingViews();
  }

  // Start tracking a new reel view
  startView(reelId: string, totalDuration: number) {
    if (!this.userId) return;

    this.currentView = {
      reelId,
      startTime: Date.now(),
      totalDuration
    };

    console.log(`👁️ Started tracking view for reel ${reelId}`);
  }

  // End current view and track it
  async endView() {
    if (!this.currentView || !this.userId) return;

    const { reelId, startTime, totalDuration } = this.currentView;
    const viewDuration = (Date.now() - startTime) / 1000; // Convert to seconds

    // Only track if user watched for at least 2 seconds
    if (viewDuration >= 2) {
      const trackingData: ViewTrackingData = {
        userId: this.userId,
        reelId,
        viewDuration,
        totalDuration,
        timestamp: Date.now()
      };

      // Add to pending views
      this.pendingViews.set(reelId, trackingData);
      
      // Save to local storage
      await this.savePendingViews();

      // Try to send immediately
      await this.sendViewTracking(trackingData);

      console.log(`⏹️ Ended view for reel ${reelId}: ${viewDuration}s watched`);
    }

    this.currentView = null;
  }

  // Track view progress (for real-time tracking)
  async trackProgress(reelId: string, currentTime: number, totalDuration: number) {
    if (!this.userId || !this.currentView || this.currentView.reelId !== reelId) return;

    const viewDuration = (Date.now() - this.currentView.startTime) / 1000;
    const progress = currentTime / totalDuration;

    // Track significant milestones
    if (progress >= 0.25 && viewDuration >= 5) {
      // 25% milestone
      await this.trackMilestone(reelId, 'quarter', viewDuration, totalDuration);
    } else if (progress >= 0.5 && viewDuration >= 10) {
      // 50% milestone  
      await this.trackMilestone(reelId, 'half', viewDuration, totalDuration);
    } else if (progress >= 0.8 && viewDuration >= 15) {
      // 80% milestone (count as completed view)
      await this.trackMilestone(reelId, 'completed', viewDuration, totalDuration);
    }
  }

  // Track viewing milestones
  private async trackMilestone(reelId: string, milestone: string, viewDuration: number, totalDuration: number) {
    const key = `${reelId}_${milestone}`;
    
    // Check if already tracked this milestone
    const alreadyTracked = await AsyncStorage.getItem(`milestone_${key}`);
    if (alreadyTracked) return;

    // Mark milestone as tracked
    await AsyncStorage.setItem(`milestone_${key}`, Date.now().toString());

    // Send milestone tracking
    try {
      const response = await fetch(`${API_BASE_URL}/reels/track/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          reelId,
          viewDuration,
          totalDuration,
          milestone
        })
      });

      if (response.ok) {
        console.log(`📊 Tracked ${milestone} milestone for reel ${reelId}`);
      }
    } catch (error) {
      console.error('❌ Error tracking milestone:', error);
    }
  }

  // Send view tracking to backend
  private async sendViewTracking(trackingData: ViewTrackingData) {
    try {
      const response = await fetch(`${API_BASE_URL}/reels/track/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trackingData)
      });

      if (response.ok) {
        // Remove from pending if successfully sent
        this.pendingViews.delete(trackingData.reelId);
        await this.savePendingViews();
        
        console.log(`✅ View tracking sent for reel ${trackingData.reelId}`);
        return true;
      } else {
        console.warn('⚠️ View tracking failed, keeping in pending');
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending view tracking:', error);
      return false;
    }
  }

  // Send all pending views
  async syncPendingViews() {
    if (!this.userId || this.pendingViews.size === 0) return;

    console.log(`🔄 Syncing ${this.pendingViews.size} pending views...`);

    const promises = Array.from(this.pendingViews.values()).map(
      trackingData => this.sendViewTracking(trackingData)
    );

    await Promise.allSettled(promises);
    await this.savePendingViews();
  }

  // Save pending views to local storage
  private async savePendingViews() {
    try {
      const data = Array.from(this.pendingViews.values());
      await AsyncStorage.setItem('pending_views', JSON.stringify(data));
    } catch (error) {
      console.error('❌ Error saving pending views:', error);
    }
  }

  // Load pending views from local storage
  private async loadPendingViews() {
    try {
      const data = await AsyncStorage.getItem('pending_views');
      if (data) {
        const views: ViewTrackingData[] = JSON.parse(data);
        this.pendingViews.clear();
        
        // Only load recent views (last 24 hours)
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
        views.forEach(view => {
          if (view.timestamp > dayAgo) {
            this.pendingViews.set(view.reelId, view);
          }
        });

        console.log(`📥 Loaded ${this.pendingViews.size} pending views`);
      }
    } catch (error) {
      console.error('❌ Error loading pending views:', error);
    }
  }

  // Get user's view statistics
  async getViewStats() {
    if (!this.userId) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/reels/user/${this.userId}/seen`);
      
      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
    } catch (error) {
      console.error('❌ Error getting view stats:', error);
    }

    return null;
  }

  // Reset user's views
  async resetViews() {
    if (!this.userId) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/reels/user/${this.userId}/reset`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Clear local data
        this.pendingViews.clear();
        await AsyncStorage.removeItem('pending_views');
        
        // Clear milestones
        const keys = await AsyncStorage.getAllKeys();
        const milestoneKeys = keys.filter(key => key.startsWith('milestone_'));
        await AsyncStorage.multiRemove(milestoneKeys);

        console.log('🔄 User views reset successfully');
        return true;
      }
    } catch (error) {
      console.error('❌ Error resetting views:', error);
    }

    return false;
  }

  // Cleanup old data
  async cleanup() {
    // Clear current view
    this.currentView = null;

    // Clear old milestones (older than 7 days)
    try {
      const keys = await AsyncStorage.getAllKeys();
      const milestoneKeys = keys.filter(key => key.startsWith('milestone_'));
      
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const keysToRemove: string[] = [];

      for (const key of milestoneKeys) {
        const timestamp = await AsyncStorage.getItem(key);
        if (timestamp && parseInt(timestamp) < weekAgo) {
          keysToRemove.push(key);
        }
      }

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        console.log(`🧹 Cleaned up ${keysToRemove.length} old milestones`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up milestones:', error);
    }
  }
}

export const uniqueViewTracker = UniqueViewTracker.getInstance();
