// @ts-ignore
const PRIVATE_API_KEY = process.env.PRIVATE_API_KEY;

export function validateApiKey(apiKey: string): void {
  if (!PRIVATE_API_KEY || apiKey !== PRIVATE_API_KEY) {
    throw new Error("Unauthorized: Invalid API key");
  }
}
