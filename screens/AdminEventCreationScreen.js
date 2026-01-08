/**
 * Admin Event Creation Screen
 * Full control over creating public events with tickets, pricing, photos, discounts
 */

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, doc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { db, storage } from '../firebase';

export default function AdminEventCreationScreen({ navigation, route }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isAdminEmail } = useRole();
  const insets = useSafeAreaInsets();
  const editingEvent = route?.params?.event;

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: editingEvent?.title || '',
    description: editingEvent?.description || '',
    photo: editingEvent?.photo || null,
    photoUrl: editingEvent?.photoUrl || null,
    startDate: editingEvent?.startDate?.toDate ? editingEvent.startDate.toDate() : (editingEvent?.startDate || new Date()),
    endDate: editingEvent?.endDate?.toDate ? editingEvent.endDate.toDate() : (editingEvent?.endDate || new Date()),
    startTime: editingEvent?.startTime || new Date(),
    endTime: editingEvent?.endTime || new Date(),
    location: editingEvent?.location || '',
    ticketPrice: editingEvent?.ticketPrice?.toString() || '',
    earlyBirdPrice: editingEvent?.earlyBirdPrice?.toString() || '',
    earlyBirdEndDate: editingEvent?.earlyBirdEndDate?.toDate ? editingEvent.earlyBirdEndDate.toDate() : (editingEvent?.earlyBirdEndDate || new Date()),
    vipPrice: editingEvent?.vipPrice?.toString() || '',
    capacity: editingEvent?.capacity?.toString() || '',
    isPublic: editingEvent?.isPublic !== false,
    ticketsEnabled: editingEvent?.ticketsEnabled !== false,
    discountEnabled: editingEvent?.discountEnabled || false,
    discountPercent: editingEvent?.discountPercent?.toString() || '',
    discountCode: editingEvent?.discountCode || '',
    category: editingEvent?.category || 'performance',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('start'); // 'start', 'end', 'earlyBird'
  const [timePickerMode, setTimePickerMode] = useState('start'); // 'start', 'end'

  const canAccess = isAdminEmail && user?.email === 'admin@merkabaent.com';

  const eventCategories = [
    { id: 'performance', label: 'Performance', icon: 'musical-notes', color: '#007AFF' },
    { id: 'party', label: 'Party', icon: 'gift', color: '#FF9500' },
    { id: 'corporate', label: 'Corporate', icon: 'business', color: '#34C759' },
    { id: 'wedding', label: 'Wedding', icon: 'heart', color: '#FF2D92' },
    { id: 'conference', label: 'Conference', icon: 'people', color: '#9C27B0' },
    { id: 'other', label: 'Other', icon: 'ellipse', color: '#8E8E93' },
  ];

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData({ ...formData, photo: result.assets[0] });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (uri) => {
    try {
      setUploadingImage(true);
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `events/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Required', 'Please enter an event title');
      return;
    }
    if (!formData.ticketPrice && formData.ticketsEnabled) {
      Alert.alert('Required', 'Please enter a ticket price');
      return;
    }
    if (formData.discountEnabled && !formData.discountCode) {
      Alert.alert('Required', 'Please enter a discount code');
      return;
    }

    try {
      setLoading(true);
      let photoUrl = formData.photoUrl;

      // Upload new photo if selected (make it optional - don't fail if upload fails)
      if (formData.photo && !formData.photoUrl) {
        try {
          photoUrl = await uploadImage(formData.photo.uri);
          console.log('✅ Image uploaded successfully:', photoUrl);
        } catch (imageError) {
          console.warn('⚠️ Image upload failed, continuing without image:', imageError);
          // Continue without image - photoUrl will remain null
          Alert.alert(
            'Image Upload Failed',
            'The event will be created without an image. You can add one later.',
            [{ text: 'Continue', style: 'default' }]
          );
        }
      }

      // Convert dates to Firestore Timestamps
      const startDateTimestamp = formData.startDate instanceof Date 
        ? Timestamp.fromDate(formData.startDate) 
        : formData.startDate;
      const endDateTimestamp = formData.endDate instanceof Date 
        ? Timestamp.fromDate(formData.endDate) 
        : formData.endDate;
      const startTimeTimestamp = formData.startTime instanceof Date 
        ? Timestamp.fromDate(formData.startTime) 
        : formData.startTime;
      const endTimeTimestamp = formData.endTime instanceof Date 
        ? Timestamp.fromDate(formData.endTime) 
        : formData.endTime;
      const earlyBirdEndDateTimestamp = formData.earlyBirdEndDate instanceof Date 
        ? Timestamp.fromDate(formData.earlyBirdEndDate) 
        : formData.earlyBirdEndDate;

      // Base event data
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim() || '',
        photoUrl: photoUrl || null,
        startDate: startDateTimestamp,
        endDate: endDateTimestamp,
        startTime: startTimeTimestamp,
        endTime: endTimeTimestamp,
        location: formData.location.trim() || '',
        ticketPrice: formData.ticketPrice ? parseFloat(formData.ticketPrice) : 0,
        earlyBirdPrice: formData.earlyBirdPrice ? parseFloat(formData.earlyBirdPrice) : null,
        earlyBirdEndDate: formData.earlyBirdPrice ? earlyBirdEndDateTimestamp : null,
        vipPrice: formData.vipPrice ? parseFloat(formData.vipPrice) : null,
        capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
        isPublic: formData.isPublic !== false, // Default to true
        ticketsEnabled: formData.ticketsEnabled !== false, // Default to true
        discountEnabled: formData.discountEnabled || false,
        discountPercent: formData.discountEnabled && formData.discountPercent ? parseFloat(formData.discountPercent) : null,
        discountCode: formData.discountEnabled ? formData.discountCode.trim().toUpperCase() : null,
        category: formData.category || 'performance',
        updatedAt: serverTimestamp(),
      };

      // Only add creation fields if creating new event
      if (!editingEvent) {
        eventData.createdBy = user.uid;
        eventData.createdAt = serverTimestamp();
        eventData.isAdminCreated = true;
      }

      console.log('📝 Saving event with data:', {
        ...eventData,
        startDate: startDateTimestamp,
        endDate: endDateTimestamp,
        isEditing: !!editingEvent,
      });

      // Determine collection name (use same collection as original event if editing)
      const collectionName = editingEvent?.collection || 'publicEvents';
      const eventId = editingEvent?.id;

      if (editingEvent && eventId) {
        // Update existing event
        await updateDoc(doc(db, collectionName, eventId), {
          ...eventData,
          updatedAt: serverTimestamp(),
        });
        console.log('✅ Event updated successfully');
        Alert.alert('Success', 'Event updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        // Create new event
        await addDoc(collection(db, collectionName), eventData);
        console.log('✅ Event created successfully');
        Alert.alert('Success', 'Event created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('❌ Error creating event:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      Alert.alert(
        'Error', 
        `Failed to create event: ${error.message || 'Unknown error'}\n\nCheck console for details.`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  if (!canAccess) {
    Alert.alert('Access Denied', 'Only admin@merkabaent.com can create events');
    navigation.goBack();
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {editingEvent ? 'Edit Event' : 'Create Public Event'}
          </Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text style={[styles.saveButtonText, { color: theme.primary }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Photo Upload */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Event Photo</Text>
            <TouchableOpacity
              style={[styles.photoButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={pickImage}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="large" color={theme.primary} />
              ) : formData.photo || formData.photoUrl ? (
                <Image
                  source={{ uri: formData.photo?.uri || formData.photoUrl }}
                  style={styles.photoPreview}
                />
              ) : (
                <>
                  <Ionicons name="camera" size={48} color={theme.primary} />
                  <Text style={[styles.photoButtonText, { color: theme.text }]}>Tap to add photo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Basic Information</Text>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Event Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Enter event title"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Description</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter event description"
                multiline
                numberOfLines={4}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Location</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                value={formData.location}
                onChangeText={(text) => setFormData({ ...formData, location: text })}
                placeholder="Event location"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {eventCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: formData.category === cat.id ? cat.color : theme.cardBackground,
                        borderColor: formData.category === cat.id ? cat.color : theme.border,
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, category: cat.id })}
                  >
                    <Ionicons name={cat.icon} size={20} color={formData.category === cat.id ? '#fff' : theme.text} />
                    <Text style={[styles.categoryText, { color: formData.category === cat.id ? '#fff' : theme.text }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Date & Time</Text>
            <View style={styles.dateTimeRow}>
              <View style={[styles.dateTimeGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: theme.text }]}>Start Date</Text>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                  onPress={() => {
                    setDatePickerMode('start');
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={[styles.dateText, { color: theme.text }]}>
                    {formData.startDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.dateTimeGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: theme.text }]}>Start Time</Text>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                  onPress={() => {
                    setTimePickerMode('start');
                    setShowTimePicker(true);
                  }}
                >
                  <Text style={[styles.dateText, { color: theme.text }]}>
                    {formData.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.dateTimeRow}>
              <View style={[styles.dateTimeGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: theme.text }]}>End Date</Text>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                  onPress={() => {
                    setDatePickerMode('end');
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={[styles.dateText, { color: theme.text }]}>
                    {formData.endDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.dateTimeGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: theme.text }]}>End Time</Text>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                  onPress={() => {
                    setTimePickerMode('end');
                    setShowTimePicker(true);
                  }}
                >
                  <Text style={[styles.dateText, { color: theme.text }]}>
                    {formData.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Ticket Pricing */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Enable Ticket Sales</Text>
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={formData.ticketsEnabled ? '#fff' : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => setFormData({ ...formData, ticketsEnabled: value })}
                value={formData.ticketsEnabled}
              />
            </View>
            {formData.ticketsEnabled && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Regular Ticket Price ($) *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                    value={formData.ticketPrice}
                    onChangeText={(text) => setFormData({ ...formData, ticketPrice: text })}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Early Bird Price ($) - Optional</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                    value={formData.earlyBirdPrice}
                    onChangeText={(text) => setFormData({ ...formData, earlyBirdPrice: text })}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                  {formData.earlyBirdPrice && (
                    <TouchableOpacity
                      style={[styles.dateButton, { backgroundColor: theme.cardBackground, borderColor: theme.border, marginTop: 8 }]}
                      onPress={() => {
                        setDatePickerMode('earlyBird');
                        setShowDatePicker(true);
                      }}
                    >
                      <Text style={[styles.dateText, { color: theme.text }]}>
                        Early Bird Ends: {formData.earlyBirdEndDate.toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>VIP Price ($) - Optional</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                    value={formData.vipPrice}
                    onChangeText={(text) => setFormData({ ...formData, vipPrice: text })}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Capacity (Max Tickets)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                    value={formData.capacity}
                    onChangeText={(text) => setFormData({ ...formData, capacity: text })}
                    placeholder="Unlimited"
                    keyboardType="number-pad"
                  />
                </View>
              </>
            )}
          </View>

          {/* Discounts */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Enable Discount</Text>
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={formData.discountEnabled ? '#fff' : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => setFormData({ ...formData, discountEnabled: value })}
                value={formData.discountEnabled}
              />
            </View>
            {formData.discountEnabled && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Discount Code *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                    value={formData.discountCode}
                    onChangeText={(text) => setFormData({ ...formData, discountCode: text.toUpperCase() })}
                    placeholder="SAVE20"
                    autoCapitalize="characters"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Discount Percentage (%)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                    value={formData.discountPercent}
                    onChangeText={(text) => setFormData({ ...formData, discountPercent: text })}
                    placeholder="20"
                    keyboardType="decimal-pad"
                  />
                </View>
              </>
            )}
          </View>

          {/* Visibility */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Public Event</Text>
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={formData.isPublic ? '#fff' : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => setFormData({ ...formData, isPublic: value })}
                value={formData.isPublic}
              />
            </View>
            <Text style={[styles.helpText, { color: theme.subtext }]}>
              Public events are visible to all users and can be purchased by anyone
            </Text>
          </View>
        </ScrollView>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={datePickerMode === 'start' ? formData.startDate : datePickerMode === 'end' ? formData.endDate : formData.earlyBirdEndDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                if (datePickerMode === 'start') {
                  setFormData({ ...formData, startDate: selectedDate });
                } else if (datePickerMode === 'end') {
                  setFormData({ ...formData, endDate: selectedDate });
                } else {
                  setFormData({ ...formData, earlyBirdEndDate: selectedDate });
                }
              }
            }}
          />
        )}

        {/* Time Picker */}
        {showTimePicker && (
          <DateTimePicker
            value={timePickerMode === 'start' ? formData.startTime : formData.endTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedTime) => {
              setShowTimePicker(false);
              if (selectedTime) {
                if (timePickerMode === 'start') {
                  setFormData({ ...formData, startTime: selectedTime });
                } else {
                  setFormData({ ...formData, endTime: selectedTime });
                }
              }
            }}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
  saveButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
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
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoButton: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  photoButtonText: {
    marginTop: 8,
    fontSize: 14,
  },
  categoryScroll: {
    marginTop: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 8,
    gap: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateTimeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dateTimeGroup: {
    flex: 1,
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  dateText: {
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  helpText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
});













