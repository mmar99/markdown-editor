import { useAppState, useAppDispatch } from "../../stores/AppContext";
import { HugeiconsIcon, Cancel01Icon, Add01Icon } from "../Icons";
import { Tooltip } from "../Tooltip/Tooltip";
import { buildTabWidthCss } from "../../utils/tabSizing";

/** Tab bar that sits inside the content area (above breadcrumbs), NOT full-width */
export function TabBar() {
  const { openTabs, activeTabIndex, isDirty } = useAppState();
  const dispatch = useAppDispatch();
  const tabWidth = buildTabWidthCss(openTabs.length);
  const compactTabs = openTabs.length >= 8;
  const ultraCompactTabs = openTabs.length >= 12;

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
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: `${compactTabs ? 1 : 2}px`,
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {openTabs.map((tab, i) => {
          const isActive = i === activeTabIndex;
          const tabDirty = isActive && isDirty;
          return (
            <div
              key={tab.path}
              style={{
                flex: `0 0 ${tabWidth}`,
                width: tabWidth,
                minWidth: 0,
              }}
            >
              <Tooltip content={tab.title || tab.label}>
                <button
                  onClick={() => dispatch({ type: "SWITCH_TAB", index: i })}
                  aria-label={tab.title || tab.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: compactTabs ? "4px" : "5px",
                    padding: ultraCompactTabs ? "0 5px" : compactTabs ? "0 7px" : "0 10px",
                    height: "26px",
                    width: "100%",
                    minWidth: 0,
                    overflow: "hidden",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--color-bg-primary)",
                    border: isActive ? "1px solid var(--color-border-secondary)" : "1px solid var(--color-border-primary)",
                    boxShadow: isActive ? "var(--shadow-xs)" : "none",
                    cursor: "default",
                    fontSize: "var(--font-size-mini)",
                    fontWeight: isActive ? "var(--font-weight-medium)" as unknown as number : "var(--font-weight-normal)" as unknown as number,
                    color: isActive ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                    transition: `all var(--speed-quick) var(--ease-out-cubic)`,
                    position: "relative",
                    outline: "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "var(--color-bg-quaternary)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "var(--color-bg-primary)";
                  }}
                >
                  {tabDirty && (
                    <span style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "var(--radius-circle)",
                      backgroundColor: "var(--color-brand)",
                      flexShrink: 0,
                    }} />
                  )}

                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {tab.title || tab.label}
                  </span>

                  {!ultraCompactTabs && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: "CLOSE_TAB", index: i });
                      }}
                      role="button"
                      aria-label="Close tab"
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
                      <HugeiconsIcon icon={Cancel01Icon} size={10} />
                    </span>
                  )}
                </button>
              </Tooltip>
            </div>
          );
        })}
      </div>

      <Tooltip content="New tab" shortcut="⌘T">
        <button
          onClick={() => dispatch({ type: "NEW_FILE" })}
          aria-label="New tab"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
            height: "24px",
            color: "var(--color-text-quaternary)",
            backgroundColor: "transparent",
            border: "none",
            borderRadius: "var(--radius-sm)",
            padding: 0,
            marginLeft: "4px",
            flexShrink: 0,
            cursor: "default",
            transition: `background var(--speed-quick) var(--ease-out-cubic)`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <HugeiconsIcon icon={Add01Icon} size={14} />
        </button>
      </Tooltip>
    </div>
  );
}
