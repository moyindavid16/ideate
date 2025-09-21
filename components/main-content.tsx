"use client";
import React from "react";
import type { Tab, TabGroup, DragState } from "@/app/page";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { RotateCcw } from "lucide-react";

interface MainContentProps {
  tabs: Tab[];
  activeTabId: string;
  hoveredTabId: string | null;
  isMainContentHovered: boolean;
  setIsMainContentHovered: (hovered: boolean) => void;
  renderTabContent: (tab: Tab) => React.ReactNode;
  chatOpen?: boolean;
  tabGroups: TabGroup[];
  updateGroupSplitRatio: (ratio: number) => void;
  swapGroupPanes: () => void;
  dragState: DragState;
}

export function MainContent({
  tabs,
  activeTabId,
  hoveredTabId,
  isMainContentHovered,
  setIsMainContentHovered,
  renderTabContent,
  chatOpen = false,
  tabGroups,
  updateGroupSplitRatio,
  swapGroupPanes,
  dragState,
}: MainContentProps) {
  const activeTab = tabs.find(tab => tab.id === activeTabId);
  const activeTabGroup = tabGroups.find(group => group.tabIds.includes(activeTabId));

  // Determine if we should show group view: when active tab is in a 2-tab group
  const shouldShowGroupView = activeTabGroup && activeTabGroup.tabIds.length === 2;
  const groupTabs = shouldShowGroupView ? tabs.filter(tab => activeTabGroup.tabIds.includes(tab.id)) : [];

  // Check if the tab group contains a markdown editor
  const groupHasMarkdownEditor = shouldShowGroupView && groupTabs.some(tab => tab.type === 'markdown');

  // Debug field for LLM context
  const currentDisplayMode = shouldShowGroupView
    ? `Group View: ${groupTabs[0]?.title} + ${groupTabs[1]?.title}`
    : `Single View: ${activeTab?.title || 'None'}`;

  console.log('Current Display Mode:', currentDisplayMode);

  if (!activeTab) {
    return (
      <div className={`h-full flex items-center justify-center sticky-green ml-8 pb-8 rounded-3xl overflow-visible ${chatOpen ? 'mr-0' : 'mr-8'}`}>
        <p className="text-muted-foreground">No tab selected</p>
      </div>
    );
  }

  // Get the sticky note class based on tab type
  const getTabBackgroundClass = (tabType: string) => {
    switch (tabType) {
      case 'visual':
        return 'sticky-green';
      case 'code':
        return 'sticky-purple';
      case 'markdown':
        return 'sticky-yellow';
      default:
        return 'sticky-green';
    }
  };

  // Only move up if main content itself is hovered (unlinked from tab hover)
  const shouldHover = isMainContentHovered;

  const handleGroupResize = (sizes: number[]) => {
    if (sizes[0] !== undefined) {
      updateGroupSplitRatio(sizes[0]);
    }
  };

  // Group view rendering (exactly 2 tabs)
  if (shouldShowGroupView && activeTabGroup && groupTabs.length === 2) {
    return (
      <div
        className={`h-full overflow-visible transition-transform duration-300 ${shouldHover ? '-translate-y-1' : ''}`}
        onMouseEnter={() => setIsMainContentHovered(true)}
        onMouseLeave={() => setIsMainContentHovered(false)}
      >
        <PanelGroup
          direction={activeTabGroup.direction === "vertical" ? "horizontal" : "vertical"}
          onLayout={handleGroupResize}
          className="h-full overflow-visible"
        >
          <Panel
            defaultSize={activeTabGroup.splitRatio}
            minSize={10}
            className="relative overflow-visible"
          >
            <div className={`h-full ml-8 main-content-panel overflow-visible ${getTabBackgroundClass(groupTabs[0].type)} transition-transform duration-300 ${
              activeTabGroup.direction === "vertical" ? `rounded-3xl mr-3 ${groupHasMarkdownEditor ? 'pb-0' : 'pb-8'}` : `rounded-3xl mb-3 ${groupHasMarkdownEditor ? 'pb-0' : 'pb-8'}`
            } ${chatOpen && activeTabGroup.direction === "horizontal" ? 'mr-0' : 'mr-8'} p-4`}>
              {renderTabContent(groupTabs[0])}
            </div>
          </Panel>

          <PanelResizeHandle className="relative flex items-center justify-center group">
            <div className={`${activeTabGroup.direction === "vertical" ? "w-1 h-full" : "w-full h-1"} bg-border hover:bg-muted-foreground/20 transition-all duration-300 group-hover:${activeTabGroup.direction === "vertical" ? "w-2" : "h-2"}`} />
            {/*<button*/}
            {/*  onClick={swapGroupPanes}*/}
            {/*  className="absolute w-6 h-6 rounded-full bg-background border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"*/}
            {/*  title="Swap Panes"*/}
            {/*>*/}
            {/*  <RotateCcw className="w-3 h-3" />*/}
            {/*</button>*/}
          </PanelResizeHandle>

          <Panel
            defaultSize={100 - activeTabGroup.splitRatio}
            minSize={10}
            className="relative overflow-visible"
          >
            <div className={`h-full main-content-panel overflow-visible ${getTabBackgroundClass(groupTabs[1].type)} transition-transform duration-300 ${
              activeTabGroup.direction === "vertical" ? `rounded-3xl ml-3 ${groupHasMarkdownEditor ? 'pb-0' : 'pb-8'}` : `rounded-3xl mt-3 ${groupHasMarkdownEditor ? 'pb-0' : 'pb-8'}`
            } ${chatOpen ? 'mr-0' : 'mr-8'} p-4`}>
              {renderTabContent(groupTabs[1])}
            </div>
          </Panel>
        </PanelGroup>
      </div>
    );
  }

  // Single view rendering (default)
  return (
    <div
      className={`h-full ml-8 pb-8 rounded-3xl main-content-panel overflow-visible ${getTabBackgroundClass(activeTab!.type)} transition-transform duration-300 ${shouldHover ? '-translate-y-1' : ''} ${chatOpen ? 'mr-0 p-4' : 'mr-8 p-4'} relative`}
      onMouseEnter={() => setIsMainContentHovered(true)}
      onMouseLeave={() => setIsMainContentHovered(false)}
    >
      {renderTabContent(activeTab!)}
    </div>
  );
}