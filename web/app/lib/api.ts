const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface TranscriptResponse {
  video_id: string;
  title: string;
  language: string;
  language_code: string;
  is_generated: boolean;
  segments: TranscriptSegment[];
}

export interface SummarizeResponse {
  video_id: string;
  summary: string;
  model: string;
}

export type ModelName = "gpt-5.1" | "gpt-4o";

export async function fetchTranscript(
  videoId: string,
  lang?: string
): Promise<TranscriptResponse> {
  const params = new URLSearchParams({ video_id: videoId });
  if (lang) params.append("lang", lang);

  const response = await fetch(
    `${API_BASE_URL}/youtube/transcript?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch transcript");
  }

  return response.json();
}

export async function* streamSummary(
  videoId: string,
  model: ModelName = "gpt-5.1"
): AsyncGenerator<string> {
  const response = await fetch(`${API_BASE_URL}/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ video_id: videoId, model }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to generate summary");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;
        yield data;
      }
    }
  }
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function* streamChat(
  videoId: string,
  messages: ChatMessage[],
  model: ModelName = "gpt-5.1"
): AsyncGenerator<string> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ video_id: videoId, messages, model }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to start chat");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;
        yield data;
      }
    }
  }
}
