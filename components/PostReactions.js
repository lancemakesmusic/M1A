/**
 * PostReactions Component
 * Displays and manages reactions (likes, etc.) for a post
 */

import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { db, isFirebaseReady } from '../firebase';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const REACTION_TYPES = [
  { type: 'like', icon: 'heart', label: 'Like' },
  { type: 'love', icon: 'heart', label: 'Love', color: '#FF3B30' },
  { type: 'laugh', icon: 'happy', label: 'Haha' },
  { type: 'wow', icon: 'flame', label: 'Wow' },
  { type: 'sad', icon: 'sad', label: 'Sad' },
  { type: 'angry', icon: 'thunderstorm', label: 'Angry' },
];

export default function PostReactions({ postId, onReactionCountChange }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [reactions, setReactions] = useState([]);
  const [userReaction, setUserReaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showReactionsList, setShowReactionsList] = useState(false);

  // Load reactions with real-time listener
  useEffect(() => {
    if (!postId || !isFirebaseReady() || !db || typeof db.collection === 'function') {
      setReactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const reactionsQuery = query(
      collection(db, 'posts', postId, 'reactions')
    );

    const unsubscribe = onSnapshot(
      reactionsQuery,
      async (snapshot) => {
        // Load user info for each reaction
        const reactionsData = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            let userName = 'User';
            
            // Fetch user info if userId exists
            if (data.userId && isFirebaseReady() && db && typeof db.collection !== 'function') {
              try {
                const userDoc = await getDoc(doc(db, 'users', data.userId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  userName = userData.displayName || userData.username || 'User';
                }
              } catch (error) {
                console.warn('Error loading user info for reaction:', error);
              }
            }
            
            return {
              id: docSnap.id,
              ...data,
              userName,
              createdAt: data.createdAt?.toDate() || new Date(),
            };
          })
        );

        setReactions(reactionsData);
        
        // Find user's reaction
        const userReact = reactionsData.find(r => r.userId === user?.uid);
        setUserReaction(userReact || null);
        
        setLoading(false);

        // Notify parent of reaction count change
        if (onReactionCountChange) {
          onReactionCountChange(reactionsData.length);
        }
      },
      (error) => {
        console.error('Error loading reactions:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [postId, user?.uid, onReactionCountChange]);

  // Group reactions by type
  const reactionsByType = reactions.reduce((acc, reaction) => {
    const type = reaction.type || 'like';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(reaction);
    return acc;
  }, {});

  const handleReaction = async (reactionType) => {
    if (!user?.uid) {
      Alert.alert('Login Required', 'Please log in to react to posts.');
      return;
    }

    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      // If user already reacted with this type, remove reaction
      if (userReaction && userReaction.type === reactionType) {
        await deleteDoc(doc(db, 'posts', postId, 'reactions', userReaction.id));
      } else {
        // If user has a different reaction, remove it first
        if (userReaction) {
          await deleteDoc(doc(db, 'posts', postId, 'reactions', userReaction.id));
        }
        
        // Add new reaction
        await addDoc(collection(db, 'posts', postId, 'reactions'), {
          type: reactionType,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });
      }
      
      setShowReactionPicker(false);
    } catch (error) {
      console.error('Error handling reaction:', error);
      Alert.alert('Error', 'Failed to react. Please try again.');
    }
  };

  const getReactionIcon = (type) => {
    const reaction = REACTION_TYPES.find(r => r.type === type);
    return reaction?.icon || 'heart';
  };

  const getReactionColor = (type) => {
    const reaction = REACTION_TYPES.find(r => r.type === type);
    return reaction?.color || theme.primary;
  };

  const totalReactions = reactions.length;
  const primaryReactionType = Object.keys(reactionsByType).sort(
    (a, b) => reactionsByType[b].length - reactionsByType[a].length
  )[0];

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setShowReactionPicker(true)}
        onLongPress={() => totalReactions > 0 && setShowReactionsList(true)}
        style={styles.reactionButton}
        activeOpacity={0.7}
      >
        {userReaction ? (
          <Ionicons
            name={getReactionIcon(userReaction.type)}
            size={20}
            color={getReactionColor(userReaction.type)}
          />
        ) : (
          <Ionicons name="heart-outline" size={20} color={theme.subtext} />
        )}
        {totalReactions > 0 && (
          <Text style={[styles.reactionCount, { color: theme.text }]}>
            {totalReactions}
          </Text>
        )}
      </TouchableOpacity>

      {/* Reaction Picker Modal */}
      <Modal
        visible={showReactionPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReactionPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReactionPicker(false)}
        >
          <View style={[styles.reactionPicker, { backgroundColor: theme.cardBackground }]}>
            {REACTION_TYPES.map((reaction) => (
              <TouchableOpacity
                key={reaction.type}
                onPress={() => handleReaction(reaction.type)}
                style={[
                  styles.reactionOption,
                  userReaction?.type === reaction.type && { backgroundColor: theme.primary + '20' },
                ]}
              >
                <Ionicons
                  name={reaction.icon}
                  size={32}
                  color={reaction.color || theme.primary}
                />
                <Text style={[styles.reactionLabel, { color: theme.text }]}>
                  {reaction.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reactions List Modal */}
      <Modal
        visible={showReactionsList}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReactionsList(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.reactionsListModal, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Reactions ({totalReactions})
              </Text>
              <TouchableOpacity onPress={() => setShowReactionsList(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={Object.entries(reactionsByType)}
              renderItem={({ item: [type, typeReactions] }) => (
                <View style={styles.reactionTypeGroup}>
                  <View style={styles.reactionTypeHeader}>
                    <Ionicons
                      name={getReactionIcon(type)}
                      size={20}
                      color={getReactionColor(type)}
                    />
                    <Text style={[styles.reactionTypeLabel, { color: theme.text }]}>
                      {REACTION_TYPES.find(r => r.type === type)?.label || type} ({typeReactions.length})
                    </Text>
                  </View>
                  <View style={styles.reactionUsers}>
                    {typeReactions.map((reaction) => (
                      <Text key={reaction.id} style={[styles.reactionUser, { color: theme.subtext }]}>
                        {reaction.userName || 'User'}
                      </Text>
                    ))}
                  </View>
                </View>
              )}
              keyExtractor={([type]) => type}
              contentContainerStyle={styles.reactionsListContent}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  reactionCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPicker: {
    flexDirection: 'row',
    borderRadius: 30,
    padding: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  reactionOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    minWidth: 60,
  },
  reactionLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  reactionsListModal: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  reactionsListContent: {
    padding: 16,
  },
  reactionTypeGroup: {
    marginBottom: 16,
  },
  reactionTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  reactionTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  reactionUsers: {
    paddingLeft: 28,
  },
  reactionUser: {
    fontSize: 14,
    marginBottom: 4,
  },
});

