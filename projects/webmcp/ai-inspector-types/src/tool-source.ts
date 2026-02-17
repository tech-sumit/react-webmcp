import type { DiscoveredTool } from "./tool.js";

/**
 * Configuration for connecting a ToolSource.
 */
export interface ToolSourceConfig {
  /** CDP host (default: "localhost") */
  host?: string;
  /** CDP port (default: 9222) */
  port?: number;
  /** WebSocket port for extension bridge */
  wsPort?: number;
  /** Launch a new browser instead of connecting via CDP */
  launch?: boolean;
  /** Browser channel for launch mode: 'chrome', 'chrome-beta', 'chrome-canary', 'msedge', etc. */
  channel?: string;
  /** Run launched browser in headless mode */
  headless?: boolean;
  /** Initial URL to navigate to after launching */
  url?: string;
}

/**
 * A single content block returned by a tool call.
 * Mirrors MCP's TextContent and ImageContent types so the MCP server
 * can pass results through directly.
 */
export type ToolCallResultContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

/**
 * Abstraction for a source of WebMCP tools.
 *
 * Implemented by:
 * - `CdpToolSource` in @tech-sumit/webmcp-cdp (direct CDP via chrome-remote-interface)
 * - `ExtensionToolSource` in @tech-sumit/ai-inspector-server (WebSocket bridge to extension)
 * - `PlaywrightBrowserSource` in @tech-sumit/ai-inspector-server (browser automation via Playwright)
 */
export interface ToolSource {
  /** Connect to the tool source. */
  connect(config: ToolSourceConfig): Promise<void>;

  /** Disconnect and clean up resources. */
  disconnect(): Promise<void>;

  /** Return all currently discovered tools. */
  listTools(): DiscoveredTool[];

  /**
   * Execute a tool by name.
   *
   * @param name - The tool name
   * @param inputArguments - JSON-encoded input arguments (DOMString per WebMCP spec)
   * @returns Array of content blocks (text, image, etc.)
   */
  callTool(name: string, inputArguments: string): Promise<ToolCallResultContent[]>;

  /** Register a callback for when the tool list changes. */
  onToolsChanged(cb: (tools: DiscoveredTool[]) => void): void;
}
