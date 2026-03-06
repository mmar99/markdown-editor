import { useEffect, useRef, useCallback, useState } from "react";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { useAppState, useAppDispatch } from "../stores/AppContext";
import { useWorkspace } from "./useWorkspace";

const TREE_REFRESH_COOLDOWN_MS = 3000; // 3 seconds between tree re-scans

/**
 * Detects external file changes using two reliable mechanisms:
 * 1. Window focus — when the user switches back to the app, check if file changed on disk
 * 2. Cmd+R — manual refresh
 *
 * Also refreshes the sidebar file tree on focus (throttled) so new/deleted files appear.
 *
 * This is the same approach as VS Code, Typora, and most editors.
 * No polling, no file watcher — just check on focus. Simple, reliable, zero CPU.
 */
export function useFileWatcher() {
  const { currentFilePath, originalContent, currentContent, isDirty, workspacePath } = useAppState();
  const dispatch = useAppDispatch();
  const { refreshTree } = useWorkspace();
  const lastTreeRefreshRef = useRef<number>(0);
  const [externalChangeDetected, setExternalChangeDetected] = useState(false);

  const lastKnownRef = useRef(originalContent);
  const isDirtyRef = useRef(isDirty);
  const currentContentRef = useRef(currentContent);
  const currentFileRef = useRef(currentFilePath);

  useEffect(() => { lastKnownRef.current = originalContent; }, [originalContent]);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);
  useEffect(() => { currentContentRef.current = currentContent; }, [currentContent]);
  useEffect(() => { currentFileRef.current = currentFilePath; }, [currentFilePath]);
  useEffect(() => { setExternalChangeDetected(false); }, [currentFilePath]);

  // Check for external changes (called on window focus + Cmd+R)
  const checkForChanges = useCallback(async () => {
    const filePath = currentFileRef.current;
    if (!filePath) return;
    try {
      const disk = await readTextFile(filePath);
      if (disk !== lastKnownRef.current) {
        if (isDirtyRef.current) {
          // Conflict: file changed on disk + user has local edits
          setExternalChangeDetected(true);
        } else {
          // No conflict: silently reload
          lastKnownRef.current = disk;
          dispatch({ type: "OPEN_FILE", path: filePath, content: disk });
        }
      }
    } catch { /* file gone */ }
  }, [dispatch]);

  // Refresh the workspace file tree (throttled to avoid rapid re-scans)
  const refreshWorkspaceTree = useCallback(() => {
    const ws = workspacePathRef.current;
    if (!ws) return;
    const now = Date.now();
    if (now - lastTreeRefreshRef.current > TREE_REFRESH_COOLDOWN_MS) {
      lastTreeRefreshRef.current = now;
      refreshTree(ws);
    }
  }, [refreshTree]);

  // Keep workspacePath in a ref so the focus callback doesn't re-register on every change
  const workspacePathRef = useRef(workspacePath);
  useEffect(() => { workspacePathRef.current = workspacePath; }, [workspacePath]);

  // Listen for window focus events
  useEffect(() => {
    const onFocus = () => {
      checkForChanges();
      refreshWorkspaceTree();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkForChanges, refreshWorkspaceTree]);

  // Reload: discard local, load disk version
  const reload = useCallback(async () => {
    const filePath = currentFileRef.current;
    if (!filePath) return;
    try {
      const disk = await readTextFile(filePath);
      lastKnownRef.current = disk;
      dispatch({ type: "OPEN_FILE", path: filePath, content: disk });
      setExternalChangeDetected(false);
    } catch {}
  }, [dispatch]);

  // Keep mine: dismiss, update baseline
  const keepMine = useCallback(async () => {
    const filePath = currentFileRef.current;
    if (!filePath) return;
    try {
      const disk = await readTextFile(filePath);
      lastKnownRef.current = disk;
      setExternalChangeDetected(false);
    } catch {}
  }, []);

  // Keep both: save my edits as copy, then reload external
  const keepBoth = useCallback(async () => {
    const filePath = currentFileRef.current;
    if (!filePath) return;
    try {
      const ext = filePath.match(/\.[^.]+$/)?.[0] ?? ".md";
      const base = filePath.replace(/\.[^.]+$/, "");
      const copyPath = `${base} (my edits)${ext}`;
      await writeTextFile(copyPath, currentContentRef.current);
      const disk = await readTextFile(filePath);
      lastKnownRef.current = disk;
      dispatch({ type: "OPEN_FILE", path: filePath, content: disk });
      setExternalChangeDetected(false);
    } catch {}
  }, [dispatch]);

  // Manual refresh (Cmd+R)
  const refreshFile = useCallback(async () => {
    await checkForChanges();
  }, [checkForChanges]);

  const dismiss = useCallback(() => { setExternalChangeDetected(false); }, []);

  return { externalChangeDetected, reload, keepMine, keepBoth, dismiss, refreshFile };
}
