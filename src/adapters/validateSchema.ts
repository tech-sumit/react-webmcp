import type { FieldDefinition } from "./types";
import { mapHtmlTypeToSchemaType } from "./buildSchema";

/**
 * Validate an array of field definitions for common schema issues.
 *
 * In production this is a no-op. In development it checks for:
 * - Duplicate field names
 * - `pattern` used on non-string types
 * - `min`/`max` used on non-number types
 * - `minLength`/`maxLength` used on non-string types
 * - Enum values whose types don't match the declared field type
 *
 * By default warnings are logged via `console.warn` with the
 * `[react-webmcp]` prefix. When `strict` is `true`, an `Error` is
 * thrown instead.
 *
 * @example
 * ```ts
 * validateSchema(fields); // warns in dev
 * validateSchema(fields, { strict: true }); // throws in dev
 * ```
 */
export function validateSchema(
  fields: FieldDefinition[],
  options?: { strict?: boolean },
): void {
  if (process.env.NODE_ENV === "production") return;

  const strict = options?.strict ?? false;
  const issues: string[] = [];

  const seen = new Set<string>();
  for (const field of fields) {
    if (seen.has(field.name)) {
      issues.push(`Duplicate field name "${field.name}".`);
    }
    seen.add(field.name);

    const schemaType = mapHtmlTypeToSchemaType(field.type);

    if (field.pattern !== undefined && schemaType !== "string") {
      issues.push(
        `Field "${field.name}": pattern is only valid for string types, but type is "${schemaType}".`,
      );
    }

    if ((field.min !== undefined || field.max !== undefined) && schemaType !== "number") {
      issues.push(
        `Field "${field.name}": min/max are only valid for number types, but type is "${schemaType}".`,
      );
    }

    if (
      (field.minLength !== undefined || field.maxLength !== undefined) &&
      schemaType !== "string"
    ) {
      issues.push(
        `Field "${field.name}": minLength/maxLength are only valid for string types, but type is "${schemaType}".`,
      );
    }

    if (field.enumValues && field.enumValues.length > 0) {
      for (const val of field.enumValues) {
        const valType = typeof val;
        if (schemaType === "string" && valType !== "string") {
          issues.push(
            `Field "${field.name}": enum value ${JSON.stringify(val)} is not a string.`,
          );
        }
        if (schemaType === "number" && valType !== "number") {
          issues.push(
            `Field "${field.name}": enum value ${JSON.stringify(val)} is not a number.`,
          );
        }
        if (schemaType === "boolean" && valType !== "boolean") {
          issues.push(
            `Field "${field.name}": enum value ${JSON.stringify(val)} is not a boolean.`,
          );
        }
      }
    }
  }

  for (const issue of issues) {
    if (strict) {
      throw new Error(`[react-webmcp] ${issue}`);
    }
    console.warn(`[react-webmcp] ${issue}`);
  }
}
