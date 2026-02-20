# Custom Components — Advanced Adapter API Demo

Demonstrates the Adapter API with custom UI components that have no standard HTML form elements.

## API used

- `WebMCP.Tool` — context provider and tool registrar
- `WebMCP.Field` — zero-UI field declaration wrapper
- `useRegisterField` — hook for registering field metadata from inside a component
- Auto-detection — standard fields (`<input>`, `<select>`) are discovered automatically
- `fields` prop enrichment — adds descriptions to auto-detected fields

## Patterns shown

### Pattern 1: `useRegisterField` wrappers

Custom components (`StarRating`, `TagInput`, `ColorPicker`) don't expose `name` props or render form elements. Thin wrapper components call `useRegisterField()` to declare their metadata:

```tsx
function RatingField({ value, onChange }: Props) {
  useRegisterField({
    name: "rating",
    type: "number",
    required: true,
    min: 1,
    max: 5,
    description: "Star rating from 1 to 5",
  });
  return <StarRating value={value} onChange={onChange} />;
}
```

### Pattern 2: `WebMCP.Field` for opaque children

For third-party components where you can't add hooks:

```tsx
<WebMCP.Field name="colour" type="string" description="...">
  <ColorPicker value={colour} onChange={setColour} />
</WebMCP.Field>
```

### Pattern 3: Auto-detected fields

Standard `<input>` and `<select>` elements inside `WebMCP.Tool` are automatically detected:

```tsx
<input name="title" type="text" required />
<select name="category">
  <option value="bug">Bug</option>
  <option value="feature">Feature</option>
</select>
```

### Pattern 4: Combined

All three patterns work together in a single `WebMCP.Tool`, and the `fields` prop adds descriptions to any auto-detected fields.

## Tool registered

**`create_feedback`** — Submit product feedback with a star rating, title, tags, category, colour label, and additional notes. Demonstrates auto-detection, `useRegisterField`, and `WebMCP.Field` combined.

## Run

```bash
npm install
npm run dev
```
