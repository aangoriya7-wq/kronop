import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

interface SupporterButtonProps {
  itemId: string;
  initialSupporterCount?: number;
  isInitiallySupported?: boolean;
  onSupportChange?: (itemId: string, isSupported: boolean, count: number) => void;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
  channelName?: string;
}

export const SupporterButton: React.FC<SupporterButtonProps> = ({
  itemId,
  initialSupporterCount = 0,
  isInitiallySupported = false,
  onSupportChange,
  size = 'medium',
  showCount = false,
  channelName
}) => {
  const [isSupported, setIsSupported] = useState(isInitiallySupported);
  const [supporterCount, setSupporterCount] = useState(initialSupporterCount);
  const [isLoading, setIsLoading] = useState(false);

  // Simulate real-time supporter count updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setSupporterCount(prev => prev + Math.floor(Math.random() * 3));
      }
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSupport = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    const newIsSupported = !isSupported;
    const newCount = newIsSupported ? supporterCount + 1 : Math.max(0, supporterCount - 1);
    
    // Optimistic update
    setIsSupported(newIsSupported);
    setSupporterCount(newCount);
    
    try {
      // Notify parent component
      onSupportChange?.(itemId, newIsSupported, newCount);
      
      // Here you would make API call
      // await api.updateSupport(itemId, newIsSupported);
    } catch (error) {
      // Revert on error
      setIsSupported(!newIsSupported);
      setSupporterCount(supporterCount);
      console.error('Support update failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return { fontSize: 10, paddingVertical: 4, paddingHorizontal: 8 };
      case 'large':
        return { fontSize: 16, paddingVertical: 10, paddingHorizontal: 20 };
      default:
        return { fontSize: 12, paddingVertical: 6, paddingHorizontal: 12 };
    }
  };

  const { fontSize, paddingVertical, paddingHorizontal } = getSizeConfig();

  return (
    <TouchableOpacity
      style={[
        styles.supportButton,
        isSupported && styles.supportedButton,
        isLoading && styles.disabled,
        { paddingVertical, paddingHorizontal }
      ]}
      onPress={handleSupport}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      <MaterialIcons
        name={isSupported ? 'favorite' : 'favorite-border'}
        size={fontSize + 4}
        color={isSupported ? theme.colors.text.secondary : theme.colors.text.primary}
      />
      <Text style={[
        styles.supportText,
        { fontSize },
        isSupported && styles.supportedText
      ]}>
        {isSupported ? 'Support Back' : 'Support'}
      </Text>
      
      {showCount && (
        <Text style={[styles.countText, { fontSize }]}>
          {formatCount(supporterCount)}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const formatCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const styles = StyleSheet.create({
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 4,
    gap: 6,
  },
  supportedButton: {
    backgroundColor: theme.colors.background.tertiary,
  },
  disabled: {
    opacity: 0.6,
  },
  supportText: {
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  supportedText: {
    color: theme.colors.text.secondary,
  },
  countText: {
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
