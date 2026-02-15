import { useEffect, useRef } from "react";
import type { UseWebMCPToolConfig } from "../types";
import { getModelContext, warnIfUnavailable } from "../utils/modelContext";

/**
 * Register a single WebMCP tool via the imperative API.
 *
 * The tool is registered with `navigator.modelContext.registerTool()` when
 * the component mounts and unregistered with `unregisterTool()` on unmount.
 * If the tool name changes, the previous tool is unregistered and the new
 * one is registered.
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

    // Build the tool definition matching the navigator.modelContext shape
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
  }, [config.name, config.description, config.inputSchema, config.outputSchema, config.annotations]);
}
