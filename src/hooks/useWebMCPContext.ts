import { useEffect, useRef } from "react";
import type { WebMCPToolDefinition } from "../types";
import {
  getModelContext,
  registerToolWithSignal,
  validateToolDefinition,
  warnIfUnavailable,
} from "../utils/modelContext";

/**
 * Produces a stable fingerprint string from a tools array so we can detect
 * meaningful changes without being tricked by new array references.
 * Compares tool names, descriptions, and serialised input schemas.
 */
function toolsFingerprint(tools: WebMCPToolDefinition[]): string {
  return tools
    .map(
      (t) =>
        `${t.name}::${t.title ?? ""}::${t.description}::${JSON.stringify(t.inputSchema)}::${JSON.stringify(t.outputSchema ?? {})}::${JSON.stringify(t.annotations ?? {})}`,
    )
    .join("|");
}

/**
 * Register a set of WebMCP tools at once.
 *
 * Unlike `useWebMCPTool` which manages a single tool, `useWebMCPContext`
 * manages a whole set: when the set changes, every tool in the previous set
 * is unregistered and the new set is registered. This is useful when the
 * application state changes significantly and you want to expose a
 * completely different set of tools.
 *
 * The spec removed `provideContext()` / `clearContext()`, so each tool is
 * registered with `registerTool(tool, { signal })` and unregistered by
 * aborting its signal. Unlike `provideContext()`, tools registered elsewhere
 * on the page (e.g. by `useWebMCPTool`) are left untouched.
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

    // Per spec: registerTool() rejects with InvalidStateError for an invalid
    // name or empty description. Validate early with a developer-friendly message.
    for (const tool of toolsRef.current) {
      validateToolDefinition(tool);
    }

    // Wrap execute functions so they always call through the latest ref,
    // allowing callers to pass inline arrow functions without triggering
    // the effect.
    const unregisters = toolsRef.current.map((tool, idx) => {
      const def: Record<string, unknown> = {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: (input: Record<string, unknown>, options?: { signal: AbortSignal }) => {
          return toolsRef.current[idx].execute(input, options);
        },
      };
      if (tool.title) {
        def.title = tool.title;
      }
      if (tool.annotations) {
        def.annotations = tool.annotations;
      }
      if (tool.outputSchema) {
        def.outputSchema = tool.outputSchema;
      }
      return registerToolWithSignal(
        mc,
        def as unknown as Parameters<typeof mc.registerTool>[0],
      );
    });

    return () => {
      for (const unregister of unregisters) unregister();
    };
  }, [fingerprint]);
}
