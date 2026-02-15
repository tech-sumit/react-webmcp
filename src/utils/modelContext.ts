import type { ModelContext } from "../types";

/**
 * Returns the navigator.modelContext API if available, or null.
 */
export function getModelContext(): ModelContext | null {
  if (
    typeof window !== "undefined" &&
    typeof window.navigator !== "undefined" &&
    window.navigator.modelContext
  ) {
    return window.navigator.modelContext;
  }
  return null;
}

/**
 * Returns true if the WebMCP API (navigator.modelContext) is available
 * in the current browsing context.
 */
export function isWebMCPAvailable(): boolean {
  return getModelContext() !== null;
}

/**
 * Returns true if the WebMCP testing API (navigator.modelContextTesting)
 * is available. This is the API used by the Model Context Tool Inspector
 * extension and requires the "WebMCP for testing" Chrome flag.
 */
export function isWebMCPTestingAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.navigator !== "undefined" &&
    !!window.navigator.modelContextTesting
  );
}

/**
 * Logs a warning when WebMCP is not available. Useful during development
 * to remind developers to enable the Chrome flag.
 */
export function warnIfUnavailable(hookName: string): void {
  if (!isWebMCPAvailable()) {
    console.warn(
      `[react-webmcp] ${hookName}: navigator.modelContext is not available. ` +
        `Ensure you are running Chrome 146+ with the "WebMCP for testing" flag enabled.`,
    );
  }
}
