import { createContext, useCallback, useMemo, useRef, useState } from "react";
import type { JSONSchema } from "../types";
import type { FieldDefinition, ToolContextValue } from "./types";
import { extractFields } from "./extractFields";
import { buildInputSchema } from "./buildSchema";
import { validateSchema } from "./validateSchema";

// ---------------------------------------------------------------------------
// Tool context — consumed by useRegisterField
// ---------------------------------------------------------------------------

/**
 * React context used by `WebMCP.Tool` to expose field registration to
 * descendant components. Consumers should use `useRegisterField` rather
 * than accessing this context directly.
 */
export const ToolContext = createContext<ToolContextValue | null>(null);

// ---------------------------------------------------------------------------
// Private helpers (not exported — same pattern as toolFingerprint)
// ---------------------------------------------------------------------------

/**
 * Produce a stable string representation of a field array for change
 * detection in dependency arrays.
 */
function fieldsFingerprint(fields: FieldDefinition[]): string {
  return fields
    .map(
      (f) =>
        `${f.name}::${f.type ?? ""}::${f.required ?? ""}::${f.title ?? ""}::${f.description ?? ""}::${JSON.stringify(f.enumValues ?? [])}::${JSON.stringify(f.oneOf ?? [])}::${f.min ?? ""}::${f.max ?? ""}::${f.minLength ?? ""}::${f.maxLength ?? ""}::${f.pattern ?? ""}`,
    )
    .join("|");
}

/**
 * Merge a base field definition with an override. Skips `undefined`
 * values in the override so they don't clobber defined base values.
 * Arrays (`enumValues`, `oneOf`) are replaced wholesale, not concatenated.
 */
function mergeField(
  base: FieldDefinition,
  override: Partial<FieldDefinition>,
): FieldDefinition {
  const result = { ...base };
  for (const key of Object.keys(override) as Array<keyof FieldDefinition>) {
    if (override[key] !== undefined) {
      (result as Record<string, unknown>)[key] = override[key];
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseSchemaCollectorOptions {
  /** React children to traverse for auto-detected fields. */
  children: React.ReactNode;
  /** Optional field overrides keyed by field name. */
  fields?: Record<string, Partial<FieldDefinition>>;
  /** When true, validation issues throw instead of warn. */
  strict?: boolean;
}

/**
 * Core engine hook that collects field definitions from three sources,
 * merges them, validates in dev, and builds a deterministic JSON Schema.
 *
 * **Sources** (lowest to highest priority):
 * 1. Children traversal (auto-detected from React tree)
 * 2. `fields` prop (enrichment / override)
 * 3. Context-registered fields (via `useRegisterField`)
 *
 * @example
 * ```tsx
 * const { schema, registerField, unregisterField } = useSchemaCollector({
 *   children,
 *   fields: { email: { description: "Recipient" } },
 * });
 * ```
 */
export function useSchemaCollector({
  children,
  fields: fieldsProp,
  strict,
}: UseSchemaCollectorOptions): {
  schema: JSONSchema;
  registerField: (field: FieldDefinition) => void;
  unregisterField: (name: string) => void;
} {
  // Source 3: context-registered fields (useRegisterField)
  const contextFieldsRef = useRef<Map<string, FieldDefinition>>(new Map());
  const [version, setVersion] = useState(0);

  const registerField = useCallback((field: FieldDefinition) => {
    contextFieldsRef.current.set(field.name, field);
    setVersion((v) => v + 1);
  }, []);

  const unregisterField = useCallback((name: string) => {
    contextFieldsRef.current.delete(name);
    setVersion((v) => v + 1);
  }, []);

  // Source 1: children traversal (cheap O(n), runs every render)
  const childrenFields = extractFields(children);
  const childrenFP = fieldsFingerprint(childrenFields);

  // Merge all sources: children < fields prop < context
  const merged = useMemo(() => {
    const fieldMap = new Map<string, FieldDefinition>();

    // 1. Children-detected fields (lowest priority)
    for (const field of childrenFields) {
      fieldMap.set(field.name, field);
    }

    // 2. Fields prop (enrichment)
    if (fieldsProp) {
      for (const [name, overrides] of Object.entries(fieldsProp)) {
        const existing = fieldMap.get(name);
        if (existing) {
          fieldMap.set(name, mergeField(existing, overrides));
        } else {
          fieldMap.set(name, { name, ...overrides } as FieldDefinition);
        }
      }
    }

    // 3. Context-registered fields (highest priority)
    for (const [name, field] of contextFieldsRef.current) {
      const existing = fieldMap.get(name);
      if (existing) {
        fieldMap.set(name, mergeField(existing, field));
      } else {
        fieldMap.set(name, field);
      }
    }

    const result = Array.from(fieldMap.values());

    if (process.env.NODE_ENV !== "production") {
      validateSchema(result, { strict });
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childrenFP, fieldsProp, version, strict]);

  const mergedFP = fieldsFingerprint(merged);

  // Build deterministic JSON Schema
  const schema = useMemo(
    () => buildInputSchema(merged),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mergedFP],
  );

  return { schema, registerField, unregisterField };
}
