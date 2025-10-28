const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for Firebase and other modules
config.resolver.alias = {
  '@': './',
  // Fix for Firebase idb issue
  'idb': require.resolve('idb'),
};

// Fix for React Native Firebase
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Handle problematic packages
config.resolver.unstable_enablePackageExports = false;

// Fix for Firebase bundling
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;
