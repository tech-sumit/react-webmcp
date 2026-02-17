import React, { useCallback, useEffect, useRef } from "react";
import type { WebMCPFormSubmitEvent } from "../types";

export interface WebMCPFormProps
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
  /** The tool name exposed to AI agents. Maps to the `toolname` HTML attribute. */
  toolName: string;
  /** Description of what this tool does. Maps to `tooldescription`. */
  toolDescription: string;
  /** If true, the form auto-submits when filled by an agent. Maps to `toolautosubmit`. */
  toolAutoSubmit?: boolean;
  /**
   * Submit handler that receives the enhanced SubmitEvent with
   * `agentInvoked` and `respondWith` properties.
   */
  onSubmit?: (event: WebMCPFormSubmitEvent) => void;
  /** Called when a tool activation event fires for this form's tool. */
  onToolActivated?: (toolName: string) => void;
  /** Called when a tool cancel event fires for this form's tool. */
  onToolCancel?: (toolName: string) => void;
  children: React.ReactNode;
}

/**
 * A React wrapper for the WebMCP declarative API.
 *
 * Renders a `<form>` element with the appropriate WebMCP HTML attributes
 * (`toolname`, `tooldescription`, `toolautosubmit`) so the browser
 * automatically registers it as a WebMCP tool.
 *
 * @example
 * ```tsx
 * <WebMCPForm
 *   toolName="book_table"
 *   toolDescription="Book a table at the restaurant"
 *   onSubmit={(e) => {
 *     e.preventDefault();
 *     if (e.agentInvoked) {
 *       e.respondWith(Promise.resolve("Booking confirmed!"));
 *     }
 *   }}
 * >
 *   <WebMCPInput name="name" label="Full Name" />
 *   <button type="submit">Book</button>
 * </WebMCPForm>
 * ```
 */
export function WebMCPForm({
  toolName,
  toolDescription,
  toolAutoSubmit,
  onSubmit,
  onToolActivated,
  onToolCancel,
  children,
  ...rest
}: WebMCPFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  // Listen for toolactivated and toolcancel events
  useEffect(() => {
    const handleActivated = (e: Event) => {
      const name =
        (e as CustomEvent & { toolName?: string }).toolName ??
        (e as CustomEvent).detail?.toolName;
      if (name === toolName && onToolActivated) {
        onToolActivated(name);
      }
    };

    const handleCancel = (e: Event) => {
      const name =
        (e as CustomEvent & { toolName?: string }).toolName ??
        (e as CustomEvent).detail?.toolName;
      if (name === toolName && onToolCancel) {
        onToolCancel(name);
      }
    };

    window.addEventListener("toolactivated", handleActivated);
    window.addEventListener("toolcancel", handleCancel);

    return () => {
      window.removeEventListener("toolactivated", handleActivated);
      window.removeEventListener("toolcancel", handleCancel);
    };
  }, [toolName, onToolActivated, onToolCancel]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      if (onSubmit) {
        onSubmit(e.nativeEvent as unknown as WebMCPFormSubmitEvent);
      }
    },
    [onSubmit],
  );

  // Build the HTML attributes. React doesn't recognize toolname etc.,
  // so we spread them via a plain object cast.
  const webmcpAttrs: Record<string, string | boolean> = {
    toolname: toolName,
    tooldescription: toolDescription,
  };
  if (toolAutoSubmit) {
    webmcpAttrs.toolautosubmit = "";
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      {...webmcpAttrs}
      {...rest}
    >
      {children}
    </form>
  );
}
