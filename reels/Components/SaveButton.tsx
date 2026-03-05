import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Bookmark } from 'lucide-react-native';

interface SaveButtonProps {
  onPress: () => void;
  isActive?: boolean;
}

const SaveButton: React.FC<SaveButtonProps> = ({ onPress, isActive = false }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Bookmark 
        size={24} 
        fill={isActive ? "#FF6B6B" : "none"}
        color={isActive ? "#FF6B6B" : "#FFFFFF"} 
        strokeWidth={1.5}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
});

export default SaveButton;
