// navigation/RootNavigation.js
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { useAuth } from '../contexts/AuthContext';
import { useM1APersonalization } from '../contexts/M1APersonalizationContext';
import { useRole } from '../contexts/RoleContext';
import DrawerNavigator from './DrawerNavigator';
import AuthNavigator from './AuthNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import M1ALogo from '../components/M1ALogo';
import { useTheme } from '../contexts/ThemeContext';

export default function RootNavigation({ onIntroStateChange }) {
  const { user, loading: authLoading } = useAuth();
  const { isOnboarded, loading: personalizationLoading } = useM1APersonalization();
  const { theme } = useTheme();
  const videoRef = useRef(null);
  const isLoading = authLoading || personalizationLoading;
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoFinishedOnce, setVideoFinishedOnce] = useState(false);
  const [readyToProceed, setReadyToProceed] = useState(false);

  // Admins can have personas - they get both admin features and persona features
  // They're auto-onboarded but can still select/change persona
  const { isAdminEmail } = useRole();
  const isAdmin = isAdminEmail;
  const adminIsOnboarded = isAdmin ? true : isOnboarded;

  useEffect(() => {
    if (isLoading) {
      setReadyToProceed(false);
      return;
    }

    if (videoFailed || videoFinishedOnce) {
      setReadyToProceed(true);
    }
  }, [isLoading, videoFailed, videoFinishedOnce]);

  useEffect(() => {
    if (onIntroStateChange) {
      onIntroStateChange(readyToProceed);
    }
  }, [onIntroStateChange, readyToProceed]);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    const playLoadingVideo = async () => {
      try {
        await videoRef.current.replayAsync();
      } catch (error) {
        // No-op: video may not be ready yet
      }
    };

    playLoadingVideo();
  }, []);

  // Show loading until auth/personalization resolve and video completes.
  if (isLoading || !readyToProceed) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
        accessibilityLabel="Loading"
        accessible
      >
        {videoFailed ? (
          <View style={styles.loadingFallback}>
            <M1ALogo size={100} variant="full" style={styles.loadingLogo} />
            <ActivityIndicator size="large" color={theme.primary} style={styles.loader} />
          </View>
        ) : (
          <Video
            ref={videoRef}
            source={require('../assets/videos/M Logo Animated.mp4')}
            style={styles.loadingVideo}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            isMuted
            onPlaybackStatusUpdate={(status) => {
              if (status?.didJustFinish) {
                setVideoFinishedOnce(true);
              }
            }}
            onError={() => setVideoFailed(true)}
          />
        )}
      </View>
    );
  }

  // If not logged in, show auth
  if (!user) {
    return <AuthNavigator />;
  }

  // If logged in but not onboarded, force persona selection
  // Admins are auto-onboarded but can still select persona from Settings
  if (!adminIsOnboarded) {
    return <OnboardingNavigator />;
  }

  // User is logged in and onboarded, show main app
    return <DrawerNavigator />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
  loadingFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    marginBottom: 24,
  },
  loader: {
    marginTop: 16,
  },
  loadingVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
