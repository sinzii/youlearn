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

// Combine all reducers first
const rootReducer = combineReducers({
  theme: themeReducer,
  videos: videosReducer,
  streaming: streamingReducer,
});

// Single persist config at root level
// This ensures PersistGate properly waits for ALL persisted state to load
const persistConfig = {
  key: 'videoinsight-root',
  storage: AsyncStorage,
  version: 1,
  whitelist: ['theme', 'videos'], // Only persist these slices (not streaming)
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
