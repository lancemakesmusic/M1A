/**
 * PostComments Component
 * Displays and manages comments for a post
 */

import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { db, isFirebaseReady } from '../firebase';
import { getAvatarSource } from '../utils/photoUtils';

export default function PostComments({ postId, onCommentCountChange }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const flatListRef = useRef(null);

  // Load comments with real-time listener
  useEffect(() => {
    if (!postId || !isFirebaseReady() || !db || typeof db.collection === 'function') {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const commentsQuery = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      commentsQuery,
      async (snapshot) => {
        // Load user info for each comment
        const commentsData = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            let userName = 'User';
            let userAvatar = null;
            
            // Fetch user info if userId exists
            if (data.userId && isFirebaseReady() && db && typeof db.collection !== 'function') {
              try {
                const userDoc = await getDoc(doc(db, 'users', data.userId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  userName = userData.displayName || userData.username || 'User';
                  userAvatar = userData.photoURL || null;
                }
              } catch (error) {
                console.warn('Error loading user info for comment:', error);
              }
            }
            
            return {
              id: docSnap.id,
              ...data,
              userName,
              userAvatar,
              createdAt: data.createdAt?.toDate() || new Date(),
            };
          })
        );
        
        setComments(commentsData);
        setLoading(false);
        
        // Notify parent of comment count change
        if (onCommentCountChange) {
          onCommentCountChange(commentsData.length);
        }

        // Scroll to bottom when new comments arrive
        if (expanded && flatListRef.current) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      },
      (error) => {
        console.error('Error loading comments:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [postId, expanded, onCommentCountChange]);

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !user?.uid || submitting) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        text: commentText.trim(),
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      setCommentText('');
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId, commentUserId) => {
    if (!user?.uid || commentUserId !== user.uid) return;

    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderComment = ({ item }) => {
    const isOwnComment = item.userId === user?.uid;
    const avatarSource = getAvatarSource({ photoURL: item.userAvatar });

    return (
      <View style={[styles.commentItem, { borderBottomColor: theme.border }]}>
        <View style={styles.commentHeader}>
          {avatarSource ? (
            <Image source={avatarSource} style={styles.commentAvatar} />
          ) : (
            <View style={[styles.commentAvatar, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="person" size={16} color={theme.primary} />
            </View>
          )}
          <View style={styles.commentContent}>
            <Text style={[styles.commentAuthor, { color: theme.text }]}>
              {item.userName || 'User'}
            </Text>
            <Text style={[styles.commentText, { color: theme.text }]}>
              {item.text}
            </Text>
            <Text style={[styles.commentTime, { color: theme.subtext }]}>
              {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          {isOwnComment && (
            <TouchableOpacity
              onPress={() => handleDeleteComment(item.id, item.userId)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={16} color={theme.subtext} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (!expanded) {
    return (
      <TouchableOpacity
        onPress={() => setExpanded(true)}
        style={styles.expandButton}
      >
        <Ionicons name="chatbubble-outline" size={16} color={theme.primary} />
        <Text style={[styles.expandButtonText, { color: theme.primary }]}>
          {comments.length > 0 ? `View ${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}` : 'Add comment'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.commentsContainer, { backgroundColor: theme.background }]}>
        <View style={styles.commentsHeader}>
          <Text style={[styles.commentsTitle, { color: theme.text }]}>
            Comments ({comments.length})
          </Text>
          <TouchableOpacity onPress={() => setExpanded(false)}>
            <Ionicons name="chevron-up" size={20} color={theme.subtext} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.subtext }]}>
              No comments yet. Be the first to comment!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            style={styles.commentsList}
            contentContainerStyle={styles.commentsListContent}
          />
        )}

        {user && (
          <View style={[styles.commentInputContainer, { borderTopColor: theme.border }]}>
            <TextInput
              style={[styles.commentInput, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
              placeholder="Write a comment..."
              placeholderTextColor={theme.subtext}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={handleSubmitComment}
              disabled={!commentText.trim() || submitting}
              style={[
                styles.submitButton,
                {
                  backgroundColor: commentText.trim() && !submitting ? theme.primary : theme.border,
                  opacity: commentText.trim() && !submitting ? 1 : 0.5,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  commentsContainer: {
    maxHeight: 300,
    borderTopWidth: 1,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  commentsTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  commentsList: {
    maxHeight: 200,
  },
  commentsListContent: {
    paddingHorizontal: 12,
  },
  commentItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    gap: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 11,
  },
  deleteButton: {
    padding: 4,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
  },
  submitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

