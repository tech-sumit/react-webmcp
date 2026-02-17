# ai-inspector-types

Pure TypeScript types package. Zero runtime dependencies.

## Rules
- NEVER add runtime dependencies — this package has zero
- All exports must be type-only (interfaces, type aliases, enums)
- Types must align with WebMCP spec (see ../sources/webmcp/index.bs)
- DiscoveredTool.inputSchema is DOMString (JSON-stringified), not a parsed object
- executeTool/callTool takes string args and returns string|null (per WebMCP WebIDL)
- InspectorEvent is a discriminated union on the `type` field
- Protocol messages are split by direction: ExtToServer, ServerToExt, ContentToBackground, BackgroundToPanel, PanelToBackground

## Project structure
- `src/tool.ts` — WebMCPTool, DiscoveredTool, ToolAnnotations
- `src/tool-source.ts` — ToolSource interface, ToolSourceConfig
- `src/events.ts` — InspectorEvent discriminated union (all intercepted events)
- `src/protocol.ts` — WebSocket and chrome.runtime message types
- `src/json-schema.ts` — JSONSchema types (from react-webmcp library)
- `src/index.ts` — barrel re-exports (type-only)

## Build
- `pnpm build` — tsup -> ESM + CJS + .d.ts
- `pnpm typecheck` — tsc --noEmit
- `pnpm lint` — eslint
