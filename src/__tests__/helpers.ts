import { vi } from "vitest";

/**
 * Installs a spec-shaped mock `document.modelContext` and returns it.
 *
 * `registerTool(tool, options)` resolves like the real API and records the
 * options so tests can assert on `options.signal` (aborting it is how tools
 * are unregistered per spec).
 */
export function installMockModelContext() {
  const target = new EventTarget();
  const mc = Object.assign(target, {
    registerTool: vi.fn(
      (_tool: Record<string, unknown>, _options?: { signal?: AbortSignal; exposedTo?: string[] }) =>
        Promise.resolve(),
    ),
    getTools: vi.fn(() => Promise.resolve([] as Array<Record<string, unknown>>)),
    executeTool: vi.fn(() => Promise.resolve("")),
    ontoolchange: null,
  });
  Object.defineProperty(document, "modelContext", {
    value: mc,
    configurable: true,
    writable: true,
  });
  return mc;
}

/**
 * Installs a legacy (Chrome ≤151) mock `navigator.modelContext` with a
 * synchronous `registerTool()` and `unregisterTool()` / `provideContext()` /
 * `clearContext()`, and returns it.
 */
export function installLegacyModelContext() {
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
 * Removes the mock `document.modelContext` / `navigator.modelContext` if installed.
 */
export function removeMockModelContext() {
  if (Object.getOwnPropertyDescriptor(document, "modelContext")) {
    // biome-ignore lint: we need delete here
    delete (document as unknown as Record<string, unknown>).modelContext;
  }
  if (Object.getOwnPropertyDescriptor(window.navigator, "modelContext")) {
    // biome-ignore lint: we need delete here
    delete (window.navigator as unknown as Record<string, unknown>).modelContext;
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
    delete (window.navigator as unknown as Record<string, unknown>).modelContextTesting;
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
