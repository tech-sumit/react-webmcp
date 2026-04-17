import fs from "node:fs/promises";
import path from "node:path";

import { app, BrowserWindow, clipboard, dialog, ipcMain, screen, shell, systemPreferences } from "electron";
import type { RemoteInputEvent } from "@nord-meshnet/protocol";
import { buildPlatformCapabilities } from "@nord-meshnet/native-bridges";

let mainWindow: BrowserWindow | null = null;

type NutModule = typeof import("@nut-tree-fork/nut-js");

async function loadNut(): Promise<NutModule> {
  return import("@nut-tree-fork/nut-js");
}

function getPlatformName(): "macos" | "windows" {
  return process.platform === "darwin" ? "macos" : "windows";
}

function getScreenCaptureGranted(): boolean {
  try {
    return systemPreferences.getMediaAccessStatus("screen") === "granted";
  } catch {
    return true;
  }
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 980,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(app.getAppPath(), "dist/preload.js"),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
  });

  await mainWindow.loadFile(path.join(app.getAppPath(), "renderer/index.html"));
}

function mapMouseButton(nut: NutModule, button: "left" | "middle" | "right") {
  if (button === "right") {
    return nut.Button.RIGHT;
  }

  if (button === "middle") {
    return nut.Button.MIDDLE;
  }

  return nut.Button.LEFT;
}

function mapKeyboardKey(nut: NutModule, key: string) {
  const mapping: Record<string, unknown> = {
    Enter: nut.Key.Return,
    Backspace: nut.Key.Backspace,
    Tab: nut.Key.Tab,
    Escape: nut.Key.Escape,
    ArrowUp: nut.Key.Up,
    ArrowDown: nut.Key.Down,
    ArrowLeft: nut.Key.Left,
    ArrowRight: nut.Key.Right,
    " ": nut.Key.Space,
  };

  return mapping[key];
}

async function applyRemoteInput(event: RemoteInputEvent): Promise<void> {
  const nut = await loadNut();

  if (event.kind === "pointer.move") {
    const bounds = screen.getPrimaryDisplay().bounds;
    await nut.mouse.setPosition(
      new nut.Point(
        Math.round(bounds.x + bounds.width * event.normalizedX),
        Math.round(bounds.y + bounds.height * event.normalizedY),
      ),
    );
    return;
  }

  if (event.kind === "pointer.button") {
    const bounds = screen.getPrimaryDisplay().bounds;
    await nut.mouse.setPosition(
      new nut.Point(
        Math.round(bounds.x + bounds.width * event.normalizedX),
        Math.round(bounds.y + bounds.height * event.normalizedY),
      ),
    );
    const button = mapMouseButton(nut, event.button);

    if (event.action === "double") {
      await nut.mouse.doubleClick(button);
      return;
    }

    if (event.action === "click") {
      await nut.mouse.click(button);
      return;
    }

    if (event.action === "down") {
      await nut.mouse.pressButton(button);
      return;
    }

    await nut.mouse.releaseButton(button);
    return;
  }

  if (event.kind === "pointer.wheel") {
    const lines = Math.max(1, Math.round(Math.abs(event.deltaY) / 48));
    if (event.deltaY < 0) {
      await nut.mouse.scrollUp(lines);
      return;
    }

    await nut.mouse.scrollDown(lines);
    return;
  }

  if (event.kind === "keyboard.input") {
    const mapped = mapKeyboardKey(nut, event.key);

    if (event.action === "type") {
      await nut.keyboard.type(event.text ?? event.key);
      return;
    }

    if (mapped) {
      if (event.action === "down") {
        await nut.keyboard.pressKey(mapped as never);
        return;
      }

      await nut.keyboard.releaseKey(mapped as never);
      return;
    }

    if (event.action === "down" && event.key.length === 1) {
      await nut.keyboard.type(event.key);
    }
  }
}

ipcMain.handle("runtime:get-info", () => ({
  platform: getPlatformName(),
  appVersion: app.getVersion(),
  capabilities: buildPlatformCapabilities(getPlatformName()),
}));

ipcMain.handle("runtime:get-permissions", () => ({
  accessibilityTrusted:
    process.platform === "darwin" ? systemPreferences.isTrustedAccessibilityClient(false) : true,
  screenCaptureGranted: getScreenCaptureGranted(),
}));

ipcMain.handle("host:apply-input", async (_event, remoteInput: RemoteInputEvent) => {
  await applyRemoteInput(remoteInput);
});

ipcMain.handle("clipboard:read", () => clipboard.readText());

ipcMain.handle("clipboard:write", (_event, value: string) => {
  clipboard.writeText(value);
});

ipcMain.handle("files:save-base64", async (_event, fileName: string, bytesBase64: string) => {
  const targetDirectory = app.getPath("downloads");
  const targetPath = path.join(targetDirectory, fileName);
  const uniqueTargetPath = await (async () => {
    try {
      await fs.access(targetPath);
      const ext = path.extname(fileName);
      const name = path.basename(fileName, ext);
      return path.join(targetDirectory, `${name}-${Date.now()}${ext}`);
    } catch {
      return targetPath;
    }
  })();

  await fs.writeFile(uniqueTargetPath, Buffer.from(bytesBase64, "base64"));
  return uniqueTargetPath;
});

ipcMain.handle("runtime:get-display-bounds", () => screen.getPrimaryDisplay().bounds);

ipcMain.handle("runtime:open-path", async (_event, targetPath: string) => {
  await shell.openPath(targetPath);
});

ipcMain.handle("runtime:select-save-path", async (_event, defaultPath: string) => {
  const result = await dialog.showSaveDialog({
    defaultPath,
  });

  return result.filePath ?? null;
});

app.whenReady().then(async () => {
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
