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
    <div>
      <div className="mb-2 text-center">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {language} - {segments.length} segments
        </span>
      </div>

      <div className="space-y-1 max-h-60 overflow-y-auto">
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
        <div className="mt-2 text-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {isExpanded
              ? "Show less"
              : `Show all ${segments.length} segments`}
          </button>
        </div>
      )}
    </div>
  );
}
