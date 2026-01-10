import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { ThemeProvider, useTheme } from '@rneui/themed';
import { Stack, useRouter } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import { StatusBar } from 'expo-status-bar';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { store, persistor } from '@/lib/store';
import { rneTheme, navigationLightTheme, navigationDarkTheme } from '@/constants/rne-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useShareIntentHandler } from '@/hooks/useShareIntentHandler';
import { I18nProvider } from '@/components/I18nProvider';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in environment variables');
}

// Loading screen shown during redux-persist rehydration
function RehydrationLoading() {
  return (
    <View style={styles.rehydrationLoading}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}

function GlobalLoading() {
  const { theme } = useTheme();
  return (
    <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const navTheme = isDark ? navigationDarkTheme : navigationLightTheme;

  // Handle shared YouTube URLs from other apps
  useShareIntentHandler();

  return (
    <ThemeProvider theme={{ ...rneTheme, mode: isDark ? 'dark' : 'light' }}>
      <Suspense fallback={<GlobalLoading />}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: navTheme.colors.card },
            headerTintColor: navTheme.colors.text,
            contentStyle: { backgroundColor: navTheme.colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="videos/[id]" options={{ title: 'Video Details', headerBackButtonDisplayMode: 'minimal' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
      </Suspense>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rehydrationLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default function RootLayout() {
  const router = useRouter();

  return (
    /**
     * ShareIntentProvider enables receiving shared content from other apps (Safari, YouTube, etc.)
     *
     * How it works:
     * 1. When user shares a URL to VideoInsight, iOS Share Extension stores it in UserDefaults
     * 2. The extension redirects to app with: videoinsight://dataUrl=videoinsightShareKey#weburl
     * 3. +native-intent.ts intercepts this to prevent "Unmatched Route" error
     * 4. ShareIntentProvider reads the actual URL from UserDefaults (via App Group)
     * 5. useShareIntentHandler hook (in RootLayoutNav) detects it and navigates to /videos/[id]
     *
     * Configuration in app.json:
     * - iosAppGroupIdentifier: "group.dedotdev.app.videoinsight" (must match Swift extension)
     * - iosActivationRules: What content types trigger the share extension
     *
     * @see hooks/useShareIntentHandler.ts - handles navigation after receiving shared content
     * @see app/+native-intent.ts - intercepts deep link to prevent routing errors
     * @see https://github.com/achorein/expo-share-intent
     */
    <ShareIntentProvider
      options={{
        debug: __DEV__, // Log share intent events in development
        resetOnBackground: true, // Clear share intent when app goes to background
        onResetShareIntent: () => router.replace('/'), // Navigate home when share intent is reset
      }}
    >
      <ReduxProvider store={store}>
        <PersistGate loading={<RehydrationLoading />} persistor={persistor}>
          <I18nProvider>
            <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
              <ClerkLoaded>
                <RootLayoutNav />
              </ClerkLoaded>
            </ClerkProvider>
          </I18nProvider>
        </PersistGate>
      </ReduxProvider>
    </ShareIntentProvider>
  );
}
