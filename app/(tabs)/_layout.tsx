import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { Home, Sparkles, Play, Layers } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: theme.colors.primary.main,
          tabBarInactiveTintColor: theme.colors.text.tertiary,
          animation: 'none',
          sceneStyle: { backgroundColor: '#000000' },
          tabBarStyle: {
            backgroundColor: '#000000',
            borderTopColor: 'transparent',
            borderTopWidth: 0,
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
            marginHorizontal: 5,
            marginBottom: 5,
            height: 55,
            paddingTop: 0,
            paddingBottom: 0,
            paddingHorizontal: 0,
            position: 'absolute',
            bottom: 0,
            width: '97.5%',
            alignSelf: 'center',
            elevation: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.4,
            shadowRadius: 10,
            justifyContent: 'space-around',
            alignItems: 'center',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Home size={24} color={color} strokeWidth={2} />,
          }}
        />
        <Tabs.Screen
          name="reels"
          options={{
            title: 'Reels',
            tabBarIcon: ({ color }) => <Sparkles size={24} color={color} strokeWidth={2} />,
          }}
        />
        <Tabs.Screen
          name="video"
          options={{
            title: 'Video',
            tabBarIcon: ({ color }) => <Play size={24} color={color} strokeWidth={2} />,
          }}
        />
        {/* --- 1. LIVE SECTION --- */}
        <Tabs.Screen
          name="live"
          options={{
            title: 'Live',
            tabBarIcon: ({ color }) => <Ionicons name="radio" size={26} color={color} />,
          }}
        />
        {/* --- 2. DATABASE SECTION - MOVED BETWEEN LIVE AND PROFILE --- */}
        <Tabs.Screen
          name="databas"
          options={{
            title: 'Database',
            tabBarIcon: ({ color }) => <Layers size={24} color={color} strokeWidth={2} />,
          }}
        />
        {/* --- 3. PROFILE SECTION --- */}
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}