"use client";

import { useState } from "react";
import { TranscriptSegment } from "../lib/api";

interface TranscriptViewProps {
  segments: TranscriptSegment[];
  language: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function TranscriptView({
  segments,
  language,
}: TranscriptViewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displaySegments = isExpanded ? segments : segments.slice(0, 5);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Transcript
        </h3>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {language} - {segments.length} segments
        </span>
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {displaySegments.map((segment, index) => (
          <div
            key={index}
            className="flex gap-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 p-1.5 rounded"
          >
            <span className="text-zinc-400 dark:text-zinc-500 font-mono min-w-[40px]">
              {formatTime(segment.start)}
            </span>
            <span className="text-zinc-700 dark:text-zinc-300">
              {segment.text}
            </span>
          </div>
        ))}
      </div>

      {segments.length > 5 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {isExpanded
            ? "Show less"
            : `Show all ${segments.length} segments`}
        </button>
      )}
    </div>
  );
}
