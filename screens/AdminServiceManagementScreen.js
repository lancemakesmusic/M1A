/**
 * Admin Service Management Screen
 * Add, edit, delete services. Manage prices and deals.
 */

import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
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
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../firebase';
import EmptyState from '../components/EmptyState';

export default function AdminServiceManagementScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isAdminEmail } = useRole();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    duration: '',
    available: true,
  });

  const canAccess = isAdminEmail && user?.email === 'admin@merkabaent.com';

  useEffect(() => {
    if (!canAccess) {
      Alert.alert('Access Denied', 'Only admin@merkabaent.com can access this screen');
      navigation.goBack();
      return;
    }
    loadServices();
  }, [user, canAccess]);

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      const servicesSnapshot = await getDocs(collection(db, 'services'));
      const servicesData = servicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setServices(servicesData);
    } catch (error) {
      console.error('Error loading services:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadServices();
  }, [loadServices]);

  const handleAddService = () => {
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      duration: '',
      available: true,
    });
    setShowAddModal(true);
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name || '',
      description: service.description || '',
      price: service.price?.toString() || '',
      category: service.category || '',
      duration: service.duration || '',
      available: service.available !== false,
    });
    setShowAddModal(true);
  };

  const handleSaveService = async () => {
    if (!formData.name.trim() || !formData.price) {
      Alert.alert('Required', 'Please fill in name and price');
      return;
    }

    try {
      setProcessing(true);
      const serviceData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category.trim(),
        duration: formData.duration.trim(),
        available: formData.available,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      };

      if (editingService) {
        await updateDoc(doc(db, 'services', editingService.id), serviceData);
        Alert.alert('Success', 'Service updated successfully');
      } else {
        await addDoc(collection(db, 'services'), {
          ...serviceData,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        });
        Alert.alert('Success', 'Service added successfully');
      }

      setShowAddModal(false);
      loadServices();
    } catch (error) {
      console.error('Error saving service:', error);
      Alert.alert('Error', 'Failed to save service');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteService = (service) => {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete "${service.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'services', service.id));
              Alert.alert('Success', 'Service deleted successfully');
              loadServices();
            } catch (error) {
              console.error('Error deleting service:', error);
              Alert.alert('Error', 'Failed to delete service');
            }
          },
        },
      ]
    );
  };

  const renderServiceItem = ({ item }) => (
    <View style={[styles.serviceCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={styles.serviceInfo}>
        <View style={styles.serviceHeader}>
          <Text style={[styles.serviceName, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.servicePrice, { color: theme.primary }]}>${item.price}</Text>
        </View>
        {item.description && (
          <Text style={[styles.serviceDescription, { color: theme.subtext }]}>{item.description}</Text>
        )}
        <View style={styles.serviceMeta}>
          {item.category && (
            <View style={[styles.metaBadge, { backgroundColor: theme.primary + '20' }]}>
              <Text style={[styles.metaText, { color: theme.primary }]}>{item.category}</Text>
            </View>
          )}
          {item.duration && (
            <View style={[styles.metaBadge, { backgroundColor: theme.subtext + '20' }]}>
              <Text style={[styles.metaText, { color: theme.subtext }]}>{item.duration}</Text>
            </View>
          )}
          <View style={[styles.metaBadge, { backgroundColor: item.available ? '#34C75920' : '#FF3B3020' }]}>
            <Text style={[styles.metaText, { color: item.available ? '#34C759' : '#FF3B30' }]}>
              {item.available ? 'Available' : 'Unavailable'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.serviceActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary + '20' }]}
          onPress={() => handleEditService(item)}
        >
          <Ionicons name="pencil" size={20} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF3B3020' }]}
          onPress={() => handleDeleteService(item)}
        >
          <Ionicons name="trash" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!canAccess) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Service Management</Text>
        <TouchableOpacity onPress={handleAddService} style={styles.addButton}>
          <Ionicons name="add" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          renderItem={renderServiceItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="business-outline"
              title="No services"
              message="Add your first service to get started"
              actionLabel="Add Service"
              onAction={handleAddService}
            />
          }
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {editingService ? 'Edit Service' : 'Add Service'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Service Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="e.g., Live DJ"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Service description"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, { color: theme.text }]}>Price ($) *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                    value={formData.price}
                    onChangeText={(text) => setFormData({ ...formData, price: text })}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.label, { color: theme.text }]}>Category</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                    value={formData.category}
                    onChangeText={(text) => setFormData({ ...formData, category: text })}
                    placeholder="e.g., Entertainment"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Duration</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  value={formData.duration}
                  onChangeText={(text) => setFormData({ ...formData, duration: text })}
                  placeholder="e.g., 4 hours"
                />
              </View>

              <TouchableOpacity
                style={[styles.switchRow, { borderColor: theme.border }]}
                onPress={() => setFormData({ ...formData, available: !formData.available })}
              >
                <Text style={[styles.label, { color: theme.text }]}>Available</Text>
                <View style={[styles.switch, { backgroundColor: formData.available ? theme.primary : theme.border }]}>
                  <View style={[styles.switchThumb, { backgroundColor: '#fff' }]} />
                </View>
              </TouchableOpacity>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.border }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={handleSaveService}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>{editingService ? 'Update' : 'Add'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  serviceCard: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  serviceDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  serviceMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  serviceActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 16,
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
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
  },
  label: {
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignSelf: 'flex-end',
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















