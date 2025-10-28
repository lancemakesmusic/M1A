import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from '../firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AuthContext: Setting up auth state listener...');
    
    try {
      const unsubscribe = onAuthStateChanged((authUser) => {
        console.log('🔐 Auth state changed:', authUser ? 'User logged in' : 'No user');
        setUser(authUser);
        setLoading(false);
      });

      // Timeout fallback to prevent infinite loading
      const timeout = setTimeout(() => {
        if (loading) {
          console.log('🔐 AuthContext: Timeout reached, setting loading to false');
          setLoading(false);
        }
      }, 5000);

      return () => {
        unsubscribe();
        clearTimeout(timeout);
      };
    } catch (error) {
      console.error('❌ AuthContext: Error setting up auth listener:', error);
      setLoading(false);
    }
  }, [loading]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
