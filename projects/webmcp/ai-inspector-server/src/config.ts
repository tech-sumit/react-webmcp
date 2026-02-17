import { writeFile, readFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { homedir } from "os";

interface McpServerEntry {
  url?: string;
  command?: string;
  args?: string[];
}

interface McpClientConfig {
  mcpServers: Record<string, McpServerEntry>;
}

const CONFIG_PATHS: Record<string, string> = {
  claude: join(
    homedir(),
    "Library",
    "Application Support",
    "Claude",
    "claude_desktop_config.json",
  ),
  cursor: join(homedir(), ".cursor", "mcp.json"),
};

/**
 * Write MCP client configuration for the specified client.
 * Adds an "ai-inspector" server entry using stdio transport (npx).
 */
export async function configureMcpClient(client: string): Promise<void> {
  const configPath = CONFIG_PATHS[client.toLowerCase()];
  if (!configPath) {
    throw new Error(
      `Unknown MCP client: "${client}". Supported: ${Object.keys(CONFIG_PATHS).join(", ")}`,
    );
  }

  let config: McpClientConfig = { mcpServers: {} };
  try {
    const raw = await readFile(configPath, "utf-8");
    config = JSON.parse(raw);
  } catch {
    // File doesn't exist or is invalid; start fresh
  }

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  config.mcpServers["ai-inspector"] = {
    command: "npx",
    args: ["-y", "@tech-sumit/ai-inspector-server"],
  };

  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
  console.log(`[AI Inspector] Configured ${client} at ${configPath}`);
  console.log(`[AI Inspector] Entry: npx -y @tech-sumit/ai-inspector-server`);
}
