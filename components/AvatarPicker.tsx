// AvatarPicker.tsx
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { uploadImageAsync } from '../firebase';

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
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'images',
        allowsEditing: true, // enables square crop UI on iOS
        aspect: [1, 1],
        quality: 0.9,
      });
      if (res.canceled || !res.assets?.length) return;

      const asset = res.assets[0];
      const uri = asset.uri;

      setUploading(true);

      // 2) Upload using mock Firebase
      const downloadURL = await uploadImageAsync(uri);

      // 3) Bust any stale caches in <Image> by changing its key/uri param
      setCacheBust(Date.now());
      Alert.alert('Success', 'Avatar updated. (Mock)');
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
          source={displayUrl ? { uri: displayUrl } : require('../assets/images/icon.png')}
          style={{ width: 120, height: 120, borderRadius: 60 }}
        />
      </Pressable>
      <Text>{uploading ? 'Uploading…' : 'Tap to change avatar'}</Text>
    </View>
  );
}
