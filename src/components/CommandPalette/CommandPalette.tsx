import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
} from "cmdk";
import type { FileNode } from "../../types";
import { flattenFileTree } from "../../utils/flattenFileTree";
import { HugeiconsIcon, File01Icon, StarIcon, TextAlignLeft01Icon } from "../Icons";
import "./CommandPalette.css";

interface SearchResult {
  file_path: string;
  file_name: string;
  line_number: number;
  line_text: string;
  match_start: number;
  match_end: number;
  result_type: string; // "file" or "content"
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenFile: (path: string, lineNumber?: number, searchQuery?: string, lineText?: string) => void;
  fileTree: FileNode[];
  recentFiles: string[];
  favorites: string[];
  workspacePath: string | null;
}

/** Extracts the filename from a full path */
function fileName(path: string): string {
  return path.split("/").pop() ?? path;
}

/** Renders a Notion-style breadcrumb: Folder1 › Folder2 › ... */
function BreadcrumbPath({
  path,
  workspacePath,
}: {
  path: string;
  workspacePath: string | null;
}) {
  let relative = path;
  if (workspacePath && path.startsWith(workspacePath)) {
    relative = path.slice(workspacePath.length + 1);
  }
  const parts = relative.split("/");
  const folders = parts.slice(0, -1); // exclude filename (shown separately)
  if (folders.length === 0) return null; // root-level file

  // Truncate middle for deep paths: First › ... › Last
  const display =
    folders.length >= 4
      ? [folders[0], "...", folders[folders.length - 1]]
      : folders;

  return (
    <span className="command-palette-breadcrumb">
      {display.map((seg, i) => (
        <span key={i}>
          {i > 0 && (
            <span className="command-palette-breadcrumb-sep">›</span>
          )}
          <span className="command-palette-breadcrumb-segment">{seg}</span>
        </span>
      ))}
    </span>
  );
}

/** Renders a line of text with the matching portion in bold */
function HighlightedSnippet({
  text,
  matchStart,
  matchEnd,
}: {
  text: string;
  matchStart: number;
  matchEnd: number;
}) {
  if (matchStart === 0 && matchEnd === 0) {
    return <span>{text}</span>;
  }
  const before = text.slice(0, matchStart);
  const match = text.slice(matchStart, matchEnd);
  const after = text.slice(matchEnd);
  return (
    <span>
      {before}
      <strong className="command-palette-match">{match}</strong>
      {after}
    </span>
  );
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
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Flatten file tree into searchable list
  const allFiles = useMemo(() => flattenFileTree(fileTree), [fileTree]);

  // When a file is selected
  const handleFileSelect = useCallback(
    (path: string, lineNumber?: number, searchQuery?: string, lineText?: string) => {
      onOpenFile(path, lineNumber, searchQuery, lineText);
      onClose();
    },
    [onOpenFile, onClose]
  );

  // Are we in "unified search" mode? (query >= 3 chars + workspace loaded)
  const isUnifiedSearch = query.length >= 3 && !!workspacePath;

  // Debounced unified search — triggers 300ms after user stops typing
  useEffect(() => {
    if (!open || query.length < 3 || !workspacePath) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const results = await invoke<SearchResult[]>("search_content", {
          query,
          workspacePath,
        });
        setSearchResults(results);
      } catch (e) {
        console.error("[search_content] error:", e);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [open, query, workspacePath]);

  // Focus input when opened, clear state when closed
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQuery("");
      setSearchResults([]);
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
        <Command className="command-palette" loop shouldFilter={!isUnifiedSearch}>
          <CommandInput
            ref={inputRef}
            placeholder="Search files and content..."
            className="command-palette-input"
            onValueChange={setQuery}
            value={query}
          />
          <CommandList className="command-palette-list">
            {/* ── Empty states ── */}
            {/* Browse mode: let cmdk handle empty state */}
            {!isUnifiedSearch && (
              <CommandEmpty className="command-palette-empty">
                No results found.
              </CommandEmpty>
            )}
            {/* Unified search: manual empty/loading states (cmdk can't track these) */}
            {isUnifiedSearch && isSearching && searchResults.length === 0 && (
              <CommandLoading className="command-palette-empty">Searching...</CommandLoading>
            )}
            {isUnifiedSearch && !isSearching && searchResults.length === 0 && (
              <div className="command-palette-empty">No results found.</div>
            )}

            {/* ── When NOT in unified search: show browse mode (recent, favorites, all files) ── */}
            {!isUnifiedSearch && (
              <>
                {recentFiles.length > 0 && (
                  <CommandGroup
                    heading="Recent Files"
                    className="command-palette-group"
                  >
                    {recentFiles.map((path) => (
                      <CommandItem
                        key={`recent-${path}`}
                        value={fileName(path)}
                        keywords={[path]}
                        onSelect={() => handleFileSelect(path)}
                        className="command-palette-item"
                      >
                        <span className="command-palette-item-icon">
                          <HugeiconsIcon icon={File01Icon} size={16} />
                        </span>
                        <div className="command-palette-item-content">
                          <span className="command-palette-item-name">
                            {fileName(path)}
                          </span>
                          <BreadcrumbPath path={path} workspacePath={workspacePath} />
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {favorites.length > 0 && (
                  <CommandGroup
                    heading="Favorites"
                    className="command-palette-group"
                  >
                    {favorites.map((path) => (
                      <CommandItem
                        key={`fav-${path}`}
                        value={fileName(path)}
                        keywords={[path]}
                        onSelect={() => handleFileSelect(path)}
                        className="command-palette-item"
                      >
                        <span className="command-palette-item-icon">
                          <HugeiconsIcon icon={StarIcon} size={16} />
                        </span>
                        <div className="command-palette-item-content">
                          <span className="command-palette-item-name">
                            {fileName(path)}
                          </span>
                          <BreadcrumbPath path={path} workspacePath={workspacePath} />
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {allFiles.length > 0 && (
                  <CommandGroup
                    heading="Files"
                    className="command-palette-group"
                  >
                    {allFiles.map((node) => (
                      <CommandItem
                        key={`file-${node.path}`}
                        value={node.name}
                        keywords={[node.path]}
                        onSelect={() => handleFileSelect(node.path)}
                        className="command-palette-item"
                      >
                        <span className="command-palette-item-icon">
                          <HugeiconsIcon icon={File01Icon} size={16} />
                        </span>
                        <div className="command-palette-item-content">
                          <span className="command-palette-item-name">
                            {node.name}
                          </span>
                          <BreadcrumbPath path={node.path} workspacePath={workspacePath} />
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}

            {/* ── Unified search results: ONE ranked list (files + content mixed) ── */}
            {isUnifiedSearch && searchResults.length > 0 && (
              <CommandGroup className="command-palette-group">
                {searchResults.map((result, idx) =>
                  result.result_type === "file" ? (
                    <CommandItem
                      key={`file-${result.file_path}-${idx}`}
                      value={`${result.file_name} ${result.file_path}`}
                      onSelect={() => handleFileSelect(result.file_path)}
                      className="command-palette-item"
                    >
                      <span className="command-palette-item-icon">
                        <HugeiconsIcon icon={File01Icon} size={16} />
                      </span>
                      <div className="command-palette-item-content">
                        <span className="command-palette-item-name">
                          {result.file_name}
                        </span>
                        <BreadcrumbPath path={result.file_path} workspacePath={workspacePath} />
                      </div>
                    </CommandItem>
                  ) : (
                    <CommandItem
                      key={`content-${result.file_path}-${result.line_number}-${idx}`}
                      value={`content ${result.file_name} ${result.line_text}`}
                      onSelect={() =>
                        handleFileSelect(
                          result.file_path,
                          result.line_number,
                          query,
                          result.line_text
                        )
                      }
                      className="command-palette-item command-palette-content-item"
                    >
                      <span className="command-palette-item-icon">
                        <HugeiconsIcon icon={TextAlignLeft01Icon} size={16} />
                      </span>
                      <div className="command-palette-item-content command-palette-content-layout">
                        <div className="command-palette-content-header">
                          <span className="command-palette-item-name">
                            {result.file_name}
                          </span>
                          <BreadcrumbPath
                            path={result.file_path}
                            workspacePath={workspacePath}
                          />
                        </div>
                        <span className="command-palette-snippet">
                          <HighlightedSnippet
                            text={result.line_text}
                            matchStart={result.match_start}
                            matchEnd={result.match_end}
                          />
                        </span>
                      </div>
                    </CommandItem>
                  )
                )}
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

