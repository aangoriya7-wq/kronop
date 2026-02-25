import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ==================== NETWORK CONFIGURATION ====================
// Render deployment URL configuration

const PORT = 3000;

// Use Render URL for deployment
const getApiBaseUrl = () => {
  // Check for primary environment variable first (Render URL)
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    const cleanBase = process.env.EXPO_PUBLIC_API_BASE_URL.replace(/\/+$/, '');
    console.log('[NETWORK_CONFIG]: Using EXPO_PUBLIC_API_BASE_URL');
    return cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
  }
  
  // Check for secondary environment variable
  if (process.env.EXPO_PUBLIC_API_URL) {
    const cleanBase = process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
    console.log('[NETWORK_CONFIG]: Using EXPO_PUBLIC_API_URL');
    return cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
  }
  
  // Development fallback
  if (__DEV__) {
    const devUrl = process.env.DEV_API_URL || 'http://0.0.0.0:3000';
    const cleanBase = devUrl.replace(/\/+$/, '');
    console.log('[NETWORK_CONFIG]: Using development URL');
    return cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
  }

  // Production fallback to Render URL
  const renderUrl = 'https://kronop-9gju.onrender.com';
  const cleanBase = renderUrl.replace(/\/+$/, '');
  console.log('[NETWORK_CONFIG]: Using Render fallback URL');
  return cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
};

export const API_BASE_URL = getApiBaseUrl();
export const DEV_PORT = PORT;

