import { useEffect, useState } from 'react';
import {
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { sendMessage, subscribeToMessages } from '../firebase/firestore';

export default function MessagesScreen() {
  const { theme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToMessages(setMessages);
    return unsubscribe;
  }, []);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      await sendMessage({ text: newMessage });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error.message);
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.messageBubble, { backgroundColor: theme.accent + '22' }]}>
      <Text style={{ color: theme.text }}>{item.text}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.text }]}
          placeholder="Type a message..."
          placeholderTextColor="#888"
          value={newMessage}
          onChangeText={setNewMessage}
        />
        <Button title="Send" onPress={handleSend} color={theme.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messageBubble: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    fontSize: 16,
  },
});
