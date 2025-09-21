"use client";

import { useState, useRef, useCallback } from "react";
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelHandle, type ImperativePanelGroupHandle } from "react-resizable-panels";
import { TabProvider } from "@/contexts/tab-context";
import { TabBar } from "@/components/tab-bar";
import { MainContent } from "@/components/main-content";
import { ChatSidebar } from "@/components/chat-sidebar";
import ErrorBoundary, { TabErrorBoundary, EditorErrorBoundary } from "@/components/error-boundary";

export default function OptimizedHome() {
  // Simplified state - only chat-related state remains here
  const [chatOpen, setChatOpen] = useState(true);
  const [chatPanelSize, setChatPanelSize] = useState(25);
  const [lastOpenPanelSize, setLastOpenPanelSize] = useState(25);

  // Panel refs for imperative control
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const mainPanelRef = useRef<ImperativePanelHandle>(null);
  const chatPanelRef = useRef<ImperativePanelHandle>(null);

  const handlePanelResize = useCallback((sizes: number[]) => {
    // Save the chat panel size (second panel)
    if (sizes[1] !== undefined) {
      setChatPanelSize(sizes[1]);
      // If chat is currently open and panel size > 0, save this as the last open size
      if (chatOpen && sizes[1] > 0) {
        setLastOpenPanelSize(sizes[1]);
      }
    }
  }, [chatOpen]);

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
        <TabProvider>
          <div className="h-screen flex flex-col pb-8 overflow-hidden">
            {/* Top Tab Bar */}
            <div className="bg-background backdrop-blur-sm transition-all duration-300 overflow-visible pt-4 antialiased paper-surface">
              <TabErrorBoundary>
                <TabBar
                    chatOpen={chatOpen}
                    chatPanelSize={chatPanelSize}
                    onChatToggle={handleChatToggle}
                />
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
                    <MainContent chatOpen={chatOpen} />
                  </EditorErrorBoundary>
                </Panel>

                <PanelResizeHandle
                    className={`bg-border hover:bg-muted-foreground/20 transition-all duration-800 ease-in-out ${
                        chatOpen ? 'w-4 hover:w-6 opacity-100' : 'w-0 opacity-0'
                    }`}
                />

                <Panel
                    ref={chatPanelRef}
                    defaultSize={chatOpen ? chatPanelSize : 0}
                    minSize={0}
                    maxSize={50}
                    className="overflow-hidden will-change-width"
                >
                  <div className={`h-full chat-panel ${
                      chatOpen ? 'chat-panel-open' : 'chat-panel-closed'
                  }`}>
                    <ErrorBoundary
                        fallback={
                          <div className="h-full flex items-center justify-center p-4 sticky-blue rounded-2xl">
                            <p className="text-sm text-gray-700">Chat failed to load</p>
                          </div>
                        }
                    >
                      <ChatSidebar isOpen={chatOpen} />
                    </ErrorBoundary>
                  </div>
                </Panel>
              </PanelGroup>
            </div>

          </div>
        </TabProvider>
      </ErrorBoundary>
  );
}