import { useEffect, useRef } from "react";
import type { UseWebMCPToolConfig } from "../types";
import {
  getModelContext,
  registerToolWithSignal,
  validateToolDefinition,
  warnIfUnavailable,
} from "../utils/modelContext";

/**
 * Produces a stable fingerprint for a single tool definition so we can
 * detect meaningful changes without being tricked by new object references
 * created on every render (e.g. inline schema literals).
 */
function toolFingerprint(config: UseWebMCPToolConfig): string {
  return `${config.name}::${config.title ?? ""}::${config.description}::${JSON.stringify(config.inputSchema)}::${JSON.stringify(config.outputSchema ?? {})}::${JSON.stringify(config.annotations ?? {})}::${JSON.stringify(config.exposedTo ?? [])}`;
}

/**
 * Register a single WebMCP tool via the imperative API.
 *
 * The tool is registered with `document.modelContext.registerTool(tool,
 * { signal })` when the component mounts and unregistered on unmount by
 * aborting that signal (the spec removed `unregisterTool()`; it is still used
 * on legacy builds). If the tool definition changes (name, title,
 * description, schemas, annotations, or `exposedTo`), the previous tool is
 * unregistered and the new one is registered.
 *
 * Object/array props like `inputSchema` and `annotations` are compared by
 * value (serialised fingerprint), so passing inline literals on every render
 * will **not** cause unnecessary re-registration.
 *
 * The `execute` callback is always called through a ref, so it does not
 * need to be memoised by the consumer.
 *
 * @example
 * ```tsx
 * useWebMCPTool({
 *   name: "searchFlights",
 *   description: "Search for flights with the given parameters.",
 *   inputSchema: {
 *     type: "object",
 *     properties: {
 *       origin: { type: "string", description: "Origin IATA code" },
 *       destination: { type: "string", description: "Destination IATA code" },
 *     },
 *     required: ["origin", "destination"],
 *   },
 *   annotations: { readOnlyHint: true },
 *   execute: async ({ origin, destination }, { signal } = {}) => {
 *     const results = await api.searchFlights(origin, destination, { signal });
 *     return { content: [{ type: "text", text: JSON.stringify(results) }] };
 *   },
 * });
 * ```
 */
export function useWebMCPTool(config: UseWebMCPToolConfig): void {
  const configRef = useRef(config);
  configRef.current = config;

  // Derive a stable fingerprint from the definition values.
  const fingerprint = toolFingerprint(config);

  useEffect(() => {
    const mc = getModelContext();
    if (!mc) {
      warnIfUnavailable("useWebMCPTool");
      return;
    }

    // Per spec: registerTool() rejects with InvalidStateError for an invalid
    // name or empty description. Validate early with a developer-friendly message.
    validateToolDefinition(config);

    // Build the tool definition matching the ModelContextTool dictionary.
    // The execute function is always routed through configRef so callers
    // never need to memoise their handler.
    const toolDef: Record<string, unknown> = {
      name: config.name,
      description: config.description,
      execute: (input: Record<string, unknown>, options?: { signal: AbortSignal }) => {
        return configRef.current.execute(input, options);
      },
    };
    if (config.title) {
      toolDef.title = config.title;
    }
    if (config.inputSchema) {
      toolDef.inputSchema = config.inputSchema;
    }
    if (config.outputSchema) {
      toolDef.outputSchema = config.outputSchema;
    }
    if (config.annotations) {
      toolDef.annotations = config.annotations;
    }

    return registerToolWithSignal(
      mc,
      toolDef as unknown as Parameters<typeof mc.registerTool>[0],
      config.exposedTo ? { exposedTo: config.exposedTo } : {},
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fingerprint
    // captures the serialised value of all definition fields.
  }, [fingerprint]);
}
