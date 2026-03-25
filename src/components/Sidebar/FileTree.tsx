import { useState, useCallback, useEffect, useRef } from "react";
import { useAppState } from "../../stores/AppContext";
import { useWorkspace } from "../../hooks/useWorkspace";
import { useFileSystem } from "../../hooks/useFileSystem";
import { useRecentFiles } from "../../hooks/useRecentFiles";
import { FileTreeItem } from "./FileTreeItem";

export function FileTree() {
  const { workspacePath, fileTree, recentFiles, favorites, currentFilePath } = useAppState();
  const { openFolder } = useWorkspace();
  const { openFileByPath } = useFileSystem();
  const { addRecentFile } = useRecentFiles();
  const treeRootRef = useRef<HTMLDivElement>(null);

  // Expanded folder state — lifted here so it survives tree refreshes
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const node of fileTree) {
      if (node.isDirectory) initial.add(node.path);
    }
    return initial;
  });

  const toggleExpanded = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  // Reset expanded state when a NEW workspace is opened (not on tree refresh)
  useEffect(() => {
    const initial = new Set<string>();
    for (const node of fileTree) {
      if (node.isDirectory) initial.add(node.path);
    }
    setExpandedPaths(initial);
  }, [workspacePath]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!workspacePath || !currentFilePath || !currentFilePath.startsWith(workspacePath)) return;

    const relativeParts = currentFilePath
      .slice(workspacePath.length + 1)
      .split("/")
      .slice(0, -1);

    if (relativeParts.length > 0) {
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        let cursor = workspacePath;
        for (const part of relativeParts) {
          cursor = `${cursor}/${part}`;
          next.add(cursor);
        }
        return next;
      });
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = Array.from(
          treeRootRef.current?.querySelectorAll<HTMLButtonElement>("[data-tree-node-path]") ?? [],
        ).find((node) => node.dataset.treeNodePath === currentFilePath);
        target?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    });
  }, [workspacePath, currentFilePath]);

  const handleFileClick = async (path: string) => {
    const success = await openFileByPath(path);
    if (success) addRecentFile(path);
  };

  return (
    <div ref={treeRootRef} style={{ padding: "var(--spacing-sm) 0" }}>
      {/* Recents */}
      {recentFiles.length > 0 && (
        <Section label="Recents">
          {recentFiles.slice(0, 5).map((fp) => (
            <SidebarItem key={fp} path={fp} active={currentFilePath === fp} onClick={() => handleFileClick(fp)} />
          ))}
        </Section>
      )}

      {/* Favorites */}
      {favorites.length > 0 && (
        <Section label="Favorites">
          {favorites.map((fp) => (
            <SidebarItem key={fp} path={fp} active={currentFilePath === fp} onClick={() => handleFileClick(fp)} />
          ))}
        </Section>
      )}

      {/* Workspace */}
      {!workspacePath ? (
        <div style={{ padding: "var(--spacing-lg) var(--spacing-md)", textAlign: "center" }}>
          <p style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-quaternary)", marginBottom: "var(--spacing-sm)" }}>
            No folder open
          </p>
          <button onClick={openFolder} style={openBtnStyle}>Open Folder</button>
        </div>
      ) : (
        <Section label={workspacePath.split("/").pop() ?? "Workspace"}>
          {fileTree.length === 0 ? (
            <p style={{ padding: "var(--spacing-sm) var(--spacing-md)", fontSize: "var(--font-size-small)", color: "var(--color-text-quaternary)" }}>
              No markdown files
            </p>
          ) : (
            fileTree.map((node) => (
              <FileTreeItem
                key={node.path}
                node={node}
                depth={0}
                onFileClick={handleFileClick}
                expandedPaths={expandedPaths}
                toggleExpanded={toggleExpanded}
              />
            ))
          )}
        </Section>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "var(--spacing-xs)" }}>
      <div style={{
        padding: "var(--spacing-xs) var(--spacing-md)",
        fontSize: "var(--font-size-micro)",
        fontWeight: "var(--font-weight-semibold)" as unknown as number,
        color: "var(--color-text-quaternary)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}>
        {label}
      </div>
      {children}
      <div style={{ height: "1px", background: "var(--color-border-primary)", margin: "var(--spacing-sm) var(--spacing-md) 0" }} />
    </div>
  );
}

function SidebarItem({ path, active, onClick }: { path: string; active: boolean; onClick: () => void }) {
  const name = path.split("/").pop()?.replace(/\.(md|markdown|mdx|txt)$/, "") ?? path;
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "calc(100% - 8px)",
        marginLeft: "4px",
        padding: "3px var(--spacing-sm)",
        background: active ? "var(--color-selected-bg)" : "transparent",
        border: "none",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        fontSize: "var(--font-size-small)",
        fontWeight: active ? "var(--font-weight-medium)" as unknown as number : "var(--font-weight-normal)" as unknown as number,
        color: active ? "var(--color-brand)" : "var(--color-text-secondary)",
        textAlign: "left",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        transition: `background var(--speed-quick) var(--ease-out-cubic)`,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--color-hover)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {name}
    </button>
  );
}

const openBtnStyle: React.CSSProperties = {
  padding: "var(--spacing-xs) var(--spacing-md)",
  backgroundColor: "var(--color-bg-tertiary)",
  color: "var(--color-text-secondary)",
  border: "1px solid var(--color-border-secondary)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--font-size-small)",
  fontWeight: "var(--font-weight-medium)" as unknown as number,
  cursor: "pointer",
};
