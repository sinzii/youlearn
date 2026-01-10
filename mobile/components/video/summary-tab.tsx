import { useAuth } from '@clerk/clerk-expo';
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  Pressable,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { segmentsToText } from '@/utils/transcript';
import {
  useVideoCache,
  useSummaryStreaming,
  useAppDispatch,
  usePreferredLanguage,
  useDetailLevel,
  LANGUAGE_OPTIONS,
  DETAIL_LEVEL_OPTIONS,
  LanguageCode,
  LanguageOption,
  DetailLevel,
  DetailLevelOption,
} from '@/lib/store/hooks';
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
  const { video, updateVideo } = useVideoCache(videoId);
  const { isLoading, streamingContent: streamingText } = useSummaryStreaming(videoId);
  const dispatch = useAppDispatch();
  const preferredLanguage = usePreferredLanguage();
  const globalDetailLevel = useDetailLevel();
  const transcript = video?.transcript ? segmentsToText(video.transcript.segments) : '';
  const { theme } = useTheme();
  const { getToken } = useAuth();
  const colorScheme = useColorScheme();
  const { t } = useTranslation();

  const [error, setError] = useState<string | null>(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [embedSource, setEmbedSource] = useState<EmbedSource | null>(null);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  // Pending state for modal selections (applied on Save)
  const [pendingDetailLevel, setPendingDetailLevel] = useState<DetailLevel | null>(null);
  const [pendingLanguage, setPendingLanguage] = useState<LanguageCode | null>(null);

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
  const menuItem3Opacity = useSharedValue(0);
  const menuItem3TranslateY = useSharedValue(20);

  const menuItem1Style = useAnimatedStyle(() => ({
    opacity: menuItem1Opacity.value,
    transform: [{ translateY: menuItem1TranslateY.value }],
  }));

  const menuItem2Style = useAnimatedStyle(() => ({
    opacity: menuItem2Opacity.value,
    transform: [{ translateY: menuItem2TranslateY.value }],
  }));

  const menuItem3Style = useAnimatedStyle(() => ({
    opacity: menuItem3Opacity.value,
    transform: [{ translateY: menuItem3TranslateY.value }],
  }));

  // Load embed source on mount
  useEffect(() => {
    getEmbedSource().then(setEmbedSource);
  }, []);
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
      // Second button (Resummarize) with delay
      menuItem2Opacity.value = withDelay(80, withTiming(1, { duration: 200 }));
      menuItem2TranslateY.value = withDelay(80, withTiming(0, { duration: 200 }));
      // Top button (Language) with more delay
      menuItem3Opacity.value = withDelay(160, withTiming(1, { duration: 200 }));
      menuItem3TranslateY.value = withDelay(160, withTiming(0, { duration: 200 }));
    } else {
      // Reset immediately
      menuItem1Opacity.value = 0;
      menuItem1TranslateY.value = 20;
      menuItem2Opacity.value = 0;
      menuItem2TranslateY.value = 20;
      menuItem3Opacity.value = 0;
      menuItem3TranslateY.value = 20;
    }
  }, [fabMenuOpen, menuItem1Opacity, menuItem1TranslateY, menuItem2Opacity, menuItem2TranslateY, menuItem3Opacity, menuItem3TranslateY]);

  // Get current content language (from video cache or fall back to preferred)
  const currentContentLanguage = video?.contentLanguage || preferredLanguage;
  // Get current detail level (from video cache or fall back to global preference)
  const currentDetailLevel = video?.detailLevel || globalDetailLevel;

  const handleSummarize = useCallback(async () => {
    setError(null);

    const token = await getToken();
    if (!token) {
      setError('Not authenticated');
      return;
    }

    startSummaryStream(videoId, transcript, token, dispatch, currentContentLanguage, currentDetailLevel);
  }, [videoId, getToken, transcript, dispatch, currentContentLanguage, currentDetailLevel]);

  const handleCopy = useCallback(async () => {
    if (summary) {
      await Clipboard.setStringAsync(summary);
    }
    setFabMenuOpen(false);
  }, [summary]);

  const handleResummarize = useCallback(() => {
    setFabMenuOpen(false);
    const languageName = LANGUAGE_OPTIONS.find(opt => opt.code === currentContentLanguage)?.name || currentContentLanguage;
    const detailLabel = DETAIL_LEVEL_OPTIONS.find(opt => opt.code === currentDetailLevel)?.label || currentDetailLevel;

    Alert.alert(
      t('summary.resummarize'),
      t('summary.resummarizeMessage', { language: languageName, detail: detailLabel }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('summary.resummarize'), onPress: () => handleSummarize() },
      ]
    );
  }, [handleSummarize, currentContentLanguage, currentDetailLevel, t]);

  const handleOpenLanguageModal = useCallback(() => {
    setFabMenuOpen(false);
    // Initialize pending state with current values
    setPendingDetailLevel(currentDetailLevel);
    setPendingLanguage(currentContentLanguage);
    setLanguageModalVisible(true);
  }, [currentDetailLevel, currentContentLanguage]);

  const handleCancel = useCallback(() => {
    setLanguageModalVisible(false);
    // Pending state will be reset on next open
  }, []);

  const handleSave = useCallback(async () => {
    setLanguageModalVisible(false);

    const detailChanged = pendingDetailLevel !== currentDetailLevel;
    const languageChanged = pendingLanguage !== currentContentLanguage;

    // No changes, nothing to do
    if (!detailChanged && !languageChanged) return;

    // Only clear suggestedQuestions if chat history is empty
    const hasChatHistory = video?.chatMessages && video.chatMessages.length > 0;

    // Apply changes and regenerate
    updateVideo({
      summary: null,
      chapters: languageChanged ? null : video?.chapters,
      suggestedQuestions: hasChatHistory ? video?.suggestedQuestions : null,
      detailLevel: pendingDetailLevel!,
      contentLanguage: pendingLanguage!,
    });

    const token = await getToken();
    if (token && pendingDetailLevel && pendingLanguage) {
      startSummaryStream(videoId, transcript, token, dispatch, pendingLanguage, pendingDetailLevel);
    }
  }, [
    pendingDetailLevel,
    pendingLanguage,
    currentDetailLevel,
    currentContentLanguage,
    video?.chatMessages,
    video?.suggestedQuestions,
    video?.chapters,
    updateVideo,
    getToken,
    videoId,
    transcript,
    dispatch,
  ]);

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
          {t('summary.generate')}
        </Text>
        <Button
          title={t('summary.summarize')}
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
          title={t('common.retry')}
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
            {t('summary.generating')}
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
              { label: t('summary.explain'), key: 'explain' },
              { label: t('video.ask'), key: 'ask' },
            ]}
            onCustomMenuSelection={handleCustomMenuSelection}
            // @ts-expect-error backgroundColor is valid for WebView
            backgroundColor={theme.colors.background}
          />
        </Animated.View>
      )}

      {/* FAB Menu - show when streaming content or complete, not during initial loading */}
      {displayText && webViewReady && (
        <View style={styles.fabContainer}>
          {fabMenuOpen && !isLoading && (
            <View style={styles.fabMenu}>
              <Animated.View style={menuItem3Style}>
                <TouchableOpacity
                  style={[styles.fabMenuIcon, { backgroundColor: theme.colors.grey0 }]}
                  onPress={handleOpenLanguageModal}
                >
                  <MaterialIcons name="translate" size={24} color={theme.colors.black} />
                </TouchableOpacity>
              </Animated.View>
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
            style={[
              styles.fab,
              { backgroundColor: theme.colors.primary },
              isLoading && { opacity: 0.6 },
            ]}
            onPress={() => !isLoading && setFabMenuOpen(!fabMenuOpen)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name={fabMenuOpen ? 'close' : 'bolt'} size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Language Picker Modal */}
      <Modal
        visible={languageModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancel}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.greyOutline }]}>
            <Pressable onPress={handleCancel} hitSlop={10}>
              <Text style={[styles.modalHeaderButton, { color: theme.colors.grey4 }]}>
                {t('common.cancel')}
              </Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: theme.colors.black }]}>
              {t('summary.contentSettings')}
            </Text>
            <Pressable onPress={handleSave} hitSlop={10}>
              <Text style={[styles.modalHeaderButton, { color: theme.colors.primary }]}>
                {t('common.save')}
              </Text>
            </Pressable>
          </View>

          {/* Detail Level Toggle */}
          <View style={styles.detailLevelSection}>
            <Text style={[styles.sectionLabel, { color: theme.colors.grey4 }]}>
              {t('summary.summaryDetail')}
            </Text>
            <View style={[styles.toggleContainer, { backgroundColor: theme.colors.grey0 }]}>
              {DETAIL_LEVEL_OPTIONS.map((option: DetailLevelOption) => {
                const isSelected = option.code === pendingDetailLevel;
                return (
                  <TouchableOpacity
                    key={option.code}
                    style={[
                      styles.toggleButton,
                      isSelected && [styles.toggleButtonActive, { backgroundColor: theme.colors.primary }],
                    ]}
                    onPress={() => setPendingDetailLevel(option.code)}
                  >
                    <Text
                      style={[
                        styles.toggleButtonText,
                        { color: isSelected ? '#fff' : theme.colors.grey4 },
                      ]}
                    >
                      {t(`detailLevel.${option.code}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Language Section Label */}
          <View style={styles.languageSectionHeader}>
            <Text style={[styles.sectionLabel, { color: theme.colors.grey4 }]}>
              {t('summary.language')}
            </Text>
          </View>

          <FlatList
            data={LANGUAGE_OPTIONS}
            keyExtractor={(item) => item.code}
            renderItem={({ item }: { item: LanguageOption }) => {
              const isSelected = item.code === pendingLanguage;
              return (
                <Pressable
                  style={[
                    styles.languageOption,
                    { backgroundColor: isSelected ? theme.colors.grey0 : 'transparent' },
                  ]}
                  onPress={() => setPendingLanguage(item.code)}
                >
                  <View style={styles.languageOptionText}>
                    <Text style={[styles.languageOptionName, { color: theme.colors.black }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.languageOptionNative, { color: theme.colors.grey4 }]}>
                      {item.nativeName}
                    </Text>
                  </View>
                  {isSelected && (
                    <MaterialIcons name="check" size={20} color={theme.colors.primary} />
                  )}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

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
  languageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  languageBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalHeaderButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  languageOptionText: {
    flex: 1,
  },
  languageOptionName: {
    fontSize: 16,
  },
  languageOptionNative: {
    fontSize: 13,
    marginTop: 2,
  },
  detailLevelSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  languageSectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
});
