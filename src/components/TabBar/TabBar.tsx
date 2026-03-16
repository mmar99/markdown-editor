import { useAppState, useAppDispatch } from "../../stores/AppContext";

/** Tab bar that sits inside the content area (above breadcrumbs), NOT full-width */
export function TabBar() {
  const { openTabs, activeTabIndex, isDirty } = useAppState();
  const dispatch = useAppDispatch();

  if (openTabs.length === 0) return null;

  return (
    <div
      style={{
        height: "36px",
        display: "flex",
        alignItems: "center",
        backgroundColor: "var(--color-bg-sidebar)",
        borderBottom: "1px solid var(--color-border-primary)",
        padding: "0 var(--spacing-sm)",
        flexShrink: 0,
        overflow: "hidden",
        gap: "2px",
      }}
    >
      {/* Tabs — flex to fill width evenly */}
      {openTabs.map((tab, i) => {
        const isActive = i === activeTabIndex;
        const tabDirty = isActive && isDirty;
        return (
          <button
            key={tab.path}
            onClick={() => dispatch({ type: "SWITCH_TAB", index: i })}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
              padding: "0 10px",
              height: "26px",
              flex: 1,
              minWidth: 0,
              maxWidth: "220px",
              borderRadius: "var(--radius-md)",
              backgroundColor: isActive ? "var(--color-bg-primary)" : "transparent",
              border: isActive ? "1px solid var(--color-border-primary)" : "1px solid transparent",
              cursor: "default",
              fontSize: "var(--font-size-mini)",
              fontWeight: isActive ? "var(--font-weight-medium)" as unknown as number : "var(--font-weight-normal)" as unknown as number,
              color: isActive ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              transition: `all var(--speed-quick) var(--ease-out-cubic)`,
              position: "relative",
              outline: "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = "var(--color-hover)";
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {/* Dirty dot */}
            {tabDirty && (
              <span style={{
                width: "5px", height: "5px",
                borderRadius: "var(--radius-circle)",
                backgroundColor: "var(--color-brand)",
                flexShrink: 0,
              }} />
            )}

            {/* Label — show H1 title if available, else filename */}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {tab.title || tab.label}
            </span>

            {/* Close — always show on active, hover for others */}
            <span
              onClick={(e) => { e.stopPropagation(); dispatch({ type: "CLOSE_TAB", index: i }); }}
              style={{
                fontSize: "12px",
                lineHeight: 1,
                color: "var(--color-text-quaternary)",
                cursor: "default",
                opacity: isActive ? 0.5 : 0,
                transition: `opacity var(--speed-quick) var(--ease-out-cubic)`,
                flexShrink: 0,
                borderRadius: "var(--radius-sm)",
                padding: "1px 3px",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.backgroundColor = "var(--color-active)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = isActive ? "0.5" : "0"; e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              ×
            </span>
          </button>
        );
      })}

      {/* + button */}
      <span
        style={{
          fontSize: "16px",
          color: "var(--color-text-quaternary)",
          padding: "0 4px",
          flexShrink: 0,
          cursor: "default",
        }}
      >
        +
      </span>
    </div>
  );
}
