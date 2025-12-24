import React, { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { renderHook, RenderHookOptions } from '@testing-library/react-native';

import themeReducer from './slices/themeSlice';
import videosReducer from './slices/videosSlice';
import streamingReducer from './slices/streamingSlice';
import type { RootState } from './index';

// Create a test store without persistence
export function createTestStore(preloadedState?: Partial<RootState>) {
  const rootReducer = combineReducers({
    theme: themeReducer,
    videos: videosReducer,
    streaming: streamingReducer,
  });

  return configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as RootState,
  });
}

export type TestStore = ReturnType<typeof createTestStore>;

interface WrapperProps {
  children: ReactNode;
}

// Create a wrapper component with Redux Provider
export function createWrapper(store: TestStore) {
  return function Wrapper({ children }: WrapperProps) {
    return <Provider store={store}>{children}</Provider>;
  };
}

// Render hook with Redux Provider
export function renderHookWithRedux<Result, Props>(
  hook: (props: Props) => Result,
  options?: {
    preloadedState?: Partial<RootState>;
    store?: TestStore;
  } & Omit<RenderHookOptions<Props>, 'wrapper'>
) {
  const store = options?.store ?? createTestStore(options?.preloadedState);
  const wrapper = createWrapper(store);

  const result = renderHook(hook, { ...options, wrapper });

  return {
    ...result,
    store,
  };
}

// Helper to create a mock video cache entry
export function createMockVideoCache(overrides: Partial<{
  video_id: string;
  title: string;
  author: string;
  thumbnail_url: string;
  length: number;
  transcript: null;
  summary: string | null;
  chatMessages: null;
  suggestedQuestions: null;
  lastAccessed: number;
}> = {}) {
  return {
    video_id: 'test-video-id',
    title: 'Test Video Title',
    author: 'Test Author',
    thumbnail_url: 'https://example.com/thumb.jpg',
    length: 300,
    transcript: null,
    summary: null,
    chatMessages: null,
    suggestedQuestions: null,
    lastAccessed: Date.now(),
    ...overrides,
  };
}
