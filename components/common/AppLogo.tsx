import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';

interface AppLogoProps {
  size?: number;
  showText?: boolean;
}

export default function AppLogo({ size = 32, showText = false }: AppLogoProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.logo, { width: size, height: size }]}>
        <Text style={[styles.logoText, { fontSize: size * 0.6 }]}>K</Text>
      </View>
      {showText && (
        <Text style={styles.appName}>Kronop</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  logo: {
    backgroundColor: '#8B00FF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
