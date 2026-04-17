import fs from "node:fs";
import path from "node:path";

export interface Logger {
  info(message: string, payload?: Record<string, unknown>): void;
  warn(message: string, payload?: Record<string, unknown>): void;
  error(message: string, payload?: Record<string, unknown>): void;
}

function writeEntry(logFile: string, level: string, message: string, payload?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...payload,
  };

  const line = `${JSON.stringify(entry)}\n`;
  fs.appendFileSync(logFile, line);

  if (level === "error") {
    process.stderr.write(line);
    return;
  }

  process.stdout.write(line);
}

export function createLogger(logFile: string): Logger {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });

  return {
    info(message, payload) {
      writeEntry(logFile, "info", message, payload);
    },
    warn(message, payload) {
      writeEntry(logFile, "warn", message, payload);
    },
    error(message, payload) {
      writeEntry(logFile, "error", message, payload);
    },
  };
}
