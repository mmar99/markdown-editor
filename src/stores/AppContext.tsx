import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from "react";
import type { AppState, FileNode, TabInfo } from "../types";

export interface Settings {
  fontFamily: string;
  fontSize: number;
  editorWidth: number;
  bgColor: string;
}

const defaultSettings: Settings = {
  fontFamily: "system",
  fontSize: 16,
  editorWidth: 800,
  bgColor: "default",
};

function fileLabel(path: string): string {
  return path.split("/").pop()?.replace(/\.(md|markdown|mdx|txt)$/, "") ?? "Untitled";
}

const initialState: AppState = {
  currentFilePath: null,
  originalContent: "",
  currentContent: "",
  isDirty: false,
  fileVersion: 0,
  openTabs: [],
  activeTabIndex: -1,
  sidebarOpen: true,
  outlineOpen: true,
  settingsOpen: false,
  commandPaletteOpen: false,
  findReplaceOpen: false,
  navHistory: [],
  navHistoryIndex: -1,
  workspacePath: null,
  fileTree: [],
  recentFiles: [],
  favorites: [],
  settings: defaultSettings,
};

type Action =
  | { type: "OPEN_FILE"; path: string; content: string }
  | { type: "NEW_FILE" }
  | { type: "UPDATE_CONTENT"; content: string }
  | { type: "SAVE_FILE"; path?: string }
  | { type: "CLOSE_TAB"; index: number }
  | { type: "SWITCH_TAB"; index: number }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "TOGGLE_OUTLINE" }
  | { type: "TOGGLE_SETTINGS" }
  | { type: "TOGGLE_FAVORITE"; path: string }
  | { type: "SET_FAVORITES"; favorites: string[] }
  | { type: "SET_WORKSPACE"; path: string; tree: FileNode[] }
  | { type: "SET_FILE_TREE"; tree: FileNode[] }
  | { type: "SET_RECENT_FILES"; files: string[] }
  | { type: "UPDATE_SETTINGS"; settings: Partial<Settings> }
  | { type: "RESTORE_SESSION"; workspacePath: string | null; settings: Settings; favorites: string[]; tabs: TabInfo[] }
  | { type: "OPEN_COMMAND_PALETTE" }
  | { type: "CLOSE_COMMAND_PALETTE" }
  | { type: "OPEN_FIND_REPLACE" }
  | { type: "CLOSE_FIND_REPLACE" }
  | { type: "UPDATE_TAB_TITLE"; index: number; title: string }
  | { type: "NAV_PUSH"; path: string }
  | { type: "NAV_BACK" }
  | { type: "NAV_FORWARD" };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "OPEN_FILE": {
      // Check if tab already exists
      const existingIdx = state.openTabs.findIndex((t) => t.path === action.path);
      if (existingIdx >= 0) {
        // Switch to existing tab
        return {
          ...state,
          currentFilePath: action.path,
          originalContent: action.content,
          currentContent: action.content,
          isDirty: false,
          fileVersion: state.fileVersion + 1,
          activeTabIndex: existingIdx,
        };
      }
      // Add new tab
      const newTab: TabInfo = { path: action.path, label: fileLabel(action.path) };
      const newTabs = [...state.openTabs, newTab];
      return {
        ...state,
        currentFilePath: action.path,
        originalContent: action.content,
        currentContent: action.content,
        isDirty: false,
        fileVersion: state.fileVersion + 1,
        openTabs: newTabs,
        activeTabIndex: newTabs.length - 1,
      };
    }
    case "NEW_FILE": {
      return {
        ...state,
        currentFilePath: null,
        originalContent: "",
        currentContent: "",
        isDirty: false,
      };
    }
    case "UPDATE_CONTENT":
      return {
        ...state,
        currentContent: action.content,
        isDirty: action.content !== state.originalContent,
      };
    case "SAVE_FILE":
      return {
        ...state,
        currentFilePath: action.path ?? state.currentFilePath,
        originalContent: state.currentContent,
        isDirty: false,
      };
    case "CLOSE_TAB": {
      const tabs = state.openTabs.filter((_, i) => i !== action.index);
      let newActiveIdx = state.activeTabIndex;
      if (tabs.length === 0) {
        return { ...state, openTabs: [], activeTabIndex: -1, currentFilePath: null, originalContent: "", currentContent: "", isDirty: false };
      }
      if (action.index <= state.activeTabIndex) {
        newActiveIdx = Math.max(0, state.activeTabIndex - 1);
      }
      if (newActiveIdx >= tabs.length) newActiveIdx = tabs.length - 1;
      return {
        ...state,
        openTabs: tabs,
        activeTabIndex: newActiveIdx,
        // The actual file loading will happen via a useEffect watching activeTabIndex
      };
    }
    case "SWITCH_TAB":
      return { ...state, activeTabIndex: action.index };
    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case "TOGGLE_OUTLINE":
      return { ...state, outlineOpen: !state.outlineOpen };
    case "TOGGLE_SETTINGS":
      return { ...state, settingsOpen: !state.settingsOpen };
    case "TOGGLE_FAVORITE": {
      const isFav = state.favorites.includes(action.path);
      return {
        ...state,
        favorites: isFav
          ? state.favorites.filter((f) => f !== action.path)
          : [...state.favorites, action.path],
      };
    }
    case "SET_FAVORITES":
      return { ...state, favorites: action.favorites };
    case "SET_WORKSPACE":
      return { ...state, workspacePath: action.path, fileTree: action.tree };
    case "SET_FILE_TREE":
      return { ...state, fileTree: action.tree };
    case "SET_RECENT_FILES":
      return { ...state, recentFiles: action.files };
    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case "RESTORE_SESSION":
      return {
        ...state,
        workspacePath: action.workspacePath,
        settings: action.settings,
        favorites: action.favorites,
        openTabs: action.tabs,
        activeTabIndex: action.tabs.length > 0 ? 0 : -1,
      };
    case "OPEN_COMMAND_PALETTE":
      return { ...state, commandPaletteOpen: true };
    case "CLOSE_COMMAND_PALETTE":
      return { ...state, commandPaletteOpen: false };
    case "OPEN_FIND_REPLACE":
      return { ...state, findReplaceOpen: true };
    case "CLOSE_FIND_REPLACE":
      return { ...state, findReplaceOpen: false };
    case "UPDATE_TAB_TITLE": {
      const tabs = [...state.openTabs];
      if (tabs[action.index]) tabs[action.index] = { ...tabs[action.index], title: action.title || undefined };
      return { ...state, openTabs: tabs };
    }
    case "NAV_PUSH": {
      if (state.navHistory[state.navHistoryIndex] === action.path) return state;
      const newHistory = [...state.navHistory.slice(0, state.navHistoryIndex + 1), action.path];
      return { ...state, navHistory: newHistory, navHistoryIndex: newHistory.length - 1 };
    }
    case "NAV_BACK":
      if (state.navHistoryIndex <= 0) return state;
      return { ...state, navHistoryIndex: state.navHistoryIndex - 1 };
    case "NAV_FORWARD":
      if (state.navHistoryIndex >= state.navHistory.length - 1) return state;
      return { ...state, navHistoryIndex: state.navHistoryIndex + 1 };
    default:
      return state;
  }
}

const AppStateContext = createContext<AppState>(initialState);
const AppDispatchContext = createContext<Dispatch<Action>>(() => {});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

export function useAppState() { return useContext(AppStateContext); }
export function useAppDispatch() { return useContext(AppDispatchContext); }
