// services/SocialAuthService.js
// Social authentication service for Google and Apple Sign-In

import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { auth } from '../firebase';
import { 
  GoogleAuthProvider, 
  OAuthProvider,
  signInWithCredential,
  linkWithCredential
} from 'firebase/auth';
import { createUserProfileIfMissing } from '../firebase';
import { trackLogin, trackSignup } from './AnalyticsService';

// Complete the OAuth flow
WebBrowser.maybeCompleteAuthSession();

/**
 * Sign in with Google
 */
export const signInWithGoogle = async () => {
  try {
    // For Expo, we'll use a web-based OAuth flow
    // This requires Firebase Auth to be configured with Google provider
    const provider = new GoogleAuthProvider();
    
    // Note: In a production app, you would use:
    // - expo-auth-session for a more native experience
    // - Or Firebase's web OAuth flow with expo-web-browser
    
    // For now, we'll show a message that this requires additional setup
    throw new Error('Google Sign-In requires additional configuration. Please use email/password for now.');
    
    // Future implementation:
    // 1. Configure Google OAuth in Firebase Console
    // 2. Use expo-auth-session to get Google token
    // 3. Create Firebase credential and sign in
    
  } catch (error) {
    console.error('Google Sign-In error:', error);
    throw error;
  }
};

/**
 * Sign in with Apple (iOS only)
 */
export const signInWithApple = async () => {
  try {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }

    // Check if Apple Authentication is available
    let AppleAuthentication;
    try {
      AppleAuthentication = require('expo-apple-authentication');
    } catch (e) {
      throw new Error('Apple Authentication module not installed. Run: npx expo install expo-apple-authentication');
    }

    // Request Apple credential
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Create Firebase credential
    const { identityToken, nonce } = credential;
    const appleCredential = new OAuthProvider('apple.com').credential({
      idToken: identityToken,
      rawNonce: nonce,
    });

    // Sign in with Firebase
    const userCredential = await signInWithCredential(auth, appleCredential);
    
    // Create user profile if it doesn't exist
    if (userCredential.user && credential.fullName) {
      const displayName = credential.fullName.givenName 
        ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`.trim()
        : credential.email?.split('@')[0] || 'User';
      
      await createUserProfileIfMissing(userCredential.user.uid, {
        email: credential.email || userCredential.user.email,
        displayName: displayName,
        firstName: credential.fullName.givenName || displayName.split(' ')[0],
        username: credential.email?.split('@')[0] || `user_${userCredential.user.uid.slice(0, 8)}`,
      });
    }

    await trackLogin('apple');
    return userCredential;
  } catch (error) {
    console.error('Apple Sign-In error:', error);
    
    // Handle user cancellation gracefully
    if (error.code === 'ERR_CANCELED' || error.message?.includes('cancel')) {
      throw new Error('Sign-in was cancelled');
    }
    
    throw error;
  }
};

/**
 * Link Google account to existing user
 */
export const linkGoogleAccount = async (user) => {
  try {
    const provider = new GoogleAuthProvider();
    // Implementation would use expo-auth-session
    throw new Error('Account linking requires additional configuration');
  } catch (error) {
    console.error('Link Google account error:', error);
    throw error;
  }
};

/**
 * Link Apple account to existing user
 */
export const linkAppleAccount = async (user) => {
  try {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }
    
    const AppleAuthentication = require('expo-apple-authentication');
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const { identityToken, nonce } = credential;
    const appleCredential = new OAuthProvider('apple.com').credential({
      idToken: identityToken,
      rawNonce: nonce,
    });

    await linkWithCredential(user, appleCredential);
    return true;
  } catch (error) {
    console.error('Link Apple account error:', error);
    throw error;
  }
};

