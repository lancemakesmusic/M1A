/**
 * Admin Messaging Screen
 * Message any user, send announcements
 */

import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
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

export default function AdminMessagingScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isAdminEmail } = useRole();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [isAnnouncement, setIsAnnouncement] = useState(false);

  const canAccess = isAdminEmail && user?.email === 'admin@merkabaent.com';

  useEffect(() => {
    if (!canAccess) {
      Alert.alert('Access Denied', 'Only admin@merkabaent.com can access this screen');
      navigation.goBack();
      return;
    }
    loadUsers();
  }, [user, canAccess]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsers();
  }, [loadUsers]);

  const handleMessageUser = (targetUser) => {
    setSelectedUser(targetUser);
    setMessageText('');
    setIsAnnouncement(false);
    setShowMessageModal(true);
  };

  const handleSendAnnouncement = () => {
    setSelectedUser(null);
    setMessageText('');
    setIsAnnouncement(true);
    setShowMessageModal(true);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      Alert.alert('Required', 'Please enter a message');
      return;
    }

    try {
      setSending(true);
      const messageData = {
        from: user.uid,
        fromEmail: user.email,
        fromName: 'Admin',
        message: messageText.trim(),
        isAnnouncement,
        timestamp: serverTimestamp(),
        read: false,
      };

      if (isAnnouncement) {
        // Send to all users
        for (const targetUser of users) {
          await addDoc(collection(db, 'messages'), {
            ...messageData,
            to: targetUser.id,
            toEmail: targetUser.email,
          });
        }
        Alert.alert('Success', `Announcement sent to ${users.length} users`);
      } else if (selectedUser) {
        // Send to specific user
        await addDoc(collection(db, 'messages'), {
          ...messageData,
          to: selectedUser.id,
          toEmail: selectedUser.email,
        });
        Alert.alert('Success', `Message sent to ${selectedUser.displayName || selectedUser.email}`);
      }

      setShowMessageModal(false);
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.userCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={() => handleMessageUser(item)}
    >
      <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
        <Ionicons name="person" size={24} color={theme.primary} />
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: theme.text }]}>
          {item.displayName || item.email || 'Unknown User'}
        </Text>
        <Text style={[styles.userEmail, { color: theme.subtext }]}>{item.email}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.subtext} />
    </TouchableOpacity>
  );

  if (!canAccess) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>User Messaging</Text>
        <TouchableOpacity onPress={handleSendAnnouncement} style={styles.announceButton}>
          <Ionicons name="megaphone" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.announcementBanner, { backgroundColor: theme.primary + '10', borderColor: theme.primary }]}>
        <Ionicons name="megaphone" size={20} color={theme.primary} />
        <Text style={[styles.announcementText, { color: theme.text }]}>
          Send announcements to all users or message individuals
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No users"
              message="No users found in the system"
            />
          }
        />
      )}

      {/* Message Modal */}
      <Modal visible={showMessageModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {isAnnouncement ? 'Send Announcement' : `Message ${selectedUser?.displayName || selectedUser?.email}`}
              </Text>
              <TouchableOpacity onPress={() => setShowMessageModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <TextInput
                style={[styles.messageInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={messageText}
                onChangeText={setMessageText}
                placeholder={isAnnouncement ? 'Enter announcement message...' : 'Enter message...'}
                placeholderTextColor={theme.subtext}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
              {isAnnouncement && (
                <View style={[styles.warningBox, { backgroundColor: '#FF950020', borderColor: '#FF9500' }]}>
                  <Ionicons name="warning" size={20} color="#FF9500" />
                  <Text style={[styles.warningText, { color: theme.text }]}>
                    This will be sent to all {users.length} users
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.border }]}
                onPress={() => setShowMessageModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={handleSendMessage}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>Send</Text>
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
  announceButton: {
    padding: 8,
  },
  announcementBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  announcementText: {
    flex: 1,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  userCard: {
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
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
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
  messageInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 150,
    marginBottom: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
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















