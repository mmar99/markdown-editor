/**
 * SearchFlash — A TipTap extension that shows a temporary highlight
 * on searched text when navigating from the command palette.
 *
 * HOW IT WORKS:
 * 1. Call editor.commands.flashSearchResult(from, to)
 * 2. A yellow-orange decoration (visual overlay) appears on those positions
 * 3. After 2s the decoration is removed automatically
 * 4. The document is NEVER modified — purely visual (no "unsaved" trigger)
 */
import { Extension } from "@tiptap/react";
import type { Transaction } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";

const searchFlashKey = new PluginKey("searchFlash");

const CLEAR_FLASH = "clear";

// Declare the custom command for TypeScript
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    searchFlash: {
      flashSearchResult: (from: number, to: number) => ReturnType;
    };
  }
}

export const SearchFlash = Extension.create({
  name: "searchFlash",

  addCommands() {
    return {
      flashSearchResult:
        (from: number, to: number) =>
        ({
          tr,
          dispatch,
          view,
        }: {
          tr: Transaction;
          dispatch?: (tr: Transaction) => void;
          view: EditorView;
        }) => {
          if (dispatch) {
            tr.setMeta(searchFlashKey, { from, to });
            dispatch(tr);

            // Auto-clear after CSS animation finishes (5s + 100ms buffer)
            setTimeout(() => {
              if (view) {
                const clearTr = view.state.tr;
                clearTr.setMeta(searchFlashKey, CLEAR_FLASH);
                view.dispatch(clearTr);
              }
            }, 5100);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchFlashKey,

        state: {
          init() {
            return DecorationSet.empty;
          },

          apply(tr, oldDecorationSet) {
            const meta = tr.getMeta(searchFlashKey);

            // Clear all decorations
            if (meta === CLEAR_FLASH) {
              return DecorationSet.empty;
            }

            // Create new flash decoration
            if (meta && meta.from !== undefined) {
              const decoration = Decoration.inline(meta.from, meta.to, {
                class: "search-flash-highlight",
              });
              return DecorationSet.create(tr.doc, [decoration]);
            }

            // Map existing decorations if document changed
            if (tr.docChanged) {
              return oldDecorationSet.map(tr.mapping, tr.doc);
            }

            return oldDecorationSet;
          },
        },

        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
