import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SongPlayer from './Player/song';
// import demoUserService from '../services/demoUserService'; // Removed - services folder deleted

export default memo(function SongsScreen() {
  // const [demoMessage, setDemoMessage] = useState(demoUserService.getDemoMessage('songs')); // Removed - using mock
  const [demoMessage, setDemoMessage] = useState({
    title: 'Songs Feature Coming Soon!',
    subtitle: 'Enjoy your favorite music tracks',
    description: 'Music player will be available in the next update.'
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Songs</Text>
        <Text style={styles.subtitle}>{demoMessage.title}</Text>
        <Text style={styles.description}>{demoMessage.subtitle}</Text>
        
        {/* Music Player Controls */}
        <SongPlayer />
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
});
