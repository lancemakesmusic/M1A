// contexts/UserContext.js
import { createContext, useEffect, useState } from 'react';
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
      const profile = await getUserProfile(uid);
      setUser(profile); // can be null if no doc yet
    } catch (e) {
      console.warn('refreshUserProfile failed:', e);
    }
  };

  const updateUserProfile = async (updates) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
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
          // Try to get existing profile
          let profile = await getUserProfile(authUser.uid);

          // Auto-create if missing (Option B)
          if (!profile) {
            profile = await createUserProfileIfMissing(authUser.uid, {
              // seed useful starter fields from Auth if available
              displayName: authUser.displayName ?? '',
            });
          }

          setUser(profile);
        } else {
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
