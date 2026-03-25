import { useState } from "react";
import { useAppState, useAppDispatch } from "../../stores/AppContext";
import { useTheme } from "../../hooks/useTheme";
import { HugeiconsIcon, Cancel01Icon } from "../Icons";
import { APP_VERSION, APP_CODENAME, APP_RELEASE_DATE, CHANGELOG } from "../../version";

const FONT_OPTIONS = [
  { value: "system", label: "System Default" },
  { value: "'Inter Variable', sans-serif", label: "Inter" },
  { value: "'Georgia', serif", label: "Georgia" },
  { value: "'SF Mono', monospace", label: "SF Mono" },
  { value: "'Merriweather', serif", label: "Merriweather" },
];

const FONT_SIZES = [13, 14, 15, 16, 18, 20];

const EDITOR_WIDTHS = [
  { value: 650, label: "Narrow" },
  { value: 800, label: "Default" },
  { value: 960, label: "Wide" },
  { value: 1200, label: "Full" },
];

const BG_COLORS = [
  { value: "default", label: "Default" },
  { value: "#fffdf7", label: "Warm" },
  { value: "#f7fdf9", label: "Green" },
  { value: "#f5f5ff", label: "Lavender" },
  { value: "#fff8f0", label: "Peach" },
];

export function SettingsPanel() {
  const { settingsOpen, settings } = useAppState();
  const dispatch = useAppDispatch();
  const { resolved, toggleTheme } = useTheme();

  if (!settingsOpen) return null;

  const update = (partial: Partial<typeof settings>) => {
    dispatch({ type: "UPDATE_SETTINGS", settings: partial });
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "280px",
        zIndex: 200,
        backgroundColor: "var(--color-bg-sidebar)",
        borderLeft: "1px solid var(--color-border-primary)",
        paddingTop: "52px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "var(--spacing-sm) var(--spacing-md)",
          borderBottom: "1px solid var(--color-border-primary)",
        }}
      >
        <span style={{ fontWeight: "var(--font-weight-semibold)" as unknown as number, fontSize: "var(--font-size-small)" }}>
          Settings
        </span>
        <button
          onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
            color: "var(--color-text-tertiary)",
            padding: "2px 6px",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <HugeiconsIcon icon={Cancel01Icon} size={14} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "var(--spacing-md)" }}>
        <Group label="Theme">
          <div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
            <Chip active={resolved === "light"} onClick={() => { if (resolved !== "light") toggleTheme(); }}>Light</Chip>
            <Chip active={resolved === "dark"} onClick={() => { if (resolved !== "dark") toggleTheme(); }}>Dark</Chip>
          </div>
        </Group>

        <Group label="Font">
          <select value={settings.fontFamily} onChange={(e) => update({ fontFamily: e.target.value })} style={selectStyle}>
            {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </Group>

        <Group label="Font Size">
          <div style={{ display: "flex", gap: "var(--spacing-xs)", flexWrap: "wrap" }}>
            {FONT_SIZES.map((size) => (
              <Chip key={size} active={settings.fontSize === size} onClick={() => update({ fontSize: size })}>
                {size}
              </Chip>
            ))}
          </div>
        </Group>

        <Group label="Editor Width">
          <div style={{ display: "flex", gap: "var(--spacing-xs)", flexWrap: "wrap" }}>
            {EDITOR_WIDTHS.map((w) => (
              <Chip key={w.value} active={settings.editorWidth === w.value} onClick={() => update({ editorWidth: w.value })}>
                {w.label}
              </Chip>
            ))}
          </div>
        </Group>

        <Group label="Background">
          <div style={{ display: "flex", gap: "var(--spacing-sm)", flexWrap: "wrap" }}>
            {BG_COLORS.map((bg) => (
              <button
                key={bg.value}
                onClick={() => update({ bgColor: bg.value })}
                title={bg.label}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "var(--radius-md)",
                  border: settings.bgColor === bg.value
                    ? `2px solid var(--color-brand)`
                    : `1px solid var(--color-border-secondary)`,
                  background: bg.value === "default" ? "var(--color-bg-primary)" : bg.value,
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </Group>

        <AboutSection />
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "var(--spacing-lg)" }}>
      <label style={{
        display: "block",
        fontSize: "var(--font-size-micro)",
        fontWeight: "var(--font-weight-semibold)" as unknown as number,
        color: "var(--color-text-quaternary)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: "var(--spacing-sm)",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "var(--spacing-xs) var(--spacing-sm)",
        borderRadius: "var(--radius-md)",
        border: `1px solid ${active ? "var(--color-brand)" : "var(--color-border-secondary)"}`,
        background: active ? "var(--color-brand)" : "var(--color-bg-primary)",
        color: active ? "white" : "var(--color-text-primary)",
        cursor: "pointer",
        fontSize: "var(--font-size-micro)",
        fontWeight: active ? "var(--font-weight-medium)" as unknown as number : "var(--font-weight-normal)" as unknown as number,
        transition: `all var(--speed-quick) var(--ease-out-cubic)`,
      }}
    >
      {children}
    </button>
  );
}

function AboutSection() {
  const [showChangelog, setShowChangelog] = useState(false);
  const current = CHANGELOG[0];

  const formattedDate = new Date(APP_RELEASE_DATE + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={{ borderTop: "1px solid var(--color-border-primary)", paddingTop: "var(--spacing-md)", marginTop: "var(--spacing-sm)" }}>
      <div style={{ fontSize: "var(--font-size-small)", fontWeight: "var(--font-weight-semibold)" as unknown as number, color: "var(--color-text-primary)" }}>
        Markdown
      </div>
      <div style={{ fontSize: "var(--font-size-micro)", color: "var(--color-text-tertiary)", marginTop: "2px" }}>
        Version {APP_VERSION} "{APP_CODENAME}"
      </div>
      <div style={{ fontSize: "var(--font-size-micro)", color: "var(--color-text-quaternary)", marginTop: "2px" }}>
        {formattedDate}
      </div>

      <button
        onClick={() => setShowChangelog(!showChangelog)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          marginTop: "var(--spacing-sm)",
          fontSize: "var(--font-size-micro)",
          color: "var(--color-brand)",
          cursor: "pointer",
          fontWeight: "var(--font-weight-medium)" as unknown as number,
        }}
      >
        {showChangelog ? "Hide" : "What's new"}
      </button>

      {showChangelog && current && (
        <div style={{ marginTop: "var(--spacing-sm)", fontSize: "var(--font-size-micro)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
          {current.changes.added && current.changes.added.length > 0 && (
            <div style={{ marginBottom: "var(--spacing-xs)" }}>
              <div style={{ fontWeight: "var(--font-weight-semibold)" as unknown as number, color: "var(--color-text-tertiary)", marginBottom: "2px" }}>Added</div>
              {current.changes.added.map((item, i) => (
                <div key={i} style={{ paddingLeft: "var(--spacing-sm)" }}>- {item}</div>
              ))}
            </div>
          )}
          {current.changes.changed && current.changes.changed.length > 0 && (
            <div style={{ marginBottom: "var(--spacing-xs)" }}>
              <div style={{ fontWeight: "var(--font-weight-semibold)" as unknown as number, color: "var(--color-text-tertiary)", marginBottom: "2px" }}>Changed</div>
              {current.changes.changed.map((item, i) => (
                <div key={i} style={{ paddingLeft: "var(--spacing-sm)" }}>- {item}</div>
              ))}
            </div>
          )}
          {current.changes.fixed && current.changes.fixed.length > 0 && (
            <div>
              <div style={{ fontWeight: "var(--font-weight-semibold)" as unknown as number, color: "var(--color-text-tertiary)", marginBottom: "2px" }}>Fixed</div>
              {current.changes.fixed.map((item, i) => (
                <div key={i} style={{ paddingLeft: "var(--spacing-sm)" }}>- {item}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border-secondary)",
  backgroundColor: "var(--color-bg-primary)",
  color: "var(--color-text-primary)",
  fontSize: "var(--font-size-small)",
  cursor: "pointer",
  outline: "none",
};
