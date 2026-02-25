import React from 'react';
import { LongVideo } from '../../../services/longVideoService';
import { VideoCard } from '../../../components/ui/VideoCard';

interface VideoItemProps {
  video: LongVideo;
  onPress: () => void;
}

// Thin wrapper so the app can use a clear "VideoItem" abstraction
// while the visual implementation lives in `VideoCard`.
export default function VideoItem({ video, onPress }: VideoItemProps) {
  return <VideoCard video={video} onPress={onPress} />;
}

