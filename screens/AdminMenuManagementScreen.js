/**
 * Admin Menu Management Screen
 * Edit bar menu, update prices, manage items
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

export default function AdminMenuManagementScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isAdminEmail } = useRole();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
    available: true,
    popular: false,
  });

  const canAccess = isAdminEmail && user?.email === 'admin@merkabaent.com';

  useEffect(() => {
    if (!canAccess) {
      Alert.alert('Access Denied', 'Only admin@merkabaent.com can access this screen');
      navigation.goBack();
      return;
    }
    loadMenuItems();
  }, [user, canAccess]);

  const loadMenuItems = useCallback(async () => {
    try {
      setLoading(true);
      // Try to load from Firestore 'menuItems' collection
      // If it doesn't exist, we'll work with the fallback items
      try {
        const menuSnapshot = await getDocs(collection(db, 'menuItems'));
        if (!menuSnapshot.empty) {
          const itemsData = menuSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          setMenuItems(itemsData);
        } else {
          // If no items in Firestore, use empty array (admin can add items)
          setMenuItems([]);
        }
      } catch (error) {
        console.log('Menu items collection may not exist yet:', error);
        setMenuItems([]);
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
      Alert.alert('Error', 'Failed to load menu items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMenuItems();
  }, [loadMenuItems]);

  const handleAddItem = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      image: '',
      available: true,
      popular: false,
    });
    setShowAddModal(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      price: item.price?.toString() || '',
      category: item.category || '',
      image: item.image || '',
      available: item.available !== false,
      popular: item.popular || false,
    });
    setShowAddModal(true);
  };

  const handleSaveItem = async () => {
    if (!formData.name.trim() || !formData.price) {
      Alert.alert('Required', 'Please fill in name and price');
      return;
    }

    try {
      setProcessing(true);
      const itemData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category.trim() || 'Other',
        image: formData.image.trim(),
        available: formData.available,
        popular: formData.popular,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      };

      if (editingItem) {
        await updateDoc(doc(db, 'menuItems', editingItem.id), itemData);
        Alert.alert('Success', 'Menu item updated successfully');
      } else {
        await addDoc(collection(db, 'menuItems'), {
          ...itemData,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        });
        Alert.alert('Success', 'Menu item added successfully');
      }

      setShowAddModal(false);
      loadMenuItems();
    } catch (error) {
      console.error('Error saving menu item:', error);
      Alert.alert('Error', 'Failed to save menu item');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteItem = (item) => {
    Alert.alert(
      'Delete Menu Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'menuItems', item.id));
              Alert.alert('Success', 'Menu item deleted successfully');
              loadMenuItems();
            } catch (error) {
              console.error('Error deleting menu item:', error);
              Alert.alert('Error', 'Failed to delete menu item');
            }
          },
        },
      ]
    );
  };

  const categories = ['Mixed Drinks', 'Spirits', 'Wells', 'Beer', 'Mixers', 'Other'];

  const renderMenuItem = ({ item }) => (
    <View style={[styles.itemCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.itemPrice, { color: theme.primary }]}>${item.price}</Text>
        </View>
        {item.description && (
          <Text style={[styles.itemDescription, { color: theme.subtext }]}>{item.description}</Text>
        )}
        <View style={styles.itemMeta}>
          {item.category && (
            <View style={[styles.metaBadge, { backgroundColor: theme.primary + '20' }]}>
              <Text style={[styles.metaText, { color: theme.primary }]}>{item.category}</Text>
            </View>
          )}
          {item.popular && (
            <View style={[styles.metaBadge, { backgroundColor: '#FF950020' }]}>
              <Text style={[styles.metaText, { color: '#FF9500' }]}>Popular</Text>
            </View>
          )}
          <View style={[styles.metaBadge, { backgroundColor: item.available ? '#34C75920' : '#FF3B3020' }]}>
            <Text style={[styles.metaText, { color: item.available ? '#34C759' : '#FF3B30' }]}>
              {item.available ? 'Available' : 'Unavailable'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary + '20' }]}
          onPress={() => handleEditItem(item)}
        >
          <Ionicons name="pencil" size={20} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF3B3020' }]}
          onPress={() => handleDeleteItem(item)}
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Menu Management</Text>
        <TouchableOpacity onPress={handleAddItem} style={styles.addButton}>
          <Ionicons name="add" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={menuItems}
          keyExtractor={(item) => item.id}
          renderItem={renderMenuItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="restaurant-outline"
              title="No menu items"
              message="Add your first menu item to get started"
              actionLabel="Add Item"
              onAction={handleAddItem}
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
                {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Item Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="e.g., Margarita"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Item description"
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
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryChip,
                          { backgroundColor: formData.category === cat ? theme.primary : theme.background, borderColor: theme.border },
                        ]}
                        onPress={() => setFormData({ ...formData, category: cat })}
                      >
                        <Text style={[styles.categoryText, { color: formData.category === cat ? '#fff' : theme.text }]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Image URL</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  value={formData.image}
                  onChangeText={(text) => setFormData({ ...formData, image: text })}
                  placeholder="https://..."
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: theme.text }]}>Available</Text>
                <TouchableOpacity
                  style={[styles.switch, { backgroundColor: formData.available ? theme.primary : theme.border }]}
                  onPress={() => setFormData({ ...formData, available: !formData.available })}
                >
                  <View style={[styles.switchThumb, { backgroundColor: '#fff' }]} />
                </TouchableOpacity>
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: theme.text }]}>Popular</Text>
                <TouchableOpacity
                  style={[styles.switch, { backgroundColor: formData.popular ? theme.primary : theme.border }]}
                  onPress={() => setFormData({ ...formData, popular: !formData.popular })}
                >
                  <View style={[styles.switchThumb, { backgroundColor: '#fff' }]} />
                </TouchableOpacity>
              </View>
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
                onPress={handleSaveItem}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>{editingItem ? 'Update' : 'Add'}</Text>
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
  itemCard: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  itemDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  itemMeta: {
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
  itemActions: {
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
  categoryScroll: {
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 16,
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


