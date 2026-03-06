import { useEffect } from "react";
import { load } from "@tauri-apps/plugin-store";
import { useAppState, useAppDispatch, type Settings } from "../stores/AppContext";
import { useWorkspace } from "./useWorkspace";
import type { TabInfo } from "../types";

const storeOpts = { defaults: {}, autoSave: true } as const;

export function useSession() {
  const { workspacePath, settings, favorites, openTabs } = useAppState();
  const dispatch = useAppDispatch();
  const { refreshTree } = useWorkspace();

  // Restore on mount
  useEffect(() => {
    async function restore() {
      try {
        const store = await load("settings.json", storeOpts);
        const savedWs = await store.get<string>("workspacePath");
        const savedSettings = await store.get<Settings>("editorSettings");
        const savedFavs = await store.get<string[]>("favorites");
        const savedTabs = await store.get<TabInfo[]>("openTabs");

        dispatch({
          type: "RESTORE_SESSION",
          workspacePath: savedWs ?? null,
          settings: {
            fontFamily: savedSettings?.fontFamily ?? "system",
            fontSize: savedSettings?.fontSize ?? 16,
            editorWidth: savedSettings?.editorWidth ?? 800,
            bgColor: savedSettings?.bgColor ?? "default",
          },
          favorites: savedFavs ?? [],
          tabs: savedTabs ?? [],
        });

        if (savedWs) refreshTree(savedWs);
      } catch { /* first launch */ }
    }
    restore();
  }, []); // eslint-disable-line

  // Save workspace
  useEffect(() => {
    load("settings.json", storeOpts).then(async (store) => {
      if (workspacePath) await store.set("workspacePath", workspacePath);
      else await store.delete("workspacePath");
    }).catch(() => {});
  }, [workspacePath]);

  // Save settings
  useEffect(() => {
    load("settings.json", storeOpts).then(async (store) => {
      await store.set("editorSettings", settings);
    }).catch(() => {});
  }, [settings]);

  // Save favorites
  useEffect(() => {
    load("settings.json", storeOpts).then(async (store) => {
      await store.set("favorites", favorites);
    }).catch(() => {});
  }, [favorites]);

  // Save open tabs
  useEffect(() => {
    load("settings.json", storeOpts).then(async (store) => {
      await store.set("openTabs", openTabs);
    }).catch(() => {});
  }, [openTabs]);
}
