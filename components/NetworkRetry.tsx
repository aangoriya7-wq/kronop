import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, 
  Dimensions, Animated 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Simple theme colors to avoid TypeScript issues
const colors = {
  primary: '#FF0000',
  background: {
    primary: '#0F0F0F',
    secondary: '#1F1F1F',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#AAAAAA',
    tertiary: '#717171',
  },
  error: '#FF0000',
};

interface NetworkRetryProps {
  onRetry: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  children: React.ReactNode;
  retryText?: string;
  errorText?: string;
}

export function NetworkRetry({ 
  onRetry, 
  isLoading, 
  error, 
  children, 
  retryText = 'Retry',
  errorText = 'Network request failed'
}: NetworkRetryProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (error) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [error, fadeAnim]);

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    await onRetry();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading content...</Text>
        {retryCount > 0 && (
          <Text style={styles.retryCountText}>Attempt {retryCount + 1}</Text>
        )}
      </View>
    );
  }

  if (error) {
    return (
      <Animated.View style={[styles.errorContainer, { opacity: fadeAnim }]}>
        <View style={styles.errorContent}>
          <MaterialIcons name="wifi-off" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>{errorText}</Text>
          <Text style={styles.errorDescription}>{error}</Text>
          
          <View style={styles.retryInfo}>
            <Text style={styles.retryInfoText}>
              {retryCount === 0 ? 'Please check your internet connection' : `Tried ${retryCount} time${retryCount > 1 ? 's' : ''}`}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>
              {retryCount === 0 ? retryText : `Retry (${retryCount + 1})`}
            </Text>
          </TouchableOpacity>

          {retryCount >= 3 && (
            <View style={styles. troubleshootingContainer}>
              <Text style={styles.troubleshootingTitle}>Troubleshooting:</Text>
              <Text style={styles.troubleshootingText}>• Check internet connection</Text>
              <Text style={styles.troubleshootingText}>• Restart the app</Text>
              <Text style={styles.troubleshootingText}>• Try again later</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  return <>{children}</>;
}

// BunnyCDN specific retry component
export function BunnyCDNRetry({ 
  onRetry, 
  isLoading, 
  error, 
  children,
  contentType = 'content'
}: {
  onRetry: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  children: React.ReactNode;
  contentType?: string;
}) {
  return (
    <NetworkRetry
      onRetry={onRetry}
      isLoading={isLoading}
      error={error}
      retryText={`Retry ${contentType}`}
      errorText={`Failed to load ${contentType}`}
    >
      {children}
    </NetworkRetry>
  );
}

// Hook for network retry logic
export function useNetworkRetry<T>(
  fetchFunction: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchFunction();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Network error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    execute();
  }, dependencies);

  return { data, isLoading, error, retry: execute };
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  retryCountText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: width * 0.8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    width: '100%',
  },
  retryInfoText: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  troubleshootingContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    width: '100%',
  },
  troubleshootingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  troubleshootingText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 4,
  },
});

export default NetworkRetry;
