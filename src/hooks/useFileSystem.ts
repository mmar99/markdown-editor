import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { useAppDispatch } from "../stores/AppContext";

export function useFileSystem() {
  const dispatch = useAppDispatch();

  async function openFile() {
    const filePath = await open({
      multiple: false,
      filters: [
        { name: "Markdown", extensions: ["md", "markdown", "txt", "mdx"] },
      ],
    });
    if (!filePath) return;

    const content = await readTextFile(filePath);
    dispatch({ type: "OPEN_FILE", path: filePath, content });
    return filePath;
  }

  async function saveFile(path: string, content: string) {
    await writeTextFile(path, content);
    dispatch({ type: "SAVE_FILE", path, content });
  }

  async function saveFileAs(content: string) {
    const filePath = await save({
      filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
      defaultPath: "untitled.md",
    });
    if (!filePath) return null;

    await writeTextFile(filePath, content);
    dispatch({ type: "SAVE_FILE", path: filePath, content });
    return filePath;
  }

  async function openFileByPath(filePath: string) {
    try {
      console.log("[openFileByPath] Reading:", filePath);
      const content = await readTextFile(filePath);
      console.log("[openFileByPath] Success, length:", content.length);
      dispatch({ type: "OPEN_FILE", path: filePath, content });
      return true;
    } catch (e) {
      console.error("[openFileByPath] FAILED:", filePath, e);
      return false;
    }
  }

  return { openFile, saveFile, saveFileAs, openFileByPath };
}
