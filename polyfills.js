// Polyfills for React Native compatibility
import 'react-native-get-random-values';

// Mock idb for React Native - Enhanced version
if (typeof global !== 'undefined') {
  global.idb = {
    openDB: (name, version, upgradeCallback) => {
      console.log('🔧 Mock idb.openDB called:', name, version);
      return Promise.resolve({
        close: () => console.log('🔧 Mock idb.close called'),
        transaction: (storeNames, mode) => {
          console.log('🔧 Mock idb.transaction called:', storeNames, mode);
          return {
            objectStore: (storeName) => {
              console.log('🔧 Mock idb.objectStore called:', storeName);
              return {
                get: (key) => {
                  console.log('🔧 Mock idb.get called:', key);
                  return Promise.resolve(undefined);
                },
                put: (value, key) => {
                  console.log('🔧 Mock idb.put called:', value, key);
                  return Promise.resolve(key);
                },
                delete: (key) => {
                  console.log('🔧 Mock idb.delete called:', key);
                  return Promise.resolve();
                },
                clear: () => {
                  console.log('🔧 Mock idb.clear called');
                  return Promise.resolve();
                },
                add: (value, key) => {
                  console.log('🔧 Mock idb.add called:', value, key);
                  return Promise.resolve(key);
                },
                count: () => {
                  console.log('🔧 Mock idb.count called');
                  return Promise.resolve(0);
                },
                getAll: () => {
                  console.log('🔧 Mock idb.getAll called');
                  return Promise.resolve([]);
                },
                getAllKeys: () => {
                  console.log('🔧 Mock idb.getAllKeys called');
                  return Promise.resolve([]);
                },
                getKey: (key) => {
                  console.log('🔧 Mock idb.getKey called:', key);
                  return Promise.resolve(undefined);
                },
                index: (name) => {
                  console.log('🔧 Mock idb.index called:', name);
                  return {
                    get: (key) => Promise.resolve(undefined),
                    getKey: (key) => Promise.resolve(undefined),
                    getAll: () => Promise.resolve([]),
                    getAllKeys: () => Promise.resolve([]),
                    count: () => Promise.resolve(0),
                  };
                },
              };
            },
            oncomplete: null,
            onerror: null,
            onabort: null,
          };
        },
        add: (storeName, value, key) => {
          console.log('🔧 Mock idb.add called:', storeName, value, key);
          return Promise.resolve(key);
        },
        put: (storeName, value, key) => {
          console.log('🔧 Mock idb.put called:', storeName, value, key);
          return Promise.resolve(key);
        },
        get: (storeName, key) => {
          console.log('🔧 Mock idb.get called:', storeName, key);
          return Promise.resolve(undefined);
        },
        delete: (storeName, key) => {
          console.log('🔧 Mock idb.delete called:', storeName, key);
          return Promise.resolve();
        },
        clear: (storeName) => {
          console.log('🔧 Mock idb.clear called:', storeName);
          return Promise.resolve();
        },
        count: (storeName) => {
          console.log('🔧 Mock idb.count called:', storeName);
          return Promise.resolve(0);
        },
        getAll: (storeName) => {
          console.log('🔧 Mock idb.getAll called:', storeName);
          return Promise.resolve([]);
        },
        getAllKeys: (storeName) => {
          console.log('🔧 Mock idb.getAllKeys called:', storeName);
          return Promise.resolve([]);
        },
        getKey: (storeName, key) => {
          console.log('🔧 Mock idb.getKey called:', storeName, key);
          return Promise.resolve(undefined);
        },
      });
    },
  };
  
  console.log('✅ Enhanced idb polyfill loaded for React Native');
}