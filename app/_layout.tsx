// MUST BE AT THE VERY TOP - Critical polyfills for mipd and web3 libraries
import 'react-native-get-random-values';
import 'text-encoding-polyfill';
global.Buffer = require('buffer').Buffer;

// Global type declarations - use type augmentation
declare global {
  interface Window {
    Event?: typeof globalThis.Event;
    CustomEvent?: typeof globalThis.CustomEvent;
    dispatchEvent?: (event: Event) => boolean;
  }
  
  var EventEmitter: any;
}

// Define window object first
if (typeof global.window === 'undefined') {
  global.window = {} as any;
}

// Define Event class before anything else
if (typeof global.Event === 'undefined') {
  const EventClass = class Event {
    static readonly NONE = 0;
    static readonly CAPTURING_PHASE = 1;
    static readonly AT_TARGET = 2;
    static readonly BUBBLING_PHASE = 3;
    
    type: string;
    bubbles: boolean;
    cancelable: boolean;
    defaultPrevented: boolean;
    target: any;
    currentTarget: any;
    eventPhase: number;
    timeStamp: number;
    
    constructor(type: string, eventInitDict?: EventInit) {
      this.type = type;
      this.bubbles = eventInitDict?.bubbles || false;
      this.cancelable = eventInitDict?.cancelable || false;
      this.defaultPrevented = false;
      this.target = null;
      this.currentTarget = null;
      this.eventPhase = EventClass.NONE;
      this.timeStamp = Date.now();
    }
    
    preventDefault() {
      this.defaultPrevented = true;
    }
    
    stopPropagation() {}
    
    stopImmediatePropagation() {}
  };
  
  global.Event = EventClass as any;
}

// Define CustomEvent
if (typeof global.CustomEvent === 'undefined') {
  global.CustomEvent = function(type: string, eventInitDict?: CustomEventInit) {
    const event = new global.Event(type, eventInitDict);
    Object.assign(event, eventInitDict);
    return event;
  } as any;
}

// Add dispatchEvent to window
if (!global.window.dispatchEvent) {
  global.window.dispatchEvent = function(event: any) {
    // Basic dispatchEvent implementation
    return true;
  };
}

// Add addEventListener/removeEventListener to window
if (!global.window.addEventListener) {
  global.window.addEventListener = () => {};
  global.window.removeEventListener = () => {};
}

// Make Event and CustomEvent available on window
global.window.Event = global.Event;
global.window.CustomEvent = global.CustomEvent;

// Polyfills for crypto and other Node.js modules - MUST be loaded first

// Make Buffer available globally
global.Buffer = Buffer;

// Add EventEmitter polyfill
if (typeof global.EventEmitter === 'undefined') {
  global.EventEmitter = class EventEmitter {
    private listeners: { [key: string]: Function[] } = {};
    
    on(event: string, listener: Function) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(listener);
    }
    
    emit(event: string, ...args: any[]) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(listener => listener(...args));
      }
    }
    
    off(event: string, listener: Function) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(l => l !== listener);
      }
    }
  };
}

// Create a comprehensive crypto polyfill to prevent seed of null error
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: <T extends ArrayBufferView>(arr: T): T => {
      const view = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
      for (let i = 0; i < view.length; i++) {
        view[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {} as any,
    randomUUID: (): `${string}-${string}-${string}-${string}-${string}` => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      }) as `${string}-${string}-${string}-${string}-${string}`;
    }
  };
}

// Set up a seed for randombytes to prevent null seed error
if (typeof global.process === 'undefined') {
  global.process = {} as any;
}

if (!global.process.uptime) {
  global.process.uptime = () => Date.now() / 1000;
}

// Seed for random number generation
const seed = Date.now() + Math.random() * 1000000;
if (typeof (global as any).seedrandom === 'undefined') {
  (global as any).seedrandom = seed;
}

import React from 'react';

import { View } from 'react-native';

import { Stack } from 'expo-router';

import { StatusBar } from 'expo-status-bar';

import { AlertProvider } from '../template/ui';
import { AuthProvider } from '../template';
import { GhostStealthProvider } from '../context/GhostStealthContext';

import StatusBarOverlay from '../components/common/StatusBarOverlay';

// Web3 imports
import { createConfig, http } from 'wagmi';
import { mainnet, polygon, arbitrum } from 'viem/chains';
import { walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';

// Create wagmi config
const config = createConfig({
  chains: [mainnet, polygon, arbitrum],
  connectors: [
    walletConnect({ 
      projectId: 'your-project-id', // Replace with your WalletConnect project ID
    }),
    coinbaseWallet({
      appName: 'KRONOP',
      appLogoUrl: 'https://example.com/logo.png', // Replace with your app logo
    }),
  ],
  ssr: false,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
  },
});

// Create React Query client
const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {/* Premium Status Bar Overlay - Global */}
      <StatusBarOverlay style="light" backgroundColor="transparent" translucent={true} />

      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <AlertProvider>
            <AuthProvider>
              <GhostStealthProvider>
                <Stack 
                  screenOptions={{ 
                    headerShown: false,
                    animation: 'none',
                    animationTypeForReplace: 'push',
                    contentStyle: { backgroundColor: '#000' }
                  }}
                >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="login" />
              <Stack.Screen name="edit-profile" />
              <Stack.Screen name="help-center" />

              <Stack.Screen 
                name="chat" 
                options={{ 
                  headerShown: false,
                  animation: 'none',
                  presentation: 'modal',
                  contentStyle: { backgroundColor: '#000' }
                }} 
              />

              <Stack.Screen 
                name="notifications" 
                options={{ 
                  headerShown: false,
                  animation: 'none',
                  presentation: 'modal',
                  contentStyle: { backgroundColor: '#000' }
                }} 
              />

              <Stack.Screen 
                name="songs" 
                options={{ 
                  headerShown: false,
                  animation: 'none',
                  presentation: 'modal',
                  contentStyle: { backgroundColor: '#000' }
                }} 
              />

              <Stack.Screen 
                name="video/[id]" 
                options={{ 
                  headerShown: false,
                  animation: 'none',
                  presentation: 'modal',
                  contentStyle: { backgroundColor: '#000' }
                }} 
              />

              <Stack.Screen 
                name="settings" 
                options={{ 
                  headerShown: false,
                  animation: 'none',
                  contentStyle: { backgroundColor: '#000' }
                }} 
              />

              <Stack.Screen 
                name="verification" 
                options={{ 
                  headerShown: false,
                  animation: 'none',
                  contentStyle: { backgroundColor: '#000' }
                }} 
              />

              <Stack.Screen 
                name="Databes/LiveToolScreen" 
                options={{ 
                  headerShown: false,
                  animation: 'none',
                  presentation: 'modal',
                  contentStyle: { backgroundColor: '#000' }
                }} 
              />

              <Stack.Screen 
                name="Databes/ReelsToolScreen" 
                options={{ 
                  headerShown: false,
                  animation: 'none',
                  presentation: 'modal',
                  contentStyle: { backgroundColor: '#000' }
                }} 
              />

              <Stack.Screen 
                name="Databes/VideoToolScreen" 
                options={{ 
                  headerShown: false,
                  animation: 'none',
                  presentation: 'modal',
                  contentStyle: { backgroundColor: '#000' }
                }} 
              />

              <Stack.Screen 
                name="Databes/PhotoToolScreen" 
                options={{ 
                  headerShown: false,
                  animation: 'none',
                  presentation: 'modal',
                  contentStyle: { backgroundColor: '#000' }
                }} 
              />

              <Stack.Screen 
                name="Databes/StoryToolScreen" 
                options={{ 
                  headerShown: false,
                  animation: 'none',
                  presentation: 'modal',
                  contentStyle: { backgroundColor: '#000' }
                }} 
              />

              <Stack.Screen 
                name="Databes/SongToolScreen" 
                options={{ 
                  headerShown: false,
                  animation: 'none',
                  presentation: 'modal',
                  contentStyle: { backgroundColor: '#000' }
                }} 
              />

              <Stack.Screen 
                name="Databes/BankAccount" 
                options={{ 
                  headerShown: false,
                  animation: 'none',
                  presentation: 'modal',
                  contentStyle: { backgroundColor: '#000' }
                }} 
              />
            </Stack>
          </GhostStealthProvider>
        </AuthProvider>
      </AlertProvider>
    </QueryClientProvider>
  </WagmiProvider>
</View>
  );
}
