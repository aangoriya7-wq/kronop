import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';

interface StarButtonProps {
  onPress: () => void;
  isActive?: boolean;
  count?: number;
}

const StarButton: React.FC<StarButtonProps> = ({ onPress, isActive = false, count = 0 }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Star 
        size={24} 
        fill={isActive ? "#FFD700" : "none"}
        color={isActive ? "#FFD700" : "#FFFFFF"} 
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
  count: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '300',
    opacity: 0.8,
  },
});

export default StarButton;
