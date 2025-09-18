// AvatarPicker.tsx
import * as ImagePicker from 'expo-image-picker';
import { getApp } from 'firebase/app';
import { getAuth, updateProfile } from 'firebase/auth';
import { doc, getFirestore, updateDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytesResumable } from 'firebase/storage';
import React, { useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';

export default function AvatarPicker({ currentUrl }: { currentUrl?: string }) {
  const [uploading, setUploading] = useState(false);
  const [cacheBust, setCacheBust] = useState(Date.now());

  const pickAndUpload = async () => {
    try {
      // 1) Ask permission & pick
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow photo library access.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, // enables square crop UI on iOS
        aspect: [1, 1],
        quality: 0.9,
      });
      if (res.canceled || !res.assets?.length) return;

      const asset = res.assets[0];
      const uri = asset.uri;
      const mime = asset.mimeType || 'image/jpeg'; // Expo provides this for most images

      setUploading(true);

      // 2) Convert to blob
      const blob = await (await fetch(uri)).blob();

      // 3) Build a safe path & filename
      const app = getApp();
      const auth = getAuth(app);
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('Not signed in');

      const storage = getStorage(app);
      const ts = Date.now();
      const ext = mime.includes('png') ? 'png' : 'jpg';
      const storageRef = ref(storage, `avatars/${uid}/avatar_${ts}.${ext}`);

      // 4) Upload with resumable + contentType
      const task = uploadBytesResumable(storageRef, blob, { contentType: mime });

      await new Promise<void>((resolve, reject) => {
        task.on(
          'state_changed',
          // optional: progress => console.log(progress.bytesTransferred / progress.totalBytes),
          undefined,
          (err) => reject(err),
          () => resolve()
        );
      });

      // 5) Get URL and save to profile (Auth + Firestore)
      const downloadURL = await getDownloadURL(task.snapshot.ref);

      // Tight coupling: keep both Auth.displayName/photoURL and Firestore in sync
      await updateProfile(auth.currentUser!, { photoURL: downloadURL });

      const db = getFirestore(app);
      await updateDoc(doc(db, 'users', uid), { photoURL: downloadURL, photoUpdatedAt: ts });

      // 6) Bust any stale caches in <Image> by changing its key/uri param
      setCacheBust(Date.now());
      Alert.alert('Success', 'Avatar updated.');
    } catch (e: any) {
      console.error('Avatar upload failed:', e?.message || e);
      Alert.alert('Upload failed', e?.message || 'Unknown error');
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = currentUrl ? `${currentUrl}${currentUrl.includes('?') ? '&' : '?'}t=${cacheBust}` : undefined;

  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <Pressable onPress={pickAndUpload} disabled={uploading} style={{ opacity: uploading ? 0.5 : 1 }}>
        <Image
          key={cacheBust}
          source={displayUrl ? { uri: displayUrl } : require('../assets/avatar-placeholder.png')}
          style={{ width: 120, height: 120, borderRadius: 60 }}
        />
      </Pressable>
      <Text>{uploading ? 'Uploading…' : 'Tap to change avatar'}</Text>
    </View>
  );
}
