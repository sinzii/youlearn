"use client";

import { useState } from "react";
import { summarizeVideo, ModelName } from "../lib/api";

interface SummaryProps {
  videoId: string;
  model: ModelName;
}

export default function Summary({ videoId, model }: SummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSummarize = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await summarizeVideo(videoId, model);
      setSummary(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {!summary && (
        <div className="mb-3 flex justify-center">
          <button
            onClick={handleSummarize}
            disabled={isLoading}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5">
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
                Generating...
              </span>
            ) : (
              "Summarize"
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {summary && (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {summary}
          </p>
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
