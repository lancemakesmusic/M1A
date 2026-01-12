import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationPreferences } from '../contexts/NotificationPreferencesContext';
import { useTheme } from '../contexts/ThemeContext';
import { auth, db, isFirebaseReady, uploadImageAsync } from '../firebase';
import { sendMessageNotification } from '../services/NotificationService';
import { getAvatarUrl, hasAvatar, getAvatarSource } from '../utils/photoUtils';
import M1ALogo from '../components/M1ALogo';

// Default avatar fallback
const defaultAvatar = null; // Will use default icon if null

export default function MessagesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { preferences: notificationPrefs } = useNotificationPreferences();
  const insets = useSafeAreaInsets();
  
  // Check if we can go back (i.e., accessed from drawer)
  const canGoBack = navigation.canGoBack();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [text, setText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [messageSearchText, setMessageSearchText] = useState('');
  const [userSearchText, setUserSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const listRef = useRef(null);

  const createOrGetConversation = useCallback(
    async (targetUser) => {
      if (!user?.uid || !targetUser?.id) {
        return null;
      }

      const participantIds = [user.uid, targetUser.id].sort();
      const conversationId = participantIds.join('_');

      try {
        if (isFirebaseReady() && db && typeof db.collection !== 'function') {
          const conversationRef = doc(db, 'conversations', conversationId);
          const conversationSnap = await getDoc(conversationRef);

          if (!conversationSnap.exists()) {
            await setDoc(conversationRef, {
              participants: participantIds,
              participantProfiles: {
                [user.uid]: {
                  name: user.displayName || user.email || 'You',
                  avatar: getAvatarUrl(user) || null,
                },
                [targetUser.id]: {
                  name:
                    targetUser.displayName ||
                    targetUser.name ||
                    targetUser.username ||
                    'User',
                  avatar: targetUser.avatar || getAvatarUrl(targetUser) || null,
                },
              },
              createdAt: serverTimestamp(),
              lastMessage: '',
              lastMessageAt: serverTimestamp(),
              unreadCount: {
                [user.uid]: 0,
                [targetUser.id]: 0,
              },
            });
          }
        }
      } catch (error) {
        console.error('createOrGetConversation error:', error);
      }

      return conversationId;
    },
    [db, user]
  );

  const loadMessages = useCallback(
    async (conversationId) => {
      if (
        !conversationId ||
        !isFirebaseReady() ||
        !db ||
        typeof db.collection === 'function'
      ) {
        setMessages([]);
        return;
      }

      setMessagesLoading(true);
      try {
        const messagesQuery = query(
          collection(db, 'conversations', conversationId, 'messages'),
          orderBy('createdAt', 'asc'),
          limit(200)
        );
        const snapshot = await getDocs(messagesQuery);
        const messagesData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            text: data.text || '',
            imageUrl: data.imageUrl || null,
            attachmentType: data.attachmentType || null,
            attachmentName: data.attachmentName || null,
            senderId: data.senderId,
            timestamp: data.createdAt?.toDate() || new Date(),
            isSent: data.senderId === user?.uid,
          };
        });
        setMessages(messagesData);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setMessagesLoading(false);
      }
    },
    [db, user?.uid]
  );

  const openConversationFromParams = useCallback(
    async (params) => {
      if (!params?.conversationId) {
        return;
      }

      let participantId = params.userId;
      let displayName = params.userName;
      let avatarSource = params.avatar || defaultAvatar;
      let isOnline = params.isOnline || false;

      try {
        if (isFirebaseReady() && db && typeof db.collection !== 'function') {
          const conversationRef = doc(db, 'conversations', params.conversationId);
          const conversationSnap = await getDoc(conversationRef);

          if (conversationSnap.exists()) {
            const data = conversationSnap.data();
            participantId =
              data.participants?.find((id) => id !== user?.uid) || participantId;

            if (participantId) {
              const otherUserRef = doc(db, 'users', participantId);
              const otherUserSnap = await getDoc(otherUserRef);
              if (otherUserSnap.exists()) {
                const otherUserData = { id: otherUserSnap.id, ...otherUserSnap.data() };
                displayName =
                  otherUserData.displayName ||
                  otherUserData.name ||
                  displayName ||
                  'User';
                avatarSource = getAvatarUrl(otherUserData) || avatarSource || defaultAvatar;
                isOnline = otherUserData.isOnline || isOnline;
              }
            }
          }
        }
      } catch (error) {
        console.error('openConversationFromParams error:', error);
      }

      setMessages([]);
      const conversation = {
        id: params.conversationId,
        name: displayName || 'User',
        avatar: avatarSource || defaultAvatar,
        isOnline,
        participantId,
      };
      setSelectedConversation(conversation);
      
      // Load messages for this conversation
      if (params.conversationId) {
        loadMessages(params.conversationId);
      }
    },
    [db, user?.uid, loadMessages]
  );

  const handleConversationSelect = useCallback(
    async (conversation) => {
      // Haptic feedback for selection
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      setMessages([]);
      setSelectedConversation({
        id: conversation.id,
        name: conversation.name,
        avatar: conversation.avatar,
        isOnline: conversation.isOnline,
        participantId: conversation.otherParticipantId,
      });
      
      // Mark conversation as read
      if (conversation.id && user?.uid && isFirebaseReady() && db && typeof db.collection !== 'function') {
        try {
          await updateDoc(doc(db, 'conversations', conversation.id), {
            [`unreadCount.${user.uid}`]: 0,
          });
          console.log('✅ Marked conversation as read');
        } catch (error) {
          console.warn('Failed to mark conversation as read:', error);
        }
      }
    },
    [user?.uid]
  );

  const closeConversation = useCallback(() => {
    setSelectedConversation(null);
    setMessages([]);
  }, []);

  const showMessageOptions = useCallback(() => {
    if (!selectedConversation) return;
    
    Alert.alert(
      'Conversation Options',
      `Options for ${selectedConversation.name}`,
      [
        {
          text: 'Search Messages',
          onPress: () => setShowMessageSearch(!showMessageSearch),
        },
        {
          text: 'Delete Conversation',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Delete Conversation',
              'Are you sure you want to delete this conversation? This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      if (isFirebaseReady() && db && typeof db.collection !== 'function' && selectedConversation.id) {
                        const conversationRef = doc(db, 'conversations', selectedConversation.id);
                        await deleteDoc(conversationRef);
                        closeConversation();
                        // Reload conversations list
                        await loadConversations();
                      }
                    } catch (error) {
                      console.error('Error deleting conversation:', error);
                      Alert.alert('Error', 'Failed to delete conversation. Please try again.');
                    }
                  },
                },
              ]
            );
          },
        },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Block User', 'This feature will be available soon.');
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  }, [selectedConversation, closeConversation]);

  // Handle route params to start a chat with a specific user
  useEffect(() => {
    if (route.params?.conversationId || route.params?.userId) {
      if (route.params?.conversationId) {
        openConversationFromParams(route.params);
      } else if (route.params?.userId && user?.uid) {
        // Create conversation ID from user IDs
        const participantIds = [user.uid, route.params.userId].sort();
        const conversationId = participantIds.join('_');
        openConversationFromParams({
          ...route.params,
          conversationId,
        });
      }
      // Clear params after handling to prevent re-triggering
      navigation.setParams({});
    }
  }, [navigation, openConversationFromParams, route.params, user?.uid]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Handle params when screen comes into focus
      if (route.params?.conversationId || route.params?.userId) {
        if (route.params?.conversationId) {
          openConversationFromParams(route.params);
        } else if (route.params?.userId && user?.uid) {
          const participantIds = [user.uid, route.params.userId].sort();
          const conversationId = participantIds.join('_');
          openConversationFromParams({
            ...route.params,
            conversationId,
          });
        }
        navigation.setParams({});
      }
    });

    return unsubscribe;
  }, [navigation, openConversationFromParams, route.params, user?.uid]);

  // Load real conversations from Firestore
  const loadConversations = useCallback(async () => {
    if (!user?.uid) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        // Real Firestore - load conversations where user is a participant
        const conversationsQuery = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', user.uid),
          orderBy('lastMessageAt', 'desc'),
          limit(50)
        );
        const conversationsSnapshot = await getDocs(conversationsQuery);
        
        const conversationsData = await Promise.all(
          conversationsSnapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            // Get other participant's info
            const otherParticipantId = data.participants.find(id => id !== user.uid);
            let otherUser = null;
            if (otherParticipantId) {
              const userRef = doc(db, 'users', otherParticipantId);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                otherUser = { id: userSnap.id, ...userSnap.data() };
              }
            }
            
            return {
              id: docSnap.id,
              name: otherUser?.displayName || 'Unknown User',
              lastMessage: data.lastMessage || '',
              timestamp: data.lastMessageAt?.toDate() || new Date(),
              unreadCount: data.unreadCount?.[user.uid] || 0,
              avatar: getAvatarUrl(otherUser) || defaultAvatar,
              isOnline: otherUser?.isOnline || false,
              otherParticipantId,
            };
          })
        );
        
        setConversations(conversationsData);
      } else {
        // Fallback to empty array if Firebase not ready
        setConversations([]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Load real available users from Firestore
  const loadAvailableUsers = useCallback(async () => {
    if (!user?.uid) {
      setAvailableUsers([]);
      return;
    }

    try {
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        // Real Firestore - load users (excluding current user)
        // Load public users first
        const publicUsersQuery = query(
          collection(db, 'users'),
          where('private', '==', false),
          limit(50)
        );
        const publicUsersSnapshot = await getDocs(publicUsersQuery);
        
        // Also load admin users (they should always be available for messaging)
        // Admin email is admin@merkabaent.com
        let adminUsers = [];
        try {
          const allUsersSnapshot = await getDocs(collection(db, 'users'));
          adminUsers = allUsersSnapshot.docs
            .filter(docSnap => {
              const userData = docSnap.data();
              return userData.email === 'admin@merkabaent.com' && docSnap.id !== user.uid;
            })
            .map(docSnap => {
              const userData = { id: docSnap.id, ...docSnap.data() };
              return {
                id: docSnap.id,
                name: userData.displayName || 'Admin',
                username: userData.username || '',
                avatar: getAvatarUrl(userData) || defaultAvatar,
                isOnline: userData.isOnline || false,
              };
            });
        } catch (adminError) {
          console.warn('Error loading admin users:', adminError);
        }
        
        const publicUsersData = publicUsersSnapshot.docs
          .filter(docSnap => docSnap.id !== user.uid)
          .map(docSnap => {
            const userData = { id: docSnap.id, ...docSnap.data() };
            return {
              id: docSnap.id,
              name: userData.displayName || 'Unknown User',
              username: userData.username || '',
              avatar: getAvatarUrl(userData) || defaultAvatar,
              isOnline: userData.isOnline || false,
            };
          });
        
        // Combine public users and admin users, removing duplicates
        const allUsersMap = new Map();
        [...publicUsersData, ...adminUsers].forEach(user => {
          if (!allUsersMap.has(user.id)) {
            allUsersMap.set(user.id, user);
          }
        });
        
        setAvailableUsers(Array.from(allUsersMap.values()));
      } else {
        // Fallback to empty array if Firebase not ready
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error('Error loading available users:', error);
      setAvailableUsers([]);
    }
  }, [user?.uid]);

  // Set up real-time listener for conversations
  useEffect(() => {
    if (!user?.uid || !isFirebaseReady() || !db || typeof db.collection === 'function') {
      return;
    }

    console.log('💬 Setting up real-time listener for conversations');
    
    let conversationsQuery;
    try {
      // Try query with orderBy first (requires index)
      conversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user.uid),
        orderBy('lastMessageAt', 'desc'),
        limit(50)
      );
    } catch (indexError) {
      console.warn('Index not available, using simple query:', indexError);
      // Fallback: query without orderBy if index not ready
      conversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user.uid),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(
      conversationsQuery,
      async (snapshot) => {
        const conversationsData = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            // Get other participant's info
            const otherParticipantId = data.participants.find(id => id !== user.uid);
            let otherUser = null;
            if (otherParticipantId) {
              try {
                const userRef = doc(db, 'users', otherParticipantId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                  otherUser = { id: userSnap.id, ...userSnap.data() };
                }
              } catch (error) {
                console.warn('Error loading user for conversation:', error);
              }
            }
            
            return {
              id: docSnap.id,
              name: otherUser?.displayName || 'Unknown User',
              lastMessage: data.lastMessage || '',
              timestamp: data.lastMessageAt?.toDate() || new Date(),
              unreadCount: data.unreadCount?.[user.uid] || 0,
              avatar: getAvatarUrl(otherUser) || defaultAvatar,
              isOnline: otherUser?.isOnline || false,
              otherParticipantId,
            };
          })
        );
        
        console.log(`💬 Received ${conversationsData.length} conversations`);
        setConversations(conversationsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to conversations:', error);
        // Fallback to one-time load if listener fails
        loadConversations();
      }
    );

    // Also load once initially
    loadConversations();
    loadAvailableUsers();

    // Cleanup listener on unmount
    return () => {
      console.log('💬 Cleaning up conversations listener');
      unsubscribe();
    };
  }, [user?.uid, db, loadConversations, loadAvailableUsers]);

  // Set up real-time listener for messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation?.id || !isFirebaseReady() || !db || typeof db.collection === 'function') {
      return;
    }

    console.log('📨 Setting up real-time listener for conversation:', selectedConversation.id);
    
    const messagesQuery = query(
      collection(db, 'conversations', selectedConversation.id, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const previousCount = messages.length;
        const messagesData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            text: data.text || '',
            imageUrl: data.imageUrl || null,
            attachmentType: data.attachmentType || null,
            attachmentName: data.attachmentName || null,
            senderId: data.senderId,
            timestamp: data.createdAt?.toDate() || new Date(),
            isSent: data.senderId === user?.uid,
          };
        });
        console.log(`📨 Received ${messagesData.length} messages for conversation ${selectedConversation.id}`);
        
        // Check if new message arrived (not sent by current user)
        const newMessageCount = messagesData.length - previousCount;
        if (newMessageCount > 0 && messagesData.length > previousCount) {
          const latestMessage = messagesData[messagesData.length - 1];
          if (latestMessage && !latestMessage.isSent) {
            // Haptic feedback for new message
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            console.log('🔔 New message received, playing haptic feedback');
          }
        }
        
        setMessages(messagesData);
        
        // Scroll to bottom when new messages arrive
        setTimeout(() => {
          listRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      (error) => {
        console.error('Error listening to messages:', error);
        // Fallback to one-time load if listener fails
        loadMessages(selectedConversation.id);
      }
    );

    // Cleanup listener on unmount or conversation change
    return () => {
      console.log('📨 Cleaning up message listener');
      unsubscribe();
    };
  }, [selectedConversation?.id, db, user?.uid, loadMessages]);

  // Keyboard listeners to track keyboard height
  // Always set up listeners (don't conditionally call hooks)
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        if (selectedConversation) {
          setKeyboardHeight(e.endCoordinates.height);
          // Scroll to bottom when keyboard appears
          setTimeout(() => {
            listRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [selectedConversation]);

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return timestamp.toLocaleDateString();
  };

  const handleAttachMedia = async () => {
    Alert.alert(
      'Add Attachment',
      'Choose an attachment type',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Photo', 
          onPress: async () => {
            try {
              // Request permissions
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant camera roll permissions to attach photos');
                return;
              }

              // Pick an image
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                setUploadingImage(true);
                try {
                  // Upload image to Firebase Storage
                  const imageUrl = await uploadImageAsync(result.assets[0].uri, 'messages');
                  console.log('✅ Image uploaded:', imageUrl);
                  
                  // Send message with image
                  await sendMessage(imageUrl, 'image', null);
                  
                  // Haptic feedback
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                } catch (error) {
                  console.error('Error uploading image:', error);
                  Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
                } finally {
                  setUploadingImage(false);
                }
              }
            } catch (error) {
              console.error('Error picking image:', error);
              Alert.alert('Error', 'Failed to pick image. Please try again.');
            }
          }
        },
        { 
          text: 'Document', 
          onPress: () => {
            Alert.alert('Coming Soon', 'Document attachments will be available soon!');
          }
        },
      ],
      { cancelable: true }
    );
  };

  const startNewChat = useCallback(
    async (selectedUser) => {
      const conversationId = await createOrGetConversation(selectedUser);
      if (!conversationId) {
        return;
      }

      setSelectedConversation({
        id: conversationId,
        name: selectedUser.name,
        avatar: selectedUser.avatar || defaultAvatar,
        isOnline: selectedUser.isOnline,
        participantId: selectedUser.id,
      });
      setMessages([]);
      setShowNewChat(false);
      setUserSearchText('');
    },
    [createOrGetConversation]
  );

  const sendMessage = async (imageUrl = null, attachmentType = null, attachmentName = null) => {
    const uid = auth.currentUser?.uid;
    const messageText = text.trim();
    if (!uid || (!messageText && !imageUrl) || !selectedConversation) return;
    
    setText('');
    
    // Add message to local state immediately for better UX
    const newMessage = {
      id: Date.now().toString(),
      text: messageText,
      imageUrl: imageUrl || null,
      attachmentType: attachmentType || null,
      attachmentName: attachmentName || null,
      senderId: uid,
      timestamp: new Date(),
      isSent: true,
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Scroll to bottom
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        console.log('📤 Sending message to conversation:', selectedConversation.id);
        console.log('📤 Message text:', messageText);
        console.log('📤 Image URL:', imageUrl);
        console.log('📤 Sender ID:', uid);
        console.log('📤 Participant ID:', selectedConversation.participantId);
        
        const messageData = {
          text: messageText || '',
          senderId: uid,
          createdAt: serverTimestamp(),
        };
        
        if (imageUrl) {
          messageData.imageUrl = imageUrl;
          messageData.attachmentType = attachmentType || 'image';
        }
        
        if (attachmentName) {
          messageData.attachmentName = attachmentName;
        }
        
        const messageRef = await addDoc(
          collection(db, 'conversations', selectedConversation.id, 'messages'),
          messageData
        );
        console.log('✅ Message sent successfully, ID:', messageRef.id);

        const lastMessagePreview = imageUrl ? '📷 Photo' : (messageText || 'Attachment');
        const updates = {
          lastMessage: lastMessagePreview,
          lastMessageAt: serverTimestamp(),
          [`unreadCount.${uid}`]: 0,
        };

        if (selectedConversation.participantId) {
          updates[`unreadCount.${selectedConversation.participantId}`] = increment(1);
          console.log('📤 Incrementing unread count for participant:', selectedConversation.participantId);
        }

        await updateDoc(doc(db, 'conversations', selectedConversation.id), updates);
        console.log('✅ Conversation updated successfully');
        
        // Haptic feedback for sent message
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        
        // Note: Real-time listener will automatically update messages, so loadMessages is optional
        // await loadMessages(selectedConversation.id);
      } else {
        console.warn('⚠️ Firebase not ready or using mock database');
      }

      // Send notification to recipient (if not current user)
      if (selectedConversation && selectedConversation.id !== uid) {
        await sendMessageNotification({
          id: newMessage.id,
          text: messageText,
          senderId: uid,
          senderName: user?.displayName || 'Someone',
          conversationId: selectedConversation.id,
          isMention: messageText.includes('@'),
        }, notificationPrefs);
      }
    } catch (e) {
      console.warn('Send failed:', e);
    }
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchText.toLowerCase()) ||
    (conv.lastMessage && conv.lastMessage.toLowerCase().includes(searchText.toLowerCase()))
  );

  // Filter users based on search
  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(userSearchText.toLowerCase()) ||
    (user.username && user.username.toLowerCase().includes(userSearchText.toLowerCase()))
  );

  // Filter messages based on search
  const filteredMessages = useMemo(() => {
    if (!messageSearchText.trim()) {
      return messages;
    }
    const query = messageSearchText.toLowerCase();
    return messages.filter(msg =>
      msg.text.toLowerCase().includes(query) ||
      (msg.attachmentName && msg.attachmentName.toLowerCase().includes(query))
    );
  }, [messages, messageSearchText]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If a conversation is selected, show the chat view
  if (selectedConversation) {
    // Calculate keyboard offset - account for header and safe area
    const headerHeight = Platform.OS === 'ios' ? 56 : 64;
    const keyboardOffset = Platform.OS === 'ios' 
      ? headerHeight + insets.top 
      : headerHeight;

    return (
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
        style={{ flex: 1 }}
        keyboardVerticalOffset={keyboardOffset}
      >
        <SafeAreaView 
          style={[styles.safe, { backgroundColor: theme.background }]}
          edges={['top', 'left', 'right']}
        >
          {/* Chat Header */}
          <View style={[styles.chatHeader, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={closeConversation} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            
            <View style={styles.chatHeaderInfo}>
              {selectedConversation.avatar ? (
                <Image source={{ uri: selectedConversation.avatar }} style={styles.chatAvatar} />
              ) : (
                <View style={[styles.chatAvatar, { backgroundColor: theme.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="person" size={24} color={theme.primary} />
                </View>
              )}
              <View style={styles.chatHeaderText}>
                <Text style={[styles.chatName, { color: theme.text }]}>{selectedConversation.name}</Text>
                <Text style={[styles.chatStatus, { color: theme.subtext }]}>
                  {selectedConversation.isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
            
            <View style={styles.chatHeaderActions}>
              <TouchableOpacity 
                style={styles.headerActionButton}
                onPress={() => setShowMessageSearch(!showMessageSearch)}
              >
                <Ionicons name="search" size={24} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionButton}>
                <Ionicons name="videocam" size={24} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionButton}>
                <Ionicons name="call" size={24} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerActionButton}
                onPress={showMessageOptions}
              >
                <Ionicons name="ellipsis-vertical" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Message Search Bar */}
          {showMessageSearch && (
            <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Ionicons name="search" size={20} color={theme.subtext} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search messages..."
                placeholderTextColor={theme.subtext}
                value={messageSearchText}
                onChangeText={setMessageSearchText}
              />
              {messageSearchText.length > 0 && (
                <TouchableOpacity onPress={() => setMessageSearchText('')}>
                  <Ionicons name="close-circle" size={20} color={theme.subtext} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Messages List */}
          <FlatList
            ref={listRef}
            data={filteredMessages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.messagesContainer,
              { paddingBottom: keyboardHeight > 0 ? 10 : 16 }
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            renderItem={({ item }) => (
              <View style={[
                item.senderId === auth.currentUser?.uid ? styles.bubbleMe : styles.bubbleOther,
                { backgroundColor: item.senderId === auth.currentUser?.uid ? theme.primary + '20' : theme.cardBackground, borderColor: theme.border }
              ]}>
                {item.imageUrl && (
                  <TouchableOpacity
                    onPress={() => {
                      // TODO: Open image in full screen viewer
                      Alert.alert('Image', 'Image viewer coming soon');
                    }}
                    activeOpacity={0.9}
                  >
                    <Image 
                      source={{ uri: item.imageUrl }} 
                      style={styles.messageImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
                {item.text && (
                  <Text style={[styles.messageText, { color: theme.text }]}>{item.text}</Text>
                )}
                {item.attachmentName && !item.imageUrl && (
                  <View style={styles.attachmentContainer}>
                    <Ionicons name="document" size={20} color={theme.primary} />
                    <Text style={[styles.attachmentName, { color: theme.primary }]}>{item.attachmentName}</Text>
                  </View>
                )}
                <Text style={[styles.messageTime, { color: theme.subtext }]}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              messagesLoading ? (
                <View style={styles.emptyChatContainer}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              ) : (
                <View style={styles.emptyChatContainer}>
                  <Ionicons name="chatbubbles-outline" size={64} color={theme.subtext} />
                  <Text style={[styles.emptyChatText, { color: theme.text }]}>
                    Start a conversation
                  </Text>
                  <Text style={[styles.emptyChatSubtext, { color: theme.subtext }]}>
                    Send a message to begin chatting
                  </Text>
                </View>
              )
            }
          />

          {/* Message Composer */}
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.background }}>
            <View style={[
              styles.composer, 
              { 
                backgroundColor: theme.background, 
                borderTopColor: theme.border,
                paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : 8
              }
            ]}>
              <TouchableOpacity 
                style={[styles.attachButton, { backgroundColor: theme.cardBackground }]}
                onPress={handleAttachMedia}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Ionicons name="add" size={24} color={theme.text} />
                )}
              </TouchableOpacity>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: theme.cardBackground, 
                    color: theme.text, 
                    borderColor: theme.border,
                    maxHeight: 100,
                    minHeight: 40
                  }
                ]}
                placeholder="Type a message…"
                placeholderTextColor={theme.subtext}
                value={text}
                onChangeText={setText}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
                multiline
                blurOnSubmit={false}
              />
              <TouchableOpacity 
                style={[
                  styles.send, 
                  { 
                    backgroundColor: text.trim() ? theme.primary : theme.cardBackground,
                    opacity: text.trim() ? 1 : 0.5
                  }
                ]} 
                onPress={sendMessage} 
                activeOpacity={0.8}
                disabled={!text.trim()}
              >
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={text.trim() ? '#fff' : theme.subtext} 
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // Main conversations list view
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header with conditional Back Button */}
      {canGoBack && (
        <View style={[styles.topHeader, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.topHeaderTitle, { color: theme.text }]}>Messages</Text>
          <View style={styles.headerRight} />
        </View>
      )}

      {/* Header with Search */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        {!canGoBack && <Text style={[styles.headerTitle, { color: theme.text }]}>Messages</Text>}
        {canGoBack && <View style={{ flex: 1 }} />}
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => setShowUserSearch(!showUserSearch)}
            style={styles.headerActionButton}
          >
            <Ionicons name="search" size={24} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setShowNewChat(true)}
            style={styles.headerActionButton}
          >
            <Ionicons name="create-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* User Search Bar */}
      {showUserSearch && (
        <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.subtext} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search conversations..."
            placeholderTextColor={theme.subtext}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color={theme.subtext} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Conversations List */}
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.conversationItem, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}
            onPress={() => handleConversationSelect(item)}
            activeOpacity={0.7}
          >
            <View style={styles.conversationAvatar}>
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="person" size={24} color={theme.primary} />
                </View>
              )}
              {item.isOnline && <View style={[styles.onlineIndicator, { backgroundColor: '#4CAF50' }]} />}
            </View>
            
            <View style={styles.conversationContent}>
              <View style={styles.conversationHeader}>
                <Text style={[styles.conversationName, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.conversationTime, { color: theme.subtext }]}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
              
              <View style={styles.conversationFooter}>
                <Text 
                  style={[
                    styles.lastMessage, 
                    { color: item.unreadCount > 0 ? theme.text : theme.subtext }
                  ]}
                  numberOfLines={1}
                >
                  {item.lastMessage}
                </Text>
                {item.unreadCount > 0 && (
                  <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title={searchText ? 'No conversations found' : 'No messages yet'}
            message={searchText 
              ? `No conversations match "${searchText}". Try a different search term.`
              : 'Start a conversation with someone to get started. Tap the + button to find users.'}
            actionLabel={searchText ? "Clear Search" : "Start New Chat"}
            onAction={searchText ? () => setSearchText('') : () => setShowNewChat(true)}
          />
        }
      />

      {/* New Chat Modal */}
      <Modal
        visible={showNewChat}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowNewChat(false)}>
              <Text style={[styles.modalCancel, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New Chat</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={[styles.userSearchContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Ionicons name="search" size={20} color={theme.subtext} />
            <TextInput
              style={[styles.userSearchInput, { color: theme.text }]}
              placeholder="Search users..."
              placeholderTextColor={theme.subtext}
              value={userSearchText}
              onChangeText={setUserSearchText}
            />
          </View>

          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.userItem, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}
                onPress={() => startNewChat(item)}
                activeOpacity={0.7}
              >
                <View style={styles.userAvatar}>
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: theme.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="person" size={24} color={theme.primary} />
                    </View>
                  )}
                  {item.isOnline && <View style={[styles.onlineIndicator, { backgroundColor: '#4CAF50' }]} />}
                </View>
                
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.userUsername, { color: theme.subtext }]}>{item.username}</Text>
                </View>
                
                <Ionicons name="chevron-forward" size={20} color={theme.subtext} />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40, // Same width as back button to center title
  },
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  
  // Search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  
  // Conversation list styles
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  conversationAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
  },
  conversationTime: {
    fontSize: 12,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Chat view styles
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    minHeight: Platform.OS === 'ios' ? 56 : 64,
  },
  backButton: {
    marginRight: 16,
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  chatHeaderText: {
    flex: 1,
  },
  chatName: {
    fontSize: 18,
    fontWeight: '600',
  },
  chatStatus: {
    fontSize: 14,
  },
  chatHeaderActions: {
    flexDirection: 'row',
  },
  messagesContainer: {
    padding: 16,
    flexGrow: 1,
  },
  
  // Message bubble styles
  bubbleMe: { 
    alignSelf: 'flex-end', 
    padding: 12, 
    borderRadius: 18, 
    marginVertical: 4, 
    maxWidth: '80%',
    borderBottomRightRadius: 4,
    borderWidth: 1,
  },
  bubbleOther: { 
    alignSelf: 'flex-start', 
    padding: 12, 
    borderRadius: 18, 
    marginVertical: 4, 
    maxWidth: '80%',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  messageImage: {
    width: 250,
    height: 250,
    borderRadius: 12,
    marginBottom: 8,
  },
  attachmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  
  // Composer styles
  composer: { 
    flexDirection: 'row', 
    alignItems: 'flex-end',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
    paddingHorizontal: 16, 
    borderTopWidth: 1, 
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  input: { 
    flex: 1, 
    borderRadius: 20, 
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginHorizontal: 8,
    fontSize: 16,
    borderWidth: 1,
    paddingVertical: 12, 
    marginRight: 12,
    fontSize: 16,
    borderWidth: 1,
    maxHeight: 100,
  },
  send: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Empty states
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyChatContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyChatText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyChatSubtext: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  userSearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  userAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
  },
});
      