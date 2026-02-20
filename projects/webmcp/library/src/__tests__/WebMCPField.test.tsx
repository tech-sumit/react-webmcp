import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { WebMCPField } from "../adapters/WebMCPField";
import { ToolContext } from "../adapters/useSchemaCollector";
import type { FieldDefinition } from "../adapters/types";

describe("WebMCPField", () => {
  afterEach(cleanup);

  it("renders children as a fragment", () => {
    const registerField = vi.fn();
    const unregisterField = vi.fn();

    const { container } = render(
      <ToolContext.Provider value={{ registerField, unregisterField }}>
        <WebMCPField name="email" type="email">
          <input data-testid="inner" />
        </WebMCPField>
      </ToolContext.Provider>,
    );

    expect(container.querySelector("[data-testid='inner']")).not.toBeNull();
    // No extra wrapper elements
    expect(container.firstElementChild?.tagName).toBe("INPUT");
  });

  it("registers field with context", () => {
    const registerField = vi.fn();
    const unregisterField = vi.fn();

    render(
      <ToolContext.Provider value={{ registerField, unregisterField }}>
        <WebMCPField name="email" type="email" required description="Recipient">
          <input />
        </WebMCPField>
      </ToolContext.Provider>,
    );

    expect(registerField).toHaveBeenCalledTimes(1);
    const registered = registerField.mock.calls[0][0] as FieldDefinition;
    expect(registered.name).toBe("email");
    expect(registered.type).toBe("email");
    expect(registered.required).toBe(true);
    expect(registered.description).toBe("Recipient");
  });

  it("auto-detects enum values from children", () => {
    const registerField = vi.fn();
    const unregisterField = vi.fn();

    render(
      <ToolContext.Provider value={{ registerField, unregisterField }}>
        <WebMCPField name="priority">
          <select>
            <option value="low">Low</option>
            <option value="high">High</option>
          </select>
        </WebMCPField>
      </ToolContext.Provider>,
    );

    expect(registerField).toHaveBeenCalledTimes(1);
    const registered = registerField.mock.calls[0][0] as FieldDefinition;
    expect(registered.enumValues).toEqual(["low", "high"]);
    expect(registered.oneOf).toEqual([
      { value: "low", label: "Low" },
      { value: "high", label: "High" },
    ]);
  });

  it("does not override explicitly provided enumValues", () => {
    const registerField = vi.fn();
    const unregisterField = vi.fn();

    render(
      <ToolContext.Provider value={{ registerField, unregisterField }}>
        <WebMCPField name="priority" enumValues={["a", "b", "c"]}>
          <select>
            <option value="low">Low</option>
            <option value="high">High</option>
          </select>
        </WebMCPField>
      </ToolContext.Provider>,
    );

    const registered = registerField.mock.calls[0][0] as FieldDefinition;
    expect(registered.enumValues).toEqual(["a", "b", "c"]);
  });

  it("warns when used outside WebMCP.Tool context", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <WebMCPField name="orphan">
        <input />
      </WebMCPField>,
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("no WebMCP.Tool context found"),
    );
    warnSpy.mockRestore();
  });

  it("unregisters on unmount", () => {
    const registerField = vi.fn();
    const unregisterField = vi.fn();

    function App({ show }: { show: boolean }) {
      return (
        <ToolContext.Provider value={{ registerField, unregisterField }}>
          {show ? (
            <WebMCPField name="temp">
              <input />
            </WebMCPField>
          ) : null}
        </ToolContext.Provider>
      );
    }

    const { rerender } = render(<App show={true} />);
    expect(registerField).toHaveBeenCalledTimes(1);

    rerender(<App show={false} />);
    expect(unregisterField).toHaveBeenCalledWith("temp");
  });
});
