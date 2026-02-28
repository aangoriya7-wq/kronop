import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { SupabaseAuthService, supabase } from '../services/supabaseAuthService'; // Removed - services folder deleted
// import { User } from '@supabase/supabase-js'; // Removed - using mock

// Mock supabase and User for development
const supabase = {
  auth: {
    onAuthStateChange: (callback: any) => {
      // Mock subscription
      const subscription = {
        unsubscribe: () => {}
      };
      // Simulate auth state change after 1 second
      setTimeout(() => {
        callback('SIGNED_IN', {
          user: {
            id: 'mock_user_id',
            email: 'mock@example.com',
            user_metadata: { name: 'Mock User' }
          },
          access_token: 'mock_token'
        });
      }, 1000);
      return { data: { subscription } };
    }
  }
};

const User = {
  id: 'mock_user_id',
  email: 'mock@example.com',
  user_metadata: { name: 'Mock User' }
};

interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: any;
  [key: string]: any;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
    
    // Set up auth state listener
    const setupAuthListener = async () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
        const authUser = session?.user || null;
        setUser(authUser);
        if (authUser) {
          AsyncStorage.setItem('supabase_token', session?.access_token || '');
        } else {
          AsyncStorage.removeItem('supabase_token');
        }
      });
      return subscription;
    };

    const subscriptionPromise = setupAuthListener();
    
    return () => {
      subscriptionPromise.then(subscription => subscription.unsubscribe());
    };
  }, []);

  const loadUser = async () => {
    try {
      // const result = await SupabaseAuthService.getCurrentSession(); // Removed - using mock
      // Mock session result
      const result = {
        success: true,
        data: User
      };
      
      if (result.success && result.data) {
        setUser(result.data as AuthUser);
      }
    } catch (error) {
      console.error('Auth load error', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // const result = await SupabaseAuthService.signIn(email, password); // Removed - using mock
      // Mock login result
      const result = {
        success: true,
        data: {
          user: User
        }
      };
      
      if (result.success && result.data?.user) {
        setUser(result.data.user as AuthUser);
      }
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const signup = async (email: string, password: string, displayName?: string) => {
    try {
      // const result = await SupabaseAuthService.signUp(email, password, displayName); // Removed - using mock
      // Mock signup result
      const result = {
        success: true,
        data: {
          user: User
        }
      };
      
      if (result.success && result.data?.user) {
        setUser(result.data.user as AuthUser);
      }
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      // await SupabaseAuthService.signOut(); // Removed - using mock
      // Mock logout
      console.log('Mock logout called');
      setUser(null);
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
