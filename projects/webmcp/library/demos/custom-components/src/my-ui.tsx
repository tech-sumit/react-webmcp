import React, { useState } from "react";

/**
 * Simulated custom UI component library.
 * These components mimic the patterns of real libraries like Material UI,
 * Ant Design, or Chakra UI — they don't expose a `name` prop on the outer
 * wrapper, making them invisible to WebMCP auto-detection.
 */

// ---------------------------------------------------------------------------
// StarRating — a fully custom input with no native HTML form element
// ---------------------------------------------------------------------------

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
}

export function StarRating({ value, onChange, max = 5 }: StarRatingProps) {
  return (
    <div style={{ display: "flex", gap: 4, cursor: "pointer" }}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          onClick={() => onChange(i + 1)}
          style={{
            fontSize: "1.5rem",
            color: i < value ? "#f59e0b" : "#d1d5db",
            transition: "color 0.1s",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TagInput — a multi-value input that produces a comma-separated string
// ---------------------------------------------------------------------------

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({
  value,
  onChange,
  placeholder = "Add tag...",
}: TagInputProps) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      if (!value.includes(input.trim())) {
        onChange([...value, input.trim()]);
      }
      setInput("");
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div
      style={{
        border: "1px solid #d1d5db",
        borderRadius: 6,
        padding: "0.4rem",
        display: "flex",
        flexWrap: "wrap",
        gap: 4,
        background: "#fafafa",
      }}
    >
      {value.map((tag) => (
        <span
          key={tag}
          style={{
            background: "#e0e7ff",
            color: "#3730a3",
            padding: "0.15rem 0.5rem",
            borderRadius: 4,
            fontSize: "0.8rem",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.9rem",
              color: "#6366f1",
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ""}
        style={{
          border: "none",
          outline: "none",
          flex: 1,
          minWidth: 80,
          fontSize: "0.85rem",
          background: "transparent",
          padding: "0.15rem",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ColorPicker — a custom color selection component
// ---------------------------------------------------------------------------

const PALETTE = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: color,
            border: value === color ? "3px solid #1a1a2e" : "2px solid transparent",
            cursor: "pointer",
            transition: "border 0.15s",
          }}
        />
      ))}
    </div>
  );
}
