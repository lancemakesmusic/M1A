const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for Firebase and other modules
config.resolver.alias = {
  '@': './',
  'idb': require.resolve('./polyfills.js'), // Firebase idb polyfill
};

// Fix for React Native Firebase
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Handle problematic packages
config.resolver.unstable_enablePackageExports = false;

// Fix for Firebase bundling
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Firebase compatibility
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

// Exclude problematic modules from transformation
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
