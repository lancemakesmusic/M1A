// screens/LoginScreen.js
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
import { signInWithEmailAndPassword, sendPasswordResetEmail } from '../firebase';
import { trackLogin, trackButtonClick, trackError } from '../services/AnalyticsService';
import { authRateLimiter } from '../utils/rateLimiter';
import { AUTH_ERRORS, getFirebaseErrorMessage } from '../constants/errorMessages';
import { AUTH_STRINGS, GENERAL_STRINGS } from '../constants/strings';
import { logError, logInfo } from '../utils/logger';

export default function LoginScreen({ navigation }) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = AUTH_ERRORS.EMAIL_REQUIRED;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = AUTH_ERRORS.INVALID_EMAIL;
    }
    
    if (!password) {
      newErrors.password = AUTH_ERRORS.PASSWORD_REQUIRED;
    } else if (password.length < 8) {
      newErrors.password = AUTH_ERRORS.PASSWORD_TOO_SHORT;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
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
      trackButtonClick('login_button', 'LoginScreen');
      logInfo('Attempting sign in');
      await signInWithEmailAndPassword(email, password);
      logInfo('Login successful');
      
      // Reset rate limiter on success
      authRateLimiter.reset(email);
      
      await trackLogin('email');
      // Navigation will be handled by AuthContext
    } catch (error) {
      // Record failure for rate limiting
      authRateLimiter.recordFailure(email);
      
      logError('Login error:', error);
      trackError(error.message, 'login_error', 'LoginScreen');
      
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
            <Text style={[styles.title, { color: theme.text }]}>{AUTH_STRINGS.WELCOME_BACK}</Text>
            <Text style={[styles.subtitle, { color: theme.subtext }]}>
              {AUTH_STRINGS.SIGN_IN_TO_ACCOUNT}
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
              <Text style={[styles.label, { color: theme.text }]}>{AUTH_STRINGS.EMAIL}</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    color: theme.text, 
                    borderColor: errors.email ? theme.error : theme.border,
                    backgroundColor: theme.cardBackground
                  }
                ]}
                placeholder={AUTH_STRINGS.ENTER_EMAIL}
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
              <Text style={[styles.label, { color: theme.text }]}>{AUTH_STRINGS.PASSWORD}</Text>
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
                  placeholder={AUTH_STRINGS.ENTER_PASSWORD}
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
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton, 
                { 
                  backgroundColor: loading ? theme.subtext : theme.primary,
                  opacity: loading ? 0.7 : 1
                }
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>{AUTH_STRINGS.SIGN_IN}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={async () => {
                if (!email.trim()) {
                  Alert.alert(AUTH_STRINGS.EMAIL, AUTH_ERRORS.EMAIL_REQUIRED);
                  return;
                }
                
                try {
                  await sendPasswordResetEmail(email);
                  Alert.alert(
                    AUTH_STRINGS.PASSWORD_RESET_SENT,
                    AUTH_STRINGS.PASSWORD_RESET_MESSAGE,
                    [{ text: GENERAL_STRINGS.OK }]
                  );
                } catch (error) {
                  const errorMessage = getFirebaseErrorMessage(error);
                  Alert.alert(GENERAL_STRINGS.ERROR, errorMessage);
                }
              }}
            >
              <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>
                {AUTH_STRINGS.FORGOT_PASSWORD}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.subtext }]}>
              {AUTH_STRINGS.DONT_HAVE_ACCOUNT}{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={[styles.signupLink, { color: theme.primary }]}>
                {AUTH_STRINGS.SIGN_UP}
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
  loginButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
  },
  signupLink: {
    fontSize: 16,
    fontWeight: '600',
  },
});
