import { useState, useEffect, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import type { HeadingItem } from "../../types";

interface OutlinePanelProps {
  editor: Editor | null;
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

export function OutlinePanel({ editor }: OutlinePanelProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);

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
      {headings.map((heading, i) => (
        <button
          key={`${heading.pos}-${i}`}
          onClick={() => scrollToHeading(heading.pos)}
          style={{
            display: "block",
            width: "calc(100% - 8px)",
            marginLeft: "4px",
            padding: "3px var(--spacing-sm)",
            paddingLeft: `${8 + (heading.level - 1) * 12}px`,
            background: "transparent",
            border: "none",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            fontSize: heading.level === 1 ? "var(--font-size-small)" : "var(--font-size-mini)",
            fontWeight: heading.level <= 2 ? ("var(--font-weight-medium)" as unknown as number) : ("var(--font-weight-normal)" as unknown as number),
            color: "var(--color-text-secondary)",
            textAlign: "left",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            transition: `background var(--speed-quick) var(--ease-out-cubic)`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          {heading.text || "(empty)"}
        </button>
      ))}
    </div>
  );
}
