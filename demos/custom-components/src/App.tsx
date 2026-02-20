import { useState, useCallback } from "react";
import { WebMCPProvider, WebMCP, useRegisterField } from "react-webmcp";
import { StarRating, TagInput, ColorPicker } from "./my-ui";
import "./App.css";

// ---------------------------------------------------------------------------
// WebMCP-aware wrappers for custom components using useRegisterField.
//
// This pattern lets you wrap ANY custom component — even those with no
// standard HTML form elements inside — and make them visible to WebMCP.
// Each wrapper calls useRegisterField() to declare its field metadata.
// ---------------------------------------------------------------------------

function RatingField({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  useRegisterField({
    name: "rating",
    type: "number",
    required: true,
    description: "Star rating from 1 to 5",
    min: 1,
    max: 5,
  });

  return <StarRating value={value} onChange={onChange} />;
}

function TagsField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  useRegisterField({
    name: "tags",
    type: "text",
    description: "Comma-separated tags for the feedback",
  });

  return <TagInput value={value} onChange={onChange} placeholder="Add tags..." />;
}

function ThemeColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  useRegisterField({
    name: "theme_color",
    type: "text",
    description: "Preferred theme color as hex code",
    enumValues: [
      "#ef4444", "#f97316", "#eab308", "#22c55e",
      "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
    ],
  });

  return <ColorPicker value={value} onChange={onChange} />;
}

// ---------------------------------------------------------------------------
// The main app — uses WebMCP.Tool with a mix of auto-detected fields,
// fields prop enrichment, WebMCP.Field escape hatch, and useRegisterField.
// ---------------------------------------------------------------------------

export default function App() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("product");
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [themeColor, setThemeColor] = useState("#3b82f6");
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const handleExecute = useCallback(
    (input: Record<string, unknown>) => {
      const summary = JSON.stringify(input, null, 2);
      setResult(summary);
      return { content: [{ type: "text" as const, text: summary }] };
    },
    [],
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleExecute({
      name,
      category,
      rating,
      tags: tags.join(", "),
      theme_color: themeColor,
      comment,
    });
  };

  return (
    <WebMCPProvider>
      <div className="page">
        <div className="page-header">
          <h1>Custom Components + WebMCP</h1>
          <p>
            Shows how <code>useRegisterField</code>, <code>WebMCP.Field</code>,
            and auto-detection work together
          </p>
        </div>

        <div className="form-container">
          <h2>Product Feedback</h2>

          <WebMCP.Tool
            name="submit_feedback"
            description="Submit product feedback with rating, tags, and color preference"
            fields={{
              name: { description: "Reviewer's name" },
              comment: { description: "Detailed feedback text" },
            }}
            onExecute={handleExecute}
          >
            <form onSubmit={handleSubmit}>
              {/* Auto-detected: has name prop */}
              <div className="form-group">
                <label>Your Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Auto-detected: select with name + option values */}
              <div className="form-group">
                <label>Category</label>
                <select
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="product">Product</option>
                  <option value="service">Service</option>
                  <option value="website">Website</option>
                  <option value="mobile_app">Mobile App</option>
                </select>
              </div>

              {/* useRegisterField: custom StarRating component */}
              <div className="form-group">
                <label>Rating</label>
                <RatingField value={rating} onChange={setRating} />
              </div>

              {/* useRegisterField: custom TagInput component */}
              <div className="form-group">
                <label>Tags</label>
                <TagsField value={tags} onChange={setTags} />
              </div>

              {/* useRegisterField: custom ColorPicker component */}
              <div className="form-group">
                <label>Theme Color</label>
                <ThemeColorField value={themeColor} onChange={setThemeColor} />
              </div>

              {/* WebMCP.Field escape hatch: textarea without name prop */}
              <WebMCP.Field name="comment" required description="Detailed feedback text">
                <div className="form-group">
                  <label>Comments</label>
                  <textarea
                    rows={3}
                    placeholder="Tell us more..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
              </WebMCP.Field>

              <button type="submit" className="submit-btn">
                Submit Feedback
              </button>
            </form>
          </WebMCP.Tool>

          {result && (
            <div className="result-card">
              <h3>Tool Payload</h3>
              <pre>{result}</pre>
            </div>
          )}
        </div>
      </div>
    </WebMCPProvider>
  );
}
