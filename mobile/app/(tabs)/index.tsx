import * as Clipboard from 'expo-clipboard';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
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
import { Text, Input, useTheme } from '@rneui/themed';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { extractVideoId } from '@/utils/youtube';

const EXAMPLE_VIDEOS = [
  { id: 'XA9Q5p9ODac', title: 'Quantum Consciousness and the Origin of Life' },
  { id: 'BHEhxPuMmQI', title: 'Physicist Brian Cox explains quantum physics in 22 minutes' },
  { id: 'kO41iURud9c', title: 'Brian Cox: The quantum roots of reality' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function NewScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState(0);

  // Force re-render when tab gains focus to fix blank screen issue with tab animation
  useFocusEffect(
    useCallback(() => {
      setFocusKey(prev => prev + 1);
    }, [])
  );

  // Shake animation
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  // Auto-hide error after 5 seconds
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      const videoId = extractVideoId(text.trim());
      if (videoId) {
        setError(null);
        router.push({ pathname: '/videos/[id]', params: { id: videoId } });
      } else {
        setError('Invalid YouTube URL. Please paste a valid link.');
        triggerShake();
      }
    }
  };

  return (
    <SafeAreaView key={focusKey} style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
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
                placeholder="Paste YouTube URL"
                editable={false}
                renderErrorMessage={false}
                rightIcon={
                  <AnimatedPressable
                    onPress={handlePaste}
                    style={[styles.pasteButton, { backgroundColor: theme.colors.primary }, shakeStyle]}
                  >
                    <Text style={styles.pasteButtonText}>Paste</Text>
                    <MaterialIcons name="content-paste" size={16} color="#fff" />
                  </AnimatedPressable>
                }
                inputContainerStyle={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.colors.grey0,
                    borderColor: error ? '#ef4444' : theme.colors.greyOutline,
                  },
                ]}
                containerStyle={styles.inputWrapper}
              />
              <Text style={[styles.errorText, !error && styles.errorTextHidden]}>
                {error || ' '}
              </Text>
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
  form: {
    gap: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 4,
    marginLeft: 4,
  },
  errorTextHidden: {
    opacity: 0,
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
  inputWrapper: {
    paddingHorizontal: 0,
  },
  inputContainer: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 0,
  },
  exampleSection: {
    marginTop: 16,
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
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  pasteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
