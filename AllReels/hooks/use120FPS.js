import { useEffect, useRef } from 'react';
import { Platform, NativeModules } from 'react-native';

export const use120FPS = (callback) => {
  const frameRef = useRef();
  const lastTimeRef = useRef(0);
  
  useEffect(() => {
    let running = true;
    
    const animate = (time) => {
      if (!running) return;
      
      // 120fps = 8.33ms per frame
      const delta = time - lastTimeRef.current;
      
      if (delta >= 8.33) {
        callback(time);
        lastTimeRef.current = time;
      }
      
      if (Platform.OS === 'android') {
        // Use native 120Hz mode on supported devices
        NativeModules.PerformanceModule?.setRefreshRate(120);
      }
      
      frameRef.current = requestAnimationFrame(animate);
    };
    
    frameRef.current = requestAnimationFrame(animate);
    
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, [callback]);
};
