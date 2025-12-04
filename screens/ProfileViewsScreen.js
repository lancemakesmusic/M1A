// screens/ProfileViewsScreen.js
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useContext, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { UserContext } from '../contexts/UserContext';
import { getProfileViewCount, getProfileViews } from '../firebase';
import { logError } from '../utils/logger';
import { getAvatarSource, hasAvatar } from '../utils/photoUtils';

export default function ProfileViewsScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useContext(UserContext);
  const [views, setViews] = useState([]);
  const [viewCount, setViewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadViews();
    }, [user?.id])
  );

  const loadViews = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const [viewers, count] = await Promise.all([
        getProfileViews(user.id, 100),
        getProfileViewCount(user.id),
      ]);
      setViews(viewers);
      setViewCount(count);
    } catch (error) {
      logError('Error loading profile views:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderViewer = ({ item }) => (
    <TouchableOpacity
      style={[styles.viewerCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={() => {
        if (item.id !== user?.id) {
          navigation.navigate('UserProfileView', { userId: item.id });
        } else {
          navigation.navigate('ProfileMain');
        }
      }}
    >
      <View style={styles.viewerInfo}>
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
        <View style={styles.viewerDetails}>
          <Text style={[styles.viewerName, { color: theme.text }]} numberOfLines={1}>
            {item.displayName || 'No Name'}
          </Text>
          <Text style={[styles.viewerUsername, { color: theme.subtext }]} numberOfLines={1}>
            @{item.username || 'username'}
          </Text>
        </View>
      </View>
      <Text style={[styles.viewTime, { color: theme.subtext }]}>
        {formatTime(item.viewedAt)}
      </Text>
    </TouchableOpacity>
  );

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
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Profile Views</Text>
          <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
            {viewCount} total {viewCount === 1 ? 'view' : 'views'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : views.length > 0 ? (
        <FlatList
          data={views}
          renderItem={renderViewer}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="eye-outline" size={64} color={theme.subtext} />
          <Text style={[styles.emptyText, { color: theme.subtext }]}>
            No profile views yet
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.subtext }]}>
            When someone views your profile, they'll appear here
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
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  viewerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  viewerInfo: {
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
  viewerDetails: {
    flex: 1,
  },
  viewerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  viewerUsername: {
    fontSize: 14,
  },
  viewTime: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});





