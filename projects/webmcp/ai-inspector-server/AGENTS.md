# ai-inspector-server

MCP server bridging browser WebMCP tools to desktop MCP clients.

## Architecture
- ToolRegistry aggregates tools from CdpToolSource and ExtensionToolSource
- MCP server uses @modelcontextprotocol/sdk with ListTools + CallTool handlers
- **Stdio transport** (default) for mcp.json / npx usage — stdout is MCP protocol, logs go to stderr
- Streamable HTTP transport on /mcp via `start` subcommand (for hosted/manual usage)
- CLI wraps server functionality via commander

## Transport modes
- **stdio (default)**: `ai-inspector` or `npx @tech-sumit/ai-inspector-server` — for mcp.json config
- **HTTP**: `ai-inspector start` — runs Express server with StreamableHTTPServerTransport on /mcp

## mcp.json usage
```json
{
  "mcpServers": {
    "ai-inspector": {
      "command": "npx",
      "args": ["-y", "@tech-sumit/ai-inspector-server"]
    }
  }
}
```

## Key type conversions
- WebMCP uses DOMString (JSON strings) for inputSchema and tool args
- MCP uses parsed objects for inputSchema and arguments
- Server must JSON.parse inputSchema when sending to MCP clients
- Server must JSON.stringify arguments when calling WebMCP tools

## Sources
- CdpToolSource (from @tech-sumit/webmcp-cdp) — direct CDP connection to Chrome
- ExtensionToolSource — WebSocket server that accepts connections from the extension

## CLI commands
- `ai-inspector` — Run as stdio MCP server (default, for mcp.json)
- `ai-inspector start` — Start HTTP server (CDP + optional extension bridge)
- `ai-inspector list-tools` — List all tools (CDP only)
- `ai-inspector call-tool <name> [args]` — Execute a tool (CDP only)
- `ai-inspector config <client>` — Configure MCP client (claude, cursor)

## Testing
- Unit tests mock ToolSource interface
- Extension source tests use real WebSocket connections
- Integration tests need Chrome with WebMCPTesting flag
