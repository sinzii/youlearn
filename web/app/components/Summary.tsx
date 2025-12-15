"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { streamSummary, ModelName } from "../lib/api";

interface SummaryProps {
  videoId: string;
  model: ModelName;
}

export default function Summary({ videoId, model }: SummaryProps) {
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSummarize = async () => {
    setIsLoading(true);
    setError(null);
    setSummary("");

    try {
      for await (const chunk of streamSummary(videoId, model)) {
        setSummary((prev) => prev + chunk);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {!summary && !isLoading && (
        <div className="mb-3 flex justify-center">
          <button
            onClick={handleSummarize}
            disabled={isLoading}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Summarize
          </button>
        </div>
      )}

      {isLoading && !summary && (
        <div className="mb-3 flex justify-center">
          <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <svg
              className="h-3 w-3 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generating summary...
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {summary && (
        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100 prose-p:text-zinc-700 dark:prose-p:text-zinc-300 prose-li:text-zinc-700 dark:prose-li:text-zinc-300 prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100">
          <ReactMarkdown>{summary}</ReactMarkdown>
          {isLoading && (
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
          )}
        </div>
      )}

      {!summary && !error && !isLoading && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Click &quot;Summarize&quot; to generate an AI summary of this video.
        </p>
      )}
    </div>
  );
}
