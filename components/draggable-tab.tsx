"use client";

import React from "react";
import { PenTool, Code, FileText, X } from "lucide-react";
import { useTabState, useTabActions } from "@/contexts/tab-context";
import { getTabColorClass, calculateDropZone } from "@/lib/utils";
import type { Tab } from "@/contexts/tab-context";

interface DraggableTabProps {
  tab: Tab;
  isActive: boolean;
  isHovered: boolean;
  isInSplitView?: boolean;
}

const DraggableTab = React.memo(({
  tab,
  isActive,
  isHovered,
  isInSplitView = false
}: DraggableTabProps) => {
  const state = useTabState();
  const actions = useTabActions();

  const { tabs, editingTabId, editingTabName, dragState } = state;

  const getTabIcon = React.useMemo(() => {
    const iconProps = { className: "w-4 h-4" };
    switch (tab.type) {
      case 'visual': return <PenTool {...iconProps} />;
      case 'code': return <Code {...iconProps} />;
      case 'markdown': return <FileText {...iconProps} />;
      default: return <PenTool {...iconProps} />;
    }
  }, [tab.type]);

  const tabColorClass = React.useMemo(() => getTabColorClass(tab.type), [tab.type]);

  const isDragTarget = dragState.dropTargetTabId === tab.id;
  const isBeingDragged = dragState.draggedTabId === tab.id;

  const handleDragStart = React.useCallback((e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    actions.startDrag(tab.id);
  }, [actions, tab.id]);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (dragState.draggedTabId && dragState.draggedTabId !== tab.id) {
      const rect = e.currentTarget.getBoundingClientRect();
      const dropZone = calculateDropZone(e.clientX, e.clientY, rect);
      actions.updateDragTarget(tab.id, dropZone);
    }
  }, [dragState.draggedTabId, tab.id, actions]);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleClick = React.useCallback(() => {
    actions.setActiveTab(tab.id);
  }, [actions, tab.id]);

  const handleDoubleClick = React.useCallback(() => {
    actions.startEditingTab(tab.id, tab.title);
  }, [actions, tab.id, tab.title]);

  const handleEditChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    actions.updateEditingName(e.target.value);
  }, [actions]);

  const handleEditBlur = React.useCallback(() => {
    actions.finishEditingTab();
  }, [actions]);

  const handleEditKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') actions.finishEditingTab();
    if (e.key === 'Escape') actions.cancelEditingTab();
  }, [actions]);

  const handleClose = React.useCallback(() => {
    actions.closeTab(tab.id);
  }, [actions, tab.id]);

  const handleMouseEnter = React.useCallback(() => {
    actions.setHoveredTab(tab.id);
  }, [actions, tab.id]);

  const handleMouseLeave = React.useCallback(() => {
    actions.setHoveredTab(null);
  }, [actions]);

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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onDragStart={handleDragStart}
        onDragEnd={actions.endDrag}
        onDragOver={handleDragOver}
        onDragLeave={actions.clearDragTarget}
        onDrop={handleDrop}
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

        {getTabIcon}

        {editingTabId === tab.id ? (
          <input
            type="text"
            value={editingTabName}
            onChange={handleEditChange}
            onBlur={handleEditBlur}
            onKeyDown={handleEditKeyDown}
            className="text-sm font-medium bg-transparent border-none outline-none min-w-0 w-24"
            autoFocus
          />
        ) : (
          <span
            className="text-sm font-medium"
            onDoubleClick={handleDoubleClick}
          >
            {tab.title}
          </span>
        )}
      </div>

      {/* Close button */}
      {tabs.length > 1 && (
        <button
          onClick={handleClose}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-background shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 border border-border flex items-center justify-center z-30"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      )}
    </div>
  );
});

DraggableTab.displayName = 'DraggableTab';

export { DraggableTab };