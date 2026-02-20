# react-webmcp Demos

Four demo apps showing the different ways to register WebMCP tools with `react-webmcp`.

## Overview

| Demo | API Style | What it shows |
|------|-----------|---------------|
| [french-bistro](./french-bistro) | Declarative | `WebMCPForm`, `WebMCPInput`, `WebMCPSelect`, `WebMCPTextarea` — renders HTML with WebMCP attributes that the browser auto-registers |
| [flight-search](./flight-search) | Imperative | `useWebMCPTool` with a hand-written JSON Schema — full control over schema and execution |
| [contact-form](./contact-form) | All four | Side-by-side comparison of Declarative, Imperative, Adapter auto-detection, and Adapter `WebMCP.Field` |
| [custom-components](./custom-components) | Adapter | `WebMCP.Tool` with `useRegisterField`, `WebMCP.Field`, auto-detection, and `fields` prop enrichment working together |

## Quick start

Each demo is a standalone Vite + React app that links to the library via `file:../../`.

```bash
# From the library root
cd demos/<demo-name>
npm install
npm run dev
```

Open the Vite dev server URL (default `http://localhost:5173`) in **Chrome 146+** with the "WebMCP for testing" flag enabled to see tools registered in the Model Context Tool Inspector.

## Which API should I use?

```
┌──────────────────────────────────────────────────────┐
│ Are you building with native HTML form elements?     │
│                                                      │
│   YES ──► Declarative API (WebMCPForm + WebMCPInput) │
│           Simplest — zero JS needed for registration │
│                                                      │
│   NO  ──► Do you need full schema control?           │
│                                                      │
│       YES ──► Imperative API (useWebMCPTool)         │
│               Write the JSON Schema by hand          │
│                                                      │
│       NO  ──► Can fields be auto-detected from       │
│               props.name on child components?        │
│                                                      │
│           YES ──► Adapter API (WebMCP.Tool)          │
│                   Auto-detection + fields prop       │
│                                                      │
│           NO  ──► Adapter API (WebMCP.Field or       │
│                   useRegisterField)                  │
│                   Escape hatch for custom components │
└──────────────────────────────────────────────────────┘
```
