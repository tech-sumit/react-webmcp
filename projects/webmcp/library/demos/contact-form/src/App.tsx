import { useState, useCallback } from "react";
import {
  WebMCPProvider,
  WebMCPForm,
  WebMCPInput,
  WebMCPSelect,
  WebMCPTextarea,
  WebMCP,
  useWebMCPTool,
} from "react-webmcp";
import type { WebMCPFormSubmitEvent } from "react-webmcp";
import "./App.css";

// ---------------------------------------------------------------------------
// Simulated third-party components (stand-ins for Material UI, Ant Design, etc.)
// These are plain components that know nothing about WebMCP.
// ---------------------------------------------------------------------------

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="form-group">
      <label>{label}</label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demo 1: Declarative API (WebMCPForm + WebMCPInput)
//
// Uses the built-in declarative components that render HTML with
// WebMCP attributes. The browser auto-registers the form as a tool.
// Best for simple forms built with native HTML elements.
// ---------------------------------------------------------------------------

function DeclarativeDemo() {
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = useCallback((e: WebMCPFormSubmitEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form));
    const text = `Contact submitted: ${data.name} (${data.email}) — ${data.subject}: ${data.message}`;
    setResult(text);
    if (e.agentInvoked) {
      e.respondWith(Promise.resolve(text));
    }
  }, []);

  return (
    <div className="form-container">
      <span className="api-label">Declarative API</span>
      <h2>Contact Us</h2>

      <WebMCPForm
        toolName="submit_contact_declarative"
        toolDescription="Submit a contact form message (declarative API)"
        toolAutoSubmit
        onSubmit={handleSubmit}
      >
        <div className="form-group">
          <label htmlFor="d-name">Full Name</label>
          <WebMCPInput
            id="d-name"
            name="name"
            type="text"
            required
            placeholder="Jane Smith"
            toolParamDescription="The sender's full name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="d-email">Email</label>
          <WebMCPInput
            id="d-email"
            name="email"
            type="email"
            required
            placeholder="jane@example.com"
            toolParamDescription="The sender's email address"
          />
        </div>

        <div className="form-group">
          <label htmlFor="d-subject">Subject</label>
          <WebMCPSelect
            id="d-subject"
            name="subject"
            required
            toolParamDescription="The subject category"
          >
            <option value="general">General Inquiry</option>
            <option value="support">Technical Support</option>
            <option value="billing">Billing Question</option>
            <option value="partnership">Partnership</option>
          </WebMCPSelect>
        </div>

        <div className="form-group">
          <label htmlFor="d-message">Message</label>
          <WebMCPTextarea
            id="d-message"
            name="message"
            required
            rows={3}
            placeholder="How can we help?"
            toolParamDescription="The message body"
          />
        </div>

        <button type="submit" className="submit-btn">
          Send Message
        </button>
      </WebMCPForm>

      {result && (
        <div className="result-card">
          <h3>Submitted</h3>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demo 2: Imperative API (useWebMCPTool)
//
// Manually defines the JSON Schema and registers the tool via the hook.
// Full control over schema shape, validation, and execution.
// Best when you need precise schema control or non-form tools.
// ---------------------------------------------------------------------------

function ImperativeDemo() {
  const [result, setResult] = useState<string | null>(null);

  useWebMCPTool({
    name: "submit_contact_imperative",
    description: "Submit a contact form message (imperative API)",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The sender's full name" },
        email: { type: "string", description: "The sender's email address" },
        subject: {
          type: "string",
          description: "The subject category",
          enum: ["general", "support", "billing", "partnership"],
        },
        message: { type: "string", description: "The message body" },
      },
      required: ["name", "email", "subject", "message"],
    },
    execute: (input) => {
      const text = `Contact submitted: ${input.name} (${input.email}) — ${input.subject}: ${input.message}`;
      setResult(text);
      return text;
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setResult(
      `Contact submitted: ${data.name} (${data.email}) — ${data.subject}: ${data.message}`,
    );
  };

  return (
    <div className="form-container">
      <span className="api-label">Imperative API</span>
      <h2>Contact Us</h2>

      <form onSubmit={handleSubmit}>
        <FormField label="Full Name">
          <input name="name" type="text" required placeholder="Jane Smith" />
        </FormField>

        <FormField label="Email">
          <input
            name="email"
            type="email"
            required
            placeholder="jane@example.com"
          />
        </FormField>

        <FormField label="Subject">
          <select name="subject" required>
            <option value="general">General Inquiry</option>
            <option value="support">Technical Support</option>
            <option value="billing">Billing Question</option>
            <option value="partnership">Partnership</option>
          </select>
        </FormField>

        <FormField label="Message">
          <textarea
            name="message"
            required
            rows={3}
            placeholder="How can we help?"
          />
        </FormField>

        <button type="submit" className="submit-btn">
          Send Message
        </button>
      </form>

      {result && (
        <div className="result-card">
          <h3>Submitted</h3>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demo 3: Adapter API — Auto-detection (WebMCP.Tool)
//
// Wraps any existing UI components in <WebMCP.Tool>. Field names, types,
// constraints, and enum values are auto-detected from the React tree.
// The `fields` prop adds descriptions without touching the components.
// Best for integrating third-party component libraries like Material UI.
// ---------------------------------------------------------------------------

function AdapterAutoDemo() {
  const [result, setResult] = useState<string | null>(null);

  const handleExecute = useCallback(
    (input: Record<string, unknown>) => {
      const text = `Contact submitted: ${input.name} (${input.email}) — ${input.subject}: ${input.message}`;
      setResult(text);
      return text;
    },
    [],
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setResult(
      `Contact submitted: ${data.name} (${data.email}) — ${data.subject}: ${data.message}`,
    );
  };

  return (
    <div className="form-container">
      <span className="api-label">Adapter API — Auto-detection</span>
      <h2>Contact Us</h2>

      <WebMCP.Tool
        name="submit_contact_adapter"
        description="Submit a contact form message (adapter API with auto-detection)"
        fields={{
          name: { description: "The sender's full name" },
          email: { description: "The sender's email address" },
          subject: { description: "The subject category" },
          message: { description: "The message body" },
        }}
        onExecute={handleExecute}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="Full Name">
            <input
              name="name"
              type="text"
              required
              placeholder="Jane Smith"
            />
          </FormField>

          <FormField label="Email">
            <input
              name="email"
              type="email"
              required
              placeholder="jane@example.com"
            />
          </FormField>

          <FormField label="Subject">
            <select name="subject" required>
              <option value="general">General Inquiry</option>
              <option value="support">Technical Support</option>
              <option value="billing">Billing Question</option>
              <option value="partnership">Partnership</option>
            </select>
          </FormField>

          <FormField label="Message">
            <textarea
              name="message"
              required
              rows={3}
              placeholder="How can we help?"
            />
          </FormField>

          <button type="submit" className="submit-btn">
            Send Message
          </button>
        </form>
      </WebMCP.Tool>

      {result && (
        <div className="result-card">
          <h3>Submitted</h3>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demo 4: Adapter API — WebMCP.Field escape hatch
//
// For components whose props can't be auto-detected (e.g. a custom
// <RichTextEditor>), wrap them in <WebMCP.Field> to explicitly declare
// the field metadata. Enum values are still auto-detected from children.
// ---------------------------------------------------------------------------

function AdapterFieldDemo() {
  const [result, setResult] = useState<string | null>(null);

  const handleExecute = useCallback(
    (input: Record<string, unknown>) => {
      const text = `Contact submitted: ${input.name} (${input.email}) — ${input.priority} priority: ${input.message}`;
      setResult(text);
      return text;
    },
    [],
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setResult(
      `Contact submitted: ${data.name} (${data.email}) — ${data.priority} priority: ${data.message}`,
    );
  };

  return (
    <div className="form-container">
      <span className="api-label">Adapter API — WebMCP.Field</span>
      <h2>Contact Us</h2>

      <WebMCP.Tool
        name="submit_contact_field"
        description="Submit a contact form message (adapter API with WebMCP.Field)"
        onExecute={handleExecute}
      >
        <form onSubmit={handleSubmit}>
          <WebMCP.Field
            name="name"
            type="text"
            required
            description="The sender's full name"
          >
            <FormField label="Full Name">
              <input type="text" placeholder="Jane Smith" />
            </FormField>
          </WebMCP.Field>

          <WebMCP.Field
            name="email"
            type="email"
            required
            description="The sender's email address"
          >
            <FormField label="Email">
              <input type="email" placeholder="jane@example.com" />
            </FormField>
          </WebMCP.Field>

          <WebMCP.Field name="priority" description="Message urgency level">
            <FormField label="Priority">
              <select name="priority">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </FormField>
          </WebMCP.Field>

          <WebMCP.Field
            name="message"
            required
            description="The message body"
          >
            <FormField label="Message">
              <textarea rows={3} placeholder="How can we help?" />
            </FormField>
          </WebMCP.Field>

          <button type="submit" className="submit-btn">
            Send Message
          </button>
        </form>
      </WebMCP.Tool>

      {result && (
        <div className="result-card">
          <h3>Submitted</h3>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// App — renders all four demos side by side
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <WebMCPProvider>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div className="page-header">
          <h1>react-webmcp API Comparison</h1>
          <p>
            Four ways to register WebMCP tools using <code>react-webmcp</code>
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))",
            gap: "1.5rem",
          }}
        >
          <DeclarativeDemo />
          <ImperativeDemo />
          <AdapterAutoDemo />
          <AdapterFieldDemo />
        </div>
      </div>
    </WebMCPProvider>
  );
}
