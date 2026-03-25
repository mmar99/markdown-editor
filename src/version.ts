export const APP_VERSION = "0.2.0";
export const APP_CODENAME = "Quill";
export const APP_RELEASE_DATE = "2026-03-25";

export interface ChangelogEntry {
  version: string;
  codename: string;
  date: string;
  changes: {
    added?: string[];
    changed?: string[];
    fixed?: string[];
  };
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.2.0",
    codename: "Quill",
    date: "2026-03-25",
    changes: {
      added: [
        "Command palette with file search (Cmd+K)",
        "In-page Find & Replace (Cmd+F / Cmd+H)",
        "Navigation history (back/forward)",
        "Resizable sidebar and outline panels",
        "Export to standalone HTML",
        "Breadcrumb bar with sibling navigation",
        "HugeIcons icon system",
        "Tooltips on toolbar buttons",
        "Smart tab sizing with compact modes",
        "Vitest test infrastructure",
      ],
      changed: [
        "Unified search with relevance scoring and flash highlight",
        "Batched editor state updates for smoother typing",
      ],
      fixed: [
        "Escape key handling in fullscreen mode",
        "File load flash highlight positioning",
      ],
    },
  },
  {
    version: "0.1.0",
    codename: "Genesis",
    date: "2026-03-24",
    changes: {
      added: [
        "TipTap-based WYSIWYG Markdown editor",
        "File open, save, save-as with native dialogs",
        "Sidebar file tree with workspace support",
        "Outline panel with heading navigation",
        "Settings panel (theme, font, size, width, background)",
        "Tab system for multiple open files",
        "macOS native window with overlay titlebar",
        "External file change detection",
        "Recent files list on welcome screen",
        "Print / PDF export via Cmd+P",
      ],
    },
  },
];
