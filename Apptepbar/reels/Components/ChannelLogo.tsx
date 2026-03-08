import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface ChannelLogoProps {
  source: string;
  size?: number;
}

const ChannelLogo: React.FC<ChannelLogoProps> = ({ source, size = 40 }) => {
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image 
        source={{ uri: source }} 
        style={[styles.logo, { width: size, height: size, borderRadius: size / 2 }]}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  logo: {
    backgroundColor: '#333',
  },
});

export default ChannelLogo;
