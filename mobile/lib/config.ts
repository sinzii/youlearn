const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3000';

export function getEmbedUrl(): string {
  return `${WEB_URL}/embed`;
}
