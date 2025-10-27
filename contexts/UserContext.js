// contexts/UserContext.js
import { createContext, useEffect, useState } from 'react';
import { debugFirebaseAuth } from '../debug-firebase';
import {
    auth,
    createUserProfileIfMissing,
    getUserProfile,
    updateUserProfileInDB,
} from '../firebase';

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);      // Firestore profile doc (not Firebase Auth user)
  const [loading, setLoading] = useState(true); // whether profile is being resolved

  const refreshUserProfile = async (uid = auth.currentUser?.uid) => {
    try {
      if (!uid) {
        setUser(null);
        return;
      }
      // Wait for auth to be ready
      if (!auth.currentUser) {
        console.log('No authenticated user, skipping profile refresh');
        setUser(null);
        return;
      }
      const profile = await getUserProfile(uid);
      setUser(profile); // can be null if no doc yet
    } catch (e) {
      console.warn('refreshUserProfile failed:', e);
      setUser(null);
    }
  };

  const updateUserProfile = async (updates) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        console.warn('No authenticated user for profile update');
        return;
      }
      await updateUserProfileInDB(uid, updates);
      await refreshUserProfile(uid);
    } catch (e) {
      console.warn('updateUserProfile failed:', e);
      throw e;
    }
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (authUser) => {
      setLoading(true);
      try {
        if (authUser) {
          console.log('User authenticated:', authUser.uid);
          
          // Debug Firebase authentication and permissions
          await debugFirebaseAuth();
          
          // Try to get existing profile
          let profile = await getUserProfile(authUser.uid);

          // Auto-create if missing (Option B)
          if (!profile) {
            console.log('Creating new user profile for:', authUser.uid);
            profile = await createUserProfileIfMissing(authUser.uid, {
              // seed useful starter fields from Auth if available
              displayName: authUser.displayName ?? '',
            });
          }

          setUser(profile);
        } else {
          console.log('No authenticated user');
          setUser(null);
        }
      } catch (e) {
        console.warn('onAuthStateChanged handler failed:', e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, refreshUserProfile, updateUserProfile }}>
      {children}
    </UserContext.Provider>
  );
}
