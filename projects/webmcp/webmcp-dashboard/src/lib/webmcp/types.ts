import type { z } from "zod";

/**
 * WebMCP Tool definition - registered via navigator.modelContext
 *
 * This replaces the @mcp-b/react-webmcp useWebMCP hook with a native
 * implementation that directly uses the proposed WebMCP browser API.
 */
export interface WebMCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

/**
 * WebMCP Prompt definition - suggested interactions for AI agents
 */
export interface WebMCPPromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
  handler: (
    args: Record<string, string>
  ) => Promise<{ role: string; content: string }[]>;
}

/**
 * JSON Schema representation of a tool's input
 */
export interface JSONSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

/**
 * MCP Tool as registered in the modelContext
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, JSONSchemaProperty>;
    required?: string[];
  };
  annotations?: Record<string, unknown>;
}

/**
 * Chat message for the window.ai integration
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

/**
 * Tool call made by the AI during a conversation
 */
export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

/**
 * window.ai Prompt API types
 * Based on the Chrome Built-in AI / Prompt API proposal
 */
export interface WindowAI {
  languageModel: {
    capabilities: () => Promise<AILanguageModelCapabilities>;
    create: (options?: AILanguageModelCreateOptions) => Promise<AILanguageModel>;
  };
}

export interface AILanguageModelCapabilities {
  available: "no" | "after-download" | "readily";
  defaultTopK?: number;
  maxTopK?: number;
  defaultTemperature?: number;
}

export interface AILanguageModelCreateOptions {
  systemPrompt?: string;
  temperature?: number;
  topK?: number;
  signal?: AbortSignal;
}

export interface AILanguageModel {
  prompt: (input: string, options?: { signal?: AbortSignal }) => Promise<string>;
  promptStreaming: (
    input: string,
    options?: { signal?: AbortSignal }
  ) => ReadableStream<string>;
  destroy: () => void;
  clone: () => Promise<AILanguageModel>;
}

/**
 * navigator.modelContext types
 * Based on the WebMCP proposed W3C standard
 */
export interface ModelContextAPI {
  addTool: (tool: MCPTool, handler: (args: Record<string, unknown>) => Promise<unknown>) => void;
  removeTool: (name: string) => void;
  getTools: () => MCPTool[];
  addEventListener: (event: string, handler: (...args: unknown[]) => void) => void;
  removeEventListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ai?: WindowAI;
  }
  interface Navigator {
    modelContext?: ModelContextAPI;
  }
}
