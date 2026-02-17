import type { DiscoveredTool } from "./tool.js";
import type { InspectorEvent } from "./events.js";

/**
 * WebSocket messages sent from the extension background SW to the Node.js server.
 */
export type ExtToServerMessage =
  | ExtToolsUpdateMessage
  | ExtToolResultMessage
  | ExtEventMessage;

export interface ExtToolsUpdateMessage {
  type: "TOOLS_UPDATE";
  tabId: number;
  url: string;
  tools: DiscoveredTool[];
}

export interface ExtToolResultMessage {
  type: "TOOL_RESULT";
  callId: string;
  result: string | null;
  error?: string;
}

export interface ExtEventMessage {
  type: "EVENT";
  tabId: number;
  event: InspectorEvent;
}

/**
 * WebSocket messages sent from the Node.js server to the extension background SW.
 */
export type ServerToExtMessage =
  | ServerCallToolMessage
  | ServerListToolsMessage;

export interface ServerCallToolMessage {
  type: "CALL_TOOL";
  callId: string;
  name: string;
  inputArguments: string;
}

export interface ServerListToolsMessage {
  type: "LIST_TOOLS";
  tabId?: number;
}

/**
 * Messages sent between extension content scripts and background SW
 * via chrome.runtime.sendMessage().
 */
export type ContentToBackgroundMessage =
  | ContentInspectorEventMessage
  | ContentToolsListMessage;

export interface ContentInspectorEventMessage {
  source: "ai-inspector";
  type: InspectorEvent["type"];
  data: Omit<InspectorEvent, "type">;
}

export interface ContentToolsListMessage {
  source: "ai-inspector";
  type: "TOOLS_LIST";
  tools: DiscoveredTool[];
  url: string;
}

/**
 * Messages sent from background SW to the DevTools panel via port.postMessage().
 */
export type BackgroundToPanelMessage =
  | { type: "STATE"; events: InspectorEvent[]; tools: DiscoveredTool[] }
  | { type: "EVENT"; event: InspectorEvent }
  | { type: "TOOLS_UPDATE"; tools: DiscoveredTool[] }
  | { type: "PAGE_RELOAD" };

/**
 * Messages sent from the DevTools panel to background SW via port.postMessage().
 */
export type PanelToBackgroundMessage =
  | { type: "GET_STATE"; tabId: number }
  | { type: "EXECUTE_TOOL"; tabId: number; name: string; inputArguments: string }
  | { type: "CLEAR_EVENTS"; tabId: number };
