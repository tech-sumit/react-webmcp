# WebMCP Dashboard

A dashboard example demonstrating native browser AI APIs: `window.ai` (Prompt API) and `navigator.modelContext` (WebMCP). This project migrates from the `@mcp-b/react-webmcp` polyfill library to direct native API usage.

## What Changed from webmcp-sh

| Feature | webmcp-sh (Before) | webmcp-dashboard (After) |
|---------|-------------------|-------------------------|
| Tool Registration | `@mcp-b/react-webmcp` `useWebMCP` hook | Native `useModelContext` hook → `navigator.modelContext.addTool()` |
| AI Chat | `@mcp-b/embedded-agent` web component | `useWindowAI` hook → `window.ai.languageModel` |
| Polyfill | `@mcp-b/global` for `navigator.modelContext` | No polyfill - uses native browser API |
| Agent | Cloud-hosted AI agent via Chrome extension | On-device AI via Chrome Prompt API |
| Infrastructure | Cloudflare Workers, Sentry, PWA | Zero infrastructure - pure browser |

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Browser                     │
│                                              │
│  ┌──────────┐    ┌────────────────────────┐  │
│  │window.ai │    │navigator.modelContext  │  │
│  │(Prompt   │    │(WebMCP W3C proposal)   │  │
│  │ API)     │    │                        │  │
│  │          │    │  .addTool()            │  │
│  │ .prompt()│    │  .removeTool()         │  │
│  └────┬─────┘    │  .getTools()           │  │
│       │          └──────────┬─────────────┘  │
│       │                     │                │
│  ┌────▼─────────────────────▼─────────────┐  │
│  │           React Application            │  │
│  │                                        │  │
│  │  useModelContext() ← registers tools   │  │
│  │  useWindowAI()     ← AI chat + tools   │  │
│  │                                        │  │
│  │  ┌──────────┐  ┌──────────────────┐    │  │
│  │  │ PGlite   │  │ Drizzle ORM      │    │  │
│  │  │ (WASM)   │◄─┤ (Type-safe SQL)  │    │  │
│  │  └──────────┘  └──────────────────┘    │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Storage: IndexedDB                          │
└─────────────────────────────────────────────┘
```

## Tech Stack

- **AI**: `window.ai` Prompt API + `navigator.modelContext` (WebMCP)
- **Frontend**: React 19, TanStack Router, Tailwind CSS 4, shadcn/ui
- **Database**: PGlite (PostgreSQL in WASM), Drizzle ORM
- **Validation**: Zod (tool input schemas)
- **Build**: Vite 7, TypeScript 5.8

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Key Files

### WebMCP Integration Layer (`src/lib/webmcp/`)

- `types.ts` - TypeScript definitions for `window.ai`, `navigator.modelContext`, tools, and chat messages
- `use-model-context.ts` - `useModelContext` hook replacing `useWebMCP`. Converts Zod schemas to JSON Schema and registers tools with `navigator.modelContext`
- `use-window-ai.ts` - `useWindowAI` hook for AI chat via Chrome's built-in language model

### Tool Hooks (`src/hooks/`)

- `useMCPNavigationTool.ts` - Route navigation tool
- `useMCPEntityTools.ts` - CRUD operations for memory entities
- `useMCPMemoryBlockTools.ts` - CRUD operations for memory blocks
- `useMCPSQLTool.ts` - SQL query execution tool

### Database (`src/lib/db/`)

- Full Drizzle schema with memory blocks, entities, relationships, conversations
- Seed data with WebMCP-related knowledge
- PGlite (PostgreSQL in WASM) with IndexedDB persistence

## Browser Requirements

- **window.ai**: Chrome with `chrome://flags/#optimization-guide-on-device-model` enabled
- **navigator.modelContext**: Currently a W3C proposal - the app includes a local registry fallback

## Pages

- `/dashboard` - Stats, charts, and AI chat panel
- `/entities` - Memory entities with category filtering
- `/memory-blocks` - Always-in-context memory management
- `/sql-repl` - Interactive SQL terminal (PGlite)
- `/about` - Architecture details and registered tools list
