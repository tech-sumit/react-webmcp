import React from "react";

export interface WebMCPSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Maps to the `toolparamtitle` attribute (overrides the JSON Schema property key). */
  toolParamTitle?: string;
  /** Maps to the `toolparamdescription` attribute (describes this parameter to agents). */
  toolParamDescription?: string;
  children: React.ReactNode;
}

/**
 * A `<select>` element enhanced with WebMCP declarative attributes.
 *
 * Use inside a `<WebMCPForm>` to annotate select inputs for AI agents.
 * The `<option>` values and text are automatically mapped to the tool's
 * JSON Schema `enum` / `oneOf` definitions by the browser.
 *
 * @example
 * ```tsx
 * <WebMCPSelect
 *   name="seating"
 *   toolParamDescription="Preferred seating area"
 * >
 *   <option value="Main Dining">Main Dining Room</option>
 *   <option value="Terrace">Terrace (Outdoor)</option>
 * </WebMCPSelect>
 * ```
 */
export const WebMCPSelect = React.forwardRef<
  HTMLSelectElement,
  WebMCPSelectProps
>(({ toolParamTitle, toolParamDescription, children, ...rest }, ref) => {
  const webmcpAttrs: Record<string, string> = {};
  if (toolParamTitle) {
    webmcpAttrs.toolparamtitle = toolParamTitle;
  }
  if (toolParamDescription) {
    webmcpAttrs.toolparamdescription = toolParamDescription;
  }

  return (
    <select ref={ref} {...webmcpAttrs} {...rest}>
      {children}
    </select>
  );
});

WebMCPSelect.displayName = "WebMCPSelect";
