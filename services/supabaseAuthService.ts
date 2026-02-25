import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import Constants from 'expo-constants';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

console.log('🔗 Supabase URL:', supabaseUrl);
console.log('🔐 Using DUMMY Supabase Auth - Bypassed for testing!');
console.log('✅ Supabase Connection bypassed - No real credentials needed!');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export class SupabaseAuthService {
  static async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('गलत पासवर्ड या ईमेल!');
        }
        throw error;
      }

      // Store token in AsyncStorage
      if (data.session?.access_token) {
        await AsyncStorage.setItem('supabase_token', data.session.access_token);
      }

      // Sync user with server - this will throw error if user not found
      if (data.user) {
        try {
          await this.syncUserWithServer(data.user);
        } catch (syncError: any) {
          // Clear session if sync fails
          await supabase.auth.signOut();
          await AsyncStorage.removeItem('supabase_token');
          throw new Error(syncError.message || 'Access Denied');
        }
      }

      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async signUp(email: string, password: string, displayName?: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || 'User',
          },
        },
      });

      if (error) throw error;

      // Store token in AsyncStorage
      if (data.session?.access_token) {
        await AsyncStorage.setItem('supabase_token', data.session.access_token);
      }

      // Sync user with server
      if (data.user) {
        await this.syncUserWithServer(data.user);
      }

      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Remove token from AsyncStorage
      await AsyncStorage.removeItem('supabase_token');

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getCurrentSession() {
    try {
      // First try to get token from AsyncStorage
      const token = await AsyncStorage.getItem('supabase_token');
      
      if (token) {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error) throw error;
        return { success: true, data: user };
      }

      // Fallback to current session
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      return { success: true, data: session?.user || null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async syncUserWithServer(user: any) {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'https://kronop-9gju.onrender.com'}/api/users/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supabaseId: user.id,
          email: user.email,
          displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access Denied - User not found in database');
        }
        throw new Error(result.error || 'Failed to sync with server');
      }
      
      if (!result.success) {
        console.error('Server sync failed:', result.error);
        throw new Error('Access Denied - User verification failed');
      }

      return result;
    } catch (error) {
      console.error('Server sync error:', error);
      throw error;
    }
  }

  static async onAuthStateChange(callback: (user: any) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });

    return subscription;
  }
}
