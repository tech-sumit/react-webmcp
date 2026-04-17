import {
  type SessionRole,
  sessionRoleSchema,
  sessionTokenPayloadSchema,
  type SessionTokenPayload,
} from "@nord-meshnet/protocol";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getCrypto(): Crypto {
  if (!globalThis.crypto) {
    throw new Error("Web Crypto API is not available in this runtime");
  }

  return globalThis.crypto;
}

function encodeBase64Url(input: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input)
      .toString("base64")
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/g, "");
  }

  let value = "";
  for (const byte of input) {
    value += String.fromCharCode(byte);
  }

  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }

  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftByte = left[index] ?? 0;
    const rightByte = right[index] ?? 0;
    diff |= leftByte ^ rightByte;
  }

  return diff === 0;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return getCrypto().subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign", "verify"],
  );
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function randomId(prefix = ""): string {
  const buffer = new Uint8Array(16);
  getCrypto().getRandomValues(buffer);
  return `${prefix}${encodeBase64Url(buffer).slice(0, 22)}`;
}

export function createExpiry(secondsFromNow: number): number {
  return nowSeconds() + secondsFromNow;
}

export function generatePairingCode(length = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  getCrypto().getRandomValues(bytes);

  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

export async function signSessionToken(
  payload: SessionTokenPayload,
  secret: string,
): Promise<string> {
  const validated = sessionTokenPayloadSchema.parse(payload);
  const headerBytes = encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadBytes = encoder.encode(JSON.stringify(validated));
  const unsignedToken = `${encodeBase64Url(headerBytes)}.${encodeBase64Url(payloadBytes)}`;
  const signatureBytes = new Uint8Array(
    await getCrypto().subtle.sign("HMAC", await importHmacKey(secret), encoder.encode(unsignedToken)),
  );

  return `${unsignedToken}.${encodeBase64Url(signatureBytes)}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<SessionTokenPayload> {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("Invalid session token format");
  }

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = new Uint8Array(
    await getCrypto().subtle.sign("HMAC", await importHmacKey(secret), encoder.encode(unsignedToken)),
  );
  const providedSignature = decodeBase64Url(encodedSignature);

  if (!constantTimeEqual(expectedSignature, providedSignature)) {
    throw new Error("Invalid session token signature");
  }

  const payload = JSON.parse(decoder.decode(decodeBase64Url(encodedPayload)));
  const parsed = sessionTokenPayloadSchema.parse(payload);

  if (parsed.exp <= nowSeconds()) {
    throw new Error("Session token has expired");
  }

  return parsed;
}

export async function createSessionToken(
  sessionId: string,
  deviceId: string,
  role: SessionRole,
  ttlSeconds: number,
  secret: string,
): Promise<string> {
  return signSessionToken(
    {
      sessionId,
      deviceId,
      role: sessionRoleSchema.parse(role),
      iat: nowSeconds(),
      exp: createExpiry(ttlSeconds),
    },
    secret,
  );
}
