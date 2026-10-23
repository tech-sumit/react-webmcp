import { useEffect } from "react";
import { getModelContext } from "../utils/modelContext";

/**
 * Listen for WebMCP tool lifecycle events.
 *
 * Per spec, the browser fires `toolactivated` (a `ToolActivatedEvent`) at
 * `document.modelContext` when a tool's execution begins and `toolcancel`
 * when it is cancelled. Older Chrome builds and the declarative (form) API
 * fire them at `window`; both targets are observed.
 *
 * @param event - The event name: "toolactivated" or "toolcancel"
 * @param callback - Called with the tool name when the event fires
 * @param toolNameFilter - Optional: only fire for a specific tool name
 *
 * @example
 * ```tsx
 * useToolEvent("toolactivated", (toolName) => {
 *   console.log(`Agent activated tool: ${toolName}`);
 *   validateForm();
 * }, "book_table");
 * ```
 */
export function useToolEvent(
  event: "toolactivated" | "toolcancel",
  callback: (toolName: string) => void,
  toolNameFilter?: string,
): void {
  useEffect(() => {
    const handler = (e: Event) => {
      const toolName = (e as CustomEvent & { toolName?: string }).toolName ??
        (e as CustomEvent).detail?.toolName;
      if (!toolName) return;
      if (toolNameFilter && toolName !== toolNameFilter) return;
      callback(toolName);
    };

    const mc = getModelContext();
    window.addEventListener(event, handler);
    mc?.addEventListener?.(event, handler);
    return () => {
      window.removeEventListener(event, handler);
      mc?.removeEventListener?.(event, handler);
    };
  }, [event, callback, toolNameFilter]);
}
