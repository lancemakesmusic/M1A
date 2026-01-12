// contexts/WalletContext.js
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import WalletService from '../services/WalletService';

export const WalletContext = createContext();

export function WalletProvider({ children }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimeoutRef = useRef(null);
  const isRefreshingRef = useRef(false);

  /**
   * Refresh wallet balance
   * Debounced to prevent excessive calls
   */
  const refreshBalance = useCallback(async (uid = user?.uid) => {
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
            setBalance(0);
            setLoading(false);
            resolve();
            return;
          }
          
          const walletBalance = await WalletService.getBalance(uid);
          setBalance(walletBalance || 0);
          setLoading(false);
          
          console.log('✅ Wallet balance refreshed:', walletBalance);
          resolve();
        } catch (error) {
          console.error('Error refreshing wallet balance:', error);
          setBalance(0);
          setLoading(false);
          resolve();
        } finally {
          isRefreshingRef.current = false;
        }
      }, 200);
    });
  }, [user?.uid]);

  /**
   * Manually refresh balance (for pull-to-refresh)
   */
  const refreshBalanceManually = useCallback(async () => {
    if (!user?.uid) return;
    
    setRefreshing(true);
    try {
      await refreshBalance(user.uid);
    } finally {
      setRefreshing(false);
    }
  }, [user?.uid, refreshBalance]);

  /**
   * Update balance locally (optimistic update)
   * This is called when a transaction occurs to update the UI immediately
   */
  const updateBalance = useCallback((amount) => {
    setBalance(prevBalance => {
      const newBalance = prevBalance + amount;
      return Math.max(0, newBalance); // Prevent negative balance
    });
  }, []);

  /**
   * Set balance directly (for admin operations)
   */
  const setBalanceDirectly = useCallback((newBalance) => {
    setBalance(newBalance);
  }, []);

  // Load balance when user changes
  useEffect(() => {
    if (user?.uid) {
      refreshBalance(user.uid);
    } else {
      setBalance(0);
      setLoading(false);
    }
  }, [user?.uid, refreshBalance]);

  const value = {
    balance,
    loading,
    refreshing,
    refreshBalance,
    refreshBalanceManually,
    updateBalance,
    setBalanceDirectly,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

/**
 * Hook to access wallet context
 */
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

