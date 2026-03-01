/**
 * AI Enhancement Button Component - Final Fixed Version
 * 
 * Provides AI enhancement toggle for video player
 * Integrates with Phase 1 Rust Engine
 * Shows real-time enhancement status and performance
 * 
 * Features:
 * - AI enhancement toggle button
 * - Real-time status indicator
 * - Performance metrics display
 * - Rust Engine integration status
 * - Adaptive UI based on device capabilities
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Vibration,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import AIEnhancementService, { 
  AIEnhancementOptions, 
  AIEnhancementResult,
  DeviceCapabilities,
  RustEngineIntegration 
} from '@/services/aiEnhancementService';

interface AIEnhancementButtonProps {
  videoUrl: string;
  onEnhancementStart?: (options: AIEnhancementOptions) => void;
  onEnhancementComplete?: (result: AIEnhancementResult) => void;
  onEnhancementError?: (error: string) => void;
  style?: any;
  disabled?: boolean;
  showPerformanceMetrics?: boolean;
  compact?: boolean;
}

export default function AIEnhancementButton({
  videoUrl,
  onEnhancementStart,
  onEnhancementComplete,
  onEnhancementError,
  style,
  disabled = false,
  showPerformanceMetrics = false,
  compact = false,
}: AIEnhancementButtonProps) {
  const insets = useSafeAreaInsets();
  
  // State management
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [enhancementResult, setEnhancementResult] = useState<AIEnhancementResult | null>(null);
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilities | null>(null);
  const [rustIntegration, setRustIntegration] = useState<RustEngineIntegration | null>(null);
  const [showMetrics, setShowMetrics] = useState(false);
  
  // Animation values
  const [pulseAnim] = useState(new Animated.Value(1));
  const [slideAnim] = useState(new Animated.Value(0));
  const [rotateAnim] = useState(new Animated.Value(0));
  
  const aiService = AIEnhancementService.getInstance();

  // Initialize component
  useEffect(() => {
    const initializeComponent = async () => {
      // Get device capabilities
      const capabilities = aiService.getDeviceCapabilities();
      setDeviceCapabilities(capabilities);
      
      // Get Rust Engine integration status
      const rustStatus = aiService.getRustIntegration();
      setRustIntegration(rustStatus);
      
      // Check if video is already enhanced
      const enhancedUrl = await getEnhancedVideoUrl(videoUrl);
      setIsEnhanced(!!enhancedUrl);
    };
    
    initializeComponent();
  }, [videoUrl]);

  // Pulse animation for processing state
  useEffect(() => {
    if (isProcessing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isProcessing, pulseAnim]);

  // Handle enhancement toggle
  const handleToggleEnhancement = useCallback(async () => {
    if (disabled || isProcessing) return;
    
    try {
      if (isEnhanced) {
        // Disable enhancement
        await disableEnhancement();
      } else {
        // Enable enhancement
        await enableEnhancement();
      }
    } catch (error) {
      console.error('Enhancement toggle failed:', error);
      onEnhancementError?.(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [isEnhanced, isProcessing, disabled, videoUrl]);

  const enableEnhancement = async () => {
    setIsProcessing(true);
    onEnhancementStart?.(aiService.getCurrentEnhancementOptions());
    
    // Haptic feedback
    Vibration.vibrate(50);
    
    try {
      // Start enhancement
      const result = await aiService.enhanceVideo(videoUrl, {
        enableEdgeAI: true,
        enableInterpolation: true,
        enableCompression: true,
        targetFPS: 60,
        targetQuality: 'high',
        scaleFactor: 2,
        compressionRatio: 0.5,
        adaptiveOptimization: true,
      });
      
      if (result.success && result.enhancedVideoUrl) {
        // Save enhanced video URL
        await saveEnhancedVideoUrl(videoUrl, result.enhancedVideoUrl);
        setEnhancementResult(result);
        setIsEnhanced(true);
        
        // Success animation
        animateSuccess();
        
        onEnhancementComplete?.(result);
      } else {
        throw new Error(result.error || 'Enhancement failed');
      }
    } catch (error) {
      console.error('Enhancement failed:', error);
      onEnhancementError?.(error instanceof Error ? error.message : 'Enhancement failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const disableEnhancement = async () => {
    setIsProcessing(true);
    
    // Haptic feedback
    Vibration.vibrate(50);
    
    try {
      // Remove enhanced video URL
      await removeEnhancedVideoUrl(videoUrl);
      setIsEnhanced(false);
      setEnhancementResult(null);
      
      // Reset animation
      animateReset();
    } catch (error) {
      console.error('Disable enhancement failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const animateSuccess = () => {
    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTimeout(() => {
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 600);
  };

  const animateReset = () => {
    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue: -1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTimeout(() => {
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 400);
  };

  const getEnhancedVideoUrl = async (originalUrl: string): Promise<string | null> => {
    try {
      // Mock implementation - in reality, this would check storage
      return null;
    } catch (error) {
      return null;
    }
  };

  const saveEnhancedVideoUrl = async (originalUrl: string, enhancedUrl: string): Promise<void> => {
    try {
      // Mock implementation - in reality, this would save to storage
      console.log('Saving enhanced video URL:', enhancedUrl);
    } catch (error) {
      console.error('Failed to save enhanced video URL:', error);
    }
  };

  const removeEnhancedVideoUrl = async (originalUrl: string): Promise<void> => {
    try {
      // Mock implementation - in reality, this would remove from storage
      console.log('Removing enhanced video URL:', originalUrl);
    } catch (error) {
      console.error('Failed to remove enhanced video URL:', error);
    }
  };

  const getButtonColor = () => {
    if (disabled) return colors.textMuted;
    if (isProcessing) return colors.primary;
    if (isEnhanced) return colors.success;
    return colors.primary;
  };

  const getButtonText = () => {
    if (isProcessing) return 'AI Enhancing...';
    if (isEnhanced) return 'AI Enhanced';
    return 'AI Enhance';
  };

  const getButtonIcon = () => {
    if (isProcessing) return 'autorenew';
    if (isEnhanced) return 'check-circle';
    return 'auto-awesome';
  };

  const renderCompactButton = () => (
    <Animated.View style={[styles.compactContainer, { transform: [{ scale: pulseAnim }] }]}>
      <Pressable
        style={[
          styles.compactButton,
          { backgroundColor: getButtonColor() },
          disabled && styles.compactButtonDisabled,
        ]}
        onPress={handleToggleEnhancement}
        disabled={disabled || isProcessing}
      >
        <Animated.View
          style={[
            styles.compactIconContainer,
            { transform: [{ rotate: rotateAnim.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: ['-180deg', '0deg', '180deg'],
            }) }] }
          ]}
        >
          <MaterialIcons
            name={getButtonIcon()}
            size={20}
            color="#FFFFFF"
          />
        </Animated.View>
        
        {isEnhanced && !compact && (
          <View style={styles.compactIndicator}>
            <Text style={styles.compactIndicatorText}>AI</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );

  const renderFullButton = () => (
    <View style={styles.fullContainer}>
      <Pressable
        style={[
          styles.fullButton,
          { backgroundColor: getButtonColor() },
          disabled && styles.fullButtonDisabled,
        ]}
        onPress={handleToggleEnhancement}
        disabled={disabled || isProcessing}
      >
        <Animated.View style={[styles.buttonContent, { transform: [{ scale: pulseAnim }] }]}>
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ rotate: rotateAnim.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: ['-180deg', '0deg', '180deg'],
              }) }] }
            ]}
          >
            <MaterialIcons
              name={getButtonIcon()}
              size={24}
              color="#FFFFFF"
            />
          </Animated.View>
          
          <View style={styles.textContainer}>
            <Text style={styles.buttonText}>{getButtonText()}</Text>
            {isEnhanced && enhancementResult && (
              <Text style={styles.subText}>
                {enhancementResult.sizeReduction?.toFixed(0)}% smaller • {enhancementResult.qualityScore?.toFixed(2)} quality
              </Text>
            )}
          </View>
          
          {rustIntegration?.isInitialized && (
            <View style={styles.rustBadge}>
              <Text style={styles.rustBadgeText}>RUST</Text>
            </View>
          )}
        </Animated.View>
      </Pressable>
      
      {/* Performance Metrics */}
      {showMetrics && enhancementResult && (
        <Animated.View style={[styles.metricsContainer, {
          opacity: slideAnim,
          transform: [{ translateY: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [10, 0],
          }) }]
        }]}>
          <Text style={styles.metricsTitle}>Performance</Text>
          <View style={styles.metricsRow}>
            <Text style={styles.metricsLabel}>Processing:</Text>
            <Text style={styles.metricsValue}>
              {enhancementResult.processingTime}ms
            </Text>
          </View>
          <View style={styles.metricsRow}>
            <Text style={styles.metricsLabel}>FPS:</Text>
            <Text style={styles.metricsValue}>
              {enhancementResult.fps}fps
            </Text>
          </View>
          <View style={styles.metricsRow}>
            <Text style={styles.metricsLabel}>Resolution:</Text>
            <Text style={styles.metricsValue}>
              {enhancementResult.resolution?.width}x{enhancementResult.resolution?.height}
            </Text>
          </View>
        </Animated.View>
      )}
      
      {/* Device Capabilities */}
      {deviceCapabilities && (
        <View style={styles.capabilitiesContainer}>
          <View style={styles.capabilityRow}>
            <MaterialIcons
              name={deviceCapabilities.canProcessAI ? 'check-circle' : 'remove-circle'}
              size={16}
              color={deviceCapabilities.canProcessAI ? colors.success : colors.textMuted}
            />
            <Text style={styles.capabilityText}>Edge AI</Text>
          </View>
          <View style={styles.capabilityRow}>
            <MaterialIcons
              name={deviceCapabilities.canInterpolate ? 'check-circle' : 'remove-circle'}
              size={16}
              color={deviceCapabilities.canInterpolate ? colors.success : colors.textMuted}
            />
            <Text style={styles.capabilityText}>Interpolation</Text>
          </View>
          <View style={styles.capabilityRow}>
            <MaterialIcons
              name={deviceCapabilities.canCompress ? 'check-circle' : 'remove-circle'}
              size={16}
              color={deviceCapabilities.canCompress ? colors.success : colors.textMuted}
            />
            <Text style={styles.capabilityText}>Compression</Text>
          </View>
        </View>
      )}
    </View>
  );

  return compact ? renderCompactButton() : renderFullButton();
}

const styles = StyleSheet.create({
  // Compact button styles
  compactContainer: {
    alignItems: 'center',
  },
  compactButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  compactButtonDisabled: {
    backgroundColor: colors.textMuted,
    elevation: 0,
    shadowOpacity: 0,
  },
  compactIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  compactIndicatorText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },

  // Full button styles
  fullContainer: {
    marginVertical: spacing.md,
  },
  fullButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fullButtonDisabled: {
    backgroundColor: colors.textMuted,
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subText: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 2,
  },
  rustBadge: {
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rustBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },

  // Performance metrics
  metricsContainer: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  metricsTitle: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  metricsLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  metricsValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },

  // Device capabilities
  capabilitiesContainer: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  capabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  capabilityText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
});
