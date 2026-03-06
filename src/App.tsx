import { useEffect, useCallback, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
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
import "./components/Editor/editor.css";

let hasContent = false;

function App() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { openFile, saveFile, saveFileAs, openFileByPath } = useFileSystem();
  const { loadRecentFiles, addRecentFile } = useRecentFiles();

  useSession();
  useFileOpen();

  const editor = useEditor({
    extensions: editorExtensions,
    content: "",
    contentType: "markdown",
    onUpdate: ({ editor }) => {
      dispatch({ type: "UPDATE_CONTENT", content: editor.getMarkdown() });
    },
    editorProps: { attributes: { class: "editor-content-area" } },
  });

  // Watch for external file changes + Cmd+R refresh (also refreshes tree on focus)
  const { externalChangeDetected, reload, keepMine, keepBoth, dismiss, refreshFile } = useFileWatcher();
  const { refreshTree } = useWorkspace();

  useEffect(() => { loadRecentFiles(); }, []); // eslint-disable-line

  // Load content when fileVersion changes (new file opened)
  useEffect(() => {
    if (!editor || state.fileVersion === 0) return;
    hasContent = true;
    editor.commands.setContent(state.originalContent, { contentType: "markdown" });
  }, [editor, state.fileVersion]); // eslint-disable-line

  // When switching tabs, load the tab's file
  useEffect(() => {
    if (state.activeTabIndex < 0 || state.activeTabIndex >= state.openTabs.length) return;
    const tab = state.openTabs[state.activeTabIndex];
    if (tab && tab.path !== state.currentFilePath) {
      openFileByPath(tab.path).then((ok) => { if (ok) addRecentFile(tab.path); });
    }
  }, [state.activeTabIndex]); // eslint-disable-line

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
    const title = (() => {
      let t = "";
      editor.state.doc.descendants((node) => {
        if (!t && node.type.name === "heading" && node.attrs.level === 1) t = node.textContent.trim();
      });
      return t || "Document";
    })();
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
/* === Base === */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
  font-size: 10pt;
  line-height: 1.55;
  color: #1b1b1b;
  max-width: 100%;
  margin: 0;
  padding: 0;
}

/* === Page setup — no headers/footers, clean margins === */
@page {
  margin: 2cm 2.5cm;
  @top-left { content: none; }
  @top-right { content: none; }
  @bottom-left { content: none; }
  @bottom-right { content: counter(page); font-size: 8pt; color: #9b9b9d; }
}

/* === Headings === */
h1 { font-size: 18pt; font-weight: 700; margin: 0 0 6pt 0; line-height: 1.2; }
h2 { font-size: 14pt; font-weight: 600; margin: 18pt 0 4pt 0; line-height: 1.25; }
h3 { font-size: 11pt; font-weight: 600; margin: 14pt 0 3pt 0; }
h4, h5, h6 { font-size: 10pt; font-weight: 600; margin: 10pt 0 2pt 0; }
h5, h6 { color: #5b5c5d; }

/* === Paragraphs === */
p { margin: 0 0 6pt 0; orphans: 3; widows: 3; }

/* === Bold, italic, etc === */
strong { font-weight: 700; }
em { font-style: italic; }
u { text-decoration: underline; text-underline-offset: 2px; }
s { text-decoration: line-through; color: #5b5c5d; }

/* === Links === */
a { color: #5e6ad2; text-decoration: none; }

/* === Inline code === */
code {
  font-family: "SF Mono", "Menlo", Consolas, monospace;
  font-size: 8.5pt;
  background: #f3f4f6;
  padding: 1px 4px;
  border-radius: 3px;
}

/* === Code blocks === */
pre {
  font-family: "SF Mono", "Menlo", Consolas, monospace;
  font-size: 8pt;
  line-height: 1.5;
  background: #f7f7f7;
  border: 1px solid #eeeeee;
  border-radius: 4px;
  padding: 8pt 10pt;
  margin: 8pt 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  page-break-inside: avoid;
}
pre code { background: none; padding: 0; font-size: inherit; }

/* === Blockquotes === */
blockquote {
  border-left: 2.5px solid #5e6ad2;
  padding: 4pt 10pt;
  margin: 8pt 0;
  background: #f8f8f8;
  color: #2f2f31;
}
blockquote p { margin: 0 0 3pt 0; }

/* === Lists === */
ul, ol { margin: 4pt 0; padding-left: 18pt; }
li { margin-bottom: 2pt; }
li p { margin: 0 0 2pt 0; }

/* === Task lists (checkboxes) === */
ul[data-type="taskList"] { list-style: none; padding-left: 0; }
ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 3pt;
}
ul[data-type="taskList"] li > label { flex-shrink: 0; margin-top: 1px; }
ul[data-type="taskList"] li > label input[type="checkbox"] {
  width: 10px; height: 10px;
  margin: 0;
  accent-color: #5e6ad2;
}
ul[data-type="taskList"] li > div { flex: 1; }
ul[data-type="taskList"] li[data-checked="true"] > div {
  text-decoration: line-through;
  color: #9b9b9d;
}

/* === Tables === */
table {
  border-collapse: collapse;
  width: 100%;
  margin: 8pt 0;
  font-size: 9pt;
  page-break-inside: avoid;
}
th, td {
  border: 1px solid #dcdcdc;
  padding: 5pt 8pt;
  text-align: left;
  vertical-align: top;
}
th {
  background: #f5f5f5;
  font-weight: 600;
  font-size: 8pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #5b5c5d;
}

/* === Images === */
img { max-width: 100%; page-break-inside: avoid; }

/* === Highlight === */
mark { background: #fef08a; padding: 1px 2px; }

/* === Horizontal rule === */
hr { border: none; border-top: 1px solid #dcdcdc; margin: 14pt 0; }

/* === Print-specific: hide browser chrome === */
@media print {
  body { margin: 0; padding: 0; }
}
</style></head><body>${html}</body></html>`;
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
    window.print();
  }, []);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    if (!e.metaKey) return;
    switch (e.key) {
      case "o": {
        e.preventDefault();
        const path = await openFile();
        if (path) { addRecentFile(path); hasContent = true; }
        break;
      }
      case "s": {
        e.preventDefault();
        if (e.shiftKey) {
          const path = await saveFileAs(state.currentContent);
          if (path) addRecentFile(path);
        } else if (state.currentFilePath) {
          await saveFile(state.currentFilePath, state.currentContent);
        } else {
          const path = await saveFileAs(state.currentContent);
          if (path) addRecentFile(path);
        }
        break;
      }
      case "w": { e.preventDefault(); if (state.activeTabIndex >= 0) dispatch({ type: "CLOSE_TAB", index: state.activeTabIndex }); break; }
      case "n": { e.preventDefault(); dispatch({ type: "NEW_FILE" }); editor?.commands.setContent("", { contentType: "markdown" }); hasContent = true; break; }
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
  }, [editor, state.currentFilePath, state.currentContent, state.activeTabIndex, state.openTabs.length, dispatch, openFile, saveFile, saveFileAs, addRecentFile, refreshFile, handlePrint]);

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
      <Sidebar />

      {/* Main content area (tabs + breadcrumb + editor) */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Draggable title area for macOS */}
        <div data-tauri-drag-region style={{ height: "38px", flexShrink: 0, display: "flex", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <TabBar />
          </div>
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
            <div
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
          )}
        </div>

      {/* Right outline panel (gray) */}
      {!showWelcome && state.outlineOpen && (
        <div style={{
          width: "220px",
          minWidth: "160px",
          height: "100%",
          backgroundColor: "var(--color-bg-sidebar)",
          borderLeft: "1px solid var(--color-border-primary)",
          flexShrink: 0,
          overflow: "auto",
        }}>
          <OutlinePanel editor={editor} />
        </div>
      )}

      {/* Settings overlay */}
      <SettingsPanel />
    </div>
  );
}

export default App;
