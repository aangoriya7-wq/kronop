// Test script to verify audio focus handling
import React, { useState, useEffect } from 'react';
import { View, Text, AppState } from 'react-native';
import { Audio } from 'expo-av';

const AudioFocusTest = () => {
  const [appState, setAppState] = useState(AppState.currentState);
  const [audioFocusStatus, setAudioFocusStatus] = useState('Unknown');

  useEffect(() => {
    // Initialize audio mode
    const initializeAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
          shouldDuckAndroid: true,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
          playThroughEarpieceAndroid: false,
        });
        setAudioFocusStatus('Audio mode initialized successfully');
        console.log('✅ Audio mode initialized');
      } catch (error) {
        setAudioFocusStatus(`Error: ${error.message}`);
        console.log('❌ Audio mode error:', error);
      }
    };

    initializeAudio();

    // Monitor app state changes
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
      console.log('📱 App state changed:', nextAppState);
      
      if (nextAppState === 'active') {
        setAudioFocusStatus('App active - audio focus available');
      } else {
        setAudioFocusStatus('App in background - audio focus not available');
      }
    });

    return () => subscription?.remove();
  }, []);

  return (
    <View style={{ padding: 20, justifyContent: 'center', flex: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
        Audio Focus Test
      </Text>
      
      <Text style={{ marginBottom: 10 }}>
        Current App State: <Text style={{ fontWeight: 'bold' }}>{appState}</Text>
      </Text>
      
      <Text style={{ marginBottom: 10 }}>
        Audio Focus Status: <Text style={{ fontWeight: 'bold', color: appState === 'active' ? 'green' : 'orange' }}>
          {audioFocusStatus}
        </Text>
      </Text>
      
      <Text style={{ fontSize: 12, color: 'gray', marginTop: 20 }}>
        Test Instructions:
        1. Put app in background (switch apps)
        2. Return to app
        3. Check console for audio focus errors
        4. Should see no AudioFocusNotAcquiredException errors
      </Text>
    </View>
  );
};

export default AudioFocusTest;
