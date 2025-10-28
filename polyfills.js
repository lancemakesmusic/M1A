// Polyfills for React Native compatibility
import 'react-native-get-random-values';

// Mock idb for React Native
if (typeof global !== 'undefined') {
  global.idb = {
    openDB: () => Promise.resolve({
      close: () => {},
      transaction: () => ({
        objectStore: () => ({
          get: () => Promise.resolve(undefined),
          put: () => Promise.resolve(),
          delete: () => Promise.resolve(),
          clear: () => Promise.resolve(),
        }),
      }),
    }),
  };
}