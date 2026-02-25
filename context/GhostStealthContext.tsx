import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GhostStealthContextType {
  isGhostMode: boolean;
  toggleGhostMode: () => void;
  loading: boolean;
}

const GhostStealthContext = createContext<GhostStealthContextType | undefined>(undefined);

export function GhostStealthProvider({ children }: { children: ReactNode }) {
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGhostMode = async () => {
      try {
        const stored = await AsyncStorage.getItem('ghost_stealth_mode');
        if (stored === 'true') {
          setIsGhostMode(true);
        }
      } catch (error) {
        console.error('Error loading ghost mode state', error);
      } finally {
        setLoading(false);
      }
    };

    loadGhostMode();
  }, []);

  const toggleGhostMode = () => {
    setIsGhostMode(prev => {
      const next = !prev;
      AsyncStorage.setItem('ghost_stealth_mode', next ? 'true' : 'false').catch(error => {
        console.error('Error saving ghost mode state', error);
      });
      return next;
    });
  };

  const value: GhostStealthContextType = {
    isGhostMode,
    toggleGhostMode,
    loading,
  };

  return (
    <GhostStealthContext.Provider value={value}>
      {children}
    </GhostStealthContext.Provider>
  );
}

export function useGhostStealth(): GhostStealthContextType {
  const context = useContext(GhostStealthContext);
  if (context === undefined) {
    throw new Error('useGhostStealth must be used within a GhostStealthProvider');
  }
  return context;
}

