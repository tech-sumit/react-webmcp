import React, { useEffect, useRef } from "react";
import type { ToolAnnotations } from "../types";
import type { FieldDefinition } from "./types";
import { useSchemaCollector, ToolContext } from "./useSchemaCollector";
import { useWebMCPTool } from "../hooks/useWebMCPTool";

/**
 * Props for the `WebMCP.Tool` component.
 */
export interface WebMCPToolProps {
  /** Unique tool name exposed to AI agents. */
  name: string;
  /** Human-readable description of what this tool does. */
  description: string;
  /** Handler called when an AI agent invokes this tool. */
  onExecute: (input: Record<string, unknown>) => unknown | Promise<unknown>;
  /** Optional field overrides / enrichment keyed by field name. */
  fields?: Record<string, Partial<FieldDefinition>>;
  /** When true, schema validation issues throw instead of warn. */
  strict?: boolean;
  /** If true, the tool auto-submits when filled by an agent. */
  autoSubmit?: boolean;
  /** Optional metadata hints for agents. */
  annotations?: ToolAnnotations;
  /** Called when a `toolactivated` event fires for this tool. */
  onToolActivated?: (toolName: string) => void;
  /** Called when a `toolcancel` event fires for this tool. */
  onToolCancel?: (toolName: string) => void;
  children: React.ReactNode;
}

/**
 * Framework-agnostic tool wrapper that collects a JSON Schema from its
 * React children and registers it as a WebMCP tool.
 *
 * Fields are auto-detected from child components (e.g. `<Input name="email" />`),
 * enriched via the `fields` prop, and can be overridden by descendant
 * components using `useRegisterField`.
 *
 * @example
 * ```tsx
 * <WebMCPTool
 *   name="send_email"
 *   description="Send an email to a user"
 *   onExecute={async ({ email, priority }) => {
 *     await sendEmail(email, priority);
 *     return { content: [{ type: "text", text: "Sent!" }] };
 *   }}
 *   fields={{ email: { description: "Recipient's email" } }}
 * >
 *   <FormControl>
 *     <Input name="email" type="email" required />
 *   </FormControl>
 * </WebMCPTool>
 * ```
 */
export function WebMCPTool({
  name,
  description,
  onExecute,
  fields: fieldsProp,
  strict,
  autoSubmit,
  annotations,
  onToolActivated,
  onToolCancel,
  children,
}: WebMCPToolProps) {
  const { schema, registerField, unregisterField } = useSchemaCollector({
    children,
    fields: fieldsProp,
    strict,
  });

  const executeRef = useRef(onExecute);
  executeRef.current = onExecute;

  useWebMCPTool({
    name,
    description,
    inputSchema: schema,
    annotations,
    execute: (input) => executeRef.current(input),
  });

  // Listen for toolactivated / toolcancel events (same pattern as WebMCPForm)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!onToolActivated && !onToolCancel) return;

    const handleActivated = (e: Event) => {
      const toolName =
        (e as CustomEvent & { toolName?: string }).toolName ??
        (e as CustomEvent).detail?.toolName;
      if (toolName === name && onToolActivated) {
        onToolActivated(toolName);
      }
    };

    const handleCancel = (e: Event) => {
      const toolName =
        (e as CustomEvent & { toolName?: string }).toolName ??
        (e as CustomEvent).detail?.toolName;
      if (toolName === name && onToolCancel) {
        onToolCancel(toolName);
      }
    };

    window.addEventListener("toolactivated", handleActivated);
    window.addEventListener("toolcancel", handleCancel);

    return () => {
      window.removeEventListener("toolactivated", handleActivated);
      window.removeEventListener("toolcancel", handleCancel);
    };
  }, [name, onToolActivated, onToolCancel]);

  return (
    <ToolContext.Provider value={{ registerField, unregisterField }}>
      {children}
    </ToolContext.Provider>
  );
}

WebMCPTool.displayName = "WebMCP.Tool";
