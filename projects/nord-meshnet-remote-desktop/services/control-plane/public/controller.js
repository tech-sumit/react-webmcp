const statusEl = document.getElementById("session-status");
const sessionMetaEl = document.getElementById("session-meta");
const connectionMetaEl = document.getElementById("connection-meta");
const remoteVideo = document.getElementById("remote-video");
const controlOverlay = document.getElementById("control-overlay");
const clipboardText = document.getElementById("clipboard-text");
const sendClipboardButton = document.getElementById("send-clipboard");
const typeTextInput = document.getElementById("type-text");
const sendTextButton = document.getElementById("send-text");
const fileInput = document.getElementById("file-input");
const endSessionButton = document.getElementById("end-session");

const params = new URLSearchParams(window.location.search);
const viewerToken = params.get("token");

let launch = null;
let socket = null;
let peerConnection = null;
let lastMoveSentAt = 0;

function setStatus(label) {
  statusEl.textContent = label;
}

function setConnectionMeta(label) {
  connectionMetaEl.textContent = label;
}

function normalizePointer(event) {
  const rect = controlOverlay.getBoundingClientRect();
  return {
    normalizedX: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    normalizedY: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
  };
}

function emitInput(inputEvent) {
  if (!socket || !launch) {
    return;
  }

  socket.emit("session:input", {
    sessionId: launch.sessionId,
    event: inputEvent,
  });
}

async function connectSocket() {
  socket = window.io(launch.controlPlaneBaseUrl, {
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    socket.emit(
      "presence:register",
      {
        sessionToken: viewerToken,
      },
      (result) => {
        if (!result?.ok) {
          setStatus("Registration failed");
          setConnectionMeta(result?.error ?? "Unknown control-plane error");
          return;
        }

        setStatus("Registered");
        setConnectionMeta("Connected to the Meshnet control plane");
        void startControllerSession();
      },
    );
  });

  socket.on("connect_error", (error) => {
    setStatus("Socket error");
    setConnectionMeta(error.message);
  });

  socket.on("rtc:signal", async (signal) => {
    if (!peerConnection) {
      return;
    }

    if (signal.description) {
      await peerConnection.setRemoteDescription(signal.description);
    }

    if (signal.candidate) {
      await peerConnection.addIceCandidate(signal.candidate);
    }
  });

  socket.on("session:rejected", () => {
    setStatus("Rejected");
    setConnectionMeta("The host rejected the session request");
  });

  socket.on("session:ended", () => {
    setStatus("Ended");
    setConnectionMeta("The remote host ended the session");
    peerConnection?.close();
  });
}

async function startControllerSession() {
  if (peerConnection) {
    return;
  }

  peerConnection = new RTCPeerConnection({
    iceServers: [],
  });

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
    setStatus("Streaming");
    setConnectionMeta("Peer connection is carrying the host stream");
  };

  peerConnection.onicecandidate = (event) => {
    if (!event.candidate) {
      return;
    }

    socket.emit("rtc:signal", {
      sessionId: launch.sessionId,
      fromDeviceId: launch.controllerDeviceId,
      toDeviceId: launch.hostDeviceId,
      candidate: event.candidate.toJSON(),
    });
  };

  peerConnection.onconnectionstatechange = () => {
    setConnectionMeta(`Peer state: ${peerConnection.connectionState}`);
  };

  const offer = await peerConnection.createOffer({
    offerToReceiveAudio: false,
    offerToReceiveVideo: true,
  });
  await peerConnection.setLocalDescription(offer);

  socket.emit("rtc:signal", {
    sessionId: launch.sessionId,
    fromDeviceId: launch.controllerDeviceId,
    toDeviceId: launch.hostDeviceId,
    description: offer,
  });
}

controlOverlay.addEventListener("pointermove", (event) => {
  const now = performance.now();
  if (now - lastMoveSentAt < 24) {
    return;
  }

  lastMoveSentAt = now;
  const point = normalizePointer(event);
  emitInput({
    kind: "pointer.move",
    ...point,
  });
});

controlOverlay.addEventListener("click", (event) => {
  const point = normalizePointer(event);
  emitInput({
    kind: "pointer.button",
    ...point,
    button: "left",
    action: "click",
  });
});

controlOverlay.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  const point = normalizePointer(event);
  emitInput({
    kind: "pointer.button",
    ...point,
    button: "right",
    action: "click",
  });
});

controlOverlay.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    emitInput({
      kind: "pointer.wheel",
      deltaY: event.deltaY,
    });
  },
  { passive: false },
);

controlOverlay.addEventListener("touchstart", (event) => {
  const touch = event.touches[0];
  if (!touch) {
    return;
  }

  const point = normalizePointer(touch);
  emitInput({
    kind: "pointer.button",
    ...point,
    button: "left",
    action: "click",
  });
});

window.addEventListener("keydown", (event) => {
  if (event.target === clipboardText || event.target === typeTextInput) {
    return;
  }

  emitInput({
    kind: "keyboard.input",
    key: event.key,
    code: event.code,
    action: "down",
  });
});

window.addEventListener("keyup", (event) => {
  if (event.target === clipboardText || event.target === typeTextInput) {
    return;
  }

  emitInput({
    kind: "keyboard.input",
    key: event.key,
    code: event.code,
    action: "up",
  });
});

sendClipboardButton.addEventListener("click", () => {
  emitInput({
    kind: "clipboard.text",
    text: clipboardText.value,
  });
  clipboardText.value = "";
});

sendTextButton.addEventListener("click", () => {
  if (!typeTextInput.value.trim()) {
    return;
  }

  emitInput({
    kind: "keyboard.input",
    key: typeTextInput.value,
    action: "type",
    text: typeTextInput.value,
  });
  typeTextInput.value = "";
});

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const fileAsBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const value = String(reader.result ?? "");
      resolve(value.split(",")[1] ?? "");
    };
    reader.readAsDataURL(file);
  });

  emitInput({
    kind: "file.meta",
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
  });

  const chunkSize = 32 * 1024;
  for (let offset = 0; offset < fileAsBase64.length; offset += chunkSize) {
    const chunk = fileAsBase64.slice(offset, offset + chunkSize);
    emitInput({
      kind: "file.chunk",
      name: file.name,
      chunk,
      index: offset / chunkSize,
      isLast: offset + chunkSize >= fileAsBase64.length,
    });
  }

  fileInput.value = "";
});

endSessionButton.addEventListener("click", () => {
  socket?.emit("session:end", {
    sessionId: launch.sessionId,
  });
  peerConnection?.close();
  setStatus("Ended");
});

async function boot() {
  if (!viewerToken) {
    setStatus("Missing token");
    setConnectionMeta("The launch URL must include a valid controller token");
    return;
  }

  const response = await fetch(`/api/controller-launch?token=${encodeURIComponent(viewerToken)}`);
  if (!response.ok) {
    setStatus("Launch failed");
    setConnectionMeta("Unable to resolve the controller launch token");
    return;
  }

  launch = await response.json();
  sessionMetaEl.textContent = `Session ${launch.sessionId} -> ${launch.hostDeviceId}`;
  await connectSocket();
}

boot().catch((error) => {
  setStatus("Error");
  setConnectionMeta(error instanceof Error ? error.message : String(error));
});
