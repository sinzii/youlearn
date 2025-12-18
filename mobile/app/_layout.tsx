import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider as JotaiProvider } from 'jotai';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in environment variables');
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <GluestackUIProvider mode={colorScheme || 'system'}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ClerkLoaded>
          <JotaiProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
              <Stack.Screen name="(auth)" options={{headerShown: false}}/>
              <Stack.Screen name="videos/[id]"
                            options={{title: 'Video Details', headerBackButtonDisplayMode: 'minimal'}}/>
              <Stack.Screen name="modal" options={{presentation: 'modal', title: 'Modal'}}/>
            </Stack>
            <StatusBar style="auto"/>
          </JotaiProvider>
        </ClerkLoaded>
      </ClerkProvider>
    </GluestackUIProvider>
  );
}
