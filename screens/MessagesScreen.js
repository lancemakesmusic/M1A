import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { auth } from '../firebase';

// Mock data - moved outside component to prevent infinite re-renders
const mockConversations = [
  {
    id: '1',
    name: 'John Doe',
    lastMessage: 'Hey, how are you doing?',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    unreadCount: 2,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    isOnline: true,
  },
  {
    id: '2',
    name: 'Sarah Wilson',
    lastMessage: 'Thanks for the help with the project!',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    unreadCount: 0,
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
    isOnline: false,
  },
  {
    id: '3',
    name: 'Mike Johnson',
    lastMessage: 'See you tomorrow at the meeting',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    unreadCount: 1,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    isOnline: true,
  },
  {
    id: '4',
    name: 'Emily Davis',
    lastMessage: 'The event was amazing!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    unreadCount: 0,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    isOnline: false,
  },
];

const mockUsers = [
  {
    id: '5',
    name: 'Alex Thompson',
    username: '@alexthompson',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    isOnline: true,
  },
  {
    id: '6',
    name: 'Lisa Chen',
    username: '@lisachen',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
    isOnline: false,
  },
  {
    id: '7',
    name: 'David Rodriguez',
    username: '@davidrod',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
    isOnline: true,
  },
];

export default function MessagesScreen() {
      const { theme } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [userSearchText, setUserSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const listRef = useRef(null);


  useEffect(() => {
    // Load conversations
    setConversations(mockConversations);
    setAvailableUsers(mockUsers);
    setLoading(false);
  }, []); // Empty dependency array - mock data is static

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

  const startNewChat = (user) => {
    setSelectedConversation({
      id: `new-${user.id}`,
      name: user.name,
      avatar: user.avatar,
      isOnline: user.isOnline,
    });
    setMessages([]);
    setShowNewChat(false);
    setUserSearchText('');
  };

  const sendMessage = async () => {
    const uid = auth.currentUser?.uid;
    const messageText = text.trim();
    if (!uid || !messageText || !selectedConversation) return;
    
    setText('');
    
    // Add message to local state immediately for better UX
    const newMessage = {
      id: Date.now().toString(),
      text: messageText,
      senderId: uid,
      timestamp: new Date(),
      isSent: true,
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Scroll to bottom
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // In a real app, you would save to Firebase here
    try {
      // await addDoc(collection(db, 'conversations', selectedConversation.id, 'messages'), {
      //   text: messageText,
      //   senderId: uid,
      //   createdAt: serverTimestamp(),
      // });
    } catch (e) {
      console.warn('Send failed:', e);
    }
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchText.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchText.toLowerCase())
  );

  // Filter users based on search
  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(userSearchText.toLowerCase()) ||
    user.username.toLowerCase().includes(userSearchText.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading messages...</Text>
      </SafeAreaView>
    );
  }

  // If a conversation is selected, show the chat view
  if (selectedConversation) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
          {/* Chat Header */}
          <View style={[styles.chatHeader, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <TouchableOpacity 
              onPress={() => setSelectedConversation(null)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            
            <View style={styles.chatHeaderInfo}>
              <Image source={{ uri: selectedConversation.avatar }} style={styles.chatAvatar} />
              <View style={styles.chatHeaderText}>
                <Text style={[styles.chatName, { color: theme.text }]}>{selectedConversation.name}</Text>
                <Text style={[styles.chatStatus, { color: theme.subtext }]}>
                  {selectedConversation.isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
            
            <View style={styles.chatHeaderActions}>
              <TouchableOpacity style={styles.headerActionButton}>
                <Ionicons name="videocam" size={24} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionButton}>
                <Ionicons name="call" size={24} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionButton}>
                <Ionicons name="ellipsis-vertical" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages List */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesContainer}
            renderItem={({ item }) => (
              <View style={[
                item.senderId === auth.currentUser?.uid ? styles.bubbleMe : styles.bubbleOther,
                { backgroundColor: item.senderId === auth.currentUser?.uid ? theme.primary + '20' : theme.cardBackground, borderColor: theme.border }
              ]}>
                <Text style={[styles.messageText, { color: theme.text }]}>{item.text}</Text>
                <Text style={[styles.messageTime, { color: theme.subtext }]}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyChatContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color={theme.subtext} />
                <Text style={[styles.emptyChatText, { color: theme.text }]}>
                  Start a conversation
                </Text>
                <Text style={[styles.emptyChatSubtext, { color: theme.subtext }]}>
                  Send a message to begin chatting
                </Text>
              </View>
            }
          />

          {/* Message Composer */}
          <View style={[styles.composer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
            <TouchableOpacity style={[styles.attachButton, { backgroundColor: theme.cardBackground }]}>
              <Ionicons name="add" size={24} color={theme.text} />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
              placeholder="Type a message…"
              placeholderTextColor={theme.subtext}
              value={text}
              onChangeText={setText}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              multiline
            />
            <TouchableOpacity 
              style={[styles.send, { backgroundColor: text.trim() ? theme.primary : theme.cardBackground }]} 
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
      </KeyboardAvoidingView>
    );
  }

  // Main conversations list view
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* Header with Search */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Messages</Text>
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
            onPress={() => setSelectedConversation(item)}
            activeOpacity={0.7}
          >
            <View style={styles.conversationAvatar}>
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
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
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={theme.subtext} />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              {searchText ? 'No conversations found' : 'No messages yet'}
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.subtext }]}>
              {searchText ? 'Try a different search term' : 'Start a conversation to get started'}
            </Text>
          </View>
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
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />
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
    padding: 16,
    borderBottomWidth: 1,
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
  
  // Composer styles
  composer: { 
    flexDirection: 'row', 
    alignItems: 'flex-end',
    padding: 16, 
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
      