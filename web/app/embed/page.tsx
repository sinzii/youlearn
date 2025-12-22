"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

type EmbedMessageType =
  | "INIT"
  | "CONTENT_UPDATE"
  | "CONTENT_DONE"
  | "THEME_CHANGE"
  | "READY";

interface EmbedMessage {
  type: EmbedMessageType;
  payload: unknown;
  timestamp: number;
}

interface InitPayload {
  theme: "light" | "dark";
  initialContent?: string;
}

interface ContentUpdatePayload {
  content: string;
  isStreaming: boolean;
}

interface ContentDonePayload {
  finalContent: string;
}

interface ThemeChangePayload {
  theme: "light" | "dark";
}

const EMBED_VERSION = "1.0.0";

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

export default function EmbedPage() {
  const [content, setContent] = useState<string>("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isStreaming, setIsStreaming] = useState(false);

  const sendToNative = useCallback(
    (type: EmbedMessageType, payload: unknown) => {
      const message: EmbedMessage = {
        type,
        payload,
        timestamp: Date.now(),
      };

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }
    },
    []
  );

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: EmbedMessage =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;

      switch (message.type) {
        case "INIT": {
          const payload = message.payload as InitPayload;
          setTheme(payload.theme);
          if (payload.initialContent) {
            setContent(payload.initialContent);
          }
          break;
        }
        case "CONTENT_UPDATE": {
          const payload = message.payload as ContentUpdatePayload;
          setContent(payload.content);
          setIsStreaming(payload.isStreaming);
          break;
        }
        case "CONTENT_DONE": {
          const payload = message.payload as ContentDonePayload;
          setContent(payload.finalContent);
          setIsStreaming(false);
          break;
        }
        case "THEME_CHANGE": {
          const payload = message.payload as ThemeChangePayload;
          setTheme(payload.theme);
          break;
        }
      }
    } catch (error) {
      console.error("Failed to parse message:", error);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);

    // React Native WebView on Android uses document message event
    const handleDocumentMessage = (event: Event) => {
      const customEvent = event as MessageEvent;
      if (customEvent.data) {
        handleMessage(customEvent);
      }
    };
    document.addEventListener("message", handleDocumentMessage as EventListener);

    // Signal ready to React Native
    sendToNative("READY", { version: EMBED_VERSION });

    return () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("message", handleDocumentMessage as EventListener);
    };
  }, [handleMessage, sendToNative]);

  const containerClasses =
    theme === "dark" ? "bg-[#151718]" : "bg-white";

  return (
    <div className={`min-h-screen p-4 ${containerClasses}`}>
      {!content && !isStreaming && (
        <div className="flex items-center justify-center h-32">
          <p
            className={`text-sm ${theme === "dark" ? "text-zinc-500" : "text-zinc-400"}`}
          >
            Waiting for content...
          </p>
        </div>
      )}

      {content && (
        <div className={`markdown-content theme-${theme}`}>
          <ReactMarkdown>{content}</ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
          )}
        </div>
      )}
    </div>
  );
}
