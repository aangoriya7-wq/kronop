import React from 'react';
import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';

interface ChannelInfoProps {
  avatarUrl: string;
  channelName: string;
  onPress: () => void;
}

export default function ChannelInfo({ avatarUrl, channelName, onPress }: ChannelInfoProps) {
  return (
    <TouchableOpacity 
      style={styles.channelInfo}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image 
        source={{ uri: avatarUrl }} 
        style={styles.avatar}
      />
      <View style={styles.channelDetails}>
        <Text style={styles.channelName}>{channelName}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  channelDetails: {
    marginLeft: 8,
    flex: 1,
  },
  channelName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
