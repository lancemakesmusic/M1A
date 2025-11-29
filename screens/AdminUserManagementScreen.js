/**
 * Admin User Management Screen
 * Allows admins to upgrade users to employee/admin and revoke roles
 */

import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
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
import { db } from '../firebase';
import RoleManagementService from '../services/RoleManagementService';

export default function AdminUserManagementScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isAdmin, isMasterAdmin, hasPermission, isAdminEmail } = useRole();
  
  // SECURITY: Only admin@merkabaent.com can access this screen
  const canAccess = isAdminEmail && user?.email === 'admin@merkabaent.com';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
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

  const renderUserItem = ({ item }) => {
    const canUpgrade = item.role === 'client' && hasPermission('canUpgradeToEmployee');
    const canUpgradeToAdmin = item.role === 'client' && isMasterAdmin();
    const canRevoke = (item.role === 'employee' && hasPermission('canRevokeEmployeeRole')) ||
                      (item.role === 'admin' && isMasterAdmin());

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
        </View>
      </View>
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
});

