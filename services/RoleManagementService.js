/**
 * Role Management Service
 * Handles role assignment, employee creation, and permission management
 * Only master_admin can create employees and admins
 */

import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

class RoleManagementService {
  /**
   * Create an employee account
   * Master admin or admin can perform this action
   * @param {string} requesterId - ID of the admin/master admin creating the employee
   * @param {Object} employeeData - Employee information
   * @param {string} employeeData.email - Employee email
   * @param {string} employeeData.displayName - Employee name
   * @param {string} employeeData.phoneNumber - Employee phone (optional)
   * @param {string} employeeData.department - Department/role description (optional)
   * @returns {Promise<Object>} Created employee data
   */
  async createEmployeeAccount(requesterId, employeeData) {
    try {
      // Verify admin or master admin status
      const requesterDoc = await getDoc(doc(db, 'users', requesterId));
      if (!requesterDoc.exists()) {
        throw new Error('Requester not found');
      }

      const requesterData = requesterDoc.data();
      if (!['master_admin', 'admin'].includes(requesterData.role)) {
        throw new Error('Only admin or master admin can create employee accounts');
      }

      // Check if email already exists
      const existingUserQuery = query(
        collection(db, 'users'),
        where('email', '==', employeeData.email)
      );
      const existingUserSnapshot = await getDocs(existingUserQuery);
      
      if (!existingUserSnapshot.empty) {
        throw new Error('User with this email already exists');
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        employeeData.email,
        employeeData.temporaryPassword || this.generateTemporaryPassword()
      );

      const newEmployeeId = userCredential.user.uid;

      // Create user profile with employee role
      const employeeProfile = {
        email: employeeData.email,
        displayName: employeeData.displayName || employeeData.email.split('@')[0],
        phoneNumber: employeeData.phoneNumber || '',
        role: 'employee',
        createdAt: serverTimestamp(),
        createdBy: requesterId,
        employeeInfo: {
          employeeId: newEmployeeId,
          department: employeeData.department || 'General',
          hireDate: serverTimestamp(),
          status: 'active',
          permissions: employeeData.customPermissions || {},
        },
        // Employee-specific settings
        canConfirmOrders: true,
        canProcessPayments: true,
        canManageTickets: true,
        canManageAmenities: true,
      };

      await setDoc(doc(db, 'users', newEmployeeId), employeeProfile);

      // Send password reset email so employee can set their own password
      if (employeeData.sendPasswordReset) {
        await sendPasswordResetEmail(auth, employeeData.email);
      }

      return {
        success: true,
        employeeId: newEmployeeId,
        email: employeeData.email,
        message: 'Employee account created successfully',
      };
    } catch (error) {
      console.error('Error creating employee account:', error);
      throw error;
    }
  }

  /**
   * Create an admin account
   * Only master_admin can perform this action (admins cannot create other admins)
   * @param {string} requesterId - ID of the master admin creating the admin
   * @param {Object} adminData - Admin information
   * @returns {Promise<Object>} Created admin data
   */
  async createAdminAccount(requesterId, adminData) {
    try {
      // Verify master admin status (only master admin can create admins)
      const requesterDoc = await getDoc(doc(db, 'users', requesterId));
      if (!requesterDoc.exists()) {
        throw new Error('Requester not found');
      }

      const requesterData = requesterDoc.data();
      if (requesterData.role !== 'master_admin') {
        throw new Error('Only master admin can create admin accounts');
      }

      // Check if email already exists
      const existingUserQuery = query(
        collection(db, 'users'),
        where('email', '==', adminData.email)
      );
      const existingUserSnapshot = await getDocs(existingUserQuery);
      
      if (!existingUserSnapshot.empty) {
        throw new Error('User with this email already exists');
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        adminData.email,
        adminData.temporaryPassword || this.generateTemporaryPassword()
      );

      const newAdminId = userCredential.user.uid;

      // Create user profile with admin role
      const adminProfile = {
        email: adminData.email,
        displayName: adminData.displayName || adminData.email.split('@')[0],
        phoneNumber: adminData.phoneNumber || '',
        role: 'admin',
        createdAt: serverTimestamp(),
        createdBy: requesterId,
        adminInfo: {
          adminId: newAdminId,
          department: adminData.department || 'Management',
          assignedDate: serverTimestamp(),
          status: 'active',
          permissions: adminData.customPermissions || {},
        },
      };

      await setDoc(doc(db, 'users', newAdminId), adminProfile);

      // Send password reset email
      if (adminData.sendPasswordReset) {
        await sendPasswordResetEmail(auth, adminData.email);
      }

      return {
        success: true,
        adminId: newAdminId,
        email: adminData.email,
        message: 'Admin account created successfully',
      };
    } catch (error) {
      console.error('Error creating admin account:', error);
      throw error;
    }
  }

  /**
   * Upgrade user to employee or admin
   * SECURITY: Only admin@merkabaent.com can upgrade users
   * Only employee role upgrades are allowed (no admin upgrades)
   * @param {string} requesterId - ID of the admin (must be admin@merkabaent.com)
   * @param {string} userId - ID of user to upgrade
   * @param {string} newRole - New role ('employee' only - admin upgrades blocked)
   * @param {Object} roleInfo - Additional role information (optional)
   * @returns {Promise<Object>} Update result
   */
  async upgradeUser(requesterId, userId, newRole, roleInfo = {}) {
    try {
      // Verify requester has permission
      const requesterDoc = await getDoc(doc(db, 'users', requesterId));
      if (!requesterDoc.exists()) {
        throw new Error('Requester not found');
      }

      const requesterData = requesterDoc.data();
      
      // SECURITY: Only admin@merkabaent.com can upgrade users
      if (requesterData.email !== 'admin@merkabaent.com') {
        throw new Error('Only admin@merkabaent.com can upgrade users');
      }
      
      // SECURITY: Block admin role upgrades - only admin@merkabaent.com can be admin
      if (newRole === 'admin') {
        throw new Error('Admin role upgrades are not allowed. Only admin@merkabaent.com can be admin.');
      }
      
      if (newRole === 'employee' && requesterData.role !== 'admin') {
        throw new Error('Only admin@merkabaent.com can upgrade users to employee');
      }

      // Validate role - only employee allowed
      const validRoles = ['employee'];
      if (!validRoles.includes(newRole)) {
        throw new Error(`Invalid upgrade role. Only 'employee' role upgrades are allowed.`);
      }

      // Get user to upgrade
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      
      // Cannot change master_admin role
      if (userData.role === 'master_admin') {
        throw new Error('Cannot change master admin role');
      }

      // Cannot downgrade admin (only master_admin can do that)
      if (userData.role === 'admin' && requesterData.role !== 'master_admin') {
        throw new Error('Only master admin can change admin roles');
      }

      // Prepare update data
      const updateData = {
        role: newRole,
        roleUpdatedAt: serverTimestamp(),
        roleUpdatedBy: requesterId,
        previousRole: userData.role, // Keep track of previous role for revocation
      };

      // Add role-specific info
      if (newRole === 'employee') {
        updateData.employeeInfo = {
          employeeId: userId,
          department: roleInfo.department || 'General',
          hireDate: serverTimestamp(),
          status: 'active',
          createdBy: requesterId,
          ...roleInfo,
        };
        // Remove admin info if exists
        if (userData.adminInfo) {
          updateData.adminInfo = null;
        }
      } else if (newRole === 'admin') {
        updateData.adminInfo = {
          adminId: userId,
          department: roleInfo.department || 'Management',
          assignedDate: serverTimestamp(),
          status: 'active',
          createdBy: requesterId,
          ...roleInfo,
        };
        // Remove employee info if exists
        if (userData.employeeInfo) {
          updateData.employeeInfo = null;
        }
      }

      // Update role
      await updateDoc(doc(db, 'users', userId), updateData);

      return {
        success: true,
        userId,
        newRole,
        previousRole: userData.role,
        message: `User upgraded from ${userData.role} to ${newRole}`,
      };
    } catch (error) {
      console.error('Error upgrading user:', error);
      throw error;
    }
  }

  /**
   * Revoke user role (downgrade to client)
   * SECURITY: Only admin@merkabaent.com can revoke roles
   * @param {string} requesterId - ID of the admin (must be admin@merkabaent.com)
   * @param {string} userId - ID of user to revoke
   * @returns {Promise<Object>} Revocation result
   */
  async revokeUserRole(requesterId, userId) {
    try {
      // Verify requester has permission
      const requesterDoc = await getDoc(doc(db, 'users', requesterId));
      if (!requesterDoc.exists()) {
        throw new Error('Requester not found');
      }

      const requesterData = requesterDoc.data();

      // SECURITY: Only admin@merkabaent.com can revoke roles
      if (requesterData.email !== 'admin@merkabaent.com') {
        throw new Error('Only admin@merkabaent.com can revoke user roles');
      }

      // Get user to revoke
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();

      // Cannot revoke admin@merkabaent.com's role
      if (userData.email === 'admin@merkabaent.com') {
        throw new Error('Cannot revoke admin@merkabaent.com role');
      }

      // Cannot revoke master_admin (though this shouldn't exist)
      if (userData.role === 'master_admin') {
        throw new Error('Cannot revoke master admin role');
      }

      // Downgrade to client
      const updateData = {
        role: 'client',
        roleUpdatedAt: serverTimestamp(),
        roleUpdatedBy: requesterId,
        previousRole: userData.role,
        roleRevokedAt: serverTimestamp(),
        roleRevokedBy: requesterId,
      };

      // Preserve role info for audit trail, but mark as inactive
      if (userData.employeeInfo) {
        updateData.employeeInfo = {
          ...userData.employeeInfo,
          status: 'inactive',
          revokedAt: serverTimestamp(),
        };
      }

      if (userData.adminInfo) {
        updateData.adminInfo = {
          ...userData.adminInfo,
          status: 'inactive',
          revokedAt: serverTimestamp(),
        };
      }

      await updateDoc(doc(db, 'users', userId), updateData);

      return {
        success: true,
        userId,
        previousRole: userData.role,
        newRole: 'client',
        message: `User role revoked. Downgraded from ${userData.role} to client`,
      };
    } catch (error) {
      console.error('Error revoking user role:', error);
      throw error;
    }
  }

  /**
   * Update user role (master admin only - for any role change)
   * @param {string} masterAdminId - ID of the master admin
   * @param {string} userId - ID of user to update
   * @param {string} newRole - New role ('employee', 'admin', 'client')
   * @returns {Promise<Object>} Update result
   */
  async updateUserRole(masterAdminId, userId, newRole) {
    try {
      // Verify master admin status
      const masterAdminDoc = await getDoc(doc(db, 'users', masterAdminId));
      if (!masterAdminDoc.exists()) {
        throw new Error('Master admin not found');
      }

      const masterAdminData = masterAdminDoc.data();
      if (masterAdminData.role !== 'master_admin') {
        throw new Error('Only master admin can update user roles directly');
      }

      // Validate role
      const validRoles = ['client', 'employee', 'admin'];
      if (!validRoles.includes(newRole)) {
        throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      // Cannot change master_admin role
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      if (userData.role === 'master_admin') {
        throw new Error('Cannot change master admin role');
      }

      // Update role
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        roleUpdatedAt: serverTimestamp(),
        roleUpdatedBy: masterAdminId,
      });

      return {
        success: true,
        userId,
        newRole,
        message: `User role updated to ${newRole}`,
      };
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  /**
   * Get all employees
   * @param {string} requesterId - ID of user requesting the list
   * @returns {Promise<Array>} List of employees
   */
  async getAllEmployees(requesterId) {
    try {
      // Verify requester has permission
      const requesterDoc = await getDoc(doc(db, 'users', requesterId));
      if (!requesterDoc.exists()) {
        throw new Error('Requester not found');
      }

      const requesterData = requesterDoc.data();
      if (!['master_admin', 'admin'].includes(requesterData.role)) {
        throw new Error('Insufficient permissions to view employees');
      }

      const employeesQuery = query(
        collection(db, 'users'),
        where('role', '==', 'employee')
      );
      const employeesSnapshot = await getDocs(employeesQuery);

      return employeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting employees:', error);
      throw error;
    }
  }

  /**
   * Get all admins
   * Only master_admin can perform this action
   * @param {string} masterAdminId - ID of the master admin
   * @returns {Promise<Array>} List of admins
   */
  async getAllAdmins(masterAdminId) {
    try {
      // Verify master admin status
      const masterAdminDoc = await getDoc(doc(db, 'users', masterAdminId));
      if (!masterAdminDoc.exists()) {
        throw new Error('Master admin not found');
      }

      const masterAdminData = masterAdminDoc.data();
      if (masterAdminData.role !== 'master_admin') {
        throw new Error('Only master admin can view all admins');
      }

      const adminsQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['admin', 'master_admin'])
      );
      const adminsSnapshot = await getDocs(adminsQuery);

      return adminsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting admins:', error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   * SECURITY: Only admin@merkabaent.com can deactivate users
   * @param {string} requesterId - ID of the admin (must be admin@merkabaent.com)
   * @param {string} userId - ID of user to deactivate
   * @returns {Promise<Object>} Deactivation result
   */
  async deactivateUser(requesterId, userId) {
    try {
      // Verify requester has permission
      const requesterDoc = await getDoc(doc(db, 'users', requesterId));
      if (!requesterDoc.exists()) {
        throw new Error('Requester not found');
      }

      const requesterData = requesterDoc.data();

      // SECURITY: Only admin@merkabaent.com can deactivate users
      if (requesterData.email !== 'admin@merkabaent.com') {
        throw new Error('Only admin@merkabaent.com can deactivate user accounts');
      }

      // Cannot deactivate admin@merkabaent.com
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      if (userData.email === 'admin@merkabaent.com') {
        throw new Error('Cannot deactivate admin@merkabaent.com account');
      }

      await updateDoc(doc(db, 'users', userId), {
        accountStatus: 'inactive',
        deactivatedAt: serverTimestamp(),
        deactivatedBy: requesterId,
      });

      return {
        success: true,
        userId,
        message: 'User account deactivated',
      };
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  }

  /**
   * Reactivate user account
   * SECURITY: Only admin@merkabaent.com can reactivate users
   * @param {string} requesterId - ID of the admin (must be admin@merkabaent.com)
   * @param {string} userId - ID of user to reactivate
   * @returns {Promise<Object>} Reactivation result
   */
  async reactivateUser(requesterId, userId) {
    try {
      // Verify requester has permission
      const requesterDoc = await getDoc(doc(db, 'users', requesterId));
      if (!requesterDoc.exists()) {
        throw new Error('Requester not found');
      }

      const requesterData = requesterDoc.data();

      // SECURITY: Only admin@merkabaent.com can reactivate users
      if (requesterData.email !== 'admin@merkabaent.com') {
        throw new Error('Only admin@merkabaent.com can reactivate user accounts');
      }

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      await updateDoc(doc(db, 'users', userId), {
        accountStatus: 'active',
        reactivatedAt: serverTimestamp(),
        reactivatedBy: requesterId,
      });

      return {
        success: true,
        userId,
        message: 'User account reactivated',
      };
    } catch (error) {
      console.error('Error reactivating user:', error);
      throw error;
    }
  }

  /**
   * Deactivate employee account
   * @param {string} masterAdminId - ID of the master admin
   * @param {string} employeeId - ID of employee to deactivate
   * @returns {Promise<Object>} Deactivation result
   */
  async deactivateEmployee(masterAdminId, employeeId) {
    try {
      // Verify master admin status
      const masterAdminDoc = await getDoc(doc(db, 'users', masterAdminId));
      if (!masterAdminDoc.exists()) {
        throw new Error('Master admin not found');
      }

      const masterAdminData = masterAdminDoc.data();
      if (masterAdminData.role !== 'master_admin') {
        throw new Error('Only master admin can deactivate employees');
      }

      await updateDoc(doc(db, 'users', employeeId), {
        'employeeInfo.status': 'inactive',
        deactivatedAt: serverTimestamp(),
        deactivatedBy: masterAdminId,
      });

      return {
        success: true,
        employeeId,
        message: 'Employee account deactivated',
      };
    } catch (error) {
      console.error('Error deactivating employee:', error);
      throw error;
    }
  }

  /**
   * Generate a temporary password
   * @returns {string} Temporary password
   */
  generateTemporaryPassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}

export default new RoleManagementService();

