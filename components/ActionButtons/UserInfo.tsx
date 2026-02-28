// User information component

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface UserInfoProps {
  username: string;
}

export function UserInfo({ username }: UserInfoProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.username}>@{username}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 2,
  },
  username: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
