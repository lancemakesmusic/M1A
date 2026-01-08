// screens/SignupScreen.js
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { createUserWithEmailAndPassword, createUserProfileIfMissing } from '../firebase';
import { trackSignup, trackButtonClick, trackError } from '../services/AnalyticsService';
import GoogleDriveService from '../services/GoogleDriveService';
import { authRateLimiter } from '../utils/rateLimiter';
import { AUTH_ERRORS, getFirebaseErrorMessage } from '../constants/errorMessages';
import { AUTH_STRINGS, GENERAL_STRINGS } from '../constants/strings';
import { logError, logInfo, logWarn } from '../utils/logger';
import M1ALogo from '../components/M1ALogo';

export default function SignupScreen({ navigation }) {
  const { theme } = useTheme();
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Note: Google Drive folder creation now happens after persona selection
  // This ensures we have the username and persona context

  // Enhanced password validation
  const validatePassword = (pwd) => {
    if (pwd.length < 8) {
      return AUTH_ERRORS.PASSWORD_TOO_SHORT;
    }
    if (!/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      return AUTH_ERRORS.PASSWORD_WEAK;
    }
    return null;
  };

  const validateForm = () => {
    const newErrors = {};
    
    // First name validation
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }
    
    // Email validation
    if (!email.trim()) {
      newErrors.email = AUTH_ERRORS.EMAIL_REQUIRED;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = AUTH_ERRORS.INVALID_EMAIL;
    }
    
    // Password validation
    if (!password) {
      newErrors.password = AUTH_ERRORS.PASSWORD_REQUIRED;
    } else {
      const passwordError = validatePassword(password);
      if (passwordError) {
        newErrors.password = passwordError;
      }
    }
    
    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = AUTH_ERRORS.PASSWORD_REQUIRED;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = AUTH_ERRORS.PASSWORDS_DONT_MATCH;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;
    
    // Check rate limit
    const rateLimitCheck = authRateLimiter.checkLimit(email);
    if (!rateLimitCheck.allowed) {
      const remainingSeconds = authRateLimiter.getRemainingTime(email);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      setErrors({ 
        general: `${AUTH_ERRORS.RATE_LIMITED} Please wait ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}.` 
      });
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      trackButtonClick('signup_button', 'SignupScreen');
      logInfo('Attempting sign up');
      
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(email, password);
      logInfo('Signup successful:', userCredential.user.uid);
      
      // Reset rate limiter on success
      authRateLimiter.reset(email);
      
      // Create user profile in Firestore
      try {
        const { createUserProfileIfMissing } = await import('../firebase');
        // Generate username from email - sanitize dots and special characters
        let username = email.split('@')[0].toLowerCase();
        // Replace dots and invalid characters with underscores
        username = username.replace(/[^a-zA-Z0-9_-]/g, '_');
        // Remove leading/trailing underscores
        username = username.replace(/^_+|_+$/g, '');
        // Ensure minimum length (add numbers if too short)
        if (username.length < 3) {
          username = username + Math.floor(Math.random() * 1000);
        }
        // Ensure it doesn't start with number (add prefix if needed)
        if (/^\d/.test(username)) {
          username = 'user_' + username;
        }
        const trimmedFirstName = firstName.trim();
        await createUserProfileIfMissing(userCredential.user.uid, {
          email: email,
          firstName: trimmedFirstName,
          displayName: trimmedFirstName, // Use firstName as displayName
          username: username,
        });
        
        // Update Firebase Auth displayName
        try {
          const { updateProfile } = await import('firebase/auth');
          await updateProfile(userCredential.user, {
            displayName: trimmedFirstName,
          });
        } catch (updateError) {
          logWarn('Failed to update auth displayName:', updateError);
          // Don't fail signup if this fails
        }
        
        // Note: Google Drive folder will be created after persona selection
        // This ensures we have the username and persona context
      } catch (profileError) {
        logWarn('Failed to create user profile:', profileError);
        // Don't fail signup if profile creation fails
      }
      
      // Send email verification
      try {
        const { sendEmailVerification } = await import('firebase/auth');
        await sendEmailVerification(userCredential.user);
        logInfo('Verification email sent');
      } catch (verifyError) {
        logWarn('Failed to send verification email:', verifyError);
        // Don't fail signup if verification email fails
      }
      
      await trackSignup('email');
      
      // Show success message
      Alert.alert(
        AUTH_STRINGS.ACCOUNT_CREATED,
        AUTH_STRINGS.ACCOUNT_CREATED_MESSAGE,
        [
          {
            text: GENERAL_STRINGS.OK,
            onPress: () => {
              // Navigation will be handled by AuthContext
            }
          }
        ]
      );
    } catch (error) {
      // Record failure for rate limiting
      authRateLimiter.recordFailure(email);
      
      logError('Signup error:', error);
      trackError(error.message, 'signup_error', 'SignupScreen');
      
      const errorMessage = getFirebaseErrorMessage(error);
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <M1ALogo size={80} variant="full" style={styles.logo} />
            <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: theme.subtext }]}>
              Sign up to get started with M1A
            </Text>
          </View>

          {errors.general && (
            <View style={[styles.errorContainer, { backgroundColor: theme.error + '20', borderColor: theme.error }]}>
              <Ionicons name="alert-circle" size={20} color={theme.error} />
              <Text style={[styles.errorText, { color: theme.error }]}>{errors.general}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.text }]}>First Name</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    color: theme.text, 
                    borderColor: errors.firstName ? theme.error : theme.border,
                    backgroundColor: theme.cardBackground
                  }
                ]}
                placeholder="Enter your first name"
                placeholderTextColor={theme.subtext}
                autoCapitalize="words"
                autoCorrect={false}
                value={firstName}
                onChangeText={(text) => {
                  setFirstName(text);
                  if (errors.firstName) {
                    setErrors(prev => ({ ...prev, firstName: '' }));
                  }
                }}
              />
              {errors.firstName && (
                <Text style={[styles.fieldError, { color: theme.error }]}>{errors.firstName}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Email</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    color: theme.text, 
                    borderColor: errors.email ? theme.error : theme.border,
                    backgroundColor: theme.cardBackground
                  }
                ]}
                placeholder="Enter your email"
                placeholderTextColor={theme.subtext}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) {
                    setErrors(prev => ({ ...prev, email: '' }));
                  }
                }}
              />
              {errors.email && (
                <Text style={[styles.fieldError, { color: theme.error }]}>{errors.email}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.passwordInput, 
                    { 
                      color: theme.text, 
                      borderColor: errors.password ? theme.error : theme.border,
                      backgroundColor: theme.cardBackground
                    }
                  ]}
                  placeholder="Enter your password"
                  placeholderTextColor={theme.subtext}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) {
                      setErrors(prev => ({ ...prev, password: '' }));
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={theme.subtext} 
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={[styles.fieldError, { color: theme.error }]}>{errors.password}</Text>
              )}
              <Text style={[styles.helperText, { color: theme.subtext }]}>
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Confirm Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.passwordInput, 
                    { 
                      color: theme.text, 
                      borderColor: errors.confirmPassword ? theme.error : theme.border,
                      backgroundColor: theme.cardBackground
                    }
                  ]}
                  placeholder="Confirm your password"
                  placeholderTextColor={theme.subtext}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) {
                      setErrors(prev => ({ ...prev, confirmPassword: '' }));
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={theme.subtext} 
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text style={[styles.fieldError, { color: theme.error }]}>{errors.confirmPassword}</Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.signupButton, 
                { 
                  backgroundColor: loading ? theme.subtext : theme.primary,
                  opacity: loading ? 0.7 : 1
                }
              ]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.signupButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.subtext }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginLink, { color: theme.primary }]}>
                Sign in
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1,
    padding: 16,
    paddingRight: 50,
    borderRadius: 12,
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  fieldError: {
    fontSize: 14,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  signupButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
  },
  loginLink: {
    fontSize: 16,
    fontWeight: '600',
  },
});
