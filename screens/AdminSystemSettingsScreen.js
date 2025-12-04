/**
 * Admin System Settings Screen
 * Configure app settings, integrations, system preferences
 */

import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
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

export default function AdminSystemSettingsScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isAdminEmail } = useRole();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState({
    appName: 'M1A',
    venueName: 'Merkaba Entertainment',
    primaryColor: '#9C27B0',
    maintenanceMode: false,
    allowRegistrations: true,
    stripeEnabled: true,
    squareEnabled: false,
    toastEnabled: false,
    eventbriteEnabled: false,
  });
  const [saving, setSaving] = useState(false);

  const canAccess = isAdminEmail && user?.email === 'admin@merkabaent.com';

  useEffect(() => {
    if (!canAccess) {
      navigation.goBack();
      return;
    }
    loadSettings();
  }, [user, canAccess]);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      // Load from Firestore 'settings' collection
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'app'));
        if (settingsDoc.exists()) {
          setSettings({ ...settings, ...settingsDoc.data() });
        }
      } catch (error) {
        console.log('Settings document may not exist yet:', error);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSettings();
  }, [loadSettings]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await updateDoc(doc(db, 'settings', 'app'), {
        ...settings,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const renderSettingRow = (label, description, children) => (
    <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
        {description && <Text style={[styles.settingDescription, { color: theme.subtext }]}>{description}</Text>}
      </View>
      {children}
    </View>
  );

  if (!canAccess) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>System Settings</Text>
        <TouchableOpacity onPress={handleSaveSettings} style={styles.saveButton} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Text style={[styles.saveButtonText, { color: theme.primary }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>App Configuration</Text>
          <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
            {renderSettingRow(
              'App Name',
              'Display name of the application',
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={settings.appName}
                onChangeText={(text) => setSettings({ ...settings, appName: text })}
                placeholder="M1A"
              />
            )}
            {renderSettingRow(
              'Venue Name',
              'Name of the venue',
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={settings.venueName}
                onChangeText={(text) => setSettings({ ...settings, venueName: text })}
                placeholder="Merkaba Entertainment"
              />
            )}
            {renderSettingRow(
              'Primary Color',
              'Main brand color (hex code)',
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={settings.primaryColor}
                onChangeText={(text) => setSettings({ ...settings, primaryColor: text })}
                placeholder="#9C27B0"
              />
            )}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>System Controls</Text>
          <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
            {renderSettingRow(
              'Maintenance Mode',
              'Put the app in maintenance mode',
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={settings.maintenanceMode ? theme.primary : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => setSettings({ ...settings, maintenanceMode: value })}
                value={settings.maintenanceMode}
              />
            )}
            {renderSettingRow(
              'Allow Registrations',
              'Allow new users to sign up',
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={settings.allowRegistrations ? theme.primary : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => setSettings({ ...settings, allowRegistrations: value })}
                value={settings.allowRegistrations}
              />
            )}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Payment Integrations</Text>
          <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
            {renderSettingRow(
              'Stripe',
              'Enable Stripe payment processing',
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={settings.stripeEnabled ? theme.primary : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => setSettings({ ...settings, stripeEnabled: value })}
                value={settings.stripeEnabled}
              />
            )}
            {renderSettingRow(
              'Square',
              'Enable Square payment processing',
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={settings.squareEnabled ? theme.primary : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => setSettings({ ...settings, squareEnabled: value })}
                value={settings.squareEnabled}
              />
            )}
            {renderSettingRow(
              'Toast',
              'Enable Toast POS integration',
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={settings.toastEnabled ? theme.primary : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => setSettings({ ...settings, toastEnabled: value })}
                value={settings.toastEnabled}
              />
            )}
            {renderSettingRow(
              'Eventbrite',
              'Enable Eventbrite integration',
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={settings.eventbriteEnabled ? theme.primary : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => setSettings({ ...settings, eventbriteEnabled: value })}
                value={settings.eventbriteEnabled}
              />
            )}
          </View>
        </ScrollView>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    minWidth: 150,
  },
});




