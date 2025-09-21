"use client";

import React from "react";
import { useTabState, useTabActions, useTabUtils, useActiveTab } from "@/contexts/tab-context";
import { VisualCanvas } from "./visual-canvas";
import { CodeEditor } from "./code-editor";
import { MarkdownEditor } from "./markdown-editor";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import type { Tab } from "@/contexts/tab-context";

interface MainContentProps {
  chatOpen?: boolean;
}

const MainContent = React.memo(({ chatOpen = false }: MainContentProps) => {
  const state = useTabState();
  const actions = useTabActions();
  const utils = useTabUtils();
  const activeTab = useActiveTab();

  const { isMainContentHovered } = state;

  const activeTabGroup = utils.getActiveTabGroup();

  // Determine if we should show group view: when active tab is in a 2-tab group
  const shouldShowGroupView = activeTabGroup && activeTabGroup.tabIds.length === 2;
  const groupTabs = React.useMemo(() => {
    if (!shouldShowGroupView || !activeTabGroup) return [];
    return state.tabs.filter(tab => activeTabGroup.tabIds.includes(tab.id));
  }, [shouldShowGroupView, activeTabGroup, state.tabs]);

  // Check if the tab group contains a markdown editor
  const groupHasMarkdownEditor = shouldShowGroupView && groupTabs.some(tab => tab.type === 'markdown');

  // Get the sticky note class based on tab type
  const getTabBackgroundClass = React.useCallback((tabType: string) => {
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
  }, []);

  const renderTabContent = React.useCallback((tab: Tab) => {
    switch (tab.type) {
      case "visual":
        return (
          <VisualCanvas
            tabId={tab.id}
            initialData={tab.excalidrawData}
            onDataChange={(data) => actions.updateTabData(tab.id, data)}
          />
        );
      case "code":
        return <CodeEditor />;
      case "markdown":
        return <MarkdownEditor />;
      default:
        return null;
    }
  }, [actions]);

  const handleGroupResize = React.useCallback((sizes: number[]) => {
    if (sizes[0] !== undefined && activeTabGroup) {
      actions.updateGroupSplitRatio(activeTabGroup.id, sizes[0]);
    }
  }, [activeTabGroup, actions]);

  const handleMainContentHover = React.useCallback((hovered: boolean) => {
    actions.setMainContentHovered(hovered);
  }, [actions]);

  if (!activeTab) {
    return (
      <div className={`h-full flex items-center justify-center sticky-green ml-8 pb-8 rounded-3xl overflow-visible ${chatOpen ? 'mr-0' : 'mr-8'}`}>
        <p className="text-muted-foreground">No tab selected</p>
      </div>
    );
  }

  // Only move up if main content itself is hovered (unlinked from tab hover)
  const shouldHover = isMainContentHovered;

  // Group view rendering (exactly 2 tabs)
  if (shouldShowGroupView && activeTabGroup && groupTabs.length === 2) {
    return (
      <div
        className={`h-full overflow-visible transition-all duration-400 ease-in-out ${shouldHover ? '-translate-y-1' : ''}`}
        onMouseEnter={() => handleMainContentHover(true)}
        onMouseLeave={() => handleMainContentHover(false)}
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
            <div className={`h-full ml-8 main-content-panel overflow-visible ${getTabBackgroundClass(groupTabs[0].type)} transition-all duration-400 ease-in-out ${
              activeTabGroup.direction === "vertical" ? `rounded-3xl mr-2 ${groupHasMarkdownEditor ? 'pb-0' : 'pb-8'}` : `rounded-3xl mb-2 ${groupHasMarkdownEditor ? 'pb-0' : 'pb-8'}`
            } ${chatOpen && activeTabGroup.direction === "horizontal" ? 'mr-0' : 'mr-8'} p-4`}>
              {renderTabContent(groupTabs[0])}
            </div>
          </Panel>

          <PanelResizeHandle className="relative flex items-center justify-center group">
            <div className={`${activeTabGroup.direction === "vertical" ? "w-1 h-full" : "w-full h-1"} bg-border hover:bg-muted-foreground/20 transition-all duration-300 group-hover:${activeTabGroup.direction === "vertical" ? "w-2" : "h-2"}`} />
          </PanelResizeHandle>

          <Panel
            defaultSize={100 - activeTabGroup.splitRatio}
            minSize={10}
            className="relative overflow-visible"
          >
            <div className={`h-full main-content-panel overflow-visible ${getTabBackgroundClass(groupTabs[1].type)} transition-all duration-400 ease-in-out ${
              activeTabGroup.direction === "vertical" ? `rounded-3xl ml-2 ${groupHasMarkdownEditor ? 'pb-0' : 'pb-8'}` : `rounded-3xl mt-2 ${groupHasMarkdownEditor ? 'pb-0' : 'pb-8'}`
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
      className={`h-full ml-8 pb-8 rounded-3xl main-content-panel overflow-visible ${getTabBackgroundClass(activeTab.type)} transition-all duration-400 ease-in-out ${shouldHover ? '-translate-y-1' : ''} ${chatOpen ? 'mr-0 p-4' : 'mr-8 p-4'} relative`}
      onMouseEnter={() => handleMainContentHover(true)}
      onMouseLeave={() => handleMainContentHover(false)}
    >
      {renderTabContent(activeTab)}
    </div>
  );
});

MainContent.displayName = 'MainContent';

export { MainContent };