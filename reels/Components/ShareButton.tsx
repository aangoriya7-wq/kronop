import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Share2 } from 'lucide-react-native';

interface ShareButtonProps {
  onPress: () => void;
}

const ShareButton: React.FC<ShareButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Share2 size={24} color="#FFFFFF" strokeWidth={1.5} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
});

export default ShareButton;
