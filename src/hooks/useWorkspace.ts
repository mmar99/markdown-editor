import { open } from "@tauri-apps/plugin-dialog";
import { readDir } from "@tauri-apps/plugin-fs";
import { useAppDispatch } from "../stores/AppContext";
import type { FileNode } from "../types";

const MD_EXTENSIONS = [".md", ".markdown", ".mdx", ".txt"];

function isMarkdownFile(name: string): boolean {
  return MD_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
}

async function buildTree(dirPath: string, depth = 0): Promise<FileNode[]> {
  if (depth > 5) return []; // Prevent too-deep recursion

  try {
    const entries = await readDir(dirPath);
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      // Skip hidden files/folders and common non-content directories
      if (entry.name?.startsWith(".")) continue;
      if (["node_modules", "dist", "build", "target", "__pycache__", ".git", "venv", "env"].includes(entry.name ?? "")) continue;

      const entryPath = `${dirPath}/${entry.name}`;

      if (entry.isDirectory) {
        const children = await buildTree(entryPath, depth + 1);
        // Only include directories that contain markdown files (directly or nested)
        if (children.length > 0) {
          nodes.push({
            name: entry.name ?? "",
            path: entryPath,
            isDirectory: true,
            children,
          });
        }
      } else if (entry.name && isMarkdownFile(entry.name)) {
        nodes.push({
          name: entry.name,
          path: entryPath,
          isDirectory: false,
        });
      }
    }

    // Sort: directories first, then files, both alphabetically
    nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  } catch {
    return [];
  }
}

export function useWorkspace() {
  const dispatch = useAppDispatch();

  async function openFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (!selected) return;

    const tree = await buildTree(selected);
    dispatch({ type: "SET_WORKSPACE", path: selected, tree });
  }

  async function refreshTree(dirPath: string) {
    const tree = await buildTree(dirPath);
    dispatch({ type: "SET_FILE_TREE", tree });
  }

  return { openFolder, refreshTree };
}
