# react-webmcp

React hooks and components for the [WebMCP](https://github.com/webmachinelearning/webmcp) standard — expose structured tools for AI agents on your website.

WebMCP is a W3C-proposed web standard (Chrome 146+) that allows websites to register tools that AI agents can discover and invoke directly, replacing unreliable screen-scraping with robust, schema-driven interaction.

**react-webmcp** provides idiomatic React primitives for both the Imperative and Declarative WebMCP APIs.

## Features

- **`useWebMCPTool`** — Register a single tool with automatic lifecycle management (mount/unmount)
- **`useWebMCPContext`** — Register multiple tools at once via `provideContext()`
- **`useToolEvent`** — Listen for `toolactivated` and `toolcancel` browser events
- **`<WebMCPForm>`** — Declarative form component with `toolname` / `tooldescription` attributes
- **`<WebMCPInput>`, `<WebMCPSelect>`, `<WebMCPTextarea>`** — Form controls with `toolparam*` attributes
- **`<WebMCPProvider>`** — Context provider for availability detection
- Full TypeScript support with `navigator.modelContext` type augmentation
- Works with the [Model Context Tool Inspector](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd) extension

## Requirements

- **React** 18+
- **Chrome** 146.0.7672.0+ with the `WebMCP for testing` flag enabled at `chrome://flags/#enable-webmcp-testing`

## Installation

```bash
npm install react-webmcp
```

## Quick Start

### Imperative API (Hooks)

Register tools as React hooks — they are automatically registered on mount and unregistered on unmount:

```tsx
import { useWebMCPTool } from "react-webmcp";

function TodoApp() {
  const [todos, setTodos] = useState<string[]>([]);

  useWebMCPTool({
    name: "addTodo",
    description: "Add a new item to the todo list",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The todo item text" },
      },
      required: ["text"],
    },
    execute: ({ text }) => {
      setTodos((prev) => [...prev, text as string]);
      return { content: [{ type: "text", text: `Added todo: ${text}` }] };
    },
  });

  return (
    <ul>
      {todos.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}
```

### Declarative API (Components)

Wrap standard HTML forms with WebMCP components to expose them as tools:

```tsx
import {
  WebMCPForm,
  WebMCPInput,
  WebMCPSelect,
  useToolEvent,
} from "react-webmcp";

function ReservationForm() {
  useToolEvent("toolactivated", (toolName) => {
    console.log(`Agent activated: ${toolName}`);
  });

  return (
    <WebMCPForm
      toolName="book_table"
      toolDescription="Book a table at the restaurant"
      onSubmit={(e) => {
        e.preventDefault();
        if (e.agentInvoked) {
          e.respondWith(Promise.resolve("Booking confirmed!"));
        }
      }}
    >
      <WebMCPInput
        name="name"
        type="text"
        toolParamDescription="Customer's full name"
        required
      />
      <WebMCPSelect
        name="guests"
        toolParamDescription="Number of guests"
      >
        <option value="1">1 Person</option>
        <option value="2">2 People</option>
        <option value="3">3 People</option>
        <option value="4">4 People</option>
      </WebMCPSelect>
      <button type="submit">Book</button>
    </WebMCPForm>
  );
}
```

## API Reference

### Hooks

#### `useWebMCPTool(config)`

Registers a single tool with `navigator.modelContext.registerTool()` on mount and unregisters on unmount.

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Unique tool identifier |
| `description` | `string` | Human-readable description for agents |
| `inputSchema` | `JSONSchema` | JSON Schema for input parameters |
| `outputSchema` | `JSONSchema` | *(optional, library extension)* JSON Schema for output — not in browser WebIDL |
| `annotations` | `ToolAnnotations` | *(optional)* Hints; only `readOnlyHint` (`boolean`) is browser-native |
| `execute` | `(input) => any` | Handler function called on invocation |

#### `useWebMCPContext(config)`

Replaces all registered tools using `provideContext()`. Calls `clearContext()` on unmount.

```tsx
useWebMCPContext({
  tools: [
    { name: "tool1", description: "...", inputSchema: {}, execute: () => "ok" },
    { name: "tool2", description: "...", inputSchema: {}, execute: () => "ok" },
  ],
});
```

#### `useToolEvent(event, callback, toolNameFilter?)`

Listens for WebMCP browser events.

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `"toolactivated" \| "toolcancel"` | Event name |
| `callback` | `(toolName: string) => void` | Event handler |
| `toolNameFilter` | `string` | *(optional)* Only fire for this tool |

#### `useWebMCPStatus()`

Returns WebMCP availability status (requires `<WebMCPProvider>`).

```tsx
const { available, testingAvailable } = useWebMCPStatus();
```

### Components

#### `<WebMCPForm>`

Renders a `<form>` with WebMCP declarative attributes.

| Prop | Type | Description |
|------|------|-------------|
| `toolName` | `string` | Maps to `toolname` attribute |
| `toolDescription` | `string` | Maps to `tooldescription` attribute |
| `toolAutoSubmit` | `boolean` | *(optional)* Maps to `toolautosubmit` |
| `onSubmit` | `(event) => void` | Enhanced event with `agentInvoked` and `respondWith` |
| `onToolActivated` | `(name) => void` | *(optional)* Tool activation callback |
| `onToolCancel` | `(name) => void` | *(optional)* Tool cancel callback |

#### `<WebMCPInput>`, `<WebMCPSelect>`, `<WebMCPTextarea>`

Standard HTML form elements with additional WebMCP props:

| Prop | Type | Description |
|------|------|-------------|
| `toolParamTitle` | `string` | *(optional)* Maps to `toolparamtitle` |
| `toolParamDescription` | `string` | *(optional)* Maps to `toolparamdescription` |

All standard HTML attributes are also supported.

#### `<WebMCPProvider>`

Context provider that makes WebMCP availability info accessible via `useWebMCPStatus()`.

### Utilities

#### `isWebMCPAvailable()`

Returns `true` if `navigator.modelContext` is available.

#### `isWebMCPTestingAvailable()`

Returns `true` if `navigator.modelContextTesting` is available (inspector API).

#### `getModelContext()`

Returns the `navigator.modelContext` object or `null`.

## Tool Annotations

Annotations provide metadata hints to AI agents. Per the browser's WebIDL (`AnnotationsDict`), only `readOnlyHint` (`boolean`) is currently implemented in Chrome. The other fields are library-level extensions that may be used by higher-level agent frameworks:

```tsx
useWebMCPTool({
  name: "deleteAccount",
  description: "Permanently delete the user account",
  inputSchema: { type: "object", properties: { confirm: { type: "boolean" } } },
  annotations: {
    readOnlyHint: false,          // browser-native (boolean per WebIDL)
    destructiveHint: true,        // library extension (not in browser yet)
    idempotentHint: false,        // library extension (not in browser yet)
  },
  execute: ({ confirm }) => {
    if (!confirm) return "Deletion cancelled.";
    // ...delete logic
    return "Account deleted.";
  },
});
```

## Demos

### Flight Search (Imperative API)

Replicates Google's [react-flightsearch](https://googlechromelabs.github.io/webmcp-tools/demos/react-flightsearch/) demo using `useWebMCPTool` hooks. Exposes 4 tools: `searchFlights`, `listFlights`, `setFilters`, `resetFilters`.

```bash
cd demos/flight-search
npm install
npm run dev
```

### French Bistro (Declarative API)

Replicates Google's [french-bistro](https://googlechromelabs.github.io/webmcp-tools/demos/french-bistro/) demo using `<WebMCPForm>` and `<WebMCPInput>` components. Exposes the `book_table_le_petit_bistro` tool.

```bash
cd demos/french-bistro
npm install
npm run dev
```

## Testing with the Inspector

1. Install the [Model Context Tool Inspector](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd) Chrome extension
2. Enable `chrome://flags/#enable-webmcp-testing`
3. Run a demo app and open the extension
4. You should see the registered tools listed with their schemas
5. Execute tools manually or test with the built-in Gemini agent

## How It Works

```
Your React App
    │
    ├─ useWebMCPTool()  ──► navigator.modelContext.registerTool()
    ├─ <WebMCPForm>     ──► <form toolname="..." tooldescription="...">
    │
    └─ Browser (Chrome 146+)
         │
         ├─ navigator.modelContext        ◄── Your tools registered here
         ├─ navigator.modelContextTesting ◄── Inspector reads from here
         │
         └─ AI Agent (Gemini, etc.)       ◄── Discovers and calls tools
```

## TypeScript

The library extends the global `Navigator` interface with `modelContext` and `modelContextTesting` types. Import the types:

```typescript
import type {
  WebMCPToolDefinition,
  JSONSchema,
  ToolAnnotations,
  WebMCPFormSubmitEvent,
  ModelContext,
} from "react-webmcp";
```

## License

MIT
