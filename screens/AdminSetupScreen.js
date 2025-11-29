/**
 * Admin Setup Screen
 * One-time screen to set up admin@merkabaent.com as admin
 * Can be accessed from Settings or run automatically
 */

import { Ionicons } from '@expo/vector-icons';
import { query, where, getDocs, collection, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../firebase';

export default function AdminSetupScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isAdmin, isMasterAdmin, isAdminEmail } = useRole();
  const [email, setEmail] = useState('admin@merkabaent.com');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // SECURITY: Only allow setting admin@merkabaent.com as admin
  const canSetupAdmin = user?.email === 'admin@merkabaent.com' || !isAdmin();

  const handleSetup = async () => {
    // SECURITY: Only allow setting admin@merkabaent.com as admin
    if (email.trim().toLowerCase() !== 'admin@merkabaent.com') {
      Alert.alert(
        'Security Restriction',
        'Only admin@merkabaent.com can be set as admin for security purposes.',
        [{ text: 'OK' }]
      );
      setEmail('admin@merkabaent.com');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    try {
      setLoading(true);
      setSuccess(false);

      console.log('🔧 Setting up admin for:', email);

      // Find user by email
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email.trim())
      );
      const usersSnapshot = await getDocs(usersQuery);

      if (usersSnapshot.empty) {
        Alert.alert(
          'User Not Found',
          `User with email ${email} not found in Firestore.\n\nPlease ensure the user has signed up at least once, or create the user document manually in Firebase Console.`,
          [{ text: 'OK' }]
        );
        return;
      }

      const userDoc = usersSnapshot.docs[0];
      const userId = userDoc.id;
      const userData = userDoc.data();

      // Check if already admin
      if (userData.role === 'admin' || userData.role === 'master_admin') {
        Alert.alert('Already Admin', `User is already ${userData.role}`);
        setSuccess(true);
        return;
      }

      // Set as admin
      const updateData = {
        role: 'admin',
        roleUpdatedAt: serverTimestamp(),
        roleUpdatedBy: user?.uid || 'system',
        adminInfo: {
          adminId: userId,
          department: 'Management',
          assignedDate: serverTimestamp(),
          status: 'active',
          createdBy: user?.uid || 'system',
          isFirstAdmin: true,
        },
      };

      await updateDoc(doc(db, 'users', userId), updateData);

      setSuccess(true);
      Alert.alert(
        'Success!',
        `${email} has been set as admin!\n\nThey can now access Admin Tools in Settings.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Refresh role context
              if (user?.email === email.trim()) {
                // If we just set ourselves as admin, refresh
                setTimeout(() => {
                  navigation.navigate('M1ASettings');
                }, 1000);
              } else {
                navigation.goBack();
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error setting up admin:', error);
      Alert.alert('Error', error.message || 'Failed to set up admin account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Admin Setup</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="shield-checkmark" size={48} color={theme.primary} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Set Up Admin Account</Text>
          <Text style={[styles.description, { color: theme.subtext }]}>
            This will set the specified user as an admin. Admins can manage users, upgrade them to
            employee roles, and access admin tools.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="admin@merkabaent.com"
              placeholderTextColor={theme.subtext}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading && !success}
            />
          </View>

          {success && (
            <View style={[styles.successBox, { backgroundColor: '#34C759' + '20', borderColor: '#34C759' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
              <Text style={[styles.successText, { color: '#34C759' }]}>
                Admin account set up successfully!
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: theme.primary },
              (loading || success) && styles.buttonDisabled,
            ]}
            onPress={handleSetup}
            disabled={loading || success}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={20} color="#fff" />
                <Text style={styles.buttonText}>Set Up Admin</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={[styles.infoBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Ionicons name="information-circle" size={20} color={theme.primary} />
            <Text style={[styles.infoText, { color: theme.subtext }]}>
              Note: The user must have signed up at least once for their document to exist in
              Firestore. If the user is not found, create their document manually in Firebase
              Console first.
            </Text>
          </View>
        </View>
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  successText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

