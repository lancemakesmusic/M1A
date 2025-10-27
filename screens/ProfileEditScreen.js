import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useContext, useEffect, useState } from 'react';
import {
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
import { auth, uploadImageAsync } from '../firebase';

export default function ProfileEditScreen({ navigation }) {
  const { user, updateUserProfile } = useContext(UserContext);
  const { theme, toggleTheme } = useTheme();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [website, setWebsite] = useState(user?.website ?? '');
  const [socials, setSocials] = useState(user?.socials ?? {});
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? user?.photoURL ?? '');
  const [coverUrl, setCoverUrl] = useState(user?.coverUrl ?? '');
  const [privateProfile, setPrivateProfile] = useState(!!user?.private);
  const [showOnlineStatus, setShowOnlineStatus] = useState(user?.showOnlineStatus ?? true);
  const [allowMessages, setAllowMessages] = useState(user?.allowMessages ?? true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');

  // Cache-busting to force <Image> refresh after upload
  const [cacheBust, setCacheBust] = useState(Date.now());
  const cacheBusted = avatarUrl ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}t=${cacheBust}` : '';
  const coverCacheBusted = coverUrl ? `${coverUrl}${coverUrl.includes('?') ? '&' : '?'}t=${cacheBust}` : '';

  useEffect(() => {
    // Keep local state in sync if context updates
    setAvatarUrl(user?.avatarUrl ?? user?.photoURL ?? '');
    setCoverUrl(user?.coverUrl ?? '');
  }, [user?.avatarUrl, user?.photoURL, user?.coverUrl]);

  const ensureLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Media library access is needed to pick images.');
      return false;
    }
    return true;
  };

  const uploadImage = async (uri, path, isCover = false) => {
    if (!auth.currentUser?.uid) throw new Error('Not signed in');

    // Resize & compress
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: isCover ? 1200 : 1024 } }],
      { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Upload using mock Firebase
    const downloadURL = await uploadImageAsync(manipulated.uri);
    return downloadURL;
  };

  const onPickAvatar = async () => {
    try {
      const ok = await ensureLibraryPermission();
      if (!ok) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled) return;

      const localUri = result.assets?.[0]?.uri;
      if (!localUri) return;

      setSaving(true);
      const downloadURL = await uploadImage(localUri, 'avatars');

      // Update Auth profile (mock)
      console.log('Mock updateProfile:', { photoURL: downloadURL });

      // Update Firestore (mock)
      console.log('Mock updateDoc:', {
        photoURL: downloadURL,
        avatarUrl: downloadURL,
        photoUpdatedAt: Date.now(),
      });

      setAvatarUrl(downloadURL);
      setCacheBust(Date.now());
      Alert.alert('Success', 'Avatar updated!');
    } catch (e) {
      console.error('[Avatar Upload Error]', e);
      Alert.alert('Upload failed', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onPickCover = async () => {
    try {
      const ok = await ensureLibraryPermission();
      if (!ok) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 1],
        quality: 1,
      });
      if (result.canceled) return;

      const localUri = result.assets?.[0]?.uri;
      if (!localUri) return;

      setSaving(true);
      const downloadURL = await uploadImage(localUri, 'covers', true);

      // Update Firestore (mock)
      console.log('Mock updateDoc:', {
        coverUrl: downloadURL,
        coverUpdatedAt: Date.now(),
      });

      setCoverUrl(downloadURL);
      setCacheBust(Date.now());
      Alert.alert('Success', 'Cover photo updated!');
    } catch (e) {
      console.error('[Cover Upload Error]', e);
      Alert.alert('Upload failed', e?.message || 'Please try again.');
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
        <TouchableOpacity onPress={onPickAvatar} activeOpacity={0.8} disabled={saving}>
          {avatarUrl ? (
            <Image source={{ uri: cacheBusted }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.cardBackground }]}>
              <Ionicons name="camera" size={32} color={theme.subtext} />
            </View>
          )}
          <Text style={[styles.avatarLabel, { color: theme.primary }]}>
            {saving ? 'Uploading…' : 'Change Avatar'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cover Photo */}
      <View style={styles.coverSection}>
        <Text style={[styles.fieldLabel, { color: theme.text }]}>Cover Photo</Text>
        <TouchableOpacity onPress={onPickCover} activeOpacity={0.8} disabled={saving}>
          {coverUrl ? (
            <Image source={{ uri: coverCacheBusted }} style={styles.coverPreview} />
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
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
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
  coverPreview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
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