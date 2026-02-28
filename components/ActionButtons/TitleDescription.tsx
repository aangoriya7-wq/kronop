// Title/Description component

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

interface TitleDescriptionProps {
  description: string;
}

export function TitleDescription({ description }: TitleDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable onPress={() => setIsExpanded(!isExpanded)}>
        <Text 
          style={styles.description}
          numberOfLines={isExpanded ? undefined : 1}
          ellipsizeMode="tail"
        >
          {description}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  description: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 20,
  },
});
