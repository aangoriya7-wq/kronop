import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import LocalVault from './Storage/LocalVault';
import { API_KEYS } from '../constants/Config';

const KRONOP_API_URL = 'https://kronop-9gju.onrender.com';

interface ReelData {
  id: string;
  videoUrl: string;
  username: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  timestamp: number;
}

interface GhostFeedManagerProps {
  maxReels?: number;
  preloadCount?: number;
  onReelChange?: (reel: ReelData) => void;
  onMemoryWarning?: (usage: number) => void;
}

const GhostFeedManager: React.FC<GhostFeedManagerProps> = ({
  maxReels = 2,
  preloadCount = 1,
  onReelChange,
  onMemoryWarning,
}) => {
  // State management - 2-Reel Only Rule
  const [activeReel, setActiveReel] = useState<ReelData | null>(null);
  const [nextReel, setNextReel] = useState<ReelData | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Refs for performance optimization
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const memoryCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tapCount = useRef<number>(0);

  // LocalVault instance
  const localVault = useRef<LocalVault | null>(null);

  // Initialize LocalVault
  useEffect(() => {
    localVault.current = new LocalVault();
    
    // Start memory monitoring
    memoryCheckIntervalRef.current = setInterval(() => {
      checkMemoryUsage();
    }, 5000) as unknown as NodeJS.Timeout; // Check every 5 seconds
    
    return () => {
      if (memoryCheckIntervalRef.current) {
        clearInterval(memoryCheckIntervalRef.current);
      }
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      // Cleanup on unmount
      purgeOldReels();
    };
  }, []);

  // Check memory usage and warn if needed
  const checkMemoryUsage = useCallback(async () => {
    if (!localVault.current) return;
    
    try {
      const usage = await localVault.current.getMemoryUsage();
      const totalMemory = Platform.OS === 'ios' ? 50 : 30; // MB
      
      if (usage > totalMemory * 0.8) { // 80% threshold
        onMemoryWarning?.(usage);
        
        // Auto-purge if memory is critical (>90%)
        if (usage > totalMemory * 0.9) {
          await purgeOldReels();
        }
      }
    } catch (error) {
      // Silent fail
    }
  }, [onMemoryWarning]);

  // Purge old reels to free memory
  const purgeOldReels = useCallback(async () => {
    if (!localVault.current) return;
    
    try {
      await localVault.current.purgeOldReels();
    } catch (error) {
      // Silent fail
    }
  }, []);

  // Load reel from LocalVault with smart caching
  const loadReelFromVault = useCallback(async (reelId: string): Promise<ReelData | null> => {
    if (!localVault.current) return null;
    
    try {
      // Try Native Buffer first (fastest)
      if (Platform.OS !== 'web') {
        const nativeReel = await localVault.current.getFromNativeBuffer(reelId);
        if (nativeReel) {
          return nativeReel;
        }
      }
      
      // Fallback to regular storage
      const reel = await localVault.current.getReel(reelId);
      if (reel) {
        return reel;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }, []);

  // Save reel to LocalVault with Native Buffer
  const saveReelToVault = useCallback(async (reel: ReelData): Promise<void> => {
    if (!localVault.current) return;
    
    try {
      // Save to Native Buffer for instant access
      if (Platform.OS !== 'web') {
        await localVault.current.saveToNativeBuffer(reel.id, reel);
      }
      
      // Also save to regular storage as backup
      await localVault.current.saveReel(reel);
    } catch (error) {
      // Silent fail
    }
  }, [localVault]);

  // Smart transition with preloading
  const transitionToReel = useCallback(async (targetReelId: string) => {
    if (isTransitioning || !localVault.current) return;
    
    setIsTransitioning(true);
    
    try {
      // Load target reel
      const targetReel = await loadReelFromVault(targetReelId);
      
      if (targetReel) {
        // Preload next reel if available
        const nextReelId = getNextReelId(targetReelId);
        let nextReelData: ReelData | null = null;
        
        if (nextReelId) {
          nextReelData = await loadReelFromVault(nextReelId);
        }
        
        // Smart transition with 1ms delay
        transitionTimeoutRef.current = setTimeout(() => {
          setActiveReel(targetReel);
          setNextReel(nextReelData);
          onReelChange?.(targetReel);
          setIsTransitioning(false);
        }, 1) as unknown as NodeJS.Timeout;
      }
    } catch (error) {
      setIsTransitioning(false);
    }
  }, [isTransitioning, loadReelFromVault, onReelChange]);

  // Get next reel ID for preloading
  const getNextReelId = useCallback((currentId: string): string | null => {
    // This would connect to your feed logic
    // For now, return null (no next reel)
    return null;
  }, []);

  // Initialize with first reel from API
  useEffect(() => {
    const initializeFeed = async () => {
      try {
        // Try to fetch from API first
        const response = await fetch(`${KRONOP_API_URL}/api/reels`, {
          headers: {
            'Authorization': `Bearer ${API_KEYS.BUNNY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            const firstReel = {
              id: data[0]._id || data[0].id,
              videoUrl: data[0].videoUrl || data[0].url,
              username: data[0].username || data[0].channelName,
              description: data[0].title || data[0].description,
              likes: data[0].likes || 0,
              comments: data[0].comments || 0,
              shares: data[0].shares || 0,
              isLiked: false,
              timestamp: Date.now(),
            };
            
            // Save to vault and set as active
            await saveReelToVault(firstReel);
            setActiveReel(firstReel);
            onReelChange?.(firstReel);
            return;
          }
        }
        
        // Fallback to vault or default
        const initialReel = await loadReelFromVault('default');
        if (initialReel) {
          setActiveReel(initialReel);
          onReelChange?.(initialReel);
        }
      } catch (error) {
        // Fallback to local vault
        const initialReel = await loadReelFromVault('default');
        if (initialReel) {
          setActiveReel(initialReel);
          onReelChange?.(initialReel);
        }
      }
    };
    
    initializeFeed();
  }, [loadReelFromVault, saveReelToVault, onReelChange]);

  // Expose methods for parent components
  React.useImperativeHandle(React.createRef<any>(), () => ({
    loadReel: transitionToReel,
    purgeMemory: purgeOldReels,
    getCurrentReel: () => activeReel,
    getNextReel: () => nextReel,
    isTransitioning: () => isTransitioning,
  }));

  return null;
};

// Export GhostFeedManager as default
export default GhostFeedManager;
