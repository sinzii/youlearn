import { useSSO } from '@clerk/clerk-expo';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Image } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

// Warm up the browser for faster OAuth
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startSSOFlow } = useSSO();

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: Linking.createURL('/', { scheme: 'youlearn' }),
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
    <Box className="flex-1 bg-background-0">
      <VStack className="flex-1 justify-center items-center p-6">
        {/* Header */}
        <VStack className="items-center mb-12">
          <Heading size="3xl" className="mb-3">
            YouLearn
          </Heading>
          <Text className="text-typography-500 text-center max-w-[280px]">
            Learn from YouTube videos with AI-powered summaries and chat
          </Text>
        </VStack>

        {/* Button Container */}
        <VStack className="w-full items-center gap-4">
          <Button
            className="w-full max-w-[320px] bg-white rounded-xl py-3.5 px-6 shadow-hard-5"
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <Spinner className="text-info-600" />
            ) : (
              <>
                <Image
                  source={{ uri: 'https://www.google.com/favicon.ico' }}
                  className="w-5 h-5 mr-3"
                />
                <ButtonText className="text-info-600 font-semibold text-base">
                  Continue with Google
                </ButtonText>
              </>
            )}
          </Button>

          {error && (
            <Text className="text-error-500 text-sm text-center">{error}</Text>
          )}
        </VStack>

        {/* Terms */}
        <Text className="absolute bottom-12 text-xs text-typography-400 text-center px-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </VStack>
    </Box>
  );
}
