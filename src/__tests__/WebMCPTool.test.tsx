import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import React from "react";
import { render, cleanup, act } from "@testing-library/react";
import { WebMCPTool } from "../adapters/WebMCPTool";
import {
  installMockModelContext,
  removeMockModelContext,
} from "./helpers";

describe("WebMCPTool", () => {
  afterEach(() => {
    cleanup();
    removeMockModelContext();
  });

  it("registers a tool with auto-detected schema on mount", () => {
    const mc = installMockModelContext();
    const execute = vi.fn();

    render(
      <WebMCPTool name="test" description="A test tool" onExecute={execute}>
        <input name="email" type="email" required />
        <input name="age" type="number" />
      </WebMCPTool>,
    );

    expect(mc.registerTool).toHaveBeenCalledTimes(1);
    const registered = mc.registerTool.mock.calls[0][0];
    expect(registered.name).toBe("test");
    expect(registered.description).toBe("A test tool");
    expect(registered.inputSchema.properties).toHaveProperty("email");
    expect(registered.inputSchema.properties).toHaveProperty("age");
    expect(registered.inputSchema.required).toEqual(["email"]);
  });

  it("unregisters on unmount", () => {
    const mc = installMockModelContext();

    function App({ show }: { show: boolean }) {
      return show ? (
        <WebMCPTool name="test" description="Test" onExecute={() => null}>
          <input name="x" />
        </WebMCPTool>
      ) : null;
    }

    const { rerender } = render(<App show={true} />);
    expect(mc.registerTool).toHaveBeenCalledTimes(1);

    rerender(<App show={false} />);
    expect(mc.unregisterTool).toHaveBeenCalledWith("test");
  });

  it("renders children transparently", () => {
    installMockModelContext();

    const { container } = render(
      <WebMCPTool name="test" description="Test" onExecute={() => null}>
        <div data-testid="child">Hello</div>
      </WebMCPTool>,
    );

    expect(container.querySelector("[data-testid='child']")).not.toBeNull();
    expect(container.textContent).toBe("Hello");
  });

  it("handles missing navigator.modelContext gracefully", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { container } = render(
      <WebMCPTool name="test" description="Test" onExecute={() => null}>
        <div>Content</div>
      </WebMCPTool>,
    );

    expect(container.textContent).toBe("Content");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("navigator.modelContext is not available"),
    );
    warnSpy.mockRestore();
  });

  it("forwards strict prop for schema validation", () => {
    installMockModelContext();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { error: Error | null }
    > {
      state = { error: null as Error | null };
      static getDerivedStateFromError(error: Error) {
        return { error };
      }
      render() {
        if (this.state.error) return null;
        return this.props.children;
      }
    }

    const ref = React.createRef<ErrorBoundary>();
    render(
      <ErrorBoundary ref={ref}>
        <WebMCPTool
          name="test"
          description="Test"
          onExecute={() => null}
          strict
          fields={{ name: { min: 5 } }}
        >
          <input name="name" type="text" />
        </WebMCPTool>
      </ErrorBoundary>,
    );

    expect(ref.current?.state.error).not.toBeNull();
    expect(ref.current?.state.error?.message).toContain("[react-webmcp]");

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("listens for toolactivated events", () => {
    installMockModelContext();
    const onActivated = vi.fn();

    render(
      <WebMCPTool
        name="my-tool"
        description="Test"
        onExecute={() => null}
        onToolActivated={onActivated}
      >
        <input name="x" />
      </WebMCPTool>,
    );

    act(() => {
      const event = new CustomEvent("toolactivated", {
        detail: { toolName: "my-tool" },
      });
      Object.assign(event, { toolName: "my-tool" });
      window.dispatchEvent(event);
    });

    expect(onActivated).toHaveBeenCalledWith("my-tool");
  });

  it("listens for toolcancel events", () => {
    installMockModelContext();
    const onCancel = vi.fn();

    render(
      <WebMCPTool
        name="my-tool"
        description="Test"
        onExecute={() => null}
        onToolCancel={onCancel}
      >
        <input name="x" />
      </WebMCPTool>,
    );

    act(() => {
      const event = new CustomEvent("toolcancel", {
        detail: { toolName: "my-tool" },
      });
      Object.assign(event, { toolName: "my-tool" });
      window.dispatchEvent(event);
    });

    expect(onCancel).toHaveBeenCalledWith("my-tool");
  });

  it("ignores events for other tools", () => {
    installMockModelContext();
    const onActivated = vi.fn();

    render(
      <WebMCPTool
        name="my-tool"
        description="Test"
        onExecute={() => null}
        onToolActivated={onActivated}
      >
        <input name="x" />
      </WebMCPTool>,
    );

    act(() => {
      const event = new CustomEvent("toolactivated", {
        detail: { toolName: "other-tool" },
      });
      Object.assign(event, { toolName: "other-tool" });
      window.dispatchEvent(event);
    });

    expect(onActivated).not.toHaveBeenCalled();
  });
});
