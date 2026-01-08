/**
 * User Profile View Screen
 * View other users' profiles, message them, and send inquiries
 * Fiverr-style profile view for marketplace functionality
 */

import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { blockUser, db, followUser, getFollowers, getFollowing, isBlocked, isFirebaseReady, isFollowing, isMuted, muteUser, reportUser, trackProfileView, unfollowUser, unmuteUser } from '../firebase';
import useScreenTracking from '../hooks/useScreenTracking';
import { trackButtonClick } from '../services/AnalyticsService';
import { logError } from '../utils/logger';
import { getAvatarSource, getCoverSource, getImageKey, hasAvatar, hasCover } from '../utils/photoUtils';
import M1ALogo from '../components/M1ALogo';

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
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [isBlockedUser, setIsBlockedUser] = useState(false);
  const [isMutedUser, setIsMutedUser] = useState(false);
  const [updatingFollow, setUpdatingFollow] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });

  useEffect(() => {
    if (userId && !userData) {
      loadUserProfile();
    }
  }, [userId]);

  // Track profile view when profile loads
  useEffect(() => {
    if (user?.id && currentUser?.uid && user.id !== currentUser.uid) {
      trackProfileView(user.id).catch(error => {
        logError('Error tracking profile view:', error);
      });
    }
  }, [user?.id, currentUser?.uid]);

  useEffect(() => {
    if (user?.id && currentUser?.uid) {
      checkUserStatus();
      loadStats();
    }
  }, [user?.id, currentUser?.uid]);

  const checkUserStatus = async () => {
    if (!user?.id || !currentUser?.uid || user.id === currentUser.uid) return;
    
    try {
      const [following, blocked, muted] = await Promise.all([
        isFollowing(user.id),
        isBlocked(user.id),
        isMuted(user.id),
      ]);
      setIsFollowingUser(following);
      setIsBlockedUser(blocked);
      setIsMutedUser(muted);
    } catch (error) {
      logError('Error checking user status:', error);
    }
  };

  const loadStats = async () => {
    if (!user?.id) return;
    try {
      const [followers, following] = await Promise.all([
        getFollowers(user.id, 1).then(list => list.length),
        getFollowing(user.id, 1).then(list => list.length),
      ]);
      // Get posts count would require a query, but for now we'll skip it
      setStats({ followers, following, posts: 0 });
    } catch (error) {
      logError('Error loading stats:', error);
    }
  };

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
      } else {
        throw new Error('Firestore not ready');
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
      } else {
        throw new Error('Firestore not ready');
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
      } else {
        throw new Error('Firestore not ready');
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
            {hasCover(user) ? (
              <Image 
                source={getCoverSource(user)}
                style={styles.coverPhoto}
                key={getImageKey(user, 'cover')}
              />
            ) : (
              <View style={[styles.coverPhoto, { backgroundColor: theme.primary + '20' }]} />
            )}
          </View>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              {hasAvatar(user) ? (
                <Image 
                  source={getAvatarSource(user)}
                  style={styles.avatar}
                  key={getImageKey(user, 'avatar')}
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.cardBackground, justifyContent: 'center', alignItems: 'center' }]}>
                  <M1ALogo size={styles.avatar.width || 120} variant="icon" color={theme.primary} />
                </View>
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
          {currentUser?.uid && user?.id && currentUser.uid !== user.id && (
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  borderColor: theme.primary,
                  backgroundColor: isFollowingUser ? theme.primary : 'transparent',
                }
              ]}
              onPress={async () => {
                if (updatingFollow) return;
                setUpdatingFollow(true);
                try {
                  if (isFollowingUser) {
                    await unfollowUser(user.id);
                    setIsFollowingUser(false);
                    await loadStats(); // Refresh stats
                    trackButtonClick('unfollow_user', 'UserProfileViewScreen');
                  } else {
                    await followUser(user.id);
                    setIsFollowingUser(true);
                    await loadStats(); // Refresh stats
                    trackButtonClick('follow_user', 'UserProfileViewScreen');
                  }
                } catch (error) {
                  logError('Error toggling follow:', error);
                  Alert.alert('Error', 'Failed to update follow status. Please try again.');
                } finally {
                  setUpdatingFollow(false);
                }
              }}
              disabled={updatingFollow}
            >
              {updatingFollow ? (
                <ActivityIndicator size="small" color={isFollowingUser ? "#fff" : theme.primary} />
              ) : (
                <>
                  <Ionicons 
                    name={isFollowingUser ? "checkmark" : "add"} 
                    size={20} 
                    color={isFollowingUser ? "#fff" : theme.primary} 
                  />
                  <Text style={[
                    styles.secondaryButtonText,
                    { color: isFollowingUser ? "#fff" : theme.primary }
                  ]}>
                    {isFollowingUser ? 'Following' : 'Follow'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
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

      {/* More Menu Modal */}
      <Modal
        visible={showMoreMenu}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMoreMenu(false)}
        >
          <View style={[styles.moreMenuContent, { backgroundColor: theme.cardBackground }]}>
            <TouchableOpacity
              style={[styles.moreMenuItem, { borderBottomColor: theme.border }]}
              onPress={async () => {
                setShowMoreMenu(false);
                try {
                  if (isMutedUser) {
                    await unmuteUser(user.id);
                    setIsMutedUser(false);
                    Alert.alert('Success', 'User unmuted');
                  } else {
                    await muteUser(user.id);
                    setIsMutedUser(true);
                    Alert.alert('Success', 'User muted. Their posts will be hidden from your feed.');
                  }
                } catch (error) {
                  logError('Error toggling mute:', error);
                  Alert.alert('Error', 'Failed to update mute status');
                }
              }}
            >
              <Ionicons 
                name={isMutedUser ? "volume-high" : "volume-mute"} 
                size={24} 
                color={theme.text} 
              />
              <Text style={[styles.moreMenuText, { color: theme.text }]}>
                {isMutedUser ? 'Unmute User' : 'Mute User'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.moreMenuItem, { borderBottomColor: theme.border }]}
              onPress={async () => {
                setShowMoreMenu(false);
                Alert.alert(
                  'Block User',
                  `Are you sure you want to block ${user.displayName || user.username}? You won't be able to see their posts or send them messages.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Block',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await blockUser(user.id);
                          setIsBlockedUser(true);
                          setIsFollowingUser(false);
                          Alert.alert('Success', 'User blocked');
                        } catch (error) {
                          logError('Error blocking user:', error);
                          Alert.alert('Error', 'Failed to block user');
                        }
                      }
                    }
                  ]
                );
              }}
            >
              <Ionicons name="ban" size={24} color="#ff4444" />
              <Text style={[styles.moreMenuText, { color: '#ff4444' }]}>Block User</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.moreMenuItem}
              onPress={() => {
                setShowMoreMenu(false);
                Alert.prompt(
                  'Report User',
                  'Please select a reason for reporting this user:',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Report',
                      style: 'destructive',
                      onPress: async (reason) => {
                        if (!reason) return;
                        try {
                          await reportUser(user.id, reason);
                          Alert.alert('Success', 'Thank you for your report. We will review it shortly.');
                        } catch (error) {
                          logError('Error reporting user:', error);
                          Alert.alert('Error', 'Failed to submit report');
                        }
                      }
                    }
                  ],
                  'plain-text',
                  '',
                  'default',
                  ['Spam', 'Harassment', 'Inappropriate Content', 'Impersonation', 'Other']
                );
              }}
            >
              <Ionicons name="flag" size={24} color="#ff9500" />
              <Text style={[styles.moreMenuText, { color: '#ff9500' }]}>Report User</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.moreMenuItem, styles.moreMenuCancel]}
              onPress={() => setShowMoreMenu(false)}
            >
              <Text style={[styles.moreMenuCancelText, { color: theme.subtext }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  moreButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  moreMenuContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    gap: 16,
  },
  moreMenuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  moreMenuCancel: {
    borderBottomWidth: 0,
    justifyContent: 'center',
  },
  moreMenuCancelText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
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

