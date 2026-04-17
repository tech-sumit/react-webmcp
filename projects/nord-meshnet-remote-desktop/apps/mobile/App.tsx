import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  NativeModules,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

type Device = {
  deviceId: string;
  name: string;
  platform: string;
  trustedDeviceIds: string[];
  presence: {
    online: boolean;
  };
  capabilities: {
    screenCapture: boolean;
    pointerInjection: boolean;
    keyboardInjection: boolean;
    clipboardSync: boolean;
    fileTransfer: boolean;
    unattendedAccess: boolean;
    mobileHostBeta: boolean;
    iosEnterpriseOnly: boolean;
  };
};

type Session = {
  sessionId: string;
  hostDeviceId: string;
  controllerDeviceId: string;
  state: string;
  viewerLaunchUrl?: string;
};

type DeviceIdentity = {
  deviceId: string;
  deviceSecret: string;
};

const MOBILE_DEVICE_KEY = "meshnet-mobile.device";
const MOBILE_BASE_URL_KEY = "meshnet-mobile.base-url";
const MOBILE_NAME_KEY = "meshnet-mobile.name";

function randomToken(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function buildCapabilities() {
  if (Platform.OS === "android") {
    return {
      screenCapture: true,
      pointerInjection: false,
      keyboardInjection: false,
      clipboardSync: true,
      fileTransfer: true,
      unattendedAccess: false,
      mobileHostBeta: true,
      iosEnterpriseOnly: false,
    };
  }

  return {
    screenCapture: false,
    pointerInjection: false,
    keyboardInjection: false,
    clipboardSync: true,
    fileTransfer: true,
    unattendedAccess: false,
    mobileHostBeta: false,
    iosEnterpriseOnly: true,
  };
}

async function loadOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  const stored = await SecureStore.getItemAsync(MOBILE_DEVICE_KEY);
  if (stored) {
    return JSON.parse(stored) as DeviceIdentity;
  }

  const next = {
    deviceId: randomToken("mbl_"),
    deviceSecret: randomToken("secret_"),
  };
  await SecureStore.setItemAsync(MOBILE_DEVICE_KEY, JSON.stringify(next));
  return next;
}

export default function App(): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState<DeviceIdentity | null>(null);
  const [baseUrl, setBaseUrl] = useState("http://127.0.0.1:8789");
  const [deviceName, setDeviceName] = useState(`${Platform.OS}-meshnet-controller`);
  const [pairCode, setPairCode] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedHostId, setSelectedHostId] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [viewerLaunchUrl, setViewerLaunchUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("Booting...");

  const mobileHostBridge = useMemo(() => NativeModules.MeshnetHost ?? null, []);

  const controllerCandidates = useMemo(
    () =>
      devices.filter(
        (device) =>
          device.deviceId !== identity?.deviceId &&
          (device.capabilities.screenCapture || device.capabilities.mobileHostBeta),
      ),
    [devices, identity?.deviceId],
  );

  const fetchJson = useCallback(
    async (path: string, init?: RequestInit) => {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
        ...init,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `${response.status} ${response.statusText}`);
      }

      return response.json();
    },
    [baseUrl],
  );

  const refreshDevices = useCallback(async () => {
    const payload = await fetchJson("/api/devices");
    setDevices(payload.devices);
    if (!selectedHostId && payload.devices.length > 0) {
      const host = payload.devices.find(
        (device: Device) =>
          device.deviceId !== identity?.deviceId &&
          (device.capabilities.screenCapture || device.capabilities.mobileHostBeta),
      );
      if (host) {
        setSelectedHostId(host.deviceId);
      }
    }
  }, [fetchJson, identity?.deviceId, selectedHostId]);

  const registerDevice = useCallback(async () => {
    if (!identity) {
      return;
    }

    setStatus("Registering mobile device...");
    await SecureStore.setItemAsync(MOBILE_BASE_URL_KEY, baseUrl);
    await SecureStore.setItemAsync(MOBILE_NAME_KEY, deviceName);

    await fetchJson("/api/devices/register", {
      method: "POST",
      body: JSON.stringify({
        ...identity,
        name: deviceName,
        meshnetPeerId: "",
        platform: Platform.OS,
        userAgent: `${Platform.OS} React Native`,
        capabilities: buildCapabilities(),
        approvalMode: "prompt",
        tags: ["mobile-controller"],
      }),
    });

    await refreshDevices();
    setStatus("Registered with the control plane.");
  }, [baseUrl, deviceName, fetchJson, identity, refreshDevices]);

  const claimPairingCode = useCallback(async () => {
    if (!identity || !pairCode.trim()) {
      return;
    }

    await fetchJson("/api/pairings/claim", {
      method: "POST",
      body: JSON.stringify({
        ...identity,
        code: pairCode.trim().toUpperCase(),
      }),
    });

    setPairCode("");
    setStatus("Claimed pairing code. The host is now trusted.");
    await refreshDevices();
  }, [fetchJson, identity, pairCode, refreshDevices]);

  const requestSession = useCallback(
    async (mode: "attended" | "unattended") => {
      if (!identity || !selectedHostId) {
        setStatus("Select a host first.");
        return;
      }

      setStatus(`Requesting a ${mode} session...`);
      const payload = await fetchJson("/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          hostDeviceId: selectedHostId,
          controllerDeviceId: identity.deviceId,
          controllerSecret: identity.deviceSecret,
          requestedMode: mode,
          requestedFeatures: {
            clipboard: true,
            fileTransfer: true,
            audio: false,
          },
        }),
      });

      setSession(payload.session);
      if (payload.session.viewerLaunchUrl) {
        setViewerLaunchUrl(payload.session.viewerLaunchUrl);
      }

      setStatus(`Session ${payload.session.sessionId} is ${payload.session.state}.`);
    },
    [fetchJson, identity, selectedHostId],
  );

  const prepareAndroidHost = useCallback(async () => {
    if (Platform.OS === "ios") {
      Alert.alert(
        "iOS Host Is Gated",
        "The iOS host path stays behind enterprise/private-distribution capabilities. The public mobile app acts as a controller only.",
      );
      return;
    }

    if (!mobileHostBridge?.registerForegroundHost) {
      Alert.alert(
        "Android Host Bridge Missing",
        "The React Native shell exposes the host-beta contract, but the native MeshnetHost bridge is not bundled yet. Prebuild a native Android host module and attach it to NativeModules.MeshnetHost.",
      );
      return;
    }

    await mobileHostBridge.registerForegroundHost(deviceName);
    setStatus("Android host beta bridge registered.");
  }, [deviceName, mobileHostBridge]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [storedBaseUrl, storedName, nextIdentity] = await Promise.all([
          SecureStore.getItemAsync(MOBILE_BASE_URL_KEY),
          SecureStore.getItemAsync(MOBILE_NAME_KEY),
          loadOrCreateDeviceIdentity(),
        ]);

        if (!mounted) {
          return;
        }

        if (storedBaseUrl) {
          setBaseUrl(storedBaseUrl);
        }
        if (storedName) {
          setDeviceName(storedName);
        }
        setIdentity(nextIdentity);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!identity || loading) {
      return;
    }

    void registerDevice().catch((error) => {
      setStatus(error instanceof Error ? error.message : String(error));
    });
  }, [identity, loading, registerDevice]);

  useEffect(() => {
    if (!identity || !session) {
      return;
    }

    if (session.state === "approved" && session.viewerLaunchUrl) {
      setViewerLaunchUrl(session.viewerLaunchUrl);
      return;
    }

    const interval = setInterval(() => {
      void (async () => {
        const payload = await fetchJson(
          `/api/sessions/${session.sessionId}?deviceId=${identity.deviceId}&deviceSecret=${identity.deviceSecret}`,
        );

        setSession(payload.session);
        if (payload.session.viewerLaunchUrl) {
          setViewerLaunchUrl(payload.session.viewerLaunchUrl);
        }
      })().catch((error) => {
        setStatus(error instanceof Error ? error.message : String(error));
      });
    }, 2_000);

    return () => clearInterval(interval);
  }, [fetchJson, identity, session]);

  if (loading || !identity) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#38bdf8" />
        <Text style={styles.statusText}>Booting mobile controller...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Nord Meshnet Remote Desktop</Text>
        <Text style={styles.subtitle}>{identity.deviceId}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Control Plane</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="http://100.x.y.z:8789"
            placeholderTextColor="#64748b"
            style={styles.input}
            value={baseUrl}
            onChangeText={setBaseUrl}
          />
          <TextInput
            placeholder="Device name"
            placeholderTextColor="#64748b"
            style={styles.input}
            value={deviceName}
            onChangeText={setDeviceName}
          />
          <Pressable style={styles.primaryButton} onPress={() => void registerDevice()}>
            <Text style={styles.primaryButtonText}>Register Device</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => void refreshDevices()}>
            <Text style={styles.secondaryButtonText}>Refresh Hosts</Text>
          </Pressable>
          <Text style={styles.statusText}>{status}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pairing</Text>
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="AB12CD"
            placeholderTextColor="#64748b"
            style={styles.input}
            value={pairCode}
            onChangeText={setPairCode}
          />
          <Pressable style={styles.secondaryButton} onPress={() => void claimPairingCode()}>
            <Text style={styles.secondaryButtonText}>Claim Pair Code</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Available Hosts</Text>
          {controllerCandidates.map((device) => {
            const selected = selectedHostId === device.deviceId;
            return (
              <Pressable
                key={device.deviceId}
                style={[styles.hostRow, selected && styles.hostRowSelected]}
                onPress={() => setSelectedHostId(device.deviceId)}
              >
                <View>
                  <Text style={styles.hostTitle}>
                    {device.name} ({device.platform})
                  </Text>
                  <Text style={styles.hostMeta}>
                    {device.presence.online ? "online" : "offline"} · clipboard{" "}
                    {device.capabilities.clipboardSync ? "yes" : "no"} · files{" "}
                    {device.capabilities.fileTransfer ? "yes" : "no"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          {controllerCandidates.length === 0 ? (
            <Text style={styles.hostMeta}>No Meshnet hosts discovered yet.</Text>
          ) : null}
          <Pressable style={styles.primaryButton} onPress={() => void requestSession("attended")}>
            <Text style={styles.primaryButtonText}>Request Attended Session</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => void requestSession("unattended")}>
            <Text style={styles.secondaryButtonText}>Request Unattended Session</Text>
          </Pressable>
          {session ? (
            <Text style={styles.hostMeta}>
              Session {session.sessionId}: {session.state}
            </Text>
          ) : null}
          {viewerLaunchUrl ? (
            <Pressable style={styles.primaryButton} onPress={() => setViewerLaunchUrl(viewerLaunchUrl)}>
              <Text style={styles.primaryButtonText}>Open Remote Session</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Host Beta</Text>
          <Text style={styles.hostMeta}>
            {Platform.OS === "android"
              ? mobileHostBridge
                ? "Android host bridge detected. You can wire MediaProjection and accessibility into this shell."
                : "Android host beta contract is present, but the native MeshnetHost bridge is not bundled yet."
              : "iOS host control remains enterprise/private-distribution only. This app intentionally stays controller-first."}
          </Text>
          <Pressable style={styles.secondaryButton} onPress={() => void prepareAndroidHost()}>
            <Text style={styles.secondaryButtonText}>Prepare Host Beta</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={Boolean(viewerLaunchUrl)} animationType="slide">
        <SafeAreaView style={styles.webviewContainer}>
          <View style={styles.webviewHeader}>
            <Text style={styles.cardTitle}>Remote Session</Text>
            <Pressable style={styles.secondaryButton} onPress={() => setViewerLaunchUrl(null)}>
              <Text style={styles.secondaryButtonText}>Close</Text>
            </Pressable>
          </View>
          {viewerLaunchUrl ? <WebView source={{ uri: viewerLaunchUrl }} style={styles.webview} /> : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
  },
  container: {
    padding: 20,
    gap: 16,
  },
  title: {
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94a3b8",
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#020617",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f8fafc",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },
  primaryButton: {
    backgroundColor: "#38bdf8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#082f49",
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#e2e8f0",
    fontWeight: "700",
  },
  statusText: {
    color: "#94a3b8",
  },
  hostRow: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  hostRowSelected: {
    borderColor: "#38bdf8",
  },
  hostTitle: {
    color: "#f8fafc",
    fontWeight: "600",
  },
  hostMeta: {
    color: "#94a3b8",
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: "#020617",
  },
  webviewHeader: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  webview: {
    flex: 1,
  },
});
