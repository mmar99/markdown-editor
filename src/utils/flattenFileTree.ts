import type { FileNode } from "../types";

/** Recursively flattens a nested FileNode tree into a flat array of files (no directories). */
export function flattenFileTree(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = [];
  for (const node of nodes) {
    if (!node.isDirectory) {
      result.push(node);
    }
    if (node.children) {
      result.push(...flattenFileTree(node.children));
    }
  }
  return result;
}
