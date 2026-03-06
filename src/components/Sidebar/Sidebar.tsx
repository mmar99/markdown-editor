import { useAppState, useAppDispatch } from "../../stores/AppContext";
import { FileTree } from "./FileTree";

export function Sidebar() {
  const { sidebarOpen } = useAppState();
  const dispatch = useAppDispatch();

  if (!sidebarOpen) return null;

  return (
    <div
      style={{
        width: "240px",
        minWidth: "180px",
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
        {/* Back / Forward navigation */}
        <SidebarNavBtn title="Back">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2.5L4 6L7.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </SidebarNavBtn>
        <SidebarNavBtn title="Forward">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </SidebarNavBtn>

        <div style={{ flex: 1 }} />

        {/* Sidebar toggle */}
        <button
          onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
          style={{
            background: "none", border: "none", cursor: "default",
            color: "var(--color-text-quaternary)", padding: "4px",
            borderRadius: "var(--radius-sm)", lineHeight: 1,
          }}
          title="Toggle sidebar (Cmd+\\)"
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

function SidebarNavBtn({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <button
      title={title}
      style={{
        background: "none", border: "none", cursor: "default",
        color: "var(--color-text-quaternary)", padding: "4px",
        borderRadius: "var(--radius-sm)", lineHeight: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}
