# Markdown Editor — Project Instructions

## Release Process (MANDATORY)

**Every time you build the app, you MUST follow this process:**

### 1. Pre-build
- `npx tsc --noEmit` — zero errors required
- Kill any running instance: `pkill -f "Markdown" 2>/dev/null`
- Eject any mounted DMG: `hdiutil detach /Volumes/Markdown 2>/dev/null`

### 2. Build
- `source /Users/aymardumoulin/.cargo/env && npm run tauri build`
- Verify both `.app` and `.dmg` are produced

### 3. Post-build verification (ADAPT TO CHANGES)
**Before running tests, ask yourself: "What did I just change?"**
Then design tests that specifically verify those changes work:

- If you changed **UI components** → Launch app, verify it opens, visually check the component renders
- If you changed **file operations** → Test open/save/close with a real `.md` file
- If you changed **keyboard shortcuts** → List which shortcuts changed, note them for user to test
- If you changed **state/persistence** → Launch, make change, quit, relaunch, verify state persisted
- If you changed **Rust backend** → Verify the app binary runs, check for crash logs
- If you changed **CSS/styling** → Launch and note which visual elements the user should check

### 4. Always run these base checks:
```bash
# App launches
open path/to/Markdown.app && sleep 3 && pgrep -f "markdown-editor" && echo "PASS" || echo "FAIL"

# Bundle integrity
ls -lh path/to/Markdown.app/Contents/MacOS/markdown-editor
```

### 5. Deploy
- Copy DMG to Desktop: `cp path/to/dmg /Users/aymardumoulin/Desktop/Markdown.dmg`
- Tell the user what to manually verify based on changes made

---

## Design System Enforcement (MANDATORY)

**ALL visual changes MUST use the design tokens** from `src/styles/tokens.css`.

### Rules

1. **NEVER use hardcoded colors** — Use `var(--color-*)` tokens. No `#hex` values in component code.
2. **NEVER use hardcoded font sizes** — Use `var(--font-size-*)` tokens.
3. **NEVER use hardcoded spacing** — Use `var(--spacing-*)` tokens.
4. **NEVER use hardcoded border-radius** — Use `var(--radius-*)` tokens.
5. **NEVER use hardcoded shadows** — Use `var(--shadow-*)` tokens.
6. **NEVER use hardcoded transitions** — Use `var(--speed-*)` and `var(--ease-*)` tokens.
7. **NEVER use hardcoded font families** — Use `var(--font-regular)`, `var(--font-display)`, `var(--font-monospace)`.
8. **NEVER use hardcoded font weights** — Use `var(--font-weight-*)` tokens.

### Exceptions (where hardcoded values ARE allowed)
- Syntax highlighting colors in `editor.css` (`.hljs-*` classes)
- Emoji characters
- `mark` background colors (highlight extension)
- SVG/icon sizing
- Layout values (flex, grid, width/height of structural elements)
- Print `@media print` styles (needs absolute values for paper)
- Export HTML templates (standalone files, can't use CSS vars)

### Before implementing ANY visual feature:
1. Check `src/styles/tokens.css` for available tokens
2. If a token doesn't exist, ADD it to `tokens.css` first
3. Reference: `/Users/aymardumoulin/Projects/Markdown Project/markdown-design-tokens.md`

---

## Versioning / Release Process

### Convention
- **Semantic Versioning**: MAJOR.MINOR.PATCH (e.g., 0.2.0)
- **Codenames**: Each release has a writing-themed codename (e.g., "Quill", "Genesis")

### Source of truth
- `src/version.ts` — Frontend version, codename, release date, changelog data
- These 3 config files must match the version number:
  - `package.json` (`"version"` field)
  - `src-tauri/Cargo.toml` (`version` field)
  - `src-tauri/tauri.conf.json` (`"version"` field)

### Steps to release a new version
1. Update `APP_VERSION`, `APP_CODENAME`, `APP_RELEASE_DATE` in `src/version.ts`
2. Add a new entry to the `CHANGELOG` array in `src/version.ts`
3. Update version in `package.json`, `Cargo.toml`, `tauri.conf.json`
4. Update `CHANGELOG.md` with the same content
5. Commit: `git commit -m "release: vX.Y.Z Codename"`
6. Tag: `git tag -a vX.Y.Z -m "Release X.Y.Z Codename"`
7. Build the app (follow the build process above)
8. Push: `git push origin main --tags`
9. Create GitHub release: `gh release create vX.Y.Z --title "vX.Y.Z Codename" --notes-file CHANGELOG.md`
10. Optionally attach DMG: `gh release upload vX.Y.Z path/to/Markdown.dmg`

---

## Architecture

- **Framework**: Tauri v2 (Rust backend + React frontend)
- **Editor**: TipTap with `@tiptap/markdown` — always use `{ contentType: "markdown" }` with `setContent()`
- **State**: React Context (`src/stores/AppContext.tsx`)
- **Design tokens**: `src/styles/tokens.css` (source of truth)
- **File watching**: On window focus, not polling (like VS Code)
- **Print/PDF**: Use `window.print()` with `@media print` CSS

## File Structure
- `src/version.ts` — App version, codename, changelog (frontend source of truth)
- `src/styles/tokens.css` — Design system tokens
- `src/styles/globals.css` — Base styles
- `src/components/Editor/editor.css` — Editor content styling
- `src/components/Editor/extensions.ts` — TipTap extensions
- `src/stores/AppContext.tsx` — App state + settings
- `src-tauri/src/lib.rs` — Rust backend
