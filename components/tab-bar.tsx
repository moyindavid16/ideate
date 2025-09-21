"use client";

import React from "react";
import { useTabState, useTabActions, useTabUtils } from "@/contexts/tab-context";
import { DraggableTab } from "./draggable-tab";
import { NewTabPopup } from "./new-tab-popup";
import { TabGroup } from "./tab-group";
import { Maximize2 } from "lucide-react";

interface TabBarProps {
  chatOpen: boolean;
  chatPanelSize: number;
  onChatToggle: () => void;
}

const TabBar = React.memo(({ chatOpen, chatPanelSize, onChatToggle }: TabBarProps) => {
  const state = useTabState();
  const actions = useTabActions();
  const utils = useTabUtils();

  const { tabs, activeTabId, tabGroups, hoveredTabId } = state;

  const renderTabsWithGrouping = React.useMemo(() => {
    if (tabGroups.length === 0) {
      // Normal mode - render all tabs individually
      return tabs.map((tab) => (
        <DraggableTab
          key={tab.id}
          tab={tab}
          isActive={activeTabId === tab.id}
          isHovered={hoveredTabId === tab.id}
        />
      ));
    }

    // Group mode - render tabs with their groups
    const groupedTabIds = new Set(tabGroups.flatMap(group => group.tabIds));
    const ungroupedTabs = tabs.filter(tab => !groupedTabIds.has(tab.id));

    return (
      <>
        {/* Render ungrouped tabs first */}
        {ungroupedTabs.map((tab) => (
          <DraggableTab
            key={tab.id}
            tab={tab}
            isActive={activeTabId === tab.id}
            isHovered={hoveredTabId === tab.id}
          />
        ))}

        {/* Render each tab group */}
        {tabGroups.map((group) => {
          const groupTabs = tabs.filter(tab => group.tabIds.includes(tab.id));

          // Only render the group wrapper if there are at least 2 tabs
          if (groupTabs.length < 2) {
            return null;
          }

          return (
            <TabGroup key={group.id} isLinked={true} direction="horizontal">
              {groupTabs.map((tab) => (
                <DraggableTab
                  key={tab.id}
                  tab={tab}
                  isActive={activeTabId === tab.id}
                  isHovered={hoveredTabId === tab.id}
                  isInSplitView={true}
                />
              ))}
            </TabGroup>
          );
        })}
      </>
    );
  }, [tabs, activeTabId, tabGroups, hoveredTabId]);

  const isActiveTabInGroup = utils.isTabInGroup(activeTabId);

  return (
    <div className="flex items-center justify-between px-8 pt-6 pb-0 overflow-visible">
      {/* Left section for tabs */}
      <div className="flex items-center gap-3 overflow-visible py-4">
        {renderTabsWithGrouping}

        <NewTabPopup onCreateTab={actions.createTab}>
          <button className="w-10 h-10 rounded-2xl border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 font-light text-lg leading-none">
            +
          </button>
        </NewTabPopup>

        {/* Exit Group View Control - Only show when active tab is in a group */}
        {isActiveTabInGroup && (
          <button
            onClick={() => {
              const activeTabGroup = utils.getActiveTabGroup();
              if (activeTabGroup) {
                actions.removeTabGroup(activeTabGroup.id);
              }
            }}
            className="w-8 h-8 rounded-xl border border-accent/50 bg-accent/10 hover:bg-accent/20 flex items-center justify-center text-accent hover:text-accent-foreground transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 ml-2"
            title="Exit Group View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Right section for doodle buddy button */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-px bg-border" />
        <button
          onClick={onChatToggle}
          className={`sticky-blue transition-all duration-800 ease-in-out px-4 py-3 text-sm font-medium rounded-2xl ${
            chatOpen
              ? 'z-20 border-2 border-foreground/20 shadow-lg'
              : 'z-0 opacity-60 scale-95 border border-border/30 hover:opacity-80 hover:scale-100'
          }`}
        >
          doodle buddy
        </button>
      </div>
    </div>
  );
});

TabBar.displayName = 'TabBar';

export { TabBar };