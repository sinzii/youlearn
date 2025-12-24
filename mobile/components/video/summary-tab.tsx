import { useAuth } from '@clerk/clerk-expo';
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Text, Button, useTheme } from '@rneui/themed';

import { segmentsToText } from '@/utils/transcript';
import { useVideoCache, useVideoStreaming, useAppDispatch } from '@/lib/store';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { startSummaryStream } from '@/lib/streaming';
import { getEmbedSource, type EmbedSource } from '@/lib/config';

interface EmbedMessage {
  type: 'INIT' | 'CONTENT_UPDATE' | 'CONTENT_DONE' | 'THEME_CHANGE' | 'READY';
  payload: unknown;
  timestamp: number;
}

interface SummaryTabProps {
  videoId: string;
  onTextAction?: (action: 'explain' | 'ask', text: string) => void;
}

export function SummaryTab({ videoId, onTextAction }: SummaryTabProps) {
  const { video } = useVideoCache(videoId);
  const { streaming } = useVideoStreaming(videoId);
  const dispatch = useAppDispatch();
  const transcript = video?.transcript ? segmentsToText(video.transcript.segments) : '';
  const { theme } = useTheme();
  const { getToken } = useAuth();
  const colorScheme = useColorScheme();

  const [error, setError] = useState<string | null>(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [embedSource, setEmbedSource] = useState<EmbedSource | null>(null);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);

  const hasAutoTriggeredRef = useRef(false);
  const webViewRef = useRef<WebView>(null);
  const pendingMessagesRef = useRef<EmbedMessage[]>([]);

  // Fade-in animation
  const opacity = useSharedValue(0);
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // FAB menu item animations (bottom to top stagger)
  const menuItem1Opacity = useSharedValue(0);
  const menuItem1TranslateY = useSharedValue(20);
  const menuItem2Opacity = useSharedValue(0);
  const menuItem2TranslateY = useSharedValue(20);

  const menuItem1Style = useAnimatedStyle(() => ({
    opacity: menuItem1Opacity.value,
    transform: [{ translateY: menuItem1TranslateY.value }],
  }));

  const menuItem2Style = useAnimatedStyle(() => ({
    opacity: menuItem2Opacity.value,
    transform: [{ translateY: menuItem2TranslateY.value }],
  }));

  // Load embed source on mount
  useEffect(() => {
    getEmbedSource().then(setEmbedSource);
  }, []);

  const isLoading = streaming.isLoadingSummary;
  const streamingText = streaming.streamingSummary;
  const summary = video?.summary || null;
  const displayText = isLoading ? streamingText : summary;

  const currentTheme = colorScheme === 'dark' ? 'dark' : 'light';

  const sendToWebView = useCallback((type: EmbedMessage['type'], payload: unknown) => {
    const message: EmbedMessage = {
      type,
      payload,
      timestamp: Date.now(),
    };

    if (webViewReady && webViewRef.current) {
      const script = `
        window.postMessage(${JSON.stringify(JSON.stringify(message))}, '*');
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    } else {
      pendingMessagesRef.current.push(message);
    }
  }, [webViewReady]);

  const handleWebViewReady = useCallback(() => {
    setWebViewReady(true);
    // Trigger fade-in animation
    opacity.value = withTiming(1, { duration: 200 });

    // Send initial theme and content
    const initMessage: EmbedMessage = {
      type: 'INIT',
      payload: {
        theme: currentTheme,
        initialContent: displayText || undefined,
      },
      timestamp: Date.now(),
    };

    if (webViewRef.current) {
      const script = `
        window.postMessage(${JSON.stringify(JSON.stringify(initMessage))}, '*');
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }

    // Flush pending messages
    pendingMessagesRef.current.forEach(msg => {
      if (webViewRef.current) {
        const script = `
          window.postMessage(${JSON.stringify(JSON.stringify(msg))}, '*');
          true;
        `;
        webViewRef.current.injectJavaScript(script);
      }
    });
    pendingMessagesRef.current = [];
  }, [currentTheme, displayText, opacity]);

  const handleWebViewMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message: EmbedMessage = JSON.parse(event.nativeEvent.data);

      if (message.type === 'READY') {
        handleWebViewReady();
      }
    } catch (err) {
      console.error('Failed to parse WebView message:', err);
    }
  }, [handleWebViewReady]);

  // Handle custom menu selection (Explain this / Ask)
  const handleCustomMenuSelection = useCallback((event: { nativeEvent: { key: string; selectedText: string } }) => {
    const { key, selectedText } = event.nativeEvent;
    if (selectedText && (key === 'explain' || key === 'ask')) {
      onTextAction?.(key, selectedText);
    }
  }, [onTextAction]);

  // Sync content to WebView when displayText changes
  useEffect(() => {
    if (webViewReady && displayText !== undefined) {
      sendToWebView('CONTENT_UPDATE', {
        content: displayText || '',
        isStreaming: isLoading,
      });
    }
  }, [displayText, isLoading, webViewReady, sendToWebView]);

  // Sync theme changes to WebView
  useEffect(() => {
    if (webViewReady) {
      sendToWebView('THEME_CHANGE', { theme: currentTheme });
    }
  }, [currentTheme, webViewReady, sendToWebView]);

  // Handle streaming completion
  useEffect(() => {
    if (webViewReady && !isLoading && summary) {
      sendToWebView('CONTENT_DONE', { finalContent: summary });
    }
  }, [isLoading, summary, webViewReady, sendToWebView]);

  // Animate FAB menu items when opening/closing
  useEffect(() => {
    if (fabMenuOpen) {
      // Bottom button first (Copy)
      menuItem1Opacity.value = withTiming(1, { duration: 200 });
      menuItem1TranslateY.value = withTiming(0, { duration: 200 });
      // Top button second (Resummarize) with delay
      menuItem2Opacity.value = withDelay(80, withTiming(1, { duration: 200 }));
      menuItem2TranslateY.value = withDelay(80, withTiming(0, { duration: 200 }));
    } else {
      // Reset immediately
      menuItem1Opacity.value = 0;
      menuItem1TranslateY.value = 20;
      menuItem2Opacity.value = 0;
      menuItem2TranslateY.value = 20;
    }
  }, [fabMenuOpen, menuItem1Opacity, menuItem1TranslateY, menuItem2Opacity, menuItem2TranslateY]);

  const handleSummarize = useCallback(async () => {
    setError(null);

    const token = await getToken();
    if (!token) {
      setError('Not authenticated');
      return;
    }

    startSummaryStream(videoId, transcript, token, dispatch);
  }, [videoId, getToken, transcript, dispatch]);

  const handleCopy = useCallback(async () => {
    if (summary) {
      await Clipboard.setStringAsync(summary);
    }
    setFabMenuOpen(false);
  }, [summary]);

  const handleResummarize = useCallback(() => {
    setFabMenuOpen(false);
    Alert.alert(
      'Resummarize',
      'Are you sure you want to regenerate the summary?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resummarize', onPress: () => handleSummarize() },
      ]
    );
  }, [handleSummarize]);

  // Auto-trigger summarization when transcript is available
  useEffect(() => {
    if (transcript && !summary && !isLoading && !streamingText && !hasAutoTriggeredRef.current) {
      hasAutoTriggeredRef.current = true;
      handleSummarize();
    }
  }, [transcript, summary, isLoading, streamingText, handleSummarize]);

  const handleWebViewError = useCallback(() => {
    setWebViewError('Failed to load content renderer. Please check your connection.');
  }, []);

  const handleRetry = useCallback(() => {
    setWebViewError(null);
    setWebViewReady(false);
  }, []);

  // Empty state - no content yet
  if (!displayText && !isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.grey4 }]}>
          Generate a summary of this video&#39;s content
        </Text>
        <Button
          title="Summarize"
          onPress={handleSummarize}
          size="sm"
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  // WebView error state
  if (webViewError) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.errorText}>{webViewError}</Text>
        <Button
          title="Retry"
          onPress={handleRetry}
          size="sm"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Loading indicator shown during initial summary generation */}
      {isLoading && !streamingText && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.grey4 }]}>
            Generating summary...
          </Text>
        </View>
      )}

      {embedSource && (
        <Animated.View style={[styles.webView, fadeStyle]}>
          <WebView
            ref={webViewRef}
            source={embedSource}
            style={{...styles.webView, backgroundColor: theme.colors.background }}
            onMessage={handleWebViewMessage}
            onError={handleWebViewError}
            onHttpError={handleWebViewError}
            scrollEnabled={true}
            showsVerticalScrollIndicator={true}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={false}
            scalesPageToFit={false}
            menuItems={[
              { label: 'Explain', key: 'explain' },
              { label: 'Ask', key: 'ask' },
            ]}
            onCustomMenuSelection={handleCustomMenuSelection}
            // @ts-expect-error backgroundColor is valid for WebView
            backgroundColor={theme.colors.background}
          />
        </Animated.View>
      )}

      {/* FAB Menu */}
      {displayText && !isLoading && webViewReady && (
        <View style={styles.fabContainer}>
          {fabMenuOpen && (
            <View style={styles.fabMenu}>
              <Animated.View style={menuItem2Style}>
                <TouchableOpacity
                  style={[styles.fabMenuIcon, { backgroundColor: theme.colors.grey0 }]}
                  onPress={handleResummarize}
                >
                  <MaterialIcons name="refresh" size={24} color={theme.colors.black} />
                </TouchableOpacity>
              </Animated.View>
              <Animated.View style={menuItem1Style}>
                <TouchableOpacity
                  style={[styles.fabMenuIcon, { backgroundColor: theme.colors.grey0 }]}
                  onPress={handleCopy}
                >
                  <MaterialIcons name="content-copy" size={24} color={theme.colors.black} />
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            onPress={() => setFabMenuOpen(!fabMenuOpen)}
          >
            <MaterialIcons name={fabMenuOpen ? 'close' : 'bolt'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  emptyText: {
    textAlign: 'center',
  },
  errorText: {
    color: '#ef4444',
    marginTop: 12,
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 35,
    right: 16,
    alignItems: 'flex-end',
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabMenu: {
    marginBottom: 16,
    alignItems: 'flex-end',
    gap: 12,
  },
  fabMenuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});
