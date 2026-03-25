import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: string;
  children: ReactNode;
  shortcut?: string | string[];
  side?: "top" | "bottom";
  disabled?: boolean;
}

export function Tooltip({
  content,
  children,
  shortcut,
  side = "bottom",
  disabled = false,
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const showTimeoutRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const shortcuts = Array.isArray(shortcut) ? shortcut : shortcut ? [shortcut] : [];

  const clearShowTimeout = useCallback(() => {
    if (showTimeoutRef.current !== null) {
      window.clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setPosition({
      left: rect.left + (rect.width / 2),
      top: side === "top" ? rect.top - 10 : rect.bottom + 10,
    });
  }, [side]);

  const show = useCallback(() => {
    if (disabled || !content) return;
    clearShowTimeout();
    showTimeoutRef.current = window.setTimeout(() => {
      updatePosition();
      setOpen(true);
    }, 180);
  }, [clearShowTimeout, content, disabled, updatePosition]);

  const hide = useCallback(() => {
    clearShowTimeout();
    setOpen(false);
  }, [clearShowTimeout]);

  useEffect(() => {
    if (!open) return undefined;

    const refreshPosition = () => updatePosition();
    window.addEventListener("resize", refreshPosition);
    window.addEventListener("scroll", refreshPosition, true);
    return () => {
      window.removeEventListener("resize", refreshPosition);
      window.removeEventListener("scroll", refreshPosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => () => {
    clearShowTimeout();
  }, [clearShowTimeout]);

  return (
    <>
      <span
        ref={triggerRef}
        style={{ display: "inline-flex" }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {open && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            left: `${position.left}px`,
            top: `${position.top}px`,
            transform: side === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 10px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-secondary)",
            background: "rgba(252, 252, 252, 0.96)",
            boxShadow: "var(--shadow-lg)",
            backdropFilter: "blur(18px)",
            color: "var(--color-text-secondary)",
            fontSize: "var(--font-size-small)",
            fontWeight: "var(--font-weight-medium)" as unknown as number,
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            zIndex: 200,
            pointerEvents: "none",
          }}
        >
          <span>{content}</span>
          {shortcuts.length > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {shortcuts.map((item) => (
                <span
                  key={item}
                  style={{
                    minWidth: "20px",
                    padding: "2px 6px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-bg-quaternary)",
                    border: "1px solid var(--color-border-primary)",
                    color: "var(--color-text-tertiary)",
                    fontSize: "var(--font-size-mini)",
                    fontWeight: "var(--font-weight-semibold)" as unknown as number,
                    lineHeight: 1.2,
                    textAlign: "center",
                  }}
                >
                  {item}
                </span>
              ))}
            </span>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
