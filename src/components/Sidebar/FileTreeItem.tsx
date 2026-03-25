import { useAppState } from "../../stores/AppContext";
import type { FileNode } from "../../types";
import { HugeiconsIcon, ArrowRight01Icon } from "../Icons";

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  onFileClick: (path: string) => void;
  expandedPaths: Set<string>;
  toggleExpanded: (path: string) => void;
}

export function FileTreeItem({ node, depth, onFileClick, expandedPaths, toggleExpanded }: FileTreeItemProps) {
  const { currentFilePath } = useAppState();
  const expanded = node.isDirectory && expandedPaths.has(node.path);
  const isActive = !node.isDirectory && currentFilePath === node.path;

  const handleClick = () => {
    if (node.isDirectory) {
      toggleExpanded(node.path);
    } else {
      onFileClick(node.path);
    }
  };

  const indent = 12 + depth * 16;
  const displayName = node.isDirectory
    ? node.name
    : node.name.replace(/\.(md|markdown|mdx|txt)$/, "");

  return (
    <div style={{ position: "relative" }}>
      {/* Vertical indent line (Linear-style) */}
      {depth > 0 && (
        <div
          style={{
            position: "absolute",
            left: `${12 + (depth - 1) * 16 + 6}px`,
            top: 0,
            bottom: 0,
            width: "1px",
            backgroundColor: "var(--color-border-primary)",
          }}
        />
      )}

      <button
        data-tree-node-path={!node.isDirectory ? node.path : undefined}
        onClick={handleClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          width: "calc(100% - 8px)",
          marginLeft: "4px",
          padding: "3px 8px",
          paddingLeft: `${indent}px`,
          background: isActive ? "var(--color-selected-bg)" : "transparent",
          border: "none",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          fontSize: "var(--font-size-small)",
          color: isActive
            ? "var(--color-brand)"
            : node.isDirectory
              ? "var(--color-text-primary)"
              : "var(--color-text-secondary)",
          textAlign: "left",
          fontWeight: node.isDirectory
            ? ("var(--font-weight-medium)" as unknown as number)
            : ("var(--font-weight-normal)" as unknown as number),
          position: "relative",
          transition: `background var(--speed-quick) var(--ease-out-cubic)`,
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = "var(--color-hover)";
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = "transparent";
        }}
      >
        {/* Chevron for directories */}
        {node.isDirectory ? (
          <span
            style={{
              fontSize: "9px",
              width: "12px",
              flexShrink: 0,
              color: "var(--color-text-quaternary)",
              transition: `transform var(--speed-quick) var(--ease-out-cubic)`,
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              display: "inline-block",
            }}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={9} strokeWidth={2} />
          </span>
        ) : (
          <span style={{ width: "12px", flexShrink: 0 }} />
        )}

        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayName}
        </span>
      </button>

      {node.isDirectory && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileClick={onFileClick}
              expandedPaths={expandedPaths}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
