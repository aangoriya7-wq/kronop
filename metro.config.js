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
};

module.exports = config;
