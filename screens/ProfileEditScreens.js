import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Switch, StyleSheet, Platform, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from './contexts/UserContext';
import { updateProfile, uploadAvatarToStorage, isUsernameAvailable } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from './contexts/ThemeContext'; // Adjust path if needed

const SOCIAL_LINKS = [
  { label: 'YouTube', icon: '🎬', prefix: 'https://youtube.com/', key: 'youtube' },
  { label: 'Facebook', icon: '📘', prefix: 'https://facebook.com/', key: 'facebook' },
  { label: 'Instagram', icon: '📸', prefix: 'https://instagram.com/', key: 'instagram' },
  { label: 'TikTok', icon: '🎵', prefix: 'https://tiktok.com/@', key: 'tiktok' },
];

export default function ProfileEditScreen() {
  const { user, refreshUser } = useContext(UserContext);
  const navigation = useNavigation();
  const { theme, themeKey, setThemeKey, THEMES } = useTheme();

  if (!user) {
    return <View style={[styles.container, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.primary} size="large" /></View>;
  }

  // State
  const [avatar, setAvatar] = useState(user.avatarUrl || null);
  const [avatarLocal, setAvatarLocal] = useState(null);
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [username, setUsername] = useState(user.username || '');
  const [bio, setBio] = useState(user.bio || '');
  const [social, setSocial] = useState(user.social || { youtube:'', facebook:'', instagram:'', tiktok:'' });
  const [isPrivate, setIsPrivate] = useState(!!user.isPrivate);
  const [selectedTheme, setSelectedTheme] = useState(user.theme || themeKey || 'gold');
  const [loading, setLoading] = useState(false);
  // Username check
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [usernameLastChecked, setUsernameLastChecked] = useState(user.username || '');
  const keyboardVerticalOffset = Platform.OS === 'ios' ? 70 : 0;

  // --- Avatar picker ---
  const pickAvatar = async () => {
    let permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Allow access to your photos to upload an avatar.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      aspect: [1, 1],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      setAvatarLocal(result.assets[0].uri);
    }
  };

  // --- Live Username Check (debounced, a-z 0-9 _ only) ---
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (username && username !== usernameLastChecked) {
        checkUsernameAvailability(username);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [username]);

  async function checkUsernameAvailability(newName) {
    if (!newName || newName === user.username) {
      setUsernameAvailable(true);
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(newName)) {
      setUsernameAvailable(false);
      return;
    }
    setUsernameCheckLoading(true);
    try {
      const isAvailable = await isUsernameAvailable(newName.trim().toLowerCase(), user.uid);
      setUsernameAvailable(isAvailable);
    } catch (e) {
      setUsernameAvailable(false);
    }
    setUsernameCheckLoading(false);
    setUsernameLastChecked(newName);
  }

  // --- Save handler ---
  const handleSave = async () => {
    if (!displayName.trim() || !username.trim()) {
      Alert.alert('Name and Username required');
      return;
    }
    if (["admin", "support", "null", "undefined", "root"].includes(username.trim().toLowerCase())) {
      Alert.alert('Invalid username', 'This username is reserved.');
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      Alert.alert('Invalid username', 'Only a-z, 0-9, and underscores allowed. 3-20 chars.');
      return;
    }
    if (!usernameAvailable) {
      Alert.alert('Username taken', 'Please choose a different username.');
      return;
    }
    setLoading(true);
    let avatarUrl = avatar;
    if (avatarLocal) {
      try {
        avatarUrl = await uploadAvatarToStorage(user.uid, avatarLocal);
        setAvatar(avatarUrl);
        setAvatarLocal(null);
      } catch (e) {
        Alert.alert('Upload failed', 'Could not upload avatar.');
        setLoading(false);
        return;
      }
    }
    try {
      await updateProfile(user.uid, {
        avatarUrl,
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        bio,
        social,
        isPrivate,
        theme: selectedTheme,
      });
      await refreshUser();
      setThemeKey(selectedTheme);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Save failed', e.message || 'Unknown error');
    }
    setLoading(false);
  };

  // Sync context if user changes theme
  useEffect(() => {
    setThemeKey(selectedTheme);
  }, [selectedTheme]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrap} disabled={loading}>
          <Image
            source={
              avatarLocal
                ? { uri: avatarLocal }
                : avatar
                ? { uri: avatar }
                : require('../assets/avatar-placeholder.png')
            }
            style={styles.avatar}
          />
          <View style={styles.avatarEditIcon}>
            <Ionicons name="camera" size={20} color={theme.primary} />
          </View>
        </TouchableOpacity>
        {/* Display Name */}
        <Text style={[styles.label, { color: theme.primary }]}>Display Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: themeKey === "light" ? "#f4f4f4" : "#232323", color: theme.text }]}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={32}
          placeholder="Display Name"
          placeholderTextColor="#AAA"
          editable={!loading}
        />
        {/* Username */}
        <Text style={[styles.label, { color: theme.primary }]}>Username</Text>
        <TextInput
          style={[styles.input, { backgroundColor: themeKey === "light" ? "#f4f4f4" : "#232323", color: theme.text }]}
          value={username}
          onChangeText={t => setUsername(t.replace(/[^a-z0-9_]/g, '').toLowerCase())}
          maxLength={20}
          autoCapitalize="none"
          placeholder="username (a-z, 0-9, _)"
          placeholderTextColor="#AAA"
          editable={!loading}
        />
        {/* Username availability feedback */}
        {usernameCheckLoading ? (
          <Text style={{ color: theme.primary, fontSize: 13 }}>Checking availability...</Text>
        ) : !usernameAvailable ? (
          <Text style={{ color: "#FF5A5A", fontSize: 13 }}>Username not available</Text>
        ) : username && username !== user.username ? (
          <Text style={{ color: "#33C67B", fontSize: 13 }}>Username available</Text>
        ) : null}

        {/* Bio */}
        <Text style={[styles.label, { color: theme.primary }]}>Bio</Text>
        <TextInput
          style={[styles.input, { minHeight: 64, backgroundColor: themeKey === "light" ? "#f4f4f4" : "#232323", color: theme.text }]}
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={160}
          placeholder="Short bio"
          placeholderTextColor="#AAA"
          editable={!loading}
        />
        {/* Social Links */}
        {SOCIAL_LINKS.map(({ label, icon, key, prefix }) => (
          <View key={key}>
            <Text style={styles.label}>{icon} {label}</Text>
            <TextInput
              style={styles.input}
              value={social[key] || ''}
              onChangeText={v => setSocial({ ...social, [key]: v })}
              placeholder={`e.g. ${prefix}`}
              placeholderTextColor="#AAA"
              editable={!loading}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
            />
          </View>
        ))}
        {/* Theme Picker */}
        <Text style={[styles.label, { color: theme.primary }]}>Theme</Text>
        <View style={styles.themeRow}>
          {Object.entries(THEMES).map(([key, t]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setSelectedTheme(key)}
              style={[
                styles.themeCircle,
                {
                  backgroundColor: t.primary,
                  borderColor: selectedTheme === key ? theme.primary : "#555",
                  shadowColor: selectedTheme === key ? theme.primary : "#000",
                  shadowOpacity: selectedTheme === key ? 0.6 : 0,
                  elevation: selectedTheme === key ? 3 : 1,
                }
              ]}
              accessibilityLabel={t.name}
            >
              {selectedTheme === key && (
                <Ionicons name="checkmark" size={20} color={theme.background} />
              )}
            </TouchableOpacity>
          ))}
        </View>
        {/* Privacy Switch (with Lock emoji and explain) */}
        <View style={styles.privacyRow}>
          <Text style={styles.label}>Private Profile <Text style={{fontSize:18}}>{isPrivate ? '🔒' : '🔓'}</Text></Text>
          <Switch value={isPrivate} onValueChange={setIsPrivate} disabled={loading} />
        </View>
        <Text style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>
          {isPrivate ? 'Hidden from Explore/search. Only public users can DM you.' : 'Public: Shown everywhere.'}
        </Text>
        {/* Save/Cancel */}
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={loading}>
            {loading ? <ActivityIndicator color={theme.primary} /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn} disabled={loading}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 22,
    backgroundColor: '#181818',
    alignItems: 'stretch',
  },
  avatarWrap: {
    alignSelf: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#222',
  },
  avatarEditIcon: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 3,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  label: {
    color: '#FFD700',
    fontWeight: '600',
    fontSize: 15,
    marginTop: 16,
  },
  input: {
    color: '#fff',
    backgroundColor: '#232323',
    padding: 10,
    borderRadius: 12,
    marginTop: 6,
    fontSize: 16,
    marginBottom: 2,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 14,
  },
  themeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 60,
  },
  saveBtn: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 16,
    minWidth: 120,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#181818',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFD700',
    minWidth: 110,
    alignItems: 'center',
    marginLeft: 10,
    backgroundColor: 'transparent',
  },
  cancelBtnText: {
    color: '#FFD700',
    fontWeight: '600',
    fontSize: 16,
  },
});
