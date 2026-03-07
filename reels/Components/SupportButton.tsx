import React, { useState, useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Heart, Hand } from 'lucide-react-native';
import { toggleSupport } from '../ZeroLogic';

interface SupportButtonProps {
  channelName: string;
  initiallySupported?: boolean;
  size?: 'small' | 'large';
}

const SupportButton: React.FC<SupportButtonProps> = ({ 
  channelName,
  initiallySupported = false, 
  size = 'large' 
}) => {
  const [isSupported, setIsSupported] = useState(initiallySupported);
  const [isLoading, setIsLoading] = useState(false);
  
  const buttonSize = size === 'small' ? 20 : 24;
  const fontSize = size === 'small' ? 9 : 10;

  const handlePress = useCallback(async () => {
    if (isLoading) return;
    
    // Optimistic update
    const newSupportedState = !isSupported;
    setIsSupported(newSupportedState);
    setIsLoading(true);
    
    const success = await toggleSupport(channelName, isSupported);
    
    if (!success) {
      // Revert on failure
      setIsSupported(isSupported);
    }
    
    setIsLoading(false);
  }, [channelName, isSupported, isLoading]);
  
  if (size === 'small') {
    // Premium Support Button with Glassmorphism
    return (
      <TouchableOpacity 
        style={[styles.premiumContainer, isLoading && styles.disabled]} 
        onPress={handlePress}
        disabled={isLoading}
      >
        <View style={styles.glassmorphismBackground}>
          <Hand size={buttonSize} color={isSupported ? "#FF6B6B" : "#FFFFFF"} strokeWidth={1.5} />
          <Text style={[styles.premiumText, { fontSize }]}>Support</Text>
        </View>
      </TouchableOpacity>
    );
  }
  
  return (
    <TouchableOpacity 
      style={[styles.container, isLoading && styles.disabled]} 
      onPress={handlePress}
      disabled={isLoading}
    >
      <Heart 
        size={buttonSize} 
        fill={isSupported ? "#FF6B6B" : "none"}
        color={isSupported ? "#FF6B6B" : "#FFFFFF"} 
        strokeWidth={1.5}
      />
      {size === 'large' && (
        <Text style={[styles.count, { fontSize }]}>Support</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  count: {
    color: '#FFFFFF',
    marginTop: 2,
    fontWeight: '300',
    opacity: 0.8,
  },
  premiumContainer: {
    alignItems: 'center',
  },
  glassmorphismBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  premiumText: {
    color: '#FFFFFF',
    marginLeft: 6,
    fontWeight: '500',
  },
});

export default SupportButton;
