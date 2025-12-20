import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Pressable,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Input, Button, useTheme } from '@rneui/themed';

const EXAMPLE_VIDEOS = [
  { id: 'XA9Q5p9ODac', title: 'Quantum Consciousness and the Origin of Life' },
  { id: 'BHEhxPuMmQI', title: 'Physicist Brian Cox explains quantum physics in 22 minutes' },
  { id: 'kO41iURud9c', title: 'Brian Cox: The quantum roots of reality' },
];

export default function NewScreen() {
  const [videoUrl, setVideoUrl] = useState('');
  const router = useRouter();
  const { theme } = useTheme();

  const handleStartLearning = () => {
    const trimmedUrl = videoUrl.trim();
    if (!trimmedUrl) return;

    const videoId = extractVideoId(trimmedUrl);
    if (videoId) {
      setVideoUrl('');
      router.push({ pathname: '/videos/[id]', params: { id: videoId } });
    }
  };

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setVideoUrl(text);
    }
  };

  const handleClear = () => {
    setVideoUrl('');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.content}
          >
            {/* Title Section */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.black }]}>
                VideoInsight
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.black }]}>
                Summarize, ask and learn from Youtube videos with AI
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                placeholder="Paste YouTube URL or video ID..."
                value={videoUrl}
                onChangeText={setVideoUrl}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleStartLearning}
                rightIcon={
                  <MaterialIcons
                    name={videoUrl ? 'close' : 'content-paste'}
                    size={20}
                    color={theme.colors.grey4}
                    onPress={videoUrl ? handleClear : handlePaste}
                  />
                }
                inputContainerStyle={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.colors.grey0,
                    borderColor: theme.colors.greyOutline,
                  },
                ]}
                containerStyle={styles.inputWrapper}
              />

              <Button
                title="Start Learning"
                onPress={handleStartLearning}
                disabled={!videoUrl.trim()}
              />
            </View>

            {/* Example Videos */}
            <View style={styles.exampleSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.black }]}>
                Try an example
              </Text>
              {EXAMPLE_VIDEOS.map((video) => (
                <Pressable
                  key={video.id}
                  style={({ pressed }) => [
                    styles.videoItem,
                    {
                      backgroundColor: theme.colors.grey0,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  onPress={() => router.push({ pathname: '/videos/[id]', params: { id: video.id } })}
                >
                  <Text style={[styles.videoTitle, { color: theme.colors.black }]} numberOfLines={2}>
                    {video.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          </KeyboardAvoidingView>
        </ScrollView>
      </View>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  form: {
    gap: 8,
  },
  inputWrapper: {
    paddingHorizontal: 0,
  },
  inputContainer: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  exampleSection: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
    marginBottom: 12,
  },
  videoItem: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
});
