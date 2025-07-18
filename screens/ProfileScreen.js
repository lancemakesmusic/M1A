// screens/ProfileScreen.js

import React, { useContext } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from './contexts/UserContext';
import { useTheme } from './contexts/ThemeContext';

export default function ProfileScreen() {
  const { user } = useContext(UserContext);
  const navigation = useNavigation();
  const { theme } = useTheme();

  if (!user) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.primary }}>Loading profile...</Text>
      </View>
    );
  }

  const {
    avatarUrl,
    displayName,
    username,
    bio,
    social = {},
    badges = [],
    followers = 0,
    events = 0,
    isPrivate = false,
    theme: selectedTheme,
  } = user;

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Image
          source={avatarUrl ? { uri: avatarUrl } : require('../assets/avatar-placeholder.png')}
          style={styles.avatar}
        />
        <Text style={[styles.displayName, { color: theme.primary }]}>{displayName || 'Unnamed'}</Text>
        <Text style={styles.username}>@{username}</Text>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('ProfileEditScreen')}
        >
          <Ionicons name="create-outline" size={16} color={theme.primary} />
          <Text style={[styles.editButtonText, { color: theme.primary }]}>Edit Profile</Text>
        </TouchableOpacity>

        {bio ? <Text style={styles.bio}>{bio}</Text> : null}

        {Object.values(social).some(link => link) && (
          <View style={styles.linksContainer}>
            {Object.entries(social).map(([platform, link]) => (
              link ? (
                <Text key={platform} style={styles.linkText}>
                  {platform}: {link}
                </Text>
              ) : null
            ))}
          </View>
        )}

        {isPrivate && <Text style={styles.privateBadge}>🔒 Private Profile</Text>}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{events}</Text>
          <Text style={styles.statLabel}>Events</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{badges.length}</Text>
          <Text style={styles.statLabel}>Badges</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{followers}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
      </View>

      <View style={styles.badgesRow}>
        {badges.length ? badges.map((badge, idx) => (
          <Text key={idx} style={styles.badge}>
            {badge === 'verified' ? '⭐ Verified' : badge}
          </Text>
        )) : (
          <Text style={styles.noBadgeText}>No badges earned yet</Text>
        )}
      </View>

      <Text style={styles.themeNote}>🌈 Theme: {selectedTheme || 'default'}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    alignItems: 'center',
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 12,
    backgroundColor: '#222',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
  },
  username: {
    fontSize: 15,
    color: '#aaa',
    marginBottom: 8,
  },
  bio: {
    color: '#eee',
    textAlign: 'center',
    marginBottom: 6,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#FFD700',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  editButtonText: {
    marginLeft: 6,
    fontWeight: '600',
  },
  linksContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  linkText: {
    color: '#4fd1c5',
    fontSize: 14,
    marginVertical: 2,
  },
  privateBadge: {
    marginTop: 10,
    backgroundColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 13,
    color: '#FFD700',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: '#232323',
    borderRadius: 16,
  },
  statBox: {
    alignItems: 'center',
    minWidth: 70,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  statLabel: {
    fontSize: 13,
    color: '#bbb',
    marginTop: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  badge: {
    fontSize: 18,
    color: '#FFD700',
    margin: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#222',
    borderRadius: 10,
  },
  noBadgeText: {
    color: '#999',
    fontStyle: 'italic',
  },
  themeNote: {
    marginTop: 14,
    color: '#888',
    fontSize: 13,
  },
});
