// M1A/screens/ProfileScreen.js

import React, { useContext } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from './contexts/UserContext';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
  const { user } = useContext(UserContext);
  const navigation = useNavigation();

  if (!user) {
    // You could show a loading spinner or redirect to login
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: "#FFD700" }}>Loading profile...</Text>
      </View>
    );
  }

  const {
    avatarUrl,
    displayName,
    username,
    bio,
    badges = [],
    followers = 0,
    events = 0,
    links = [],
    isPrivate = false,
  } = user;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileTop}>
        <Image
          source={avatarUrl ? { uri: avatarUrl } : require('../assets/avatar-placeholder.png')}
          style={styles.avatar}
        />
        <Text style={styles.name}>{displayName || "Your Name"}</Text>
        <Text style={styles.username}>@{username || "yourusername"}</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('ProfileEditScreen')}
        >
          <Ionicons name="create-outline" size={16} color="#FFD700" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
        {bio ? <Text style={styles.bio}>{bio}</Text> : null}
        {links.length > 0 && (
          <View style={styles.linksRow}>
            {links.map((link, idx) => (
              <Text key={idx} style={styles.link} numberOfLines={1} ellipsizeMode="tail">
                {link}
              </Text>
            ))}
          </View>
        )}
        {isPrivate && <Text style={styles.privateBadge}>Private</Text>}
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
        {badges.length > 0 ? (
          badges.map((badge, idx) => (
            <Text key={idx} style={styles.badge}>{badge === 'verified' ? '⭐' : badge}</Text>
          ))
        ) : (
          <Text style={styles.noBadgeText}>No badges yet</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    alignItems: 'center',
    backgroundColor: '#181818',
    minHeight: '100%',
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#181818',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileTop: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFD700',
    marginBottom: 12,
    backgroundColor: '#282828',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  username: {
    fontSize: 15,
    color: '#C0C0C0',
    marginBottom: 10,
    fontFamily: 'monospace',
  },
  bio: {
    color: '#EEE',
    fontSize: 15,
    marginTop: 8,
    marginBottom: 5,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
    justifyContent: 'center',
    gap: 6,
  },
  link: {
    color: '#4fd1c5',
    textDecorationLine: 'underline',
    marginHorizontal: 2,
    maxWidth: 120,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  editButtonText: {
    color: '#FFD700',
    fontSize: 15,
    marginLeft: 6,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 30,
    width: '92%',
    justifyContent: 'space-around',
    backgroundColor: '#232323',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  statBox: {
    alignItems: 'center',
    minWidth: 70,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFD700',
  },
  statLabel: {
    fontSize: 12,
    color: '#C0C0C0',
    marginTop: 3,
    fontWeight: '400',
  },
  badgesRow: {
    flexDirection: 'row',
    marginTop: 30,
    gap: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  badge: {
    fontSize: 28,
    marginHorizontal: 5,
  },
  noBadgeText: {
    color: '#888',
    fontSize: 16,
    fontStyle: 'italic',
  },
  privateBadge: {
    marginTop: 6,
    color: '#FFD700',
    backgroundColor: '#232323',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    fontWeight: '700',
    fontSize: 14,
  },
});
