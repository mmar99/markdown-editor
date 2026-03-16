import { useAppState, useAppDispatch } from "../../stores/AppContext";
import { FileTree } from "./FileTree";

interface SidebarProps {
  width?: number;
}

export function Sidebar({ width = 240 }: SidebarProps) {
  const { sidebarOpen, navHistory, navHistoryIndex } = useAppState();
  const dispatch = useAppDispatch();

  const canGoBack = navHistoryIndex > 0;
  const canGoForward = navHistoryIndex < navHistory.length - 1;

  if (!sidebarOpen) return null;

  return (
    <div
      style={{
        width: `${width}px`,
        minWidth: "150px",
        height: "100%",
        backgroundColor: "var(--color-bg-sidebar)",
        borderRight: "1px solid var(--color-border-primary)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Top: draggable area with back/forward arrows (like Linear) */}
      <div
        data-tauri-drag-region
        style={{
          height: "38px",
          display: "flex",
          alignItems: "center",
          padding: "0 var(--spacing-sm)",
          paddingLeft: "78px", // macOS traffic lights
          gap: "2px",
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1 }} />

        {/* Back / Forward navigation — right-aligned */}
        <SidebarNavBtn
          title="Back"
          disabled={!canGoBack}
          onClick={() => dispatch({ type: "NAV_BACK" })}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2.5L4 6L7.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </SidebarNavBtn>
        <SidebarNavBtn
          title="Forward"
          disabled={!canGoForward}
          onClick={() => dispatch({ type: "NAV_FORWARD" })}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </SidebarNavBtn>

        {/* Sidebar toggle */}
        <button
          onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
          style={{
            background: "none", border: "none", cursor: "default",
            color: "var(--color-text-quaternary)", padding: "4px",
            borderRadius: "var(--radius-sm)", lineHeight: 1,
            transition: `color var(--speed-quick) var(--ease-out-cubic)`,
          }}
          title="Hide sidebar (⌘\\)"
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-quaternary)"; }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ display: "block" }}>
            <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" />
            <line x1="5.5" y1="1" x2="5.5" y2="15" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>

      {/* File tree */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <FileTree />
      </div>
    </div>
  );
}

function SidebarNavBtn({
  children, title, onClick, disabled,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: "22px", height: "22px",
        background: "var(--color-bg-primary)",
        border: "1px solid var(--color-border-secondary)",
        borderRadius: "var(--radius-sm)",
        cursor: "default",
        color: "var(--color-text-tertiary)",
        opacity: disabled ? 0.35 : 1,
        transition: `background var(--speed-quick) var(--ease-out-cubic)`,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-bg-primary)"; }}
    >
      {children}
    </button>
  );
}
