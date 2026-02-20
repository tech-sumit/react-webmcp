import React from "react";
import type { FieldDefinition } from "./types";
import { extractOptions } from "./extractFields";
import { useRegisterField } from "./useRegisterField";

/**
 * Props for the `WebMCP.Field` component.
 */
export interface WebMCPFieldProps extends Omit<FieldDefinition, "name"> {
  /** Field name — must be unique within the parent `WebMCP.Tool`. */
  name: string;
  children: React.ReactNode;
}

/**
 * Zero-UI wrapper that registers a field with the nearest `WebMCP.Tool`.
 *
 * Use this as an escape hatch for custom components that cannot be
 * auto-detected by the children traversal engine. Enum values are
 * automatically detected from children that have a `value` prop
 * (e.g. `<MenuItem value="low">Low</MenuItem>`).
 *
 * Renders a React Fragment — no extra DOM elements are introduced.
 *
 * @example
 * ```tsx
 * <WebMCP.Field name="priority" description="Email priority">
 *   <Select>
 *     <MenuItem value="low">Low</MenuItem>
 *     <MenuItem value="high">High</MenuItem>
 *   </Select>
 * </WebMCP.Field>
 * ```
 */
export function WebMCPField({
  children,
  name,
  ...rest
}: WebMCPFieldProps) {
  const field: FieldDefinition = { name, ...rest };

  // Auto-detect enum values from children if not explicitly provided
  if (!field.enumValues && !field.oneOf) {
    const options = extractOptions(children);
    if (options.length > 0) {
      field.enumValues = options.map((o) => o.value);
      field.oneOf = options;
    }
  }

  useRegisterField(field);

  return <>{children}</>;
}

WebMCPField.displayName = "WebMCP.Field";
