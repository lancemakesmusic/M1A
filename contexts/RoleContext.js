import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const RoleContext = createContext();

/**
 * Role Hierarchy:
 * - master_admin: Full system control, can create employees and admins
 * - admin: Can manage events, menu, view financials, but cannot create other admins
 * - employee: Can confirm orders, process payments, manage tickets, handle amenities
 * - client: Default role, can book services, make payments, view own history
 */

export function RoleProvider({ children }) {
  const { user: authUser } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Security: Only admin@merkabaent.com can be admin
  const isAdminEmail = authUser?.email === 'admin@merkabaent.com';

  useEffect(() => {
    if (!authUser) {
      setUserRole(null);
      setPermissions({});
      setLoading(false);
      return;
    }

    loadUserRole();
  }, [authUser]);

  const loadUserRole = async () => {
    try {
      if (!authUser?.uid) return;

      const userDoc = await getDoc(doc(db, 'users', authUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        let role = userData.role || 'client'; // Default to client
        
        // Security: Only admin@merkabaent.com can be admin
        // If someone else has admin role, downgrade them
        if (role === 'admin' && !isAdminEmail) {
          console.warn('Security: Non-admin email has admin role. Downgrading to client.');
          role = 'client';
          // Optionally update the document to fix it
          try {
            await updateDoc(doc(db, 'users', authUser.uid), {
              role: 'client',
              roleSecurityDowngrade: serverTimestamp(),
            });
          } catch (err) {
            console.error('Error downgrading role:', err);
          }
        }
        
        setUserRole(role);
        setPermissions(getPermissionsForRole(role, userData.permissions, isAdminEmail));
      } else {
        // New user, default to client
        setUserRole('client');
        setPermissions(getPermissionsForRole('client', {}, isAdminEmail));
      }
    } catch (error) {
      console.error('Error loading user role:', error);
      setUserRole('client');
      setPermissions(getPermissionsForRole('client'));
    } finally {
      setLoading(false);
    }
  };

  const getPermissionsForRole = (role, customPermissions = {}) => {
    const basePermissions = {
      // ============================================
      // CLIENT PERMISSIONS (Default Role)
      // ============================================
      canBookServices: true,
      canScheduleEvents: true,
      canViewMenu: true,
      canMakePayments: true,
      canViewOwnHistory: true,
      canViewOwnOrders: true,
      canCancelOwnOrders: true,
      
      // ============================================
      // EMPLOYEE PERMISSIONS
      // ============================================
      // Order Management
      canViewAllOrders: role === 'employee' || role === 'admin' || role === 'master_admin',
      canConfirmOrders: role === 'employee' || role === 'admin' || role === 'master_admin',
      canExecuteOrders: role === 'employee' || role === 'admin' || role === 'master_admin',
      canUpdateOrderStatus: role === 'employee' || role === 'admin' || role === 'master_admin',
      canCancelOrders: role === 'employee' || role === 'admin' || role === 'master_admin',
      
      // Payment Processing
      canProcessPayments: role === 'employee' || role === 'admin' || role === 'master_admin',
      canConfirmPayments: role === 'employee' || role === 'admin' || role === 'master_admin',
      canRefundPayments: role === 'employee' || role === 'admin' || role === 'master_admin',
      canViewPaymentHistory: role === 'employee' || role === 'admin' || role === 'master_admin',
      
      // Ticket Management
      canManageTickets: role === 'employee' || role === 'admin' || role === 'master_admin',
      canConfirmTickets: role === 'employee' || role === 'admin' || role === 'master_admin',
      canValidateTickets: role === 'employee' || role === 'admin' || role === 'master_admin',
      
      // Amenities/Products/Services
      canManageAmenities: role === 'employee' || role === 'admin' || role === 'master_admin',
      canConfirmServiceBookings: role === 'employee' || role === 'admin' || role === 'master_admin',
      canUpdateProductAvailability: role === 'employee' || role === 'admin' || role === 'master_admin',
      
      // Event Management (Limited)
      canViewAssignedEvents: role === 'employee' || role === 'admin' || role === 'master_admin',
      canUpdateEventStatus: role === 'employee' || role === 'admin' || role === 'master_admin',
      
      // ============================================
      // ADMIN PERMISSIONS
      // ============================================
      // Event Management
      canCreateEvents: role === 'admin' || role === 'master_admin',
      canEditEvents: role === 'admin' || role === 'master_admin',
      canDeleteEvents: role === 'admin' || role === 'master_admin',
      canPublishEvents: role === 'admin' || role === 'master_admin',
      
      // Menu Management
      canManageMenu: role === 'admin' || role === 'master_admin',
      canAddMenuItems: role === 'admin' || role === 'master_admin',
      canEditMenuItems: role === 'admin' || role === 'master_admin',
      canDeleteMenuItems: role === 'admin' || role === 'master_admin',
      canUpdateMenuPrices: role === 'admin' || role === 'master_admin',
      
      // Financial Access
      canViewFinancials: role === 'admin' || role === 'master_admin',
      canViewRevenueReports: role === 'admin' || role === 'master_admin',
      canExportFinancialData: role === 'admin' || role === 'master_admin',
      
      // Integration Management
      canConfigureIntegrations: role === 'admin' || role === 'master_admin',
      canManageSquareIntegration: role === 'admin' || role === 'master_admin',
      canManageToastIntegration: role === 'admin' || role === 'master_admin',
      canManageEventbriteIntegration: role === 'admin' || role === 'master_admin',
      
      // System Settings
      canManageSystemSettings: role === 'admin' || role === 'master_admin',
      canConfigureVenueSettings: role === 'admin' || role === 'master_admin',
      
      // ============================================
      // MASTER ADMIN PERMISSIONS (Highest Level)
      // ============================================
      // User & Role Management
      canCreateEmployees: role === 'master_admin',
      canCreateAdmins: role === 'master_admin',
      canUpgradeToAdmin: role === 'master_admin', // Only master admin can create admins
      canRevokeAdminRole: role === 'master_admin', // Only master admin can revoke admin
      canManageEmployees: role === 'master_admin',
      canManageAdmins: role === 'master_admin',
      canAssignRoles: role === 'master_admin',
      canRevokeRoles: role === 'master_admin',
      canDeleteUsers: role === 'master_admin',
      
      // Full System Access
      canAccessAllData: role === 'master_admin',
      canModifySystemConfig: role === 'master_admin',
      canManageAllIntegrations: role === 'master_admin',
      canViewAllFinancials: role === 'master_admin',
      canExportAllData: role === 'master_admin',
      
      // Billing & Subscriptions
      canManageBilling: role === 'master_admin',
      canManageSubscriptions: role === 'master_admin',
    };

    // Merge with custom permissions if provided
    return { ...basePermissions, ...customPermissions };
  };

  const hasPermission = (permission) => {
    return permissions[permission] === true;
  };

  // Role checking functions
  const isMasterAdmin = () => userRole === 'master_admin';
  const isAdmin = () => userRole === 'admin' || userRole === 'master_admin';
  const isEmployee = () => userRole === 'employee' || userRole === 'admin' || userRole === 'master_admin';
  const isClient = () => userRole === 'client' || !userRole;

  const value = {
    userRole,
    permissions,
    loading,
    hasPermission,
    isMasterAdmin,
    isAdmin,
    isEmployee,
    isClient,
    refreshRole: loadUserRole,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}

