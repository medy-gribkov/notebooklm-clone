"use client";

import { useState } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { StudioPanel } from "@/components/studio-panel";
import type { Message } from "@/types";

type Tab = "chat" | "studio";

interface NotebookTabsProps {
  notebookId: string;
  initialMessages: Message[];
}

export function NotebookTabs({ notebookId, initialMessages }: NotebookTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="border-b shrink-0">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex gap-0">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "chat"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("studio")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "studio"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Studio
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "chat" ? (
          <ChatInterface notebookId={notebookId} initialMessages={initialMessages} />
        ) : (
          <StudioPanel notebookId={notebookId} />
        )}
      </div>
    </div>
  );
}
