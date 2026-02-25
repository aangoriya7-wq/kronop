import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HapticEngine {
  impact: (intensity: number) => void;
  notification: (type: 'success' | 'warning' | 'error') => void;
  selection: () => void;
}

interface ReelContextType {
  hapticEngine: HapticEngine;
  currentReel: any;
  setCurrentReel: (reel: any) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
}

const ReelContext = createContext<ReelContextType | undefined>(undefined);

// Mock haptic engine implementation
const mockHapticEngine: HapticEngine = {
  impact: (intensity: number) => {
    // In real implementation, this would use expo-haptics
    console.log(`Haptic impact with intensity: ${intensity}`);
  },
  notification: (type: 'success' | 'warning' | 'error') => {
    console.log(`Haptic notification: ${type}`);
  },
  selection: () => {
    console.log('Haptic selection');
  },
};

export const ReelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentReel, setCurrentReel] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1.0);

  const value: ReelContextType = {
    hapticEngine: mockHapticEngine,
    currentReel,
    setCurrentReel,
    isPlaying,
    setIsPlaying,
    volume,
    setVolume,
  };

  return <ReelContext.Provider value={value}>{children}</ReelContext.Provider>;
};

export const useReelContext = (): ReelContextType => {
  const context = useContext(ReelContext);
  if (context === undefined) {
    throw new Error('useReelContext must be used within a ReelProvider');
  }
  return context;
};

export default ReelContext;
