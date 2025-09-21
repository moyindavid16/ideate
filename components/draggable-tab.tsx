"use client";

import { PenTool, Code, FileText, X } from "lucide-react";
import type { Tab, DragState } from "@/app/page";
import { getTabColorClass, calculateDropZone } from "@/lib/utils";

interface DraggableTabProps {
  tab: Tab;
  isActive: boolean;
  isHovered: boolean;
  isMainContentHovered: boolean;
  editingTabId: string | null;
  editingTabName: string;
  tabs: Tab[];
  dragState: DragState;
  isInSplitView?: boolean;
  splitViewPartner?: string | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  onDoubleClick: () => void;
  onEditChange: (value: string) => void;
  onEditBlur: () => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  onClose: () => void;
  onDragStart: (tabId: string) => void;
  onDragEnd: () => void;
  onDragOver: (tabId: string, dropZone: 'left' | 'right' | 'top' | 'bottom') => void;
  onDragLeave: () => void;
}

export function DraggableTab({
  tab,
  isActive,
  isHovered,
  isMainContentHovered,
  editingTabId,
  editingTabName,
  tabs,
  dragState,
  isInSplitView = false,
  splitViewPartner = null,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onDoubleClick,
  onEditChange,
  onEditBlur,
  onEditKeyDown,
  onClose,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
}: DraggableTabProps) {
  const getTabIcon = () => {
    const iconProps = { className: "w-4 h-4" };
    switch (tab.type) {
      case 'visual': return <PenTool {...iconProps} />;
      case 'code': return <Code {...iconProps} />;
      case 'markdown': return <FileText {...iconProps} />;
      default: return <PenTool {...iconProps} />;
    }
  };

  const tabColorClass = getTabColorClass(tab.type);

  const isDragTarget = dragState.dropTargetTabId === tab.id;
  const isBeingDragged = dragState.draggedTabId === tab.id;

  return (
    <div className="relative group">
      <div
        className={`flex items-center gap-3 px-4 py-3 transition-all duration-300 cursor-pointer relative rounded-2xl ${
          isActive
            ? `${tabColorClass} z-20 border-2 ${isInSplitView ? 'border-accent/50 ring-2 ring-accent/20' : 'border-foreground/20'}`
            : `${tabColorClass} z-0 opacity-60 scale-95 border border-border/30`
        } ${
          (isActive && isHovered) ? '-translate-y-1' : ''
        } ${isBeingDragged ? 'opacity-50 scale-95' : ''} ${
          isInSplitView && !isActive ? 'ring-1 ring-accent/10' : ''
        }`}
        draggable={!editingTabId}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          onDragStart(tab.id);
        }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          e.preventDefault();
          if (dragState.draggedTabId && dragState.draggedTabId !== tab.id) {
            const rect = e.currentTarget.getBoundingClientRect();
            const dropZone = calculateDropZone(e.clientX, e.clientY, rect);
            onDragOver(tab.id, dropZone);
          }
        }}
        onDragLeave={onDragLeave}
        onDrop={(e) => {
          e.preventDefault();
        }}
      >
        {/* Drop zone indicators */}
        {isDragTarget && dragState.dropZone && (
          <div className="absolute inset-0 pointer-events-none">
            <div
              className={`absolute bg-accent/30 border-2 border-accent border-dashed rounded-xl transition-all duration-200 ${
                {
                  left: 'left-0 top-0 w-1/2 h-full',
                  right: 'right-0 top-0 w-1/2 h-full',
                  top: 'left-0 top-0 w-full h-1/2',
                  bottom: 'left-0 bottom-0 w-full h-1/2'
                }[dragState.dropZone]
              }`}
            />
          </div>
        )}

        {getTabIcon()}

        {editingTabId === tab.id ? (
          <input
            type="text"
            value={editingTabName}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={onEditBlur}
            onKeyDown={onEditKeyDown}
            className="text-sm font-medium bg-transparent border-none outline-none min-w-0 w-24"
            autoFocus
          />
        ) : (
          <span
            className="text-sm font-medium"
            onDoubleClick={onDoubleClick}
          >
            {tab.title}
          </span>
        )}
      </div>

      {/* Close button */}
      {tabs.length > 1 && (
        <button
          onClick={onClose}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-background shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 border border-border flex items-center justify-center z-30"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}