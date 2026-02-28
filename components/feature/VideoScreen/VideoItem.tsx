import React from 'react';
// import { LongVideo } from '../../../services/longVideoService'; // Removed - services folder deleted
import { VideoCard } from '../../../components/ui/VideoCard';

// Define LongVideo interface since service was removed
interface LongVideo {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  url?: string;
  duration?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  createdAt?: string;
}

interface VideoItemProps {
  video: LongVideo;
  onPress: () => void;
}

// Thin wrapper so the app can use a clear "VideoItem" abstraction
// while the visual implementation lives in `VideoCard`.
export default function VideoItem({ video, onPress }: VideoItemProps) {
  return <VideoCard video={video} onPress={onPress} />;
}

