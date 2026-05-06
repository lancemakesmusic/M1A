import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { auth, onAuthStateChanged } from '../firebase';
import { log, logError } from '../utils/logger';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isResolvedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;
    let unsubscribe = null;
    
    log('🔐 AuthContext: Setting up auth state listener...');
    
    // Immediate check: If user is already logged in, set immediately
    const currentUser = auth?.currentUser;
    if (currentUser && !isResolvedRef.current && isMounted) {
      log('🔐 Found existing user, setting immediately');
      setUser(currentUser);
      setLoading(false);
      isResolvedRef.current = true;
    }
    
    try {
      unsubscribe = onAuthStateChanged((authUser) => {
        if (!isMounted) return;
        
        log('🔐 Auth state changed:', authUser ? `User logged in: ${authUser.email || authUser.uid}` : 'No user');
        
        // Always update user state (remove isResolvedRef check to allow updates)
        setUser(authUser);
        
        if (!isResolvedRef.current) {
          setLoading(false);
          isResolvedRef.current = true;
          // Clear timeout if auth state resolved before timeout
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        }
      });

      // Timeout fallback to prevent infinite loading (reduced to 2s for faster demo)
      timeoutId = setTimeout(() => {
        if (!isMounted) return;
        
        if (!isResolvedRef.current) {
          log('🔐 AuthContext: Timeout reached (2s), checking current user');
          // Check one more time if user exists
          const timeoutUser = auth?.currentUser;
          if (timeoutUser) {
            log('🔐 Found user after timeout, setting user');
            setUser(timeoutUser);
          } else {
            log('🔐 No user found after timeout, showing login screen');
            setUser(null);
          }
          isResolvedRef.current = true;
          setLoading(false);
        }
      }, 2000);

      return () => {
        isMounted = false;
        if (unsubscribe) {
          unsubscribe();
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    } catch (error) {
      logError('❌ AuthContext: Error setting up auth listener:', error);
      if (isMounted) {
        // Fallback: check if user exists
        const fallbackUser = auth?.currentUser;
        setUser(fallbackUser || null);
        setLoading(false);
        isResolvedRef.current = true;
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
