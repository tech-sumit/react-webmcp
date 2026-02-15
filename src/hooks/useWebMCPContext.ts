import { useEffect } from "react";
import type { WebMCPToolDefinition } from "../types";
import { getModelContext, warnIfUnavailable } from "../utils/modelContext";

/**
 * Register multiple WebMCP tools at once using `provideContext()`.
 *
 * Unlike `useWebMCPTool` which manages a single tool, `useWebMCPContext`
 * replaces the entire set of registered tools. This is useful when the
 * application state changes significantly and you want to expose a
 * completely different set of tools.
 *
 * On unmount, all tools are cleared via `clearContext()`.
 *
 * @example
 * ```tsx
 * useWebMCPContext({
 *   tools: [
 *     {
 *       name: "addTodo",
 *       description: "Add a new item to the todo list",
 *       inputSchema: { type: "object", properties: { text: { type: "string" } } },
 *       execute: ({ text }) => ({ content: [{ type: "text", text: `Added: ${text}` }] }),
 *     },
 *     {
 *       name: "markComplete",
 *       description: "Mark a todo item as complete",
 *       inputSchema: { type: "object", properties: { id: { type: "string" } } },
 *       execute: ({ id }) => ({ content: [{ type: "text", text: `Completed: ${id}` }] }),
 *     },
 *   ],
 * });
 * ```
 */
export function useWebMCPContext(config: {
  tools: WebMCPToolDefinition[];
}): void {
  useEffect(() => {
    const mc = getModelContext();
    if (!mc) {
      warnIfUnavailable("useWebMCPContext");
      return;
    }

    try {
      mc.provideContext({ tools: config.tools });
    } catch (err) {
      console.error("[react-webmcp] Failed to provide context:", err);
    }

    return () => {
      try {
        mc.clearContext();
      } catch {
        // Context may have already been cleared
      }
    };
  }, [config.tools]);
}
