"use client";

import {Thread} from "@/components/assistant-ui/thread";
import {useChat} from "@ai-sdk/react";
import {AssistantRuntimeProvider} from "@assistant-ui/react";
import {useAISDKRuntime} from "@assistant-ui/react-ai-sdk";
import {DefaultChatTransport} from "ai";
import type {AppState} from "@excalidraw/excalidraw/types";

interface ChatSidebarProps {
  onGetDrawingData: () => Promise<{imageBytes: Uint8Array | null; drawingJSON: string | null}>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdateScene?: (elements: any[], appState: AppState) => void;
}

export function ChatSidebar({onGetDrawingData, onUpdateScene}: ChatSidebarProps) {
  const chat = useChat({
    transport: new DefaultChatTransport({
      prepareSendMessagesRequest: async ({messages}) => {
        console.log("preparing request...");

        try {
          const {imageBytes, drawingJSON} = await onGetDrawingData();
          console.log("data prepared!");

          return {
            body: {
              prompt: messages[messages.length - 1].parts[0],
              imageBytes: imageBytes,
              drawingJSON: drawingJSON,
            },
          };
        } catch (error) {
          console.error("Failed to get drawing data:", error);
          // Fallback: send message without drawing data
          return {
            body: {
              prompt: messages[messages.length - 1].parts[0],
              imageBytes: null,
              drawingJSON: null,
            },
          };
        }
      },
    }),

    onData: dataPart => {
      // Handle all data parts as they arrive (including transient parts)
      console.log("Received data part:", dataPart.data);

      if (dataPart.type === "data-excalidraw-json") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = dataPart.data as {elements: any[]; appState: AppState};
        const elements = data.elements;
        const appState = data.appState;

        // Update the Excalidraw scene with the new data
        if (onUpdateScene) {
          onUpdateScene(elements, appState);
        }
      }

      // // Handle different data part types
      // if (dataPart.type === 'data-weather') {
      //   console.log('Weather update:', dataPart.data);
      // }

      // // Handle transient notifications (ONLY available here, not in message.parts)
      // if (dataPart.type === 'data-notification') {
      //   showToast(dataPart.data.message, dataPart.data.level);
      // }
    },
  });

  const runtime = useAISDKRuntime(chat);

  return (
    <div className="h-full max-h-full overflow-hidden flex flex-col main-content-panel sticky-blue mr-8 pb-8 ml-2 rounded-b-2xl p-4">
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="flex-1 min-h-0 overflow-hidden">
          <Thread />
        </div>
      </AssistantRuntimeProvider>
    </div>
  );
}
