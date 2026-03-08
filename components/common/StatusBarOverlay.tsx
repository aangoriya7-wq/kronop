import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface StatusBarOverlayProps {
  style: 'light' | 'dark' | 'auto';
  backgroundColor: string;
  translucent?: boolean;
}

const StatusBarOverlay: React.FC<StatusBarOverlayProps> = ({
  style,
  backgroundColor,
  translucent = false,
}) => {
  return (
    <>
      <StatusBar
        style={style}
        backgroundColor={backgroundColor}
        translucent={translucent}
      />
      {translucent && (
        <View
          style={[
            styles.overlay,
            { backgroundColor },
          ]}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 44, // Status bar height
    zIndex: 1000,
  },
});

export default StatusBarOverlay;
