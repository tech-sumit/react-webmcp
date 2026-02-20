import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, cleanup, act } from "@testing-library/react";
import { useSchemaCollector, ToolContext } from "../adapters/useSchemaCollector";
import { useRegisterField } from "../adapters/useRegisterField";
import type { JSONSchema } from "../types";

function SchemaCapture({
  children,
  fields,
  strict,
  onSchema,
}: {
  children: React.ReactNode;
  fields?: Record<string, { description?: string; type?: string; required?: boolean }>;
  strict?: boolean;
  onSchema: (schema: JSONSchema) => void;
}) {
  const { schema, registerField, unregisterField } = useSchemaCollector({
    children,
    fields,
    strict,
  });

  React.useEffect(() => {
    onSchema(schema);
  }, [schema, onSchema]);

  return (
    <ToolContext.Provider value={{ registerField, unregisterField }}>
      {children}
    </ToolContext.Provider>
  );
}

describe("useSchemaCollector", () => {
  afterEach(cleanup);

  it("auto-detects fields from children", () => {
    let captured: JSONSchema | null = null;

    render(
      <SchemaCapture onSchema={(s) => { captured = s; }}>
        <input name="email" type="email" required />
        <input name="age" type="number" />
      </SchemaCapture>,
    );

    expect(captured).not.toBeNull();
    expect(captured!.properties).toHaveProperty("email");
    expect(captured!.properties).toHaveProperty("age");
    expect(captured!.properties!.email.type).toBe("string");
    expect(captured!.properties!.age.type).toBe("number");
    expect(captured!.required).toEqual(["email"]);
  });

  it("merges fields prop as enrichment", () => {
    let captured: JSONSchema | null = null;

    render(
      <SchemaCapture
        fields={{ email: { description: "Recipient's email" } }}
        onSchema={(s) => { captured = s; }}
      >
        <input name="email" type="email" />
      </SchemaCapture>,
    );

    expect(captured!.properties!.email.description).toBe("Recipient's email");
  });

  it("context-registered fields override children and fields prop", () => {
    let captured: JSONSchema | null = null;

    function ContextField() {
      useRegisterField({
        name: "email",
        type: "email",
        description: "Context override",
      });
      return null;
    }

    render(
      <SchemaCapture
        fields={{ email: { description: "Prop description" } }}
        onSchema={(s) => { captured = s; }}
      >
        <input name="email" />
        <ContextField />
      </SchemaCapture>,
    );

    expect(captured!.properties!.email.description).toBe("Context override");
  });

  it("handles context field unregistration", () => {
    let captured: JSONSchema | null = null;

    function ContextField({ show }: { show: boolean }) {
      if (show) {
        useRegisterField({ name: "dynamic", type: "text", description: "Dynamic" });
      }
      return null;
    }

    function App({ show }: { show: boolean }) {
      return (
        <SchemaCapture onSchema={(s) => { captured = s; }}>
          <input name="static" />
          {show ? <ContextField show={true} /> : null}
        </SchemaCapture>
      );
    }

    const { rerender } = render(<App show={true} />);
    expect(captured!.properties).toHaveProperty("dynamic");

    rerender(<App show={false} />);
    expect(captured!.properties).not.toHaveProperty("dynamic");
  });

  it("produces deterministic schema ordering", () => {
    let captured: JSONSchema | null = null;

    render(
      <SchemaCapture onSchema={(s) => { captured = s; }}>
        <input name="zebra" />
        <input name="alpha" />
        <input name="middle" />
      </SchemaCapture>,
    );

    const keys = Object.keys(captured!.properties!);
    expect(keys).toEqual(["alpha", "middle", "zebra"]);
  });

  it("fields prop can add fields not present in children", () => {
    let captured: JSONSchema | null = null;

    render(
      <SchemaCapture
        fields={{ extra: { type: "text", description: "Extra field" } }}
        onSchema={(s) => { captured = s; }}
      >
        <input name="email" />
      </SchemaCapture>,
    );

    expect(captured!.properties).toHaveProperty("email");
    expect(captured!.properties).toHaveProperty("extra");
  });
});
