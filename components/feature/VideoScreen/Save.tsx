import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Text, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';

interface SaveProps {
  isSaved: boolean;
  onPress: () => void;
  videoId?: string;
  videoTitle?: string;
}

export default function Save({ isSaved, onPress, videoId, videoTitle }: SaveProps) {
  const [localSaved, setLocalSaved] = useState(isSaved);
  const [savedVideos, setSavedVideos] = useState<string[]>([]);
  const [saveCount, setSaveCount] = useState(isSaved ? 1 : 0);

  useEffect(() => {
    // Load saved videos from local storage (simulated)
    // In real app, you'd use AsyncStorage or similar
    setLocalSaved(isSaved);
  }, [isSaved]);

  const handleSave = () => {
    if (!videoId) {
      Alert.alert('Error', 'Video ID is required to save');
      return;
    }

    const newSavedState = !localSaved;
    setLocalSaved(newSavedState);

    if (newSavedState) {
      // Add to saved list
      const newSavedList = [...savedVideos, videoId];
      setSavedVideos(newSavedList);
      setSaveCount(saveCount + 1);
      
      // Save to local storage (simulated)
      // await AsyncStorage.setItem('savedVideos', JSON.stringify(newSavedList));
      
      Alert.alert('Saved!', `"${videoTitle}" has been added to your saved videos.`);
    } else {
      // Remove from saved list
      const newSavedList = savedVideos.filter(id => id !== videoId);
      setSavedVideos(newSavedList);
      setSaveCount(Math.max(0, saveCount - 1));
      
      // Remove from local storage (simulated)
      // await AsyncStorage.setItem('savedVideos', JSON.stringify(newSavedList));
      
      Alert.alert('Removed', `"${videoTitle}" has been removed from your saved videos.`);
    }

    onPress();
  };

  return (
    <TouchableOpacity 
      style={styles.actionButton}
      onPress={handleSave}
      activeOpacity={0.7}
    >
      <MaterialIcons 
        name={localSaved ? "bookmark" : "bookmark-border"} 
        size={24} 
        color={localSaved ? "#4CAF50" : "FFFFFF"} 
      />
      <Text style={styles.saveCount}>{saveCount}</Text>
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
  saveCount: {
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: 2,
  },
});
