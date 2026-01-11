import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import themeReducer from './slices/themeSlice';
import videosReducer from './slices/videosSlice';
import streamingReducer from './slices/streamingSlice';
import languageReducer from './slices/languageSlice';
import displayLanguageReducer from './slices/displayLanguageSlice';
import subscriptionReducer from './slices/subscriptionSlice';

// Combine all reducers first
const rootReducer = combineReducers({
  theme: themeReducer,
  videos: videosReducer,
  streaming: streamingReducer,
  language: languageReducer,
  displayLanguage: displayLanguageReducer,
  subscription: subscriptionReducer,
});

// Single persist config at root level
// This ensures PersistGate properly waits for ALL persisted state to load
const persistConfig = {
  key: 'videoinsight-root',
  storage: AsyncStorage,
  version: 1,
  whitelist: ['theme', 'videos', 'language', 'displayLanguage', 'subscription'], // Only persist these slices (not streaming)
};

// Wrap the entire root reducer with persistReducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Re-export hooks
export {
  useAppDispatch,
  useAppSelector,
  useThemePreference,
  useSetThemePreference,
  useVideoCache,
  useRecentVideos,
  useClearVideos,
  useRemoveVideo,
  useVideoStreaming,
  useChatStreaming,
  useSummaryStreaming,
  usePreferredLanguage,
  useSetPreferredLanguage,
  useDetailLevel,
  useSetDetailLevel,
  useDetailLevelOptions,
  useLanguageOptions,
  useDisplayLanguage,
  useSetDisplayLanguage,
  useDisplayLanguageOptions,
  useSubscription,
  useIsPro,
  useIsTrialing,
  useSetSubscription,
  useResetSubscription,
} from './hooks';

export type {
  ThemePreference,
  VideoCache,
  VideosState,
  VideoStreamingState,
  StreamingState,
  SubscriptionState,
} from './hooks';

export type { LanguageCode, LanguageOption, DetailLevel, DetailLevelOption } from './slices/languageSlice';
export { LANGUAGE_OPTIONS, DETAIL_LEVEL_OPTIONS, setPreferredLanguage, setDetailLevel } from './slices/languageSlice';

export type { DisplayLanguageCode } from './slices/displayLanguageSlice';
export { DISPLAY_LANGUAGE_OPTIONS, setDisplayLanguage } from './slices/displayLanguageSlice';

export { updateStreaming, resetStreaming } from './slices/streamingSlice';
export { updateVideo, removeVideo, clearVideos } from './slices/videosSlice';
export { setSubscription, resetSubscription } from './slices/subscriptionSlice';
