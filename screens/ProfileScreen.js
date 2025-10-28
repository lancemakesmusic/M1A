import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useContext, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { UserContext } from '../contexts/UserContext';

export default function ProfileScreen() {
  const { user, loading, refreshUserProfile } = useContext(UserContext);
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');

  // Mock data for demonstration
  const mockStats = {
    followers: 1247,
    following: 342,
    posts: 89,
  };

  const mockPosts = [
    {
      id: '1',
      type: 'image',
      content: 'Just finished an amazing recording session! 🎵',
      media: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      likes: 23,
      comments: 5,
      timestamp: '2h ago',
    },
    {
      id: '2',
      type: 'text',
      content: 'Excited to announce our upcoming live performance at the downtown venue. Tickets are now available!',
      likes: 45,
      comments: 12,
      timestamp: '1d ago',
    },
    {
      id: '3',
      type: 'video',
      content: 'Behind the scenes of our latest music video shoot',
      media: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
      likes: 67,
      comments: 8,
      timestamp: '3d ago',
    },
  ];

  useFocusEffect(
    useCallback(() => {
      (async () => { await refreshUserProfile(); })();
    }, [refreshUserProfile])
  );

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refreshUserProfile(); } finally { setRefreshing(false); }
  }, [refreshUserProfile]);

  const normalizedSocials = useMemo(() => {
    if (!user?.socials || typeof user.socials !== 'object') return [];
    return Object.entries(user.socials).filter(
      ([, v]) => typeof v === 'string' && v.trim().length > 0
    );
  }, [user]);

  const openSocial = async (url) => {
    const safeUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const canOpen = await Linking.canOpenURL(safeUrl);
    if (!canOpen) return Alert.alert('Invalid link', 'This link cannot be opened.');
    await Linking.openURL(safeUrl);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const renderPost = ({ item }) => (
    <View style={[styles.postCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={styles.postHeader}>
        <View style={styles.postUserInfo}>
          <Image 
            source={{ uri: user?.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' }} 
            style={styles.postAvatar} 
          />
          <View>
            <Text style={[styles.postUserName, { color: theme.text }]}>{user?.displayName || 'User'}</Text>
            <Text style={[styles.postTime, { color: theme.subtext }]}>{item.timestamp}</Text>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.subtext} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.postContent, { color: theme.text }]}>{item.content}</Text>

      {item.media && (
        <Image source={{ uri: item.media }} style={styles.postMedia} />
      )}

      <View style={styles.postActions}>
        <TouchableOpacity style={styles.postAction}>
          <Ionicons name="heart-outline" size={20} color={theme.subtext} />
          <Text style={[styles.postActionText, { color: theme.subtext }]}>{item.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.postAction}>
          <Ionicons name="chatbubble-outline" size={20} color={theme.subtext} />
          <Text style={[styles.postActionText, { color: theme.subtext }]}>{item.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.postAction}>
          <Ionicons name="share-outline" size={20} color={theme.subtext} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.dimText, { color: theme.subtext }]}>Loading profile…</Text>
      </SafeAreaView>
    );
  }

  // No profile state
  if (!user) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>Create your profile</Text>
        <Text style={[styles.dimText, { color: theme.subtext }]}>Let&apos;s set up your profile to get started.</Text>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('ProfileEdit')}
          activeOpacity={0.85}
        >
          <Text style={styles.editText}>Get started</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          {/* Cover Photo */}
          <View style={[styles.coverPhoto, { backgroundColor: theme.primary + '20' }]}>
            <TouchableOpacity style={styles.coverEditButton}>
              <Ionicons name="camera" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.placeholderAvatar, { backgroundColor: theme.primary }]}>
                  <Text style={styles.avatarText}>👤</Text>
                </View>
              )}
              <TouchableOpacity style={[styles.avatarEditButton, { backgroundColor: theme.primary }]}>
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileDetails}>
              <Text style={[styles.displayName, { color: theme.text }]}>
                {user.displayName || 'No Name Set'}
              </Text>
              <Text style={[styles.username, { color: theme.subtext }]}>
                @{user.username || 'username'}
              </Text>
              {user.bio && (
                <Text style={[styles.bio, { color: theme.text }]}>{user.bio}</Text>
              )}

              {/* Social Links */}
              {normalizedSocials.length > 0 && (
                <View style={styles.socialLinks}>
                  {normalizedSocials.map(([platform, url]) => (
                    <TouchableOpacity 
                      key={platform} 
                      style={[styles.socialLink, { backgroundColor: theme.primary + '20' }]}
                      onPress={() => openSocial(url)}
                    >
                      <Text style={[styles.socialLinkText, { color: theme.primary }]}>
                        {platform}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.text }]}>{formatNumber(mockStats.posts)}</Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.text }]}>{formatNumber(mockStats.followers)}</Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.text }]}>{formatNumber(mockStats.following)}</Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>Following</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('ProfileEdit')}
            >
              <Text style={styles.primaryButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.secondaryButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            >
              <Ionicons name="share-outline" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'posts' && { borderBottomColor: theme.primary }]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'posts' ? theme.primary : theme.subtext }]}>
              Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'media' && { borderBottomColor: theme.primary }]}
            onPress={() => setActiveTab('media')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'media' ? theme.primary : theme.subtext }]}>
              Media
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'likes' && { borderBottomColor: theme.primary }]}
            onPress={() => setActiveTab('likes')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'likes' ? theme.primary : theme.subtext }]}>
              Likes
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'posts' && (
          <FlatList
            data={mockPosts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        )}

        {activeTab === 'media' && (
          <View style={styles.mediaGrid}>
            {mockPosts.filter(post => post.media).map((post) => (
              <TouchableOpacity key={post.id} style={styles.mediaItem}>
                <Image source={{ uri: post.media }} style={styles.mediaImage} />
                {post.type === 'video' && (
                  <View style={styles.videoOverlay}>
                    <Ionicons name="play" size={24} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'likes' && (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={48} color={theme.subtext} />
            <Text style={[styles.emptyStateText, { color: theme.subtext }]}>No liked posts yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dimText: {
    marginTop: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  profileHeader: {
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  coverPhoto: {
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 16,
  },
  coverEditButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    padding: 20,
    paddingTop: 0,
  },
  avatarContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginTop: -40,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
  },
  placeholderAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileDetails: {
    marginTop: 16,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  socialLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  socialLink: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  socialLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  postCard: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  postUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postUserName: {
    fontSize: 16,
    fontWeight: '600',
  },
  postTime: {
    fontSize: 14,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  postMedia: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    gap: 24,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postActionText: {
    fontSize: 14,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 2,
  },
  mediaItem: {
    width: '33.33%',
    aspectRatio: 1,
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
  },
  editButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  editText: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollContent: {
    paddingTop: 0, // Remove top padding to eliminate whitespace
  },
});