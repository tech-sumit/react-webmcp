import { contextBridge, ipcRenderer } from "electron";
import type { RemoteInputEvent } from "@nord-meshnet/protocol";

const api = {
  getRuntimeInfo: () => ipcRenderer.invoke("runtime:get-info"),
  getHostPermissions: () => ipcRenderer.invoke("runtime:get-permissions"),
  applyRemoteInput: (event: RemoteInputEvent) => ipcRenderer.invoke("host:apply-input", event),
  readClipboardText: () => ipcRenderer.invoke("clipboard:read"),
  writeClipboardText: (text: string) => ipcRenderer.invoke("clipboard:write", text),
  saveIncomingFile: (fileName: string, bytesBase64: string) =>
    ipcRenderer.invoke("files:save-base64", fileName, bytesBase64),
  getDisplayBounds: () => ipcRenderer.invoke("runtime:get-display-bounds"),
  openPath: (targetPath: string) => ipcRenderer.invoke("runtime:open-path", targetPath),
  chooseSavePath: (defaultPath: string) => ipcRenderer.invoke("runtime:select-save-path", defaultPath),
};

contextBridge.exposeInMainWorld("meshnetDesktop", api);

declare global {
  interface Window {
    meshnetDesktop: typeof api;
  }
}
