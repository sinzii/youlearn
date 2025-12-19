"use client";

import { useState } from "react";
import {
  fetchTranscript,
  TranscriptResponse,
  ModelName,
} from "./lib/api";
import VideoPlayer from "./components/VideoPlayer";
import TabContainer from "./components/TabContainer";
import TranscriptView from "./components/TranscriptView";
import SummaryChat from "./components/SummaryChat";

export default function Home() {
  const [videoUrl, setVideoUrl] = useState("");
  const [model, setModel] = useState<ModelName>("gpt-4o-mini");
  const [transcript, setTranscript] = useState<TranscriptResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    setTranscript(null);

    try {
      const result = await fetchTranscript(videoUrl);
      setTranscript(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load transcript"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-[600px] px-4 py-6">
        {/* Header */}
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            VideoInsight
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Learn from YouTube videos with AI
          </p>
        </header>

        {/* Input Form */}
        <form onSubmit={handleLoadVideo} className="mb-6">
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Paste YouTube URL or video ID..."
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
            <div className="flex gap-3">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as ModelName)}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4o">GPT-4o</option>
              </select>
              <button
                type="submit"
                disabled={isLoading || !videoUrl.trim()}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Loading..." : "Load Video"}
              </button>
            </div>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Content Area */}
        {transcript && (
          <div className="space-y-4">
            {/* Video Player */}
            <VideoPlayer
              videoId={transcript.video_id}
              title={transcript.title}
            />

            {/* Tabs: Summary & Chat / Transcript */}
            <TabContainer
              summaryChatContent={
                <SummaryChat videoId={transcript.video_id} model={model} />
              }
              transcriptContent={
                <TranscriptView
                  segments={transcript.segments}
                  language={transcript.language}
                />
              }
            />
          </div>
        )}

        {/* Empty State */}
        {!transcript && !isLoading && !error && (
          <div className="rounded-lg border-2 border-dashed border-zinc-200 p-8 text-center dark:border-zinc-700">
            <svg
              className="mx-auto h-10 w-10 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-3 text-base font-medium text-zinc-900 dark:text-zinc-100">
              No video loaded
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Enter a YouTube URL above to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
