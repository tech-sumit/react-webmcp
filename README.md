# react-webmcp

React hooks and components for the [WebMCP](https://github.com/webmachinelearning/webmcp) standard — expose structured tools for AI agents on your website.

WebMCP is a W3C-proposed web standard (Chrome 149+ origin trial) that allows websites to register tools that AI agents can discover and invoke directly, replacing unreliable screen-scraping with robust, schema-driven interaction.

**react-webmcp** provides idiomatic React primitives for three API styles: **Imperative** (hooks), **Declarative** (HTML-attributed components), and **Adapter** (framework-agnostic wrappers for Material UI, Ant Design, and custom components).

## Features

### Imperative API

- **`useWebMCPTool`** — Register a single tool with automatic lifecycle management (mount/unmount)
- **`useWebMCPContext`** — Register (and swap) a set of tools at once
- **`useToolEvent`** — Listen for `toolactivated` and `toolcancel` events
- **`listWebMCPTools`** / **`executeWebMCPTool`** — Discover and run tools from in-page agents via `getTools()` / `executeTool()`

### Declarative API

> The declarative API was removed from the spec text in October 2026 (it remains in the [explainer](https://github.com/webmachinelearning/webmcp/blob/main/declarative-api-explainer.md) and Chrome still supports it), so these components may change.

- **`<WebMCPForm>`** — Declarative form component with `toolname` / `tooldescription` attributes
- **`<WebMCPInput>`, `<WebMCPSelect>`, `<WebMCPTextarea>`** — Form controls with `toolparam*` attributes

### Adapter API (third-party UI libraries)

- **`<WebMCP.Tool>`** — Wrapper that auto-detects fields from children, merges with `fields` prop, and registers via context
- **`<WebMCP.Field>`** — Zero-UI wrapper for custom components that can't be auto-detected
- **`useRegisterField`** — Hook to register field metadata from inside any component
- **`extractFields`**, **`buildInputSchema`**, **`validateSchema`** — Utilities for schema generation and dev-mode validation

### General

- **`<WebMCPProvider>`** — Context provider for availability detection
- Full TypeScript support with `document.modelContext` type augmentation (legacy `navigator.modelContext` still supported)
- SSR-safe tool registration and schema collection
- Works with the [Model Context Tool Inspector](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd) extension

## Requirements

- **React** 18+
- **Chrome** 149+ with `chrome://flags/#enable-webmcp-testing` enabled, or a page enrolled in the [WebMCP origin trial](https://developer.chrome.com/blog/ai-webmcp-origin-trial). Chrome 146–151 builds that only expose `navigator.modelContext` keep working

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

### Adapter API (WebMCP.Tool + useRegisterField)

Integrate with third-party UI libraries (Material UI, Ant Design) or custom components. The Adapter API auto-detects fields from children, or lets you declare them explicitly:

```tsx
import { WebMCP, WebMCPProvider } from "react-webmcp";

// Auto-detection: fields inferred from input/select props
<WebMCP.Tool
  name="submit_contact"
  description="Submit a contact form"
  onExecute={(input) => console.log(input)}
>
  <input name="email" type="email" required />
  <select name="subject">
    <option value="general">General</option>
    <option value="support">Support</option>
  </select>
</WebMCP.Tool>

// Explicit registration: for custom components without standard props
<WebMCP.Tool name="rate_feedback" description="Rate our product" onExecute={handler}>
  <WebMCP.Field name="rating" type="number" required min={1} max={5}>
    <StarRating value={rating} onChange={setRating} />
  </WebMCP.Field>
</WebMCP.Tool>
```

For components you control, use `useRegisterField` inside a wrapper:

```tsx
function RatingField({ value, onChange }) {
  useRegisterField({
    name: "rating",
    type: "number",
    required: true,
    min: 1,
    max: 5,
  });
  return <StarRating value={value} onChange={onChange} />;
}
```

## API Reference

### Hooks

#### `useWebMCPTool(config)`

Registers a single tool with `document.modelContext.registerTool(tool, { signal })` on mount and unregisters on unmount by aborting the signal (per spec; `unregisterTool()` is only used on legacy builds).

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Unique tool identifier: 1–128 chars of `[A-Za-z0-9_.-]` |
| `title` | `string` | *(optional)* Human-readable label shown in browser UI |
| `description` | `string` | Human-readable description for agents |
| `inputSchema` | `JSONSchema` | JSON Schema for input parameters |
| `outputSchema` | `JSONSchema` | *(optional, library extension)* JSON Schema for output — not in the spec |
| `annotations` | `ToolAnnotations` | *(optional)* `readOnlyHint`, `untrustedContentHint`, `consequentialHint`, `debugging` |
| `exposedTo` | `string[]` | *(optional)* Extra origins in the frame tree the tool is exposed to |
| `execute` | `(input, { signal }) => any` | Handler called on invocation; `signal` aborts if the agent cancels |

#### `useWebMCPContext(config)`

Registers a set of tools; when the set changes, the previous tools are unregistered and the new ones registered. All are unregistered on unmount. The spec removed `provideContext()` / `clearContext()`, so tools registered elsewhere on the page are no longer cleared.

```tsx
useWebMCPContext({
  tools: [
    { name: "tool1", description: "...", inputSchema: {}, execute: () => "ok" },
    { name: "tool2", description: "...", inputSchema: {}, execute: () => "ok" },
  ],
});
```

#### `useToolEvent(event, callback, toolNameFilter?)`

Listens for WebMCP events on `document.modelContext` (per spec) and `window` (legacy / declarative).

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

### Adapter API

#### `<WebMCP.Tool>` / `<WebMCPTool>`

Wrapper component that collects field definitions from children (auto-detection), the `fields` prop, and context-registered fields via `useRegisterField`, then registers the tool with the generated JSON Schema.

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Unique tool identifier |
| `description` | `string` | Human-readable description for agents |
| `onExecute` | `(input) => any` | Handler called on invocation |
| `fields` | `Record<string, Partial<FieldDefinition>>` | *(optional)* Override or enrich field metadata |
| `strict` | `boolean` | *(optional)* Throw on schema validation errors in dev (default: `false`) |
| `autoSubmit` | `boolean` | *(optional)* Submit when invoked by agent |
| `annotations` | `ToolAnnotations` | *(optional)* Tool hints |
| `onToolActivated` | `(name) => void` | *(optional)* Activation callback |
| `onToolCancel` | `(name) => void` | *(optional)* Cancel callback |

#### `<WebMCP.Field>` / `<WebMCPField>`

Zero-UI wrapper that registers a field via context. Renders a Fragment. Use when child components don't expose `name` or other form props.

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Field name |
| `type` | `string` | *(optional)* HTML input type, default `"string"` |
| `required` | `boolean` | *(optional)* Whether required |
| `description` | `string` | *(optional)* Description for agents |
| `min`, `max` | `number` | *(optional)* Numeric constraints |
| `minLength`, `maxLength` | `number` | *(optional)* String length constraints |
| `pattern` | `string` | *(optional)* Regex for string validation |
| `enumValues` | `Array` of string/number/boolean | *(optional)* Allowed values |
| `oneOf` | `{ value, label }[]` | *(optional)* Labelled options (auto-detected from `<option>` children if omitted) |

#### `useRegisterField(field)`

Registers field metadata with the nearest `WebMCP.Tool` context. Call from inside custom components that don't render standard form elements. SSR-safe.

```tsx
useRegisterField({
  name: "rating",
  type: "number",
  required: true,
  min: 1,
  max: 5,
  description: "Star rating from 1 to 5",
});
```

#### `FieldDefinition`

Type for field metadata. See `src/adapters/types.ts` for the full interface.

#### Utilities (schema building)

- **`extractFields(children)`** — Traverse React children and extract `FieldDefinition[]` from `name`, `type`, `required`, etc.
- **`extractOptions(children)`** — Extract `{ value, label }[]` from `<option>` or `MenuItem`-like children.
- **`buildInputSchema(fields)`** — Convert `FieldDefinition[]` to JSON Schema.
- **`validateSchema(fields, { strict? })`** — Dev-mode validation; warns (or throws if `strict`) on conflicts.

### Utilities

#### `isWebMCPAvailable()`

Returns `true` if `document.modelContext` (or the legacy `navigator.modelContext`) is available.

#### `isWebMCPTestingAvailable()` *(deprecated)*

Returns `true` if the legacy `navigator.modelContextTesting` is available. It was removed in Chrome 152.

#### `getModelContext()`

Returns `document.modelContext`, falling back to `navigator.modelContext`, or `null`.

#### `listWebMCPTools()`

Resolves with the tools exposed to this document (`document.modelContext.getTools()`), or `[]` when WebMCP is unavailable.

#### `executeWebMCPTool(nameOrTool, input?, { signal }?)`

Runs a tool via `document.modelContext.executeTool()` and resolves with its JSON-stringified result. Passes `input` as an object per spec and retries with a JSON string for Chrome 153, which still expects one.

## Tool Annotations

Annotations provide metadata hints to AI agents. The spec's `ToolAnnotations` defines four booleans, all defaulting to `false`: `readOnlyHint`, `untrustedContentHint` (output contains untrusted data), `consequentialHint` (significant, real-world or irreversible action) and `debugging` (developer tooling only). Chrome 153 implements `readOnlyHint` and `untrustedContentHint` so far. Other fields are library-level extensions:

```tsx
useWebMCPTool({
  name: "deleteAccount",
  description: "Permanently delete the user account",
  inputSchema: { type: "object", properties: { confirm: { type: "boolean" } } },
  annotations: {
    readOnlyHint: false,          // spec
    consequentialHint: true,      // spec: irreversible, real-world action
    idempotentHint: false,        // library extension (not in the spec)
  },
  execute: ({ confirm }) => {
    if (!confirm) return "Deletion cancelled.";
    // ...delete logic
    return "Account deleted.";
  },
});
```

## Demos

Four demo apps showcase the different API styles. See [demos/README.md](./demos/README.md) for a detailed comparison and quick-start guide.

| Demo | API | Description |
|------|-----|-------------|
| [french-bistro](./demos/french-bistro) | Declarative | Restaurant reservation form — `WebMCPForm`, `WebMCPInput`, `WebMCPSelect`, `WebMCPTextarea` |
| [flight-search](./demos/flight-search) | Imperative | Flight search with `useWebMCPTool` — `searchFlights`, `listFlights`, `setFilters`, `resetFilters` |
| [contact-form](./demos/contact-form) | All four | Same form implemented four ways side-by-side for comparison |
| [custom-components](./demos/custom-components) | Adapter | Custom UI (`StarRating`, `TagInput`, `ColorPicker`) with `useRegisterField` and `WebMCP.Field` |

```bash
cd demos/<demo-name>
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
    ├─ useWebMCPTool()   ──► document.modelContext.registerTool(tool, { signal })
    ├─ <WebMCPForm>      ──► <form toolname="..." tooldescription="...">
    ├─ <WebMCP.Tool>     ──► Collects fields (children + fields + useRegisterField)
    │                         → buildInputSchema() → registerTool()
    │
    └─ Browser (Chrome 149+)
         │
         ├─ document.modelContext         ◄── Your tools registered here
         ├─ getTools() / executeTool()    ◄── In-page agents and inspectors read from here
         │
         └─ AI Agent (Gemini, etc.)       ◄── Discovers and calls tools
```

## TypeScript

The library extends the global `Document` interface with `modelContext` (and `Navigator` with the legacy `modelContext` / `modelContextTesting`). Import the types:

```typescript
import type {
  WebMCPToolDefinition,
  JSONSchema,
  ToolAnnotations,
  WebMCPFormSubmitEvent,
  WebMCPToolProps,
  WebMCPFieldProps,
  FieldDefinition,
  ModelContext,
  RegisteredTool,
} from "react-webmcp";
```

## License

MIT
