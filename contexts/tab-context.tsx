"use client";

import React, { createContext, useContext, useReducer } from "react";

// Types
export type TabType = "visual" | "code" | "markdown";
export type SplitDirection = "horizontal" | "vertical" | null;

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  excalidrawData?: Record<string, unknown>;
}

export interface TabGroup {
  id: string;
  tabIds: string[];
  direction: SplitDirection;
  splitRatio: number;
}

export interface DragState {
  isDragging: boolean;
  draggedTabId: string | null;
  dropTargetTabId: string | null;
  dropZone: 'left' | 'right' | 'top' | 'bottom' | null;
}

// State interface
interface TabState {
  tabs: Tab[];
  activeTabId: string;
  tabGroups: TabGroup[];
  dragState: DragState;
  editingTabId: string | null;
  editingTabName: string;
  hoveredTabId: string | null;
  isMainContentHovered: boolean;
}

// Action types
type TabAction =
  | { type: 'CREATE_TAB'; payload: { type: TabType } }
  | { type: 'CLOSE_TAB'; payload: { tabId: string } }
  | { type: 'SET_ACTIVE_TAB'; payload: { tabId: string } }
  | { type: 'UPDATE_TAB_DATA'; payload: { tabId: string; data: Record<string, unknown> } }
  | { type: 'UPDATE_TAB_NAME'; payload: { tabId: string; name: string } }
  | { type: 'START_EDITING_TAB'; payload: { tabId: string; currentName: string } }
  | { type: 'UPDATE_EDITING_NAME'; payload: { name: string } }
  | { type: 'FINISH_EDITING_TAB' }
  | { type: 'CANCEL_EDITING_TAB' }
  | { type: 'SET_HOVERED_TAB'; payload: { tabId: string | null } }
  | { type: 'SET_MAIN_CONTENT_HOVERED'; payload: { hovered: boolean } }
  | { type: 'START_DRAG'; payload: { tabId: string } }
  | { type: 'END_DRAG' }
  | { type: 'UPDATE_DRAG_TARGET'; payload: { tabId: string; dropZone: 'left' | 'right' | 'top' | 'bottom' } }
  | { type: 'CLEAR_DRAG_TARGET' }
  | { type: 'CREATE_TAB_GROUP'; payload: { tabIds: string[]; direction: SplitDirection } }
  | { type: 'REMOVE_TAB_GROUP'; payload: { groupId: string } }
  | { type: 'UPDATE_GROUP_SPLIT_RATIO'; payload: { groupId: string; ratio: number } };

// Initial state
const initialState: TabState = {
  tabs: [{ id: "1", type: "visual", title: "canvas 1" }],
  activeTabId: "1",
  tabGroups: [],
  dragState: {
    isDragging: false,
    draggedTabId: null,
    dropTargetTabId: null,
    dropZone: null
  },
  editingTabId: null,
  editingTabName: "",
  hoveredTabId: null,
  isMainContentHovered: false
};

// Reducer
function tabReducer(state: TabState, action: TabAction): TabState {
  switch (action.type) {
    case 'CREATE_TAB': {
      const { type } = action.payload;
      const tabCount = state.tabs.filter(tab => tab.type === type).length + 1;
      const newTab: Tab = {
        id: Date.now().toString(),
        type,
        title: type === "visual" ? `canvas ${tabCount}` : type === "code" ? `ide ${tabCount}` : `notes${tabCount}`,
      };
      return {
        ...state,
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id
      };
    }

    case 'CLOSE_TAB': {
      const { tabId } = action.payload;
      const newTabs = state.tabs.filter((tab) => tab.id !== tabId);

      if (newTabs.length === 0) {
        const defaultTab: Tab = { id: Date.now().toString(), type: "visual", title: "Visual Canvas" };
        return {
          ...state,
          tabs: [defaultTab],
          activeTabId: defaultTab.id,
          tabGroups: []
        };
      }

      // Clean up tab groups
      const updatedTabGroups = state.tabGroups.filter(group => {
        const remainingTabsInGroup = group.tabIds.filter(id => id !== tabId);
        return remainingTabsInGroup.length >= 2;
      });

      return {
        ...state,
        tabs: newTabs,
        activeTabId: state.activeTabId === tabId ? newTabs[0].id : state.activeTabId,
        tabGroups: updatedTabGroups
      };
    }

    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTabId: action.payload.tabId
      };

    case 'UPDATE_TAB_DATA':
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.tabId
            ? { ...tab, excalidrawData: action.payload.data }
            : tab
        )
      };

    case 'UPDATE_TAB_NAME':
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.tabId
            ? { ...tab, title: action.payload.name.trim() || tab.title }
            : tab
        )
      };

    case 'START_EDITING_TAB':
      return {
        ...state,
        editingTabId: action.payload.tabId,
        editingTabName: action.payload.currentName
      };

    case 'UPDATE_EDITING_NAME':
      return {
        ...state,
        editingTabName: action.payload.name
      };

    case 'FINISH_EDITING_TAB':
      if (state.editingTabId) {
        const updatedTabs = state.tabs.map(tab =>
          tab.id === state.editingTabId
            ? { ...tab, title: state.editingTabName.trim() || tab.title }
            : tab
        );
        return {
          ...state,
          tabs: updatedTabs,
          editingTabId: null,
          editingTabName: ""
        };
      }
      return state;

    case 'CANCEL_EDITING_TAB':
      return {
        ...state,
        editingTabId: null,
        editingTabName: ""
      };

    case 'SET_HOVERED_TAB':
      return {
        ...state,
        hoveredTabId: action.payload.tabId
      };

    case 'SET_MAIN_CONTENT_HOVERED':
      return {
        ...state,
        isMainContentHovered: action.payload.hovered
      };

    case 'START_DRAG':
      return {
        ...state,
        dragState: {
          isDragging: true,
          draggedTabId: action.payload.tabId,
          dropTargetTabId: null,
          dropZone: null
        }
      };

    case 'END_DRAG': {
      const { draggedTabId, dropTargetTabId, dropZone } = state.dragState;

      if (draggedTabId && dropTargetTabId && dropZone && draggedTabId !== dropTargetTabId) {
        const targetGroup = state.tabGroups.find(group => group.tabIds.includes(dropTargetTabId));
        const draggedGroup = state.tabGroups.find(group => group.tabIds.includes(draggedTabId));

        if (!targetGroup && !draggedGroup) {
          const direction: SplitDirection = (dropZone === 'left' || dropZone === 'right') ? 'vertical' : 'horizontal';
          const isPrimaryFirst = dropZone === 'left' || dropZone === 'top';
          const tabIds = isPrimaryFirst ? [draggedTabId, dropTargetTabId] : [dropTargetTabId, draggedTabId];

          const newGroup: TabGroup = {
            id: Date.now().toString(),
            tabIds,
            direction,
            splitRatio: 50
          };

          return {
            ...state,
            tabGroups: [...state.tabGroups, newGroup],
            dragState: {
              isDragging: false,
              draggedTabId: null,
              dropTargetTabId: null,
              dropZone: null
            }
          };
        }
      }

      return {
        ...state,
        dragState: {
          isDragging: false,
          draggedTabId: null,
          dropTargetTabId: null,
          dropZone: null
        }
      };
    }

    case 'UPDATE_DRAG_TARGET':
      return {
        ...state,
        dragState: {
          ...state.dragState,
          dropTargetTabId: action.payload.tabId,
          dropZone: action.payload.dropZone
        }
      };

    case 'CLEAR_DRAG_TARGET':
      return {
        ...state,
        dragState: {
          ...state.dragState,
          dropTargetTabId: null,
          dropZone: null
        }
      };

    case 'CREATE_TAB_GROUP':
      const newGroup: TabGroup = {
        id: Date.now().toString(),
        tabIds: action.payload.tabIds,
        direction: action.payload.direction,
        splitRatio: 50
      };
      return {
        ...state,
        tabGroups: [...state.tabGroups, newGroup]
      };

    case 'REMOVE_TAB_GROUP':
      return {
        ...state,
        tabGroups: state.tabGroups.filter(group => group.id !== action.payload.groupId)
      };

    case 'UPDATE_GROUP_SPLIT_RATIO':
      return {
        ...state,
        tabGroups: state.tabGroups.map(group =>
          group.id === action.payload.groupId
            ? { ...group, splitRatio: action.payload.ratio }
            : group
        )
      };

    default:
      return state;
  }
}

// Context
interface TabContextValue {
  state: TabState;
  actions: {
    createTab: (type: TabType) => void;
    closeTab: (tabId: string) => void;
    setActiveTab: (tabId: string) => void;
    updateTabData: (tabId: string, data: Record<string, unknown>) => void;
    updateTabName: (tabId: string, name: string) => void;
    startEditingTab: (tabId: string, currentName: string) => void;
    updateEditingName: (name: string) => void;
    finishEditingTab: () => void;
    cancelEditingTab: () => void;
    setHoveredTab: (tabId: string | null) => void;
    setMainContentHovered: (hovered: boolean) => void;
    startDrag: (tabId: string) => void;
    endDrag: () => void;
    updateDragTarget: (tabId: string, dropZone: 'left' | 'right' | 'top' | 'bottom') => void;
    clearDragTarget: () => void;
    createTabGroup: (tabIds: string[], direction: SplitDirection) => void;
    removeTabGroup: (groupId: string) => void;
    updateGroupSplitRatio: (groupId: string, ratio: number) => void;
  };
  utils: {
    findTabGroup: (tabId: string) => TabGroup | null;
    isTabInGroup: (tabId: string) => boolean;
    getActiveTab: () => Tab | undefined;
    getActiveTabGroup: () => TabGroup | null;
  };
}

const TabContext = createContext<TabContextValue | null>(null);

// Provider
export function TabProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(tabReducer, initialState);

  // Memoized actions to prevent unnecessary re-renders
  const actions = React.useMemo(() => ({
    createTab: (type: TabType) => dispatch({ type: 'CREATE_TAB', payload: { type } }),
    closeTab: (tabId: string) => dispatch({ type: 'CLOSE_TAB', payload: { tabId } }),
    setActiveTab: (tabId: string) => dispatch({ type: 'SET_ACTIVE_TAB', payload: { tabId } }),
    updateTabData: (tabId: string, data: Record<string, unknown>) => dispatch({ type: 'UPDATE_TAB_DATA', payload: { tabId, data } }),
    updateTabName: (tabId: string, name: string) => dispatch({ type: 'UPDATE_TAB_NAME', payload: { tabId, name } }),
    startEditingTab: (tabId: string, currentName: string) => dispatch({ type: 'START_EDITING_TAB', payload: { tabId, currentName } }),
    updateEditingName: (name: string) => dispatch({ type: 'UPDATE_EDITING_NAME', payload: { name } }),
    finishEditingTab: () => dispatch({ type: 'FINISH_EDITING_TAB' }),
    cancelEditingTab: () => dispatch({ type: 'CANCEL_EDITING_TAB' }),
    setHoveredTab: (tabId: string | null) => dispatch({ type: 'SET_HOVERED_TAB', payload: { tabId } }),
    setMainContentHovered: (hovered: boolean) => dispatch({ type: 'SET_MAIN_CONTENT_HOVERED', payload: { hovered } }),
    startDrag: (tabId: string) => dispatch({ type: 'START_DRAG', payload: { tabId } }),
    endDrag: () => dispatch({ type: 'END_DRAG' }),
    updateDragTarget: (tabId: string, dropZone: 'left' | 'right' | 'top' | 'bottom') =>
      dispatch({ type: 'UPDATE_DRAG_TARGET', payload: { tabId, dropZone } }),
    clearDragTarget: () => dispatch({ type: 'CLEAR_DRAG_TARGET' }),
    createTabGroup: (tabIds: string[], direction: SplitDirection) =>
      dispatch({ type: 'CREATE_TAB_GROUP', payload: { tabIds, direction } }),
    removeTabGroup: (groupId: string) => dispatch({ type: 'REMOVE_TAB_GROUP', payload: { groupId } }),
    updateGroupSplitRatio: (groupId: string, ratio: number) =>
      dispatch({ type: 'UPDATE_GROUP_SPLIT_RATIO', payload: { groupId, ratio } }),
  }), []);

  // Memoized utility functions
  const utils = React.useMemo(() => ({
    findTabGroup: (tabId: string): TabGroup | null => {
      return state.tabGroups.find(group => group.tabIds.includes(tabId)) || null;
    },
    isTabInGroup: (tabId: string): boolean => {
      return state.tabGroups.some(group => group.tabIds.includes(tabId));
    },
    getActiveTab: (): Tab | undefined => {
      return state.tabs.find(tab => tab.id === state.activeTabId);
    },
    getActiveTabGroup: (): TabGroup | null => {
      return state.tabGroups.find(group => group.tabIds.includes(state.activeTabId)) || null;
    }
  }), [state.tabs, state.tabGroups, state.activeTabId]);

  const contextValue = React.useMemo(() => ({
    state,
    actions,
    utils
  }), [state, actions, utils]);

  return (
    <TabContext.Provider value={contextValue}>
      {children}
    </TabContext.Provider>
  );
}

// Hook
export function useTabContext() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTabContext must be used within a TabProvider');
  }
  return context;
}

// Selector hooks for performance optimization
export function useTabState() {
  const { state } = useTabContext();
  return state;
}

export function useTabActions() {
  const { actions } = useTabContext();
  return actions;
}

export function useTabUtils() {
  const { utils } = useTabContext();
  return utils;
}

// Specific selectors to prevent unnecessary re-renders
export function useActiveTab() {
  const { state } = useTabContext();
  return React.useMemo(() =>
    state.tabs.find(tab => tab.id === state.activeTabId),
    [state.tabs, state.activeTabId]
  );
}

export function useTabs() {
  const { state } = useTabContext();
  return state.tabs;
}

export function useTabGroups() {
  const { state } = useTabContext();
  return state.tabGroups;
}

export function useDragState() {
  const { state } = useTabContext();
  return state.dragState;
}