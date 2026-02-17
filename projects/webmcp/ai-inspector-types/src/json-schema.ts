/**
 * JSON Schema types aligned with the react-webmcp library
 * (projects/webmcp/library/src/types.ts) and the WebMCP specification.
 */

export interface JSONSchema {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean";
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  description?: string;
  items?: JSONSchemaProperty;
}

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
