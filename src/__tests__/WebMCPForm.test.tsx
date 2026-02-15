import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { WebMCPForm } from "../components/WebMCPForm";

describe("WebMCPForm", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a form with toolname and tooldescription attributes", () => {
    const { container } = render(
      <WebMCPForm toolName="my-tool" toolDescription="Does things">
        <input name="field" />
      </WebMCPForm>,
    );

    const form = container.querySelector("form")!;
    expect(form).toBeTruthy();
    expect(form.getAttribute("toolname")).toBe("my-tool");
    expect(form.getAttribute("tooldescription")).toBe("Does things");
  });

  it("sets toolautosubmit attribute when toolAutoSubmit is true", () => {
    const { container } = render(
      <WebMCPForm
        toolName="auto-tool"
        toolDescription="Auto submits"
        toolAutoSubmit
      >
        <input />
      </WebMCPForm>,
    );

    const form = container.querySelector("form")!;
    expect(form.hasAttribute("toolautosubmit")).toBe(true);
  });

  it("does not set toolautosubmit when toolAutoSubmit is not provided", () => {
    const { container } = render(
      <WebMCPForm toolName="tool" toolDescription="desc">
        <input />
      </WebMCPForm>,
    );

    const form = container.querySelector("form")!;
    expect(form.hasAttribute("toolautosubmit")).toBe(false);
  });

  it("calls onSubmit with the native event", () => {
    const onSubmit = vi.fn();

    const { container } = render(
      <WebMCPForm toolName="tool" toolDescription="desc" onSubmit={onSubmit}>
        <button type="submit">Submit</button>
      </WebMCPForm>,
    );

    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("passes through standard form attributes", () => {
    const { container } = render(
      <WebMCPForm
        toolName="tool"
        toolDescription="desc"
        className="my-form"
        id="form-id"
        noValidate
      >
        <input />
      </WebMCPForm>,
    );

    const form = container.querySelector("form")!;
    expect(form.className).toBe("my-form");
    expect(form.id).toBe("form-id");
    expect(form.noValidate).toBe(true);
  });

  it("renders children", () => {
    const { container } = render(
      <WebMCPForm toolName="tool" toolDescription="desc">
        <input name="name" />
        <button type="submit">Go</button>
      </WebMCPForm>,
    );

    expect(container.querySelector("input")).toBeTruthy();
    expect(container.querySelector("button")).toBeTruthy();
  });

  it("fires onToolActivated when toolactivated event matches", () => {
    const onToolActivated = vi.fn();

    render(
      <WebMCPForm
        toolName="target"
        toolDescription="desc"
        onToolActivated={onToolActivated}
      >
        <input />
      </WebMCPForm>,
    );

    const event = new CustomEvent("toolactivated");
    (event as unknown as Record<string, unknown>).toolName = "target";
    window.dispatchEvent(event);
    expect(onToolActivated).toHaveBeenCalledWith("target");
  });

  it("does not fire onToolActivated for other tools", () => {
    const onToolActivated = vi.fn();

    render(
      <WebMCPForm
        toolName="target"
        toolDescription="desc"
        onToolActivated={onToolActivated}
      >
        <input />
      </WebMCPForm>,
    );

    const event = new CustomEvent("toolactivated");
    (event as unknown as Record<string, unknown>).toolName = "other";
    window.dispatchEvent(event);
    expect(onToolActivated).not.toHaveBeenCalled();
  });

  it("fires onToolCancel when toolcancel event matches", () => {
    const onToolCancel = vi.fn();

    render(
      <WebMCPForm
        toolName="target"
        toolDescription="desc"
        onToolCancel={onToolCancel}
      >
        <input />
      </WebMCPForm>,
    );

    const event = new CustomEvent("toolcancel");
    (event as unknown as Record<string, unknown>).toolName = "target";
    window.dispatchEvent(event);
    expect(onToolCancel).toHaveBeenCalledWith("target");
  });

  it("cleans up event listeners on unmount", () => {
    const onToolActivated = vi.fn();

    function App({ show }: { show: boolean }) {
      return show ? (
        <WebMCPForm
          toolName="tool"
          toolDescription="desc"
          onToolActivated={onToolActivated}
        >
          <input />
        </WebMCPForm>
      ) : null;
    }

    const { rerender } = render(<App show={true} />);
    rerender(<App show={false} />);

    const event = new CustomEvent("toolactivated");
    (event as unknown as Record<string, unknown>).toolName = "tool";
    window.dispatchEvent(event);
    expect(onToolActivated).not.toHaveBeenCalled();
  });
});
