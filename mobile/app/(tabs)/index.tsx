import { useClerk, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CloseIcon, Icon } from '@/components/ui/icon';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalCloseButton,
  ModalBody,
} from '@/components/ui/modal';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRecentVideos, VideoCache } from '@/lib/store';

export default function HomeScreen() {
  const [videoUrl, setVideoUrl] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const recentVideos = useRecentVideos();
  const { user } = useUser();
  const { signOut } = useClerk();

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const handleStartLearning = () => {
    const trimmedUrl = videoUrl.trim();
    if (!trimmedUrl) return;

    const videoId = extractVideoId(trimmedUrl);
    if (videoId) {
      setVideoUrl('');
      router.push({ pathname: '/videos/[id]', params: { id: videoId } });
    }
  };

  const handleVideoPress = (video: VideoCache) => {
    router.push({ pathname: '/videos/[id]', params: { id: video.video_id } });
  };

  return (
    <SafeAreaView
      className={`flex-1 ${colorScheme === 'dark' ? 'bg-background-950' : 'bg-background-0'}`}
      edges={['top']}
    >
      <Box className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 px-6 pt-4"
          >
            {/* Top Bar with Avatar */}
            <HStack className="justify-end py-2">
              <Pressable onPress={() => setShowProfile(true)}>
                <Avatar size="md">
                  <AvatarFallbackText>
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </AvatarFallbackText>
                  <AvatarImage source={{ uri: user?.imageUrl }} />
                </Avatar>
              </Pressable>
            </HStack>

            {/* Title Section */}
            <VStack className="items-center mt-6 mb-12">
              <Heading size="4xl" className="mb-2">
                YouLearn
              </Heading>
              <Text className="text-typography-500 text-center text-base">
                Learn from YouTube videos with AI
              </Text>
            </VStack>

            {/* Form */}
            <VStack className="gap-4">
              <Input
                variant="outline"
                size="lg"
                className="rounded-xl border-outline-200"
              >
                <InputField
                  placeholder="Paste YouTube URL or video ID..."
                  value={videoUrl}
                  onChangeText={setVideoUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handleStartLearning}
                />
              </Input>

              <Button
                size="lg"
                action="primary"
                className="rounded-xl h-[50px]"
                onPress={handleStartLearning}
                isDisabled={!videoUrl.trim()}
              >
                <ButtonText className="font-semibold">Start Learning</ButtonText>
              </Button>
            </VStack>

            {/* Recent Videos */}
            {recentVideos.length > 0 && (
              <VStack className="mt-10">
                <Text className="text-xs uppercase tracking-wide text-typography-500 mb-3">
                  Recent Videos
                </Text>
                {recentVideos.slice(0, 5).map((video) => (
                  <Pressable
                    key={video.video_id}
                    onPress={() => handleVideoPress(video)}
                  >
                    {({ pressed }) => (
                      <Card
                        variant="filled"
                        size="sm"
                        className="mb-2"
                        style={{ opacity: pressed ? 0.7 : 1 }}
                      >
                        <Text className="font-medium text-sm mb-1" numberOfLines={2}>
                          {video.title || video.video_id}
                        </Text>
                        <Text className="text-xs text-typography-400">
                          {formatRelativeTime(video.lastAccessed)}
                        </Text>
                      </Card>
                    )}
                  </Pressable>
                ))}
              </VStack>
            )}
          </KeyboardAvoidingView>
        </ScrollView>

        {/* Profile Modal */}
        <Modal isOpen={showProfile} onClose={() => setShowProfile(false)}>
          <ModalBackdrop />
          <ModalContent className="max-w-[280px] rounded-2xl p-6">
            <ModalCloseButton className="absolute top-3 right-3">
              <Icon as={CloseIcon} size="lg" className="text-typography-500" />
            </ModalCloseButton>
            <ModalBody className="pt-2">
              <VStack className="items-center">
                <Avatar size="xl" className="mb-4">
                  <AvatarFallbackText>
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </AvatarFallbackText>
                  <AvatarImage source={{ uri: user?.imageUrl }} />
                </Avatar>
                <Heading size="lg" className="mb-1">
                  {user?.firstName} {user?.lastName}
                </Heading>
                <Text className="text-sm text-typography-500 mb-6">
                  {user?.emailAddresses[0]?.emailAddress}
                </Text>
                <Button
                  action="primary"
                  className="w-full rounded-lg"
                  onPress={() => {
                    setShowProfile(false);
                    handleSignOut();
                  }}
                >
                  <ButtonText className="font-semibold">Sign Out</ButtonText>
                </Button>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    </SafeAreaView>
  );
}

function extractVideoId(input: string): string | null {
  const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;
  if (videoIdPattern.test(input)) {
    return input;
  }

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return input;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
