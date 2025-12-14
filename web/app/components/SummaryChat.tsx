"use client";

import Summary from "./Summary";
import Chat from "./Chat";
import { ModelName } from "../lib/api";

interface SummaryChatProps {
  videoId: string;
  model: ModelName;
}

export default function SummaryChat({ videoId, model }: SummaryChatProps) {
  return (
    <div className="space-y-4">
      {/* Summary Section */}
      <div>
        <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
          Summary
        </h3>
        <Summary videoId={videoId} model={model} />
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-200 dark:border-zinc-700" />

      {/* Chat Section */}
      <div>
        <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
          Chat
        </h3>
        <Chat videoId={videoId} model={model} />
      </div>
    </div>
  );
}
