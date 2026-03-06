import type { Settings } from "../stores/AppContext";

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

export interface TabInfo {
  path: string;
  label: string; // filename without extension
}

export interface AppState {
  // File
  currentFilePath: string | null;
  originalContent: string;
  currentContent: string;
  isDirty: boolean;
  fileVersion: number;
  // Tabs
  openTabs: TabInfo[];
  activeTabIndex: number;
  // UI
  sidebarOpen: boolean;
  outlineOpen: boolean;
  settingsOpen: boolean;
  commandPaletteOpen: boolean;
  // Workspace
  workspacePath: string | null;
  fileTree: FileNode[];
  recentFiles: string[];
  favorites: string[];
  // Settings
  settings: Settings;
}

export interface HeadingItem {
  level: number;
  text: string;
  pos: number;
}
