import type { WebMCPTool } from "./tool.js";

/**
 * Events intercepted by the AI Inspector extension's content scripts.
 * These flow from ai-interceptor.ts (MAIN world) -> bridge.ts (ISOLATED) -> background SW -> DevTools panel.
 *
 * Discriminated union on the `type` field.
 */
export type InspectorEvent =
  | ToolRegisteredEvent
  | ToolUnregisteredEvent
  | ContextClearedEvent
  | SessionCreatedEvent
  | PromptSentEvent
  | PromptResponseEvent
  | PromptErrorEvent
  | StreamStartEvent
  | StreamEndEvent
  | ToolCallEvent
  | ToolResultAIEvent
  | ToolActivatedEvent
  | ToolCancelEvent
  | PageReloadEvent;

export interface ToolRegisteredEvent {
  type: "TOOL_REGISTERED";
  tool: WebMCPTool;
  ts: number;
}

export interface ToolUnregisteredEvent {
  type: "TOOL_UNREGISTERED";
  name: string;
  ts: number;
}

/**
 * Fired when navigator.modelContext.clearContext() is called.
 * Per WebIDL: clearContext() removes all registered tools at once.
 * Used by the react-webmcp useWebMCPContext hook on component unmount.
 */
export interface ContextClearedEvent {
  type: "CONTEXT_CLEARED";
  ts: number;
}

export interface SessionCreatedEvent {
  type: "SESSION_CREATED";
  sessionId: string;
  options: unknown;
  quotaUsage?: { inputUsed: number; inputQuota: number };
  ts: number;
}

export interface PromptSentEvent {
  type: "PROMPT_SENT";
  sessionId: string;
  input: unknown;
  ts: number;
}

export interface PromptResponseEvent {
  type: "PROMPT_RESPONSE";
  sessionId: string;
  result: unknown;
  ts: number;
}

export interface PromptErrorEvent {
  type: "PROMPT_ERROR";
  sessionId: string;
  error: string;
  ts: number;
}

export interface StreamStartEvent {
  type: "STREAM_START";
  sessionId: string;
  input: unknown;
  ts: number;
}

export interface StreamEndEvent {
  type: "STREAM_END";
  sessionId: string;
  result: string;
  ts: number;
}

/** A tool call made by the LanguageModel's built-in tool-use feature */
export interface ToolCallEvent {
  type: "TOOL_CALL";
  sessionId: string;
  tool: string;
  args: unknown;
  ts: number;
}

/** Result of a tool call from LanguageModel's built-in tool-use */
export interface ToolResultAIEvent {
  type: "TOOL_RESULT_AI";
  sessionId: string;
  tool: string;
  result: unknown;
  ts: number;
}

/** Fired when an agent activates a tool (per WebMCP spec window event) */
export interface ToolActivatedEvent {
  type: "TOOL_ACTIVATED";
  toolName: string;
  ts: number;
}

/** Fired when a tool execution is cancelled (per WebMCP spec window event) */
export interface ToolCancelEvent {
  type: "TOOL_CANCEL";
  toolName: string;
  ts: number;
}

export interface PageReloadEvent {
  type: "PAGE_RELOAD";
  ts: number;
}
