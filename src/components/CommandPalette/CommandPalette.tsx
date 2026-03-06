import { useEffect, useMemo, useCallback, useRef } from "react";
// cmdk handles fuzzy filtering automatically
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk";
import type { FileNode } from "../../types";
import { flattenFileTree } from "../../utils/flattenFileTree";
import "./CommandPalette.css";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenFile: (path: string) => void;
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
  fileTree,
  recentFiles,
  favorites,
  workspacePath,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten file tree into searchable list
  const allFiles = useMemo(() => flattenFileTree(fileTree), [fileTree]);

  // When a file is selected
  const handleFileSelect = useCallback(
    (path: string) => {
      onOpenFile(path);
      onClose();
    },
    [onOpenFile, onClose]
  );

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  // Capture Escape before macOS full-screen handler intercepts it
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    // "capture: true" means this runs BEFORE other handlers (including macOS full-screen)
    document.addEventListener("keydown", handleEscape, true);
    return () => document.removeEventListener("keydown", handleEscape, true);
  }, [open, onClose]);

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
            placeholder="Search files..."
            className="command-palette-input"
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

          </CommandList>

          {/* Footer bar — Slack-style hints */}
          <div className="command-palette-footer">
            <span className="command-palette-footer-hint">
              <kbd>↑</kbd><kbd>↓</kbd> Select
            </span>
            <span className="command-palette-footer-hint">
              <kbd>Enter</kbd> Open
            </span>
            <span className="command-palette-footer-hint">
              <kbd>Esc</kbd> Close
            </span>
          </div>
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

