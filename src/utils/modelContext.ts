import type {
  ModelContext,
  ModelContextRegisterToolOptions,
  RegisteredTool,
  WebMCPToolDefinition,
} from "../types";

/**
 * Returns the WebMCP `ModelContext` if available, or null.
 *
 * Prefers the spec's `document.modelContext` (Chrome 149+) and falls back to
 * the legacy `navigator.modelContext` (Chrome ≤151).
 */
export function getModelContext(): ModelContext | null {
  if (typeof document !== "undefined" && document.modelContext) {
    return document.modelContext;
  }
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
 * Returns true if the WebMCP API (`document.modelContext`) is available
 * in the current browsing context.
 */
export function isWebMCPAvailable(): boolean {
  return getModelContext() !== null;
}

/**
 * Returns true if the legacy WebMCP testing API
 * (`navigator.modelContextTesting`) is available.
 *
 * @deprecated Removed in Chrome 152. Use `document.modelContext.getTools()`
 * / `executeTool()` (see `listWebMCPTools()` / `executeWebMCPTool()`).
 */
export function isWebMCPTestingAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.navigator !== "undefined" &&
    !!window.navigator.modelContextTesting
  );
}

/** Spec tool-name rule: 1–128 chars of ASCII alphanumerics, `_`, `-`, `.`. */
const TOOL_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;

/**
 * Validates a tool definition the way `registerTool()` does and throws a
 * developer-friendly error instead of the browser's `InvalidStateError`.
 */
export function validateToolDefinition(tool: {
  name: string;
  description: string;
  inputSchema?: unknown;
}): void {
  if (!tool.name) {
    throw new Error("[react-webmcp] Tool name must be a non-empty string.");
  }
  if (!TOOL_NAME_PATTERN.test(tool.name)) {
    throw new Error(
      `[react-webmcp] Tool name "${tool.name}" is invalid. Names must be 1-128 characters ` +
        `of ASCII letters, digits, "_", "-" or ".".`,
    );
  }
  if (!tool.description) {
    throw new Error(
      `[react-webmcp] Tool "${tool.name}" description must be a non-empty string.`,
    );
  }
  // Pre-check inputSchema serialization (the browser stringifies it
  // internally; circular refs or non-serializable values throw).
  if (process.env.NODE_ENV !== "production" && tool.inputSchema) {
    try {
      JSON.stringify(tool.inputSchema);
    } catch (e) {
      throw new Error(
        `[react-webmcp] Tool "${tool.name}" inputSchema is not JSON-serializable: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}

function reportRegistrationError(name: string, err: unknown): void {
  if (process.env.NODE_ENV === "production") return;
  const isInvalidState =
    err instanceof DOMException && err.name === "InvalidStateError";
  if (isInvalidState) {
    console.warn(
      `[react-webmcp] Tool "${name}" could not be registered (InvalidStateError). ` +
        `This usually means a tool with the same name is already registered.`,
    );
  } else {
    console.error(`[react-webmcp] Failed to register tool "${name}":`, err);
  }
}

/**
 * Registers a tool and returns a function that unregisters it.
 *
 * Uses the spec's `registerTool(tool, { signal })` and unregisters by
 * aborting the signal. On legacy builds whose `registerTool()` is
 * synchronous, it falls back to `unregisterTool(name)`. Registration errors
 * (sync throws or promise rejections) are logged in development and never
 * thrown, matching the fire-and-forget nature of React effects.
 */
export function registerToolWithSignal(
  mc: ModelContext,
  tool: WebMCPToolDefinition,
  options: Omit<ModelContextRegisterToolOptions, "signal"> = {},
): () => void {
  const controller = new AbortController();
  let legacy = false;

  try {
    const result = mc.registerTool(tool, { ...options, signal: controller.signal }) as
      | Promise<void>
      | undefined;
    if (result && typeof result.then === "function") {
      result.then(undefined, (err: unknown) => {
        // Aborting before registration settles rejects with the abort reason.
        if (controller.signal.aborted && err === controller.signal.reason) return;
        reportRegistrationError(tool.name, err);
      });
    } else {
      // Legacy synchronous registerTool() — no signal support.
      legacy = typeof mc.unregisterTool === "function";
    }
  } catch (err) {
    reportRegistrationError(tool.name, err);
    return () => {};
  }

  return () => {
    controller.abort();
    if (legacy) {
      try {
        mc.unregisterTool!(tool.name);
      } catch {
        // Tool may have already been unregistered externally
      }
    }
  };
}

/**
 * Lists the WebMCP tools exposed to this document via
 * `document.modelContext.getTools()`. Useful for in-page agents.
 * Returns an empty array when WebMCP is unavailable.
 */
export async function listWebMCPTools(): Promise<RegisteredTool[]> {
  const mc = getModelContext();
  if (!mc || typeof mc.getTools !== "function") return [];
  return mc.getTools();
}

/**
 * Executes a WebMCP tool by name (or `RegisteredTool`) via
 * `document.modelContext.executeTool()` and resolves with the
 * JSON-stringified result.
 *
 * Calls the spec form `executeTool(tool, inputObject)` first and falls back
 * to the JSON-string input Chrome 153 still expects.
 */
export async function executeWebMCPTool(
  tool: string | RegisteredTool,
  input: Record<string, unknown> = {},
  options: { signal?: AbortSignal } = {},
): Promise<string> {
  const mc = getModelContext();
  if (!mc || typeof mc.executeTool !== "function") {
    throw new Error("[react-webmcp] WebMCP (document.modelContext) is not available.");
  }
  const registered =
    typeof tool === "string"
      ? (await mc.getTools()).find((t) => t.name === tool)
      : tool;
  if (!registered) {
    throw new DOMException(`Tool "${String(tool)}" is not registered`, "NotFoundError");
  }
  try {
    return await mc.executeTool(registered, input, options);
  } catch (err) {
    const e = err as { name?: string; message?: string } | null;
    if (e && (e.name === "TypeError" || /parse input/i.test(e.message ?? ""))) {
      return mc.executeTool(registered, JSON.stringify(input), options);
    }
    throw err;
  }
}

/**
 * Logs a warning when WebMCP is not available. Only fires in development
 * builds so the warning is stripped from production bundles.
 */
export function warnIfUnavailable(hookName: string): void {
  if (process.env.NODE_ENV !== "production") {
    if (!isWebMCPAvailable()) {
      console.warn(
        `[react-webmcp] ${hookName}: document.modelContext is not available. ` +
          `Ensure you are running Chrome 149+ with chrome://flags/#enable-webmcp-testing enabled ` +
          `(or an active WebMCP origin trial token).`,
      );
    }
  }
}
