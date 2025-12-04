// screens/FollowersListScreen.js
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useContext, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { UserContext } from '../contexts/UserContext';
import { followUser, getFollowers, getFollowing, isFollowing, unfollowUser } from '../firebase';
import { logError } from '../utils/logger';
import { getAvatarSource, hasAvatar } from '../utils/photoUtils';

export default function FollowersListScreen({ route }) {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const { user: currentProfile } = useContext(UserContext);
  const navigation = useNavigation();
  const { userId, type } = route.params || {}; // 'followers' or 'following'
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [followingStatus, setFollowingStatus] = useState({}); // userId -> boolean
  const [updatingFollow, setUpdatingFollow] = useState({}); // userId -> boolean

  const targetUserId = userId || currentProfile?.id;
  const isOwnProfile = targetUserId === currentUser?.uid;

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [targetUserId, type])
  );

  const loadUsers = async () => {
    if (!targetUserId) return;
    
    setLoading(true);
    try {
      const userList = type === 'followers' 
        ? await getFollowers(targetUserId, 100)
        : await getFollowing(targetUserId, 100);
      
      setUsers(userList);
      
      // Check follow status for each user (if viewing own profile's following)
      if (isOwnProfile && type === 'following') {
        const statusMap = {};
        await Promise.all(
          userList.map(async (u) => {
            if (u.id !== currentUser?.uid) {
              statusMap[u.id] = await isFollowing(u.id);
            }
          })
        );
        setFollowingStatus(statusMap);
      }
    } catch (error) {
      logError('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (userId) => {
    if (!isOwnProfile || type !== 'following') return; // Only allow unfollowing from own following list
    
    setUpdatingFollow(prev => ({ ...prev, [userId]: true }));
    try {
      const currentlyFollowing = followingStatus[userId];
      if (currentlyFollowing) {
        await unfollowUser(userId);
        setFollowingStatus(prev => ({ ...prev, [userId]: false }));
      } else {
        await followUser(userId);
        setFollowingStatus(prev => ({ ...prev, [userId]: true }));
      }
    } catch (error) {
      logError('Error toggling follow:', error);
    } finally {
      setUpdatingFollow(prev => ({ ...prev, [userId]: false }));
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.displayName?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query)
    );
  });

  const renderUser = ({ item }) => {
    const isFollowingUser = followingStatus[item.id] || false;
    const isUpdating = updatingFollow[item.id] || false;
    const canUnfollow = isOwnProfile && type === 'following' && item.id !== currentUser?.uid;

    return (
      <TouchableOpacity
        style={[styles.userCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        onPress={() => {
          if (item.id !== currentUser?.uid) {
            navigation.navigate('UserProfileView', { userId: item.id });
          } else {
            navigation.navigate('ProfileMain');
          }
        }}
      >
        <View style={styles.userInfo}>
          {hasAvatar(item) ? (
            <Image 
              source={getAvatarSource(item)}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.placeholderAvatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
              {item.displayName || 'No Name'}
            </Text>
            <Text style={[styles.userUsername, { color: theme.subtext }]} numberOfLines={1}>
              @{item.username || 'username'}
            </Text>
            {item.bio && (
              <Text style={[styles.userBio, { color: theme.subtext }]} numberOfLines={1}>
                {item.bio}
              </Text>
            )}
          </View>
        </View>
        
        {canUnfollow && (
          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowingUser 
                ? { backgroundColor: theme.cardBackground, borderColor: theme.border }
                : { backgroundColor: theme.primary }
            ]}
            onPress={() => handleFollowToggle(item.id)}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color={isFollowingUser ? theme.text : '#fff'} />
            ) : (
              <Text style={[
                styles.followButtonText,
                { color: isFollowingUser ? theme.text : '#fff' }
              ]}>
                {isFollowingUser ? 'Following' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {type === 'followers' ? 'Followers' : 'Following'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.subtext} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
          placeholder="Search..."
          placeholderTextColor={theme.subtext}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredUsers.length > 0 ? (
        <FlatList
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={theme.subtext} />
          <Text style={[styles.emptyText, { color: theme.subtext }]}>
            {searchQuery ? 'No users found' : `No ${type === 'followers' ? 'followers' : 'following'} yet`}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    position: 'absolute',
    left: 28,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    paddingLeft: 40,
    paddingRight: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  placeholderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    marginBottom: 4,
  },
  userBio: {
    fontSize: 14,
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});





