import { useContext } from 'react';
import { VideoContext, VideoContextType } from '../context/VideoContext';

export function useVideo(): VideoContextType {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideo must be used within VideoProvider');
  }
  return context;
}
