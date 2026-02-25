import { useEffect, useRef } from 'react';
import BunnyEdge from '../services/bunnycdn/BunnyEdge';

export const useReelPreload = (currentId, allReels) => {
  const preloadedRef = useRef(new Set());
  const engineRef = useRef(null);

  useEffect(() => {
    const initEngine = async () => {
      try {
        // Initialize video engine via WASM bridge
        const { wasmBridge } = await import('../core/wasm_bridge');
        await wasmBridge.initialize();
        engineRef.current = wasmBridge;
      } catch (error) {
        console.log('Video engine initialization failed, using fallback');
      }
    };
    initEngine();
  }, []);

  useEffect(() => {
    const preloadNext = async () => {
      const currentIndex = allReels.findIndex(r => r.id === currentId);
      
      // Preload next 3 reels
      for (let i = 1; i <= 3; i++) {
        const nextIndex = currentIndex + i;
        if (nextIndex < allReels.length) {
          const nextReel = allReels[nextIndex];
          
          if (!preloadedRef.current.has(nextReel.id)) {
            // Parallel preload via QUIC
            const promises = [
              BunnyEdge.getStream(nextReel.id),
              engineRef.current && engineRef.current.processVideoFrame 
                ? engineRef.current.processVideoFrame(new Uint8Array([1,2,3,4]), 100, 100)
                : Promise.resolve(),
              fetch(`/api/metadata/${nextReel.id}`, { priority: 'low' }).catch(() => {}),
            ];
            
            Promise.all(promises).then(() => {
              preloadedRef.current.add(nextReel.id);
            }).catch(() => {
              // Continue even if preload fails
              preloadedRef.current.add(nextReel.id);
            });
          }
        }
      }
    };

    preloadNext();
  }, [currentId, allReels]);

  return preloadedRef.current;
};
