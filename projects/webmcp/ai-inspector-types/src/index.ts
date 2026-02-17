export type {
  JSONSchema,
  JSONSchemaProperty,
} from "./json-schema.js";

export type {
  ToolAnnotations,
  ToolContentText,
  ToolContentJSON,
  ToolContent,
  WebMCPTool,
  DiscoveredTool,
} from "./tool.js";

export type {
  ToolSourceConfig,
  ToolSource,
} from "./tool-source.js";

export type {
  InspectorEvent,
  ToolRegisteredEvent,
  ToolUnregisteredEvent,
  ContextClearedEvent,
  SessionCreatedEvent,
  PromptSentEvent,
  PromptResponseEvent,
  PromptErrorEvent,
  StreamStartEvent,
  StreamEndEvent,
  ToolCallEvent,
  ToolResultAIEvent,
  ToolActivatedEvent,
  ToolCancelEvent,
  PageReloadEvent,
} from "./events.js";

export type {
  ExtToServerMessage,
  ExtToolsUpdateMessage,
  ExtToolResultMessage,
  ExtEventMessage,
  ServerToExtMessage,
  ServerCallToolMessage,
  ServerListToolsMessage,
  ContentToBackgroundMessage,
  ContentInspectorEventMessage,
  ContentToolsListMessage,
  BackgroundToPanelMessage,
  PanelToBackgroundMessage,
} from "./protocol.js";
