import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { ThemeProvider, useTheme } from '@rneui/themed';
import { Stack, useRouter } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import { StatusBar } from 'expo-status-bar';
import { Provider as JotaiProvider } from 'jotai';
import { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { rneTheme, navigationLightTheme, navigationDarkTheme } from '@/constants/rne-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useShareIntentHandler } from '@/hooks/useShareIntentHandler';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in environment variables');
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
});

export default function RootLayout() {
  const router = useRouter();

  return (
    <ShareIntentProvider
      options={{
        debug: __DEV__,
        resetOnBackground: true,
        onResetShareIntent: () => router.replace('/'),
      }}
    >
      <JotaiProvider>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <ClerkLoaded>
            <RootLayoutNav />
          </ClerkLoaded>
        </ClerkProvider>
      </JotaiProvider>
    </ShareIntentProvider>
  );
}
