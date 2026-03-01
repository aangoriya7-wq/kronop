import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AlertProvider } from '@/template';
import { useMemo } from 'react';

export default function RootLayout() {
  // Memoize stack screen options to prevent infinite re-renders
  const stackScreenOptions = useMemo(() => ({
    headerShown: false,
  }), []);

  return (
    <AlertProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={stackScreenOptions}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen 
            name="video/[id]" 
            options={{ 
              headerShown: true,
              presentation: 'modal',
            }} 
          />
        </Stack>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
