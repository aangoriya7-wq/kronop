import React, { lazy, Suspense } from 'react';
import { View } from 'react-native';
import { ReelProvider } from './core/ReelContext';
import PerformanceMonitor from './core/PerformanceMonitor';

// Ultra-fast lazy loading with prefetch
const Star = lazy(() => import('./components/Star'));
const WechatComment = lazy(() => import('./components/comment'));
const ShareComponent = lazy(() => import('./components/share'));
const Save = lazy(() => import('./components/save'));
const Support = lazy(() => import('./components/support'));
const UserInfo = lazy(() => import('./components/UserInfo'));
const RunningTitle = lazy(() => import('./components/runningtitle'));

export {
  Star,
  WechatComment,
  ShareComponent,
  Save,
  Support,
  UserInfo,
  RunningTitle,
  ReelProvider,
  PerformanceMonitor
};

export const initReelEngine = async () => {
  // Initialize WASM bridge instead of direct Zig import
  const { wasmBridge } = await import('./core/wasm_bridge');
  await wasmBridge.initialize();
  
  // Initialize QUIC protocol
  const quic = await import('./services/quic/QUICClient');
  
  // Initialize BunnyCDN
  const bunny = await import('./services/bunnycdn/BunnyEdge');
  
  return { 
    engine: wasmBridge, 
    quic: quic.default, 
    bunny: bunny.default 
  };
};
