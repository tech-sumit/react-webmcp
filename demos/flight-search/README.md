# Flight Search — Imperative API Demo

A multi-page flight search app built with the **Imperative API** and React Router.

## API used

- `useWebMCPTool` — registers a tool with a hand-written JSON Schema
- `WebMCPProvider` — provides availability status context

## How it works

The `FlightSearch` component calls `useWebMCPTool()` with a manually defined `inputSchema` that describes origin, destination, trip type, dates, and passenger count. The `execute` callback validates IATA codes, navigates to a results page, and resolves with a status message.

This approach gives full control over the schema shape (including `pattern`, `format`, `enum` constraints) and the execution flow. The `execute` function is always called through a ref, so it never needs to be memoised.

## Tool registered

**`searchFlights`** — Searches for flights with origin/destination IATA codes, trip type, dates, and passenger count. Navigates to the results page on execution.

## Run

```bash
npm install
npm run dev
```
