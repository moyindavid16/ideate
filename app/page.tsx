"use client";

import {useState, useRef, useCallback, useEffect} from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle,
  type ImperativePanelGroupHandle,
} from "react-resizable-panels";
import {useActiveTab} from "@/contexts/tab-context";
import {TabBar} from "@/components/tab-bar";
import {MainContent} from "@/components/main-content";
import {ChatSidebar} from "@/components/chat-sidebar";
import ErrorBoundary, {TabErrorBoundary, EditorErrorBoundary} from "@/components/error-boundary";
import type {ExcalidrawImperativeAPI, AppState} from "@excalidraw/excalidraw/types";

export default function OptimizedHome() {
  // Simplified state - only chat-related state remains here
  const [chatOpen, setChatOpen] = useState(true);
  const [chatPanelSize, setChatPanelSize] = useState(25);
  const [lastOpenPanelSize, setLastOpenPanelSize] = useState(25);
  const [excalidrawApis, setExcalidrawApis] = useState<{[key: string]: ExcalidrawImperativeAPI}>({});
  const activeTab = useActiveTab();
  // console.log(excalidrawApis)
  // console.log(activeTab)
  // console.log(excalidrawApis[activeTab?.id ?? ''])

  // Ref to hold the current API
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);

  // Update ref when active tab changes
  useEffect(() => {
    if (activeTab?.id && excalidrawApis[activeTab.id]) {
      apiRef.current = excalidrawApis[activeTab.id];
    } else {
      apiRef.current = null;
    }
  }, [activeTab?.id, excalidrawApis]);

  // Function to update the Excalidraw scene
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateScene = useCallback((elements: any[], appState: AppState) => {
    if (apiRef.current) {
      console.log("Updating scene with new elements and appState");
      apiRef.current.updateScene({
        elements,
        appState,
      });
    } else {
      console.warn("Cannot update scene - API not available");
    }
  }, []);

  // Function to get drawing data using the ref
  const getDrawingData = useCallback(async () => {
    if (!apiRef.current) {
      console.warn("Excalidraw API is not available yet");
      return {imageBytes: null, drawingJSON: null};
    }

    try {
      console.log("Getting drawing data...");
      const elements = apiRef.current.getSceneElements();
      const appState = apiRef.current.getAppState();
      const files = apiRef.current.getFiles();

      // Dynamic import of Excalidraw functions
      const {exportToBlob, serializeAsJSON} = await import("@excalidraw/excalidraw");

      const blob: Blob = await exportToBlob({
        elements,
        appState,
        files,
        mimeType: "image/png",
      });

      const drawingJSON = serializeAsJSON(elements, appState, files, "local");

      // Fix: Use arrayBuffer() instead of bytes()
      const arrayBuffer = await blob.arrayBuffer();
      const imageBytes = new Uint8Array(arrayBuffer);

      return {imageBytes, drawingJSON};
    } catch (error) {
      console.error("Failed to get drawing data:", error);
      return {imageBytes: null, drawingJSON: null};
    }
  }, []);

  const setExcalidrawApiForTab = (tabId: string, api: ExcalidrawImperativeAPI) => {
    setExcalidrawApis(prev => {
      console.log(tabId, typeof tabId);
      return {
        ...prev,
        [tabId]: api,
      };
    });

    // Update the ref if this is the active tab
    if (activeTab?.id === tabId) {
      apiRef.current = api;
    }
  };

  // Panel refs for imperative control
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const mainPanelRef = useRef<ImperativePanelHandle>(null);
  const chatPanelRef = useRef<ImperativePanelHandle>(null);

  // Debug panel sizes
  useEffect(() => {
    const chatPanel = chatPanelRef.current;
    if (chatPanel) {
      console.log('Chat Panel Info:', {
        size: chatPanel.getSize(),
        isCollapsed: chatPanel.isCollapsed(),
        isExpanded: chatPanel.isExpanded(),
        chatOpen,
        chatPanelSize
      });
    }
  }, [chatOpen, chatPanelSize]);

  const handlePanelResize = useCallback(
    (sizes: number[]) => {
      // Save the chat panel size (second panel)
      if (sizes[1] !== undefined) {
        setChatPanelSize(sizes[1]);
        // If chat is currently open and panel size > 0, save this as the last open size
        if (chatOpen && sizes[1] > 0) {
          setLastOpenPanelSize(sizes[1]);
        }
      }
    },
    [chatOpen],
  );

  const handleChatToggle = useCallback(() => {
    const newChatOpen = !chatOpen;

    if (!newChatOpen) {
      // Closing chat - save current size as last open size
      setLastOpenPanelSize(chatPanelSize);
    }

    setChatOpen(newChatOpen);

    // Use CSS-only animations instead of complex JavaScript animations
    // The panel group will handle the resize animation automatically
    if (panelGroupRef.current) {
      if (newChatOpen) {
        // Opening chat - set to last open size
        const targetSize = lastOpenPanelSize;
        setChatPanelSize(targetSize);
        panelGroupRef.current.setLayout([100 - targetSize, targetSize]);
      } else {
        // Closing chat - set to 0
        panelGroupRef.current.setLayout([100, 0]);
      }
    }
  }, [chatOpen, chatPanelSize, lastOpenPanelSize]);

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col pb-8 overflow-hidden">
        {/* Top Tab Bar */}
        <div className="bg-background backdrop-blur-sm transition-all duration-300 overflow-visible pt-4 antialiased paper-surface">
          <TabErrorBoundary>
            <TabBar chatOpen={chatOpen} chatPanelSize={chatPanelSize} onChatToggle={handleChatToggle} />
          </TabErrorBoundary>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-visible">
          <PanelGroup
            ref={panelGroupRef}
            direction="horizontal"
            onLayout={handlePanelResize}
            className="overflow-visible panel-group"
          >
            <Panel
              ref={mainPanelRef}
              defaultSize={chatOpen ? 100 - chatPanelSize : 100}
              minSize={50}
              className="overflow-visible will-change-width"
            >
              <EditorErrorBoundary>
                <MainContent chatOpen={chatOpen} setExcalidrawApiForTab={setExcalidrawApiForTab} />
              </EditorErrorBoundary>
            </Panel>

            <PanelResizeHandle
              className={`bg-border hover:bg-muted-foreground/20 transition-all duration-800 ease-in-out ${
                chatOpen ? "w-4 hover:w-6 opacity-100" : "w-0 opacity-0"
              }`}
            />

            <Panel
              ref={chatPanelRef}
              defaultSize={chatOpen ? chatPanelSize : 0}
              minSize={0}
              maxSize={50}
              className="overflow-y-auto will-change-width chat-panel-container"
            >
              <div
                className={`h-full max-h-full overflow-hidden flex flex-col chat-panel ${chatOpen ? "chat-panel-open" : "chat-panel-closed"}`}
                style={{ height: '100%', maxHeight: '100%' }}
              >
                <ErrorBoundary
                  fallback={
                    <div className="h-full flex items-center justify-center p-4 sticky-blue rounded-2xl">
                      <p className="text-sm text-gray-700">Chat failed to load</p>
                    </div>
                  }
                >
                  <ChatSidebar onGetDrawingData={getDrawingData} onUpdateScene={updateScene} />
                </ErrorBoundary>
              </div>
            </Panel>
          </PanelGroup>
        </div>
      </div>
    </ErrorBoundary>
  );
}
