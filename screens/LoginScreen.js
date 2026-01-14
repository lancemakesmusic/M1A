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
import { signInWithGoogle, signInWithApple } from '../services/SocialAuthService';
import { authRateLimiter } from '../utils/rateLimiter';
import { AUTH_ERRORS, getFirebaseErrorMessage } from '../constants/errorMessages';
import { AUTH_STRINGS, GENERAL_STRINGS } from '../constants/strings';
import { logError, logInfo } from '../utils/logger';
import { showErrorAlert } from '../utils/errorHandler';
import M1ALogo from '../components/M1ALogo';

export default function LoginScreen({ navigation }) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
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
            <M1ALogo size={80} variant="full" style={styles.logo} />
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

            {/* Password Reset - More Prominent */}
            <TouchableOpacity 
              style={[styles.forgotPasswordButton, { borderColor: theme.primary }]}
              onPress={() => {
                setResetEmail(email);
                setShowPasswordResetModal(true);
              }}
            >
              <Ionicons name="lock-closed-outline" size={18} color={theme.primary} />
              <Text style={[styles.forgotPasswordButtonText, { color: theme.primary }]}>
                {AUTH_STRINGS.FORGOT_PASSWORD}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.subtext }]}>OR</Text>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </View>

            {/* Social Login Buttons */}
            <TouchableOpacity
              style={[styles.socialButton, styles.googleButton, { backgroundColor: '#FFFFFF', borderColor: theme.border }]}
              onPress={async () => {
                setSocialLoading(true);
                try {
                  await signInWithGoogle();
                } catch (error) {
                  showErrorAlert(error, 'Google Sign-In');
                } finally {
                  setSocialLoading(false);
                }
              }}
              disabled={socialLoading || loading}
            >
              <Ionicons name="logo-google" size={20} color="#4285F4" />
              <Text style={[styles.socialButtonText, { color: theme.text }]}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.socialButton, styles.appleButton, { backgroundColor: theme.text, borderColor: theme.text }]}
                onPress={async () => {
                  setSocialLoading(true);
                  try {
                    await signInWithApple();
                  } catch (error) {
                    if (error.message?.includes('cancel')) {
                      // User cancelled - don't show error
                      return;
                    }
                    showErrorAlert(error, 'Apple Sign-In');
                  } finally {
                    setSocialLoading(false);
                  }
                }}
                disabled={socialLoading || loading}
              >
                <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                <Text style={[styles.socialButtonText, { color: '#FFFFFF' }]}>
                  Continue with Apple
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Password Reset Modal */}
          {showPasswordResetModal && (
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
              <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Reset Password</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowPasswordResetModal(false);
                      setResetEmail('');
                    }}
                  >
                    <Ionicons name="close" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>
                
                <Text style={[styles.modalDescription, { color: theme.subtext }]}>
                  Enter your email address and we'll send you a link to reset your password.
                </Text>

                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      color: theme.text,
                      borderColor: errors.resetEmail ? theme.error : theme.border,
                      backgroundColor: theme.background,
                    }
                  ]}
                  placeholder="Enter your email"
                  placeholderTextColor={theme.subtext}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={resetEmail}
                  onChangeText={(text) => {
                    setResetEmail(text);
                    if (errors.resetEmail) {
                      setErrors(prev => ({ ...prev, resetEmail: '' }));
                    }
                  }}
                />
                {errors.resetEmail && (
                  <Text style={[styles.fieldError, { color: theme.error }]}>{errors.resetEmail}</Text>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel, { borderColor: theme.border }]}
                    onPress={() => {
                      setShowPasswordResetModal(false);
                      setResetEmail('');
                    }}
                  >
                    <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSubmit, { backgroundColor: theme.primary }]}
                    onPress={async () => {
                      if (!resetEmail.trim()) {
                        setErrors({ resetEmail: AUTH_ERRORS.EMAIL_REQUIRED });
                        return;
                      }
                      if (!/\S+@\S+\.\S+/.test(resetEmail)) {
                        setErrors({ resetEmail: AUTH_ERRORS.INVALID_EMAIL });
                        return;
                      }

                      try {
                        await sendPasswordResetEmail(resetEmail);
                        Alert.alert(
                          'Email Sent',
                          'Check your email for password reset instructions. The link will expire in 1 hour.',
                          [
                            {
                              text: 'OK',
                              onPress: () => {
                                setShowPasswordResetModal(false);
                                setResetEmail('');
                              }
                            }
                          ]
                        );
                      } catch (error) {
                        const errorMessage = getFirebaseErrorMessage(error);
                        setErrors({ resetEmail: errorMessage });
                      }
                    }}
                  >
                    <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Send Reset Link</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

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
  forgotPasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 8,
  },
  forgotPasswordButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  googleButton: {
    // Styled above
  },
  appleButton: {
    // Styled above
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    borderWidth: 1,
  },
  modalButtonSubmit: {
    // backgroundColor set inline
  },
  modalButtonText: {
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
  signupLink: {
    fontSize: 16,
    fontWeight: '600',
  },
});
