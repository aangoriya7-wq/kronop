import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Heart, Hand } from 'lucide-react-native';

interface SupportButtonProps {
  onPress: () => void;
  isActive?: boolean;
  size?: 'small' | 'large';
}

const SupportButton: React.FC<SupportButtonProps> = ({ 
  onPress, 
  isActive = false, 
  size = 'large' 
}) => {
  const buttonSize = size === 'small' ? 20 : 24;
  const fontSize = size === 'small' ? 9 : 10;
  
  if (size === 'small') {
    // Premium Support Button with Glassmorphism
    return (
      <TouchableOpacity style={styles.premiumContainer} onPress={onPress}>
        <View style={styles.glassmorphismBackground}>
          <Hand size={buttonSize} color={isActive ? "#FF6B6B" : "#FFFFFF"} strokeWidth={1.5} />
          <Text style={[styles.premiumText, { fontSize }]}>Support</Text>
        </View>
      </TouchableOpacity>
    );
  }
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Heart 
        size={buttonSize} 
        fill={isActive ? "#FF6B6B" : "none"}
        color={isActive ? "#FF6B6B" : "#FFFFFF"} 
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
