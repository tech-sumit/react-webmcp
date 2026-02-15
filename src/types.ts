/**
 * WebMCP type definitions for the W3C navigator.modelContext API.
 *
 * Based on the WebMCP Early Preview specification (Feb 2026) and
 * the Chrome 146+ implementation.
 */

// ---------------------------------------------------------------------------
// JSON Schema types (subset used by WebMCP tool definitions)
// ---------------------------------------------------------------------------

export interface JSONSchemaProperty {
  type?: "string" | "number" | "integer" | "boolean" | "array" | "object";
  description?: string;
  enum?: Array<string | number | boolean>;
  oneOf?: Array<{ const: string | number | boolean; title?: string }>;
  const?: string | number | boolean;
  title?: string;
  pattern?: string;
  format?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  default?: unknown;
}

export interface JSONSchema {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean";
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  description?: string;
  items?: JSONSchemaProperty;
}

// ---------------------------------------------------------------------------
// Tool annotations — metadata hints for agents
// ---------------------------------------------------------------------------

export interface ToolAnnotations {
  /** Indicates the tool only reads data and does not modify state. */
  readOnlyHint?: "true" | "false";
  /** Indicates the tool performs a destructive/irreversible operation. */
  destructiveHint?: "true" | "false";
  /** Indicates the tool is idempotent (safe to retry). */
  idempotentHint?: "true" | "false";
  /** Indicates results can be cached. */
  cache?: boolean;
}

// ---------------------------------------------------------------------------
// Tool content — return values from tool execution
// ---------------------------------------------------------------------------

export interface ToolContentText {
  type: "text";
  text: string;
}

export interface ToolContentJSON {
  type: "json";
  json: unknown;
}

export type ToolContent = ToolContentText | ToolContentJSON;

// ---------------------------------------------------------------------------
// Tool definition — the shape passed to registerTool()
// ---------------------------------------------------------------------------

export interface WebMCPToolDefinition {
  /** Unique tool name (e.g. "searchFlights"). */
  name: string;
  /** Human-readable description for agents. */
  description: string;
  /** JSON Schema describing the tool's input parameters. */
  inputSchema: JSONSchema | Record<string, never>;
  /** Optional JSON Schema describing the tool's output. */
  outputSchema?: JSONSchema | JSONSchemaProperty;
  /** Optional metadata hints for agents. */
  annotations?: ToolAnnotations;
  /** The function called when an agent invokes this tool. */
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Hook configuration — what consumers pass to useWebMCPTool
// ---------------------------------------------------------------------------

export interface UseWebMCPToolConfig {
  /** Unique tool name. */
  name: string;
  /** Human-readable description for agents. */
  description: string;
  /** JSON Schema for the tool's input parameters. */
  inputSchema: JSONSchema | Record<string, never>;
  /** Optional JSON Schema for the tool's output. */
  outputSchema?: JSONSchema | JSONSchemaProperty;
  /** Optional metadata hints for agents. */
  annotations?: ToolAnnotations;
  /** The handler function called when the tool is invoked. */
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Context configuration — what consumers pass to useWebMCPContext
// ---------------------------------------------------------------------------

export interface WebMCPContextConfig {
  tools: WebMCPToolDefinition[];
}

// ---------------------------------------------------------------------------
// Declarative form props
// ---------------------------------------------------------------------------

export interface WebMCPFormSubmitEvent extends Event {
  /** True when the form submission was triggered by an AI agent. */
  agentInvoked: boolean;
  /** Pass a promise that resolves with the tool's result data. */
  respondWith: (response: Promise<unknown> | unknown) => void;
}

export interface ToolActivatedEvent extends Event {
  /** The name of the tool that was activated. */
  toolName: string;
}

export interface ToolCancelEvent extends Event {
  /** The name of the tool whose execution was cancelled. */
  toolName: string;
}

// ---------------------------------------------------------------------------
// Navigator augmentation — extends the global Navigator interface
// ---------------------------------------------------------------------------

export interface ModelContext {
  registerTool(tool: WebMCPToolDefinition): void;
  unregisterTool(name: string): void;
  provideContext(config: { tools: WebMCPToolDefinition[] }): void;
  clearContext(): void;
}

export interface ModelContextTesting {
  listTools(): Array<{
    name: string;
    description: string;
    inputSchema: JSONSchema | string;
  }>;
  executeTool(
    name: string,
    inputArgs: Record<string, unknown>,
  ): Promise<unknown>;
  registerToolsChangedCallback(callback: () => void): void;
  getCrossDocumentScriptToolResult(): Promise<unknown>;
}

declare global {
  interface Navigator {
    modelContext?: ModelContext;
    modelContextTesting?: ModelContextTesting;
  }

  interface WindowEventMap {
    toolactivated: CustomEvent & { toolName: string };
    toolcancel: CustomEvent & { toolName: string };
  }
}
