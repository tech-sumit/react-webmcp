import type { JSONSchema, JSONSchemaProperty } from "../types";
import type { FieldDefinition } from "./types";

/**
 * Map an HTML input type to the corresponding JSON Schema type.
 *
 * @example
 * ```ts
 * mapHtmlTypeToSchemaType("number"); // "number"
 * mapHtmlTypeToSchemaType("checkbox"); // "boolean"
 * mapHtmlTypeToSchemaType("email"); // "string"
 * ```
 */
export function mapHtmlTypeToSchemaType(
  htmlType?: string,
): "string" | "number" | "boolean" {
  switch (htmlType) {
    case "number":
    case "range":
      return "number";
    case "checkbox":
      return "boolean";
    default:
      return "string";
  }
}

/**
 * Build a deterministic JSON Schema from an array of field definitions.
 *
 * Property names are sorted alphabetically and the `required` array is
 * also sorted, ensuring identical output regardless of field insertion
 * order.
 *
 * @example
 * ```ts
 * const schema = buildInputSchema([
 *   { name: "email", type: "email", required: true },
 *   { name: "age", type: "number", min: 0, max: 120 },
 * ]);
 * ```
 */
export function buildInputSchema(fields: FieldDefinition[]): JSONSchema {
  const properties: Record<string, JSONSchemaProperty> = {};
  const required: string[] = [];

  const sortedFields = [...fields].sort((a, b) => a.name.localeCompare(b.name));

  for (const field of sortedFields) {
    const prop: JSONSchemaProperty = {
      type: mapHtmlTypeToSchemaType(field.type),
    };

    if (field.title) prop.title = field.title;
    if (field.description) prop.description = field.description;
    if (field.min !== undefined) prop.minimum = field.min;
    if (field.max !== undefined) prop.maximum = field.max;
    if (field.minLength !== undefined) prop.minLength = field.minLength;
    if (field.maxLength !== undefined) prop.maxLength = field.maxLength;
    if (field.pattern) prop.pattern = field.pattern;

    if (field.enumValues && field.enumValues.length > 0) {
      prop.enum = field.enumValues;
    }

    if (field.oneOf && field.oneOf.length > 0) {
      prop.oneOf = field.oneOf.map((opt) => ({
        const: opt.value,
        title: opt.label,
      }));
    }

    properties[field.name] = prop;

    if (field.required) {
      required.push(field.name);
    }
  }

  const schema: JSONSchema = {
    type: "object",
    properties,
  };

  if (required.length > 0) {
    schema.required = required.sort();
  }

  return schema;
}
