import { createSign } from "node:crypto";

const JAAS_APP_ID = process.env.JAAS_APP_ID?.trim() || process.env.NEXT_PUBLIC_JAAS_APP_ID?.trim();
const JAAS_KID = process.env.JAAS_KID?.trim();
const JAAS_PRIVATE_KEY = process.env.JAAS_PRIVATE_KEY?.trim() || process.env.JAAS_PRIVATE_KEY_BASE64?.trim();

export const JAAS_ENV_HINT =
  "Set JAAS_APP_ID, JAAS_KID, and JAAS_PRIVATE_KEY (or JAAS_PRIVATE_KEY_BASE64) to enable authenticated 8x8 JaaS meetings.";

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodePrivateKey(rawKey: string) {
  if (rawKey.includes("BEGIN")) {
    return rawKey.replace(/\\n/g, "\n");
  }

  const decoded = Buffer.from(rawKey, "base64").toString("utf8").trim();
  return decoded.includes("BEGIN") ? decoded : rawKey;
}

function getJaasConfig() {
  if (!JAAS_APP_ID || !JAAS_KID || !JAAS_PRIVATE_KEY) {
    throw new Error(`Missing JaaS environment variables. ${JAAS_ENV_HINT}`);
  }

  return {
    appId: JAAS_APP_ID,
    kid: JAAS_KID,
    privateKey: decodePrivateKey(JAAS_PRIVATE_KEY),
  };
}

export function hasJaasAppId() {
  return Boolean(JAAS_APP_ID);
}

export function hasJaasJwtEnv() {
  return Boolean(JAAS_APP_ID && JAAS_KID && JAAS_PRIVATE_KEY);
}

export function buildJaasRoomName(appId: string, roomCode: string) {
  return `${appId}/${roomCode}`;
}

export function getJaasAppId() {
  if (!JAAS_APP_ID) {
    throw new Error(`Missing JaaS App ID. ${JAAS_ENV_HINT}`);
  }

  return JAAS_APP_ID;
}

export function createJaasJwt({
  roomCode,
  userId,
  displayName,
  email,
  moderator,
}: {
  roomCode: string;
  userId: string;
  displayName: string;
  email: string;
  moderator: boolean;
}) {
  const { appId, kid, privateKey } = getJaasConfig();
  const roomName = buildJaasRoomName(appId, roomCode);
  const issuedAt = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    kid,
    typ: "JWT",
  };

  const payload = {
    aud: "jitsi",
    context: {
      user: {
        id: userId,
        name: displayName,
        email,
        moderator,
      },
      features: {
        livestreaming: false,
        recording: false,
        transcription: false,
        "outbound-call": false,
      },
      room: {
        regex: false,
      },
    },
    exp: issuedAt + 2 * 60 * 60,
    iss: "chat",
    nbf: issuedAt - 10,
    room: roomName,
    sub: appId,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();

  const signature = signer.sign(privateKey);
  return `${signingInput}.${base64UrlEncode(signature)}`;
}
