"use client";

import { useState, useRef, useEffect } from "react";
import { streamChat, ChatMessage, ModelName } from "../lib/api";

interface ChatProps {
  videoId: string;
  model: ModelName;
}

export default function Chat({ videoId, model }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      let assistantContent = "";
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      for await (const chunk of streamChat(videoId, newMessages, model)) {
        assistantContent += chunk;
        setMessages([
          ...newMessages,
          { role: "assistant", content: assistantContent },
        ]);
      }
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Failed to get response"}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-96 flex-col rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
          Chat with Video
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Ask questions about the video content
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Start a conversation about the video
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.content === "" && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-zinc-100 px-4 py-2 dark:bg-zinc-800">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-zinc-200 p-4 dark:border-zinc-700"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the video..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
