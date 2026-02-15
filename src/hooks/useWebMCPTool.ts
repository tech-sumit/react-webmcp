import { useEffect, useRef } from "react";
import type { UseWebMCPToolConfig } from "../types";
import { getModelContext, warnIfUnavailable } from "../utils/modelContext";

/**
 * Produces a stable fingerprint for a single tool definition so we can
 * detect meaningful changes without being tricked by new object references
 * created on every render (e.g. inline schema literals).
 */
function toolFingerprint(config: UseWebMCPToolConfig): string {
  return `${config.name}::${config.description}::${JSON.stringify(config.inputSchema)}::${JSON.stringify(config.outputSchema ?? {})}::${JSON.stringify(config.annotations ?? {})}`;
}

/**
 * Register a single WebMCP tool via the imperative API.
 *
 * The tool is registered with `navigator.modelContext.registerTool()` when
 * the component mounts and unregistered with `unregisterTool()` on unmount.
 * If the tool definition changes (name, description, schemas, or
 * annotations), the previous tool is unregistered and the new one is
 * registered.
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
 *   execute: async ({ origin, destination }) => {
 *     const results = await api.searchFlights(origin, destination);
 *     return { content: [{ type: "text", text: JSON.stringify(results) }] };
 *   },
 * });
 * ```
 */
export function useWebMCPTool(config: UseWebMCPToolConfig): void {
  const registeredNameRef = useRef<string | null>(null);
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

    // Unregister the previous tool if the name changed
    if (registeredNameRef.current && registeredNameRef.current !== config.name) {
      try {
        mc.unregisterTool(registeredNameRef.current);
      } catch {
        // Tool may have already been unregistered
      }
    }

    // Build the tool definition matching the navigator.modelContext shape.
    // The execute function is always routed through configRef so callers
    // never need to memoise their handler.
    const toolDef = {
      name: config.name,
      description: config.description,
      inputSchema: config.inputSchema,
      ...(config.outputSchema ? { outputSchema: config.outputSchema } : {}),
      ...(config.annotations ? { annotations: config.annotations } : {}),
      execute: (input: Record<string, unknown>) => {
        return configRef.current.execute(input);
      },
    };

    try {
      mc.registerTool(toolDef);
      registeredNameRef.current = config.name;
    } catch (err) {
      console.error(`[react-webmcp] Failed to register tool "${config.name}":`, err);
    }

    return () => {
      try {
        mc.unregisterTool(config.name);
      } catch {
        // Tool may have already been unregistered externally
      }
      registeredNameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fingerprint
    // captures the serialised value of all definition fields; config.name
    // is included so the cleanup closure captures the correct name.
  }, [fingerprint, config.name]);
}
