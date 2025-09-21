"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChat } from "@ai-sdk/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { DefaultChatTransport } from "ai";
// import { exportToBlob, serializeAsJSON } from "@excalidraw/excalidraw";
import { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useEffect, useState } from "react";
import { useActiveTab } from "@/contexts/tab-context";

export function ChatSidebar({ api }: { api: ExcalidrawImperativeAPI }) {
  // console.log("DJDKJD", api);
  
  const handleSaveDrawing = async (api: ExcalidrawImperativeAPI) => {
    console.log("entering handler...")
    // Import only when you need it
    const { exportToBlob, serializeAsJSON } = await import("@excalidraw/excalidraw/");
    console.log("After import")
    console.log(api)
    const elements = api.getSceneElements();
    const appState = api.getAppState();
    const files = api.getFiles();
    console.log("Before blobbing")
    
    const blob = await exportToBlob({
      elements,
      appState,
      files,
      mimeType: "image/png"
    });
    console.log("got blob...")
    
    const drawingJSON = serializeAsJSON(elements, appState, files, "local");
    
    // Use blob and jsonData
    const imageBytes = blob.bytes()
    return {
      imageBytes,
      drawingJSON
    }
  };

  const chat = useChat({
    transport: new DefaultChatTransport({
      prepareSendMessagesRequest: async ({ messages, requestMetadata }) => {
        console.log("preparing request...")
        // const elements = api.getSceneElements();
        // const appState = api.getAppState();
        // const files = api.getFiles();

        // const blob:Blob = await exportToBlob({
        //   elements, 
        //   appState,
        //   files,
        //   mimeType: "image/png"
        // });

        // const imageBytes = blob.bytes()

        // const drawingJSON = serializeAsJSON(elements, appState, files, "local");
        // console.log({
        //   prompt: messages[messages.length - 1],
        //   imageBytes: imageBytes,
        //   drawingJSON: drawingJSON
        // })
        const { imageBytes, drawingJSON } = await handleSaveDrawing(api)
        console.log("data prepared!")
        
        return {
          body: {
            prompt: messages[messages.length - 1].parts[0],
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