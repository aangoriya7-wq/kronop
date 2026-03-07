import React, { useState, useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { getCommentsCount, postComment } from '../ZeroLogic';

interface CommentButtonProps {
  videoId: string;
  initialCount?: number;
}

const CommentButton: React.FC<CommentButtonProps> = ({ videoId, initialCount = 0 }) => {
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    // Show comment input dialog
    Alert.prompt(
      'Add Comment',
      'Write your comment...',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Post', 
          onPress: async (text?: string) => {
            if (text && text.trim()) {
              const success = await postComment(videoId, text.trim());
              if (success) {
                setCount(prev => prev + 1);
              }
            }
            setIsLoading(false);
          }
        }
      ],
      'plain-text'
    );
    
    setIsLoading(false);
  }, [videoId, isLoading]);

  return (
    <TouchableOpacity 
      style={[styles.container, isLoading && styles.disabled]} 
      onPress={handlePress}
      disabled={isLoading}
    >
      <MessageCircle size={24} color="#FFFFFF" strokeWidth={1.5} />
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

export default CommentButton;
