import React, { useEffect, useState, memo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, ListRenderItem, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeScreen } from '../components/layout';
import { theme } from '../constants/theme';
import { API_BASE_URL } from '../constants/network';
import OneSignal from 'react-native-onesignal';

interface NotificationItem {
  id: string;
  title?: string;
  body?: string;
  createdAt?: string;
  route?: string;
  data?: any;
}

export default memo(function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [oneSignalInitialized, setOneSignalInitialized] = useState(false);

  const userId = 'guest_user';

  // Initialize OneSignal
  useEffect(() => {
    const initializeOneSignal = async () => {
      try {
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          const appId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID || '';
          if (appId) {
            (OneSignal as any).setAppId(appId);
          }

          (OneSignal as any).setNotificationOpenedHandler((openedEvent: any) => {
            const route = openedEvent?.notification?.additionalData?.route;
            if (typeof route === 'string' && route.length > 0) {
              router.push(route as any);
            }
          });

          try {
            const deviceState = await (OneSignal as any).getDeviceState?.();
            const playerId = deviceState?.userId;
            if (typeof playerId === 'string' && playerId.length > 0) {
              await fetch(`${API_BASE_URL}/notifications/register-onesignal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, playerId })
              });
            }
          } catch {
            // no-op
          }

          setOneSignalInitialized(true);
        }
      } catch (error) {
        console.error('OneSignal initialization error:', error);
      }
    };

    initializeOneSignal();
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/list?userId=${encodeURIComponent(userId)}`);
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        const fallbackText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText}${fallbackText ? `: ${fallbackText.slice(0, 120)}` : ''}`);
      }

      if (!contentType.toLowerCase().includes('application/json')) {
        const fallbackText = await response.text().catch(() => '');
        throw new Error(`Non-JSON response received${fallbackText ? `: ${fallbackText.slice(0, 120)}` : ''}`);
      }

      const data = await response.json();
      if (data?.success) {
        setNotifications(data.data || []);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      if (!oneSignalInitialized) {
        return;
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  };

  const renderItem: ListRenderItem<NotificationItem> = ({ item }) => (
    <View style={styles.notificationItem}>
      <View style={styles.iconContainer}>
        <MaterialIcons name="notifications" size={24} color={theme.colors.primary.main} />
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>{item.title || 'Notification'}</Text>
        <Text style={styles.message}>{item.body || ''}</Text>
        <Text style={styles.time}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</Text>
      </View>
    </View>
  );

  return (
    <SafeScreen style={{ flex: 1, backgroundColor: '#000' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity 
          onPress={sendTestNotification} 
          style={styles.testButton}
          disabled={!oneSignalInitialized}
        >
          <MaterialIcons 
            name="send" 
            size={20} 
            color={oneSignalInitialized ? theme.colors.primary.main : theme.colors.text.tertiary} 
          />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.main} />
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="notifications-none" size={60} color={theme.colors.text.tertiary} />
                <Text style={styles.emptyText}>No notifications yet</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeScreen>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
    backgroundColor: '#000',
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  testButton: {
    marginLeft: 'auto',
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  listContent: {
    padding: theme.spacing.md,
    backgroundColor: '#000',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: '#000',
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    marginRight: theme.spacing.md,
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  message: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  time: {
    fontSize: 10,
    color: theme.colors.text.tertiary,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
    backgroundColor: '#000',
  },
  emptyText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
  },
});
