import { load } from "@tauri-apps/plugin-store";
import { useAppDispatch } from "../stores/AppContext";

let storePromise: ReturnType<typeof load> | null = null;

function getStore() {
  if (!storePromise) {
    storePromise = load("settings.json", {
      defaults: {},
      autoSave: true,
    });
  }
  return storePromise;
}

export function useRecentFiles() {
  const dispatch = useAppDispatch();

  async function loadRecentFiles() {
    try {
      const store = await getStore();
      const files = await store.get<string[]>("recentFiles");
      dispatch({ type: "SET_RECENT_FILES", files: files ?? [] });
      return files ?? [];
    } catch {
      return [];
    }
  }

  async function addRecentFile(path: string) {
    try {
      const store = await getStore();
      const files = (await store.get<string[]>("recentFiles")) ?? [];
      const updated = [path, ...files.filter((f) => f !== path)].slice(0, 10);
      await store.set("recentFiles", updated);
      dispatch({ type: "SET_RECENT_FILES", files: updated });
    } catch {
      // Silently fail — not critical
    }
  }

  return { loadRecentFiles, addRecentFile };
}
