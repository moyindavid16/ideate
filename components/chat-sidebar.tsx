"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChat } from "@ai-sdk/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { DefaultChatTransport } from "ai";
import { Excalidraw, exportToBlob, serializeAsJSON } from "@excalidraw/excalidraw/";
import { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

export function ChatSidebar({ api }: { api: ExcalidrawImperativeAPI }) {
  const chat = useChat({
    transport: new DefaultChatTransport({
      prepareSendMessagesRequest: async ({ messages }) => {
        const elements = api.getSceneElements();
        const appState = api.getAppState();
        const files = api.getFiles();

        const blob:Blob = await exportToBlob({
          elements, 
          appState,
          files,
          mimeType: "image/png"
        });

        const imageBytes = blob.bytes()

        const drawingJSON = serializeAsJSON(elements, appState, files, "local");
        console.log({
          prompt: messages[messages.length - 1],
          imageBytes: imageBytes,
          drawingJSON: drawingJSON
        })
        
        return {
          body: {
            prompt: messages[messages.length - 1].parts[0].content,
            imageBytes: imageBytes,
            drawingJSON: drawingJSON
          }
        }
      }
    })
  })

  const runtime = useAISDKRuntime(chat);

  return (
    <div className="h-full main-content-panel sticky-blue mr-8 pb-8 ml-2 rounded-b-2xl p-4">
      <AssistantRuntimeProvider runtime={runtime}>
        <Thread />
      </AssistantRuntimeProvider>
    </div>
  );
}