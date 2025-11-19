/**
 * User Profile View Screen
 * View other users' profiles, message them, and send inquiries
 * Fiverr-style profile view for marketplace functionality
 */

import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { db, isFirebaseReady } from '../firebase';
import useScreenTracking from '../hooks/useScreenTracking';
import { trackButtonClick, trackFeatureUsage } from '../services/AnalyticsService';

export default function UserProfileViewScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  useScreenTracking('UserProfileViewScreen');

  const { userId, user: userData, showInquiry } = route.params || {};
  const [user, setUser] = useState(userData || null);
  const [loading, setLoading] = useState(!userData);
  const [showInquiryModal, setShowInquiryModal] = useState(showInquiry || false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [inquiryData, setInquiryData] = useState({
    subject: '',
    message: '',
    budget: '',
    timeline: '',
  });
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    if (userId && !userData) {
      loadUserProfile();
    }
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        // Real Firestore
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser({ id: userSnap.id, ...userSnap.data() });
        }
      } else if (db && typeof db.collection === 'function') {
        // Mock Firestore
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          setUser({ id: userDoc.id, ...userDoc.data() });
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      Alert.alert('Empty Message', 'Please enter a message.');
      return;
    }

    try {
      trackButtonClick('send_message', 'UserProfileViewScreen');
      
      // Create or get conversation
      const conversationId = `${currentUser.uid}_${user.id}`.split('_').sort().join('_');
      
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        // Real Firestore
        const messagesRef = collection(db, 'conversations', conversationId, 'messages');
        await addDoc(messagesRef, {
          text: messageText.trim(),
          senderId: currentUser.uid,
          receiverId: user.id,
          createdAt: serverTimestamp(),
        });
      } else if (db && typeof db.collection === 'function') {
        // Mock Firestore
        await db.collection('conversations').doc(conversationId).collection('messages').add({
          text: messageText.trim(),
          senderId: currentUser.uid,
          receiverId: user.id,
          createdAt: new Date(),
        });
      }

      Alert.alert('Message Sent', 'Your message has been sent successfully.');
      setShowMessageModal(false);
      setMessageText('');
      navigation.navigate('Messages');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleSendInquiry = async () => {
    if (!inquiryData.subject || !inquiryData.message) {
      Alert.alert('Missing Information', 'Please fill in subject and message.');
      return;
    }

    try {
      trackButtonClick('send_inquiry', 'UserProfileViewScreen');
      
      const inquiryPayload = {
        fromUserId: currentUser.uid,
        fromUserName: currentUser.displayName || currentUser.email,
        toUserId: user.id,
        toUserName: user.displayName,
        subject: inquiryData.subject,
        message: inquiryData.message,
        budget: inquiryData.budget || 'Not specified',
        timeline: inquiryData.timeline || 'Not specified',
        status: 'pending',
        createdAt: new Date(),
      };

      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        // Real Firestore
        await addDoc(collection(db, 'inquiries'), {
          ...inquiryPayload,
          createdAt: serverTimestamp(),
        });
      } else if (db && typeof db.collection === 'function') {
        // Mock Firestore
        await db.collection('inquiries').add(inquiryPayload);
      }

      Alert.alert(
        'Inquiry Sent!',
        'Your inquiry has been sent. The user will be notified and can respond to you.',
        [{ text: 'OK', onPress: () => {
          setShowInquiryModal(false);
          setInquiryData({ subject: '', message: '', budget: '', timeline: '' });
        }}]
      );
    } catch (error) {
      console.error('Error sending inquiry:', error);
      Alert.alert('Error', 'Failed to send inquiry. Please try again.');
    }
  };

  const openSocial = async (url) => {
    const safeUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const canOpen = await Linking.canOpenURL(safeUrl);
    if (!canOpen) return Alert.alert('Invalid link', 'This link cannot be opened.');
    await Linking.openURL(safeUrl);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.subtext }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.error || '#FF3B30'} />
          <Text style={[styles.errorText, { color: theme.text }]}>User not found</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const normalizedSocials = useMemo(() => {
    if (!user.socials || typeof user.socials !== 'object') return [];
    return Object.entries(user.socials).filter(
      ([, v]) => typeof v === 'string' && v.trim().length > 0
    );
  }, [user]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          {/* Cover Photo */}
          <View style={styles.coverPhotoContainer}>
            {user.coverUrl ? (
              <Image 
                source={{ uri: `${user.coverUrl}?t=${user.coverUpdatedAt || Date.now()}` }} 
                style={styles.coverPhoto}
                key={`cover-${user.coverUrl}-${user.coverUpdatedAt || ''}`}
              />
            ) : (
              <View style={[styles.coverPhoto, { backgroundColor: theme.primary + '20' }]} />
            )}
          </View>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              {user.avatarUrl || user.photoURL ? (
                <Image 
                  source={{ uri: `${user.avatarUrl || user.photoURL}?t=${user.photoUpdatedAt || Date.now()}` }} 
                  style={styles.avatar}
                  key={`avatar-${user.avatarUrl || user.photoURL}-${user.photoUpdatedAt || ''}`}
                />
              ) : (
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face' }}
                  style={styles.avatar}
                />
              )}
              {user.isOnline && (
                <View style={[styles.onlineBadge, { backgroundColor: '#34C759' }]} />
              )}
              {user.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                </View>
              )}
            </View>
            <View style={styles.nameRow}>
              <Text style={[styles.displayName, { color: theme.text }]}>{user.displayName}</Text>
            </View>
            <Text style={[styles.username, { color: theme.subtext }]}>{user.username}</Text>
            
            {/* Persona Badge */}
            {user.personaTitle && (
              <View style={[styles.personaBadge, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.personaText, { color: theme.primary }]}>
                  {user.personaTitle}
                </Text>
              </View>
            )}

            {/* Rating */}
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={18} color="#FFD700" />
              <Text style={[styles.rating, { color: theme.text }]}>
                {user.rating || 4.5} ({user.reviews || 0} reviews)
              </Text>
            </View>

            {/* Location */}
            {user.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color={theme.subtext} />
                <Text style={[styles.location, { color: theme.subtext }]}>{user.location}</Text>
              </View>
            )}

            {/* Price Range */}
            {user.priceRange && (
              <View style={styles.priceRow}>
                <Ionicons name="cash-outline" size={16} color={theme.primary} />
                <Text style={[styles.priceRange, { color: theme.primary }]}>
                  {user.priceRange}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              setShowMessageModal(true);
              trackButtonClick('open_message_modal', 'UserProfileViewScreen');
            }}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.primary }]}
            onPress={() => {
              setShowInquiryModal(true);
              trackButtonClick('open_inquiry_modal', 'UserProfileViewScreen');
            }}
          >
            <Ionicons name="briefcase-outline" size={20} color={theme.primary} />
            <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>Send Inquiry</Text>
          </TouchableOpacity>
        </View>

        {/* Bio */}
        {user.bio && (
          <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
            <Text style={[styles.bio, { color: theme.subtext }]}>{user.bio}</Text>
          </View>
        )}

        {/* Services */}
        {user.services && user.services.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Services</Text>
            <View style={styles.servicesGrid}>
              {user.services.map((service, index) => (
                <View key={index} style={[styles.serviceCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                  <Text style={[styles.serviceName, { color: theme.text }]}>{service}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Social Links */}
        {normalizedSocials.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Social Links</Text>
            <View style={styles.socialLinks}>
              {normalizedSocials.map(([platform, url]) => (
                <TouchableOpacity
                  key={platform}
                  style={[styles.socialLink, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={() => openSocial(url)}
                >
                  <Ionicons name={`logo-${platform}`} size={20} color={theme.primary} />
                  <Text style={[styles.socialLinkText, { color: theme.text }]}>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Message Modal */}
      <Modal
        visible={showMessageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Send Message</Text>
              <TouchableOpacity onPress={() => setShowMessageModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.modalLabel, { color: theme.text }]}>To: {user.displayName}</Text>
              <TextInput
                style={[styles.messageInput, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
                placeholder="Type your message..."
                placeholderTextColor={theme.subtext}
                multiline
                numberOfLines={6}
                value={messageText}
                onChangeText={setMessageText}
              />
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: theme.primary }]}
                onPress={handleSendMessage}
              >
                <Text style={styles.sendButtonText}>Send Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Inquiry Modal */}
      <Modal
        visible={showInquiryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInquiryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Send Inquiry</Text>
              <TouchableOpacity onPress={() => setShowInquiryModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalLabel, { color: theme.text }]}>To: {user.displayName}</Text>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Subject *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
                  placeholder="e.g., Need photography for wedding"
                  placeholderTextColor={theme.subtext}
                  value={inquiryData.subject}
                  onChangeText={(text) => setInquiryData({ ...inquiryData, subject: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Message *</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
                  placeholder="Describe your project or request..."
                  placeholderTextColor={theme.subtext}
                  multiline
                  numberOfLines={6}
                  value={inquiryData.message}
                  onChangeText={(text) => setInquiryData({ ...inquiryData, message: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Budget (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
                  placeholder="e.g., $500-$1000"
                  placeholderTextColor={theme.subtext}
                  value={inquiryData.budget}
                  onChangeText={(text) => setInquiryData({ ...inquiryData, budget: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Timeline (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
                  placeholder="e.g., Within 2 weeks"
                  placeholderTextColor={theme.subtext}
                  value={inquiryData.timeline}
                  onChangeText={(text) => setInquiryData({ ...inquiryData, timeline: text })}
                />
              </View>

              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: theme.primary }]}
                onPress={handleSendInquiry}
              >
                <Text style={styles.sendButtonText}>Send Inquiry</Text>
              </TouchableOpacity>
            </ScrollView>
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
  scrollView: {
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  coverPhotoContainer: {
    position: 'relative',
    height: 120,
    width: '100%',
    marginBottom: -40,
  },
  coverPhoto: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  profileHeader: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E5E5',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  profileInfo: {
    alignItems: 'center',
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  username: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  personaBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  personaText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  rating: {
    fontSize: 16,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  location: {
    fontSize: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  priceRange: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
  },
  servicesGrid: {
    gap: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '500',
  },
  socialLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  socialLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  socialLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  sendButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

