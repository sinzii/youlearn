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

// Persist config for theme
const themePersistConfig = {
  key: 'videoinsight-theme',
  storage: AsyncStorage,
  version: 1,
};

// Persist config for videos
const videosPersistConfig = {
  key: 'videoinsight-videos',
  storage: AsyncStorage,
  version: 1,
};

const rootReducer = combineReducers({
  theme: persistReducer(themePersistConfig, themeReducer),
  videos: persistReducer(videosPersistConfig, videosReducer),
  streaming: streamingReducer, // NOT persisted - ephemeral state
});

export const store = configureStore({
  reducer: rootReducer,
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
