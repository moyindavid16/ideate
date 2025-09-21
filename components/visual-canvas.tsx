"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";

// Import Excalidraw CSS
import "@excalidraw/excalidraw/index.css";

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false }
);

interface VisualCanvasProps {
  tabId: string;
  initialData?: any;
  onDataChange: (data: any) => void;
}

export function VisualCanvas({ tabId, initialData, onDataChange }: VisualCanvasProps) {
  const [mounted, setMounted] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setMounted(true);
  }, []);

  const debouncedOnDataChange = useCallback((elements: any, appState: any) => {
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the state update to prevent excessive re-renders
    debounceRef.current = setTimeout(() => {
      onDataChange({
        elements,
        appState,
      });
    }, 300); // 300ms debounce
  }, [onDataChange]);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
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
      <div className="h-full rounded-md overflow-hidden border border-gray-200 shadow-sm">
        <Excalidraw
          key={tabId}
          theme="light"
          initialData={initialData}
          onChange={debouncedOnDataChange}
        />
      </div>
    </div>
  );
}