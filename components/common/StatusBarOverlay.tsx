import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface StatusBarOverlayProps {
  style?: 'light' | 'dark';
  backgroundColor?: string;
  translucent?: boolean;
}

const StatusBarOverlay: React.FC<StatusBarOverlayProps> = ({ 
  style = 'light', 
  backgroundColor = '#000000',
  translucent = true 
}) => {
  const insets = useSafeAreaInsets();

  return (
    <>
      {/* Set StatusBar style */}
      <StatusBar 
        style={style} 
        translucent={translucent}
        backgroundColor="transparent"
      />
      
      {/* Transparent overlay for status bar area - no background */}
      <View 
        style={[
          styles.statusBarOverlay,
          {
            height: insets.top,
            backgroundColor: 'transparent',
            paddingTop: Platform.OS === 'ios' ? 0 : insets.top
          }
        ]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  statusBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
});

export default StatusBarOverlay;
