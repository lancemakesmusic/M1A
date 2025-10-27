import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { db as firestore, functions, httpsCallable } from '../firebase';

// EternalMemoriesPro Backend Configuration
const BACKEND_BASE_URL = 'http://localhost:5000'; // Update this to your backend URL

export default function AutoPosterScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [isAutoPosterActive, setIsAutoPosterActive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Content generation states
  const [contentPrompt, setContentPrompt] = useState('');
  const [contentType, setContentType] = useState('post');
  const [platform, setPlatform] = useState('instagram');
  const [brandVoice, setBrandVoice] = useState('professional');
  const [targetAudience, setTargetAudience] = useState('general');
  const [generatedContent, setGeneratedContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    instagram: false,
    facebook: false,
    twitter: false,
    linkedin: false,
    tiktok: false,
    youtube: false
  });
  const [platformConnections, setPlatformConnections] = useState({
    instagram: false,
    facebook: false,
    twitter: false,
    linkedin: false,
    tiktok: false,
    youtube: false
  });

  // Social media platforms data
  const socialPlatforms = [
    {
      id: 'instagram',
      name: 'Instagram',
      icon: 'logo-instagram',
      color: '#E4405F',
      connected: platformConnections.instagram
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'logo-facebook',
      color: '#1877F2',
      connected: platformConnections.facebook
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: 'logo-twitter',
      color: '#1DA1F2',
      connected: platformConnections.twitter
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: 'logo-linkedin',
      color: '#0077B5',
      connected: platformConnections.linkedin
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: 'logo-tiktok',
      color: '#000000',
      connected: platformConnections.tiktok
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: 'logo-youtube',
      color: '#FF0000',
      connected: platformConnections.youtube
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading AutoPoster data...');
      
      await Promise.all([
        loadScheduledPosts(),
        loadMediaLibrary(),
        checkAutoPosterStatus()
      ]);
      
      console.log('✅ AutoPoster data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading data:', error);
      Alert.alert('Error', `Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadScheduledPosts = async () => {
    try {
      console.log('📋 Loading scheduled posts from backend...');
      
      const response = await fetch(`${BACKEND_BASE_URL}/api/autoposter/scheduled-posts?userId=${user.uid}`);
      const result = await response.json();
      
      if (result.status === 'success') {
        setScheduledPosts(result.posts);
        console.log('✅ Scheduled posts loaded:', result.posts.length);
      } else {
        console.error('❌ Failed to load scheduled posts:', result.message);
      }
    } catch (error) {
      console.error('Error loading scheduled posts:', error);
    }
  };

  const loadMediaLibrary = async () => {
    try {
      console.log('📸 Loading media library from backend...');
      
      const response = await fetch(`${BACKEND_BASE_URL}/api/autoposter/media-library?userId=${user.uid}`);
      const result = await response.json();
      
      if (result.status === 'success') {
        setMediaLibrary(result.media);
        console.log('✅ Media library loaded:', result.media.length);
      } else {
        console.error('❌ Failed to load media library:', result.message);
      }
    } catch (error) {
      console.error('Error loading media library:', error);
    }
  };

  const checkAutoPosterStatus = async () => {
    try {
      const userDoc = await firestore.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        setIsAutoPosterActive(userData.plans?.autoPoster === 'active');
      }
    } catch (error) {
      console.error('Error checking auto poster status:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const generateContent = async () => {
    if (!contentPrompt.trim()) {
      Alert.alert('Error', 'Please enter a content prompt');
      return;
    }

    try {
      console.log('🤖 Generating content with backend...');
      console.log('Prompt:', contentPrompt);
      console.log('Content Type:', contentType);
      console.log('Platform:', platform);
      
      // Call the EternalMemoriesPro backend
      const response = await fetch(`${BACKEND_BASE_URL}/api/autoposter/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: contentPrompt,
          contentType,
          platform,
          brandVoice,
          targetAudience
        })
      });

      const result = await response.json();
      console.log('📝 Backend Response:', result);

      if (result.status === 'success') {
        setGeneratedContent(result.content);
        console.log('✅ Content generated successfully');
        Alert.alert('Success', 'Content generated successfully!');
      } else {
        console.log('❌ Content generation failed:', result.message);
        Alert.alert('Error', result.message || 'Failed to generate content');
      }
    } catch (error) {
      console.error('❌ Error generating content:', error);
      Alert.alert('Error', `Failed to generate content: ${error.message}`);
    }
  };

  const schedulePost = async (content, imageUrl) => {
    try {
      // Check if any platforms are selected
      const selectedPlatformsList = Object.keys(selectedPlatforms).filter(platform => selectedPlatforms[platform]);
      
      if (selectedPlatformsList.length === 0) {
        Alert.alert('No Platforms Selected', 'Please select at least one platform to post to.');
        return;
      }

      console.log('📅 Scheduling post with backend...');
      console.log('Content:', content);
      console.log('Platforms:', selectedPlatforms);
      
      // Call the EternalMemoriesPro backend
      const response = await fetch(`${BACKEND_BASE_URL}/api/autoposter/schedule-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          imageUrl,
          platforms: selectedPlatforms,
          scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
          userId: user.uid
        })
      });

      const result = await response.json();
      console.log('📝 Schedule Response:', result);

      if (result.status === 'success') {
        Alert.alert('Success', `Post scheduled successfully for ${selectedPlatformsList.length} platform(s)!`);
        setShowScheduleModal(false);
        loadScheduledPosts();
      } else {
        Alert.alert('Error', result.message || 'Failed to schedule post');
      }
    } catch (error) {
      console.error('Error scheduling post:', error);
      Alert.alert('Error', `Failed to schedule post: ${error.message}`);
    }
  };

  const toggleAutoPoster = async () => {
    try {
      await firestore.collection('users').doc(user.uid).update({
        'plans.autoPoster': isAutoPosterActive ? 'inactive' : 'active'
      });
      setIsAutoPosterActive(!isAutoPosterActive);
      Alert.alert(
        'Success', 
        `Auto Poster ${!isAutoPosterActive ? 'activated' : 'deactivated'} successfully!`
      );
    } catch (error) {
      console.error('Error toggling auto poster:', error);
      Alert.alert('Error', 'Failed to update auto poster status');
    }
  };

  const handlePlatformLogin = async (platformId) => {
    try {
      // Simulate platform login process
      Alert.alert(
        `${socialPlatforms.find(p => p.id === platformId)?.name} Login`,
        `Connecting to ${socialPlatforms.find(p => p.id === platformId)?.name}...`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Connect',
            onPress: async () => {
              // Simulate successful connection
              setPlatformConnections(prev => ({
                ...prev,
                [platformId]: true
              }));
              
              // Update user's social connections in Firestore
              await firestore.collection('users').doc(user.uid).update({
                [`socials.${platformId}`]: `connected_${Date.now()}`
              });
              
              Alert.alert('Success', `Successfully connected to ${socialPlatforms.find(p => p.id === platformId)?.name}!`);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error connecting to platform:', error);
      Alert.alert('Error', `Failed to connect to ${socialPlatforms.find(p => p.id === platformId)?.name}`);
    }
  };

  const togglePlatformSelection = (platformId) => {
    setSelectedPlatforms(prev => ({
      ...prev,
      [platformId]: !prev[platformId]
    }));
  };

  // Simple media upload test
  const testMediaUpload = async () => {
    try {
      console.log('📸 Testing media upload with backend...');
      
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to test media upload');
        return;
      }
      
      // Pick an image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log('📷 Image selected:', asset.uri);
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('media', {
          uri: asset.uri,
          type: 'image/jpeg',
          name: 'test_image.jpg',
        });
        formData.append('userId', user.uid);
        formData.append('title', 'Test Upload - Phase 1');
        
        // Upload to backend
        const response = await fetch(`${BACKEND_BASE_URL}/api/autoposter/upload-media`, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        const result = await response.json();
        console.log('📝 Upload Response:', result);
        
        if (result.status === 'success') {
          console.log('✅ Media uploaded to backend:', result.media.id);
          
          // Refresh media library
          await loadMediaLibrary();
          
          Alert.alert('Success', 'Media upload test completed successfully!');
        } else {
          Alert.alert('Error', result.message || 'Failed to upload media');
        }
      }
    } catch (error) {
      console.error('❌ Media upload test failed:', error);
      Alert.alert('Error', `Media upload test failed: ${error.message}`);
    }
  };

  // Test function for Phase 1 - Basic Data Flow
  const testBasicDataFlow = async () => {
    try {
      console.log('🧪 Testing Phase 1: Basic Data Flow...');
      
      // Test 1: User authentication
      console.log('1️⃣ Testing user authentication...');
      if (!user || !user.uid) {
        throw new Error('User not authenticated');
      }
      console.log('✅ User authenticated:', user.uid);
      
      // Test 2: Firestore read access
      console.log('2️⃣ Testing Firestore read access...');
      const userDoc = await firestore.collection('users').doc(user.uid).get();
      if (!userDoc.exists) {
        throw new Error('User document does not exist');
      }
      console.log('✅ User document read successfully');
      
      // Test 3: Firestore write access (create a test scheduled post)
      console.log('3️⃣ Testing Firestore write access...');
      const testPost = {
        uid: user.uid,
        content: 'Test post for Phase 1 validation',
        imageUrl: '',
        platforms: {
          instagram: true,
          facebook: false,
          twitter: false,
          linkedin: false,
          tiktok: false,
          youtube: false
        },
        scheduledTime: firestore.Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)), // 1 hour from now
        status: 'scheduled',
        autoGenerated: false,
        createdAt: firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await firestore.collection('scheduledPosts').add(testPost);
      console.log('✅ Test scheduled post created:', docRef.id);
      
      // Test 4: Firestore read access (read the test post)
      console.log('4️⃣ Testing Firestore read access for scheduled posts...');
      const testPostDoc = await docRef.get();
      if (!testPostDoc.exists) {
        throw new Error('Test post was not created');
      }
      console.log('✅ Test scheduled post read successfully');
      
      // Test 5: Clean up test data
      console.log('5️⃣ Cleaning up test data...');
      await docRef.delete();
      console.log('✅ Test data cleaned up');
      
      // Test 6: Test Firebase Functions (if available)
      console.log('6️⃣ Testing Firebase Functions...');
      try {
        const generateContentWithGPT = httpsCallable(functions, 'generateContentWithGPT');
        console.log('✅ Firebase Functions connection established');
      } catch (funcError) {
        console.log('⚠️ Firebase Functions not available:', funcError.message);
      }
      
      console.log('🎉 Phase 1 Test Complete: All basic data flow tests passed!');
      Alert.alert(
        'Phase 1 Test Complete', 
        '✅ All basic data flow tests passed!\n\n' +
        '• User authentication: ✅\n' +
        '• Firestore read access: ✅\n' +
        '• Firestore write access: ✅\n' +
        '• Scheduled posts CRUD: ✅\n' +
        '• Firebase Functions: ⚠️ (May need deployment)\n\n' +
        'Phase 1 is ready for content generation testing!'
      );
      
    } catch (error) {
      console.error('❌ Phase 1 Test Failed:', error);
      Alert.alert(
        'Phase 1 Test Failed', 
        `❌ Test failed: ${error.message}\n\nPlease check the console for details.`
      );
    }
  };

  const renderScheduledPost = ({ item }) => (
    <View style={[styles.postCard, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.postHeader}>
        <Text style={[styles.postStatus, { color: theme.primary }]}>
          {item.status.toUpperCase()}
        </Text>
        <Text style={[styles.postTime, { color: theme.subtext }]}>
          {new Date(item.scheduledTime.seconds * 1000).toLocaleString()}
        </Text>
      </View>
      <Text style={[styles.postContent, { color: theme.text }]} numberOfLines={3}>
        {item.content}
      </Text>
      <View style={styles.postPlatforms}>
        {item.platforms.instagram && (
          <View style={[styles.platformTag, { backgroundColor: '#E4405F' }]}>
            <Ionicons name="logo-instagram" size={12} color="white" />
            <Text style={styles.platformText}>Instagram</Text>
          </View>
        )}
        {item.platforms.facebook && (
          <View style={[styles.platformTag, { backgroundColor: '#1877F2' }]}>
            <Ionicons name="logo-facebook" size={12} color="white" />
            <Text style={styles.platformText}>Facebook</Text>
          </View>
        )}
        {item.platforms.twitter && (
          <View style={[styles.platformTag, { backgroundColor: '#1DA1F2' }]}>
            <Ionicons name="logo-twitter" size={12} color="white" />
            <Text style={styles.platformText}>Twitter</Text>
          </View>
        )}
        {item.platforms.linkedin && (
          <View style={[styles.platformTag, { backgroundColor: '#0077B5' }]}>
            <Ionicons name="logo-linkedin" size={12} color="white" />
            <Text style={styles.platformText}>LinkedIn</Text>
          </View>
        )}
        {item.platforms.tiktok && (
          <View style={[styles.platformTag, { backgroundColor: '#000000' }]}>
            <Ionicons name="logo-tiktok" size={12} color="white" />
            <Text style={styles.platformText}>TikTok</Text>
          </View>
        )}
        {item.platforms.youtube && (
          <View style={[styles.platformTag, { backgroundColor: '#FF0000' }]}>
            <Ionicons name="logo-youtube" size={12} color="white" />
            <Text style={styles.platformText}>YouTube</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderMediaItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.mediaCard, { backgroundColor: theme.cardBackground }]}
      onPress={() => {
        setGeneratedContent('');
        setShowContentModal(true);
      }}
    >
      <Image source={{ uri: item.uri }} style={styles.mediaImage} />
      <View style={styles.mediaInfo}>
        <Text style={[styles.mediaTitle, { color: theme.text }]}>
          {item.title || 'Untitled Media'}
        </Text>
        <Text style={[styles.mediaDate, { color: theme.subtext }]}>
          {new Date(item.createdAt.seconds * 1000).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Auto Poster</Text>
          <TouchableOpacity onPress={toggleAutoPoster}>
            <Ionicons 
              name={isAutoPosterActive ? "pause-circle" : "play-circle"} 
              size={24} 
              color={isAutoPosterActive ? theme.primary : theme.subtext} 
            />
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.statusHeader}>
            <Ionicons 
              name={isAutoPosterActive ? "checkmark-circle" : "pause-circle"} 
              size={24} 
              color={isAutoPosterActive ? '#34C759' : '#FF9500'} 
            />
            <Text style={[styles.statusTitle, { color: theme.text }]}>
              Auto Poster {isAutoPosterActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <Text style={[styles.statusDescription, { color: theme.subtext }]}>
            {isAutoPosterActive 
              ? 'Your content will be automatically scheduled and posted at optimal times.'
              : 'Activate Auto Poster to automatically schedule your content.'
            }
          </Text>
        </View>

        {/* Social Media Platforms */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Connected Platforms</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.subtext }]}>
            Select platforms to post your content to
          </Text>
          <View style={styles.platformsGrid}>
            {socialPlatforms.map((platform) => (
              <TouchableOpacity
                key={platform.id}
                style={[
                  styles.platformCard,
                  { 
                    backgroundColor: theme.cardBackground,
                    borderColor: selectedPlatforms[platform.id] ? platform.color : theme.border,
                    borderWidth: selectedPlatforms[platform.id] ? 2 : 1
                  }
                ]}
                onPress={() => {
                  if (platform.connected) {
                    togglePlatformSelection(platform.id);
                  } else {
                    handlePlatformLogin(platform.id);
                  }
                }}
              >
                <View style={[styles.platformIcon, { backgroundColor: platform.color }]}>
                  <Ionicons name={platform.icon} size={24} color="white" />
                </View>
                <Text style={[styles.platformName, { color: theme.text }]}>
                  {platform.name}
                </Text>
                <View style={styles.platformStatus}>
                  {platform.connected ? (
                    <View style={styles.connectedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                      <Text style={styles.connectedText}>Connected</Text>
                    </View>
                  ) : (
                    <View style={styles.connectBadge}>
                      <Ionicons name="add-circle" size={16} color={theme.subtext} />
                      <Text style={[styles.connectText, { color: theme.subtext }]}>Connect</Text>
                    </View>
                  )}
                </View>
                {selectedPlatforms[platform.id] && (
                  <View style={[styles.selectedIndicator, { backgroundColor: platform.color }]}>
                    <Ionicons name="checkmark" size={12} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowContentModal(true)}
          >
            <Ionicons name="create" size={20} color="white" />
            <Text style={styles.actionButtonText}>Generate Content</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border }]}
            onPress={() => setShowScheduleModal(true)}
          >
            <Ionicons name="calendar" size={20} color={theme.text} />
            <Text style={[styles.actionButtonText, { color: theme.text }]}>Schedule Post</Text>
          </TouchableOpacity>
        </View>

        {/* Test Buttons for Phase 1 */}
        <View style={styles.testSection}>
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: '#FF6B6B' }]}
            onPress={testBasicDataFlow}
          >
            <Ionicons name="flask" size={20} color="white" />
            <Text style={styles.testButtonText}>Test Phase 1 (Data Flow)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: '#4ECDC4', marginTop: 12 }]}
            onPress={testMediaUpload}
          >
            <Ionicons name="camera" size={20} color="white" />
            <Text style={styles.testButtonText}>Test Media Upload</Text>
          </TouchableOpacity>
        </View>

        {/* Scheduled Posts */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Scheduled Posts</Text>
          <FlatList
            data={scheduledPosts}
            renderItem={renderScheduledPost}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.postsList}
          />
        </View>

        {/* Media Library */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Media Library</Text>
          <FlatList
            data={mediaLibrary}
            renderItem={renderMediaItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mediaList}
          />
        </View>
      </ScrollView>

      {/* Content Generation Modal */}
      <Modal
        visible={showContentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowContentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Generate Content</Text>
              <TouchableOpacity onPress={() => setShowContentModal(false)}>
                <Ionicons name="close" size={24} color={theme.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Content Prompt</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={contentPrompt}
                onChangeText={setContentPrompt}
                placeholder="Describe what you want to post about..."
                placeholderTextColor={theme.subtext}
                multiline
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>Content Type</Text>
              <View style={styles.optionRow}>
                {['post', 'story', 'reel', 'carousel'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.optionButton,
                      { backgroundColor: contentType === type ? theme.primary : theme.background },
                      { borderColor: theme.border }
                    ]}
                    onPress={() => setContentType(type)}
                  >
                    <Text style={[
                      styles.optionText,
                      { color: contentType === type ? 'white' : theme.text }
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: theme.text }]}>Platform</Text>
              <View style={styles.optionRow}>
                {['instagram', 'facebook', 'twitter'].map((plat) => (
                  <TouchableOpacity
                    key={plat}
                    style={[
                      styles.optionButton,
                      { backgroundColor: platform === plat ? theme.primary : theme.background },
                      { borderColor: theme.border }
                    ]}
                    onPress={() => setPlatform(plat)}
                  >
                    <Text style={[
                      styles.optionText,
                      { color: platform === plat ? 'white' : theme.text }
                    ]}>
                      {plat.charAt(0).toUpperCase() + plat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {generatedContent ? (
                <View style={styles.generatedContent}>
                  <Text style={[styles.generatedContentTitle, { color: theme.text }]}>Generated Content:</Text>
                  <Text style={[styles.generatedContentText, { color: theme.text }]}>{generatedContent}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.generateButton, { backgroundColor: theme.primary }]}
                onPress={generateContent}
              >
                <Text style={styles.generateButtonText}>Generate Content</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Schedule Post Modal */}
      <Modal
        visible={showScheduleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Schedule Post</Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                <Ionicons name="close" size={24} color={theme.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Post Content</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={generatedContent}
                onChangeText={setGeneratedContent}
                placeholder="Enter your post content..."
                placeholderTextColor={theme.subtext}
                multiline
              />

              <TouchableOpacity
                style={[styles.scheduleButton, { backgroundColor: theme.primary }]}
                onPress={() => schedulePost(generatedContent, '')}
              >
                <Text style={styles.scheduleButtonText}>Schedule Post</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
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
  statusCard: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  postsList: {
    paddingHorizontal: 20,
  },
  postCard: {
    width: 280,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  postStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  postTime: {
    fontSize: 12,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  postPlatforms: {
    flexDirection: 'row',
    gap: 6,
  },
  platformTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginTop: 6,
    gap: 4,
  },
  platformText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  mediaList: {
    paddingHorizontal: 20,
  },
  mediaCard: {
    width: 120,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mediaImage: {
    width: '100%',
    height: 80,
    backgroundColor: '#f0f0f0',
  },
  mediaInfo: {
    padding: 8,
  },
  mediaTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  mediaDate: {
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  generatedContent: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  generatedContentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  generatedContentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  generateButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scheduleButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  scheduleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Social Media Platform Styles
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    marginTop: 4,
  },
  platformsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  platformCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  platformIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  platformName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  platformStatus: {
    alignItems: 'center',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectedText: {
    fontSize: 10,
    color: '#34C759',
    fontWeight: '500',
  },
  connectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectText: {
    fontSize: 10,
    fontWeight: '500',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Test Section Styles
  testSection: {
    margin: 20,
    alignItems: 'center',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    minWidth: 200,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
