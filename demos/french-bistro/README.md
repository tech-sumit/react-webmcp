# French Bistro — Declarative API Demo

A restaurant reservation form built entirely with the **Declarative API**.

## API used

- `WebMCPForm` — wraps a `<form>` with `toolname` and `tooldescription` HTML attributes
- `WebMCPInput` — wraps `<input>` with `toolparamdescription`
- `WebMCPSelect` — wraps `<select>` with `toolparamdescription`
- `WebMCPTextarea` — wraps `<textarea>` with `toolparamdescription`
- `useToolEvent` — listens for `toolactivated` to run pre-validation
- `WebMCPProvider` — provides availability status context

## How it works

The declarative components render standard HTML elements with custom attributes (`toolname`, `tooldescription`, `toolparamdescription`, `toolautosubmit`). Chrome 146+ reads these attributes and automatically registers the form as a WebMCP tool — no JavaScript registration needed.

The `onSubmit` handler receives a `WebMCPFormSubmitEvent` with `agentInvoked` (whether an AI triggered the submit) and `respondWith()` (to return a result to the agent).

## Tool registered

**`book_table_le_petit_bistro`** — Creates a confirmed dining reservation. Accepts name, phone, date, time, guest count, seating preference, and special requests.

## Run

```bash
npm install
npm run dev
```
