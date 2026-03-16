import { useState, useEffect, useCallback, useRef } from "react";
import type { Editor } from "@tiptap/react";
import type { HeadingItem } from "../../types";

interface OutlinePanelProps {
  editor: Editor | null;
  scrollContainer?: React.RefObject<HTMLDivElement | null>;
}

function getHeadings(editor: Editor): HeadingItem[] {
  const headings: HeadingItem[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      headings.push({ level: node.attrs.level as number, text: node.textContent, pos });
    }
  });
  return headings;
}

export function OutlinePanel({ editor, scrollContainer }: OutlinePanelProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);

  const updateHeadings = useCallback(() => {
    if (!editor) return;
    setHeadings(getHeadings(editor));
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    updateHeadings();
    editor.on("update", updateHeadings);
    return () => { editor.off("update", updateHeadings); };
  }, [editor, updateHeadings]);

  // Scroll tracking — find the heading at ~1/3 from top of the editor viewport
  useEffect(() => {
    const container = scrollContainer?.current;
    if (!container || !editor) return;

    const handleScroll = () => {
      if (rafRef.current !== null) return; // already scheduled
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (headings.length === 0) return;

        const containerRect = container.getBoundingClientRect();
        const eyeY = containerRect.top + containerRect.height * 0.33;

        let active = 0;
        for (let i = 0; i < headings.length; i++) {
          try {
            const coords = editor.view.coordsAtPos(headings[i].pos + 1);
            if (coords.top <= eyeY) active = i;
            else break;
          } catch { /* pos might be stale between doc updates */ }
        }
        setActiveIdx(active);
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [editor, scrollContainer, headings]);

  // Auto-scroll the outline panel to keep the active item visible
  useEffect(() => {
    itemRefs.current[activeIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIdx]);

  const scrollToHeading = (pos: number) => {
    if (!editor) return;
    editor.chain().setTextSelection(pos).scrollIntoView().run();
    editor.commands.focus();
  };

  if (!editor || headings.length === 0) {
    return (
      <div style={{ padding: "var(--spacing-lg) var(--spacing-md)", fontSize: "var(--font-size-small)", color: "var(--color-text-quaternary)", textAlign: "center" }}>
        {editor ? "No headings" : "No document"}
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--spacing-sm) 0" }}>
      <div style={{
        padding: "var(--spacing-xs) var(--spacing-md)",
        fontSize: "var(--font-size-micro)",
        fontWeight: "var(--font-weight-semibold)" as unknown as number,
        color: "var(--color-text-quaternary)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}>
        Outline
      </div>
      {headings.map((heading, i) => {
        const isActive = i === activeIdx;
        return (
          <button
            key={`${heading.pos}-${i}`}
            ref={(el) => { itemRefs.current[i] = el; }}
            onClick={() => scrollToHeading(heading.pos)}
            style={{
              display: "block",
              width: "calc(100% - 8px)",
              marginLeft: "4px",
              padding: "3px var(--spacing-sm)",
              paddingLeft: `${8 + (heading.level - 1) * 12}px`,
              background: isActive ? "var(--color-active)" : "transparent",
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontSize: heading.level === 1 ? "var(--font-size-small)" : "var(--font-size-mini)",
              fontWeight: heading.level <= 2 ? ("var(--font-weight-medium)" as unknown as number) : ("var(--font-weight-normal)" as unknown as number),
              color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              textAlign: "left",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              transition: `background var(--speed-quick) var(--ease-out-cubic), color var(--speed-quick) var(--ease-out-cubic)`,
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--color-hover)"; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
          >
            {heading.text || "(empty)"}
          </button>
        );
      })}
    </div>
  );
}
