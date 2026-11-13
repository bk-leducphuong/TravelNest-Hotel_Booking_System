import { io, type Socket } from "socket.io-client";
import { useRuntimeConfig } from "#imports";
import { getAccessToken } from "~/services/keycloak";

/**
 * Realtime transport for the hotel console.
 *
 * The admin app deliberately keeps polling as a fallback; this socket is an
 * additive improvement over it. The API remains the source of truth because
 * messages are persisted before they are emitted.
 */

const API_PREFIX = "/api/v1";

let chatSocket: Socket | null = null;

function resolveSocketHost(): string {
  const config = useRuntimeConfig();
  const base = String(config.public.apiBase || "").replace(/\/+$/, "");
  if (!base) {
    return "";
  }
  return base.endsWith(API_PREFIX) ? base.slice(0, -API_PREFIX.length) : base;
}

async function authPayload(callback: (data: { token: string }) => void): Promise<void> {
  const token = await getAccessToken().catch(() => null);
  callback({ token: token || "" });
}

export async function connectChatSocket(): Promise<Socket | null> {
  const host = resolveSocketHost();
  if (!host) {
    return null;
  }

  const token = await getAccessToken().catch(() => null);
  if (!token) {
    return null;
  }

  if (!chatSocket) {
    chatSocket = io(`${host}/property`, {
      withCredentials: false,
      transports: ["websocket", "polling"],
      reconnection: true,
      // Re-read the token on every reconnect so an expired access token does
      // not leave the console permanently offline.
      auth: authPayload,
    });
  } else {
    chatSocket.auth = authPayload;
    if (!chatSocket.connected) {
      chatSocket.connect();
    }
  }

  return chatSocket;
}

export function disconnectChatSocket(): void {
  if (!chatSocket) {
    return;
  }
  chatSocket.removeAllListeners();
  chatSocket.disconnect();
  chatSocket = null;
}
