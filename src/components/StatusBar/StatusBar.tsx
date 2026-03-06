import { useMemo } from "react";
import { useAppState } from "../../stores/AppContext";
import { countWords, countCharacters, countLines } from "../../utils/wordCount";

export function StatusBar() {
  const { currentContent, currentFilePath } = useAppState();

  const stats = useMemo(() => ({
    words: countWords(currentContent),
    characters: countCharacters(currentContent),
    lines: countLines(currentContent),
  }), [currentContent]);

  return (
    <div
      style={{
        height: "28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 var(--spacing-md)",
        backgroundColor: "var(--color-bg-sidebar)",
        borderTop: "1px solid var(--color-border-primary)",
        fontFamily: "var(--font-regular)",
        fontSize: "var(--font-size-micro)",
        color: "var(--color-text-quaternary)",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", gap: "var(--spacing-md)" }}>
        <span>{stats.words.toLocaleString()} words</span>
        <span>{stats.characters.toLocaleString()} chars</span>
        <span>{stats.lines.toLocaleString()} lines</span>
      </div>
      <div>
        {currentFilePath && (
          <span title={currentFilePath}>
            {currentFilePath.split("/").slice(-2).join("/")}
          </span>
        )}
      </div>
    </div>
  );
}
