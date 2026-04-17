import fs from "node:fs/promises";

import { config } from "./config.js";

async function main(): Promise<void> {
  await fs.mkdir(new URL("../state/", import.meta.url), { recursive: true }).catch(() => undefined);

  console.log("Control plane config");
  console.log(`- host: ${config.host}`);
  console.log(`- port: ${config.port}`);
  console.log(`- public URL: ${config.publicBaseUrl}`);
  console.log(`- state file: ${config.stateFile}`);
  console.log(`- log file: ${config.logFile}`);
  console.log("- session secret: configured");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
