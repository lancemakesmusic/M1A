import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  Switch, StyleSheet, Platform, ScrollView, KeyboardAvoidingView, Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const SOCIAL_LINKS = [
  { label: 'YouTube', icon: '🎬', prefix: 'https://youtube.com/', key: 'youtube' },
  { label: 'Facebook', icon: '📘', prefix: 'https://facebook.com/', key: 'facebook' },
  { label: 'Instagram', icon: '📸', prefix: 'https://instagram.com/', key: 'instagram' },
  { label: 'TikTok', icon: '🎵', prefix: 'https://tiktok.com/@', key: 'tiktok' },
];

const THEMES = {
  gold: { name: 'Gold', primary: '#FFD700' },
  dark: { name: 'Dark', primary: '#333' },
  blue: { name: 'Blue', primary: '#007AFF' },
};

export default function ProfileEditScreen() {
  const navigation = useNavigation();
  const keyboardVerticalOffset = Platform.OS === 'ios' ? 70 : 0;

  // Local state
  const [avatarLocal, setAvatarLocal] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [social, setSocial] = useState({ youtube: '', facebook: '', instagram: '', tiktok: '' });
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('gold');

  // Avatar picker
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

  const handleSave = () => {
    Alert.alert('Saved', 'Your profile has been updated (locally).');
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrap}>
          <Image
            source={
              avatarLocal
                ? { uri: avatarLocal }
                : require('../assets/avatar-placeholder.png')
            }
            style={styles.avatar}
          />
          <View style={styles.avatarEditIcon}>
            <Ionicons name="camera" size={20} color="#FFD700" />
          </View>
        </TouchableOpacity>

        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={32}
          placeholder="Display Name"
          placeholderTextColor="#AAA"
        />

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={text => setUsername(text.replace(/[^a-z0-9_]/g, '').toLowerCase())}
          maxLength={20}
          autoCapitalize="none"
          placeholder="username (a-z, 0-9, _)"
          placeholderTextColor="#AAA"
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, { minHeight: 64 }]}
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={160}
          placeholder="Short bio"
          placeholderTextColor="#AAA"
        />

        {SOCIAL_LINKS.map(({ label, icon, key, prefix }) => (
          <View key={key}>
            <Text style={styles.label}>{icon} {label}</Text>
            <TextInput
              style={styles.input}
              value={social[key] || ''}
              onChangeText={v => setSocial({ ...social, [key]: v })}
              placeholder={`e.g. ${prefix}`}
              placeholderTextColor="#AAA"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        ))}

        <Text style={styles.label}>Theme</Text>
        <View style={styles.themeRow}>
          {Object.entries(THEMES).map(([key, t]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setSelectedTheme(key)}
              style={[
                styles.themeCircle,
                {
                  backgroundColor: t.primary,
                  borderColor: selectedTheme === key ? '#FFD700' : "#555",
                }
              ]}
            >
              {selectedTheme === key && (
                <Ionicons name="checkmark" size={20} color="#000" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.privacyRow}>
          <Text style={styles.label}>Private Profile <Text style={{ fontSize: 18 }}>{isPrivate ? '🔒' : '🔓'}</Text></Text>
          <Switch value={isPrivate} onValueChange={setIsPrivate} />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 22, backgroundColor: '#181818', alignItems: 'stretch' },
  avatarWrap: { alignSelf: 'center', marginBottom: 12, position: 'relative' },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#222' },
  avatarEditIcon: {
    position: 'absolute', right: 0, bottom: 0, backgroundColor: '#181818',
    borderRadius: 12, padding: 3, borderWidth: 2, borderColor: '#FFD700',
  },
  label: { color: '#FFD700', fontWeight: '600', fontSize: 15, marginTop: 16 },
  input: {
    color: '#fff', backgroundColor: '#232323', padding: 10, borderRadius: 12,
    marginTop: 6, fontSize: 16, marginBottom: 2,
  },
  themeRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 14 },
  themeCircle: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center', marginHorizontal: 4,
  },
  privacyRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 22, marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 28, marginBottom: 60,
  },
  saveBtn: {
    backgroundColor: '#FFD700', paddingVertical: 12, paddingHorizontal: 36,
    borderRadius: 16, minWidth: 120, alignItems: 'center',
  },
  saveBtnText: { color: '#181818', fontWeight: '700', fontSize: 16 },
  cancelBtn: {
    paddingVertical: 12, paddingHorizontal: 28, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#FFD700', minWidth: 110,
    alignItems: 'center', marginLeft: 10, backgroundColor: 'transparent',
  },
  cancelBtnText: { color: '#FFD700', fontWeight: '600', fontSize: 16 },
});
