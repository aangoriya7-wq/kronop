import React, { useState, useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { toggleLike } from '../ZeroLogic';

interface StarButtonProps {
  videoId: string;
  initialCount?: number;
  initiallyLiked?: boolean;
}

const StarButton: React.FC<StarButtonProps> = ({ 
  videoId, 
  initialCount = 0,
  initiallyLiked = false 
}) => {
  const [isLiked, setIsLiked] = useState(initiallyLiked);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = useCallback(async () => {
    if (isLoading) return;
    
    // Optimistic UI update
    const newLikedState = !isLiked;
    const newCount = newLikedState ? count + 1 : count - 1;
    
    setIsLiked(newLikedState);
    setCount(Math.max(0, newCount));
    setIsLoading(true);
    
    // API call
    const success = await toggleLike(videoId, isLiked);
    
    if (!success) {
      // Revert on failure
      setIsLiked(isLiked);
      setCount(count);
    }
    
    setIsLoading(false);
  }, [videoId, isLiked, count, isLoading]);

  return (
    <TouchableOpacity 
      style={[styles.container, isLoading && styles.disabled]} 
      onPress={handlePress}
      disabled={isLoading}
    >
      <Star 
        size={24} 
        fill={isLiked ? "#FFD700" : "none"}
        color={isLiked ? "#FFD700" : "#FFFFFF"} 
        strokeWidth={1.5}
      />
      <Text style={styles.count}>{count}</Text>
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
    fontSize: 10,
    marginTop: 2,
    fontWeight: '300',
    opacity: 0.8,
  },
});

export default StarButton;
