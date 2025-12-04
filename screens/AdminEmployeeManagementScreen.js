/**
 * Admin Employee Management Screen
 * Manage employees, assign roles, track performance
 */

import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../firebase';
import RoleManagementService from '../services/RoleManagementService';
import EmptyState from '../components/EmptyState';

export default function AdminEmployeeManagementScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isAdminEmail } = useRole();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const canAccess = isAdminEmail && user?.email === 'admin@merkabaent.com';

  useEffect(() => {
    if (!canAccess) {
      Alert.alert('Access Denied', 'Only admin@merkabaent.com can access this screen');
      navigation.goBack();
      return;
    }
    loadEmployees();
  }, [user, canAccess]);

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const employeesData = await RoleManagementService.getAllEmployees(user.uid);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading employees:', error);
      Alert.alert('Error', 'Failed to load employees');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEmployees();
  }, [loadEmployees]);

  const handleRevokeEmployee = (employee) => {
    Alert.alert(
      'Revoke Employee Role',
      `Are you sure you want to revoke ${employee.displayName || employee.email}'s employee role?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await RoleManagementService.revokeUserRole(user.uid, employee.id);
              Alert.alert('Success', result.message);
              loadEmployees();
            } catch (error) {
              console.error('Error revoking employee:', error);
              Alert.alert('Error', error.message || 'Failed to revoke employee role');
            }
          },
        },
      ]
    );
  };

  const renderEmployeeItem = ({ item }) => {
    const isActive = item.employeeInfo?.status !== 'inactive' && item.accountStatus !== 'inactive';

    return (
      <View style={[styles.employeeCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons name="briefcase" size={24} color={theme.primary} />
        </View>
        <View style={styles.employeeInfo}>
          <Text style={[styles.employeeName, { color: theme.text }]}>
            {item.displayName || item.email || 'Unknown Employee'}
          </Text>
          <Text style={[styles.employeeEmail, { color: theme.subtext }]}>{item.email}</Text>
          {item.employeeInfo?.department && (
            <View style={styles.metaRow}>
              <Ionicons name="business" size={14} color={theme.subtext} />
              <Text style={[styles.metaText, { color: theme.subtext }]}>
                {item.employeeInfo.department}
              </Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: isActive ? '#34C75920' : '#FF3B3020' }]}>
            <Text style={[styles.statusText, { color: isActive ? '#34C759' : '#FF3B30' }]}>
              {isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        <View style={styles.employeeActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.error + '20' }]}
            onPress={() => handleRevokeEmployee(item)}
          >
            <Ionicons name="arrow-down" size={20} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!canAccess) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Employee Management</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AdminUserManagement')} style={styles.addButton}>
          <Ionicons name="add" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          renderItem={renderEmployeeItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="briefcase-outline"
              title="No employees"
              message="No employees in the system. Upgrade users to employee role to get started."
              actionLabel="Manage Users"
              onAction={() => navigation.navigate('AdminUserManagement')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  addButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  employeeEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  employeeActions: {
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});




