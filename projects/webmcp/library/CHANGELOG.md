# Changelog

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
