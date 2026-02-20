# Contact Form — All Four API Styles

A single contact form implemented four different ways, side by side.

## APIs demonstrated

### 1. Declarative API

```tsx
<WebMCPForm toolName="submit_contact_declarative" toolDescription="...">
  <WebMCPInput name="email" type="email" required toolParamDescription="..." />
  <WebMCPSelect name="subject" toolParamDescription="...">
    <option value="general">General Inquiry</option>
  </WebMCPSelect>
</WebMCPForm>
```

Uses `WebMCPForm`, `WebMCPInput`, `WebMCPSelect`, `WebMCPTextarea`. The browser auto-registers the form via HTML attributes.

### 2. Imperative API

```tsx
useWebMCPTool({
  name: "submit_contact_imperative",
  description: "...",
  inputSchema: {
    type: "object",
    properties: {
      email: { type: "string", description: "..." },
      subject: { type: "string", enum: ["general", "support", "billing"] },
    },
    required: ["email", "subject"],
  },
  execute: (input) => { /* ... */ },
});
```

Full manual control over the JSON Schema and execution.

### 3. Adapter API — Auto-detection

```tsx
<WebMCP.Tool
  name="submit_contact_adapter"
  description="..."
  fields={{ email: { description: "..." } }}
  onExecute={handler}
>
  <input name="email" type="email" required />
  <select name="subject">
    <option value="general">General Inquiry</option>
  </select>
</WebMCP.Tool>
```

`WebMCP.Tool` auto-detects field names, types, constraints, and enum values from the React children tree. The `fields` prop adds descriptions without touching child components.

### 4. Adapter API — WebMCP.Field

```tsx
<WebMCP.Tool name="submit_contact_field" description="..." onExecute={handler}>
  <WebMCP.Field name="email" type="email" required description="...">
    <FormField label="Email">
      <input type="email" />
    </FormField>
  </WebMCP.Field>
</WebMCP.Tool>
```

`WebMCP.Field` is a zero-UI wrapper for components whose props can't be auto-detected. It renders a Fragment and registers the field via context.

## Tools registered

Four tools are registered simultaneously, one per API style:

- `submit_contact_declarative`
- `submit_contact_imperative`
- `submit_contact_adapter`
- `submit_contact_field`

## Run

```bash
npm install
npm run dev
```
