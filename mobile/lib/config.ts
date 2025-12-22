// Embed server URL for development
const EMBED_DEV_URL = process.env.EXPO_PUBLIC_EMBED_URL || 'http://localhost:5173';

// In production, you can import the built HTML or set EXPO_PUBLIC_EMBED_URL to a hosted URL
// For local bundling, import the HTML content and use: { html: embedHtml }

export type EmbedSource = { uri: string } | { html: string };

export function getEmbedSource(): EmbedSource {
  // For now, always use URL-based loading
  // To use bundled HTML in production:
  // 1. Build embed project: cd embed && pnpm build
  // 2. Import the built HTML or set a production URL
  return { uri: EMBED_DEV_URL };
}

// Legacy function for backwards compatibility
export function getEmbedUrl(): string {
  return EMBED_DEV_URL;
}
