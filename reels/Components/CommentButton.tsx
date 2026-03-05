import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MessageCircle } from 'lucide-react-native';

interface CommentButtonProps {
  onPress: () => void;
  count?: number;
}

const CommentButton: React.FC<CommentButtonProps> = ({ onPress, count = 0 }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
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
  count: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '300',
    opacity: 0.8,
  },
});

export default CommentButton;
