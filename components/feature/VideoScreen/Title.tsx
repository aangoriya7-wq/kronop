import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../../constants/theme';

interface TitleProps {
  title: string;
  onPress: () => void;
}

export default function Title({ title, onPress }: TitleProps) {
  // Title truncation function - keeps More within 2 lines
  const truncateTitle = (title: string) => {
    const maxChars = 65; // Optimized for 2 lines with " More"
    
    if (title.length <= maxChars) {
      return { text: title, needsMore: false };
    }
    
    // Truncate and add More at the end of second line
    let truncated = title.substring(0, maxChars - 5); // Leave space for " More"
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxChars - 20) {
      truncated = truncated.substring(0, lastSpace);
    }
    
    return { text: truncated + ' More', needsMore: true };
  };

  const { text: displayTitle } = truncateTitle(title);

  return (
    <View style={styles.titleBox}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.topTitle}>{displayTitle}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  titleBox: {
    marginHorizontal: theme.spacing.md,
    marginTop: 30,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: '#000000',
    borderWidth: 0.5, // Ultra-thin border
    borderColor: '#333333', // Dark gray border
    borderRadius: theme.borderRadius.md,
  },
  topTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF', // White color
    lineHeight: 22,
    textAlign: 'left',
  },
});
