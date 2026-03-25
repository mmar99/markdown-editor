import { useAppState, useAppDispatch } from "../../stores/AppContext";
import { FileTree } from "./FileTree";
import { HugeiconsIcon, ArrowLeft01Icon, ArrowRight01Icon, SidebarLeftIcon } from "../Icons";
import { Tooltip } from "../Tooltip/Tooltip";

interface SidebarProps {
  width?: number;
}

export function Sidebar({ width = 240 }: SidebarProps) {
  const { navHistory, navHistoryIndex } = useAppState();
  const dispatch = useAppDispatch();

  const canGoBack = navHistoryIndex > 0;
  const canGoForward = navHistoryIndex < navHistory.length - 1;

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
          shortcut="⌘["
          disabled={!canGoBack}
          onClick={() => dispatch({ type: "NAV_BACK" })}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={12} strokeWidth={1.3} />
        </SidebarNavBtn>
        <SidebarNavBtn
          title="Forward"
          shortcut="⌘]"
          disabled={!canGoForward}
          onClick={() => dispatch({ type: "NAV_FORWARD" })}
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={12} strokeWidth={1.3} />
        </SidebarNavBtn>

        {/* Sidebar toggle */}
        <Tooltip content="Hide sidebar" shortcut="⌘\\">
          <button
            onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
            aria-label="Hide sidebar"
            style={{
              background: "none", border: "none", cursor: "default",
              color: "var(--color-text-quaternary)", padding: "4px",
              borderRadius: "var(--radius-sm)", lineHeight: 1,
              transition: `color var(--speed-quick) var(--ease-out-cubic)`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-quaternary)"; }}
          >
            <HugeiconsIcon icon={SidebarLeftIcon} size={14} strokeWidth={1.2} />
          </button>
        </Tooltip>
      </div>

      {/* File tree */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <FileTree />
      </div>
    </div>
  );
}

function SidebarNavBtn({
  children, title, shortcut, onClick, disabled,
}: {
  children: React.ReactNode;
  title: string;
  shortcut?: string | string[];
  onClick?: () => void;
  disabled?: boolean;
}) {
  const button = (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
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

  return <Tooltip content={title} shortcut={shortcut} disabled={Boolean(disabled)}>{button}</Tooltip>;
}
