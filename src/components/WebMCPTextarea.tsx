import React from "react";

export interface WebMCPTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Maps to the `toolparamtitle` attribute (overrides the JSON Schema property key). */
  toolParamTitle?: string;
  /** Maps to the `toolparamdescription` attribute (describes this parameter to agents). */
  toolParamDescription?: string;
}

/**
 * A `<textarea>` element enhanced with WebMCP declarative attributes.
 *
 * Use inside a `<WebMCPForm>` to annotate textarea inputs for AI agents.
 *
 * @example
 * ```tsx
 * <WebMCPTextarea
 *   name="requests"
 *   rows={3}
 *   toolParamDescription="Special requests (allergies, occasions, etc.)"
 * />
 * ```
 */
export const WebMCPTextarea = React.forwardRef<
  HTMLTextAreaElement,
  WebMCPTextareaProps
>(({ toolParamTitle, toolParamDescription, ...rest }, ref) => {
  const webmcpAttrs: Record<string, string> = {};
  if (toolParamTitle) {
    webmcpAttrs.toolparamtitle = toolParamTitle;
  }
  if (toolParamDescription) {
    webmcpAttrs.toolparamdescription = toolParamDescription;
  }

  return <textarea ref={ref} {...webmcpAttrs} {...rest} />;
});

WebMCPTextarea.displayName = "WebMCPTextarea";
