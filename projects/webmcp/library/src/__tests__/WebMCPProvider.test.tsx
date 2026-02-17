import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { WebMCPProvider, useWebMCPStatus } from "../context";
import {
  installMockModelContext,
  removeMockModelContext,
  installMockModelContextTesting,
  removeMockModelContextTesting,
} from "./helpers";

describe("WebMCPProvider", () => {
  afterEach(() => {
    cleanup();
    removeMockModelContext();
    removeMockModelContextTesting();
  });

  function StatusDisplay() {
    const { available, testingAvailable } = useWebMCPStatus();
    return (
      <div>
        <span data-testid="available">{String(available)}</span>
        <span data-testid="testing">{String(testingAvailable)}</span>
      </div>
    );
  }

  it("provides default unavailable status", () => {
    const { getByTestId } = render(
      <WebMCPProvider>
        <StatusDisplay />
      </WebMCPProvider>,
    );

    expect(getByTestId("available").textContent).toBe("false");
    expect(getByTestId("testing").textContent).toBe("false");
  });

  it("detects modelContext availability", () => {
    installMockModelContext();

    const { getByTestId } = render(
      <WebMCPProvider>
        <StatusDisplay />
      </WebMCPProvider>,
    );

    expect(getByTestId("available").textContent).toBe("true");
    expect(getByTestId("testing").textContent).toBe("false");
  });

  it("detects modelContextTesting availability", () => {
    installMockModelContext();
    installMockModelContextTesting();

    const { getByTestId } = render(
      <WebMCPProvider>
        <StatusDisplay />
      </WebMCPProvider>,
    );

    expect(getByTestId("available").textContent).toBe("true");
    expect(getByTestId("testing").textContent).toBe("true");
  });

  it("renders children", () => {
    const { container } = render(
      <WebMCPProvider>
        <div>Child 1</div>
        <div>Child 2</div>
      </WebMCPProvider>,
    );

    expect(container.textContent).toBe("Child 1Child 2");
  });

  it("provides defaults without provider", () => {
    // useWebMCPStatus without a provider should return defaults
    const { getByTestId } = render(<StatusDisplay />);
    expect(getByTestId("available").textContent).toBe("false");
    expect(getByTestId("testing").textContent).toBe("false");
  });
});
