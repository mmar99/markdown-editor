import { useEffect, useCallback, useMemo, useRef, useState, startTransition } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { editorExtensions } from "./components/Editor/extensions";
import { useAppState, useAppDispatch } from "./stores/AppContext";
import { useFileSystem } from "./hooks/useFileSystem";
import { useRecentFiles } from "./hooks/useRecentFiles";
import { useFileOpen } from "./hooks/useFileOpen";
import { useSession } from "./hooks/useSession";
import { useFileWatcher } from "./hooks/useFileWatcher";
import { useWorkspace } from "./hooks/useWorkspace";
import { FileChangedBanner } from "./components/Banner/FileChangedBanner";
import { TabBar } from "./components/TabBar/TabBar";
import { BreadcrumbBar } from "./components/BreadcrumbBar/BreadcrumbBar";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { OutlinePanel } from "./components/Sidebar/OutlinePanel";
import { WelcomeScreen } from "./components/WelcomeScreen/WelcomeScreen";
import { SettingsPanel } from "./components/Settings/SettingsPanel";
import { CommandPalette } from "./components/CommandPalette/CommandPalette";
import { FindReplace } from "./components/FindReplace/FindReplace";
import {
  HugeiconsIcon,
  SidebarLeftIcon,
  SidebarRightIcon,
} from "./components/Icons";
import { Tooltip } from "./components/Tooltip/Tooltip";
import { buildExportDocumentHtml } from "./utils/exportDocument";
import "./components/Editor/editor.css";

let hasContent = false;

function getEditorTitle(editor: Editor): string {
  let h1 = "";
  editor.state.doc.descendants((node) => {
    if (!h1 && node.type.name === "heading" && node.attrs.level === 1) {
      h1 = node.textContent.trim();
    }
  });
  return h1;
}

function App() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { openFile, saveFile, saveFileAs, openFileByPath } = useFileSystem();
  const { loadRecentFiles, addRecentFile } = useRecentFiles();

  // Pending flash: set before openFileByPath, consumed after setContent loads new file
  const pendingFlash = useRef<{ searchQuery: string; lineText?: string } | null>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  // Navigation history — prevent double-push when jumping back/forward
  const isNavJumping = useRef(false);
  const prevNavHistoryIndex = useRef(state.navHistoryIndex);
  // Resizable panels
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [outlineWidth, setOutlineWidth] = useState(220);
  // Suppresses onUpdate during file load to prevent false isDirty
  const suppressOnUpdate = useRef(false);
  const pendingSyncFrame = useRef<number | null>(null);

  useSession();
  useFileOpen();

  const editor = useEditor({
    extensions: editorExtensions,
    content: "",
    contentType: "markdown",
    onUpdate: ({ editor }) => {
      if (suppressOnUpdate.current) return;
      if (pendingSyncFrame.current !== null) return;
      pendingSyncFrame.current = requestAnimationFrame(() => {
        pendingSyncFrame.current = null;
        const markdown = editor.getMarkdown();
        const title = getEditorTitle(editor);
        const tabIndex = state.activeTabIndex;

        startTransition(() => {
          dispatch({ type: "UPDATE_CONTENT", content: markdown });
          dispatch({ type: "UPDATE_TAB_TITLE", index: tabIndex, title });
        });
      });
    },
    editorProps: { attributes: { class: "editor-content-area" } },
  });

  // Watch for external file changes + Cmd+R refresh (also refreshes tree on focus)
  const { externalChangeDetected, reload, keepMine, keepBoth, dismiss, refreshFile } = useFileWatcher(
    () => editor?.getMarkdown() ?? state.currentContent,
  );
  const { refreshTree } = useWorkspace();

  const syncEditorState = useCallback((editorInstance: Editor | null, tabIndex: number) => {
    if (!editorInstance) return "";

    if (pendingSyncFrame.current !== null) {
      cancelAnimationFrame(pendingSyncFrame.current);
      pendingSyncFrame.current = null;
    }

    const markdown = editorInstance.getMarkdown();
    const title = getEditorTitle(editorInstance);

    startTransition(() => {
      dispatch({ type: "UPDATE_CONTENT", content: markdown });
      dispatch({ type: "UPDATE_TAB_TITLE", index: tabIndex, title });
    });

    return markdown;
  }, [dispatch]);

  useEffect(() => { loadRecentFiles(); }, []); // eslint-disable-line

  useEffect(() => () => {
    if (pendingSyncFrame.current !== null) cancelAnimationFrame(pendingSyncFrame.current);
  }, []);

  // Load content when fileVersion changes (new file opened)
  useEffect(() => {
    if (!editor || state.fileVersion === 0) return;
    hasContent = true;
    suppressOnUpdate.current = true;
    editor.commands.setContent(state.originalContent, { contentType: "markdown" });
    suppressOnUpdate.current = false;
    syncEditorState(editor, state.activeTabIndex);
    // Push to navigation history (skip when jumping back/forward)
    if (!isNavJumping.current && state.currentFilePath) {
      dispatch({ type: "NAV_PUSH", path: state.currentFilePath });
    }
    isNavJumping.current = false;

    // Fire pending flash after new content is loaded
    const flash = pendingFlash.current;
    if (flash) {
      pendingFlash.current = null;
      setTimeout(() => {
        const docText = editor.state.doc.textContent;
        const queryLower = flash.searchQuery.toLowerCase();

        // Use lineText (stripped markdown line from Rust) to find the exact block.
        // Strip leading/trailing "..." truncation markers, then take a 40-char fingerprint.
        const fingerprint = (flash.lineText ?? "")
          .replace(/^\.{3}/, "").replace(/\.{3}$/, "").trim().slice(0, 40).toLowerCase();

        // Find where the fingerprint (or the query itself as fallback) sits in docText.
        const anchorIdx = fingerprint.length >= 8
          ? docText.toLowerCase().indexOf(fingerprint)
          : docText.toLowerCase().indexOf(queryLower);

        if (anchorIdx === -1) return;

        // From the anchor, find the query match position
        const matchIdx = docText.toLowerCase().indexOf(queryLower, anchorIdx);
        if (matchIdx === -1) return;

        // Walk ProseMirror text nodes to convert char offset → doc position
        let textOffset = 0;
        let found = false;
        editor.state.doc.descendants((node, pos) => {
          if (found || !node.isText) return !found;
          const nodeLen = node.text!.length;
          if (textOffset + nodeLen > matchIdx) {
            const from = pos + (matchIdx - textOffset);
            const to = from + queryLower.length;
            editor.commands.setTextSelection({ from, to });
            // Center the matched text in the viewport via DOM API
            requestAnimationFrame(() => {
              try {
                const domPos = editor.view.domAtPos(from);
                const el = (domPos.node instanceof Element
                  ? domPos.node
                  : domPos.node.parentElement) as HTMLElement | null;
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
              } catch { /* ignore if pos is stale */ }
            });
            (editor.commands as any).flashSearchResult(from, to);
            found = true;
            return false;
          }
          textOffset += nodeLen;
          return !found;
        });
      }, 80);
    }
  }, [editor, state.fileVersion]); // eslint-disable-line

  // When switching tabs, load the tab's file + close find/replace
  useEffect(() => {
    if (state.activeTabIndex < 0 || state.activeTabIndex >= state.openTabs.length) return;
    const tab = state.openTabs[state.activeTabIndex];
    if (tab && tab.path !== state.currentFilePath) {
      if (state.findReplaceOpen) dispatch({ type: "CLOSE_FIND_REPLACE" });
      openFileByPath(tab.path).then((ok) => { if (ok) addRecentFile(tab.path); });
    }
  }, [state.activeTabIndex]); // eslint-disable-line

  // Back/Forward navigation — open file when navHistoryIndex changes externally
  useEffect(() => {
    if (state.navHistoryIndex === prevNavHistoryIndex.current) return;
    prevNavHistoryIndex.current = state.navHistoryIndex;
    const path = state.navHistory[state.navHistoryIndex];
    if (path && path !== state.currentFilePath) {
      isNavJumping.current = true;
      openFileByPath(path).then((ok) => { if (ok) addRecentFile(path); });
    }
  }, [state.navHistoryIndex]); // eslint-disable-line

  // Resize handlers for sidebar and outline panels
  const startSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    document.body.style.cursor = "col-resize";
    const onMove = (ev: MouseEvent) => {
      setSidebarWidth(Math.max(150, Math.min(480, startWidth + ev.clientX - startX)));
    };
    const onUp = () => {
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [sidebarWidth]);

  const startOutlineResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = outlineWidth;
    document.body.style.cursor = "col-resize";
    const onMove = (ev: MouseEvent) => {
      setOutlineWidth(Math.max(150, Math.min(480, startWidth - (ev.clientX - startX))));
    };
    const onUp = () => {
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [outlineWidth]);

  // Sibling navigation info (for breadcrumb arrows)
  const siblingInfo = useMemo(() => {
    if (!state.currentFilePath || !state.fileTree.length) return null;
    // Find siblings in same folder
    const dir = state.currentFilePath.substring(0, state.currentFilePath.lastIndexOf("/"));
    const allFiles: string[] = [];
    function collect(nodes: typeof state.fileTree) {
      for (const n of nodes) {
        if (n.isDirectory && n.children) collect(n.children);
        else if (n.path.substring(0, n.path.lastIndexOf("/")) === dir) allFiles.push(n.path);
      }
    }
    collect(state.fileTree);
    const idx = allFiles.indexOf(state.currentFilePath);
    if (idx < 0) return null;
    return { current: idx + 1, total: allFiles.length, files: allFiles, index: idx };
  }, [state.currentFilePath, state.fileTree]);

  const handleNavigate = useCallback((dir: "prev" | "next") => {
    if (!siblingInfo) return;
    const newIdx = dir === "prev"
      ? (siblingInfo.index - 1 + siblingInfo.total) % siblingInfo.total
      : (siblingInfo.index + 1) % siblingInfo.total;
    const path = siblingInfo.files[newIdx];
    openFileByPath(path).then((ok) => { if (ok) addRecentFile(path); });
  }, [siblingInfo, openFileByPath, addRecentFile]);

  // Universal HTML template for both PDF export (Chrome headless) and Print (Cmd+P)
  // Same output regardless of method — consistent formatting
  const buildExportHtml = useCallback(() => {
    if (!editor) return "";
    const html = editor.getHTML();
    const title = getEditorTitle(editor) || "Document";
    return buildExportDocumentHtml(title, html);
  }, [editor]);

  // Get a smart export filename from the document's first H1
  const getExportName = useCallback(() => {
    if (!editor) return "document";
    let title = "";
    editor.state.doc.descendants((node) => {
      if (!title && node.type.name === "heading" && node.attrs.level === 1) {
        title = node.textContent.trim();
      }
    });
    if (title) return title;
    return state.currentFilePath?.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "document";
  }, [editor, state.currentFilePath]);

  // Export handler
  const handleExport = useCallback(async (format: "pdf" | "html") => {
    if (!editor) return;

    if (format === "html") {
      const { save: saveDlg } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const name = getExportName();
      const path = await saveDlg({ filters: [{ name: "HTML", extensions: ["html"] }], defaultPath: `${name}.html` });
      if (!path) return;
      await writeTextFile(path, buildExportHtml());
    } else if (format === "pdf") {
      const { save: saveDlg } = await import("@tauri-apps/plugin-dialog");
      const name = getExportName();
      const path = await saveDlg({ filters: [{ name: "PDF", extensions: ["pdf"] }], defaultPath: `${name}.pdf` });
      if (!path) return;
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("export_pdf", { html: buildExportHtml(), outputPath: path });
    }
  }, [editor, buildExportHtml, getExportName]);

  // Print — native macOS print sheet (Tauri overrides window.print())
  const handlePrint = useCallback(() => {
    if (!editor) return;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";

    const cleanup = () => {
      iframe.remove();
    };

    iframe.onload = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        cleanup();
        window.print();
        return;
      }

      frameWindow.addEventListener("afterprint", cleanup, { once: true });
      frameWindow.focus();

      try {
        frameWindow.print();
      } catch {
        cleanup();
        window.print();
        return;
      }

      window.setTimeout(cleanup, 60000);
    };

    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (!doc) {
      cleanup();
      window.print();
      return;
    }
    doc.open();
    doc.write(buildExportHtml());
    doc.close();
  }, [editor, buildExportHtml]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    // Ctrl+PageUp/PageDown — navigate tabs (Chrome/Linear standard)
    if (e.ctrlKey && e.key === "PageUp") {
      e.preventDefault();
      const prev = Math.max(0, state.activeTabIndex - 1);
      dispatch({ type: "SWITCH_TAB", index: prev });
      return;
    }
    if (e.ctrlKey && e.key === "PageDown") {
      e.preventDefault();
      const next = Math.min(state.openTabs.length - 1, state.activeTabIndex + 1);
      dispatch({ type: "SWITCH_TAB", index: next });
      return;
    }
    if (!e.metaKey) return;
    // Command palette
    if (e.key === "k") {
      e.preventDefault();
      dispatch({ type: state.commandPaletteOpen ? "CLOSE_COMMAND_PALETTE" : "OPEN_COMMAND_PALETTE" });
      return;
    }
    // Find & Replace
    if (e.key === "f") {
      e.preventDefault();
      if (state.findReplaceOpen) {
        // Already open → refocus the search input
        document.querySelector<HTMLInputElement>(".find-replace-input")?.focus();
      } else {
        dispatch({ type: "OPEN_FIND_REPLACE" });
      }
      return;
    }
    switch (e.key) {
      case "o": {
        e.preventDefault();
        const path = await openFile();
        if (path) { addRecentFile(path); hasContent = true; }
        break;
      }
      case "s": {
        e.preventDefault();
        const liveContent = syncEditorState(editor, state.activeTabIndex) || state.currentContent;
        if (e.shiftKey) {
          const path = await saveFileAs(liveContent);
          if (path) addRecentFile(path);
        } else if (state.currentFilePath) {
          await saveFile(state.currentFilePath, liveContent);
        } else {
          const path = await saveFileAs(liveContent);
          if (path) addRecentFile(path);
        }
        break;
      }
      case "w": { e.preventDefault(); if (state.activeTabIndex >= 0) dispatch({ type: "CLOSE_TAB", index: state.activeTabIndex }); break; }
      case "n":
      case "t": { e.preventDefault(); dispatch({ type: "NEW_FILE" }); editor?.commands.setContent("", { contentType: "markdown" }); hasContent = true; dispatch({ type: "OPEN_COMMAND_PALETTE" }); break; }
      case "r": { e.preventDefault(); refreshFile(); if (state.workspacePath) refreshTree(state.workspacePath); break; }
      case "p": { e.preventDefault(); handlePrint(); break; }
      case "\\": { e.preventDefault(); dispatch({ type: "TOGGLE_SIDEBAR" }); break; }
      case ",": { e.preventDefault(); dispatch({ type: "TOGGLE_SETTINGS" }); break; }
      case "[": {
        if (e.shiftKey) {
          e.preventDefault();
          const prev = Math.max(0, state.activeTabIndex - 1);
          dispatch({ type: "SWITCH_TAB", index: prev });
        }
        break;
      }
      case "]": {
        if (e.shiftKey) {
          e.preventDefault();
          const next = Math.min(state.openTabs.length - 1, state.activeTabIndex + 1);
          dispatch({ type: "SWITCH_TAB", index: next });
        }
        break;
      }
      case "1": case "2": case "3": case "4": case "5": case "6": {
        e.preventDefault();
        editor?.chain().focus().toggleHeading({ level: parseInt(e.key) as 1|2|3|4|5|6 }).run();
        break;
      }
      case "0": { e.preventDefault(); editor?.chain().focus().setParagraph().run(); break; }
    }
  }, [editor, state.currentFilePath, state.currentContent, state.activeTabIndex, state.openTabs.length, state.commandPaletteOpen, state.findReplaceOpen, dispatch, openFile, saveFile, saveFileAs, addRecentFile, refreshFile, handlePrint]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const showWelcome = state.currentFilePath === null && !hasContent && !state.currentContent;

  const handleBubble = (action: string) => {
    if (!editor) return;
    const c = editor.chain().focus();
    switch (action) {
      case "bold": c.toggleBold().run(); break;
      case "italic": c.toggleItalic().run(); break;
      case "strike": c.toggleStrike().run(); break;
      case "underline": c.toggleUnderline().run(); break;
      case "code": c.toggleCode().run(); break;
      case "highlight": c.toggleHighlight().run(); break;
      case "link": {
        const prev = editor.getAttributes("link").href;
        const url = window.prompt("URL", prev);
        if (url === null) return;
        if (url === "") c.unsetLink().run(); else c.setLink({ href: url }).run();
        break;
      }
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", backgroundColor: "var(--color-bg-sidebar)" }}>
      {/* Left sidebar (gray) — full height */}
      <div
        style={{
          width: state.sidebarOpen ? `${sidebarWidth + 4}px` : "0px",
          minWidth: 0,
          flexShrink: 0,
          overflow: "hidden",
          transition: `width var(--speed-regular) var(--ease-out-quart)`,
        }}
      >
        <div
          style={{
            width: `${sidebarWidth + 4}px`,
            height: "100%",
            display: "flex",
            transform: state.sidebarOpen ? "translateX(0)" : "translateX(-12px)",
            opacity: state.sidebarOpen ? 1 : 0,
            pointerEvents: state.sidebarOpen ? "auto" : "none",
            transition: `transform var(--speed-regular) var(--ease-out-quart), opacity var(--speed-quick) var(--ease-out-cubic)`,
          }}
        >
          <Sidebar width={sidebarWidth} />
          <div
            onMouseDown={state.sidebarOpen ? startSidebarResize : undefined}
            style={{
              width: "4px", flexShrink: 0, cursor: state.sidebarOpen ? "col-resize" : "default",
              background: "transparent", transition: `background var(--speed-quick) var(--ease-out-cubic)`,
            }}
            onMouseEnter={(e) => { if (state.sidebarOpen) e.currentTarget.style.background = "var(--color-border-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          />
        </div>
      </div>

      {/* Main content area (tabs + breadcrumb + editor) */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Draggable title area for macOS */}
        <div
          data-tauri-drag-region
          style={{
            height: "38px", flexShrink: 0, display: "flex", alignItems: "flex-end",
            paddingLeft: state.sidebarOpen ? "0" : "78px",
          }}
        >
          {/* Sidebar toggle — always visible (hides when sidebar is open since sidebar has its own) */}
          {!state.sidebarOpen && (
            <PanelToggleBtn onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })} title="Show sidebar" shortcut="⌘\\">
              <HugeiconsIcon icon={SidebarLeftIcon} size={14} strokeWidth={1.2} />
            </PanelToggleBtn>
          )}

          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            <TabBar />
          </div>

          {/* Outline toggle */}
          <PanelToggleBtn onClick={() => dispatch({ type: "TOGGLE_OUTLINE" })} title="Toggle outline">
            <HugeiconsIcon icon={SidebarRightIcon} size={14} strokeWidth={1.2} />
          </PanelToggleBtn>
        </div>

        {/* Breadcrumb bar (white) */}
        {!showWelcome && (
          <BreadcrumbBar
            onNavigate={handleNavigate}
            onExport={handleExport}
            onPrint={handlePrint}
            siblingInfo={siblingInfo ? { current: siblingInfo.current, total: siblingInfo.total } : null}
          />
        )}

        {/* Editor (white bg) */}
        {showWelcome ? (
          <WelcomeScreen />
        ) : (
            /* Wrapper with position:relative so FindReplace stays sticky (not inside scrollable) */
            <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Find & Replace — outside scrollable area, anchored to top-right */}
              <FindReplace
                editor={editor}
                open={state.findReplaceOpen}
                onClose={() => dispatch({ type: "CLOSE_FIND_REPLACE" })}
              />

              <div
                ref={editorWrapperRef}
                className="editor-wrapper"
                style={{
                  flex: 1,
                  overflow: "auto",
                  backgroundColor: state.settings.bgColor !== "default" ? state.settings.bgColor : "var(--color-bg-primary)",
                }}
              >
              <style>{`
                .editor-content-area {
                  font-family: ${state.settings.fontFamily === "system" ? "var(--font-regular)" : state.settings.fontFamily};
                  font-size: ${state.settings.fontSize}px;
                  max-width: ${state.settings.editorWidth}px;
                }
              `}</style>
              {editor && (
                <BubbleMenu editor={editor} className="bubble-menu">
                  <button onClick={() => handleBubble("bold")} className={editor.isActive("bold") ? "is-active" : ""}>B</button>
                  <button onClick={() => handleBubble("italic")} className={editor.isActive("italic") ? "is-active" : ""}><em>I</em></button>
                  <button onClick={() => handleBubble("underline")} className={editor.isActive("underline") ? "is-active" : ""} style={{ textDecoration: "underline" }}>U</button>
                  <button onClick={() => handleBubble("strike")} className={editor.isActive("strike") ? "is-active" : ""} style={{ textDecoration: "line-through" }}>S</button>
                  <button onClick={() => handleBubble("code")} className={editor.isActive("code") ? "is-active" : ""}>{"<>"}</button>
                  <button onClick={() => handleBubble("highlight")} className={editor.isActive("highlight") ? "is-active" : ""}>H</button>
                  <button onClick={() => handleBubble("link")} className={editor.isActive("link") ? "is-active" : ""}>🔗</button>
                </BubbleMenu>
              )}

              <EditorContent editor={editor} />

              {/* External change banner */}
              {externalChangeDetected && (
                <FileChangedBanner
                  isDirty={state.isDirty}
                  onReload={reload}
                  onKeepMine={keepMine}
                  onKeepBoth={keepBoth}
                  onDismiss={dismiss}
                />
              )}
            </div>
            </div>
          )}
        </div>

      {/* Right outline panel (gray) */}
      {!showWelcome && (
        <div
          style={{
            width: state.outlineOpen ? `${outlineWidth + 4}px` : "0px",
            minWidth: 0,
            flexShrink: 0,
            overflow: "hidden",
            transition: `width var(--speed-regular) var(--ease-out-quart)`,
          }}
        >
          <div
            style={{
              width: `${outlineWidth + 4}px`,
              height: "100%",
              display: "flex",
              transform: state.outlineOpen ? "translateX(0)" : "translateX(12px)",
              opacity: state.outlineOpen ? 1 : 0,
              pointerEvents: state.outlineOpen ? "auto" : "none",
              transition: `transform var(--speed-regular) var(--ease-out-quart), opacity var(--speed-quick) var(--ease-out-cubic)`,
            }}
          >
            <div
              onMouseDown={state.outlineOpen ? startOutlineResize : undefined}
              style={{
                width: "4px", flexShrink: 0, cursor: state.outlineOpen ? "col-resize" : "default",
                background: "transparent", transition: `background var(--speed-quick) var(--ease-out-cubic)`,
              }}
              onMouseEnter={(e) => { if (state.outlineOpen) e.currentTarget.style.background = "var(--color-border-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            />
            <div style={{
              width: `${outlineWidth}px`,
              minWidth: "150px",
              height: "100%",
              backgroundColor: "var(--color-bg-sidebar)",
              borderLeft: "1px solid var(--color-border-primary)",
              flexShrink: 0,
              overflow: "auto",
            }}>
              <OutlinePanel editor={editor} scrollContainer={editorWrapperRef} />
            </div>
          </div>
        </div>
      )}

      {/* Settings overlay */}
      <SettingsPanel />

      {/* Command palette overlay */}
      <CommandPalette
        open={state.commandPaletteOpen}
        onClose={() => dispatch({ type: "CLOSE_COMMAND_PALETTE" })}
        onOpenFile={(path, _lineNumber, searchQuery, lineText) => {
          if (searchQuery) {
            pendingFlash.current = { searchQuery, lineText };
          }
          openFileByPath(path).then((ok) => {
            if (ok) addRecentFile(path);
          });
        }}
        fileTree={state.fileTree}
        recentFiles={state.recentFiles}
        favorites={state.favorites}
        workspacePath={state.workspacePath}
      />
    </div>
  );
}

function PanelToggleBtn({
  children,
  onClick,
  title,
  shortcut,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  shortcut?: string | string[];
}) {
  const button = (
    <button
      onClick={onClick}
      aria-label={title}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "24px",
        height: "24px",
        background: "transparent",
        border: "none",
        cursor: "default",
        color: "var(--color-text-quaternary)",
        padding: 0,
        marginBottom: "6px",
        marginLeft: "4px",
        borderRadius: "var(--radius-sm)",
        lineHeight: 1,
        flexShrink: 0,
        transition: `color var(--speed-quick) var(--ease-out-cubic), background var(--speed-quick) var(--ease-out-cubic)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--color-text-secondary)";
        e.currentTarget.style.background = "var(--color-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--color-text-quaternary)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
  );

  return (
    <Tooltip content={title} shortcut={shortcut} disabled={!title}>
      {button}
    </Tooltip>
  );
}

export default App;
