/**
 * Tool types aligned with the WebMCP specification (script_tools/ WebIDL)
 * and the react-webmcp library (projects/webmcp/library/src/types.ts).
 */

import type { JSONSchema } from "./json-schema.js";

/**
 * Annotations for a WebMCP tool.
 * Per the browser WebIDL (AnnotationsDict), only `readOnlyHint` is browser-native.
 * The library (react-webmcp) extends this with additional hints.
 */
export interface ToolAnnotations {
  /** Browser-native (per WebIDL AnnotationsDict): indicates tool only reads data */
  readOnlyHint?: boolean;
  /** Library extension: destructive/irreversible operation */
  destructiveHint?: boolean;
  /** Library extension: safe to retry */
  idempotentHint?: boolean;
  /** Library extension: results can be cached */
  cache?: boolean;
}

/**
 * Structured content returned by a tool's execute callback.
 * Matches react-webmcp library's ToolContent type.
 */
export interface ToolContentText {
  type: "text";
  text: string;
}

export interface ToolContentJSON {
  type: "json";
  json: unknown;
}

export type ToolContent = ToolContentText | ToolContentJSON;

/**
 * A WebMCP tool definition as registered via `navigator.modelContext.registerTool()`.
 *
 * Per the WebIDL (ToolRegistrationParams):
 * - `inputSchema` is an `object` (JSON Schema), NOT a DOMString
 * - `execute` is a ToolFunction callback (not included here; this is the metadata only)
 *
 * The library uses `JSONSchema | Record<string, never>` where `Record<string, never>`
 * represents `{}` (empty schema for tools with no inputs).
 */
export interface WebMCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema | Record<string, never>;
  /** Library extension: output schema for structured results */
  outputSchema?: JSONSchema;
  annotations?: ToolAnnotations;
}

/**
 * A tool as returned by `navigator.modelContextTesting.listTools()`.
 *
 * Per the WebIDL spec, `inputSchema` is a `DOMString` — the JSON-stringified
 * schema, NOT a parsed object. This is important: consumers must `JSON.parse()`
 * it before using it as a schema object (e.g., when passing to MCP clients).
 */
export interface DiscoveredTool {
  name: string;
  description: string;
  /** JSON-stringified input schema (DOMString per WebMCP spec) */
  inputSchema: string;
}
