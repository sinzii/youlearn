export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    // Handle expo-share-intent URLs
    // Format: videoinsight://dataUrl=videoinsightShareKey#weburl
    if (path.includes('dataUrl=')) {
      // Redirect to home - ShareIntentProvider will handle the actual navigation
      return '/';
    }
    return path;
  } catch {
    return '/';
  }
}
