"use client";

import {Thread} from "@/components/assistant-ui/thread";
import {useChat} from "@ai-sdk/react";
import {AssistantRuntimeProvider} from "@assistant-ui/react";
import {useAISDKRuntime} from "@assistant-ui/react-ai-sdk";
import {DefaultChatTransport} from "ai";
import type {AppState} from "@excalidraw/excalidraw/types";
import {useEffect, useRef} from "react";

interface ChatSidebarProps {
  onGetDrawingData: () => Promise<{imageBytes: Uint8Array | null; drawingJSON: string | null}>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdateScene?: (elements: any[], appState: AppState) => void;
}

export function ChatSidebar({onGetDrawingData, onUpdateScene}: ChatSidebarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Debug container dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const computedStyle = getComputedStyle(container);
      const parent = container.parentElement;
      const grandParent = parent?.parentElement;

      // Walk up the entire parent chain
      const hierarchy = [];
      let current: HTMLElement | null = container;
      let level = 0;

      while (current && level < 10) { // Limit to prevent infinite loops
        const computedStyle = getComputedStyle(current);
        hierarchy.push({
          level,
          tagName: current.tagName,
          className: current.className,
          id: current.id,
          clientHeight: current.clientHeight,
          scrollHeight: current.scrollHeight,
          offsetHeight: current.offsetHeight,
          computedStyle: {
            height: computedStyle.height,
            maxHeight: computedStyle.maxHeight,
            minHeight: computedStyle.minHeight,
            overflow: computedStyle.overflow,
            overflowY: computedStyle.overflowY,
            display: computedStyle.display,
            flexDirection: computedStyle.flexDirection,
            flexGrow: computedStyle.flexGrow,
            flexShrink: computedStyle.flexShrink,
            position: computedStyle.position,
          },
          boundingRect: current.getBoundingClientRect(),
        });
        current = current.parentElement;
        level++;
      }

      console.log('ChatSidebar Container Hierarchy:', hierarchy);

      // Monitor size changes
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          console.log('ChatSidebar Container Resized:', {
            contentRect: entry.contentRect,
            clientHeight: container.clientHeight,
            scrollHeight: container.scrollHeight
          });
        }
      });

      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

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
    <div
      ref={containerRef}
      className="h-full max-h-full overflow-hidden flex flex-col main-content-panel sticky-blue mr-8 pb-8 ml-2 rounded-b-2xl p-4"
      style={{ height: '100%', maxHeight: '100%' }}
    >
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="flex-1 min-h-0 overflow-hidden">
          <Thread />
        </div>
      </AssistantRuntimeProvider>
    </div>
  );
}
