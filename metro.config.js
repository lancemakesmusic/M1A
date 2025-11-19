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

// CRITICAL: Exclude gesture-handler from web bundle (it breaks web clicks)
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-gesture-handler') {
    // Return empty module for web to prevent gesture-handler from breaking clicks
    console.log('⚠️ Excluding react-native-gesture-handler from web bundle');
    return { type: 'empty' };
  }
  // Use default resolution for everything else
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  // Fallback to default Metro resolver
  return context.resolveRequest(context, moduleName, platform);
};

// Exclude problematic modules from transformation
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
