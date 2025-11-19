// contexts/UserContext.js
import { createContext, useCallback, useEffect, useRef, useState } from 'react';
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
  const refreshTimeoutRef = useRef(null);
  const isRefreshingRef = useRef(false);

  const refreshUserProfile = useCallback(async (uid = auth.currentUser?.uid) => {
    // If already refreshing, skip
    if (isRefreshingRef.current) {
      return Promise.resolve();
    }
    
    // Debounce: Clear any pending refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    // Debounce: Wait 200ms before actually refreshing
    return new Promise((resolve) => {
      refreshTimeoutRef.current = setTimeout(async () => {
        // Double-check we're not already refreshing
        if (isRefreshingRef.current) {
          refreshTimeoutRef.current = null;
          resolve();
          return;
        }
        
        isRefreshingRef.current = true;
        refreshTimeoutRef.current = null;
        
        try {
          if (!uid) {
            setUser(null);
            resolve();
            return;
          }
          // Wait for auth to be ready
          if (!auth.currentUser) {
            console.log('No authenticated user, skipping profile refresh');
            setUser(null);
            resolve();
            return;
          }
          const profile = await getUserProfile(uid);
          if (profile) {
            // Ensure photoUpdatedAt and coverUpdatedAt are numbers for cache-busting
            if (profile.photoUpdatedAt && typeof profile.photoUpdatedAt !== 'number') {
              profile.photoUpdatedAt = profile.photoUpdatedAt.toMillis ? profile.photoUpdatedAt.toMillis() : Date.now();
            }
            if (profile.coverUpdatedAt && typeof profile.coverUpdatedAt !== 'number') {
              profile.coverUpdatedAt = profile.coverUpdatedAt.toMillis ? profile.coverUpdatedAt.toMillis() : Date.now();
            }
          }
          
          setUser(profile); // can be null if no doc yet
          
          // Log profile refresh (debouncing prevents excessive logs)
          console.log('✅ Profile refreshed:', { 
            hasAvatar: !!(profile?.avatarUrl || profile?.photoURL),
            hasCover: !!profile?.coverUrl,
            photoUpdatedAt: profile?.photoUpdatedAt,
            coverUpdatedAt: profile?.coverUpdatedAt
          });
          resolve();
        } catch (e) {
          console.warn('refreshUserProfile failed:', e);
          setUser(null);
          resolve();
        } finally {
          isRefreshingRef.current = false;
        }
      }, 200);
    });
  }, []);

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
