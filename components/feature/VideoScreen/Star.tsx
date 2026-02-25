import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';

interface StarProps {
  isStarred: boolean;
  onPress: () => void;
  likesCount?: number;
}

export default function Star({ isStarred, onPress, likesCount = 0 }: StarProps) {
  const [localStarred, setLocalStarred] = useState(isStarred);
  const [localLikes, setLocalLikes] = useState(likesCount);

  const handlePress = () => {
    setLocalStarred(!localStarred);
    setLocalLikes(localStarred ? localLikes - 1 : localLikes + 1);
    onPress();
  };

  return (
    <TouchableOpacity 
      style={styles.actionButton}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <MaterialIcons 
        name={localStarred ? "star" : "star-border"} 
        size={24} 
        color={localStarred ? "#FFD700" : "#FFFFFF"} 
      />
      <Text style={styles.likesCount}>{localLikes}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  likesCount: {
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: 2,
  },
});
