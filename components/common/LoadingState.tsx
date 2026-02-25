// ==================== LOADING STATE COMPONENT ====================
// Beautiful loading spinners and empty states instead of errors
// Silent mode - no error alerts, just graceful UI states

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface LoadingStateProps {
  type: 'loading' | 'empty' | 'error' | 'network';
  title?: string;
  subtitle?: string;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

/**
 * Loading State Component - Shows beautiful UI states instead of errors
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  type,
  title,
  subtitle,
  size = 'medium',
  color = '#2196F3'
}) => {
  const getSizeValue = () => {
    switch (size) {
      case 'small': return 24;
      case 'medium': return 48;
      case 'large': return 72;
      default: return 48;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'medium': return 32;
      case 'large': return 48;
      default: return 32;
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'loading':
        return (
          <>
            <ActivityIndicator 
              size={getSizeValue() as any} 
              color={color}
              style={styles.spinner}
            />
            <Text style={[styles.title, { color }]}>
              {title || 'Loading...'}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle}>
                {subtitle}
              </Text>
            )}
          </>
        );

      case 'empty':
        return (
          <>
            <MaterialIcons 
              name="inbox" 
              size={getIconSize()} 
              color="#9E9E9E"
              style={styles.icon}
            />
            <Text style={[styles.title, { color: '#9E9E9E' }]}>
              {title || 'No Content'}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle}>
                {subtitle}
              </Text>
            )}
          </>
        );

      case 'network':
        return (
          <>
            <MaterialIcons 
              name="wifi-off" 
              size={getIconSize()} 
              color="#FF9800"
              style={styles.icon}
            />
            <Text style={[styles.title, { color: '#FF9800' }]}>
              {title || 'Network Issue'}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle}>
                {subtitle}
              </Text>
            )}
          </>
        );

      case 'error':
        return (
          <>
            <MaterialIcons 
              name="refresh" 
              size={getIconSize()} 
              color="#F44336"
              style={styles.icon}
            />
            <Text style={[styles.title, { color: '#F44336' }]}>
              {title || 'Something went wrong'}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle}>
                {subtitle}
              </Text>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, styles[`container_${size}`]]}>
      {renderContent()}
    </View>
  );
};

// Preset loading states for common use cases
export const LoadingSpinner = ({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) => (
  <LoadingState 
    type="loading" 
    size={size}
    title="Loading content..."
    subtitle="Please wait a moment"
  />
);

export const EmptyState = ({ 
  title = 'No content found', 
  subtitle = 'Try refreshing or check back later' 
}: { 
  title?: string; 
  subtitle?: string; 
}) => (
  <LoadingState 
    type="empty" 
    title={title}
    subtitle={subtitle}
  />
);

export const NetworkError = ({ 
  onRetry 
}: { 
  onRetry?: () => void; 
}) => (
  <LoadingState 
    type="network"
    title="Connection lost"
    subtitle="Check your internet connection"
  />
);

export const ErrorState = ({ 
  title = 'Something went wrong',
  subtitle = 'Please try again later'
}: { 
  title?: string; 
  subtitle?: string; 
}) => (
  <LoadingState 
    type="error"
    title={title}
    subtitle={subtitle}
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container_small: {
    minHeight: 100,
  },
  container_medium: {
    minHeight: 200,
  },
  container_large: {
    minHeight: 300,
  },
  spinner: {
    marginBottom: 16,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LoadingState;
