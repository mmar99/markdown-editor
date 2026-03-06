import { useState } from "react";

interface FileChangedBannerProps {
  isDirty: boolean;
  onReload: () => void;
  onKeepMine: () => void;
  onKeepBoth: () => void;
  onDismiss: () => void;
}

export function FileChangedBanner({
  isDirty,
  onReload,
  onKeepMine,
  onKeepBoth,
  onDismiss,
}: FileChangedBannerProps) {
  const [showChoices, setShowChoices] = useState(false);

  const handleReload = () => {
    if (isDirty) {
      setShowChoices(true);
    } else {
      onReload();
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: "var(--spacing-lg)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--spacing-sm)",
        width: "100%",
        maxWidth: "640px",
        padding: "0 var(--spacing-lg)",
      }}
    >
      {/* Choice menu (conflict resolution) */}
      {showChoices && (
        <div
          style={{
            width: "100%",
            backgroundColor: "var(--color-bg-primary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-xl)",
            padding: "var(--spacing-xs)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <ChoiceBtn
            onClick={() => { setShowChoices(false); onReload(); }}
            title="Load the external version"
            desc="Discard your edits and load the version saved on disk"
          />
          <ChoiceBtn
            onClick={() => { setShowChoices(false); onKeepMine(); }}
            title="Keep my version"
            desc="Ignore the external changes and continue editing"
          />
          <ChoiceBtn
            onClick={() => { setShowChoices(false); onKeepBoth(); }}
            title="Keep both versions"
            desc="Save your edits as a copy, then load the external version"
          />
        </div>
      )}

      {/* Main banner — wide, Linear-style */}
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-md)",
          padding: "var(--spacing-md) var(--spacing-lg)",
          backgroundColor: "var(--color-bg-primary)",
          border: "1px solid var(--color-border-secondary)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "var(--font-size-small)",
            fontWeight: "var(--font-weight-semibold)" as unknown as number,
            color: "var(--color-text-primary)",
          }}>
            This file was updated outside the app
          </div>
          <div style={{
            fontSize: "var(--font-size-small)",
            color: "var(--color-text-tertiary)",
            marginTop: "2px",
          }}>
            {isDirty
              ? "You have unsaved edits — choose what to do"
              : "A newer version is available on disk"}
          </div>
        </div>

        <button
          onClick={handleReload}
          style={{
            padding: "var(--spacing-sm) var(--spacing-lg)",
            backgroundColor: "var(--content-highlight-color)",
            color: "white",
            border: "none",
            borderRadius: "var(--radius-pill)",
            fontSize: "var(--font-size-small)",
            fontWeight: "var(--font-weight-medium)" as unknown as number,
            cursor: "default",
            whiteSpace: "nowrap",
            flexShrink: 0,
            transition: `opacity var(--speed-quick) var(--ease-out-cubic)`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          Reload
        </button>

        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            cursor: "default",
            fontSize: "18px",
            color: "var(--color-text-quaternary)",
            padding: "var(--spacing-xs)",
            lineHeight: 1,
            borderRadius: "var(--radius-sm)",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function ChoiceBtn({ onClick, title, desc }: { onClick: () => void; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        padding: "var(--spacing-sm) var(--spacing-md)",
        background: "transparent",
        border: "none",
        borderRadius: "var(--radius-md)",
        cursor: "default",
        textAlign: "left",
        transition: `background var(--speed-quick) var(--ease-out-cubic)`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{
        fontSize: "var(--font-size-small)",
        fontWeight: "var(--font-weight-medium)" as unknown as number,
        color: "var(--color-text-primary)",
      }}>
        {title}
      </div>
      <div style={{
        fontSize: "var(--font-size-mini)",
        color: "var(--color-text-tertiary)",
        marginTop: "2px",
      }}>
        {desc}
      </div>
    </button>
  );
}
