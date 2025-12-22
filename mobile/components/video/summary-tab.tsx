import { useAuth } from '@clerk/clerk-expo';
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
} from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { Text, Button, useTheme } from '@rneui/themed';
import { useSetAtom } from 'jotai';

import { segmentsToText } from '@/utils/transcript';
import { useVideoCache, useVideoStreaming, videosAtom, streamingStateAtom } from '@/lib/store';
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
  const setStreamingState = useSetAtom(streamingStateAtom);
  const setVideos = useSetAtom(videosAtom);
  const transcript = video?.transcript ? segmentsToText(video.transcript.segments) : '';
  const { theme } = useTheme();
  const { getToken } = useAuth();
  const colorScheme = useColorScheme();

  const [error, setError] = useState<string | null>(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [embedSource, setEmbedSource] = useState<EmbedSource | null>(null);

  const hasAutoTriggeredRef = useRef(false);
  const webViewRef = useRef<WebView>(null);
  const pendingMessagesRef = useRef<EmbedMessage[]>([]);

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
  }, [currentTheme, displayText]);

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

  const handleSummarize = useCallback(async () => {
    setError(null);

    const token = await getToken();
    if (!token) {
      setError('Not authenticated');
      return;
    }

    startSummaryStream(videoId, transcript, token, setStreamingState, setVideos);
  }, [videoId, getToken, transcript, setStreamingState, setVideos]);

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
      {/* Loading indicator shown while WebView initializes OR during initial stream */}
      {(!embedSource || !webViewReady || (isLoading && !streamingText)) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.grey4 }]}>
            {!embedSource || !webViewReady ? 'Loading...' : 'Generating summary...'}
          </Text>
        </View>
      )}

      {embedSource && (
        <WebView
          ref={webViewRef}
          source={embedSource}
          style={[styles.webView, !webViewReady && styles.hidden]}
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
      )}

      {/* Resummarize button */}
      {displayText && !isLoading && webViewReady && (
        <View style={styles.buttonContainer}>
          <Button
            title="Resummarize"
            type="clear"
            onPress={handleSummarize}
            titleStyle={[styles.resummarizeText, { color: theme.colors.grey4 }]}
          />
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
  hidden: {
    opacity: 0,
    height: 0,
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
  buttonContainer: {
    padding: 8,
    alignItems: 'center',
  },
  resummarizeText: {
    fontSize: 14,
  },
});
