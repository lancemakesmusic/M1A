// screens/ProfileEditScreen.js
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useContext, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { UserContext } from '../contexts/UserContext';
import { auth } from '../firebase';

// Firebase (v10)
import { updateProfile } from 'firebase/auth';
import { doc, getFirestore, updateDoc } from 'firebase/firestore';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';

export default function ProfileEditScreen({ navigation }) {
  const { user, updateUserProfile } = useContext(UserContext);

  const [displayName, setDisplayName]   = useState(user?.displayName ?? '');
  const [username, setUsername]         = useState(user?.username ?? '');
  const [bio, setBio]                   = useState(user?.bio ?? '');
  const [socials, setSocials]           = useState(user?.socials ?? {});
  const [avatarUrl, setAvatarUrl]       = useState(user?.avatarUrl ?? user?.photoURL ?? '');
  const [privateProfile, setPrivateProfile] = useState(!!user?.private);
  const [saving, setSaving] = useState(false);

  // cache-busting to force <Image> refresh after upload
  const [cacheBust, setCacheBust] = useState(Date.now());
  const cacheBusted = avatarUrl ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}t=${cacheBust}` : '';

  useEffect(() => {
    // keep local state in sync if context updates
    setAvatarUrl(user?.avatarUrl ?? user?.photoURL ?? '');
  }, [user?.avatarUrl, user?.photoURL]);

  const ensureLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Media library access is needed to pick an avatar.');
      return false;
    }
    return true;
  };

  const onPickImage = async () => {
    try {
      const ok = await ensureLibraryPermission();
      if (!ok) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        // SDK 53: array form is valid
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled) return;

      const localUri = result.assets?.[0]?.uri;
      const mime = result.assets?.[0]?.mimeType || 'image/jpeg';
      if (!localUri) return;

      // Resize & compress to stay small and consistent
      const manipulated = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
      );

      if (!auth.currentUser?.uid) throw new Error('Not signed in');
      setSaving(true);

      const uid = auth.currentUser.uid;
      const storage = getStorage();
      const ts = Date.now();
      const ext = mime.includes('png') ? 'png' : 'jpg';
      const storageRef = ref(storage, `avatars/${uid}/avatar_${ts}.${ext}`);

      // Convert to blob via fetch (works reliably in Expo)
      const blob = await (await fetch(manipulated.uri)).blob();

      // Upload with contentType; resumable for reliability
      const task = uploadBytesResumable(storageRef, blob, { contentType: mime });

      await new Promise((resolve, reject) => {
        task.on('state_changed', undefined, reject, resolve);
      });

      const downloadURL = await getDownloadURL(task.snapshot.ref);

      // Update Auth profile immediately (keeps other parts of app in sync)
      await updateProfile(auth.currentUser, { photoURL: downloadURL });

      // Update Firestore user doc immediately (if you store it there)
      const db = getFirestore();
      await updateDoc(doc(db, 'users', uid), {
        photoURL: downloadURL,
        avatarUrl: downloadURL,      // keep both fields in case you read either
        photoUpdatedAt: ts,
      });

      // Local state + cache-bust so <Image> refreshes
      setAvatarUrl(downloadURL);
      setCacheBust(Date.now());

      Alert.alert('Success', 'Avatar updated!');
    } catch (e) {
      const code = e?.code;
      const msg = e?.message;
      const resp = e?.serverResponse || e?.customData?.serverResponse;
      console.error('[Avatar Upload Error]', { code, msg, resp: String(resp || '') });
      Alert.alert('Upload failed', msg || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onSave = async () => {
    const name = displayName.trim();
    const uname = username.trim();
    if (!name || !uname) {
      Alert.alert('Missing info', 'Display name and username are required.');
      return;
    }
    setSaving(true);
    try {
      // Persist your profile fields via context helper
      await updateUserProfile({
        displayName: name,
        username: uname,
        bio: bio?.trim?.() ?? '',
        avatarUrl: avatarUrl ?? '',
        socials: {
          instagram: socials?.instagram?.trim?.() ?? '',
          twitter: socials?.twitter?.trim?.() ?? '',
          facebook: socials?.facebook?.trim?.() ?? '',
          youtube: socials?.youtube?.trim?.() ?? '',
        },
        private: !!privateProfile,
      });
      navigation.goBack();
    } catch (e) {
      console.error('[Profile Save Error]', e);
      Alert.alert('Update failed', e?.code || e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const socialInput = (key, placeholder) => (
    <TextInput
      key={key}
      style={styles.input}
      placeholder={placeholder}
      autoCapitalize="none"
      value={socials?.[key] || ''}
      onChangeText={(t) => setSocials({ ...socials, [key]: t })}
    />
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onPickImage} activeOpacity={0.8} disabled={saving}>
        {avatarUrl ? (
          <Image source={{ uri: cacheBusted }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        )}
        <Text style={styles.link}>{saving ? 'Uploading…' : 'Change Avatar'}</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Display Name"
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={[styles.input, { height: 100 }]}
        placeholder="Bio"
        value={bio}
        onChangeText={setBio}
        multiline
      />

      <Text style={styles.section}>Social Links</Text>
      {socialInput('instagram', 'Instagram URL')}
      {socialInput('twitter', 'Twitter / X URL')}
      {socialInput('facebook', 'Facebook URL')}
      {socialInput('youtube', 'YouTube URL')}

      <View style={styles.row}>
        <Text>Private Profile</Text>
        <Switch value={privateProfile} onValueChange={setPrivateProfile} />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && { opacity: 0.7 }]}
        onPress={onSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff' },
  avatar: { width: 120, height: 120, borderRadius: 60, alignSelf: 'center', marginBottom: 8 },
  avatarPlaceholder: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#eee',
    alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  avatarText: { fontSize: 48 },
  link: { textAlign: 'center', color: '#007aff', marginBottom: 16 },
  input: { backgroundColor: '#f1f1f1', padding: 12, borderRadius: 8, marginBottom: 12 },
  section: { fontWeight: '700', marginTop: 8, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 16 },
  saveButton: { backgroundColor: '#007aff', padding: 14, borderRadius: 8, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});
