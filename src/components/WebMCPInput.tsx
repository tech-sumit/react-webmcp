import React from "react";

export interface WebMCPInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Maps to the `toolparamtitle` attribute (overrides the JSON Schema property key). */
  toolParamTitle?: string;
  /** Maps to the `toolparamdescription` attribute (describes this parameter to agents). */
  toolParamDescription?: string;
}

/**
 * An `<input>` element enhanced with WebMCP declarative attributes.
 *
 * Use inside a `<WebMCPForm>` to annotate individual form fields
 * for AI agents.
 *
 * @example
 * ```tsx
 * <WebMCPInput
 *   type="text"
 *   name="name"
 *   toolParamDescription="Customer's full name (min 2 chars)"
 *   required
 *   minLength={2}
 * />
 * ```
 */
export const WebMCPInput = React.forwardRef<HTMLInputElement, WebMCPInputProps>(
  ({ toolParamTitle, toolParamDescription, ...rest }, ref) => {
    const webmcpAttrs: Record<string, string> = {};
    if (toolParamTitle) {
      webmcpAttrs.toolparamtitle = toolParamTitle;
    }
    if (toolParamDescription) {
      webmcpAttrs.toolparamdescription = toolParamDescription;
    }

    return <input ref={ref} {...webmcpAttrs} {...rest} />;
  },
);

WebMCPInput.displayName = "WebMCPInput";
