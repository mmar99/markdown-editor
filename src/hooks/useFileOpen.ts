import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useAppDispatch } from "../stores/AppContext";

/**
 * Handles files opened via macOS "Open With" or double-click.
 *
 * Two mechanisms:
 * 1. On mount: Checks if files were passed at app launch (before frontend was ready)
 * 2. Ongoing: Listens for files opened while the app is already running
 */
export function useFileOpen() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // 1. Check for files passed at launch
    async function checkInitialFiles() {
      try {
        const files = await invoke<string[]>("get_opened_files");
        if (files.length > 0) {
          const filePath = files[0];
          const content = await readTextFile(filePath);
          dispatch({ type: "OPEN_FILE", path: filePath, content });
        }
      } catch (e) {
        console.error("Failed to check initial files:", e);
      }
    }
    checkInitialFiles();

    // 2. Listen for files opened while app is running
    const unlisten = listen<string[]>("open-files", async (event) => {
      const files = event.payload;
      if (files.length > 0) {
        try {
          const filePath = files[0];
          const content = await readTextFile(filePath);
          dispatch({ type: "OPEN_FILE", path: filePath, content });
        } catch (e) {
          console.error("Failed to open file from event:", e);
        }
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [dispatch]);
}
