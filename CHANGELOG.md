# Changelog

## 0.4.0 (2026-10-23)

Aligns with the October 2026 WebMCP draft and Chromium, which moved the API to `document.modelContext` and removed `navigator.modelContext` / `navigator.modelContextTesting` in Chrome 152.

### Breaking changes

- **`getModelContext()` prefers `document.modelContext`**, falling back to the legacy `navigator.modelContext`
- **`useWebMCPContext` no longer calls `provideContext()` / `clearContext()`** (removed from the spec). It registers each tool with `registerTool()` and unregisters them on change/unmount, so tools registered elsewhere on the page are left alone
- **Tool names are validated against the spec** (1–128 chars of `[A-Za-z0-9_.-]`); invalid names throw a descriptive error, as empty names already did
- `ModelContext` type now describes the spec interface (`registerTool(tool, options): Promise<void>`, `getTools()`, `executeTool()`, `EventTarget`); `unregisterTool` / `provideContext` / `clearContext` are optional and deprecated

### Features

- **`inputSchema` is optional** on `useWebMCPTool` / `useWebMCPContext` tool definitions, as in the spec's `ModelContextTool`; it is left out of `registerTool()` when not given
- **Signal-based unregistration**: `useWebMCPTool` registers with `registerTool(tool, { signal })` and unregisters by aborting the signal. Legacy synchronous implementations still use `unregisterTool()`
- **Async registration errors**: rejected `registerTool()` promises are logged in development (with a specific warning for `InvalidStateError`) instead of going unhandled
- **New tool fields**: `title`, `exposedTo` and the spec annotations `untrustedContentHint`, `consequentialHint` and `debugging`
- **`execute(input, { signal })`**: handlers receive the browser's cancellation signal
- **In-page agent helpers**: `listWebMCPTools()` and `executeWebMCPTool(nameOrTool, input, { signal })`; the latter retries with a JSON-string input for Chrome 153
- **Events on `document.modelContext`**: `useToolEvent`, `<WebMCPForm>` and `<WebMCP.Tool>` listen for `toolactivated` / `toolcancel` on `document.modelContext` as well as `window`
- New exported types: `RegisteredTool`, `ToolExecuteOptions`, `ModelContextRegisterToolOptions`, `ModelContextGetToolsOptions`, `ModelContextExecuteToolOptions`

### Deprecations

- `isWebMCPTestingAvailable()`, `ModelContextTesting` and `WebMCPProvider`'s `testingAvailable` (the testing API was removed in Chrome 152)

### Notes

- The declarative API (`toolname` attributes) was removed from the spec text for now but remains in the explainer and in Chrome; the components are unchanged
- Verified against Chrome 153.0.8010.12: registration, `getTools()`, `executeTool()` and signal-based unregistration on unmount/remount


## 0.3.0 (2026-03-04)

### Features

- **Empty name/description validation**: `useWebMCPTool` and `useWebMCPContext` now throw a descriptive error if `name` or `description` is the empty string, catching the issue before the browser's `InvalidStateError`
- **`inputSchema` serialization pre-check**: In dev mode, `useWebMCPTool` tries `JSON.stringify(inputSchema)` before calling `registerTool()` and throws a helpful error on circular references or non-serializable values
- **`InvalidStateError` distinction**: The `useWebMCPTool` catch block now identifies duplicate tool name errors (`DOMException` with `name === "InvalidStateError"`) and logs a specific warning instead of a generic error
- **`readOnlyHint` in `listTools()` return type**: `ModelContextTesting.listTools()` return type now includes optional `readOnlyHint?: boolean` to match what Chrome will return per the formalized spec

### Spec alignment

- `ToolAnnotations.readOnlyHint` JSDoc updated to note it is now a first-class field in the spec's tool definition struct (extracted from annotations during `registerTool()` and stored as `read-only hint`, initially false)
- Validation behavior matches the spec's formalized `registerTool()` algorithm which throws `InvalidStateError` on empty name/description or duplicate tool names

## 0.2.0 (2026-02-17)

### Features

- **Imperative API hooks**: `useWebMCPTool`, `useWebMCPContext`, `useToolEvent`, `useWebMCPStatus` for React lifecycle-managed tool registration
- **Declarative API components**: `<WebMCPForm>`, `<WebMCPInput>`, `<WebMCPSelect>`, `<WebMCPTextarea>`, `<WebMCPProvider>` mapping to WebMCP HTML attributes (`toolname`, `tooldescription`, `toolparamtitle`, `toolparamdescription`)
- **Utility functions**: `isWebMCPAvailable()`, `isWebMCPTestingAvailable()`, `getModelContext()`
- **TypeScript support**: Navigator type augmentation for `modelContext` and `modelContextTesting`
- **Demo apps**:
  - **French Bistro** (Declarative API): Restaurant reservation form with `book_table_le_petit_bistro` tool, using `toolAutoSubmit` for agent-driven form submission
  - **Flight Search** (Imperative API): Flight search/booking with `searchFlights`, `listFlights`, `setFilters`, `resetFilters` tools

### Bug fixes

- **`toolAutoSubmit` prop**: Added to `<WebMCPForm>` to enable automatic form submission when invoked by agents — previously the form would fill but not submit, causing tool call timeouts
