import React, { useState } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, Image, StyleSheet } from 'react-native';
import { searchUsersByUsername } from '../firebase'; // implement below

export default function ExploreScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);

  async function handleSearch(text) {
    setSearch(text);
    if (text.length >= 2) {
      const found = await searchUsersByUsername(text);
      setResults(found);
    } else {
      setResults([]);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search users by username"
        style={styles.input}
        value={search}
        onChangeText={handleSearch}
      />
      <FlatList
        data={results}
        keyExtractor={item => item.uid}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.uid })}>
            <View style={styles.resultRow}>
              <Image source={item.avatarUrl ? { uri: item.avatarUrl } : require('../assets/avatar-placeholder.png')} style={styles.avatar} />
              <Text style={styles.name}>{item.displayName}</Text>
              <Text style={styles.username}>@{item.username}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181818', padding: 16 },
  input: { backgroundColor: '#232323', color: '#fff', borderRadius: 8, padding: 12, marginBottom: 10 },
  resultRow: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#333' },
  name: { color: '#FFD700', fontWeight: '600', marginRight: 7 },
  username: { color: '#aaa' },
});
