import { useMemo, useState, useRef, useEffect } from "react";
import { useAppState, useAppDispatch } from "../../stores/AppContext";

interface BreadcrumbBarProps {
  onNavigate: (direction: "prev" | "next") => void;
  onExport: (format: "pdf" | "html") => void;
  onPrint: () => void;
  siblingInfo: { current: number; total: number } | null;
}

export function BreadcrumbBar({ onNavigate, onExport, onPrint, siblingInfo }: BreadcrumbBarProps) {
  const { currentFilePath, workspacePath, isDirty, favorites } = useAppState();
  const dispatch = useAppDispatch();
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const isFavorite = currentFilePath ? favorites.includes(currentFilePath) : false;

  const segments = useMemo(() => {
    if (!currentFilePath) return [];
    const base = workspacePath ?? "";
    const relative = base ? currentFilePath.replace(base + "/", "") : currentFilePath;
    const parts = relative.split("/");
    const last = parts[parts.length - 1].replace(/\.(md|markdown|mdx|txt)$/, "");
    return [...parts.slice(0, -1), last];
  }, [currentFilePath, workspacePath]);

  // Close export dropdown on click outside
  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exportOpen]);

  if (!currentFilePath) return null;

  return (
    <div
      style={{
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 var(--spacing-md)",
        backgroundColor: "var(--color-bg-primary)",
        borderBottom: "1px solid var(--color-border-primary)",
        flexShrink: 0,
      }}
    >
      {/* Left: Breadcrumbs + star */}
      <div style={{ display: "flex", alignItems: "center", gap: "2px", overflow: "hidden", flex: 1 }}>
        {segments.map((seg, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {i > 0 && <span style={{ color: "var(--color-text-quaternary)", margin: "0 2px", fontSize: "var(--font-size-mini)" }}>›</span>}
            <span
              style={{
                fontSize: "var(--font-size-small)",
                fontWeight: i === segments.length - 1 ? "var(--font-weight-medium)" as unknown as number : "var(--font-weight-normal)" as unknown as number,
                color: i === segments.length - 1 ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                cursor: "default",
                padding: "2px 4px",
                borderRadius: "var(--radius-sm)",
                transition: `background var(--speed-quick) var(--ease-out-cubic)`,
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { if (i < segments.length - 1) e.currentTarget.style.background = "var(--color-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {seg}
            </span>
          </span>
        ))}

        {isDirty && (
          <span style={{ width: "6px", height: "6px", borderRadius: "var(--radius-circle)", backgroundColor: "var(--color-brand)", marginLeft: "6px", flexShrink: 0 }} />
        )}

        <button
          onClick={() => currentFilePath && dispatch({ type: "TOGGLE_FAVORITE", path: currentFilePath })}
          style={{
            background: "none", border: "none", cursor: "default",
            fontSize: "13px", color: isFavorite ? "var(--color-warning)" : "var(--color-text-quaternary)",
            padding: "2px 4px", marginLeft: "2px", borderRadius: "var(--radius-sm)", lineHeight: 1,
            transition: `color var(--speed-quick) var(--ease-out-cubic)`,
          }}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      </div>

      {/* Right: Export + Print + Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)", flexShrink: 0 }}>
        {/* Export dropdown */}
        <div ref={exportRef} style={{ position: "relative" }}>
          <BarBtn onClick={() => setExportOpen(!exportOpen)} title="Export">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </BarBtn>
          {exportOpen && (
            <div style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: "4px",
              backgroundColor: "var(--color-bg-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-md)",
              padding: "var(--spacing-xs)",
              minWidth: "140px",
              zIndex: 60,
            }}>
              <DropdownItem onClick={() => { onExport("pdf"); setExportOpen(false); }}>Save as PDF...</DropdownItem>
              <DropdownItem onClick={() => { onExport("html"); setExportOpen(false); }}>Export as HTML</DropdownItem>
            </div>
          )}
        </div>

        {/* Print */}
        <BarBtn onClick={onPrint} title="Print (Cmd+P)">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6V2h8v4M4 12H2V8h12v4h-2M4 10h8v4H4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </BarBtn>

        {/* Separator */}
        {siblingInfo && siblingInfo.total > 1 && (
          <div style={{ width: "1px", height: "16px", backgroundColor: "var(--color-border-primary)", marginLeft: "2px", marginRight: "2px" }} />
        )}

        {/* Navigation */}
        {siblingInfo && siblingInfo.total > 1 && (
          <>
            <span style={{ fontSize: "var(--font-size-mini)", color: "var(--color-text-quaternary)" }}>
              {siblingInfo.current}/{siblingInfo.total}
            </span>
            <NavBtn onClick={() => onNavigate("prev")} title="Previous file">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 6.5L5 3.5L8 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </NavBtn>
            <NavBtn onClick={() => onNavigate("next")} title="Next file">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </NavBtn>
          </>
        )}
      </div>
    </div>
  );
}

function BarBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: "26px", height: "26px",
        background: "transparent",
        border: "none",
        borderRadius: "var(--radius-sm)",
        cursor: "default",
        color: "var(--color-text-tertiary)",
        transition: `background var(--speed-quick) var(--ease-out-cubic)`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

function NavBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title} style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: "22px", height: "22px",
      background: "var(--color-bg-primary)",
      border: "1px solid var(--color-border-secondary)",
      borderRadius: "var(--radius-sm)",
      cursor: "default",
      color: "var(--color-text-tertiary)",
      transition: `background var(--speed-quick) var(--ease-out-cubic)`,
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-quaternary)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-bg-primary)"; }}
    >
      {children}
    </button>
  );
}

function DropdownItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block", width: "100%",
        padding: "var(--spacing-xs) var(--spacing-sm)",
        background: "transparent", border: "none",
        borderRadius: "var(--radius-sm)",
        cursor: "default", textAlign: "left",
        fontSize: "var(--font-size-small)",
        color: "var(--color-text-primary)",
        transition: `background var(--speed-quick) var(--ease-out-cubic)`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}
