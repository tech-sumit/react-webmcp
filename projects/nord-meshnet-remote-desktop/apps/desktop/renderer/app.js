const runtimeSummary = document.getElementById("runtime-summary");
const socketStatus = document.getElementById("socket-status");
const controlPlaneUrlInput = document.getElementById("control-plane-url");
const deviceNameInput = document.getElementById("device-name");
const approvalModeSelect = document.getElementById("approval-mode");
const permissionSummary = document.getElementById("permission-summary");
const registerDeviceButton = document.getElementById("register-device");
const refreshDevicesButton = document.getElementById("refresh-devices");
const createPairCodeButton = document.getElementById("create-pair-code");
const pairCodeOutput = document.getElementById("pair-code-output");
const claimPairCodeInput = document.getElementById("claim-pair-code");
const claimPairCodeButton = document.getElementById("claim-pair-code-button");
const hostSelector = document.getElementById("host-selector");
const sessionModeSelect = document.getElementById("session-mode");
const requestSessionButton = document.getElementById("request-session");
const launchMobileViewButton = document.getElementById("launch-mobile-view");
const controllerStatus = document.getElementById("controller-status");
const incomingRequests = document.getElementById("incoming-requests");
const sessionStatus = document.getElementById("session-status");
const sessionVideo = document.getElementById("session-video");
const sessionOverlay = document.getElementById("session-overlay");
const sendHostClipboardButton = document.getElementById("send-host-clipboard");
const endSessionButton = document.getElementById("end-session");
const clipboardText = document.getElementById("clipboard-text");
const sendClipboardButton = document.getElementById("send-clipboard");
const typeTextInput = document.getElementById("type-text");
const sendTextButton = document.getElementById("send-text");
const fileTransferInput = document.getElementById("file-transfer");
const fileTransferStatus = document.getElementById("file-transfer-status");
const activityLog = document.getElementById("activity-log");

const SETTINGS_KEY = "meshnet-desktop.settings";
const incomingFileChunks = new Map();

const state = {
  runtime: null,
  settings: {
    baseUrl: "http://127.0.0.1:8789",
    deviceName: "",
    approvalMode: "prompt",
  },
  device: null,
  socket: null,
  devices: [],
  pendingRequests: new Map(),
  activeSession: null,
  localStream: null,
  peerConnection: null,
  lastPointerMoveAt: 0,
};

function log(message, payload = null) {
  const line = [`[${new Date().toLocaleTimeString()}]`, message];
  if (payload) {
    line.push(JSON.stringify(payload));
  }

  activityLog.textContent = `${line.join(" ")}\n${activityLog.textContent}`.slice(0, 12000);
}

function setSocketStatus(label, online = false) {
  socketStatus.textContent = label;
  socketStatus.style.background = online ? "rgba(34, 197, 94, 0.2)" : "rgba(148, 163, 184, 0.18)";
  socketStatus.style.color = online ? "#86efac" : "#cbd5e1";
}

function setSessionStatus(label) {
  sessionStatus.textContent = label;
}

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
    state.settings = {
      ...state.settings,
      ...parsed,
    };
  } catch {
    localStorage.removeItem(SETTINGS_KEY);
  }

  controlPlaneUrlInput.value = state.settings.baseUrl;
  approvalModeSelect.value = state.settings.approvalMode;
}

function saveSettings() {
  state.settings.baseUrl = controlPlaneUrlInput.value.trim() || state.settings.baseUrl;
  state.settings.deviceName = deviceNameInput.value.trim() || state.settings.deviceName;
  state.settings.approvalMode = approvalModeSelect.value;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function generateDeviceSecret() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function getDevice() {
  const stored = localStorage.getItem("meshnet-desktop.device");
  if (stored) {
    state.device = JSON.parse(stored);
    return state.device;
  }

  const device = {
    deviceId: `desk_${crypto.randomUUID().replaceAll("-", "")}`,
    deviceSecret: generateDeviceSecret(),
  };
  localStorage.setItem("meshnet-desktop.device", JSON.stringify(device));
  state.device = device;
  return device;
}

async function fetchJson(path, init = {}) {
  const response = await fetch(`${state.settings.baseUrl.replace(/\/$/, "")}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function loadSocketLibrary() {
  if (window.io) {
    return;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${state.settings.baseUrl.replace(/\/$/, "")}/socket.io/socket.io.js`;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function buildIdentity() {
  const device = getDevice();
  return {
    ...device,
    name: state.settings.deviceName || `${state.runtime.platform}-meshnet-host`,
    platform: state.runtime.platform,
    meshnetPeerId: "",
    userAgent: navigator.userAgent,
    capabilities: state.runtime.capabilities,
    approvalMode: state.settings.approvalMode,
    tags: ["desktop"],
  };
}

async function registerDevice() {
  saveSettings();
  await fetchJson("/api/devices/register", {
    method: "POST",
    body: JSON.stringify(buildIdentity()),
  });
  log("Registered device", buildIdentity());
  await connectSocket();
  await refreshDevices();
}

async function connectSocket() {
  await loadSocketLibrary();

  if (state.socket) {
    state.socket.disconnect();
  }

  const device = getDevice();
  const socket = window.io(state.settings.baseUrl, {
    transports: ["websocket"],
  });

  state.socket = socket;
  setSocketStatus("Connecting...");

  socket.on("connect", () => {
    socket.emit(
      "presence:register",
      {
        deviceId: device.deviceId,
        deviceSecret: device.deviceSecret,
      },
      (result) => {
        if (!result?.ok) {
          setSocketStatus("Registration failed");
          log("Socket registration failed", result);
          return;
        }

        setSocketStatus("Online", true);
        log("Socket connected", result);
      },
    );
  });

  socket.on("disconnect", () => {
    setSocketStatus("Offline");
  });

  socket.on("connect_error", (error) => {
    setSocketStatus("Socket error");
    log("Socket error", { message: error.message });
  });

  socket.on("session:requested", (session) => {
    state.pendingRequests.set(session.sessionId, session);
    renderIncomingRequests();
    log("Incoming session request", session);
  });

  socket.on("session:approved", async (session) => {
    state.pendingRequests.delete(session.sessionId);
    renderIncomingRequests();
    log("Session approved", session);

    if (session.hostDeviceId === state.device.deviceId) {
      await startHostSession(session);
      return;
    }

    await startControllerSession(session);
  });

  socket.on("session:rejected", (payload) => {
    controllerStatus.textContent = "The session was rejected.";
    setSessionStatus("Session rejected");
    log("Session rejected", payload);
  });

  socket.on("session:ended", () => {
    log("Session ended");
    closeActiveSession();
  });

  socket.on("rtc:signal", async (signal) => {
    try {
      await handleRtcSignal(signal);
    } catch (error) {
      log("Failed to handle RTC signal", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  socket.on("session:input", async (event) => {
    try {
      await handleIncomingInput(event);
    } catch (error) {
      log("Failed to apply remote input", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

async function refreshDevices() {
  const payload = await fetchJson("/api/devices");
  state.devices = payload.devices;
  renderHostOptions();
}

function renderHostOptions() {
  const candidates = state.devices.filter(
    (device) =>
      device.deviceId !== state.device.deviceId &&
      (device.capabilities.screenCapture || device.capabilities.mobileHostBeta),
  );

  hostSelector.innerHTML = candidates
    .map(
      (device) =>
        `<option value="${device.deviceId}">${device.name} (${device.platform})${
          device.presence.online ? " - online" : " - offline"
        }</option>`,
    )
    .join("");

  if (!candidates.length) {
    hostSelector.innerHTML = `<option value="">No hosts discovered yet</option>`;
  }
}

function renderIncomingRequests() {
  const requests = Array.from(state.pendingRequests.values());

  if (!requests.length) {
    incomingRequests.innerHTML = `<p class="meta">No pending requests.</p>`;
    return;
  }

  incomingRequests.innerHTML = requests
    .map(
      (request) => `
        <article class="request-card">
          <h3>${request.controllerDeviceId}</h3>
          <p class="meta">Mode: ${request.requestedMode}</p>
          <div class="actions">
            <button data-action="approve" data-session-id="${request.sessionId}">Approve</button>
            <button class="secondary" data-action="reject" data-session-id="${request.sessionId}">Reject</button>
          </div>
        </article>
      `,
    )
    .join("");
}

async function createPairCode() {
  const pairing = await fetchJson("/api/pairings", {
    method: "POST",
    body: JSON.stringify(state.device),
  });
  pairCodeOutput.textContent = `${pairing.pairing.code} (expires ${new Date(
    pairing.pairing.expiresAt,
  ).toLocaleTimeString()})`;
  log("Created pairing code", pairing.pairing);
}

async function claimPairCode() {
  const code = claimPairCodeInput.value.trim().toUpperCase();
  if (!code) {
    return;
  }

  const result = await fetchJson("/api/pairings/claim", {
    method: "POST",
    body: JSON.stringify({
      ...state.device,
      code,
    }),
  });
  claimPairCodeInput.value = "";
  controllerStatus.textContent = `Claimed pair code for ${result.host.name}`;
  log("Claimed pairing code", result);
  await refreshDevices();
}

async function requestSession() {
  const hostDeviceId = hostSelector.value;
  if (!hostDeviceId) {
    controllerStatus.textContent = "Select a host first.";
    return;
  }

  const result = await fetchJson("/api/sessions", {
    method: "POST",
    body: JSON.stringify({
      hostDeviceId,
      controllerDeviceId: state.device.deviceId,
      controllerSecret: state.device.deviceSecret,
      requestedMode: sessionModeSelect.value,
      requestedFeatures: {
        clipboard: true,
        fileTransfer: true,
        audio: false,
      },
    }),
  });

  controllerStatus.textContent = `Session ${result.session.sessionId} requested (${result.session.state}).`;
  log("Requested session", result.session);

  if (result.session.state === "approved") {
    await startControllerSession(result.session);
  }
}

function createPeerConnection(role) {
  const peerConnection = new RTCPeerConnection({
    iceServers: [],
  });

  peerConnection.onicecandidate = (event) => {
    if (!event.candidate || !state.activeSession) {
      return;
    }

    const targetDeviceId =
      role === "host" ? state.activeSession.controllerDeviceId : state.activeSession.hostDeviceId;

    state.socket.emit("rtc:signal", {
      sessionId: state.activeSession.sessionId,
      fromDeviceId: state.device.deviceId,
      toDeviceId: targetDeviceId,
      candidate: event.candidate.toJSON(),
    });
  };

  peerConnection.onconnectionstatechange = () => {
    setSessionStatus(`Peer state: ${peerConnection.connectionState}`);
  };

  peerConnection.ontrack = (event) => {
    sessionVideo.srcObject = event.streams[0];
  };

  return peerConnection;
}

async function ensureLocalStream() {
  if (state.localStream) {
    return state.localStream;
  }

  state.localStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  });
  sessionVideo.srcObject = state.localStream;
  return state.localStream;
}

async function startHostSession(session) {
  closeActiveSession(false);
  state.activeSession = session;
  state.peerConnection = createPeerConnection("host");
  setSessionStatus(`Hosting ${session.sessionId}`);

  const permissions = await window.meshnetDesktop.getHostPermissions();
  permissionSummary.textContent = `Accessibility: ${
    permissions.accessibilityTrusted ? "granted" : "missing"
  } | Screen capture: ${permissions.screenCaptureGranted ? "ready" : "prompt may appear"}`;

  const stream = await ensureLocalStream();
  for (const track of stream.getTracks()) {
    state.peerConnection.addTrack(track, stream);
  }
}

async function startControllerSession(session) {
  closeActiveSession(false);
  state.activeSession = session;
  state.peerConnection = createPeerConnection("controller");
  setSessionStatus(`Controlling ${session.hostDeviceId}`);

  const offer = await state.peerConnection.createOffer({
    offerToReceiveVideo: true,
    offerToReceiveAudio: false,
  });
  await state.peerConnection.setLocalDescription(offer);

  state.socket.emit("rtc:signal", {
    sessionId: session.sessionId,
    fromDeviceId: state.device.deviceId,
    toDeviceId: session.hostDeviceId,
    description: offer,
  });

  controllerStatus.textContent = session.viewerLaunchUrl
    ? `Desktop control ready. Mobile launch URL available.`
    : "Desktop control ready.";
}

async function handleRtcSignal(signal) {
  if (!state.activeSession || signal.sessionId !== state.activeSession.sessionId) {
    return;
  }

  if (!state.peerConnection) {
    if (state.activeSession.hostDeviceId === state.device.deviceId) {
      await startHostSession(state.activeSession);
    } else {
      await startControllerSession(state.activeSession);
    }
  }

  const role = state.activeSession.hostDeviceId === state.device.deviceId ? "host" : "controller";

  if (signal.description) {
    if (signal.description.type === "offer" && role === "host") {
      await state.peerConnection.setRemoteDescription(signal.description);
      const answer = await state.peerConnection.createAnswer();
      await state.peerConnection.setLocalDescription(answer);
      state.socket.emit("rtc:signal", {
        sessionId: state.activeSession.sessionId,
        fromDeviceId: state.device.deviceId,
        toDeviceId: state.activeSession.controllerDeviceId,
        description: answer,
      });
      return;
    }

    if (signal.description.type === "answer") {
      await state.peerConnection.setRemoteDescription(signal.description);
    }
  }

  if (signal.candidate) {
    await state.peerConnection.addIceCandidate(signal.candidate);
  }
}

async function handleIncomingInput(event) {
  if (!state.activeSession || state.activeSession.hostDeviceId !== state.device.deviceId) {
    return;
  }

  if (event.kind === "clipboard.text") {
    await window.meshnetDesktop.writeClipboardText(event.text);
    log("Clipboard updated from controller");
    return;
  }

  if (event.kind === "file.meta") {
    incomingFileChunks.set(event.name, []);
    fileTransferStatus.textContent = `Receiving ${event.name}...`;
    return;
  }

  if (event.kind === "file.chunk") {
    const chunks = incomingFileChunks.get(event.name) ?? [];
    chunks[event.index] = event.chunk;
    incomingFileChunks.set(event.name, chunks);

    if (event.isLast) {
      const bytesBase64 = chunks.join("");
      const savedPath = await window.meshnetDesktop.saveIncomingFile(event.name, bytesBase64);
      fileTransferStatus.textContent = `Saved ${event.name} -> ${savedPath}`;
      incomingFileChunks.delete(event.name);
    }

    return;
  }

  await window.meshnetDesktop.applyRemoteInput(event);
}

function closeActiveSession(resetStatus = true) {
  state.peerConnection?.close();
  state.peerConnection = null;

  if (state.localStream) {
    for (const track of state.localStream.getTracks()) {
      track.stop();
    }
    state.localStream = null;
  }

  sessionVideo.srcObject = null;
  state.activeSession = null;

  if (resetStatus) {
    setSessionStatus("No active session.");
  }
}

function normalizePointer(event) {
  const rect = sessionOverlay.getBoundingClientRect();
  return {
    normalizedX: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    normalizedY: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
  };
}

function emitControllerInput(inputEvent) {
  if (!state.socket || !state.activeSession || state.activeSession.controllerDeviceId !== state.device.deviceId) {
    return;
  }

  state.socket.emit("session:input", {
    sessionId: state.activeSession.sessionId,
    event: inputEvent,
  });
}

sessionOverlay.addEventListener("pointermove", (event) => {
  if (!state.activeSession || state.activeSession.controllerDeviceId !== state.device.deviceId) {
    return;
  }

  const now = performance.now();
  if (now - state.lastPointerMoveAt < 24) {
    return;
  }

  state.lastPointerMoveAt = now;
  emitControllerInput({
    kind: "pointer.move",
    ...normalizePointer(event),
  });
});

sessionOverlay.addEventListener("click", (event) => {
  if (!state.activeSession || state.activeSession.controllerDeviceId !== state.device.deviceId) {
    return;
  }

  emitControllerInput({
    kind: "pointer.button",
    ...normalizePointer(event),
    button: "left",
    action: "click",
  });
});

sessionOverlay.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  if (!state.activeSession || state.activeSession.controllerDeviceId !== state.device.deviceId) {
    return;
  }

  emitControllerInput({
    kind: "pointer.button",
    ...normalizePointer(event),
    button: "right",
    action: "click",
  });
});

sessionOverlay.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    emitControllerInput({
      kind: "pointer.wheel",
      deltaY: event.deltaY,
    });
  },
  { passive: false },
);

window.addEventListener("keydown", (event) => {
  if (
    !state.activeSession ||
    state.activeSession.controllerDeviceId !== state.device.deviceId ||
    event.target === clipboardText ||
    event.target === typeTextInput
  ) {
    return;
  }

  emitControllerInput({
    kind: "keyboard.input",
    key: event.key,
    code: event.code,
    action: "down",
  });
});

window.addEventListener("keyup", (event) => {
  if (
    !state.activeSession ||
    state.activeSession.controllerDeviceId !== state.device.deviceId ||
    event.target === clipboardText ||
    event.target === typeTextInput
  ) {
    return;
  }

  emitControllerInput({
    kind: "keyboard.input",
    key: event.key,
    code: event.code,
    action: "up",
  });
});

sendClipboardButton.addEventListener("click", () => {
  emitControllerInput({
    kind: "clipboard.text",
    text: clipboardText.value,
  });
  clipboardText.value = "";
});

sendTextButton.addEventListener("click", () => {
  if (!typeTextInput.value.trim()) {
    return;
  }

  emitControllerInput({
    kind: "keyboard.input",
    key: typeTextInput.value,
    action: "type",
    text: typeTextInput.value,
  });
  typeTextInput.value = "";
});

sendHostClipboardButton.addEventListener("click", async () => {
  const localClipboard = await window.meshnetDesktop.readClipboardText();
  clipboardText.value = localClipboard;
});

fileTransferInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const fileAsBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.split(",")[1] ?? "");
    };
    reader.readAsDataURL(file);
  });

  emitControllerInput({
    kind: "file.meta",
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
  });

  const chunkSize = 32 * 1024;
  for (let offset = 0; offset < fileAsBase64.length; offset += chunkSize) {
    emitControllerInput({
      kind: "file.chunk",
      name: file.name,
      chunk: fileAsBase64.slice(offset, offset + chunkSize),
      index: offset / chunkSize,
      isLast: offset + chunkSize >= fileAsBase64.length,
    });
  }

  fileTransferStatus.textContent = `Sent ${file.name}`;
  fileTransferInput.value = "";
});

endSessionButton.addEventListener("click", () => {
  if (!state.activeSession) {
    closeActiveSession();
    return;
  }

  state.socket?.emit("session:end", {
    sessionId: state.activeSession.sessionId,
  });
  closeActiveSession();
});

incomingRequests.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const sessionId = button.dataset.sessionId;
  if (!sessionId) {
    return;
  }

  const action = button.dataset.action;
  const endpoint = action === "approve" ? "approve" : "reject";
  const result = await fetchJson(`/api/sessions/${sessionId}/${endpoint}`, {
    method: "POST",
    body: JSON.stringify(state.device),
  });

  state.pendingRequests.delete(sessionId);
  renderIncomingRequests();
  log(`Host ${endpoint}d session`, result.session);

  if (endpoint === "approve") {
    await startHostSession(result.session);
  }
});

registerDeviceButton.addEventListener("click", () => {
  void registerDevice();
});

refreshDevicesButton.addEventListener("click", () => {
  void refreshDevices();
});

createPairCodeButton.addEventListener("click", () => {
  void createPairCode();
});

claimPairCodeButton.addEventListener("click", () => {
  void claimPairCode();
});

requestSessionButton.addEventListener("click", () => {
  void requestSession();
});

launchMobileViewButton.addEventListener("click", async () => {
  if (!state.activeSession?.viewerLaunchUrl) {
    controllerStatus.textContent = "No active approved session to launch on mobile.";
    return;
  }

  await window.meshnetDesktop.writeClipboardText(state.activeSession.viewerLaunchUrl);
  controllerStatus.textContent = "Copied the mobile controller launch URL to the clipboard.";
});

async function boot() {
  state.runtime = await window.meshnetDesktop.getRuntimeInfo();
  const device = getDevice();
  loadSettings();

  if (!state.settings.deviceName) {
    state.settings.deviceName = `${state.runtime.platform}-meshnet-host`;
    deviceNameInput.value = state.settings.deviceName;
  } else {
    deviceNameInput.value = state.settings.deviceName;
  }

  runtimeSummary.textContent = `${state.runtime.platform} desktop app · ${device.deviceId}`;
  const permissions = await window.meshnetDesktop.getHostPermissions();
  permissionSummary.textContent = `Accessibility: ${
    permissions.accessibilityTrusted ? "granted" : "missing"
  } | Screen capture: ${permissions.screenCaptureGranted ? "ready" : "needs prompt"}`;

  try {
    await registerDevice();
  } catch (error) {
    setSocketStatus("Registration failed");
    log("Initial registration failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

boot().catch((error) => {
  setSocketStatus("Boot failed");
  log("Boot failed", {
    message: error instanceof Error ? error.message : String(error),
  });
});
