"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";
import { Download } from "lucide-react";
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
    async () => (await import("@excalidraw/excalidraw")).Excalidraw,
    { ssr: false }
);

interface VisualCanvasProps {
  tabId: string;
  initialData?: Record<string, unknown>;
  onDataChange: (data: Record<string, unknown>) => void;
  tabType?: string; // For compatibility with existing props
  setExcalidrawApiForTab: (tabId: string, api: ExcalidrawImperativeAPI) => void
  // excalidrawAPIs: { [tabId: string]: ExcalidrawImperativeAPI }
}

export function VisualCanvas({ tabId, initialData, onDataChange, setExcalidrawApiForTab }: VisualCanvasProps) {
  const [mounted, setMounted] = useState(false);
  const [currentData, setCurrentData] = useState<Record<string, unknown>>(initialData || {});
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isMountedRef = useRef(true);

  useEffect(() => {
    setMounted(true);
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const debouncedOnDataChange = useCallback((elements: readonly unknown[], appState: unknown, files: unknown) => {
    const newData = { elements, appState, files };

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = undefined;
    }

    // Only set new timeout if component is still mounted
    if (!isMountedRef.current) return;

    // Debounce both state update and parent callback to prevent nested updates
    debounceRef.current = setTimeout(() => {
      // Double-check if component is still mounted before calling callback
      if (isMountedRef.current) {
        setCurrentData(newData);
        if (onDataChange) {
          onDataChange(newData);
        }
      }
      debounceRef.current = undefined;
    }, 300); // 300ms debounce
  }, [onDataChange]);

  const exportJSON = useCallback(() => {
    const dataStr = JSON.stringify(currentData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `canvas-${tabId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [currentData, tabId]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(currentData, null, 2));
  }, [currentData]);

  useEffect(() => {
    // Comprehensive cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = undefined;
      }
    };
  }, []);

  const LoadingComponent = () => (
      <div className="h-full flex items-center justify-center bg-transparent rounded-md">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading visual canvas...</p>
        </div>
      </div>
  );

  if (!mounted) return <LoadingComponent />;

  return (
      <div className="h-full p-4 bg-transparent">
        {/* Export Controls */}
        <div className="mb-2 flex gap-2">
          <button
              onClick={exportJSON}
              className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
              title="Download JSON"
          >
            <Download size={12} />
            Export JSON
          </button>
          <button
              onClick={copyToClipboard}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              title="Copy JSON to clipboard"
          >
            Copy JSON
          </button>
        </div>

        <div className="h-full rounded-md overflow-hidden border border-gray-200 shadow-sm">
          {/*
          IMPORTANT: Using key={tabId} ensures each tab gets its own Excalidraw instance.
          This is necessary for state persistence between tabs.
          The slight performance cost is acceptable for proper functionality.
        */}
          <Excalidraw
              key={tabId}
              theme="light"
              initialData={initialData}
              onChange={debouncedOnDataChange}
              excalidrawAPI={(api) => {
                setExcalidrawApiForTab(tabId, api)
              }}
          />
        </div>
      </div>
  );
}