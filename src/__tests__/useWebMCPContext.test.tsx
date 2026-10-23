import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { useWebMCPContext } from "../hooks/useWebMCPContext";
import {
  installMockModelContext,
  installLegacyModelContext,
  removeMockModelContext,
  createToolConfig,
} from "./helpers";

type RegisterMock = ReturnType<typeof installMockModelContext>["registerTool"];

/** The tool definitions passed to registerTool(), in call order. */
function toolsPassed(registerTool: RegisterMock) {
  return registerTool.mock.calls.map((c) => c[0]);
}

describe("useWebMCPContext", () => {
  afterEach(() => {
    cleanup();
    removeMockModelContext();
  });

  it("registers each tool on mount", () => {
    const mc = installMockModelContext();
    const tools = [createToolConfig()];

    function App() {
      useWebMCPContext({ tools });
      return null;
    }

    render(<App />);
    expect(mc.registerTool).toHaveBeenCalledTimes(1);
    const tool = mc.registerTool.mock.calls[0][0];
    expect(tool.name).toBe("test-tool");
    expect(typeof tool.execute).toBe("function");
    expect(mc.registerTool.mock.calls[0][1]!.signal).toBeInstanceOf(AbortSignal);
  });

  it("aborts every registration signal on unmount", () => {
    const mc = installMockModelContext();
    const tools = [createToolConfig()];

    function ContextComponent() {
      useWebMCPContext({ tools });
      return <div>Context</div>;
    }

    function App({ show }: { show: boolean }) {
      return show ? <ContextComponent /> : null;
    }

    const { rerender } = render(<App show={true} />);
    expect(mc.registerTool).toHaveBeenCalledTimes(1);
    const signal = mc.registerTool.mock.calls[0][1]!.signal!;
    expect(signal.aborted).toBe(false);

    rerender(<App show={false} />);
    expect(signal.aborted).toBe(true);
  });

  it("uses unregisterTool() on legacy implementations", () => {
    const mc = installLegacyModelContext();

    function ContextComponent() {
      useWebMCPContext({
        tools: [createToolConfig({ name: "a" }), createToolConfig({ name: "b" })],
      });
      return null;
    }

    function App({ show }: { show: boolean }) {
      return show ? <ContextComponent /> : null;
    }

    const { rerender } = render(<App show={true} />);
    expect(mc.registerTool).toHaveBeenCalledTimes(2);
    expect(mc.provideContext).not.toHaveBeenCalled();

    rerender(<App show={false} />);
    expect(mc.unregisterTool).toHaveBeenCalledWith("a");
    expect(mc.unregisterTool).toHaveBeenCalledWith("b");
  });

  it("re-registers when tools change", () => {
    const mc = installMockModelContext();

    function App({ toolName }: { toolName: string }) {
      useWebMCPContext({
        tools: [createToolConfig({ name: toolName })],
      });
      return null;
    }

    const { rerender } = render(<App toolName="tool-a" />);
    expect(mc.registerTool).toHaveBeenCalledTimes(1);

    rerender(<App toolName="tool-b" />);
    expect(mc.registerTool.mock.calls[0][1]!.signal!.aborted).toBe(true);
    expect(mc.registerTool).toHaveBeenCalledTimes(2);
    expect(mc.registerTool.mock.calls[1][0].name).toBe("tool-b");
  });

  it("does NOT re-register when only execute changes", () => {
    const mc = installMockModelContext();
    const execute1 = vi.fn();
    const execute2 = vi.fn();

    function App({ executeFn }: { executeFn: () => void }) {
      useWebMCPContext({
        tools: [createToolConfig({ execute: executeFn })],
      });
      return null;
    }

    const { rerender } = render(<App executeFn={execute1} />);
    expect(mc.registerTool).toHaveBeenCalledTimes(1);

    rerender(<App executeFn={execute2} />);
    expect(mc.registerTool).toHaveBeenCalledTimes(1);
  });

  it("execute wrapper calls the latest handler via ref", () => {
    const mc = installMockModelContext();
    const execute1 = vi.fn(() => "result1");
    const execute2 = vi.fn(() => "result2");

    function App({ executeFn }: { executeFn: () => unknown }) {
      useWebMCPContext({
        tools: [createToolConfig({ execute: executeFn })],
      });
      return null;
    }

    const { rerender } = render(<App executeFn={execute1} />);
    const registeredTools = toolsPassed(mc.registerTool);
    const registeredExecute = registeredTools[0].execute;

    registeredExecute({ x: "hello" });
    expect(execute1).toHaveBeenCalledWith({ x: "hello" }, undefined);

    rerender(<App executeFn={execute2} />);
    registeredExecute({ x: "world" });
    expect(execute2).toHaveBeenCalledWith({ x: "world" }, undefined);
  });

  it("passes outputSchema for each tool when provided", () => {
    const mc = installMockModelContext();
    const outputSchema = {
      type: "object",
      properties: { result: { type: "string" } },
    };

    function App() {
      useWebMCPContext({
        tools: [createToolConfig({ outputSchema })],
      });
      return null;
    }

    render(<App />);
    const registeredTools = toolsPassed(mc.registerTool);
    expect(registeredTools[0].outputSchema).toEqual(outputSchema);
  });

  it("does not include outputSchema when not provided", () => {
    const mc = installMockModelContext();

    function App() {
      useWebMCPContext({ tools: [createToolConfig()] });
      return null;
    }

    render(<App />);
    const registeredTools = toolsPassed(mc.registerTool);
    expect("outputSchema" in registeredTools[0]).toBe(false);
  });

  it("passes annotations for each tool when provided", () => {
    const mc = installMockModelContext();

    function App() {
      useWebMCPContext({
        tools: [createToolConfig({ annotations: { readOnlyHint: true } })],
      });
      return null;
    }

    render(<App />);
    const registeredTools = toolsPassed(mc.registerTool);
    expect(registeredTools[0].annotations).toEqual({ readOnlyHint: true });
  });

  it("does not include annotations when not provided", () => {
    const mc = installMockModelContext();

    function App() {
      useWebMCPContext({ tools: [createToolConfig()] });
      return null;
    }

    render(<App />);
    const registeredTools = toolsPassed(mc.registerTool);
    expect("annotations" in registeredTools[0]).toBe(false);
  });

  it("handles multiple tools", () => {
    const mc = installMockModelContext();

    function App() {
      useWebMCPContext({
        tools: [
          createToolConfig({ name: "search", description: "Search" }),
          createToolConfig({ name: "filter", description: "Filter" }),
          createToolConfig({ name: "sort", description: "Sort" }),
        ],
      });
      return null;
    }

    render(<App />);
    const registeredTools = toolsPassed(mc.registerTool);
    expect(registeredTools).toHaveLength(3);
    expect(registeredTools[0].name).toBe("search");
    expect(registeredTools[1].name).toBe("filter");
    expect(registeredTools[2].name).toBe("sort");
  });

  it("does NOT re-register with inline stable objects", () => {
    const mc = installMockModelContext();

    function App() {
      useWebMCPContext({
        tools: [
          {
            name: "stable",
            description: "Stable tool",
            inputSchema: { type: "object", properties: {} },
            execute: () => null,
          },
        ],
      });
      return null;
    }

    const { rerender } = render(<App />);
    expect(mc.registerTool).toHaveBeenCalledTimes(1);

    rerender(<App />);
    expect(mc.registerTool).toHaveBeenCalledTimes(1);
  });

  it("handles missing document.modelContext gracefully", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    function App() {
      useWebMCPContext({ tools: [createToolConfig()] });
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
      throw new Error("Context error");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function App() {
      useWebMCPContext({ tools: [createToolConfig()] });
      return <div>App</div>;
    }

    const { container } = render(<App />);
    expect(container.textContent).toBe("App");
    errorSpy.mockRestore();
  });

  it("handles legacy unregisterTool throwing during cleanup", () => {
    const mc = installLegacyModelContext();
    mc.unregisterTool.mockImplementation(() => {
      throw new Error("Unregister error");
    });

    function ContextComponent() {
      useWebMCPContext({ tools: [createToolConfig()] });
      return <div>Context</div>;
    }

    function App({ show }: { show: boolean }) {
      return show ? <ContextComponent /> : null;
    }

    const { rerender, container } = render(<App show={true} />);
    // Should not throw
    rerender(<App show={false} />);
    expect(container.textContent).toBe("");
  });
});
