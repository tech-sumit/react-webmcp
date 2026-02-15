import { vi } from "vitest";

/**
 * Installs a mock `navigator.modelContext` and returns the mock object.
 */
export function installMockModelContext() {
  const mc = {
    registerTool: vi.fn(),
    unregisterTool: vi.fn(),
    provideContext: vi.fn(),
    clearContext: vi.fn(),
  };
  Object.defineProperty(window.navigator, "modelContext", {
    value: mc,
    configurable: true,
    writable: true,
  });
  return mc;
}

/**
 * Removes the mock `navigator.modelContext` if installed.
 */
export function removeMockModelContext() {
  const desc = Object.getOwnPropertyDescriptor(
    window.navigator,
    "modelContext",
  );
  if (desc) {
    // biome-ignore lint: we need delete here
    delete (window.navigator as Record<string, unknown>).modelContext;
  }
}

/**
 * Installs a mock `navigator.modelContextTesting` and returns the mock.
 */
export function installMockModelContextTesting() {
  const mct = {
    listTools: vi.fn(() => []),
    executeTool: vi.fn(() => Promise.resolve("")),
    registerToolsChangedCallback: vi.fn(),
    getCrossDocumentScriptToolResult: vi.fn(() => Promise.resolve("")),
  };
  Object.defineProperty(window.navigator, "modelContextTesting", {
    value: mct,
    configurable: true,
    writable: true,
  });
  return mct;
}

/**
 * Removes the mock `navigator.modelContextTesting` if installed.
 */
export function removeMockModelContextTesting() {
  const desc = Object.getOwnPropertyDescriptor(
    window.navigator,
    "modelContextTesting",
  );
  if (desc) {
    // biome-ignore lint: we need delete here
    delete (window.navigator as Record<string, unknown>).modelContextTesting;
  }
}

/**
 * Creates a default tool config for tests.
 */
export function createToolConfig(overrides: Record<string, unknown> = {}) {
  return {
    name: "test-tool",
    description: "A test tool",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string" as const },
      },
    },
    execute: vi.fn((input: Record<string, unknown>) => ({
      result: input.query,
    })),
    ...overrides,
  };
}
