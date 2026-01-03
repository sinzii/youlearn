import { useState, useEffect, useCallback, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import "./index.css";

type EmbedMessageType =
  | "INIT"
  | "CONTENT_UPDATE"
  | "CONTENT_DONE"
  | "THEME_CHANGE"
  | "READY"
  | "SEEK_TO";

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

/**
 * Format seconds to MM:SS display format
 */
function formatSecondsToTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Process content to convert [seconds] timestamps to formatted markdown links.
 * Converts [123] or [123-456] to [M:SS](timestamp://123) or [M:SS-M:SS](timestamp://123-456)
 */
function processTimestamps(content: string): string {
  return content.replace(/\[(\d+)(?:-(\d+))?\]/g, (_match, start, end) => {
    const startSec = parseInt(start, 10);
    const endSec = end ? parseInt(end, 10) : null;

    // Format as MM:SS for display
    const label = endSec
      ? `${formatSecondsToTime(startSec)}-${formatSecondsToTime(endSec)}`
      : formatSecondsToTime(startSec);

    // Create markdown link with timestamp:// protocol
    const url = `timestamp://${startSec}${endSec ? `-${endSec}` : ""}`;

    return `[${label}](${url})`;
  });
}

/**
 * Custom URL transform to allow timestamp:// protocol.
 * React-markdown's defaultUrlTransform strips unknown protocols for security.
 */
function customUrlTransform(url: string): string {
  // Allow timestamp:// protocol for video seeking
  if (url.startsWith("timestamp://")) {
    return url;
  }
  // Allow common safe protocols and relative URLs
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("mailto:") ||
    url.startsWith("/") ||
    url.startsWith("#")
  ) {
    return url;
  }
  // Strip other protocols for security
  return "";
}

function App() {
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

  // Custom components for ReactMarkdown to handle timestamp links
  const markdownComponents: Components = useMemo(
    () => ({
      a: ({ href, children }) => {
        if (href?.startsWith("timestamp://")) {
          // Extract seconds from timestamp URL
          const timeStr = href.replace("timestamp://", "");
          const seconds = parseInt(timeStr.split("-")[0], 10);

          // Use span instead of anchor to avoid WebView navigation issues
          return (
            <span
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                sendToNative("SEEK_TO", { seconds });
              }}
              className="timestamp-link"
              role="button"
              tabIndex={0}
            >
              {children}
            </span>
          );
        }
        // Regular links open normally
        return (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        );
      },
    }),
    [sendToNative]
  );

  // Process content to format timestamps
  const processedContent = useMemo(
    () => processTimestamps(content),
    [content]
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

  return (
    <div className={`embed-container theme-${theme}`}>
      {!content && !isStreaming && (
        <div className="loading-container">
          <p className={`loading-text theme-${theme}`}>
            Waiting for content...
          </p>
        </div>
      )}

      {content && (
        <div className={`markdown-content theme-${theme}`}>
          <ReactMarkdown
            components={markdownComponents}
            urlTransform={customUrlTransform}
          >
            {processedContent}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default App;
