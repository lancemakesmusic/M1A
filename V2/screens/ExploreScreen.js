import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const MOCK_DATA = [
  { id: '1', name: 'DJ Merkaba' },
  { id: '2', name: 'Live Sound Package' },
  { id: '3', name: 'Stage Lighting' },
  { id: '4', name: 'Photographer - Jane' },
  { id: '5', name: 'Event Host - Mike' },
  { id: '6', name: 'Custom Flier Design' },
];

export default function ExploreScreen() {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState(MOCK_DATA);

  const handleSearch = (text) => {
    setSearch(text);
    const filtered = MOCK_DATA.filter((item) =>
      item.name.toLowerCase().includes(text.toLowerCase())
    );
    setResults(filtered);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.text }]}
        placeholder="Search artists, services, events..."
        placeholderTextColor="#888"
        value={search}
        onChangeText={handleSearch}
      />

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.resultItem, { backgroundColor: theme.accent + '22' }]}>
            <Text style={[styles.resultText, { color: theme.text }]}>{item.name}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.text }]}>No results found</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  resultItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 16,
  },
  empty: {
    marginTop: 32,
    textAlign: 'center',
  },
});
