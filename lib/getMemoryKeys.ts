import { traverse } from "./traverse.ts";

// deno-lint-ignore ban-types
export function getMemoryKeys(memories: object) {
  const memoryKeys: string[] = [];
  traverse(memories, (path) => {
    memoryKeys.push(path.join("."));
  });
  return memoryKeys;
}
