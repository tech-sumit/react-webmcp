import { useContext, useEffect } from "react";
import type { FieldDefinition } from "./types";
import { ToolContext } from "./useSchemaCollector";

/**
 * Produce a stable fingerprint for a field definition so dependency
 * arrays only trigger when meaningful values change.
 */
function fieldFingerprint(field: FieldDefinition): string {
  return `${field.name}::${field.type ?? ""}::${field.required ?? ""}::${field.title ?? ""}::${field.description ?? ""}::${JSON.stringify(field.enumValues ?? [])}::${JSON.stringify(field.oneOf ?? [])}::${field.min ?? ""}::${field.max ?? ""}::${field.minLength ?? ""}::${field.maxLength ?? ""}::${field.pattern ?? ""}`;
}

/**
 * Register a field definition with the nearest `WebMCP.Tool` ancestor.
 *
 * Uses `useEffect` (SSR-safe) so registration only happens on the client.
 * The field is automatically unregistered on unmount. Re-registration
 * only occurs when the field definition changes (compared by fingerprint).
 *
 * If no `WebMCP.Tool` ancestor exists, a dev-mode warning is logged.
 *
 * @example
 * ```tsx
 * function MyField() {
 *   useRegisterField({ name: "email", type: "email", required: true });
 *   return <input name="email" type="email" required />;
 * }
 * ```
 */
export function useRegisterField(field: FieldDefinition): void {
  const ctx = useContext(ToolContext);
  const fp = fieldFingerprint(field);

  useEffect(() => {
    if (!ctx) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[react-webmcp] useRegisterField: no WebMCP.Tool context found for field "${field.name}". ` +
            `Wrap this component in a <WebMCP.Tool> to register fields.`,
        );
      }
      return;
    }

    ctx.registerField(field);

    return () => {
      try {
        ctx.unregisterField(field.name);
      } catch {
        // Field may have already been unregistered
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fp]);
}
