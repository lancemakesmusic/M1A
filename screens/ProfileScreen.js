// screens/ProfileScreen.js
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image, Linking, RefreshControl, SafeAreaView,
  ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View,
} from 'react-native';
import { UserContext } from '../contexts/UserContext';

export default function ProfileScreen() {
  const { user, loading, refreshUserProfile } = useContext(UserContext);
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => { await refreshUserProfile(); })();
    }, [refreshUserProfile])
  );

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refreshUserProfile(); } finally { setRefreshing(false); }
  }, [refreshUserProfile]);

  const normalizedSocials = useMemo(() => {
    if (!user?.socials || typeof user.socials !== 'object') return [];
    return Object.entries(user.socials).filter(
      ([, v]) => typeof v === 'string' && v.trim().length > 0
    );
  }, [user]);

  const openSocial = async (url) => {
    const safeUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const canOpen = await Linking.canOpenURL(safeUrl);
    if (!canOpen) return Alert.alert('Invalid link', 'This link cannot be opened.');
    await Linking.openURL(safeUrl);
  };

  // 1) Still resolving profile: show spinner
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#555" />
        <Text style={styles.dimText}>Loading profile…</Text>
      </SafeAreaView>
    );
  }

  // 2) Loaded but no profile doc (first run): show create prompt
  if (!user) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Create your profile</Text>
        <Text style={styles.dimText}>Let’s add your name, username, and avatar.</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('ProfileEdit')}
          activeOpacity={0.85}
        >
          <Text style={styles.editText}>Get started</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 3) Normal render with data
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} />
        }
      >
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.placeholderAvatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        )}

        <Text style={styles.name}>{user.displayName || 'No Name Set'}</Text>
        <Text style={styles.username}>@{user.username || 'username'}</Text>
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

        {normalizedSocials.length > 0 && (
          <View style={styles.socials}>
            {normalizedSocials.map(([platform, url]) => (
              <TouchableOpacity key={platform} onPress={() => openSocial(url)}>
                <Text style={styles.link}>{platform}: {url}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.row}>
          <Text style={styles.label}>Private Profile</Text>
          <Switch value={!!user.private} disabled />
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('ProfileEdit')}
          activeOpacity={0.85}
        >
          <Text style={styles.editText}>✏️ Edit Profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { alignItems: 'center', padding: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  dimText: { marginTop: 8, color: '#777', textAlign: 'center' },
  title: { fontSize: 20, fontWeight: '600' },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 12 },
  placeholderAvatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 48 },
  name: { fontSize: 22, fontWeight: 'bold' },
  username: { fontSize: 16, color: '#777', marginBottom: 8 },
  bio: { textAlign: 'center', fontSize: 16, marginBottom: 12, paddingHorizontal: 10 },
  socials: { marginTop: 10, alignItems: 'center', gap: 6 },
  link: { fontSize: 14, color: '#007aff' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  label: { fontSize: 16, marginRight: 12 },
  editButton: { marginTop: 24, backgroundColor: '#007aff', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  editText: { color: '#fff', fontWeight: '600' },
});
