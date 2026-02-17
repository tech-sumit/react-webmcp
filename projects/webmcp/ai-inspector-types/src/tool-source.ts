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
}

/**
 * Abstraction for a source of WebMCP tools.
 *
 * Implemented by:
 * - `CdpToolSource` in @anthropic/webmcp-cdp (direct CDP via chrome-remote-interface)
 * - `ExtensionToolSource` in @anthropic/ai-inspector-server (WebSocket bridge to extension)
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
   * @returns JSON-encoded result, or null if a cross-document navigation occurred
   */
  callTool(name: string, inputArguments: string): Promise<string | null>;

  /** Register a callback for when the tool list changes. */
  onToolsChanged(cb: (tools: DiscoveredTool[]) => void): void;
}
