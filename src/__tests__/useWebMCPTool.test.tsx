import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, cleanup, act } from "@testing-library/react";
import { useWebMCPTool } from "../hooks/useWebMCPTool";
import {
  installMockModelContext,
  installLegacyModelContext,
  removeMockModelContext,
  createToolConfig,
} from "./helpers";

describe("useWebMCPTool", () => {
  afterEach(() => {
    cleanup();
    removeMockModelContext();
  });

  it("registers a tool on mount", () => {
    const mc = installMockModelContext();
    const config = createToolConfig();

    function App() {
      useWebMCPTool(config);
      return <div>App</div>;
    }

    render(<App />);

    expect(mc.registerTool).toHaveBeenCalledTimes(1);
    const registered = mc.registerTool.mock.calls[0][0];
    expect(registered.name).toBe("test-tool");
    expect(registered.description).toBe("A test tool");
    expect(registered.inputSchema).toEqual({
      type: "object",
      properties: { query: { type: "string" } },
    });
    expect(typeof registered.execute).toBe("function");
  });

  it("omits inputSchema when the tool has none (optional per spec)", () => {
    const mc = installMockModelContext();

    function App() {
      useWebMCPTool({ name: "ping", description: "Ping", execute: () => "pong" });
      return null;
    }

    render(<App />);
    expect("inputSchema" in mc.registerTool.mock.calls[0][0]).toBe(false);
  });

  it("unregisters the tool on unmount", () => {
    const mc = installMockModelContext();
    const config = createToolConfig();

    function ToolComponent() {
      useWebMCPTool(config);
      return <div>Tool</div>;
    }

    function App({ show }: { show: boolean }) {
      return show ? <ToolComponent /> : null;
    }

    const { rerender } = render(<App show={true} />);
    expect(mc.registerTool).toHaveBeenCalledTimes(1);
    const signal = mc.registerTool.mock.calls[0][1]!.signal!;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);

    rerender(<App show={false} />);
    // Per spec, tools are unregistered by aborting the registration signal
    expect(signal.aborted).toBe(true);
  });

  it("falls back to unregisterTool() on legacy implementations", () => {
    const mc = installLegacyModelContext();
    const config = createToolConfig();

    function ToolComponent() {
      useWebMCPTool(config);
      return <div>Tool</div>;
    }

    function App({ show }: { show: boolean }) {
      return show ? <ToolComponent /> : null;
    }

    const { rerender } = render(<App show={true} />);
    expect(mc.registerTool).toHaveBeenCalledTimes(1);
    expect(mc.unregisterTool).not.toHaveBeenCalled();

    rerender(<App show={false} />);
    expect(mc.unregisterTool).toHaveBeenCalledTimes(1);
    expect(mc.unregisterTool).toHaveBeenCalledWith("test-tool");
  });

  it("prefers document.modelContext over navigator.modelContext", () => {
    const legacy = installLegacyModelContext();
    const mc = installMockModelContext();

    function App() {
      useWebMCPTool(createToolConfig());
      return null;
    }

    render(<App />);
    expect(mc.registerTool).toHaveBeenCalledTimes(1);
    expect(legacy.registerTool).not.toHaveBeenCalled();
  });

  it("re-registers when the tool name changes", () => {
    const mc = installMockModelContext();

    function App({ name }: { name: string }) {
      useWebMCPTool(createToolConfig({ name }));
      return <div>{name}</div>;
    }

    const { rerender } = render(<App name="tool-a" />);
    expect(mc.registerTool).toHaveBeenCalledTimes(1);
    expect(mc.registerTool.mock.calls[0][0].name).toBe("tool-a");

    rerender(<App name="tool-b" />);
    expect(mc.registerTool.mock.calls[0][1]!.signal!.aborted).toBe(true);
    expect(mc.registerTool).toHaveBeenCalledTimes(2);
    expect(mc.registerTool.mock.calls[1][0].name).toBe("tool-b");
  });

  it("re-registers when the description changes", () => {
    const mc = installMockModelContext();

    function App({ desc }: { desc: string }) {
      useWebMCPTool(createToolConfig({ description: desc }));
      return null;
    }

    const { rerender } = render(<App desc="Version 1" />);
    expect(mc.registerTool).toHaveBeenCalledTimes(1);

    rerender(<App desc="Version 2" />);
    expect(mc.registerTool).toHaveBeenCalledTimes(2);
    expect(mc.registerTool.mock.calls[1][0].description).toBe("Version 2");
  });

  it("re-registers when inputSchema changes", () => {
    const mc = installMockModelContext();

    function App({ schema }: { schema: Record<string, unknown> }) {
      useWebMCPTool(createToolConfig({ inputSchema: schema }));
      return null;
    }

    const s1 = { type: "object", properties: { q: { type: "string" } } };
    const s2 = { type: "object", properties: { q: { type: "number" } } };

    const { rerender } = render(<App schema={s1} />);
    expect(mc.registerTool).toHaveBeenCalledTimes(1);

    rerender(<App schema={s2} />);
    expect(mc.registerTool).toHaveBeenCalledTimes(2);
  });

  it("does NOT re-register when only the execute function changes", () => {
    const mc = installMockModelContext();
    const execute1 = vi.fn();
    const execute2 = vi.fn();

    function App({ executeFn }: { executeFn: () => void }) {
      useWebMCPTool(createToolConfig({ execute: executeFn }));
      return null;
    }

    const { rerender } = render(<App executeFn={execute1} />);
    expect(mc.registerTool).toHaveBeenCalledTimes(1);

    rerender(<App executeFn={execute2} />);
    // Fingerprint unchanged — should NOT re-register
    expect(mc.registerTool).toHaveBeenCalledTimes(1);
  });

  it("execute wrapper always calls the latest handler", () => {
    const mc = installMockModelContext();
    const execute1 = vi.fn(() => "result1");
    const execute2 = vi.fn(() => "result2");

    function App({ executeFn }: { executeFn: () => unknown }) {
      useWebMCPTool(createToolConfig({ execute: executeFn }));
      return null;
    }

    const { rerender } = render(<App executeFn={execute1} />);
    const registered = mc.registerTool.mock.calls[0][0];

    registered.execute({ query: "hello" });
    expect(execute1).toHaveBeenCalledWith({ query: "hello" }, undefined);
    expect(execute2).not.toHaveBeenCalled();

    rerender(<App executeFn={execute2} />);
    registered.execute({ query: "world" });
    expect(execute2).toHaveBeenCalledWith({ query: "world" }, undefined);
  });

  it("forwards the execute options ({ signal }) to the handler", () => {
    const mc = installMockModelContext();
    const execute = vi.fn();

    function App() {
      useWebMCPTool(createToolConfig({ execute }));
      return null;
    }

    render(<App />);
    const options = { signal: new AbortController().signal };
    (mc.registerTool.mock.calls[0][0].execute as (i: unknown, o: unknown) => void)({ query: "x" }, options);
    expect(execute).toHaveBeenCalledWith({ query: "x" }, options);
  });

  it("passes title and exposedTo when provided", () => {
    const mc = installMockModelContext();

    function App() {
      useWebMCPTool(
        createToolConfig({ title: "Test tool", exposedTo: ["https://agent.example"] }),
      );
      return null;
    }

    render(<App />);
    expect(mc.registerTool.mock.calls[0][0].title).toBe("Test tool");
    expect(mc.registerTool.mock.calls[0][1]!.exposedTo).toEqual(["https://agent.example"]);
  });

  it("passes the spec annotations", () => {
    const mc = installMockModelContext();
    const annotations = {
      readOnlyHint: false,
      untrustedContentHint: true,
      consequentialHint: true,
      debugging: false,
    };

    function App() {
      useWebMCPTool(createToolConfig({ annotations }));
      return null;
    }

    render(<App />);
    expect(mc.registerTool.mock.calls[0][0].annotations).toEqual(annotations);
  });

  it("throws a helpful error for names the spec rejects", () => {
    installMockModelContext();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function App() {
      useWebMCPTool(createToolConfig({ name: "bad name!" }));
      return null;
    }

    expect(() => render(<App />)).toThrow(/Tool name "bad name!" is invalid/);
    errorSpy.mockRestore();
  });

  it("logs a warning when registerTool rejects with InvalidStateError", async () => {
    const mc = installMockModelContext();
    mc.registerTool.mockImplementation(() =>
      Promise.reject(new DOMException("Duplicate", "InvalidStateError")),
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    function App() {
      useWebMCPTool(createToolConfig());
      return null;
    }

    render(<App />);
    await act(async () => {});
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("InvalidStateError"));
    warnSpy.mockRestore();
  });

  it("does NOT re-register when inline schema objects have same values", () => {
    const mc = installMockModelContext();

    function App() {
      useWebMCPTool({
        name: "stable-tool",
        description: "Stable",
        inputSchema: { type: "object", properties: { x: { type: "string" } } },
        execute: () => null,
      });
      return null;
    }

    const { rerender } = render(<App />);
    expect(mc.registerTool).toHaveBeenCalledTimes(1);

    rerender(<App />);
    // New object references but same values — no re-registration
    expect(mc.registerTool).toHaveBeenCalledTimes(1);
  });

  it("passes outputSchema when provided", () => {
    const mc = installMockModelContext();
    const outputSchema = {
      type: "object",
      properties: { result: { type: "string" } },
    };

    function App() {
      useWebMCPTool(createToolConfig({ outputSchema }));
      return null;
    }

    render(<App />);
    expect(mc.registerTool.mock.calls[0][0].outputSchema).toEqual(outputSchema);
  });

  it("does not include outputSchema when not provided", () => {
    const mc = installMockModelContext();

    function App() {
      useWebMCPTool(createToolConfig());
      return null;
    }

    render(<App />);
    expect(mc.registerTool.mock.calls[0][0].outputSchema).toBeUndefined();
  });

  it("passes annotations when provided", () => {
    const mc = installMockModelContext();

    function App() {
      useWebMCPTool(createToolConfig({ annotations: { readOnlyHint: true } }));
      return null;
    }

    render(<App />);
    expect(mc.registerTool.mock.calls[0][0].annotations).toEqual({
      readOnlyHint: true,
    });
  });

  it("does not include annotations when not provided", () => {
    const mc = installMockModelContext();

    function App() {
      useWebMCPTool(createToolConfig());
      return null;
    }

    render(<App />);
    expect("annotations" in mc.registerTool.mock.calls[0][0]).toBe(false);
  });

  it("re-registers when annotations change", () => {
    const mc = installMockModelContext();

    function App({ readOnly }: { readOnly: boolean }) {
      useWebMCPTool(
        createToolConfig({ annotations: { readOnlyHint: readOnly } }),
      );
      return null;
    }

    const { rerender } = render(<App readOnly={true} />);
    expect(mc.registerTool).toHaveBeenCalledTimes(1);

    rerender(<App readOnly={false} />);
    expect(mc.registerTool).toHaveBeenCalledTimes(2);
    expect(mc.registerTool.mock.calls[1][0].annotations).toEqual({
      readOnlyHint: false,
    });
  });

  it("re-registers when outputSchema changes", () => {
    const mc = installMockModelContext();

    function App({ outputType }: { outputType: string }) {
      useWebMCPTool(
        createToolConfig({
          outputSchema: {
            type: "object",
            properties: { result: { type: outputType } },
          },
        }),
      );
      return null;
    }

    const { rerender } = render(<App outputType="string" />);
    expect(mc.registerTool).toHaveBeenCalledTimes(1);

    rerender(<App outputType="number" />);
    expect(mc.registerTool).toHaveBeenCalledTimes(2);
  });

  it("handles missing document.modelContext gracefully", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    function App() {
      useWebMCPTool(createToolConfig());
      return <div>App</div>;
    }

    const { container } = render(<App />);
    expect(container.textContent).toBe("App");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("document.modelContext is not available"),
    );
    warnSpy.mockRestore();
  });

  it("handles registerTool throwing an error", () => {
    const mc = installMockModelContext();
    mc.registerTool.mockImplementation(() => {
      throw new Error("Registration failed");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function App() {
      useWebMCPTool(createToolConfig());
      return <div>App</div>;
    }

    const { container } = render(<App />);
    expect(container.textContent).toBe("App");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("handles legacy unregisterTool throwing during cleanup", () => {
    const mc = installLegacyModelContext();
    mc.unregisterTool.mockImplementation(() => {
      throw new Error("Unregister failed");
    });

    function ToolComponent() {
      useWebMCPTool(createToolConfig());
      return <div>Tool</div>;
    }

    function App({ show }: { show: boolean }) {
      return show ? <ToolComponent /> : null;
    }

    const { rerender, container } = render(<App show={true} />);
    // Should not throw
    rerender(<App show={false} />);
    expect(container.textContent).toBe("");
  });
});
