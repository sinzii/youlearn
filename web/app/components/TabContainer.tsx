"use client";

import { useState, ReactNode } from "react";

type TabId = "summaryChat" | "transcript";

interface Tab {
  id: TabId;
  label: string;
}

interface TabContainerProps {
  summaryChatContent: ReactNode;
  transcriptContent: ReactNode;
}

const tabs: Tab[] = [
  { id: "summaryChat", label: "Summary & Chat" },
  { id: "transcript", label: "Transcript" },
];

export default function TabContainer({
  summaryChatContent,
  transcriptContent,
}: TabContainerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("summaryChat");

  const renderContent = () => {
    switch (activeTab) {
      case "summaryChat":
        return summaryChatContent;
      case "transcript":
        return transcriptContent;
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 overflow-hidden">
      {/* Tab Buttons */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-3">{renderContent()}</div>
    </div>
  );
}
