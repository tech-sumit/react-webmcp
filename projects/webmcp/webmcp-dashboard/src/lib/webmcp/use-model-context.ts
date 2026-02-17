import { useEffect, useRef } from "react";
import type { WebMCPToolDefinition, MCPTool, JSONSchemaProperty } from "./types";
import type { z } from "zod";

/**
 * Registry that manages tool registrations with navigator.modelContext
 *
 * This is the core replacement for @mcp-b/react-webmcp's useWebMCP hook.
 * It uses the native navigator.modelContext API (WebMCP proposal) to register
 * tools that AI agents can discover and invoke.
 *
 * If navigator.modelContext is not available (e.g., browser doesn't support it yet),
 * tools are stored in a local registry that can be queried by the built-in
 * window.ai chat integration.
 */
const toolRegistry = new Map<
  string,
  {
    tool: MCPTool;
    handler: (args: Record<string, unknown>) => Promise<unknown>;
  }
>();

/**
 * Convert a Zod schema to JSON Schema for modelContext registration
 */
function zodToJsonSchema(
  schema: Record<string, z.ZodTypeAny>
): { properties: Record<string, JSONSchemaProperty>; required: string[] } {
  const properties: Record<string, JSONSchemaProperty> = {};
  const required: string[] = [];

  for (const [key, zodType] of Object.entries(schema)) {
    const prop = zodTypeToJsonSchema(zodType);
    properties[key] = prop;

    if (!zodType.isOptional?.()) {
      required.push(key);
    }
  }

  return { properties, required };
}

function zodTypeToJsonSchema(zodType: z.ZodTypeAny): JSONSchemaProperty {
  const description = zodType.description;
  const def = zodType._def;

  // Handle optional/default wrappers
  if (def.typeName === "ZodOptional" || def.typeName === "ZodDefault") {
    const inner = zodTypeToJsonSchema(def.innerType);
    if (def.typeName === "ZodDefault") {
      inner.default = def.defaultValue();
    }
    if (description) inner.description = description;
    return inner;
  }

  // Handle enum
  if (def.typeName === "ZodEnum") {
    return { type: "string", enum: def.values, description };
  }

  // Handle array
  if (def.typeName === "ZodArray") {
    return {
      type: "array",
      items: zodTypeToJsonSchema(def.type),
      description,
    };
  }

  // Handle number
  if (def.typeName === "ZodNumber") {
    const prop: JSONSchemaProperty = { type: "number", description };
    for (const check of def.checks || []) {
      if (check.kind === "min") prop.minimum = check.value;
      if (check.kind === "max") prop.maximum = check.value;
      if (check.kind === "int") prop.type = "integer";
    }
    return prop;
  }

  // Handle string
  if (def.typeName === "ZodString") {
    const prop: JSONSchemaProperty = { type: "string", description };
    for (const check of def.checks || []) {
      if (check.kind === "min") prop.minLength = check.value;
      if (check.kind === "max") prop.maxLength = check.value;
    }
    return prop;
  }

  // Handle boolean
  if (def.typeName === "ZodBoolean") {
    return { type: "boolean", description };
  }

  // Handle record
  if (def.typeName === "ZodRecord") {
    return { type: "object", description };
  }

  // Fallback
  return { type: "string", description };
}

/**
 * useModelContext - Register a tool with navigator.modelContext
 *
 * Drop-in replacement for useWebMCP from @mcp-b/react-webmcp.
 * Uses the native WebMCP browser API when available, falls back to
 * an internal registry for use with the built-in window.ai chat.
 *
 * @example
 * ```tsx
 * useModelContext({
 *   name: 'navigate',
 *   description: 'Navigate to a route',
 *   inputSchema: { to: z.string() },
 *   handler: async (input) => {
 *     router.navigate({ to: input.to });
 *     return `Navigated to ${input.to}`;
 *   },
 * });
 * ```
 */
export function useModelContext(toolDef: WebMCPToolDefinition) {
  const handlerRef = useRef(toolDef.handler);
  handlerRef.current = toolDef.handler;

  useEffect(() => {
    const { properties, required } = zodToJsonSchema(toolDef.inputSchema);

    const mcpTool: MCPTool = {
      name: toolDef.name,
      description: toolDef.description,
      inputSchema: {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
      },
      annotations: toolDef.annotations,
    };

    const handler = async (args: Record<string, unknown>) => {
      return handlerRef.current(args);
    };

    // Register with navigator.modelContext if available
    if (navigator.modelContext) {
      try {
        navigator.modelContext.addTool(mcpTool, handler);
      } catch (e) {
        console.warn(`[WebMCP] Failed to register tool "${toolDef.name}" with navigator.modelContext:`, e);
      }
    }

    // Always register in local registry for the built-in chat
    toolRegistry.set(toolDef.name, { tool: mcpTool, handler });

    return () => {
      // Cleanup on unmount
      if (navigator.modelContext) {
        try {
          navigator.modelContext.removeTool(toolDef.name);
        } catch {
          // Tool may already be removed
        }
      }
      toolRegistry.delete(toolDef.name);
    };
  }, [toolDef.name, toolDef.description]);
}

/**
 * Get all registered tools from the local registry.
 * Used by the built-in AI chat to know which tools are available.
 */
export function getRegisteredTools(): MCPTool[] {
  return Array.from(toolRegistry.values()).map((entry) => entry.tool);
}

/**
 * Execute a registered tool by name with the given arguments.
 * Used by the built-in AI chat to invoke tools.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const entry = toolRegistry.get(name);
  if (!entry) {
    throw new Error(`Tool "${name}" not found. Available: ${Array.from(toolRegistry.keys()).join(", ")}`);
  }
  return entry.handler(args);
}
