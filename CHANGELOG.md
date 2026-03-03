# Changelog

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
