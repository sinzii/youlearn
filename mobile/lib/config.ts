import { Asset } from 'expo-asset';

// Embed server URL for development
// const EMBED_DEV_URL = process.env.EXPO_PUBLIC_EMBED_URL || 'http://localhost:5173';

export type EmbedSource = { uri: string };

let cachedUri: string | null = null;

export async function getEmbedSource(): Promise<EmbedSource> {
  // if (__DEV__) {
  //   // Development: load from embed dev server
  //   return { uri: EMBED_DEV_URL };
  // }

  // Return cached URI if available
  if (cachedUri) {
    return { uri: cachedUri };
  }

  // Production: load HTML from bundled asset
  const asset = Asset.fromModule(require('../assets/embed.html'));
  await asset.downloadAsync();

  cachedUri = asset.localUri!;
  return { uri: cachedUri };
}
