import { Platform } from 'react-native';

export const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  if (Platform.OS === 'web') {
    return 'http://localhost:8001';
  }

  if (__DEV__) {
    return 'http://localhost:8001';
  }

  throw new Error('EXPO_PUBLIC_API_BASE_URL must be set in production.');
};
