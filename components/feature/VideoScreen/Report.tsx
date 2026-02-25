import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Alert, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';

interface ReportProps {
  onPress: () => void;
  videoId?: string;
  videoTitle?: string;
}

export default function Report({ onPress, videoId, videoTitle }: ReportProps) {
  const [hasReported, setHasReported] = useState(false);
  const [reportCount, setReportCount] = useState(0);

  const handleReport = () => {
    if (hasReported) {
      Alert.alert('Already Reported', 'You have already reported this video.');
      return;
    }

    Alert.alert(
      'Report Video',
      `Why are you reporting "${videoTitle}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Spam',
          onPress: () => submitReport('Spam'),
        },
        {
          text: 'Inappropriate Content',
          onPress: () => submitReport('Inappropriate Content'),
        },
        {
          text: 'Copyright Violation',
          onPress: () => submitReport('Copyright Violation'),
        },
        {
          text: 'Misleading Information',
          onPress: () => submitReport('Misleading Information'),
        },
        {
          text: 'Other',
          onPress: () => submitReport('Other'),
        },
      ],
      { cancelable: true }
    );
  };

  const submitReport = (reason: string) => {
    if (!videoId) {
      Alert.alert('Error', 'Video ID is required to report');
      return;
    }

    // Simulate report submission
    // In real app, you'd send this to your API
    console.log(`Report submitted for video ${videoId}: ${reason}`);
    
    setHasReported(true);
    setReportCount(reportCount + 1);
    
    Alert.alert(
      'Report Submitted',
      `Thank you for reporting this video for "${reason}". We will review it shortly.`,
      [{ text: 'OK' }]
    );

    onPress();
  };

  return (
    <TouchableOpacity 
      style={styles.actionButton}
      onPress={handleReport}
      activeOpacity={0.7}
    >
      <MaterialIcons 
        name="flag" 
        size={24} 
        color={hasReported ? "#FF5252" : "#FFFFFF"} 
      />
      <Text style={styles.reportCount}>{reportCount}</Text>
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
  reportCount: {
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: 2,
  },
});
