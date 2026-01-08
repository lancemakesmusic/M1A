/**
 * Admin Calendar Management Screen
 * Edit events, manage bookings, control availability
 */

import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
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
import EmptyState from '../components/EmptyState';

export default function AdminCalendarManagementScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isAdminEmail } = useRole();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const canAccess = isAdminEmail && user?.email === 'admin@merkabaent.com';

  useEffect(() => {
    if (!canAccess) {
      Alert.alert('Access Denied', 'Only admin@merkabaent.com can access this screen');
      navigation.goBack();
      return;
    }
    loadEvents();
  }, [user, canAccess]);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      // Load events from both 'events' and 'publicEvents' collections
      const [eventsSnapshot, publicEventsSnapshot] = await Promise.all([
        getDocs(collection(db, 'events')).catch(() => ({ size: 0, docs: [] })),
        getDocs(collection(db, 'publicEvents')).catch(() => ({ size: 0, docs: [] })),
      ]);

      // Combine events from both collections
      const eventsData = [
        ...eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          collection: 'events',
          ...doc.data(),
        })),
        ...publicEventsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            collection: 'publicEvents',
            // Ensure title field exists (publicEvents uses 'title', events uses 'name')
            title: data.title || data.name,
            name: data.name || data.title,
            ...data,
          };
        }),
      ];

      // Sort by date (most recent first)
      // Handle both eventDate (from events collection) and startDate (from publicEvents)
      eventsData.sort((a, b) => {
        const getDate = (item) => {
          if (item.startDate?.toDate) return item.startDate.toDate();
          if (item.startDate) return new Date(item.startDate);
          if (item.eventDate?.toDate) return item.eventDate.toDate();
          if (item.eventDate) return new Date(item.eventDate);
          return new Date(0);
        };
        const dateA = getDate(a);
        const dateB = getDate(b);
        return dateB - dateA;
      });

      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
      Alert.alert('Error', 'Failed to load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents();
  }, [loadEvents]);

  const handleEditEvent = (event) => {
    // Navigate to AdminEventCreation with event data for editing
    navigation.navigate('AdminEventCreation', { 
      event: {
        ...event,
        // Ensure dates are properly formatted
        startDate: event.startDate,
        endDate: event.endDate,
        startTime: event.startTime || event.startDate,
        endTime: event.endTime || event.endDate,
      }
    });
  };

  const handleDeleteEvent = (event) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title || event.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from the correct collection
              const collectionName = event.collection || 'events';
              await deleteDoc(doc(db, collectionName, event.id));
              Alert.alert('Success', 'Event deleted successfully');
              loadEvents();
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  const handleToggleAvailability = async (event) => {
    try {
      // Update in the correct collection
      const collectionName = event.collection || 'events';
      await updateDoc(doc(db, collectionName, event.id), {
        available: !event.available,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      loadEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Error', 'Failed to update event');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      if (isNaN(d.getTime())) return 'Invalid date';
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.warn('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const renderEventItem = ({ item }) => (
    <View style={[styles.eventCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={styles.eventInfo}>
        <View style={styles.eventHeader}>
          <Text style={[styles.eventTitle, { color: theme.text }]}>{item.title || item.name || 'Untitled Event'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: item.available ? '#34C75920' : '#FF3B3020' }]}>
            <Text style={[styles.statusText, { color: item.available ? '#34C759' : '#FF3B30' }]}>
              {item.available ? 'Available' : 'Unavailable'}
            </Text>
          </View>
        </View>
        {item.description && (
          <Text style={[styles.eventDescription, { color: theme.subtext }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.eventMeta}>
          {(item.startDate || item.eventDate) && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar" size={16} color={theme.subtext} />
              <Text style={[styles.metaText, { color: theme.subtext }]}>
                {formatDate(item.startDate || item.eventDate)}
              </Text>
            </View>
          )}
          {item.userEmail && (
            <View style={styles.metaItem}>
              <Ionicons name="person" size={16} color={theme.subtext} />
              <Text style={[styles.metaText, { color: theme.subtext }]}>{item.userEmail}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.eventActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary + '20' }]}
          onPress={() => handleEditEvent(item)}
        >
          <Ionicons name="pencil" size={20} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: item.available ? '#FF950020' : '#34C75920' }]}
          onPress={() => handleToggleAvailability(item)}
        >
          <Ionicons name={item.available ? 'eye-off' : 'eye'} size={20} color={item.available ? '#FF9500' : '#34C759'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF3B3020' }]}
          onPress={() => handleDeleteEvent(item)}
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Calendar Management</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AdminEventCreation')} style={styles.addButton}>
          <Ionicons name="add" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEventItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="No events"
              message="No events scheduled yet"
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
  eventCard: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  eventInfo: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  eventMeta: {
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  eventActions: {
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
});

