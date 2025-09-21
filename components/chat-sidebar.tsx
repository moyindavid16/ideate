"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";

export function ChatSidebar() {
  const runtime = useChatRuntime();

  return (
    <div className="h-full main-content-panel sticky-blue mr-8 pb-8 ml-2 rounded-b-2xl p-4">
      <AssistantRuntimeProvider runtime={runtime}>
        <Thread />
      </AssistantRuntimeProvider>
    </div>
  );
}