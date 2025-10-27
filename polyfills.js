// Polyfills for React Native
import 'react-native-get-random-values';

// Polyfill for idb (IndexedDB) - not available in React Native
if (typeof global !== 'undefined' && !global.indexedDB) {
  global.indexedDB = {
    open: () => Promise.resolve({}),
    deleteDatabase: () => Promise.resolve(),
  };
}
