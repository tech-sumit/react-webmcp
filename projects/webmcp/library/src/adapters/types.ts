/**
 * Type definitions for the WebMCP adapter layer.
 *
 * These types support the runtime schema collector engine that enables
 * third-party UI component libraries (e.g. Material UI) to work with
 * the WebMCP tool registration API.
 */

// ---------------------------------------------------------------------------
// Field definition — metadata for a single tool parameter
// ---------------------------------------------------------------------------

/**
 * Describes a single field (tool parameter) collected from React children,
 * the `fields` prop, or via `useRegisterField`.
 *
 * @example
 * ```ts
 * const field: FieldDefinition = {
 *   name: "email",
 *   type: "email",
 *   required: true,
 *   description: "Recipient's email address",
 * };
 * ```
 */
export interface FieldDefinition {
  /** Field name — must be unique within a tool. */
  name: string;
  /** HTML input type (e.g. "text", "email", "number"). Defaults to "string". */
  type?: string;
  /** Whether the field is required. */
  required?: boolean;
  /** Human-readable title for agents. */
  title?: string;
  /** Human-readable description for agents. */
  description?: string;
  /** Minimum numeric value (maps to JSON Schema `minimum`). */
  min?: number;
  /** Maximum numeric value (maps to JSON Schema `maximum`). */
  max?: number;
  /** Minimum string length (maps to JSON Schema `minLength`). */
  minLength?: number;
  /** Maximum string length (maps to JSON Schema `maxLength`). */
  maxLength?: number;
  /** Regex pattern for string validation (maps to JSON Schema `pattern`). */
  pattern?: string;
  /** Allowed values — mapped to JSON Schema `enum`. */
  enumValues?: (string | number | boolean)[];
  /** Labelled options — mapped to JSON Schema `oneOf`. */
  oneOf?: { value: string | number | boolean; label: string }[];
}

// ---------------------------------------------------------------------------
// Tool context — registration API provided to children
// ---------------------------------------------------------------------------

/**
 * The context value provided by `WebMCP.Tool` to its children.
 * Used by `useRegisterField` to dynamically register fields.
 */
export interface ToolContextValue {
  /** Register a field definition. Replaces any existing field with the same name. */
  registerField: (field: FieldDefinition) => void;
  /** Unregister a field by name (called on component unmount). */
  unregisterField: (name: string) => void;
}
