import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useM1APersonalization } from '../contexts/M1APersonalizationContext';
import { useNotificationPreferences } from '../contexts/NotificationPreferencesContext';
import { useTheme } from '../contexts/ThemeContext';
import TipTrackingService from '../services/TipTrackingService';

export default function M1ASettingsScreen({ navigation }) {
  const { theme } = useTheme();
  const { 
    userPersona, 
    preferences, 
    savePreferences, 
    resetPersonalization,
    getPersonaColor,
    getPersonaIcon
  } = useM1APersonalization();
  const {
    preferences: notificationPrefs,
    updatePreference,
    updateMasterToggle,
  } = useNotificationPreferences();

  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [saving, setSaving] = useState(false);
  const [tipsEnabled, setTipsEnabled] = useState(true);

  useEffect(() => {
    // Load tips enabled state
    TipTrackingService.areTipsEnabled().then(setTipsEnabled);
  }, []);

  const handlePreferenceChange = (key, value) => {
    setLocalPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePreferences(localPreferences);
      Alert.alert('Success', 'Settings saved successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Optionally navigate back after saving
            // navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Personalization',
      'This will reset all your personalization settings and persona selection. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            await resetPersonalization();
            navigation.goBack();
          }
        },
      ]
    );
  };

  const renderPersonaSection = () => (
    <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Persona</Text>
      
      {userPersona ? (
        <View style={styles.personaCard}>
          <View style={[styles.personaIcon, { backgroundColor: getPersonaColor() + '20' }]}>
            <Ionicons name={getPersonaIcon()} size={32} color={getPersonaColor()} />
          </View>
          <View style={styles.personaInfo}>
            <Text style={[styles.personaName, { color: theme.text }]}>
              {userPersona.name}
            </Text>
            <Text style={[styles.personaDescription, { color: theme.subtext }]}>
              {userPersona.description}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.changeButton, { borderColor: theme.primary }]}
            onPress={() => navigation.navigate('M1APersonalization')}
          >
            <Text style={[styles.changeButtonText, { color: theme.primary }]}>Change</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.setupButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('M1APersonalization')}
        >
          <Text style={styles.setupButtonText}>Set Up Persona</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderNotificationSettings = () => (
    <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Push Notifications</Text>
      
      {/* Master Toggle */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>Enable Notifications</Text>
          <Text style={[styles.settingDescription, { color: theme.subtext }]}>
            Master switch for all push notifications
          </Text>
        </View>
        <Switch
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={notificationPrefs?.enabled ? theme.primary : theme.subtext}
          ios_backgroundColor={theme.border}
          onValueChange={(value) => updateMasterToggle(value)}
          value={notificationPrefs?.enabled ?? true}
        />
      </View>

      {/* Messages Section */}
      <View style={[styles.subsection, { borderTopColor: theme.border }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.subsectionTitle, { color: theme.text }]}>💬 Messages</Text>
            <Text style={[styles.settingDescription, { color: theme.subtext }]}>
              Control message notifications
            </Text>
          </View>
          <Switch
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={notificationPrefs?.messages?.enabled ? theme.primary : theme.subtext}
            ios_backgroundColor={theme.border}
            onValueChange={(value) => updatePreference('messages', 'enabled', value)}
            value={notificationPrefs?.messages?.enabled ?? true}
            disabled={!notificationPrefs?.enabled}
          />
        </View>
        
        {notificationPrefs?.messages?.enabled && notificationPrefs?.enabled && (
          <>
            <View style={[styles.subSettingRow, { marginLeft: 16 }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.subSettingTitle, { color: theme.text }]}>New Messages</Text>
              </View>
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={notificationPrefs?.messages?.newMessage ? theme.primary : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => updatePreference('messages', 'newMessage', value)}
                value={notificationPrefs?.messages?.newMessage ?? true}
              />
            </View>
            <View style={[styles.subSettingRow, { marginLeft: 16 }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.subSettingTitle, { color: theme.text }]}>Mentions</Text>
              </View>
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={notificationPrefs?.messages?.mentions ? theme.primary : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => updatePreference('messages', 'mentions', value)}
                value={notificationPrefs?.messages?.mentions ?? true}
              />
            </View>
          </>
        )}
      </View>

      {/* Events Section */}
      <View style={[styles.subsection, { borderTopColor: theme.border }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.subsectionTitle, { color: theme.text }]}>📅 Events</Text>
            <Text style={[styles.settingDescription, { color: theme.subtext }]}>
              Control event notifications
            </Text>
          </View>
          <Switch
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={notificationPrefs?.events?.enabled ? theme.primary : theme.subtext}
            ios_backgroundColor={theme.border}
            onValueChange={(value) => updatePreference('events', 'enabled', value)}
            value={notificationPrefs?.events?.enabled ?? true}
            disabled={!notificationPrefs?.enabled}
          />
        </View>
        
        {notificationPrefs?.events?.enabled && notificationPrefs?.enabled && (
          <>
            <View style={[styles.subSettingRow, { marginLeft: 16 }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.subSettingTitle, { color: theme.text }]}>Reminders</Text>
              </View>
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={notificationPrefs?.events?.reminders ? theme.primary : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => updatePreference('events', 'reminders', value)}
                value={notificationPrefs?.events?.reminders ?? true}
              />
            </View>
            <View style={[styles.subSettingRow, { marginLeft: 16 }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.subSettingTitle, { color: theme.text }]}>New Events</Text>
              </View>
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={notificationPrefs?.events?.newEvents ? theme.primary : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => updatePreference('events', 'newEvents', value)}
                value={notificationPrefs?.events?.newEvents ?? true}
              />
            </View>
            <View style={[styles.subSettingRow, { marginLeft: 16 }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.subSettingTitle, { color: theme.text }]}>Event Updates</Text>
              </View>
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={notificationPrefs?.events?.eventUpdates ? theme.primary : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => updatePreference('events', 'eventUpdates', value)}
                value={notificationPrefs?.events?.eventUpdates ?? true}
              />
            </View>
            <View style={[styles.subSettingRow, { marginLeft: 16 }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.subSettingTitle, { color: theme.text }]}>Cancellations</Text>
              </View>
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={notificationPrefs?.events?.cancellations ? theme.primary : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => updatePreference('events', 'cancellations', value)}
                value={notificationPrefs?.events?.cancellations ?? true}
              />
            </View>
          </>
        )}
      </View>

      {/* Discounts Section */}
      <View style={[styles.subsection, { borderTopColor: theme.border }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.subsectionTitle, { color: theme.text }]}>🎉 Discounts & Deals</Text>
            <Text style={[styles.settingDescription, { color: theme.subtext }]}>
              Control discount and promotion notifications
            </Text>
          </View>
          <Switch
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={notificationPrefs?.discounts?.enabled ? theme.primary : theme.subtext}
            ios_backgroundColor={theme.border}
            onValueChange={(value) => updatePreference('discounts', 'enabled', value)}
            value={notificationPrefs?.discounts?.enabled ?? true}
            disabled={!notificationPrefs?.enabled}
          />
        </View>
        
        {notificationPrefs?.discounts?.enabled && notificationPrefs?.enabled && (
          <>
            <View style={[styles.subSettingRow, { marginLeft: 16 }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.subSettingTitle, { color: theme.text }]}>New Deals</Text>
              </View>
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={notificationPrefs?.discounts?.newDeals ? theme.primary : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => updatePreference('discounts', 'newDeals', value)}
                value={notificationPrefs?.discounts?.newDeals ?? true}
              />
            </View>
            <View style={[styles.subSettingRow, { marginLeft: 16 }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.subSettingTitle, { color: theme.text }]}>Price Drops</Text>
              </View>
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={notificationPrefs?.discounts?.priceDrops ? theme.primary : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => updatePreference('discounts', 'priceDrops', value)}
                value={notificationPrefs?.discounts?.priceDrops ?? true}
              />
            </View>
            <View style={[styles.subSettingRow, { marginLeft: 16 }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.subSettingTitle, { color: theme.text }]}>Flash Sales</Text>
              </View>
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={notificationPrefs?.discounts?.flashSales ? theme.primary : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => updatePreference('discounts', 'flashSales', value)}
                value={notificationPrefs?.discounts?.flashSales ?? true}
              />
            </View>
            <View style={[styles.subSettingRow, { marginLeft: 16 }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.subSettingTitle, { color: theme.text }]}>Personalized Offers</Text>
              </View>
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={notificationPrefs?.discounts?.personalizedOffers ? theme.primary : theme.subtext}
                ios_backgroundColor={theme.border}
                onValueChange={(value) => updatePreference('discounts', 'personalizedOffers', value)}
                value={notificationPrefs?.discounts?.personalizedOffers ?? true}
              />
            </View>
          </>
        )}
      </View>
    </View>
  );

  const renderAppearanceSettings = () => (
    <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>Dark Mode</Text>
          <Text style={[styles.settingDescription, { color: theme.subtext }]}>
            Use dark theme throughout the app
          </Text>
        </View>
        <Switch
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={localPreferences.darkMode ? theme.primary : theme.subtext}
          ios_backgroundColor={theme.border}
          onValueChange={(value) => handlePreferenceChange('darkMode', value)}
          value={localPreferences.darkMode}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>Accent Color</Text>
          <Text style={[styles.settingDescription, { color: theme.subtext }]}>
            Choose your preferred accent color
          </Text>
        </View>
        <View style={styles.colorPicker}>
          {['#9C27B0', '#2196F3', '#4CAF50', '#FF9800', '#F44336', '#607D8B'].map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                localPreferences.accentColor === color && styles.selectedColor
              ]}
              onPress={() => handlePreferenceChange('accentColor', color)}
            />
          ))}
        </View>
      </View>
    </View>
  );

  const renderFeatureSettings = () => (
    <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Feature Preferences</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>Show Helpful Tips</Text>
          <Text style={[styles.settingDescription, { color: theme.subtext }]}>
            Display contextual tips and hints from M1A assistant
          </Text>
        </View>
        <Switch
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={tipsEnabled ? theme.primary : theme.subtext}
          ios_backgroundColor={theme.border}
          onValueChange={async (value) => {
            setTipsEnabled(value);
            await TipTrackingService.setTipsEnabled(value);
            // If enabling tips, also clear the disabled flag
            if (value) {
              await TipTrackingService.setTipsDisabled(false);
            }
          }}
          value={tipsEnabled}
        />
      </View>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>Show Tutorials</Text>
          <Text style={[styles.settingDescription, { color: theme.subtext }]}>
            Display helpful tutorials for new features
          </Text>
        </View>
        <Switch
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={localPreferences.showTutorials ? theme.primary : theme.subtext}
          ios_backgroundColor={theme.border}
          onValueChange={(value) => handlePreferenceChange('showTutorials', value)}
          value={localPreferences.showTutorials}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>AI Recommendations</Text>
          <Text style={[styles.settingDescription, { color: theme.subtext }]}>
            Get personalized feature recommendations
          </Text>
        </View>
        <Switch
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={localPreferences.aiRecommendations ? theme.primary : theme.subtext}
          ios_backgroundColor={theme.border}
          onValueChange={(value) => handlePreferenceChange('aiRecommendations', value)}
          value={localPreferences.aiRecommendations}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>Analytics Tracking</Text>
          <Text style={[styles.settingDescription, { color: theme.subtext }]}>
            Help improve the app by sharing usage analytics
          </Text>
        </View>
        <Switch
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={localPreferences.analytics ? theme.primary : theme.subtext}
          ios_backgroundColor={theme.border}
          onValueChange={(value) => handlePreferenceChange('analytics', value)}
          value={localPreferences.analytics}
        />
      </View>
    </View>
  );

  const renderLanguageSettings = () => (
    <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Language & Region</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>Language</Text>
          <Text style={[styles.settingDescription, { color: theme.subtext }]}>
            Choose your preferred language
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.languageButton, { borderColor: theme.border }]}
          onPress={() => {
            const newLanguage = localPreferences.language === 'en' ? 'es' : 'en';
            handlePreferenceChange('language', newLanguage);
          }}
        >
          <Text style={[styles.languageText, { color: theme.text }]}>
            {localPreferences.language === 'en' ? 'English' : 'Spanish'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.subtext} />
        </TouchableOpacity>
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>Time Zone</Text>
          <Text style={[styles.settingDescription, { color: theme.subtext }]}>
            Set your local time zone (Auto-detect based on device)
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.languageButton, { borderColor: theme.border }]}
          onPress={() => {
            // Auto-detect timezone from device
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            handlePreferenceChange('timezone', timezone);
            Alert.alert('Time Zone Updated', `Time zone set to: ${timezone}`);
          }}
        >
          <Text style={[styles.languageText, { color: theme.text }]}>
            {localPreferences.timezone || 'Auto-detect'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.subtext} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleBack = () => {
    // Check if there are unsaved changes
    const hasChanges = JSON.stringify(localPreferences) !== JSON.stringify(preferences);
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to save them before leaving?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setLocalPreferences(preferences); // Reset to original
              navigation.goBack();
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Save',
            onPress: async () => {
              await handleSave();
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header with Back Button */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderPersonaSection()}
        {renderNotificationSettings()}
        {renderAppearanceSettings()}
        {renderFeatureSettings()}
        {renderLanguageSettings()}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.primary }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resetButton, { borderColor: theme.border }]}
            onPress={handleReset}
          >
            <Text style={[styles.resetButtonText, { color: theme.text }]}>
              Reset All Settings
            </Text>
          </TouchableOpacity>
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
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40, // Same width as back button to center title
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  personaCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personaIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  personaInfo: {
    flex: 1,
  },
  personaName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  personaDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  changeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  setupButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  setupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  subsection: {
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subSettingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  subSettingTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#000',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  languageText: {
    fontSize: 14,
  },
  actionButtons: {
    marginTop: 20,
    marginBottom: 40,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
