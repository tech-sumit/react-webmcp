import { WebMCPTool } from "./WebMCPTool";
import { WebMCPField } from "./WebMCPField";

export const WebMCP = { Tool: WebMCPTool, Field: WebMCPField } as const;

export { WebMCPTool, WebMCPField };
export type { WebMCPToolProps } from "./WebMCPTool";
export type { WebMCPFieldProps } from "./WebMCPField";
export { useRegisterField } from "./useRegisterField";
export { useSchemaCollector } from "./useSchemaCollector";
export { extractFields, extractOptions } from "./extractFields";
export { buildInputSchema } from "./buildSchema";
export { validateSchema } from "./validateSchema";
export type { FieldDefinition, ToolContextValue } from "./types";
