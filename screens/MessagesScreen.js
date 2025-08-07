import { useTheme } from './contexts/ThemeContext';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, Button, KeyboardAvoidingView, Platform, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { collection, onSnapshot, addDoc, query, orderBy, serverTimestamp, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, uploadChatMediaAsync, toggleMessageReaction } from '../firebase';
import EmojiSelector from 'react-native-emoji-selector';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';

const defaultEmojis = ["👍", "😂", "🔥", "🥰", "👏", "🤔"];

export default function MessagesScreen() {
  const { theme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const currentUser = auth.currentUser;
  const flatListRef = useRef();
  const typingDocRef = currentUser
    ? doc(db, 'typing', currentUser.uid)
    : null;

  // Realtime messages
  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Typing indicator logic
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'typing'), (snapshot) => {
      const users = snapshot.docs
        .map((doc) => doc.data())
        .filter((d) => d.uid !== (currentUser && currentUser.uid));
      setTypingUsers(users);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Set typing state in Firestore
  useEffect(() => {
    if (!currentUser) return;
    if (text.length > 0) {
      setDoc(typingDocRef, {
        uid: currentUser.uid,
        user: currentUser.displayName || currentUser.email || 'Unknown',
        timestamp: Date.now(),
      });
    } else {
      deleteDoc(typingDocRef).catch(() => {});
    }
    return () => {
      deleteDoc(typingDocRef).catch(() => {});
    };
  }, [text, currentUser]);

  const sendMessage = async () => {
    if (!text.trim() || !currentUser) return;
    try {
      await addDoc(collection(db, 'messages'), {
        user: currentUser.displayName || currentUser.email || 'Unknown',
        avatar: currentUser.photoURL || null,
        text,
        type: 'text',
        timestamp: serverTimestamp(),
      });
      setText('');
      setShowEmoji(false);
    } catch (error) {
      alert('Failed to send message: ' + error.message);
    }
  };

  // Send image or video
  const sendMediaMessage = async (url, mediaType) => {
    if (!currentUser) return;
    await addDoc(collection(db, 'messages'), {
      user: currentUser.displayName || currentUser.email || 'Unknown',
      avatar: currentUser.photoURL || null,
      text: '',
      type: mediaType,
      mediaUrl: url,
      timestamp: serverTimestamp(),
    });
  };

  // Pick media from device
  const pickMedia = async () => {
    try {
      setLoadingMedia(true);
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        const { uri, type } = result.assets[0];
        const uploadedUrl = await uploadChatMediaAsync(uri, type);
        await sendMediaMessage(uploadedUrl, type && type.includes('video') ? 'video' : 'image');
      }
    } catch (e) {
      alert('Media upload failed: ' + e.message);
    } finally {
      setLoadingMedia(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.user === (currentUser.displayName || currentUser.email);
    const reactions = item.reactions || {};
    // How many users for each emoji
    const getReactionCount = (emoji) => (reactions[emoji] ? reactions[emoji].length : 0);
    // Did this user react?
    const didReact = (emoji) => (reactions[emoji] || []).includes(currentUser?.uid);

    return (
      <View style={[styles.bubbleRow, isMe ? { flexDirection: 'row-reverse' } : {}]}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={[styles.avatar, { borderColor: theme.avatarBorder }]} />
        ) : (
          <View style={[styles.avatarPlaceholder, { borderColor: theme.avatarBorder }]} />
        )}
        <View style={[styles.bubble, isMe ? { backgroundColor: theme.bubbleMe } : { backgroundColor: theme.bubbleOther }]}>
          <Text style={[styles.bubbleUser, { color: theme.accent }]}>{item.user}</Text>
          {/* Display image */}
          {item.type === 'image' && item.mediaUrl && (
            <Image source={{ uri: item.mediaUrl }} style={styles.mediaImage} />
          )}
          {/* Display video */}
          {item.type === 'video' && item.mediaUrl && (
            <Video
              source={{ uri: item.mediaUrl }}
              useNativeControls
              style={styles.mediaVideo}
              resizeMode="contain"
            />
          )}
          {/* Display text (if any) */}
          {item.text ? <Text style={[styles.bubbleText, { color: theme.text }]}>{item.text}</Text> : null}
          {/* Emoji Reaction Bar */}
          <View style={styles.reactionRow}>
            {defaultEmojis.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => toggleMessageReaction(item.id, emoji, currentUser.uid)}
                style={{
                  paddingHorizontal: 6,
                  opacity: didReact(emoji) ? 1 : 0.5,
                  transform: [{ scale: didReact(emoji) ? 1.2 : 1 }]
                }}
              >
                <Text style={{ fontSize: 22 }}>
                  {emoji}
                  {getReactionCount(emoji) > 0 && (
                    <Text style={{ fontSize: 15, color: theme.accent }}> {getReactionCount(emoji)}</Text>
                  )}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 12, color: theme.header }}>Messages</Text>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          renderItem={renderMessage}
          contentContainerStyle={{ paddingBottom: 8 }}
        />
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <View style={{ marginBottom: 4, marginLeft: 16 }}>
            <Text style={{ color: theme.accent }}>
              {typingUsers.map(u => u.user).join(', ')} typing...
            </Text>
          </View>
        )}
        {/* Emoji Picker Toggle + Input + Media */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 12 }}>
          <TouchableOpacity onPress={() => setShowEmoji((v) => !v)}>
            <Ionicons name="happy-outline" size={32} color={theme.emoji} style={{ marginRight: 8 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={pickMedia} disabled={loadingMedia}>
            <Ionicons name="image" size={32} color={theme.header} style={{ marginRight: 8 }} />
          </TouchableOpacity>
          <TextInput
            placeholder="Type your message..."
            placeholderTextColor={theme.accent}
            value={text}
            onChangeText={setText}
            style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.accent }]}
            multiline
          />
          <Button title="Send" onPress={sendMessage} disabled={loadingMedia} color={theme.header} />
          {loadingMedia && <ActivityIndicator color={theme.header} style={{ marginLeft: 6 }} />}
        </View>
        {/* Emoji Picker Modal */}
        {showEmoji && (
          <View style={{ position: 'absolute', bottom: 72, left: 8, right: 8, zIndex: 2, backgroundColor: theme.background, borderRadius: 14, borderColor: theme.accent, borderWidth: 1, padding: 6 }}>
            <EmojiPicker
              onEmojiSelected={e => {
                setText(t => t + e.emoji);
              }}
              theme={theme.background === '#fff' ? 'light' : 'dark'}
              emojiSize={30}
            />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    marginLeft: 8,
    borderWidth: 2,
    backgroundColor: '#eee',
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    marginLeft: 8,
    borderWidth: 2,
    backgroundColor: '#eee',
  },
  bubble: {
    padding: 12,
    borderRadius: 20,
    maxWidth: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  bubbleMe: {},
  bubbleOther: {},
  bubbleUser: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  bubbleText: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    minHeight: 40,
    maxHeight: 100,
  },
  mediaImage: {
    width: 160,
    height: 160,
    borderRadius: 12,
    marginBottom: 6,
    alignSelf: 'center',
  },
  mediaVideo: {
    width: 180,
    height: 180,
    borderRadius: 14,
    marginBottom: 6,
    alignSelf: 'center',
  },
  reactionRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: -2,
  },
});
