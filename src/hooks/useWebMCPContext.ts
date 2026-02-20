import { useEffect, useRef } from "react";
import type { WebMCPToolDefinition } from "../types";
import { getModelContext, warnIfUnavailable } from "../utils/modelContext";

/**
 * Produces a stable fingerprint string from a tools array so we can detect
 * meaningful changes without being tricked by new array references.
 * Compares tool names, descriptions, and serialised input schemas.
 */
function toolsFingerprint(tools: WebMCPToolDefinition[]): string {
  return tools
    .map(
      (t) =>
        `${t.name}::${t.description}::${JSON.stringify(t.inputSchema)}::${JSON.stringify(t.outputSchema ?? {})}::${JSON.stringify(t.annotations ?? {})}`,
    )
    .join("|");
}

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
 * The hook performs a deep comparison of tool definitions (name, description,
 * inputSchema, annotations) so that passing a new array reference on every
 * render does **not** cause unnecessary re-registration.
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
  // Keep a ref to the latest tools so the execute callbacks always close
  // over current handlers without triggering the effect.
  const toolsRef = useRef(config.tools);
  toolsRef.current = config.tools;

  const fingerprint = toolsFingerprint(config.tools);

  useEffect(() => {
    const mc = getModelContext();
    if (!mc) {
      warnIfUnavailable("useWebMCPContext");
      return;
    }

    // Wrap execute functions so they always call through the latest ref,
    // allowing callers to pass inline arrow functions without triggering
    // the effect.
    const stableTools = toolsRef.current.map((tool, idx) => {
      const def: Record<string, unknown> = {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: (input: Record<string, unknown>) => {
          return toolsRef.current[idx].execute(input);
        },
      };
      if (tool.annotations) {
        def.annotations = tool.annotations;
      }
      if (tool.outputSchema) {
        def.outputSchema = tool.outputSchema;
      }
      return def;
    });

    try {
      mc.provideContext({
        tools: stableTools as unknown as Parameters<typeof mc.provideContext>[0]["tools"],
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[react-webmcp] Failed to provide context:", err);
      }
    }

    return () => {
      try {
        mc.clearContext();
      } catch {
        // Context may have already been cleared
      }
    };
  }, [fingerprint]);
}
