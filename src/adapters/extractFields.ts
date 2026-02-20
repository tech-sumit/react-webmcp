import React from "react";
import type { FieldDefinition } from "./types";

/**
 * Recursively extract option values from React children.
 *
 * Detects elements that have a `value` prop (e.g. `<MenuItem value="low">Low</MenuItem>`)
 * and collects `{ value, label }` pairs. The label is derived from string children
 * or falls back to `String(value)`.
 *
 * @example
 * ```tsx
 * const options = extractOptions(
 *   <>
 *     <MenuItem value="low">Low</MenuItem>
 *     <MenuItem value="high">High</MenuItem>
 *   </>
 * );
 * // [{ value: "low", label: "Low" }, { value: "high", label: "High" }]
 * ```
 */
export function extractOptions(
  children: React.ReactNode,
): { value: string | number | boolean; label: string }[] {
  const results: { value: string | number | boolean; label: string }[] = [];

  React.Children.toArray(children).forEach((child) => {
    if (!React.isValidElement(child)) return;

    const props = child.props as Record<string, unknown>;

    if (props.value !== undefined && props.value !== null) {
      const value = props.value as string | number | boolean;
      let label: string;

      if (typeof props.children === "string") {
        label = props.children;
      } else {
        label = String(value);
      }

      results.push({ value, label });
    }

    if (props.children) {
      results.push(...extractOptions(props.children as React.ReactNode));
    }
  });

  return results;
}

/**
 * Recursively extract field definitions from a React children tree.
 *
 * Walks the tree using `React.Children.toArray` (safe, pure traversal).
 * Detects field names from `props.name`, `props.inputProps.name`, or
 * `props.slotProps.input.name`. When a named element is found, it builds
 * a `FieldDefinition` from its props and auto-detects enum values from
 * its children. Elements without a name are recursed into.
 *
 * @example
 * ```tsx
 * const fields = extractFields(
 *   <>
 *     <Input name="email" type="email" required />
 *     <Select name="priority">
 *       <MenuItem value="low">Low</MenuItem>
 *       <MenuItem value="high">High</MenuItem>
 *     </Select>
 *   </>
 * );
 * ```
 */
export function extractFields(children: React.ReactNode): FieldDefinition[] {
  const fields: FieldDefinition[] = [];

  React.Children.toArray(children).forEach((child) => {
    if (!React.isValidElement(child)) return;

    const props = child.props as Record<string, unknown>;

    const inputProps = props.inputProps as Record<string, unknown> | undefined;
    const slotInput = (props.slotProps as Record<string, unknown> | undefined)
      ?.input as Record<string, unknown> | undefined;

    const name =
      (props.name as string | undefined) ??
      (inputProps?.name as string | undefined) ??
      (slotInput?.name as string | undefined);

    if (name) {
      const field: FieldDefinition = { name };

      if (props.type !== undefined) field.type = props.type as string;
      if (props.required !== undefined) field.required = Boolean(props.required);
      if (props.min !== undefined) field.min = Number(props.min);
      if (props.max !== undefined) field.max = Number(props.max);
      if (props.minLength !== undefined) field.minLength = Number(props.minLength);
      if (props.maxLength !== undefined) field.maxLength = Number(props.maxLength);
      if (props.pattern !== undefined) field.pattern = props.pattern as string;

      if (props.children) {
        const options = extractOptions(props.children as React.ReactNode);
        if (options.length > 0) {
          field.enumValues = options.map((o) => o.value);
          field.oneOf = options;
        }
      }

      fields.push(field);
    } else if (props.children) {
      fields.push(...extractFields(props.children as React.ReactNode));
    }
  });

  return fields;
}
