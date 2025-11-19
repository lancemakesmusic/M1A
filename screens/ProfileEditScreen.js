import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { UserContext } from '../contexts/UserContext';
import { auth, updateProfile, updateUserProfileInDB, uploadImageAsync } from '../firebase';

export default function ProfileEditScreen({ navigation }) {
  const { user, updateUserProfile, refreshUserProfile } = useContext(UserContext);
  const { theme, toggleTheme } = useTheme();
  
  // Track if we just uploaded a photo to force navigation refresh
  const [justUploadedPhoto, setJustUploadedPhoto] = useState(false);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [website, setWebsite] = useState(user?.website ?? '');
  const [socials, setSocials] = useState(user?.socials ?? {});
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? user?.photoURL ?? '');
  const [coverUrl, setCoverUrl] = useState(user?.coverUrl ?? '');
  const [localAvatarUri, setLocalAvatarUri] = useState(null); // Store local file URI for immediate display
  const [localCoverUri, setLocalCoverUri] = useState(null); // Store local file URI for immediate display
  const [privateProfile, setPrivateProfile] = useState(!!user?.private);
  const [showOnlineStatus, setShowOnlineStatus] = useState(user?.showOnlineStatus ?? true);
  const [allowMessages, setAllowMessages] = useState(user?.allowMessages ?? true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');

  // Cache-busting to force <Image> refresh after upload
  const [cacheBust, setCacheBust] = useState(Date.now());
  
  // Check if URL is a mock URL (for development/testing)
  const isMockUrl = (url) => url && (url.includes('mock-url.com') || url.includes('placeholder'));
  
  // Use local URI if available (immediate display), otherwise use uploaded URL
  const displayAvatarUrl = localAvatarUri || (avatarUrl && !isMockUrl(avatarUrl) ? avatarUrl : null);
  const displayCoverUrl = localCoverUri || (coverUrl && !isMockUrl(coverUrl) ? coverUrl : null);
  
  const cacheBusted = displayAvatarUrl ? `${displayAvatarUrl}${displayAvatarUrl.includes('?') ? '&' : '?'}t=${cacheBust}` : '';
  const coverCacheBusted = displayCoverUrl ? `${displayCoverUrl}${displayCoverUrl.includes('?') ? '&' : '?'}t=${cacheBust}` : '';

  useEffect(() => {
    // Keep local state in sync if context updates, but only if we're not currently uploading
    if (!uploadingAvatar && !uploadingCover) {
      const newAvatarUrl = user?.avatarUrl ?? user?.photoURL ?? '';
      const newCoverUrl = user?.coverUrl ?? '';
      
      // Only update if different (avoid clearing local URIs unnecessarily)
      if (newAvatarUrl !== avatarUrl) {
        setAvatarUrl(newAvatarUrl);
        // Clear local URI if we have a real uploaded URL (not mock)
        if (newAvatarUrl && !isMockUrl(newAvatarUrl)) {
          setLocalAvatarUri(null);
        }
      }
      if (newCoverUrl !== coverUrl) {
        setCoverUrl(newCoverUrl);
        // Clear local URI if we have a real uploaded URL (not mock)
        if (newCoverUrl && !isMockUrl(newCoverUrl)) {
          setLocalCoverUri(null);
        }
      }
    }
  }, [user?.avatarUrl, user?.photoURL, user?.coverUrl, uploadingAvatar, uploadingCover]);

  const ensureLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Media library access is needed to pick images.');
      return false;
    }
    return true;
  };

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const onPickAvatar = async () => {
    try {
      const ok = await ensureLibraryPermission();
      if (!ok) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled) return;

      const localUri = result.assets?.[0]?.uri;
      if (!localUri) return;

      // Show image immediately using local URI
      setLocalAvatarUri(localUri);
      setCacheBust(Date.now());
      
      setUploadingAvatar(true);
      
      console.log('[Avatar Upload] Starting upload...', localUri);
      
      // Upload to Firebase Storage
      const downloadURL = await uploadImageAsync(localUri, 'avatars', 1024);
      
      console.log('[Avatar Upload] Upload complete, URL:', downloadURL);
      
      if (!downloadURL) {
        throw new Error('Upload failed - no URL returned');
      }

      // Update Firebase Auth profile photo
      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, { photoURL: downloadURL });
        } catch (err) {
          console.warn('Failed to update auth profile photo:', err);
        }
      }

      // Update Firestore user profile
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          // Use serverTimestamp for Firestore, or Date.now() for mock
          const timestamp = Date.now();
          await updateUserProfileInDB(uid, {
            avatarUrl: downloadURL,
            photoURL: downloadURL,
            photoUpdatedAt: timestamp,
          });
          console.log('[Avatar Upload] Profile updated in Firestore with timestamp:', timestamp);
        } catch (err) {
          console.error('Failed to update Firestore profile:', err);
          Alert.alert('Warning', 'Photo uploaded but profile update failed. Please try again.');
        }
      }

      // Update local state - keep local URI if mock URL, otherwise use uploaded URL
      const newCacheBust = Date.now();
      if (isMockUrl(downloadURL)) {
        // Keep using local URI for mock Firebase
        setAvatarUrl(downloadURL); // Still save to Firestore for persistence
      } else {
        // Use uploaded URL for real Firebase
        setAvatarUrl(downloadURL);
        setLocalAvatarUri(null); // Clear local URI since we have real URL
      }
      setCacheBust(newCacheBust);
      
      // Force a small delay to ensure state update propagates
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Single refresh call - debounced in UserContext
      if (refreshUserProfile) {
        await refreshUserProfile();
      }
      
      // Force another cache bust to ensure image refreshes
      setCacheBust(Date.now());
      
      // Update local context state immediately
      if (updateUserProfile) {
        // This ensures the context has the latest data
        await updateUserProfile({});
      }
      
      setJustUploadedPhoto(true);
      Alert.alert('Success', 'Profile photo updated!', [
        {
          text: 'View Profile',
          onPress: async () => {
            // Navigate to profile screen
            navigation.navigate('ProfileMain');
            setJustUploadedPhoto(false);
          }
        },
        {
          text: 'Continue Editing',
          style: 'cancel',
          onPress: () => setJustUploadedPhoto(false)
        }
      ]);
    } catch (e) {
      console.error('[Avatar Upload Error]', e);
      // Keep local URI visible even if upload fails
      // setLocalAvatarUri remains set so image still displays
      Alert.alert('Upload failed', e?.message || 'Please try again. The image is still visible but may not persist.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onPickCover = async () => {
    try {
      const ok = await ensureLibraryPermission();
      if (!ok) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'images',
        allowsEditing: true,
        aspect: [3, 1],
        quality: 0.9,
      });
      if (result.canceled) return;

      const localUri = result.assets?.[0]?.uri;
      if (!localUri) return;

      // Show image immediately using local URI
      setLocalCoverUri(localUri);
      setCacheBust(Date.now());
      
      setUploadingCover(true);
      
      console.log('[Cover Upload] Starting upload...', localUri);
      
      // Upload to Firebase Storage
      const downloadURL = await uploadImageAsync(localUri, 'covers', 1200);
      
      console.log('[Cover Upload] Upload complete, URL:', downloadURL);
      
      if (!downloadURL) {
        throw new Error('Upload failed - no URL returned');
      }

      // Update Firestore user profile
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          // Use serverTimestamp for Firestore, or Date.now() for mock
          const timestamp = Date.now();
          await updateUserProfileInDB(uid, {
            coverUrl: downloadURL,
            coverUpdatedAt: timestamp,
          });
          console.log('[Cover Upload] Profile updated in Firestore with timestamp:', timestamp);
        } catch (err) {
          console.error('Failed to update Firestore profile:', err);
          Alert.alert('Warning', 'Photo uploaded but profile update failed. Please try again.');
        }
      }

      // Update local state - keep local URI if mock URL, otherwise use uploaded URL
      const newCacheBust = Date.now();
      if (isMockUrl(downloadURL)) {
        // Keep using local URI for mock Firebase
        setCoverUrl(downloadURL); // Still save to Firestore for persistence
      } else {
        // Use uploaded URL for real Firebase
        setCoverUrl(downloadURL);
        setLocalCoverUri(null); // Clear local URI since we have real URL
      }
      setCacheBust(newCacheBust);
      
      // Force a small delay to ensure state update propagates
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Single refresh call - debounced in UserContext
      if (refreshUserProfile) {
        await refreshUserProfile();
      }
      
      // Force another cache bust to ensure image refreshes
      setCacheBust(Date.now());
      
      // Update local context state immediately
      if (updateUserProfile) {
        // This ensures the context has the latest data
        await updateUserProfile({});
      }
      
      setJustUploadedPhoto(true);
      Alert.alert('Success', 'Cover photo updated!', [
        {
          text: 'View Profile',
          onPress: async () => {
            // Navigate to profile screen
            navigation.navigate('ProfileMain');
            setJustUploadedPhoto(false);
          }
        },
        {
          text: 'Continue Editing',
          style: 'cancel',
          onPress: () => setJustUploadedPhoto(false)
        }
      ]);
    } catch (e) {
      console.error('[Cover Upload Error]', e);
      // Keep local URI visible even if upload fails
      // setLocalCoverUri remains set so image still displays
      Alert.alert('Upload failed', e?.message || 'Please try again. The image is still visible but may not persist.');
    } finally {
      setUploadingCover(false);
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
      await updateUserProfile({
        displayName: name,
        username: uname,
        bio: bio?.trim?.() ?? '',
        location: location?.trim?.() ?? '',
        website: website?.trim?.() ?? '',
        avatarUrl: avatarUrl ?? '',
        coverUrl: coverUrl ?? '',
        socials: {
          instagram: socials?.instagram?.trim?.() ?? '',
          twitter: socials?.twitter?.trim?.() ?? '',
          facebook: socials?.facebook?.trim?.() ?? '',
          youtube: socials?.youtube?.trim?.() ?? '',
          linkedin: socials?.linkedin?.trim?.() ?? '',
          tiktok: socials?.tiktok?.trim?.() ?? '',
        },
        private: !!privateProfile,
        showOnlineStatus: !!showOnlineStatus,
        allowMessages: !!allowMessages,
      });
      navigation.goBack();
    } catch (e) {
      console.error('[Profile Save Error]', e);
      Alert.alert('Update failed', e?.code || e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const socialInput = (key, placeholder, icon) => (
    <View key={key} style={styles.socialInputContainer}>
      <View style={[styles.socialInputIcon, { backgroundColor: theme.primary + '20' }]}>
        <Ionicons name={icon} size={20} color={theme.primary} />
      </View>
      <TextInput
        style={[styles.socialInput, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
        placeholder={placeholder}
        placeholderTextColor={theme.subtext}
        autoCapitalize="none"
        value={socials?.[key] || ''}
        onChangeText={(t) => setSocials({ ...socials, [key]: t })}
      />
    </View>
  );

  const renderBasicInfo = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.primary }]}>Basic Information</Text>
      
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={onPickAvatar} activeOpacity={0.8} disabled={uploadingAvatar || saving}>
          {uploadingAvatar ? (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.cardBackground }]}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : displayAvatarUrl ? (
            <View style={styles.avatarContainer}>
              <Image 
                key={`avatar-${cacheBust}`}
                source={{ uri: cacheBusted }} 
                style={styles.avatar}
                onError={(e) => {
                  console.error('Avatar image load error:', e);
                  // Fallback to placeholder if image fails to load
                  setAvatarUrl('');
                }}
              />
              <View style={[styles.avatarOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                <Ionicons name="camera" size={24} color="#fff" />
              </View>
            </View>
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.cardBackground }]}>
              <Ionicons name="camera" size={32} color={theme.subtext} />
            </View>
          )}
          <Text style={[styles.avatarLabel, { color: theme.primary }]}>
            {uploadingAvatar ? 'Uploading…' : 'Change Profile Photo'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cover Photo */}
      <View style={styles.coverSection}>
        <Text style={[styles.fieldLabel, { color: theme.text }]}>Cover Photo</Text>
        <TouchableOpacity onPress={onPickCover} activeOpacity={0.8} disabled={uploadingCover || saving}>
          {uploadingCover ? (
            <View style={[styles.coverPlaceholder, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.coverPlaceholderText, { color: theme.subtext }]}>Uploading...</Text>
            </View>
          ) : displayCoverUrl ? (
            <View style={styles.coverContainer}>
              <Image 
                key={`cover-${cacheBust}`}
                source={{ uri: coverCacheBusted }} 
                style={styles.coverPreview}
                onError={(e) => {
                  console.error('Cover image load error:', e);
                  // Fallback to placeholder if image fails to load
                  setCoverUrl('');
                }}
              />
              <View style={[styles.coverOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                <Ionicons name="camera" size={24} color="#fff" />
                <Text style={styles.coverOverlayText}>Change Cover</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Ionicons name="image" size={32} color={theme.subtext} />
              <Text style={[styles.coverPlaceholderText, { color: theme.subtext }]}>Add Cover Photo</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Basic Fields */}
      <View style={styles.inputGroup}>
        <Text style={[styles.fieldLabel, { color: theme.text }]}>Display Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
          placeholder="Your display name"
          placeholderTextColor={theme.subtext}
          value={displayName}
          onChangeText={setDisplayName}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.fieldLabel, { color: theme.text }]}>Username *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
          placeholder="username"
          placeholderTextColor={theme.subtext}
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.fieldLabel, { color: theme.text }]}>Bio</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
          placeholder="Tell us about yourself..."
          placeholderTextColor={theme.subtext}
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={160}
        />
        <Text style={[styles.charCount, { color: theme.subtext }]}>{bio.length}/160</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.fieldLabel, { color: theme.text }]}>Location</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
          placeholder="City, Country"
          placeholderTextColor={theme.subtext}
          value={location}
          onChangeText={setLocation}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.fieldLabel, { color: theme.text }]}>Website</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
          placeholder="https://yourwebsite.com"
          placeholderTextColor={theme.subtext}
          autoCapitalize="none"
          value={website}
          onChangeText={setWebsite}
        />
      </View>

      {/* Theme Switch */}
      <View style={[styles.settingRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>Dark Theme</Text>
          <Text style={[styles.settingDescription, { color: theme.subtext }]}>
            Switch between light and dark mode
          </Text>
        </View>
        <Switch 
          value={theme.isDark} 
          onValueChange={toggleTheme}
          trackColor={{ false: theme.border, true: theme.primary + '40' }}
          thumbColor={theme.isDark ? theme.primary : theme.subtext}
        />
      </View>
    </View>
  );

  const renderSocialLinks = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.primary }]}>Social Links</Text>
      <Text style={[styles.sectionSubtitle, { color: theme.subtext }]}>
        Connect your social media accounts
      </Text>
      
      {socialInput('instagram', 'Instagram username or URL', 'logo-instagram')}
      {socialInput('twitter', 'Twitter/X username or URL', 'logo-twitter')}
      {socialInput('facebook', 'Facebook profile URL', 'logo-facebook')}
      {socialInput('youtube', 'YouTube channel URL', 'logo-youtube')}
      {socialInput('linkedin', 'LinkedIn profile URL', 'logo-linkedin')}
      {socialInput('tiktok', 'TikTok username or URL', 'logo-tiktok')}
    </View>
  );

  const renderPrivacySettings = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.primary }]}>Privacy & Security</Text>
      
      <View style={[styles.settingRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>Private Profile</Text>
          <Text style={[styles.settingDescription, { color: theme.subtext }]}>
            Only approved followers can see your posts
          </Text>
        </View>
        <Switch 
          value={privateProfile} 
          onValueChange={setPrivateProfile}
          trackColor={{ false: theme.border, true: theme.primary + '40' }}
          thumbColor={privateProfile ? theme.primary : theme.subtext}
        />
      </View>

      <View style={[styles.settingRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>Show Online Status</Text>
          <Text style={[styles.settingDescription, { color: theme.subtext }]}>
            Let others see when you&apos;re online
          </Text>
        </View>
        <Switch 
          value={showOnlineStatus} 
          onValueChange={setShowOnlineStatus}
          trackColor={{ false: theme.border, true: theme.primary + '40' }}
          thumbColor={showOnlineStatus ? theme.primary : theme.subtext}
        />
      </View>

      <View style={[styles.settingRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>Allow Messages</Text>
          <Text style={[styles.settingDescription, { color: theme.subtext }]}>
            Let others send you direct messages
          </Text>
        </View>
        <Switch 
          value={allowMessages} 
          onValueChange={setAllowMessages}
          trackColor={{ false: theme.border, true: theme.primary + '40' }}
          thumbColor={allowMessages ? theme.primary : theme.subtext}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Profile</Text>
          <TouchableOpacity 
            onPress={onSave}
            disabled={saving}
            style={[styles.saveButton, { opacity: saving ? 0.5 : 1 }]}
          >
            <Text style={[styles.saveButtonText, { color: theme.primary }]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeSection === 'basic' && { borderBottomColor: theme.primary }]}
            onPress={() => setActiveSection('basic')}
          >
            <Text style={[styles.tabText, { color: activeSection === 'basic' ? theme.primary : theme.subtext }]}>
              Basic
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeSection === 'social' && { borderBottomColor: theme.primary }]}
            onPress={() => setActiveSection('social')}
          >
            <Text style={[styles.tabText, { color: activeSection === 'social' ? theme.primary : theme.subtext }]}>
              Social
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeSection === 'privacy' && { borderBottomColor: theme.primary }]}
            onPress={() => setActiveSection('privacy')}
          >
            <Text style={[styles.tabText, { color: activeSection === 'privacy' ? theme.primary : theme.subtext }]}>
              Privacy
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {activeSection === 'basic' && renderBasicInfo()}
          {activeSection === 'social' && renderSocialLinks()}
          {activeSection === 'privacy' && renderPrivacySettings()}
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
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  avatarLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  coverSection: {
    marginBottom: 24,
  },
  coverContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverPreview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  coverOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  coverPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderText: {
    fontSize: 14,
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  socialInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  socialInputIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  socialInput: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});