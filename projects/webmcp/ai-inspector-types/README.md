# @anthropic/ai-inspector-types

Shared TypeScript types and protocol schemas for the AI Inspector ecosystem.

## Packages that depend on this

- `@anthropic/webmcp-cdp` — CDP client library
- `ai-inspector-extension` — Chrome DevTools extension
- `@anthropic/ai-inspector-server` — MCP server + CLI

## Installation

```bash
pnpm add @anthropic/ai-inspector-types
```

## Exports

### Tool types

- `WebMCPTool` — Tool definition as registered via `navigator.modelContext.registerTool()`
- `DiscoveredTool` — Tool as returned by `modelContextTesting.listTools()` (inputSchema is DOMString)
- `ToolAnnotations` — Metadata hints (readOnlyHint, etc.)

### ToolSource interface

- `ToolSource` — Abstraction for CDP and extension tool sources
- `ToolSourceConfig` — Connection configuration

### Events

- `InspectorEvent` — Discriminated union of all intercepted events (tool registrations, prompt sessions, streaming, etc.)

### Protocol messages

- `ExtToServerMessage` / `ServerToExtMessage` — Extension <-> server WebSocket messages
- `ContentToBackgroundMessage` — Content script -> background SW
- `BackgroundToPanelMessage` / `PanelToBackgroundMessage` — Background <-> DevTools panel

### JSON Schema

- `JSONSchema` / `JSONSchemaProperty` — JSON Schema types for tool input schemas

## Development

```bash
pnpm install
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm build        # tsup -> dist/
```
