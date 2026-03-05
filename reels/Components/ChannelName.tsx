import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface ChannelNameProps {
  name: string;
  isVerified?: boolean;
}

const ChannelName: React.FC<ChannelNameProps> = ({ name, isVerified = false }) => {
  return (
    <Text style={styles.name}>
      {name}
      {isVerified && <Text style={styles.verified}> ✓</Text>}
    </Text>
  );
};

const styles = StyleSheet.create({
  name: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  verified: {
    color: '#1DA1F2',
    fontSize: 12,
  },
});

export default ChannelName;
