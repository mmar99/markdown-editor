import { useEffect, useMemo, useCallback, useRef } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "cmdk";
import type { FileNode } from "../../types";
import { flattenFileTree } from "../../utils/flattenFileTree";
import "./CommandPalette.css";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenFile: (path: string) => void;
  onToggleSidebar: () => void;
  onToggleOutline: () => void;
  onToggleSettings: () => void;
  onNewFile: () => void;
  onOpenFileDialog: () => void;
  onExport: (format: "pdf" | "html") => void;
  onPrint: () => void;
  onToggleTheme: () => void;
  fileTree: FileNode[];
  recentFiles: string[];
  favorites: string[];
  workspacePath: string | null;
}

/** Extracts the filename from a full path */
function fileName(path: string): string {
  return path.split("/").pop() ?? path;
}

/** Returns a shorter display path relative to workspace */
function displayPath(path: string, workspacePath: string | null): string {
  if (workspacePath && path.startsWith(workspacePath)) {
    return path.slice(workspacePath.length + 1);
  }
  // Fallback: show last 2 path segments
  const parts = path.split("/");
  if (parts.length <= 2) return path;
  return parts.slice(-2).join("/");
}

export function CommandPalette({
  open,
  onClose,
  onOpenFile,
  onToggleSidebar,
  onToggleOutline,
  onToggleSettings,
  onNewFile,
  onOpenFileDialog,
  onExport,
  onPrint,
  onToggleTheme,
  fileTree,
  recentFiles,
  favorites,
  workspacePath,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef("");

  // Flatten file tree into searchable list
  const allFiles = useMemo(() => flattenFileTree(fileTree), [fileTree]);

  // Track the current search value for conditional rendering
  const handleValueChange = useCallback((value: string) => {
    searchRef.current = value;
  }, []);

  // When a file is selected
  const handleFileSelect = useCallback(
    (path: string) => {
      onOpenFile(path);
      onClose();
    },
    [onOpenFile, onClose]
  );

  // When a command is selected
  const handleCommand = useCallback(
    (command: string) => {
      switch (command) {
        case "toggle-sidebar":
          onToggleSidebar();
          break;
        case "toggle-outline":
          onToggleOutline();
          break;
        case "toggle-settings":
          onToggleSettings();
          break;
        case "new-file":
          onNewFile();
          break;
        case "open-file":
          onOpenFileDialog();
          break;
        case "export-pdf":
          onExport("pdf");
          break;
        case "export-html":
          onExport("html");
          break;
        case "print":
          onPrint();
          break;
        case "toggle-theme":
          onToggleTheme();
          break;
      }
      onClose();
    },
    [
      onClose,
      onToggleSidebar,
      onToggleOutline,
      onToggleSettings,
      onNewFile,
      onOpenFileDialog,
      onExport,
      onPrint,
      onToggleTheme,
    ]
  );

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="command-palette-backdrop" onClick={onClose}>
      <div
        className="command-palette-container"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="command-palette" loop>
          <CommandInput
            ref={inputRef}
            placeholder="Search files or type > for commands..."
            className="command-palette-input"
            onValueChange={handleValueChange}
          />
          <CommandList className="command-palette-list">
            <CommandEmpty className="command-palette-empty">
              No results found.
            </CommandEmpty>

            {/* Recent Files — shown when there's a search query too (cmdk filters them) */}
            {recentFiles.length > 0 && (
              <CommandGroup
                heading="Recent Files"
                className="command-palette-group"
              >
                {recentFiles.map((path) => (
                  <CommandItem
                    key={`recent-${path}`}
                    value={`${fileName(path)} ${path}`}
                    onSelect={() => handleFileSelect(path)}
                    className="command-palette-item"
                  >
                    <span className="command-palette-item-icon">
                      <FileIcon />
                    </span>
                    <div className="command-palette-item-content">
                      <span className="command-palette-item-name">
                        {fileName(path)}
                      </span>
                      <span className="command-palette-item-path">
                        {displayPath(path, workspacePath)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Favorites */}
            {favorites.length > 0 && (
              <CommandGroup
                heading="Favorites"
                className="command-palette-group"
              >
                {favorites.map((path) => (
                  <CommandItem
                    key={`fav-${path}`}
                    value={`${fileName(path)} ${path}`}
                    onSelect={() => handleFileSelect(path)}
                    className="command-palette-item"
                  >
                    <span className="command-palette-item-icon">
                      <StarIcon />
                    </span>
                    <div className="command-palette-item-content">
                      <span className="command-palette-item-name">
                        {fileName(path)}
                      </span>
                      <span className="command-palette-item-path">
                        {displayPath(path, workspacePath)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* All workspace files */}
            {allFiles.length > 0 && (
              <CommandGroup
                heading="Files"
                className="command-palette-group"
              >
                {allFiles.map((node) => (
                  <CommandItem
                    key={`file-${node.path}`}
                    value={`${node.name} ${node.path}`}
                    onSelect={() => handleFileSelect(node.path)}
                    className="command-palette-item"
                  >
                    <span className="command-palette-item-icon">
                      <FileIcon />
                    </span>
                    <div className="command-palette-item-content">
                      <span className="command-palette-item-name">
                        {node.name}
                      </span>
                      <span className="command-palette-item-path">
                        {displayPath(node.path, workspacePath)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator className="command-palette-separator" />

            {/* Commands */}
            <CommandGroup heading="Commands" className="command-palette-group">
              <CommandItem
                value="Toggle Sidebar"
                onSelect={() => handleCommand("toggle-sidebar")}
                className="command-palette-item"
              >
                <span className="command-palette-item-icon">
                  <CommandIcon />
                </span>
                <div className="command-palette-item-content">
                  <span className="command-palette-item-name">
                    Toggle Sidebar
                  </span>
                </div>
                <kbd className="command-palette-shortcut">
                  <span>Cmd</span>
                  <span>\</span>
                </kbd>
              </CommandItem>

              <CommandItem
                value="Toggle Outline"
                onSelect={() => handleCommand("toggle-outline")}
                className="command-palette-item"
              >
                <span className="command-palette-item-icon">
                  <CommandIcon />
                </span>
                <div className="command-palette-item-content">
                  <span className="command-palette-item-name">
                    Toggle Outline
                  </span>
                </div>
              </CommandItem>

              <CommandItem
                value="Toggle Dark Mode"
                onSelect={() => handleCommand("toggle-theme")}
                className="command-palette-item"
              >
                <span className="command-palette-item-icon">
                  <CommandIcon />
                </span>
                <div className="command-palette-item-content">
                  <span className="command-palette-item-name">
                    Toggle Dark Mode
                  </span>
                </div>
              </CommandItem>

              <CommandItem
                value="New File"
                onSelect={() => handleCommand("new-file")}
                className="command-palette-item"
              >
                <span className="command-palette-item-icon">
                  <CommandIcon />
                </span>
                <div className="command-palette-item-content">
                  <span className="command-palette-item-name">New File</span>
                </div>
                <kbd className="command-palette-shortcut">
                  <span>Cmd</span>
                  <span>N</span>
                </kbd>
              </CommandItem>

              <CommandItem
                value="Open File"
                onSelect={() => handleCommand("open-file")}
                className="command-palette-item"
              >
                <span className="command-palette-item-icon">
                  <CommandIcon />
                </span>
                <div className="command-palette-item-content">
                  <span className="command-palette-item-name">Open File</span>
                </div>
                <kbd className="command-palette-shortcut">
                  <span>Cmd</span>
                  <span>O</span>
                </kbd>
              </CommandItem>

              <CommandItem
                value="Open Settings"
                onSelect={() => handleCommand("toggle-settings")}
                className="command-palette-item"
              >
                <span className="command-palette-item-icon">
                  <CommandIcon />
                </span>
                <div className="command-palette-item-content">
                  <span className="command-palette-item-name">
                    Open Settings
                  </span>
                </div>
                <kbd className="command-palette-shortcut">
                  <span>Cmd</span>
                  <span>,</span>
                </kbd>
              </CommandItem>

              <CommandItem
                value="Export to PDF"
                onSelect={() => handleCommand("export-pdf")}
                className="command-palette-item"
              >
                <span className="command-palette-item-icon">
                  <CommandIcon />
                </span>
                <div className="command-palette-item-content">
                  <span className="command-palette-item-name">
                    Export to PDF
                  </span>
                </div>
              </CommandItem>

              <CommandItem
                value="Export to HTML"
                onSelect={() => handleCommand("export-html")}
                className="command-palette-item"
              >
                <span className="command-palette-item-icon">
                  <CommandIcon />
                </span>
                <div className="command-palette-item-content">
                  <span className="command-palette-item-name">
                    Export to HTML
                  </span>
                </div>
              </CommandItem>

              <CommandItem
                value="Print"
                onSelect={() => handleCommand("print")}
                className="command-palette-item"
              >
                <span className="command-palette-item-icon">
                  <CommandIcon />
                </span>
                <div className="command-palette-item-content">
                  <span className="command-palette-item-name">Print</span>
                </div>
                <kbd className="command-palette-shortcut">
                  <span>Cmd</span>
                  <span>P</span>
                </kbd>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  );
}

/* Inline SVG icons — small, no extra deps */

function FileIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5.5L9 1.5z" />
      <path d="M9 1.5V5.5H13" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      stroke="none"
    >
      <path d="M8 1.5l1.76 3.57 3.94.57-2.85 2.78.67 3.93L8 10.42l-3.52 1.93.67-3.93L2.3 5.64l3.94-.57L8 1.5z" />
    </svg>
  );
}

function CommandIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 3l3 3-6 6H4v-3l6-6z" />
    </svg>
  );
}
