import {
  buildEmptyCapabilities,
  type HostCapabilities,
  type Platform,
  type RemoteInputEvent,
} from "@nord-meshnet/protocol";

export interface DesktopPermissions {
  accessibilityTrusted: boolean;
  screenCaptureGranted: boolean;
}

export interface DesktopHostBridge {
  getPermissions(): Promise<DesktopPermissions>;
  applyRemoteInput(event: RemoteInputEvent): Promise<void>;
  readClipboardText(): Promise<string>;
  writeClipboardText(text: string): Promise<void>;
  saveIncomingFile(name: string, bytesBase64: string): Promise<string>;
}

export interface MobileHostBridge {
  isAvailable(): Promise<boolean>;
  getCapabilities(): Promise<HostCapabilities>;
  registerForegroundHost(name: string): Promise<void>;
  startForegroundCapture(): Promise<void>;
  stopForegroundCapture(): Promise<void>;
}

export function buildPlatformCapabilities(platform: Platform): HostCapabilities {
  const capabilities = buildEmptyCapabilities();

  if (platform === "macos" || platform === "windows") {
    return {
      ...capabilities,
      screenCapture: true,
      pointerInjection: true,
      keyboardInjection: true,
      clipboardSync: true,
      fileTransfer: true,
      unattendedAccess: true,
    };
  }

  if (platform === "android") {
    return {
      ...capabilities,
      screenCapture: true,
      clipboardSync: true,
      fileTransfer: true,
      mobileHostBeta: true,
    };
  }

  return {
    ...capabilities,
    clipboardSync: true,
    iosEnterpriseOnly: true,
  };
}
