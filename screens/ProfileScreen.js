import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
import ScrollIndicator from '../components/ScrollIndicator';
import { useTheme } from '../contexts/ThemeContext';
import { UserContext } from '../contexts/UserContext';
import { db, isFirebaseReady } from '../firebase';
import { getAvatarSource, getCoverSource, getImageKey, hasAvatar, hasCover } from '../utils/photoUtils';

export default function ProfileScreen() {
  const { user, loading, refreshUserProfile } = useContext(UserContext);
  const { theme } = useTheme();
  const navigation = useNavigation();
  
  // Check if we can go back (i.e., accessed from drawer)
  const canGoBack = navigation.canGoBack();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
  const [posts, setPosts] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [imageRefreshKey, setImageRefreshKey] = useState(0);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  // Load real stats from Firestore
  const loadStats = useCallback(async () => {
    if (!user?.id) return;
    
    setLoadingStats(true);
    try {
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        // Real Firestore
        const userId = user.id;
        
        // Get followers count
        const followersQuery = query(collection(db, 'followers'), where('followingId', '==', userId));
        const followersSnapshot = await getCountFromServer(followersQuery);
        const followersCount = followersSnapshot.data().count;
        
        // Get following count
        const followingQuery = query(collection(db, 'followers'), where('followerId', '==', userId));
        const followingSnapshot = await getCountFromServer(followingQuery);
        const followingCount = followingSnapshot.data().count;
        
        // Get posts count
        const postsQuery = query(collection(db, 'posts'), where('userId', '==', userId));
        const postsSnapshot = await getCountFromServer(postsQuery);
        const postsCount = postsSnapshot.data().count;
        
        setStats({
          followers: followersCount,
          following: followingCount,
          posts: postsCount,
        });
      } else {
        // Fallback to mock if Firebase not ready
        setStats({ followers: 0, following: 0, posts: 0 });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({ followers: 0, following: 0, posts: 0 });
    } finally {
      setLoadingStats(false);
    }
  }, [user?.id]);

  // Load real posts from Firestore
  const loadPosts = useCallback(async () => {
    if (!user?.id) return;
    
    setLoadingPosts(true);
    try {
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        // Real Firestore
        const postsQuery = query(
          collection(db, 'posts'),
          where('userId', '==', user.id),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        const postsSnapshot = await getDocs(postsQuery);
        const postsData = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().createdAt?.toDate ? formatTimestamp(doc.data().createdAt.toDate()) : 'Unknown',
        }));
        setPosts(postsData);
      } else {
        // Fallback to empty array if Firebase not ready
        setPosts([]);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }, [user?.id]);

  const formatTimestamp = (date) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Refresh when screen comes into focus (e.g., after editing)
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      
      // Refresh profile when screen comes into focus (e.g., after editing)
      (async () => { 
        try {
          if (!isMounted) return;
          // Single refresh call - no need for multiple attempts
          await refreshUserProfile();
          if (!isMounted) return;
          // Force image refresh by updating key
          setImageRefreshKey(Date.now());
          await loadStats();
          if (!isMounted) return;
          await loadPosts();
        } catch (error) {
          console.error('Error refreshing profile:', error);
        }
      })();
      
      return () => {
        isMounted = false;
      };
    }, []) // Empty deps - only run on focus, not on every render
  );
  
  // Refresh image when photo URLs or timestamps change
  useEffect(() => {
    if (user) {
      // Force image refresh when photo URLs or timestamps change
      setImageRefreshKey(Date.now());
    }
  }, [user?.avatarUrl, user?.photoURL, user?.coverUrl, user?.photoUpdatedAt, user?.coverUpdatedAt]);

  // Load stats and posts when user ID changes
  useEffect(() => {
    if (user?.id) {
      loadStats();
      loadPosts();
    }
  }, [user?.id]); // Only depend on user?.id, not the callbacks

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try { 
      await refreshUserProfile();
      await loadStats();
      await loadPosts();
    } finally { 
      setRefreshing(false); 
    }
  }, [refreshUserProfile, loadStats, loadPosts]);

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
            source={getAvatarSource(user) || { uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' }}
            style={styles.postAvatar}
            key={getImageKey(user, 'post-avatar')}
            onError={(error) => {
              console.warn('Post avatar failed to load:', error.nativeEvent.error);
            }}
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
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['bottom', 'left', 'right', 'top']}
    >
      {/* Header with conditional Back Button */}
      {canGoBack && (
        <View style={[styles.topHeader, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.topHeaderTitle, { color: theme.text }]}>Profile</Text>
          <View style={styles.headerRight} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} />
        }
        removeClippedSubviews={false}
        collapsable={false}
        contentContainerStyle={styles.scrollContent}
        onScrollBeginDrag={() => {
          setShowScrollIndicator(false);
        }}
        scrollEventThrottle={16}
      >
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          {/* Cover Photo */}
          <View style={styles.coverPhotoContainer}>
            {hasCover(user) ? (
              <Image 
                source={getCoverSource(user, imageRefreshKey)}
                style={styles.coverPhoto}
                key={getImageKey(user, 'cover') + `-${imageRefreshKey}`}
                onError={(error) => {
                  console.warn('Cover photo failed to load:', error.nativeEvent.error);
                }}
                onLoad={() => {
                  console.log('✅ Cover photo loaded successfully');
                }}
              />
            ) : (
              <View style={[styles.coverPhoto, { backgroundColor: theme.primary + '20' }]} />
            )}
            <TouchableOpacity 
              style={styles.coverEditButton}
              onPress={() => navigation.navigate('ProfileEdit')}
            >
              <Ionicons name="camera" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              {hasAvatar(user) ? (
                <Image 
                  source={getAvatarSource(user, imageRefreshKey)}
                  style={styles.avatar}
                  key={getImageKey(user, 'avatar') + `-${imageRefreshKey}`}
                  onError={(error) => {
                    console.warn('Avatar failed to load:', error.nativeEvent.error);
                  }}
                  onLoad={() => {
                    console.log('✅ Avatar loaded successfully');
                  }}
                />
              ) : (
                <View style={[styles.placeholderAvatar, { backgroundColor: theme.primary }]}>
                  <Text style={styles.avatarText}>👤</Text>
                </View>
              )}
              <TouchableOpacity 
                style={[styles.avatarEditButton, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate('ProfileEdit')}
              >
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
              {loadingStats ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Text style={[styles.statNumber, { color: theme.text }]}>{formatNumber(stats.posts)}</Text>
                  <Text style={[styles.statLabel, { color: theme.subtext }]}>Posts</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              {loadingStats ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Text style={[styles.statNumber, { color: theme.text }]}>{formatNumber(stats.followers)}</Text>
                  <Text style={[styles.statLabel, { color: theme.subtext }]}>Followers</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              {loadingStats ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Text style={[styles.statNumber, { color: theme.text }]}>{formatNumber(stats.following)}</Text>
                  <Text style={[styles.statLabel, { color: theme.subtext }]}>Following</Text>
                </>
              )}
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
              onPress={() => navigation.navigate('CreatePost')}
            >
              <Ionicons name="add-circle-outline" size={20} color={theme.text} />
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
          <>
            {loadingPosts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.subtext }]}>Loading posts...</Text>
              </View>
            ) : posts.length > 0 ? (
              <FlatList
                data={posts}
                renderItem={renderPost}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={theme.subtext} />
                <Text style={[styles.emptyStateText, { color: theme.subtext }]}>No posts yet</Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'media' && (
          <View style={styles.mediaGrid}>
            {loadingPosts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : posts.filter(post => post.media || post.imageUrl).length > 0 ? (
              posts.filter(post => post.media || post.imageUrl).map((post) => (
                <TouchableOpacity key={post.id} style={styles.mediaItem}>
                  <Image source={{ uri: post.media || post.imageUrl }} style={styles.mediaImage} />
                  {post.type === 'video' && (
                    <View style={styles.videoOverlay}>
                      <Ionicons name="play" size={24} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="images-outline" size={48} color={theme.subtext} />
                <Text style={[styles.emptyStateText, { color: theme.subtext }]}>No media yet</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'likes' && (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={48} color={theme.subtext} />
            <Text style={[styles.emptyStateText, { color: theme.subtext }]}>No liked posts yet</Text>
          </View>
        )}
        </ScrollView>
      </View>
      
      {/* Scroll Indicator */}
      {showScrollIndicator && (
        <ScrollIndicator
          visible={showScrollIndicator}
          onScrollStart={() => setShowScrollIndicator(false)}
        />
      )}
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40, // Same width as back button to center title
  },
  profileHeader: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  coverPhotoContainer: {
    position: 'relative',
    height: 120,
    width: '100%',
  },
  coverPhoto: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  coverEditButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
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
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
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