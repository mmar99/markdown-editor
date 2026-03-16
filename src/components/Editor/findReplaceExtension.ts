/**
 * FindReplace — TipTap extension for in-page search and replace.
 *
 * HOW IT WORKS:
 * 1. Call editor.commands.setSearchTerm(query, caseSensitive?)
 *    → Scans the document, creates yellow Decorations on every match
 *    → Stores match positions in plugin state
 * 2. editor.commands.findNext() / findPrev()
 *    → Advances the active match index → amber Decoration on current
 *    → Returns { matchCount, currentIndex } via extension.storage
 * 3. editor.commands.replaceOne(replacement)
 *    → Replaces the active match, advances to next
 *    → Triggers onUpdate → isDirty (correct — document was modified)
 * 4. editor.commands.replaceAll(replacement)
 *    → Single transaction replacing every match (1 Cmd+Z undoes all)
 * 5. editor.commands.clearSearch()
 *    → Removes all decorations, resets state
 *
 * Document is NEVER modified by search alone — only by replace commands.
 */

import { Extension } from "@tiptap/react";
import type { Transaction } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

const findReplaceKey = new PluginKey<FindReplaceState>("findReplace");

interface Match {
  from: number;
  to: number;
}

interface FindReplaceState {
  matches: Match[];
  currentIndex: number;
  decorations: DecorationSet;
}

interface SetSearchMeta {
  type: "set";
  term: string;
  caseSensitive: boolean;
  doc: ProseMirrorNode;
}

interface NavigateMeta {
  type: "navigate";
  index: number;
}

interface ClearMeta {
  type: "clear";
}

type PluginMeta = SetSearchMeta | NavigateMeta | ClearMeta;

// Escape regex special characters in user input
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Scan the document for all occurrences of term, return their positions
function findMatches(doc: ProseMirrorNode, term: string, caseSensitive: boolean): Match[] {
  if (!term) return [];

  const flags = caseSensitive ? "g" : "gi";
  const regex = new RegExp(escapeRegex(term), flags);
  const matches: Match[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;
    while ((match = regex.exec(node.text)) !== null) {
      matches.push({ from: pos + match.index, to: pos + match.index + match[0].length });
    }
  });

  return matches;
}

// Build DecorationSet from matches + current active index
function buildDecorations(doc: ProseMirrorNode, matches: Match[], currentIndex: number): DecorationSet {
  if (matches.length === 0) return DecorationSet.empty;

  const decorations = matches.map((match, i) =>
    Decoration.inline(match.from, match.to, {
      class: i === currentIndex ? "find-match-active" : "find-match",
    })
  );

  return DecorationSet.create(doc, decorations);
}

// TypeScript declarations for custom commands
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    findReplace: {
      setSearchTerm: (term: string, caseSensitive?: boolean) => ReturnType;
      findNext: () => ReturnType;
      findPrev: () => ReturnType;
      replaceOne: (replacement: string) => ReturnType;
      replaceAll: (replacement: string) => ReturnType;
      clearSearch: () => ReturnType;
    };
  }
}

export const FindReplaceExtension = Extension.create({
  name: "findReplace",

  // storage is readable from outside: editor.extensionStorage.findReplace
  addStorage() {
    return {
      matchCount: 0,
      currentIndex: 0,
    };
  },

  addCommands() {
    return {
      setSearchTerm:
        (term: string, caseSensitive = false) =>
        ({ tr, dispatch, view }: { tr: Transaction; dispatch?: (tr: Transaction) => void; view: EditorView }) => {
          if (dispatch) {
            const meta: SetSearchMeta = { type: "set", term, caseSensitive, doc: view.state.doc };
            tr.setMeta(findReplaceKey, meta);
            dispatch(tr);
          }
          return true;
        },

      findNext:
        () =>
        ({ tr, dispatch, view }: { tr: Transaction; dispatch?: (tr: Transaction) => void; view: EditorView }) => {
          if (dispatch) {
            const pluginState = findReplaceKey.getState(view.state);
            if (!pluginState || pluginState.matches.length === 0) return false;

            const nextIndex = (pluginState.currentIndex + 1) % pluginState.matches.length;
            const meta: NavigateMeta = { type: "navigate", index: nextIndex };
            tr.setMeta(findReplaceKey, meta);
            dispatch(tr);

            // Scroll active match into view
            requestAnimationFrame(() => {
              const state = findReplaceKey.getState(view.state);
              if (!state || state.matches.length === 0) return;
              const match = state.matches[state.currentIndex];
              if (!match) return;
              try {
                const domPos = view.domAtPos(match.from);
                const el = domPos.node instanceof Element
                  ? (domPos.node as HTMLElement)
                  : (domPos.node.parentElement as HTMLElement | null);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
              } catch { /* stale pos */ }
            });
          }
          return true;
        },

      findPrev:
        () =>
        ({ tr, dispatch, view }: { tr: Transaction; dispatch?: (tr: Transaction) => void; view: EditorView }) => {
          if (dispatch) {
            const pluginState = findReplaceKey.getState(view.state);
            if (!pluginState || pluginState.matches.length === 0) return false;

            const prevIndex = (pluginState.currentIndex - 1 + pluginState.matches.length) % pluginState.matches.length;
            const meta: NavigateMeta = { type: "navigate", index: prevIndex };
            tr.setMeta(findReplaceKey, meta);
            dispatch(tr);

            requestAnimationFrame(() => {
              const state = findReplaceKey.getState(view.state);
              if (!state || state.matches.length === 0) return;
              const match = state.matches[state.currentIndex];
              if (!match) return;
              try {
                const domPos = view.domAtPos(match.from);
                const el = domPos.node instanceof Element
                  ? (domPos.node as HTMLElement)
                  : (domPos.node.parentElement as HTMLElement | null);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
              } catch { /* stale pos */ }
            });
          }
          return true;
        },

      replaceOne:
        (replacement: string) =>
        ({ tr, dispatch, view }: { tr: Transaction; dispatch?: (tr: Transaction) => void; view: EditorView }) => {
          if (dispatch) {
            const pluginState = findReplaceKey.getState(view.state);
            if (!pluginState || pluginState.matches.length === 0) return false;

            const match = pluginState.matches[pluginState.currentIndex];
            if (!match) return false;

            // Replace the text at the active match position
            tr.replaceWith(match.from, match.to, view.state.schema.text(replacement));
            dispatch(tr);
            // onUpdate will fire → isDirty = true (intended)
          }
          return true;
        },

      replaceAll:
        (replacement: string) =>
        ({ tr, dispatch, view }: { tr: Transaction; dispatch?: (tr: Transaction) => void; view: EditorView }) => {
          if (dispatch) {
            const pluginState = findReplaceKey.getState(view.state);
            if (!pluginState || pluginState.matches.length === 0) return false;

            // Replace all in a single transaction (single Cmd+Z undoes everything)
            // Process in reverse order to keep positions valid
            const matches = [...pluginState.matches].reverse();
            for (const match of matches) {
              tr.replaceWith(match.from, match.to, view.state.schema.text(replacement));
            }
            dispatch(tr);
          }
          return true;
        },

      clearSearch:
        () =>
        ({ tr, dispatch }: { tr: Transaction; dispatch?: (tr: Transaction) => void }) => {
          if (dispatch) {
            const meta: ClearMeta = { type: "clear" };
            tr.setMeta(findReplaceKey, meta);
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const extensionRef = this;

    return [
      new Plugin({
        key: findReplaceKey,

        state: {
          init(): FindReplaceState {
            return { matches: [], currentIndex: 0, decorations: DecorationSet.empty };
          },

          apply(tr, oldState): FindReplaceState {
            const meta = tr.getMeta(findReplaceKey) as PluginMeta | undefined;

            if (meta?.type === "clear") {
              extensionRef.storage.matchCount = 0;
              extensionRef.storage.currentIndex = 0;
              return { matches: [], currentIndex: 0, decorations: DecorationSet.empty };
            }

            if (meta?.type === "set") {
              const matches = findMatches(meta.doc, meta.term, meta.caseSensitive);
              const currentIndex = 0;
              const decorations = buildDecorations(meta.doc, matches, currentIndex);
              extensionRef.storage.matchCount = matches.length;
              extensionRef.storage.currentIndex = currentIndex;
              return { matches, currentIndex, decorations };
            }

            if (meta?.type === "navigate") {
              const matches = oldState.matches;
              const currentIndex = meta.index;
              const decorations = buildDecorations(tr.doc, matches, currentIndex);
              extensionRef.storage.matchCount = matches.length;
              extensionRef.storage.currentIndex = currentIndex;
              return { matches, currentIndex, decorations };
            }

            // If doc changed (replace), recompute matches keeping same term
            // We don't store the term in plugin state, so we just clear decorations
            // The widget will re-call setSearchTerm after replace
            if (tr.docChanged) {
              const mapped = oldState.matches
                .map((m) => {
                  const from = tr.mapping.map(m.from);
                  const to = tr.mapping.map(m.to);
                  return from < to ? { from, to } : null;
                })
                .filter(Boolean) as Match[];

              const currentIndex = Math.min(oldState.currentIndex, Math.max(0, mapped.length - 1));
              const decorations = buildDecorations(tr.doc, mapped, currentIndex);
              extensionRef.storage.matchCount = mapped.length;
              extensionRef.storage.currentIndex = currentIndex;
              return { matches: mapped, currentIndex, decorations };
            }

            return oldState;
          },
        },

        props: {
          decorations(state) {
            return findReplaceKey.getState(state)?.decorations ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
