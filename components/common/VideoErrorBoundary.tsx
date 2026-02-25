import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface VideoErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface VideoErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
}

class VideoErrorBoundary extends React.Component<VideoErrorBoundaryProps, VideoErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: VideoErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): VideoErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🎬 Video Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    
    // Don't show red screen, just log and handle gracefully
    this.retryCount++;
    
    if (this.retryCount <= this.maxRetries) {
      setTimeout(() => {
        this.setState({ hasError: false, error: undefined });
      }, 1000);
    }
  }

  handleRetry = () => {
    this.retryCount = 0;
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultVideoErrorFallback;
      return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

// Default fallback component that shows a simple reload message
const DefaultVideoErrorFallback: React.FC<{ error?: Error; retry: () => void }> = ({ error, retry }) => {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Video loading failed</Text>
      <Text style={styles.retryText} onPress={retry}>
        Tap to retry
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryText: {
    color: '#4CAF50',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

export default VideoErrorBoundary;
