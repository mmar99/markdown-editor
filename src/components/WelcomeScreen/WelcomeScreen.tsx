import { useAppState, useAppDispatch } from "../../stores/AppContext";
import { useFileSystem } from "../../hooks/useFileSystem";
import { useWorkspace } from "../../hooks/useWorkspace";

export function WelcomeScreen() {
  const { recentFiles } = useAppState();
  const dispatch = useAppDispatch();
  const { openFile, openFileByPath } = useFileSystem();
  const { openFolder } = useWorkspace();

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100%", padding: "40px", backgroundColor: "var(--color-bg-primary)",
    }}>
      <h1 style={{ fontSize: "var(--font-size-title1)", fontWeight: "var(--font-weight-light)" as unknown as number, color: "var(--color-text-primary)", marginBottom: "var(--spacing-sm)", letterSpacing: "-0.03em" }}>
        Markdown
      </h1>
      <p style={{ fontSize: "var(--font-size-regular)", color: "var(--color-text-quaternary)", marginBottom: "var(--spacing-xl)" }}>
        A beautiful way to write
      </p>

      <div style={{ display: "flex", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-xl)" }}>
        <WelcomeBtn onClick={() => { dispatch({ type: "NEW_FILE" }); dispatch({ type: "UPDATE_CONTENT", content: "" }); }}>New File</WelcomeBtn>
        <WelcomeBtn onClick={openFile}>Open File</WelcomeBtn>
        <WelcomeBtn onClick={openFolder}>Open Folder</WelcomeBtn>
      </div>

      {recentFiles.length > 0 && (
        <div style={{ width: "100%", maxWidth: "360px" }}>
          <div style={{ fontSize: "var(--font-size-micro)", fontWeight: "var(--font-weight-semibold)" as unknown as number, color: "var(--color-text-quaternary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--spacing-sm)" }}>
            Recent Files
          </div>
          {recentFiles.map((fp) => {
            const name = fp.split("/").pop()?.replace(/\.(md|markdown|mdx|txt)$/, "") ?? fp;
            const dir = fp.split("/").slice(-2, -1).join("/");
            return (
              <button
                key={fp}
                onClick={() => openFileByPath(fp)}
                style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)", padding: "var(--spacing-sm) var(--spacing-sm)", background: "transparent", border: "none", cursor: "pointer", borderRadius: "var(--radius-md)", textAlign: "left", width: "100%", transition: `background var(--speed-quick) var(--ease-out-cubic)` }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div>
                  <div style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-primary)", fontWeight: "var(--font-weight-medium)" as unknown as number }}>{name}</div>
                  <div style={{ fontSize: "var(--font-size-micro)", color: "var(--color-text-quaternary)" }}>{dir}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WelcomeBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "var(--spacing-sm) var(--spacing-lg)",
        backgroundColor: "var(--color-bg-quaternary)",
        color: "var(--color-text-secondary)",
        border: "1px solid var(--color-border-secondary)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-size-small)",
        fontWeight: "var(--font-weight-medium)" as unknown as number,
        cursor: "pointer",
        transition: `background var(--speed-quick) var(--ease-out-cubic)`,
      }}
    >
      {children}
    </button>
  );
}
