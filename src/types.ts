/**
 * WebMCP type definitions for the W3C `document.modelContext` API.
 *
 * Based on the WebMCP Community Group draft (October 2026) and the
 * Chrome 149+ implementation. Legacy members (`navigator.modelContext`,
 * `unregisterTool`, `provideContext`, `clearContext`,
 * `navigator.modelContextTesting`) are kept as optional/deprecated types so
 * older Chrome builds keep working.
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
//
// The spec's `ToolAnnotations` dictionary defines `readOnlyHint`,
// `untrustedContentHint`, `consequentialHint` and `debugging` (all default
// to false). The remaining fields are **library-level extensions** inspired
// by the MCP specification; the browser ignores them.
// ---------------------------------------------------------------------------

export interface ToolAnnotations {
  /** Indicates the tool does not modify any state and only reads data. */
  readOnlyHint?: boolean;
  /**
   * Indicates the tool's output contains data that is untrusted from the
   * perspective of the author registering the tool (e.g. user-generated or
   * third-party content).
   */
  untrustedContentHint?: boolean;
  /**
   * Indicates executing the tool results in consequential actions that are
   * significant, real-world, or non-reversible (e.g. booking a flight,
   * transferring money).
   */
  consequentialHint?: boolean;
  /** Indicates the tool is intended for debugging / developer tooling. */
  debugging?: boolean;
  /**
   * Indicates the tool performs a destructive/irreversible operation.
   * **Library extension** — prefer the spec's `consequentialHint`.
   */
  destructiveHint?: boolean;
  /**
   * Indicates the tool is idempotent (safe to retry).
   * **Library extension** — not part of the spec.
   */
  idempotentHint?: boolean;
  /**
   * Indicates results can be cached.
   * **Library extension** — not part of the spec.
   */
  cache?: boolean;
}

/** Options passed to a tool's `execute` callback by the browser. */
export interface ToolExecuteOptions {
  /** Aborted when the agent cancels the tool execution. */
  signal: AbortSignal;
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
  /**
   * Unique tool name (e.g. "searchFlights"). Per spec: 1–128 characters of
   * ASCII alphanumerics, `_`, `-` or `.`.
   */
  name: string;
  /** Optional human-readable label shown in browser UI (ideally localized). */
  title?: string;
  /** Human-readable description for agents. */
  description: string;
  /**
   * JSON Schema describing the tool's input parameters. Optional per spec;
   * a tool without one still receives an input object.
   */
  inputSchema?: JSONSchema | Record<string, never>;
  /**
   * Optional JSON Schema describing the tool's output.
   *
   * **Library extension** — `outputSchema` is NOT part of the browser's
   * `ModelContextTool` dictionary.  It is silently ignored by
   * `document.modelContext.registerTool()` but can be used by higher-level
   * agent frameworks that inspect tool metadata.
   */
  outputSchema?: JSONSchema | JSONSchemaProperty;
  /** Optional metadata hints for agents. */
  annotations?: ToolAnnotations;
  /**
   * The function called when an agent invokes this tool. The browser passes
   * `{ signal }`, which is aborted if the execution is cancelled.
   */
  execute: (
    input: Record<string, unknown>,
    options?: ToolExecuteOptions,
  ) => unknown | Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Hook configuration — what consumers pass to useWebMCPTool
// ---------------------------------------------------------------------------

export interface UseWebMCPToolConfig {
  /** Unique tool name (1–128 chars of `[A-Za-z0-9_.-]`). */
  name: string;
  /** Optional human-readable label shown in browser UI. */
  title?: string;
  /** Human-readable description for agents. */
  description: string;
  /** JSON Schema for the tool's input parameters (optional per spec). */
  inputSchema?: JSONSchema | Record<string, never>;
  /**
   * Optional JSON Schema for the tool's output.
   *
   * **Library extension** — not part of the browser's native WebIDL.
   */
  outputSchema?: JSONSchema | JSONSchemaProperty;
  /** Optional metadata hints for agents. */
  annotations?: ToolAnnotations;
  /**
   * Origins (in this document's frame tree) the tool is additionally
   * exposed to, e.g. a cross-origin parent hosting an in-page agent.
   */
  exposedTo?: string[];
  /**
   * The handler function called when the tool is invoked. Receives
   * `{ signal }` from the browser, aborted if the execution is cancelled.
   */
  execute: (
    input: Record<string, unknown>,
    options?: ToolExecuteOptions,
  ) => unknown | Promise<unknown>;
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
// ModelContext — document.modelContext
// ---------------------------------------------------------------------------

/** Options for `registerTool()`. */
export interface ModelContextRegisterToolOptions {
  /** Origins the tool is exposed to besides same-origin documents. */
  exposedTo?: string[];
  /** Aborting this signal unregisters the tool. */
  signal?: AbortSignal;
}

/** Options for `getTools()`. */
export interface ModelContextGetToolsOptions {
  /** Cross-origin documents (in this frame tree) to also query. */
  fromOrigins?: string[];
}

/** Options for `executeTool()`. */
export interface ModelContextExecuteToolOptions {
  /** Aborting this signal cancels the execution. */
  signal?: AbortSignal;
}

/** A tool as returned by `document.modelContext.getTools()`. */
export interface RegisteredTool {
  name: string;
  title?: string;
  description: string;
  /**
   * JSON Schema object per spec. Chrome 153 still returns it as a JSON
   * string, so handle both.
   */
  inputSchema?: JSONSchema | string;
  /** The `Window` of the document that registered the tool. */
  window: Window;
  /** Serialized origin of the document that registered the tool. */
  origin: string;
  annotations?: ToolAnnotations;
}

export interface ModelContext extends EventTarget {
  /**
   * Register a tool. Resolves once registered; rejects with
   * `InvalidStateError` for an invalid/duplicate name or empty description,
   * `NotAllowedError` when the "tools" permissions policy blocks it, or the
   * signal's abort reason. Unregister by aborting `options.signal`.
   */
  registerTool(
    tool: WebMCPToolDefinition,
    options?: ModelContextRegisterToolOptions,
  ): Promise<void>;
  /** Tools exposed to this document (from it and its descendant frames), sorted by name. */
  getTools(options?: ModelContextGetToolsOptions): Promise<RegisteredTool[]>;
  /**
   * Execute a tool. Resolves with the JSON-stringified result.
   * Chrome 153 still expects `input` as a JSON string; see
   * `executeWebMCPTool()` for a helper that handles both.
   */
  executeTool(
    tool: RegisteredTool,
    input?: Record<string, unknown> | string,
    options?: ModelContextExecuteToolOptions,
  ): Promise<string>;
  ontoolchange: ((this: ModelContext, ev: Event) => unknown) | null;
  ontoolactivated?: ((this: ModelContext, ev: ToolActivatedEvent) => unknown) | null;
  ontoolcancel?: ((this: ModelContext, ev: ToolCancelEvent) => unknown) | null;

  /** @deprecated Removed from the spec; abort the registration signal instead. */
  unregisterTool?(name: string): void;
  /** @deprecated Removed from the spec. */
  provideContext?(config: { tools: WebMCPToolDefinition[] }): void;
  /** @deprecated Removed from the spec. */
  clearContext?(): void;
}

/**
 * @deprecated `navigator.modelContextTesting` was removed in Chrome 152.
 * Use `document.modelContext.getTools()` / `executeTool()` instead.
 */
export interface ModelContextTesting {
  /**
   * Returns all registered tools.
   *
   * `inputSchema` is the JSON-stringified schema, not a parsed object.
   */
  listTools(): Array<{
    name: string;
    description: string;
    inputSchema: string;
    readOnlyHint?: boolean;
  }>;
  /**
   * Execute a tool by name with a JSON-encoded input string. Returns the
   * JSON-stringified result, or `null` when the tool triggers a
   * cross-document navigation.
   */
  executeTool(
    toolName: string,
    inputArguments: string,
  ): Promise<string | null>;
  /** Register a callback that fires whenever tools are added/removed/changed. */
  registerToolsChangedCallback(callback: () => void): void;
  /** Retrieve the result of a tool execution that caused a cross-document navigation. */
  getCrossDocumentScriptToolResult(): Promise<string>;
}

declare global {
  interface Document {
    /** WebMCP (Chrome 149+). */
    modelContext?: ModelContext;
  }

  interface Navigator {
    /** @deprecated Legacy location (Chrome ≤151); use `document.modelContext`. */
    modelContext?: ModelContext;
    /** @deprecated Removed in Chrome 152. */
    modelContextTesting?: ModelContextTesting;
  }

  interface WindowEventMap {
    toolactivated: CustomEvent & { toolName: string };
    toolcancel: CustomEvent & { toolName: string };
  }
}
