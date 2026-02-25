import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

const UserInfo = ({ user, onSupport }) => {
  const [isSupported, setIsSupported] = useState(false);

  const handleSupport = () => {
    setIsSupported(!isSupported);
    onSupport?.();
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: user.avatar }} style={styles.avatar} />
      <View style={styles.textContainer}>
        <View style={styles.channelNameContainer}>
          <Text style={styles.channelName}>{user.username}</Text>
          <TouchableOpacity 
            style={[styles.supportButton, isSupported && styles.supportButtonActive]} 
            onPress={handleSupport}
          >
            <Text style={[styles.supportText, isSupported && styles.supportTextActive]}>
              {isSupported ? '✓' : 'Support'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.location}>📍 Your Location</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  channelNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  location: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  supportButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(106, 90, 205, 0.3)',
  },
  supportButtonActive: {
    backgroundColor: 'rgba(106, 90, 205, 0.3)',
  },
  supportText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  supportTextActive: {
    color: '#fff',
  },
});

export default UserInfo;
