import React from 'react';
import { Image, View, StyleSheet } from 'react-native';
import LogoImage from '../../assets/images/logo.png';

export default function AppLogo({ size = 60 }: { size?: number | 'small' | 'medium' | 'large' }) {
  const sizeValue = typeof size === 'string' ? 
    (size === 'small' ? 40 : size === 'medium' ? 60 : size === 'large' ? 80 : 60) : 
    size;
  return (
    <View style={[styles.container, { width: sizeValue, height: sizeValue }]}>
      <Image
        source={LogoImage}
        style={[styles.logo, { width: sizeValue, height: sizeValue }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    borderRadius: 8,
  },
});
