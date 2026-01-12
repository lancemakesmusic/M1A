/**
 * Admin User Management Screen
 * Allows admins to upgrade users to employee/admin and revoke roles
 */

import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, getDocs, query, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWallet } from '../contexts/WalletContext';
import { db } from '../firebase';
import RoleManagementService from '../services/RoleManagementService';
import WalletService from '../services/WalletService';

export default function AdminUserManagementScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isAdmin, isMasterAdmin, hasPermission, isAdminEmail } = useRole();
  const { refreshBalance } = useWallet();
  
  // SECURITY: Only admin@merkabaent.com can access this screen
  const canAccess = isAdminEmail && user?.email === 'admin@merkabaent.com';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletNote, setWalletNote] = useState('');
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [upgradeRole, setUpgradeRole] = useState('employee');
  const [department, setDepartment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // SECURITY: Only admin@merkabaent.com can access this screen
    if (!canAccess) {
      Alert.alert(
        'Access Denied',
        'Only admin@merkabaent.com can access admin tools for security purposes.'
      );
      navigation.goBack();
      return;
    }
    loadUsers();
  }, [user, canAccess]);

  const loadUsers = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);

      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort by role (admin, employee, client) then by name
      usersData.sort((a, b) => {
        const roleOrder = { master_admin: 0, admin: 1, employee: 2, client: 3 };
        const roleDiff = (roleOrder[a.role] || 3) - (roleOrder[b.role] || 3);
        if (roleDiff !== 0) return roleDiff;
        return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '');
      });

      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsers();
  }, [loadUsers]);

  const handleUpgradeUser = async () => {
    if (!selectedUser) return;

    if (upgradeRole === 'admin' && !isMasterAdmin()) {
      Alert.alert('Access Denied', 'Only master admin can upgrade users to admin');
      return;
    }

    if (!department.trim() && upgradeRole === 'employee') {
      Alert.alert('Required', 'Please enter a department for the employee');
      return;
    }

    try {
      setProcessing(true);

      const result = await RoleManagementService.upgradeUser(
        user.uid,
        selectedUser.id,
        upgradeRole,
        {
          department: department.trim() || 'General',
        }
      );

      Alert.alert('Success', result.message, [
        {
          text: 'OK',
          onPress: () => {
            setShowUpgradeModal(false);
            setSelectedUser(null);
            setDepartment('');
            loadUsers();
          },
        },
      ]);
    } catch (error) {
      console.error('Error upgrading user:', error);
      Alert.alert('Error', error.message || 'Failed to upgrade user');
    } finally {
      setProcessing(false);
    }
  };

  const handleRevokeRole = (targetUser) => {
    if (targetUser.role === 'master_admin') {
      Alert.alert('Cannot Revoke', 'Cannot revoke master admin role');
      return;
    }

    if (targetUser.role === 'admin' && !isMasterAdmin()) {
      Alert.alert('Access Denied', 'Only master admin can revoke admin roles');
      return;
    }

    Alert.alert(
      'Revoke Role',
      `Are you sure you want to revoke ${targetUser.displayName || targetUser.email}'s ${targetUser.role} role? They will be downgraded to client.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              const result = await RoleManagementService.revokeUserRole(
                user.uid,
                targetUser.id
              );
              Alert.alert('Success', result.message);
              loadUsers();
            } catch (error) {
              console.error('Error revoking role:', error);
              Alert.alert('Error', error.message || 'Failed to revoke role');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'master_admin':
        return '#FF0000';
      case 'admin':
        return '#FF9500';
      case 'employee':
        return '#FFD700';
      case 'client':
        return '#34C759';
      default:
        return theme.subtext;
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'master_admin':
        return 'shield';
      case 'admin':
        return 'star';
      case 'employee':
        return 'briefcase';
      case 'client':
        return 'person';
      default:
        return 'person-outline';
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (u.email || '').toLowerCase().includes(query) ||
      (u.displayName || '').toLowerCase().includes(query) ||
      (u.username || '').toLowerCase().includes(query)
    );
  });

  const handleDeactivateUser = (targetUser) => {
    if (targetUser.email === 'admin@merkabaent.com') {
      Alert.alert('Security Restriction', 'Cannot deactivate admin@merkabaent.com account');
      return;
    }

    Alert.alert(
      'Deactivate Account',
      `Are you sure you want to deactivate ${targetUser.displayName || targetUser.email}'s account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              const result = await RoleManagementService.deactivateUser(user.uid, targetUser.id);
              Alert.alert('Success', result.message);
              loadUsers();
            } catch (error) {
              console.error('Error deactivating user:', error);
              Alert.alert('Error', error.message || 'Failed to deactivate account');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleReactivateUser = async (targetUser) => {
    try {
      setProcessing(true);
      const result = await RoleManagementService.reactivateUser(user.uid, targetUser.id);
      Alert.alert('Success', result.message);
      loadUsers();
    } catch (error) {
      console.error('Error reactivating user:', error);
      Alert.alert('Error', error.message || 'Failed to reactivate account');
    } finally {
      setProcessing(false);
    }
  };

  const loadWalletBalance = async (userId) => {
    try {
      setLoadingWallet(true);
      const balance = await WalletService.getBalance(userId);
      setWalletBalance(balance);
    } catch (error) {
      console.error('Error loading wallet balance:', error);
      Alert.alert('Error', 'Failed to load wallet balance');
      setWalletBalance(0);
    } finally {
      setLoadingWallet(false);
    }
  };

  const handleOpenWalletModal = async (targetUser) => {
    setSelectedUser(targetUser);
    setShowAdminMenu(false);
    setShowWalletModal(true);
    setWalletAmount('');
    setWalletNote('');
    await loadWalletBalance(targetUser.id);
  };

  const handleAdjustWalletBalance = async () => {
    if (!selectedUser) return;
    
    const amount = parseFloat(walletAmount);
    if (isNaN(amount) || amount === 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (!walletNote.trim()) {
      Alert.alert('Note Required', 'Please enter a note explaining the balance adjustment (e.g., "Cash payment for event tickets")');
      return;
    }

    Alert.alert(
      'Confirm Balance Adjustment',
      `${amount > 0 ? 'Add' : 'Deduct'} $${Math.abs(amount).toFixed(2)} ${amount > 0 ? 'to' : 'from'} ${selectedUser.displayName || selectedUser.email}'s wallet?\n\nNote: ${walletNote}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setProcessing(true);
              
              // Update wallet balance in wallets collection
              await WalletService.updateBalance(selectedUser.id, amount);
              
              // Also sync balance to user document for quick reference (optional)
              // This ensures consistency across the app
              try {
                const userRef = doc(db, 'users', selectedUser.id);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                  const currentWalletBalance = await WalletService.getBalance(selectedUser.id);
                  await updateDoc(userRef, {
                    wallet: currentWalletBalance,
                    updatedAt: serverTimestamp(),
                  });
                }
              } catch (syncError) {
                console.warn('Failed to sync balance to user document:', syncError);
                // Don't fail the operation if sync fails
              }
              
              // Create transaction record for audit trail
              const transactionId = `ADMIN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              await addDoc(collection(db, 'walletTransactions'), {
                userId: selectedUser.id,
                amount: amount,
                type: amount > 0 ? 'admin_credit' : 'admin_debit',
                status: 'completed',
                description: walletNote,
                adminId: user.uid,
                adminEmail: user.email,
                transactionId: transactionId,
                createdAt: serverTimestamp(),
                paymentMethod: 'cash',
                notes: `Admin adjustment by ${user.email}`,
              });
              
              // Reload wallet balance
              await loadWalletBalance(selectedUser.id);
              
              // If the adjusted user is the currently logged-in user, refresh their WalletContext
              if (selectedUser.id === user.uid) {
                console.log('🔄 Refreshing WalletContext for adjusted user');
                await refreshBalance(selectedUser.id);
              }
              
              Alert.alert(
                'Success',
                `Wallet balance ${amount > 0 ? 'increased' : 'decreased'} by $${Math.abs(amount).toFixed(2)}`
              );
              
              setWalletAmount('');
              setWalletNote('');
            } catch (error) {
              console.error('Error adjusting wallet balance:', error);
              Alert.alert('Error', error.message || 'Failed to adjust wallet balance');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const renderUserItem = ({ item }) => {
    const canUpgrade = item.role === 'client' && hasPermission('canUpgradeToEmployee');
    const canUpgradeToAdmin = item.role === 'client' && isMasterAdmin();
    const canRevoke = (item.role === 'employee' && hasPermission('canRevokeEmployeeRole')) ||
                      (item.role === 'admin' && isMasterAdmin());
    const isDeactivated = item.accountStatus === 'inactive';
    const isBanned = item.accountStatus === 'banned';
    const isSuspended = item.accountStatus === 'suspended';

    return (
      <View style={[styles.userItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.userInfo}>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
            <Ionicons name={getRoleIcon(item.role)} size={20} color={getRoleColor(item.role)} />
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: theme.text }]}>
              {item.displayName || item.email || 'Unknown User'}
            </Text>
            <Text style={[styles.userEmail, { color: theme.subtext }]}>
              {item.email || 'No email'}
            </Text>
            <View style={styles.roleContainer}>
              <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
                {item.role?.toUpperCase() || 'CLIENT'}
              </Text>
              {item.employeeInfo?.department && (
                <Text style={[styles.departmentText, { color: theme.subtext }]}>
                  • {item.employeeInfo.department}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.userActions}>
          {canUpgrade && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.primary + '20' }]}
              onPress={() => {
                setSelectedUser(item);
                setUpgradeRole('employee');
                setShowUpgradeModal(true);
              }}
            >
              <Ionicons name="arrow-up" size={18} color={theme.primary} />
              <Text style={[styles.actionButtonText, { color: theme.primary }]}>Employee</Text>
            </TouchableOpacity>
          )}
          {canUpgradeToAdmin && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FF9500' + '20' }]}
              onPress={() => {
                setSelectedUser(item);
                setUpgradeRole('admin');
                setShowUpgradeModal(true);
              }}
            >
              <Ionicons name="star" size={18} color="#FF9500" />
              <Text style={[styles.actionButtonText, { color: '#FF9500' }]}>Admin</Text>
            </TouchableOpacity>
          )}
          {canRevoke && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.error + '20' }]}
              onPress={() => handleRevokeRole(item)}
            >
              <Ionicons name="arrow-down" size={18} color={theme.error} />
              <Text style={[styles.actionButtonText, { color: theme.error }]}>Revoke</Text>
            </TouchableOpacity>
          )}
          {!isDeactivated && item.email !== 'admin@merkabaent.com' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FF3B3020' }]}
              onPress={() => handleDeactivateUser(item)}
            >
              <Ionicons name="ban" size={18} color="#FF3B30" />
              <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>Deactivate</Text>
            </TouchableOpacity>
          )}
          {isDeactivated && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#34C75920' }]}
              onPress={() => handleReactivateUser(item)}
            >
              <Ionicons name="checkmark-circle" size={18} color="#34C759" />
              <Text style={[styles.actionButtonText, { color: '#34C759' }]}>Reactivate</Text>
            </TouchableOpacity>
          )}
          {/* Admin Actions Menu */}
          <TouchableOpacity
            style={[styles.adminMenuButton, { backgroundColor: theme.primary + '20' }]}
            onPress={() => {
              setSelectedUser(item);
              setShowAdminMenu(true);
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={theme.primary} />
            <Text style={[styles.actionButtonText, { color: theme.primary }]}>Admin</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleDeleteUser = (targetUser) => {
    if (targetUser.email === 'admin@merkabaent.com') {
      Alert.alert('Security Restriction', 'Cannot delete admin@merkabaent.com account');
      return;
    }

    Alert.alert(
      'Delete Account',
      `Permanently delete ${targetUser.displayName || targetUser.email}'s account? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              // Account deletion: Mark account as deleted and set deletion metadata
              // The account is soft-deleted (marked for deletion) rather than hard-deleted
              // to maintain data integrity and allow for recovery if needed
              await updateDoc(doc(db, 'users', targetUser.id), {
                accountStatus: 'deleted',
                deletedAt: serverTimestamp(),
                deletedBy: user.uid,
              });
              Alert.alert('Success', 'Account marked for deletion');
              loadUsers();
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', error.message || 'Failed to delete account');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleBanUser = (targetUser) => {
    if (targetUser.email === 'admin@merkabaent.com') {
      Alert.alert('Security Restriction', 'Cannot ban admin@merkabaent.com account');
      return;
    }

    Alert.alert(
      'Ban User',
      `Ban ${targetUser.displayName || targetUser.email}? They will not be able to access the app.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              await updateDoc(doc(db, 'users', targetUser.id), {
                accountStatus: 'banned',
                bannedAt: serverTimestamp(),
                bannedBy: user.uid,
              });
              Alert.alert('Success', 'User has been banned');
              loadUsers();
            } catch (error) {
              console.error('Error banning user:', error);
              Alert.alert('Error', error.message || 'Failed to ban user');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleSuspendUser = (targetUser, days = 7) => {
    if (targetUser.email === 'admin@merkabaent.com') {
      Alert.alert('Security Restriction', 'Cannot suspend admin@merkabaent.com account');
      return;
    }

    const suspendUntil = new Date();
    suspendUntil.setDate(suspendUntil.getDate() + days);

    Alert.alert(
      'Suspend User',
      `Suspend ${targetUser.displayName || targetUser.email} for ${days} days?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              await updateDoc(doc(db, 'users', targetUser.id), {
                accountStatus: 'suspended',
                suspendedUntil: suspendUntil,
                suspendedAt: serverTimestamp(),
                suspendedBy: user.uid,
              });
              Alert.alert('Success', `User suspended until ${suspendUntil.toLocaleDateString()}`);
              loadUsers();
            } catch (error) {
              console.error('Error suspending user:', error);
              Alert.alert('Error', error.message || 'Failed to suspend user');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  if (loading && users.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>User Management</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground }]}>
        <Ionicons name="search" size={20} color={theme.subtext} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search users..."
          placeholderTextColor={theme.subtext}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.subtext} />
          </TouchableOpacity>
        )}
      </View>

      {/* Users List */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No users found"
            message={searchQuery ? 'No users match your search' : 'No users in the system'}
          />
        }
      />

      {/* Admin Actions Menu Modal */}
      <Modal visible={showAdminMenu} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.adminMenuModal, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Admin Actions: {selectedUser?.displayName || selectedUser?.email}
              </Text>
              <TouchableOpacity onPress={() => setShowAdminMenu(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Promote Actions */}
              {selectedUser?.role === 'client' && (
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: theme.primary + '10', borderColor: theme.primary }]}
                  onPress={() => {
                    setShowAdminMenu(false);
                    setSelectedUser(selectedUser);
                    setUpgradeRole('employee');
                    setShowUpgradeModal(true);
                  }}
                >
                  <Ionicons name="arrow-up-circle" size={24} color={theme.primary} />
                  <View style={styles.menuItemText}>
                    <Text style={[styles.menuItemTitle, { color: theme.text }]}>Promote to Employee</Text>
                    <Text style={[styles.menuItemSubtitle, { color: theme.subtext }]}>
                      Grant employee permissions
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Account Status Actions */}
              {selectedUser?.accountStatus !== 'banned' && selectedUser?.email !== 'admin@merkabaent.com' && (
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: '#FF950010', borderColor: '#FF9500' }]}
                  onPress={() => {
                    setShowAdminMenu(false);
                    handleBanUser(selectedUser);
                  }}
                >
                  <Ionicons name="ban" size={24} color="#FF9500" />
                  <View style={styles.menuItemText}>
                    <Text style={[styles.menuItemTitle, { color: theme.text }]}>Ban User</Text>
                    <Text style={[styles.menuItemSubtitle, { color: theme.subtext }]}>
                      Permanently ban from app
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {selectedUser?.accountStatus !== 'suspended' && selectedUser?.email !== 'admin@merkabaent.com' && (
                <>
                  <TouchableOpacity
                    style={[styles.menuItem, { backgroundColor: '#FF6B6B10', borderColor: '#FF6B6B' }]}
                    onPress={() => {
                      setShowAdminMenu(false);
                      handleSuspendUser(selectedUser, 7);
                    }}
                  >
                    <Ionicons name="pause-circle" size={24} color="#FF6B6B" />
                    <View style={styles.menuItemText}>
                      <Text style={[styles.menuItemTitle, { color: theme.text }]}>Suspend (7 days)</Text>
                      <Text style={[styles.menuItemSubtitle, { color: theme.subtext }]}>
                        Temporarily suspend access
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.menuItem, { backgroundColor: '#FF6B6B10', borderColor: '#FF6B6B' }]}
                    onPress={() => {
                      setShowAdminMenu(false);
                      handleSuspendUser(selectedUser, 30);
                    }}
                  >
                    <Ionicons name="pause-circle" size={24} color="#FF6B6B" />
                    <View style={styles.menuItemText}>
                      <Text style={[styles.menuItemTitle, { color: theme.text }]}>Suspend (30 days)</Text>
                      <Text style={[styles.menuItemSubtitle, { color: theme.subtext }]}>
                        Extended suspension
                      </Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}

              {/* Deactivate/Reactivate */}
              {selectedUser?.accountStatus !== 'inactive' && selectedUser?.email !== 'admin@merkabaent.com' && (
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: '#FF3B3010', borderColor: '#FF3B30' }]}
                  onPress={() => {
                    setShowAdminMenu(false);
                    handleDeactivateUser(selectedUser);
                  }}
                >
                  <Ionicons name="ban" size={24} color="#FF3B30" />
                  <View style={styles.menuItemText}>
                    <Text style={[styles.menuItemTitle, { color: theme.text }]}>Deactivate Account</Text>
                    <Text style={[styles.menuItemSubtitle, { color: theme.subtext }]}>
                      Disable account access
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {selectedUser?.accountStatus === 'inactive' && (
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: '#34C75910', borderColor: '#34C759' }]}
                  onPress={() => {
                    setShowAdminMenu(false);
                    handleReactivateUser(selectedUser);
                  }}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                  <View style={styles.menuItemText}>
                    <Text style={[styles.menuItemTitle, { color: theme.text }]}>Reactivate Account</Text>
                    <Text style={[styles.menuItemSubtitle, { color: theme.subtext }]}>
                      Restore account access
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Revoke Role */}
              {(selectedUser?.role === 'employee' || selectedUser?.role === 'admin') && selectedUser?.email !== 'admin@merkabaent.com' && (
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: theme.error + '10', borderColor: theme.error }]}
                  onPress={() => {
                    setShowAdminMenu(false);
                    handleRevokeRole(selectedUser);
                  }}
                >
                  <Ionicons name="arrow-down-circle" size={24} color={theme.error} />
                  <View style={styles.menuItemText}>
                    <Text style={[styles.menuItemTitle, { color: theme.text }]}>Revoke Role</Text>
                    <Text style={[styles.menuItemSubtitle, { color: theme.subtext }]}>
                      Downgrade to client
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Wallet Balance Adjustment */}
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: '#34C75910', borderColor: '#34C759' }]}
                onPress={() => handleOpenWalletModal(selectedUser)}
              >
                <Ionicons name="wallet" size={24} color="#34C759" />
                <View style={styles.menuItemText}>
                  <Text style={[styles.menuItemTitle, { color: theme.text }]}>Adjust Wallet Balance</Text>
                  <Text style={[styles.menuItemSubtitle, { color: theme.subtext }]}>
                    Add store credit for cash payments
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Delete Account */}
              {selectedUser?.email !== 'admin@merkabaent.com' && (
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: '#00000010', borderColor: '#FF3B30' }]}
                  onPress={() => {
                    setShowAdminMenu(false);
                    handleDeleteUser(selectedUser);
                  }}
                >
                  <Ionicons name="trash" size={24} color="#FF3B30" />
                  <View style={styles.menuItemText}>
                    <Text style={[styles.menuItemTitle, { color: '#FF3B30' }]}>Delete Account</Text>
                    <Text style={[styles.menuItemSubtitle, { color: theme.subtext }]}>
                      Permanently delete (irreversible)
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Wallet Balance Adjustment Modal */}
      <Modal visible={showWalletModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Adjust Wallet Balance
              </Text>
              <TouchableOpacity onPress={() => setShowWalletModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={[styles.walletInfoContainer, { borderBottomColor: theme.border }]}>
                <Text style={[styles.walletInfoLabel, { color: theme.subtext }]}>User</Text>
                <Text style={[styles.walletInfoValue, { color: theme.text }]}>
                  {selectedUser?.displayName || selectedUser?.email}
                </Text>
              </View>

              <View style={[styles.walletInfoContainer, { borderBottomColor: theme.border }]}>
                <Text style={[styles.walletInfoLabel, { color: theme.subtext }]}>Current Balance</Text>
                {loadingWallet ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Text style={[styles.walletInfoValue, { color: theme.primary, fontSize: 24, fontWeight: 'bold' }]}>
                    ${walletBalance.toFixed(2)}
                  </Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>
                  Amount {walletAmount && parseFloat(walletAmount) > 0 ? '(Add)' : walletAmount && parseFloat(walletAmount) < 0 ? '(Deduct)' : ''}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="Enter amount (positive to add, negative to deduct)"
                  placeholderTextColor={theme.subtext}
                  keyboardType="decimal-pad"
                  value={walletAmount}
                  onChangeText={(text) => {
                    // Allow negative sign, decimal point, and numbers
                    const cleaned = text.replace(/[^0-9.-]/g, '');
                    setWalletAmount(cleaned);
                  }}
                />
                {walletAmount && !isNaN(parseFloat(walletAmount)) && (
                  <Text style={[styles.previewText, { color: parseFloat(walletAmount) > 0 ? '#34C759' : '#FF3B30' }]}>
                    New balance: ${(walletBalance + parseFloat(walletAmount)).toFixed(2)}
                  </Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Reason / Note *</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="e.g., Cash payment for event tickets, Refund for cancelled order"
                  placeholderTextColor={theme.subtext}
                  multiline
                  numberOfLines={3}
                  value={walletNote}
                  onChangeText={setWalletNote}
                />
                <Text style={[styles.inputHint, { color: theme.subtext }]}>
                  Required: Explain why the balance is being adjusted
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: processing ? theme.subtext : theme.primary,
                    opacity: processing ? 0.6 : 1,
                  },
                ]}
                onPress={handleAdjustWalletBalance}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {walletAmount && parseFloat(walletAmount) > 0 ? 'Add Credit' : walletAmount && parseFloat(walletAmount) < 0 ? 'Deduct Balance' : 'Adjust Balance'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedUser && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Upgrade to {upgradeRole === 'admin' ? 'Admin' : 'Employee'}
              </Text>
              <TouchableOpacity onPress={() => setShowUpgradeModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={[styles.modalText, { color: theme.text }]}>
                Upgrade {selectedUser.displayName || selectedUser.email} to {upgradeRole}?
              </Text>

              {upgradeRole === 'employee' && (
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Department</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                    placeholder="e.g., Bar Staff, Event Coordinator"
                    placeholderTextColor={theme.subtext}
                    value={department}
                    onChangeText={setDepartment}
                  />
                </View>
              )}

              {upgradeRole === 'admin' && (
                <View style={[styles.warningBox, { backgroundColor: theme.warning + '20', borderColor: theme.warning }]}>
                  <Ionicons name="warning" size={20} color={theme.warning} />
                  <Text style={[styles.warningText, { color: theme.text }]}>
                    Only master admin can create admin accounts. This user will have full management access.
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.border }]}
                onPress={() => setShowUpgradeModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={handleUpgradeUser}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>Upgrade</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roleBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  departmentText: {
    fontSize: 12,
    marginLeft: 4,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  warningBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  adminMenuModal: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 16,
    maxHeight: '80%',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuItemSubtitle: {
    fontSize: 12,
  },
  adminMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  walletInfoContainer: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  walletInfoLabel: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  walletInfoValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

