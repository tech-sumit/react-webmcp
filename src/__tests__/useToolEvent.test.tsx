import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, cleanup, act } from "@testing-library/react";
import { useToolEvent } from "../hooks/useToolEvent";

describe("useToolEvent", () => {
  afterEach(() => {
    cleanup();
  });

  function dispatchToolEvent(
    eventName: string,
    toolName: string,
    useProp = true,
  ) {
    const event = new CustomEvent(eventName, {
      detail: useProp ? undefined : { toolName },
    });
    if (useProp) {
      (event as unknown as Record<string, unknown>).toolName = toolName;
    }
    window.dispatchEvent(event);
  }

  it('listens for "toolactivated" events', () => {
    const callback = vi.fn();

    function App() {
      useToolEvent("toolactivated", callback);
      return null;
    }

    render(<App />);
    dispatchToolEvent("toolactivated", "my-tool");
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("my-tool");
  });

  it('listens for "toolcancel" events', () => {
    const callback = vi.fn();

    function App() {
      useToolEvent("toolcancel", callback);
      return null;
    }

    render(<App />);
    dispatchToolEvent("toolcancel", "my-tool");
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("my-tool");
  });

  it("extracts toolName from event.detail.toolName", () => {
    const callback = vi.fn();

    function App() {
      useToolEvent("toolactivated", callback);
      return null;
    }

    render(<App />);
    // Use detail path instead of direct property
    dispatchToolEvent("toolactivated", "detail-tool", false);
    expect(callback).toHaveBeenCalledWith("detail-tool");
  });

  it("filters by tool name when toolNameFilter is provided", () => {
    const callback = vi.fn();

    function App() {
      useToolEvent("toolactivated", callback, "target-tool");
      return null;
    }

    render(<App />);
    dispatchToolEvent("toolactivated", "other-tool");
    expect(callback).not.toHaveBeenCalled();

    dispatchToolEvent("toolactivated", "target-tool");
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("target-tool");
  });

  it("ignores events without a toolName", () => {
    const callback = vi.fn();

    function App() {
      useToolEvent("toolactivated", callback);
      return null;
    }

    render(<App />);
    window.dispatchEvent(new CustomEvent("toolactivated"));
    expect(callback).not.toHaveBeenCalled();
  });

  it("cleans up listeners on unmount", () => {
    const callback = vi.fn();

    function ToolEventComponent() {
      useToolEvent("toolactivated", callback);
      return <div>Events</div>;
    }

    function App({ show }: { show: boolean }) {
      return show ? <ToolEventComponent /> : null;
    }

    const { rerender } = render(<App show={true} />);
    dispatchToolEvent("toolactivated", "tool-a");
    expect(callback).toHaveBeenCalledTimes(1);

    rerender(<App show={false} />);
    dispatchToolEvent("toolactivated", "tool-b");
    // No additional calls after unmount
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("switches event types on re-render", () => {
    const callback = vi.fn();

    function App({ event }: { event: "toolactivated" | "toolcancel" }) {
      useToolEvent(event, callback);
      return null;
    }

    const { rerender } = render(<App event="toolactivated" />);
    dispatchToolEvent("toolactivated", "tool-a");
    expect(callback).toHaveBeenCalledTimes(1);

    rerender(<App event="toolcancel" />);
    // Old listener removed, new one attached
    dispatchToolEvent("toolactivated", "tool-b");
    expect(callback).toHaveBeenCalledTimes(1); // unchanged

    dispatchToolEvent("toolcancel", "tool-c");
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith("tool-c");
  });
});
