const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for spaces in folder names
config.resolver.nodeModulesPaths = [
  ...config.resolver.nodeModulesPaths,
];

// Add crypto polyfill support
config.resolver.alias = {
  crypto: 'react-native-crypto',
  stream: 'react-native-stream',
  buffer: '@craftzdog/react-native-buffer',
  randombytes: 'react-native-randombytes',
  '@': require('path').resolve(__dirname),
  '@/components': require('path').resolve(__dirname, 'components'),
  '@/app': require('path').resolve(__dirname, 'app'),
  '@/context': require('path').resolve(__dirname, 'context'),
  '@/constants': require('path').resolve(__dirname, 'constants'),
};

module.exports = config;
