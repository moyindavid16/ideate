"use client";

import { useState, useCallback } from "react";
import { MainContent } from "@/components/main-content";
import { ChatSidebar } from "@/components/chat-sidebar";
import { VisualCanvas } from "@/components/visual-canvas";
import { CodeEditor } from "@/components/code-editor";
import { MarkdownEditor } from "@/components/markdown-editor";
import { NewTabPopup } from "@/components/new-tab-popup";
import { DraggableTab } from "@/components/draggable-tab";
import { TabGroup } from "@/components/tab-group";
import { PenTool, Code, FileText, X, Maximize2 } from "lucide-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

export type TabType = "visual" | "code" | "markdown";
export type SplitDirection = "horizontal" | "vertical" | null;

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  excalidrawData?: any; // Store Excalidraw elements and app state
}

export interface TabGroup {
  id: string;
  tabIds: string[];
  direction: SplitDirection;
  splitRatio: number; // 0-100, percentage for first pane
}

export interface DragState {
  isDragging: boolean;
  draggedTabId: string | null;
  dropTargetTabId: string | null;
  dropZone: 'left' | 'right' | 'top' | 'bottom' | null;
}

export default function Home() {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "1", type: "visual", title: "canvas 1" },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("1");
  const [chatOpen, setChatOpen] = useState(true); // Start with chat open
  const [chatPanelSize, setChatPanelSize] = useState(25); // Remember chat panel size
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState<string>("");
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [isMainContentHovered, setIsMainContentHovered] = useState(false);

  // Tab groups state
  const [tabGroups, setTabGroups] = useState<TabGroup[]>([]);

  // Drag and drop state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedTabId: null,
    dropTargetTabId: null,
    dropZone: null
  });

  const createNewTab = (type: TabType) => {
    const tabCount = tabs.filter(tab => tab.type === type).length + 1;
    const newTab: Tab = {
      id: Date.now().toString(),
      type,
      title: type === "visual" ? `canvas ${tabCount}` : type === "code" ? `ide ${tabCount}` : `notes${tabCount}.md`,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (tabId: string) => {
    const newTabs = tabs.filter((tab) => tab.id !== tabId);
    if (newTabs.length === 0) {
      // Always keep at least one tab
      const defaultTab: Tab = { id: Date.now().toString(), type: "visual", title: "Visual Canvas" };
      setTabs([defaultTab]);
      setActiveTabId(defaultTab.id);
    } else {
      setTabs(newTabs);
      if (activeTabId === tabId) {
        setActiveTabId(newTabs[0].id);
      }
    }

    // Clean up any tab groups that now have less than 2 tabs
    setTabGroups(prevGroups =>
      prevGroups.filter(group => {
        const remainingTabsInGroup = group.tabIds.filter(id => id !== tabId);
        return remainingTabsInGroup.length >= 2;
      })
    );
  };

  const updateTabData = useCallback((tabId: string, data: any) => {
    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === tabId
          ? { ...tab, excalidrawData: data }
          : tab
      )
    );
  }, []);

  const updateTabName = (tabId: string, newName: string) => {
    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === tabId
          ? { ...tab, title: newName.trim() || tab.title }
          : tab
      )
    );
  };

  const startEditingTab = (tabId: string, currentName: string) => {
    setEditingTabId(tabId);
    setEditingTabName(currentName);
  };

  const finishEditingTab = () => {
    if (editingTabId) {
      updateTabName(editingTabId, editingTabName);
    }
    setEditingTabId(null);
    setEditingTabName("");
  };

  const cancelEditingTab = () => {
    setEditingTabId(null);
    setEditingTabName("");
  };

  // Helper functions for tab groups
  const findTabGroup = (tabId: string): TabGroup | null => {
    return tabGroups.find(group => group.tabIds.includes(tabId)) || null;
  };

  const isTabInGroup = (tabId: string): boolean => {
    return tabGroups.some(group => group.tabIds.includes(tabId));
  };

  const createTabGroup = (tabIds: string[], direction: SplitDirection = 'vertical'): void => {
    const newGroup: TabGroup = {
      id: Date.now().toString(),
      tabIds,
      direction,
      splitRatio: 50
    };
    setTabGroups(prev => [...prev, newGroup]);
  };

  const removeTabGroup = (groupId: string): void => {
    setTabGroups(prev => prev.filter(group => group.id !== groupId));
  };

  const handleTabClick = (tabId: string) => {
    setActiveTabId(tabId);
  };

  const handlePanelResize = (sizes: number[]) => {
    // Save the chat panel size (second panel)
    if (sizes[1] !== undefined) {
      setChatPanelSize(sizes[1]);
    }
  };

  // Drag and drop functions
  const handleTabDragStart = (tabId: string) => {
    setDragState({
      isDragging: true,
      draggedTabId: tabId,
      dropTargetTabId: null,
      dropZone: null
    });
  };

  const handleTabDragEnd = () => {
    const { draggedTabId, dropTargetTabId, dropZone } = dragState;

    if (draggedTabId && dropTargetTabId && dropZone && draggedTabId !== dropTargetTabId) {
      // Check if target tab is already in a group
      const targetGroup = findTabGroup(dropTargetTabId);
      const draggedGroup = findTabGroup(draggedTabId);

      // Don't allow grouping if either tab is already in a group (limit to 2 tabs per group)
      if (!targetGroup && !draggedGroup) {
        // Create new group with both tabs
        const direction: SplitDirection = (dropZone === 'left' || dropZone === 'right') ? 'vertical' : 'horizontal';
        const isPrimaryFirst = dropZone === 'left' || dropZone === 'top';
        const tabIds = isPrimaryFirst ? [draggedTabId, dropTargetTabId] : [dropTargetTabId, draggedTabId];

        createTabGroup(tabIds, direction);
      }
    }

    setDragState({
      isDragging: false,
      draggedTabId: null,
      dropTargetTabId: null,
      dropZone: null
    });
  };

  const handleTabDragOver = (tabId: string, dropZone: 'left' | 'right' | 'top' | 'bottom') => {
    if (dragState.draggedTabId && dragState.draggedTabId !== tabId) {
      setDragState(prev => ({
        ...prev,
        dropTargetTabId: tabId,
        dropZone
      }));
    }
  };

  const handleTabDragLeave = () => {
    setDragState(prev => ({
      ...prev,
      dropTargetTabId: null,
      dropZone: null
    }));
  };

  const removeActiveTabGroup = () => {
    const activeTabGroup = findTabGroup(activeTabId);
    if (activeTabGroup) {
      removeTabGroup(activeTabGroup.id);
    }
  };

  const updateGroupSplitRatio = (ratio: number) => {
    const activeTabGroup = findTabGroup(activeTabId);
    if (activeTabGroup) {
      setTabGroups(prev => prev.map(group =>
        group.id === activeTabGroup.id
          ? { ...group, splitRatio: ratio }
          : group
      ));
    }
  };

  const swapGroupPanes = () => {
    const activeTabGroup = findTabGroup(activeTabId);
    if (activeTabGroup) {
      setTabGroups(prev => prev.map(group =>
        group.id === activeTabGroup.id
          ? { ...group, tabIds: [group.tabIds[1], group.tabIds[0]], splitRatio: 100 - group.splitRatio }
          : group
      ));
    }
  };

  const renderTabContent = (tab: Tab) => {
    switch (tab.type) {
      case "visual":
        return (
          <VisualCanvas
            tabId={tab.id}
            initialData={tab.excalidrawData}
            onDataChange={(data) => updateTabData(tab.id, data)}
            tabType={tab.type}
          />
        );
      case "code":
        return <CodeEditor tabType={tab.type} />;
      case "markdown":
        return <MarkdownEditor tabType={tab.type} />;
    }
  };

  // Function to render tabs with proper grouping
  const renderTabsWithGrouping = () => {
    if (tabGroups.length === 0) {
      // Normal mode - render all tabs individually
      return tabs.map((tab) => (
        <DraggableTab
          key={tab.id}
          tab={tab}
          isActive={activeTabId === tab.id}
          isHovered={hoveredTabId === tab.id}
          isMainContentHovered={isMainContentHovered}
          editingTabId={editingTabId}
          editingTabName={editingTabName}
          tabs={tabs}
          dragState={dragState}
          onMouseEnter={() => setHoveredTabId(tab.id)}
          onMouseLeave={() => setHoveredTabId(null)}
          onClick={() => handleTabClick(tab.id)}
          onDoubleClick={() => startEditingTab(tab.id, tab.title)}
          onEditChange={setEditingTabName}
          onEditBlur={finishEditingTab}
          onEditKeyDown={(e) => {
            if (e.key === 'Enter') finishEditingTab();
            if (e.key === 'Escape') cancelEditingTab();
          }}
          onClose={() => closeTab(tab.id)}
          onDragStart={handleTabDragStart}
          onDragEnd={handleTabDragEnd}
          onDragOver={handleTabDragOver}
          onDragLeave={handleTabDragLeave}
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
            isMainContentHovered={isMainContentHovered}
            editingTabId={editingTabId}
            editingTabName={editingTabName}
            tabs={tabs}
            dragState={dragState}
            onMouseEnter={() => setHoveredTabId(tab.id)}
            onMouseLeave={() => setHoveredTabId(null)}
            onClick={() => handleTabClick(tab.id)}
            onDoubleClick={() => startEditingTab(tab.id, tab.title)}
            onEditChange={setEditingTabName}
            onEditBlur={finishEditingTab}
            onEditKeyDown={(e) => {
              if (e.key === 'Enter') finishEditingTab();
              if (e.key === 'Escape') cancelEditingTab();
            }}
            onClose={() => closeTab(tab.id)}
            onDragStart={handleTabDragStart}
            onDragEnd={handleTabDragEnd}
            onDragOver={handleTabDragOver}
            onDragLeave={handleTabDragLeave}
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
                  isMainContentHovered={isMainContentHovered}
                  editingTabId={editingTabId}
                  editingTabName={editingTabName}
                  tabs={tabs}
                  dragState={dragState}
                  isInSplitView={true}
                  splitViewPartner={group.tabIds.find(id => id !== tab.id) || null}
                  onMouseEnter={() => setHoveredTabId(tab.id)}
                  onMouseLeave={() => setHoveredTabId(null)}
                  onClick={() => handleTabClick(tab.id)}
                  onDoubleClick={() => startEditingTab(tab.id, tab.title)}
                  onEditChange={setEditingTabName}
                  onEditBlur={finishEditingTab}
                  onEditKeyDown={(e) => {
                    if (e.key === 'Enter') finishEditingTab();
                    if (e.key === 'Escape') cancelEditingTab();
                  }}
                  onClose={() => closeTab(tab.id)}
                  onDragStart={handleTabDragStart}
                  onDragEnd={handleTabDragEnd}
                  onDragOver={handleTabDragOver}
                  onDragLeave={handleTabDragLeave}
                />
              ))}
            </TabGroup>
          );
        })}
      </>
    );
  };

  return (
    <div className="h-screen flex flex-col pb-8 overflow-hidden">
      {/* Top Tab Bar */}
      <div className="bg-background backdrop-blur-sm transition-all duration-300 overflow-visible pt-4 antialiased paper-surface">
        {chatOpen ? (
          <div className="flex pt-6 pb-0 relative z-10">
            {/* Left section for tabs - matches main content panel width */}
            <div style={{ width: `${100 - chatPanelSize}%` }} className="flex items-center px-8 overflow-visible">
              <div className="flex items-center gap-3 overflow-visible py-4">
                {renderTabsWithGrouping()}

                <NewTabPopup onCreateTab={createNewTab}>
                  <button className="w-10 h-10 rounded-2xl border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 font-light text-lg leading-none">
                    +
                  </button>
                </NewTabPopup>

                {/* Exit Group View Control - Only show when active tab is in a group */}
                {isTabInGroup(activeTabId) && (
                  <button
                    onClick={removeActiveTabGroup}
                    className="w-8 h-8 rounded-xl border border-accent/50 bg-accent/10 hover:bg-accent/20 flex items-center justify-center text-accent hover:text-accent-foreground transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 ml-2"
                    title="Exit Group View"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Resize handle spacer */}
            <div className="w-4"></div>

            {/* Right section for doodle buddy - matches chat panel width */}
            <div style={{ width: `${chatPanelSize}%` }} className="flex items-center pl-0 pr-8">
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className={`sticky-blue transition-all duration-300 px-4 py-3 text-sm font-medium w-full rounded-2xl ${
                  chatOpen ? 'z-20 border-2 border-foreground/20' : 'z-0 opacity-60 scale-95 border border-border/30'
                }`}
              >
                doodle buddy
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-8 pt-6 pb-0 overflow-visible">
            <div className="flex items-center gap-3 overflow-visible py-4">
              {renderTabsWithGrouping()}

              <NewTabPopup onCreateTab={createNewTab}>
                <button className="w-10 h-10 rounded-2xl border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 font-light text-lg leading-none">
                  +
                </button>
              </NewTabPopup>

              {/* Exit Group View Control - Only show when active tab is in a group */}
              {isTabInGroup(activeTabId) && (
                <button
                  onClick={removeActiveTabGroup}
                  className="w-8 h-8 rounded-xl border border-accent/50 bg-accent/10 hover:bg-accent/20 flex items-center justify-center text-accent hover:text-accent-foreground transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 ml-2"
                  title="Exit Group View"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="ml-6 h-8 w-px bg-border" />

              <button
                onClick={() => setChatOpen(!chatOpen)}
                className={`sticky-blue transition-all duration-300 px-4 py-3 text-sm font-medium rounded-2xl ${
                  chatOpen ? 'z-20 border-2 border-foreground/20' : 'z-0 opacity-60 scale-95 border border-border/30'
                }`}
              >
                doodle buddy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-visible">
        {chatOpen ? (
          <PanelGroup key="chat-panels" direction="horizontal" onLayout={handlePanelResize} className="overflow-visible">
            <Panel defaultSize={100 - chatPanelSize} minSize={50} className="overflow-visible">
              <MainContent
                tabs={tabs}
                activeTabId={activeTabId}
                hoveredTabId={hoveredTabId}
                isMainContentHovered={isMainContentHovered}
                setIsMainContentHovered={setIsMainContentHovered}
                renderTabContent={renderTabContent}
                chatOpen={chatOpen}
                tabGroups={tabGroups}
                updateGroupSplitRatio={updateGroupSplitRatio}
                swapGroupPanes={swapGroupPanes}
                dragState={dragState}
              />
            </Panel>
            <PanelResizeHandle className="w-4 bg-border hover:bg-muted-foreground/20 transition-all duration-300 hover:w-6" />
            <Panel defaultSize={chatPanelSize} minSize={20} maxSize={50} className="overflow-visible">
              <ChatSidebar api={} />
            </Panel>
          </PanelGroup>
        ) : (
          <MainContent
            tabs={tabs}
            activeTabId={activeTabId}
            hoveredTabId={hoveredTabId}
            isMainContentHovered={isMainContentHovered}
            setIsMainContentHovered={setIsMainContentHovered}
            renderTabContent={renderTabContent}
            chatOpen={chatOpen}
            tabGroups={tabGroups}
            updateGroupSplitRatio={updateGroupSplitRatio}
            swapGroupPanes={swapGroupPanes}
            dragState={dragState}
          />
        )}
      </div>
    </div>
  );
}
