import { useSSO } from '@clerk/clerk-expo';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import {
  StyleSheet,
  Image,
  View,
} from 'react-native';
import { Text, Button, useTheme } from '@rneui/themed';

// Warm up the browser for faster OAuth
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  const { startSSOFlow } = useSSO();

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: Linking.createURL('/', { scheme: 'videoinsight' }),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  }, [startSSOFlow]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.black }]}>
            VideoInsight
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.grey4 }]}>
            Learn from YouTube videos with AI-powered summaries and chat
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            loading={isLoading}
            loadingProps={{ color: '#1a73e8' }}
            buttonStyle={styles.googleButton}
            containerStyle={styles.googleButtonContainer}
            type="outline"
          >
            {!isLoading && (
              <>
                <Image
                  source={{
                    uri: 'https://www.google.com/favicon.ico',
                  }}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleButtonText}>
                  Continue with Google
                </Text>
              </>
            )}
          </Button>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>

        <Text style={[styles.terms, { color: theme.colors.grey4 }]}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 280,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  googleButtonContainer: {
    width: '100%',
    maxWidth: 320,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderColor: '#ddd',
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    color: '#1a73e8',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  terms: {
    position: 'absolute',
    bottom: 48,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
