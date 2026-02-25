import React from 'react';
import VideoActionButtons from './VideoActionButtons';

interface VideoButtonsProps {
  isStarred: boolean;
  commentsCount: number;
  sharesCount: number;
  isSaved: boolean;
  onStarPress: () => void;
  onCommentPress: () => void;
  onSharePress: () => void;
  onSavePress: () => void;
  onReportPress: () => void;
  onDownloadPress: () => void;
}

// Thin wrapper to expose a semantic "VideoButtons" component
// without changing the underlying button layout implementation.
export default function VideoButtons(props: VideoButtonsProps) {
  return <VideoActionButtons {...props} />;
}

