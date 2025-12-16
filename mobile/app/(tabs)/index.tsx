import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeScreen() {
  const [videoUrl, setVideoUrl] = useState('');
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';

  const handleStartLearning = () => {
    const trimmedUrl = videoUrl.trim();
    if (!trimmedUrl) return;

    // Extract video ID from URL or use as-is if it's already an ID
    const videoId = extractVideoId(trimmedUrl);
    if (videoId) {
      router.push({ pathname: '/videos/[id]', params: { id: videoId } });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            YouLearn
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Learn from YouTube videos with AI
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.form}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5',
                color: Colors[colorScheme].text,
                borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
              },
            ]}
            placeholder="Paste YouTube URL or video ID..."
            placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
            value={videoUrl}
            onChangeText={setVideoUrl}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleStartLearning}
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: Colors[colorScheme].tint,
                opacity: pressed ? 0.8 : videoUrl.trim() ? 1 : 0.5,
              },
            ]}
            onPress={handleStartLearning}
            disabled={!videoUrl.trim()}
          >
            <ThemedText style={styles.buttonText} lightColor="#fff" darkColor="#000">
              Start Learning
            </ThemedText>
          </Pressable>
        </ThemedView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function extractVideoId(input: string): string | null {
  // Direct video ID (11 characters)
  const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;
  if (videoIdPattern.test(input)) {
    return input;
  }

  // URL patterns
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

  // If no pattern matches, return the input as-is (let backend validate)
  return input;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
