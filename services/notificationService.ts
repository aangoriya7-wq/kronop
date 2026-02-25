import { API_BASE_URL } from '../constants/network';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const API_URL = API_BASE_URL;

export interface NotificationData {
  title: string;
  body: string;
  data?: any;
}

class NotificationService {
  private unsubscribe: (() => void) | null = null;

  // Initialize notifications and register push token
  async initializeNotifications(userId: string) {
    try {
      if (Constants.appOwnership === 'expo') {
        return;
      }

      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[Notifications] Permission not granted');
        return;
      }

      // Get expo push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      
      if (token) {
        // Register token with backend
        await this.registerToken(userId, token);
        console.log('[Notifications] Expo Push Token registered');
      }

      // Set up notification handler
      this.setupNotificationHandler();
      
    } catch (error) {
      console.error('[Notifications] Initialization error:', error);
    }
  }

  // Register Expo push token with backend
  private async registerToken(userId: string, token: string) {
    try {
      const response = await fetch(`${API_URL}/notifications/register-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          pushToken: token
        })
      });

      if (!response.ok) {
        throw new Error('Failed to register token');
      }

      const data = await response.json();
      console.log('[Notifications] Token registered successfully:', data);
      
    } catch (error) {
      console.error('[Notifications] Token registration error:', error);
    }
  }

  // Setup notification handler
  private setupNotificationHandler() {
    try {
      if (Constants.appOwnership === 'expo') {
        return;
      }

      // Set notification handler for when app is foreground
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch {
      // no-op
    }
  }

  // Send notification to specific user (via backend)
  async sendNotification(recipientId: string, notification: NotificationData) {
    try {
      const response = await fetch(`${API_URL}/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId,
          ...notification
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      const data = await response.json();
      console.log('[Notifications] Notification sent:', data);
      return data;
      
    } catch (error) {
      console.error('[Notifications] Send notification error:', error);
      throw error;
    }
  }

  // Cleanup
  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

export const notificationService = new NotificationService();
