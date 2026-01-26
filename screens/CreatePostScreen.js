import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { UserContext } from '../contexts/UserContext';
import { auth, db, uploadFileAsync, uploadImageAsync, isFirebaseReady } from '../firebase';

export default function CreatePostScreen({ navigation }) {
  const { user } = useContext(UserContext);
  const { theme } = useTheme();
  
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('text'); // 'text', 'photo', 'video', 'audio', 'poll'
  const [mediaType, setMediaType] = useState(null); // 'photo', 'video', 'audio'
  const [mediaUri, setMediaUri] = useState(null);
  const [mediaUrl, setMediaUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  // Poll state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDuration, setPollDuration] = useState(7); // days

  const ensureLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Media library access is needed to pick media.');
      return false;
    }
    return true;
  };

  const ensureCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed to take photos/videos.');
      return false;
    }
    return true;
  };

  const pickPhoto = async () => {
    try {
      const ok = await ensureLibraryPermission();
      if (!ok) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setMediaType('photo');
        setMediaUri(result.assets[0].uri);
        setMediaUrl(null);
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', 'Failed to pick photo. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const ok = await ensureCameraPermission();
      if (!ok) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setMediaType('photo');
        setMediaUri(result.assets[0].uri);
        setMediaUrl(null);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickVideo = async () => {
    try {
      const ok = await ensureLibraryPermission();
      if (!ok) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Videos || 'videos',
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setMediaType('video');
        setMediaUri(result.assets[0].uri);
        setMediaUrl(null);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  };

  const takeVideo = async () => {
    try {
      const ok = await ensureCameraPermission();
      if (!ok) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Videos || 'videos',
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setMediaType('video');
        setMediaUri(result.assets[0].uri);
        setMediaUrl(null);
      }
    } catch (error) {
      console.error('Error taking video:', error);
      Alert.alert('Error', 'Failed to take video. Please try again.');
    }
  };

  const pickAudio = async () => {
    try {
      const ok = await ensureLibraryPermission();
      if (!ok) return;

      // Use ImagePicker to select audio files
      // Note: On some platforms, this may require using expo-document-picker
      // For now, we'll use ImagePicker which supports audio on most platforms
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.All || 'all',
        allowsEditing: false,
        quality: 1,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Check if it's an audio file
        if (asset.type === 'audio' || asset.uri.endsWith('.mp3') || asset.uri.endsWith('.m4a') || asset.uri.endsWith('.wav')) {
          setMediaType('audio');
          setMediaUri(asset.uri);
          setMediaUrl(null); // Will be set after upload
          console.log('✅ Audio file selected:', asset.uri);
        } else {
          Alert.alert('Invalid File', 'Please select an audio file (MP3, M4A, or WAV).');
        }
      }
    } catch (error) {
      console.error('Error picking audio:', error);
      Alert.alert('Error', `Failed to pick audio file: ${error.message || 'Please try again.'}`);
    }
  };

  const removeMedia = () => {
    setMediaType(null);
    setMediaUri(null);
    setMediaUrl(null);
  };

  const uploadMedia = async () => {
    if (!mediaUri) return null;

    setUploading(true);
    try {
      let downloadURL;
      
      if (mediaType === 'photo') {
        downloadURL = await uploadImageAsync(mediaUri, 'posts', 1920);
      } else if (mediaType === 'video') {
        downloadURL = await uploadFileAsync(mediaUri, 'posts', 'video');
      } else if (mediaType === 'audio') {
        downloadURL = await uploadFileAsync(mediaUri, 'posts', 'audio');
      }

      if (downloadURL) {
        setMediaUrl(downloadURL);
        return downloadURL;
      }
      return null;
    } catch (error) {
      console.error('Error uploading media:', error);
      Alert.alert('Upload failed', 'Failed to upload media. Please try again.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !mediaUri) {
      Alert.alert('Empty post', 'Please add some content or media to your post.');
      return;
    }

    setPosting(true);
    try {
      // Upload media first if present
      let uploadedMediaUrl = null;
      if (mediaUri && !mediaUrl) {
        uploadedMediaUrl = await uploadMedia();
        if (!uploadedMediaUrl && mediaType) {
          Alert.alert('Upload failed', 'Failed to upload media. Please try again.');
          setPosting(false);
          return;
        }
      } else if (mediaUrl) {
        uploadedMediaUrl = mediaUrl;
      }

      // Create post in Firestore
      const uid = auth.currentUser?.uid;
      if (!uid) {
        throw new Error('Not authenticated');
      }

      const postData = {
        userId: uid,
        userDisplayName: user?.displayName || 'User',
        userAvatarUrl: user?.avatarUrl || user?.photoURL || '',
        content: content.trim(),
        type: mediaType || 'text',
        mediaUrl: uploadedMediaUrl || null,
        imageUrl: mediaType === 'photo' ? (uploadedMediaUrl || null) : null,
        media: uploadedMediaUrl || null,
        likes: 0,
        comments: 0,
        createdAt: serverTimestamp(),
      };

      // Check if Firestore is ready
      if (!isFirebaseReady() || !db) {
        throw new Error('Database not ready. Please try again.');
      }

      // Real Firestore - create post
      await addDoc(collection(db, 'posts'), postData);

      Alert.alert('Success', 'Post created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating post:', error);
      const errorMessage = error?.message || 'Unknown error';
      const friendlyMessage = errorMessage.includes('permission') 
        ? 'You do not have permission to create posts. Please check your account status.'
        : errorMessage.includes('network') || errorMessage.includes('fetch')
        ? 'Network error. Please check your internet connection and try again.'
        : errorMessage.includes('not authenticated')
        ? 'You must be logged in to create posts. Please log in and try again.'
        : `Failed to create post: ${errorMessage}`;
      Alert.alert('Error', friendlyMessage);
    } finally {
      setPosting(false);
    }
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelButton}>
            <Text style={[styles.cancelText, { color: theme.subtext }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Create Post</Text>
          <TouchableOpacity
            onPress={handlePost}
            disabled={posting || uploading}
            style={[
              styles.postButton,
              { backgroundColor: theme.primary },
              (posting || uploading) && styles.postButtonDisabled,
            ]}
          >
            {posting || uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* User Info */}
          <View style={styles.userInfo}>
            <Image
              source={{
                uri: user?.avatarUrl || user?.photoURL || 'https://via.placeholder.com/40',
              }}
              style={styles.avatar}
            />
            <View>
              <Text style={[styles.userName, { color: theme.text }]}>
                {user?.displayName || 'User'}
              </Text>
              <Text style={[styles.userHandle, { color: theme.subtext }]}>
                @{user?.username || 'username'}
              </Text>
            </View>
          </View>

          {/* Content Input */}
          <TextInput
            style={[styles.contentInput, { color: theme.text, backgroundColor: theme.cardBackground }]}
            placeholder="What's on your mind?"
            placeholderTextColor={theme.subtext}
            multiline
            value={content}
            onChangeText={setContent}
            textAlignVertical="top"
          />

          {/* Media Preview */}
          {mediaUri && (
            <View style={styles.mediaPreview}>
              {mediaType === 'photo' && (
                <View style={styles.photoContainer}>
                  <Image source={{ uri: mediaUri }} style={styles.mediaImage} />
                  <TouchableOpacity style={styles.removeButton} onPress={removeMedia}>
                    <Ionicons name="close-circle" size={32} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
              {mediaType === 'video' && (
                <View style={styles.videoContainer}>
                  <View style={[styles.videoPlaceholder, { backgroundColor: theme.cardBackground }]}>
                    <Ionicons name="videocam" size={64} color={theme.primary} />
                    <Text style={[styles.videoText, { color: theme.text }]}>Video selected</Text>
                    <Text style={[styles.videoSubtext, { color: theme.subtext }]}>Tap to play</Text>
                  </View>
                  <TouchableOpacity style={styles.removeButton} onPress={removeMedia}>
                    <Ionicons name="close-circle" size={32} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
              {mediaType === 'audio' && (
                <View style={[styles.audioContainer, { backgroundColor: theme.cardBackground }]}>
                  <Ionicons name="musical-notes" size={48} color={theme.primary} />
                  <Text style={[styles.audioText, { color: theme.text }]}>Audio file selected</Text>
                  <TouchableOpacity style={styles.removeButton} onPress={removeMedia}>
                    <Ionicons name="close-circle" size={32} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Media Options */}
          <View style={styles.mediaOptions}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Add Media</Text>
            <View style={styles.mediaButtons}>
              <TouchableOpacity
                style={[styles.mediaButton, { backgroundColor: theme.cardBackground }]}
                onPress={pickPhoto}
                disabled={uploading || posting}
              >
                <Ionicons name="image-outline" size={24} color={theme.primary} />
                <Text style={[styles.mediaButtonText, { color: theme.text }]}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mediaButton, { backgroundColor: theme.cardBackground }]}
                onPress={takePhoto}
                disabled={uploading || posting}
              >
                <Ionicons name="camera-outline" size={24} color={theme.primary} />
                <Text style={[styles.mediaButtonText, { color: theme.text }]}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mediaButton, { backgroundColor: theme.cardBackground }]}
                onPress={pickVideo}
                disabled={uploading || posting}
              >
                <Ionicons name="videocam-outline" size={24} color={theme.primary} />
                <Text style={[styles.mediaButtonText, { color: theme.text }]}>Video</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mediaButton, { backgroundColor: theme.cardBackground }]}
                onPress={takeVideo}
                disabled={uploading || posting}
              >
                <Ionicons name="videocam" size={24} color={theme.primary} />
                <Text style={[styles.mediaButtonText, { color: theme.text }]}>Record</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mediaButton, { backgroundColor: theme.cardBackground }]}
                onPress={pickAudio}
                disabled={uploading || posting}
              >
                <Ionicons name="musical-notes-outline" size={24} color={theme.primary} />
                <Text style={[styles.mediaButtonText, { color: theme.text }]}>Audio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userHandle: {
    fontSize: 14,
  },
  contentInput: {
    minHeight: 120,
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  mediaPreview: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoContainer: {
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  videoContainer: {
    position: 'relative',
  },
  videoPlaceholder: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  videoSubtext: {
    marginTop: 4,
    fontSize: 12,
  },
  audioContainer: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  audioText: {
    marginTop: 8,
    fontSize: 14,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
  },
  mediaOptions: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  mediaButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaButton: {
    flex: 1,
    minWidth: '30%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaButtonText: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
});

